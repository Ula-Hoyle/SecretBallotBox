SecretBallotBox Contracts

快速开始：

- 安装依赖：`npm i`
- 启动本地节点：`npm run node`
- 部署：`npm run deploy:local`

如果遇到 `kmsVerifierContractAddress is not of type string, got undefined instead`，请在 `fhevmTemp/precompiled-fhevm-core-contracts-addresses.json` 中加入 `"KMSVerifierAddress": "0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC"`，然后重启节点与部署。

任务脚本（创建议题示例）：

```bash
npx hardhat ballot:create \
  --title "示例议题" \
  --description "这是一个示例" \
  --options "选项A,选项B,选项C" \
  --start $(($(date +%s)+60)) \
  --end $(($(date +%s)+3600)) \
  --max 1
```

主要接口：`createBallot` / `castVote` / `submitTallyResult` / `getBallot` / `getEncryptedVotes` / `getTallyResult` / `getVoteCount`




