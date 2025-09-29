const { ethers } = require("hardhat");

async function main() {
  const contract = await ethers.getContractAt("SecretBallotBox", "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
  
  const now = Math.floor(Date.now() / 1000);
  const startTime = now;
  const endTime = now + 3600; // 1小时后结束
  
  console.log("创建测试投票...");
  const tx = await contract.createBallot(
    "测试投票",
    "测试同态聚合投票计数功能",
    ["选项A", "选项B"],
    BigInt(startTime),
    BigInt(endTime),
    1
  );
  
  const receipt = await tx.wait();
  console.log("投票创建成功！交易哈希:", receipt?.hash);
  
  // 获取投票数量
  const count = await contract.getBallotCount();
  console.log("当前投票总数:", count.toString());
  console.log("新投票ID:", count.toString());
}

main().catch(console.error);


