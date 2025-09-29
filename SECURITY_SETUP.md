# 🔐 安全配置指南

## 重要提醒
本项目已清理所有敏感信息，包括：
- 私钥
- 助记词
- API密钥
- 钱包地址

## 部署前必要配置

### 1. 设置环境变量

在部署合约前，您需要设置以下环境变量：

```bash
# 进入hardhat项目目录
cd action/secretballot-hardhat

# 设置私钥（用于部署合约的钱包私钥）
npx hardhat vars set PRIVATE_KEY your_private_key_here

# 设置Etherscan API密钥（用于合约验证）
npx hardhat vars set ETHERSCAN_API_KEY your_etherscan_api_key_here

# 可选：设置Infura API密钥（如果使用Infura RPC）
npx hardhat vars set INFURA_API_KEY your_infura_api_key_here
```

### 2. 网络配置

项目当前支持以下网络：
- **Sepolia测试网**：用于测试部署
- **本地Hardhat网络**：用于开发测试

### 3. 部署合约

```bash
# 部署到Sepolia测试网
npx hardhat deploy --network sepolia

# 验证合约
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

### 4. 更新前端配置

部署成功后，更新前端合约地址：
```typescript
// action/secretballot-frontend/abi/SecretBallotBoxAddresses.ts
export const SecretBallotBoxAddresses = { 
  "11155111": { address: "YOUR_DEPLOYED_CONTRACT_ADDRESS", chainId: 11155111, chainName: "sepolia" },
  "31337": { address: "LOCAL_CONTRACT_ADDRESS", chainId: 31337, chainName: "hardhat" },
};
```

## 安全最佳实践

1. **永远不要**将私钥或助记词提交到代码仓库
2. **使用环境变量**管理所有敏感信息
3. **定期轮换**API密钥和访问令牌
4. **使用测试网**进行开发和测试
5. **验证合约**代码以确保透明度

## 项目结构

```
action/
├── secretballot-hardhat/     # 智能合约项目
│   ├── contracts/           # Solidity合约
│   ├── deploy/             # 部署脚本
│   └── hardhat.config.ts   # Hardhat配置
└── secretballot-frontend/   # 前端应用
    ├── app/                # Next.js应用
    ├── components/         # React组件
    └── abi/               # 合约ABI和地址
```

## 支持的功能

- 🗳️ 创建匿名投票
- 🔒 基于FHEVM的隐私保护
- 📊 实时投票结果
- 🌐 多网络支持
- ✅ 合约验证

---

⚠️ **重要**：在生产环境中使用前，请确保所有安全配置都已正确设置！
