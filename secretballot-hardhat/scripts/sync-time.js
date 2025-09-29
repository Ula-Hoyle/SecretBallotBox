const { ethers } = require("hardhat");

async function main() {
  // 同步区块时间到当前系统时间
  const currentTime = Math.floor(Date.now() / 1000);
  await network.provider.send("evm_setNextBlockTimestamp", [currentTime]);
  await network.provider.send("evm_mine");
  
  console.log("区块时间已同步到:", new Date(currentTime * 1000).toLocaleString());
  
  // 检查投票状态
  const contract = await ethers.getContractAt("SecretBallotBox", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  const status = await contract.getBallotStatus(4);
  console.log("投票4状态:", status.toString(), status == 0 ? "(未开始)" : status == 1 ? "(进行中)" : status == 2 ? "(已结束)" : "(已公布)");
}

main().catch(console.error);


