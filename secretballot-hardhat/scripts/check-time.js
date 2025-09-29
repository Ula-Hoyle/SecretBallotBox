const { ethers } = require("hardhat");

async function main() {
  const contract = await ethers.getContractAt("SecretBallotBox", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
  
  // 获取投票信息
  const [title, desc, options, start, end] = await contract.getBallot(5);
  console.log("投票标题:", title);
  console.log("开始时间戳:", start.toString());
  console.log("结束时间戳:", end.toString());
  
  // 获取当前区块时间
  const latest = await ethers.provider.getBlock("latest");
  console.log("区块时间戳:", latest.timestamp);
  console.log("当前系统时间戳:", Math.floor(Date.now()/1000));
  
  // 时间差对比
  console.log("开始时间:", new Date(Number(start) * 1000).toLocaleString());
  console.log("结束时间:", new Date(Number(end) * 1000).toLocaleString());
  console.log("区块时间:", new Date(latest.timestamp * 1000).toLocaleString());
  console.log("系统时间:", new Date().toLocaleString());
  
  // 检查状态
  const status = await contract.getBallotStatus(5);
  console.log("投票状态:", status.toString(), status == 0 ? "(未开始)" : status == 1 ? "(进行中)" : status == 2 ? "(已结束)" : "(已公布)");
  
  // 检查投票数量
  const voteCount = await contract.getVoteCount(5);
  console.log("投票数量:", voteCount.toString());
  
  // 检查同态聚合数据
  try {
    const encTallies = await contract.getEncryptedTally(5);
    console.log("加密累计数据长度:", encTallies.length);
    console.log("加密累计数据:", encTallies.map(h => h.toString()));
  } catch (error) {
    console.log("无同态聚合数据:", error.message);
  }
}

main().catch(console.error);
