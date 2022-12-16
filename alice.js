const {
  Client,
  AccountId,
  AccountBalanceQuery,
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  Hbar,
  HbarUnit,
  TransactionRecord,
  TransferTransaction,
} = require("@hashgraph/sdk");
// Allow access to our .env file variables
require("dotenv").config();
const contractId = require("./const.js").contractId;
const print = require("./utils.js").print;

// Grab your account ID and private key from the .env file
// const operatorAccountId = process.env.MY_ACCOUNT_ID;
// const operatorPrivateKey = process.env.MY_PRIVATE_KEY;
const operatorAccountId = process.env.ALICE_ID;
const operatorPrivateKey = process.env.ALICE_PVKEY;

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

async function printBalance() {
  var currentBalance = await new AccountBalanceQuery()
    .setAccountId(operatorAccountId)
    .execute(client);
  console.log("account balance:", currentBalance.toString());
}

async function queryContract() {
  const tx = new ContractCallQuery()
    .setGas(300000)
    .setContractId(contractId)
    .setFunction(
      "walletOfOwner",
      new ContractFunctionParameters() //.addUint256(1)
        .addAddress(AccountId.fromString(operatorAccountId).toSolidityAddress())
    )
    .setQueryPayment(Hbar.fromTinybars(300000));

  const contractFunctionResult = await tx.execute(client);
  console.log();

  const bal = contractFunctionResult.getUint256(1);
  for (i = 0; i < bal; i++) {
    const ret_0 = contractFunctionResult.getUint256(i + 2);
    console.log(`i :>>  ${ret_0.toString()}`);
  }
}

async function readContract() {
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(300000) // Increase if revert
    .setPayableAmount(Hbar.from(1)) // Increase if revert
    .setFunction(
      "cost",
      new ContractFunctionParameters() //.addUint256(1)
      // .addAddress(AccountId.fromString(operatorAccountId).toSolidityAddress())
    );

  const txRes = await tx.execute(client);
  print("txResponse", txRes);

  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);

  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  const ret_0 = txRec.contractFunctionResult.getUint256(0);
  console.log(`First return value is: ${ret_0.toString()}`);
  // console.log(`First return value is: ${AccountId.fromSolidityAddress(ret_0)}`);
}

async function writeContract() {
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(3000000) // Increase if revert
    .setPayableAmount(10) // Increase if revert
    .setFunction(
      "mint" //,
      //   new ContractFunctionParameters().addUint256(100000000)
    );

  const txRes = await tx.execute(client);
  print("txResponse", txRes);

  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);

  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  const serial = txRec.contractFunctionResult.getUint256(0);
  const rand = txRec.contractFunctionResult.getUint256(1);
  const value = txRec.contractFunctionResult.getUint256(2);
  console.log(`You have mint #${serial}.`);
  console.log(`Owner of #${rand} received ${Hbar.fromTinybars(value)}.`);
}

async function transfer() {
  const tx = new TransferTransaction()
    .addHbarTransfer(operatorAccountId, new Hbar(-1000))
    .addHbarTransfer("0.0.49084131", new Hbar(1000));

  const txRes = await tx.execute(client);
  print("txResponse", txRes);

  // const receipt = await txRes.getReceipt(client);
  // print("recepit", receipt);

  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);
}

async function mint() {
  const tx = new ContractExecuteTransaction()
    .setContractId(contractId)
    .setGas(300000) // Increase if revert
    // .setPayableAmount(1000000000) // Increase if revert
    .setFunction("mint", new ContractFunctionParameters());

  const txRes = await tx.execute(client);
  print("txResponse", txRes);

  const receipt = await txRes.getReceipt(client);
  print("recepit", receipt);

  const txRec = await txRes.getRecord(client);
  print("txRecord", txRec);

  const ret_0 = txRec.contractFunctionResult.getUint256(0);
  console.log(`First return value is: ${ret_0.toString()}`);
  // console.log(`First return value is: ${AccountId.fromSolidityAddress(ret_0)}`);
}

// Hedera is an asynchronous environment :)
(async function () {
  await printBalance();
  try {
    // await readContract();
    // await mint();
    // await queryContract();
    // await transfer();
    // await writeContract();
  } catch (err) {
    console.error(err);
  }
  await printBalance();
  process.exit();
})();
