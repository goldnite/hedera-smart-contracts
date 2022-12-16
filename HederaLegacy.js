const {
  AccountBalanceQuery,
  AccountId,
  Client,
  ContractCreateFlow,
  ContractFunctionParameters,
  Hbar,
  ContractExecuteTransaction,
  TokenInfoQuery,
  ContractCallQuery,
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

let HL_contractId = "0.0.49101999";
let HL_tokenId = "0.0.49102000";
const MAX_GAS = 15000000;

async function deploy() {
  // const bytecode = require("./HederaLegacy.json").data.bytecode.object;
  const bytecode = require("fs").readFileSync("./HederaLegacy.bin");
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

  HL_contractId = createContractRx.contractId;
}

async function initialize() {
  const tx = new ContractExecuteTransaction()
    .setContractId(HL_contractId)
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

  HL_tokenId = AccountId.fromSolidityAddress(tokenAddress).toString();
}

async function mint(amount = 1) {
  const tx = new ContractExecuteTransaction()
    .setContractId(HL_contractId)
    .setGas(MAX_GAS) // Increase if revert
    // .setPayableAmount(Hbar.from(10 * amount)) // Increase if revert
    .setFunction("mint", new ContractFunctionParameters().addUint256(amount));
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  console.log(`You have mint ${amount} NFTs.`);
  for (let i = 2; i < amount + 2; i++) {
    const serial = txRec.contractFunctionResult.getInt64(i);
    console.log(`NFT #${serial}`);
  }

  console.log("***", txRec.transactionId.toString());
}

async function withdraw() {
  const tx = new ContractExecuteTransaction()
    .setContractId(HL_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction("withdraw", new ContractFunctionParameters());
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);
}

async function setCost(newCost) {
  const tx = new ContractExecuteTransaction()
    .setContractId(HL_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction(
      "setCost",
      new ContractFunctionParameters().addUint256(newCost)
    );
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);
}

async function pause(willPaused) {
  const tx = new ContractExecuteTransaction()
    .setContractId(HL_contractId)
    .setGas(MAX_GAS) // Increase if revert
    .setFunction("pause", new ContractFunctionParameters().addBool(willPaused));
  const txRes = await tx.execute(client);
  print("txResponse", txRes);
  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);
  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  const responseCode = txRec.contractFunctionResult.getUint256(0);
  console.log(`Response Code is: ${responseCode.toString()}`);
}

async function cost() {
  const tx = new ContractCallQuery()
    .setGas(MAX_GAS)
    .setContractId(HL_contractId)
    .setFunction("cost", new ContractFunctionParameters())
    .setQueryPayment(Hbar.from(6));

  const result = await tx.execute(client);
  console.log(`Cost is ${Hbar.fromTinybars(result.getUint256(0))}`);
}
async function tokenInfo() {
  const query = new TokenInfoQuery().setTokenId(HL_tokenId);
  const info = await query.execute(client);

  print(`Token ${HL_tokenId} Info`, info);
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

// Hedera is an asynchronous environment :)
(async function () {
  await printBalance("Operator", operatorAccountId);
  try {
    await deploy();
    await initialize();

    // await mint(5);
    // await mint(10);
    // await withdraw();
    // await setCost(Math.pow(10, 9));
    // await cost();
    // await pause(false);
    // await tokenInfo();
  } catch (err) {
    console.error(err);
  } finally {
  }
  await printBalance("Operator", operatorAccountId);
  process.exit();
})();
