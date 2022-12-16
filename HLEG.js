const {
  AccountBalanceQuery,
  AccountId,
  Client,
  ContractCreateFlow,
  ContractCallQuery,
  ContractFunctionParameters,
  Hbar,
  ContractExecuteTransaction,
  TokenInfoQuery,
  TokenAssociateTransaction,
  PrivateKey,
} = require("@hashgraph/sdk");
// Allow access to our .env file variables
require("dotenv").config();

const print = require("./utils.js").print;

async function printBalance(accountAlias, accountId) {
  var currentBalance = await new AccountBalanceQuery()
    .setAccountId(accountId.toString())
    .execute(client);
  console.log(
    `Balance of ${accountAlias} (accountId ${accountId}): ${currentBalance.toString()}`
  );
}

// Grab your account ID and private key from the .env file
const operatorAccountId = process.env.MY_ACCOUNT_ID;
const operatorPrivateKey = process.env.MY_PRIVATE_KEY;

// If we weren't able to grab it, we should throw a new error
if (operatorPrivateKey == null || operatorAccountId == null) {
  throw new Error(
    "environment variables OPERATOR_KEY and OPERATOR_ID must be present"
  );
}

// Create our connection to the Hedera network
// The Hedera JS SDK makes this really easy!
const client = Client.forTestnet();

// Set your client account ID and private key used to pay for transaction fees and sign transactions
client.setOperator(operatorAccountId, operatorPrivateKey);

let HLEG_contractId = "0.0.49102024";
let HLEG_tokenId = "0.0.49102025";
const MAX_GAS = 15000000;

async function deploy() {
  // const bytecode = require("./HederaLegacy.json").data.bytecode.object;
  const bytecode = require("fs").readFileSync("./HLEG.bin");
  const createContract = new ContractCreateFlow()
    .setGas(MAX_GAS) // Increase if revert
    .setBytecode(bytecode) // Contract bytecode
    .setConstructorParameters(new ContractFunctionParameters());
  const createContractTx = await createContract.execute(client);
  print("Tx Response", createContractTx);

  const createContractRx = await createContractTx.getReceipt(client);
  print("Tx Receipt", createContractRx);

  const createContractRec = await createContractTx.getRecord(client);
  print("Tx Record", createContractRec);

  console.log(`Contract created with ID: ${createContractRx.contractId} \n`);

  HLEG_contractId = createContractRx.contractId;
}

async function initialize() {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    // .setMaxTransactionFee(10000000000)
    .setGas(MAX_GAS) // Increase if revert
    .setPayableAmount(Hbar.from(30)) // Increase if revert
    .setFunction("initialize", new ContractFunctionParameters());

  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  const responseCode = txRec.contractFunctionResult.getInt256(0);
  const tokenAddress = txRec.contractFunctionResult.getAddress(1);
  console.log(`Response Code is: ${responseCode.toString()}`);
  console.log(
    `Token Id is: ${AccountId.fromSolidityAddress(tokenAddress).toString()}`
  );
  // console.log(`Token solidity address is: ${tokenAddress.toString()}`);

  HLEG_tokenId = AccountId.fromSolidityAddress(tokenAddress).toString();
}

async function mint(receiver = operatorAccountId, amount = 0) {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction(
      "mint",
      new ContractFunctionParameters()
        .addAddress(AccountId.fromString(receiver).toSolidityAddress())
        .addUint256(amount)
    );
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  console.log(`You have mint ${amount} tokens to ${receiver}`);
  const mintResp = txRec.contractFunctionResult.getInt256(0);
  const tranResp = txRec.contractFunctionResult.getInt256(1);
  console.log(`${mintResp}, ${tranResp}`);
  console.log("***", txRec.transactionId.toString());
}

async function transfer(receiver, amount) {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction(
      "balanceOf",
      new ContractFunctionParameters().addAddress(
        AccountId.fromString(operatorAccountId).toSolidityAddress()
      )
      // .addAddress(AccountId.fromString(receiver).toSolidityAddress())
      // .addUint256(amount)
    );
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  //   console.log(`Account ${receiver} have received ${amount} tokens.`);
  const mintResp = txRec.contractFunctionResult.getInt256(0);
  const tranResp = txRec.contractFunctionResult.getInt256(1);
  console.log(`${mintResp}, ${tranResp}`);
  console.log("***", txRec.transactionId.toString());
}

async function associateToken(tokenIds) {
  //Create the associate transaction and sign with Alice's key
  let tx = await new TokenAssociateTransaction()
    .setAccountId(operatorAccountId)
    .setTokenIds(tokenIds)
    .freezeWith(client)
    .sign(PrivateKey.fromString(operatorPrivateKey));

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
  console.log(
    `Token association with Account ${operatorAccountId}: ${txRx.status}\n`
  );
}

async function tokenInfo() {
  const query = new TokenInfoQuery().setTokenId(HLEG_tokenId);
  const info = await query.execute(client);

  print(`Token ${HLEG_tokenId} info: `, info);
}

async function cryptoTransfer(to, amount) {
  const tx = new TransferTransaction()
    .addHbarTransfer(operatorAccountId, new Hbar(-amount))
    .addHbarTransfer(to, new Hbar(amount));

  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);
}

async function stake(serialNumbers, period) {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setPayableAmount(Hbar.from(10))
    .setFunction(
      "stake",
      new ContractFunctionParameters()
        .addInt64Array(serialNumbers)
        .addUint256(period)
    );
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  //   console.log(`Account ${receiver} have received ${amount} tokens.`);
  const mintResp = txRec.contractFunctionResult.getInt256(0);
  const tranResp = txRec.contractFunctionResult.getInt256(1);
  console.log(`${mintResp}, ${tranResp}`);
  console.log("***", txRec.transactionId.toString());
}

async function unstake(serialNumbers) {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setPayableAmount(Hbar.from(10))
    .setFunction(
      "unstake",
      new ContractFunctionParameters().addInt64Array(serialNumbers)
    );
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  console.log(
    `Claim value is ${
      txRec.contractFunctionResult.getUint256(0) / Math.pow(10, 10)
    }`
  );
  console.log("***", txRec.transactionId.toString());
}

async function withdraw() {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction("withdraw", new ContractFunctionParameters());
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  console.log(
    `Withdraw value is ${Hbar.fromTinybars(
      txRec.contractFunctionResult.getUint256(0)
    )}`
  );
  console.log(txRec.transactionId.toString());
}
async function claim() {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction("claim", new ContractFunctionParameters());
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  console.log(
    `Claim value is ${
      txRec.contractFunctionResult.getUint256(0) / Math.pow(10, 10)
    }`
  );
  console.log("***", txRec.transactionId.toString());
}

async function myStake() {
  const tx = new ContractExecuteTransaction()
    .setContractId(HLEG_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction("myStake", new ContractFunctionParameters());
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  const typeSize = txRec.contractFunctionResult.getUint256(0);
  const count = txRec.contractFunctionResult.getUint256(1);
  console.log(`${typeSize}  ${count}`);
  for (let i = 0; i < count; i++) {
    const serial = txRec.contractFunctionResult.getUint160(i * 4 + 2);
    const period = txRec.contractFunctionResult.getUint256(i * 4 + 3);
    const timestamp = txRec.contractFunctionResult.getUint256(i * 4 + 4);
    const lastClaimedAt = txRec.contractFunctionResult.getUint256(i * 4 + 5);
    console.log(
      `{\n\t${serial},\n\t${period},\n\t${new Date(
        timestamp * 1000
      ).toLocaleString()},\n\t${new Date(
        lastClaimedAt * 1000
      ).toLocaleString()}\n}`
    );
  }
  console.log("***", txRec.transactionId.toString());
}

async function vault() {
  const tx = new ContractCallQuery()
    .setGas(MAX_GAS)
    .setContractId(HLEG_contractId)
    .setFunction("vault", new ContractFunctionParameters().addUint256(8))
    .setQueryPayment(Hbar.from(10));

  const contractFunctionResult = await tx.execute(client);

  console.log(contractFunctionResult.getUint256(0).toString());
  console.log(contractFunctionResult.getUint256(1).toString());
  console.log(contractFunctionResult.getUint256(2).toString());
}

// Hedera is an asynchronous environment :)
(async function () {
  await printBalance("Operator", operatorAccountId);
  try {
    await deploy();
    await initialize();
    // await tokenInfo();
    // associateToken([HLEG_tokenId]); //if not associated
    // await mint(operatorAccountId, 100 * Math.pow(10, 10));
    // await stake([13, 14, 15], 30);
    // await myStake();
    // await new Promise((res) => setTimeout(res, 15000));
    // await claim();
    // await myStake();
    // await new Promise((res) => setTimeout(res, 15000));
    // await unstake([13, 14, 15]);
    // await myStake();
    // await withdraw();
    // await vault();
    // await mint("0.0.49084131", 700 * Math.pow(1s0, 10));
    // await transfer("0.0.49084131", 100 * Math.pow(10, 10));
  } catch (err) {
    console.error(err);
  } finally {
  }
  await printBalance("Operator", operatorAccountId);
  process.exit();
})();
