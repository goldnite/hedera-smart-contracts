const keccak256 = require("keccak256");
const Web3EthAbi = require("web3-eth-abi");

const solAddr = "0x0000000000000000000000000000000002ec8369";
const my64 = solAddr.slice(2).padStart(0, 64);
const solAddr64 =
  "0x000000000000000000000000000000000000000000000000000000002ec8369";

const first = keccak256(my64).toString("hex");
console.log(first);
const second = keccak256(
  Web3EthAbi.encodeParameters(["uint256", "uint256"], [solAddr64, "16"])
);
console.log(second.toString("hex"));
const third = keccak256(second).toString("hex");
console.log(third);

console.log(
  keccak256(Web3EthAbi.encodeParameters(["uint256"], ["15"])).toString("hex")
);
