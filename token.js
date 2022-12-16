const {
  Client,
  AccountId,
  AccountBalanceQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  TokenCreateTransaction,
  Hbar,
  HbarUnit,
  TransactionRecord,
  TokenSupplyType,
  TokenType,
  PrivateKey,
  AccountCreateTransaction,
  TokenId,
  TokenMintTransaction,
  TokenAssociateTransaction,
  TokenDissociateTransaction,
  TransferTransaction,
} = require("@hashgraph/sdk");
// Allow access to ourenv file variables
require("dotenv").config();
const print = require("./utils.js").print;

// Grab your account ID and private key from the .env file
const operatorAccountId = AccountId.fromString(process.env.MY_ACCOUNT_ID);
const operatorPrivateKey = PrivateKey.fromString(process.env.MY_PRIVATE_KEY);
const operatorPublicKey = operatorPrivateKey.publicKey;

const treasuryId = AccountId.fromString(process.env.TREASURY_ID);
const treasuryKey = PrivateKey.fromString(process.env.TREASURY_PVKEY);
const aliceId = AccountId.fromString(process.env.ALICE_ID);
const aliceKey = PrivateKey.fromString(process.env.ALICE_PVKEY);
const supplyKey = PrivateKey.fromString(process.env.SUPPLY_PVKEY);

const tokenId = TokenId.fromString("0.0.49094794");

// If we weren't able to grab it, we should throw a new error
if (operatorPrivateKey == null || operatorAccountId == null) {
  throw new Error(
    "environment variables MY_ACCOUNT_ID and MY_PRIVATE_KEY must be present"
  );
}

// Create our connection to the Hedera network
// The Hedera JS SDK makes this really easy!
const client = Client.forTestnet();

// Set your client account ID and private key used to pay for transaction fees and sign transactions
client.setOperator(operatorAccountId, operatorPrivateKey);

async function printBalance(accountAlias, accountId) {
  var currentBalance = await new AccountBalanceQuery()
    .setAccountId(accountId.toString())
    .execute(client);
  console.log(
    `Balance of ${accountAlias} (accountId ${accountId}): ${currentBalance.toString()}`
  );
}

async function queryContract() {
  const tx = new ContractCallQuery()
    .setGas(300000)
    .setContractId(tokenId.toString())
    .setFunction(
      "tokenURI",
      new ContractFunctionParameters().addUint256(12)
      // .addString("Golden")
    );
  //   .setQueryPayment(Hbar.fromTinybars(300000));

  const contractFunctionResult = await tx.execute(client);
  console.log();

  const ret_0 = contractFunctionResult.getString(0);
  console.log(`return value :>>  ${ret_0.toString()}`);
}

async function generateKey() {
  const privateKey = await PrivateKey.generateED25519Async();
  console.log(
    `New key generated.\nPublic Key is ${privateKey.publicKey}\nPrivateKey is ${privateKey}`
  );
  return privateKey;
}

async function createAccount() {
  const privateKey = await generateKey();
  const transaction = new AccountCreateTransaction()
    .setKey(privateKey.publicKey)
    .setInitialBalance(new Hbar(1000));

  //Sign the transaction with the client operator private key and submit to a Hedera network
  const txResponse = await transaction.execute(client);

  //Request the receipt of the transaction
  const receipt = await txResponse.getReceipt(client);

  //Get the account ID
  const newAccountId = receipt.accountId;

  console.log("The new account ID is " + newAccountId);
}

async function writeContract() {
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(300000) // Increase if revert
    .setPayableAmount(Hbar.from(1.00000001)) // Increase if revert
    .setFunction("pay", new ContractFunctionParameters().addString("Donate"));

  const txRes = await tx.execute(client);
  print("txResponse", txRes);

  const receipt = await txRes.getReceipt(client);
  print("recepit", receipt);

  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  const value = txRec.contractFunctionResult.getUint256(0);
  console.log(`First return value is: ${value.toString()}`);
  const ret_0 = txRec.contractFunctionResult.getString(1);
  console.log(`second return value is: ${ret_0.toString()}`);
  // console.log(`First return value is: ${AccountId.fromSolidityAddress(ret_0)}`);
}

async function createToken() {
  const transaction = await new TokenCreateTransaction()
    .setTokenName("Hedera Legacy")
    .setTokenSymbol("HL")
    .setTokenType(TokenType.NonFungibleUnique)
    .setDecimals(0)
    .setInitialSupply(0)
    .setTreasuryAccountId(treasuryId)
    .setSupplyType(TokenSupplyType.Finite)
    .setMaxSupply(1111)
    .setSupplyKey(supplyKey)
    .freezeWith(client);

  //Sign the transaction with the token adminKey and the token treasury account private key
  const signTx = await transaction.sign(treasuryKey);

  //Sign the transaction with the client operator private key and submit to a Hedera network

  const txRes = await signTx.execute(client);
  print("txResponse", txRes);

  const receipt = await txRes.getReceipt(client);
  print("recepit", receipt);

  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  //Get the token ID
  let tokenId = receipt.tokenId;
  //Log the token ID
  console.log(`- Created NFT with Token ID: ${tokenId} \n`);
}

async function mintToken() {
  // Mint new NFT
  let mintTx = await new TokenMintTransaction()
    .setTokenId(tokenId)
    .setMetadata([
      Buffer.from(
        "QmU7FNsvsN4x9J4hKU81V67vUjvK3iz7Z4aa4xJrR2i9Z6/Solana_Data_1.json"
      ),
    ])
    .freezeWith(client);

  //Sign the transaction with the supply key
  let mintTxSign = await mintTx.sign(supplyKey);
  print("Singed Tx", mintTxSign);

  //Submit the transaction to a Hedera network
  let minttxRes = await mintTxSign.execute(client);
  print("Tx Response", minttxRes);

  //Get the transaction receipt
  let mintRx = await minttxRes.getReceipt(client);
  print("Tx Receipt", mintRx);

  //Get the transaction record
  let mintRec = await minttxRes.getRecord(client);
  print("Tx Record", mintRec);

  //Log the serial number
  console.log(
    `- Created NFT ${tokenId} with serial: ${mintRx.serials[0].low} \n`
  );
}
async function associateToken(tokenIds) {
  //Create the associate transaction and sign with Alice's key
  let tx = await new TokenAssociateTransaction()
    .setAccountId(aliceId)
    .setTokenIds(tokenIds)
    .freezeWith(client)
    .sign(aliceKey);

  //Submit the transaction to a Hedera network
  let txRes = await tx.execute(client);
  print("Tx Response", txRes);

  //Get the transaction receipt
  let txRx = await txRes.getReceipt(client);
  print("Tx Receipt", txRx);

  //Get the transaction record
  let txRec = await txRes.getRecord(client);
  print("Tx Record", txRec);

  //Confirm the transaction was successful
  console.log(`- NFT association with Alice's account: ${txRx.status}\n`);
}

async function dessociateToken(tokenIds) {
  //Create the associate transaction and sign with Alice's key
  let tx = await new TokenDissociateTransaction()
    .setAccountId(operatorAccountId)
    .setTokenIds(tokenIds)
    .freezeWith(client)
    .sign(aliceKey);

  //Submit the transaction to a Hedera network
  let txRes = await tx.execute(client);
  print("Tx Response", txRes);

  //Get the transaction receipt
  let txRx = await txRes.getReceipt(client);
  print("Tx Receipt", txRx);

  //Get the transaction record
  let txRec = await txRes.getRecord(client);
  print("Tx Record", txRec);

  //Confirm the transaction was successful
  console.log(`- NFT association with Alice's account: ${txRx.status}\n`);
}

async function transferToken() {
  // Check the balance before the transfer for the treasury account
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(treasuryId)
    .execute(client);
  console.log(
    `- Treasury balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );

  // Check the balance before the transfer for Alice's account
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(aliceId)
    .execute(client);
  console.log(
    `- Alice's balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );

  // Transfer the NFT from treasury to Alice
  // Sign with the treasury key to authorize the transfer
  let tokenTransferTx = await new TransferTransaction()
    .addNftTransfer(tokenId, 2 /*SN*/, treasuryId, aliceId)
    .freezeWith(client)
    .sign(treasuryKey);

  let tokenTransferSubmit = await tokenTransferTx.execute(client);
  print("Tx Response", tokenTransferSubmit);

  let tokenTransferRx = await tokenTransferSubmit.getReceipt(client);
  print("Tx Receipt", tokenTransferRx);

  let tokenTransferRec = await tokenTransferSubmit.getRecord(client);
  print("Tx Record", tokenTransferRec);

  console.log(
    `\n- NFT transfer from Treasury to Alice: ${tokenTransferRx.status} \n`
  );

  // Check the balance of the treasury account after the transfer
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(treasuryId)
    .execute(client);
  console.log(
    `- Treasury balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );

  // Check the balance of Alice's account after the transfer
  var balanceCheckTx = await new AccountBalanceQuery()
    .setAccountId(aliceId)
    .execute(client);
  console.log(
    `- Alice's balance: ${balanceCheckTx.tokens._map.get(
      tokenId.toString()
    )} NFTs of ID ${tokenId}`
  );
}

// Hedera is an asynchronous environment :)
(async function () {
  await printBalance("Operator", operatorAccountId);
  try {
    // await printBalance("Treasury", treasuryId);
    // await createAccount();
    // await generateKey();
    // await createToken();
    // await mintToken();
    // await associateToken();
    await dessociateToken();
    // await transferToken();
    // await queryContract();
    // await writeContract();
    // await printBalance("Treasury", treasuryId);
  } catch (err) {
    console.error(err);
  }
  await printBalance("Operator", operatorAccountId);
  process.exit();
})();
