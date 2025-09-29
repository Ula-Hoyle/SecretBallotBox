# 🚀 GitHub Pages 部署指南

本项目已配置为支持GitHub Pages静态部署，包括智能的basePath自动推导功能。

## 📋 部署前准备

### 1. 仓库设置

确保您的仓库满足以下条件之一：
- **用户/组织站点**: 仓库名为 `用户名.github.io`
- **项目站点**: 任意仓库名（推荐使用描述性名称）

### 2. GitHub Pages 配置

1. 进入仓库 Settings → Pages
2. Source 选择 "GitHub Actions"
3. 无需其他配置，工作流会自动处理

## 🔧 自动化功能

### basePath 自动推导

工作流会自动检测仓库类型并设置正确的basePath：

```yaml
# 用户站点 (username.github.io)
NEXT_PUBLIC_BASE_PATH="" # 空basePath

# 项目站点 (任意仓库名)
NEXT_PUBLIC_BASE_PATH="/repository-name" # 使用仓库名作为basePath
```

### 构建流程

1. **检测仓库类型**: 自动判断是用户站点还是项目站点
2. **设置环境变量**: 根据仓库类型设置`NEXT_PUBLIC_BASE_PATH`
3. **安装依赖**: 安装Node.js依赖
4. **生成ABI**: 自动生成合约ABI文件
5. **构建应用**: 使用Next.js静态导出
6. **部署**: 自动部署到GitHub Pages

## 📁 项目结构

```
├── .github/
│   └── workflows/
│       └── deploy.yml          # GitHub Actions工作流
├── action/
│   └── secretballot-frontend/  # Next.js前端项目
│       ├── next.config.ts      # Next.js配置（支持静态导出）
│       ├── components/
│       │   └── GitHubPagesLink.tsx  # GitHub Pages兼容的Link组件
│       └── package.json        # 包含GitHub Pages构建脚本
└── GITHUB_PAGES_DEPLOYMENT.md # 本文档
```

## 🛠️ 本地测试

### 模拟GitHub Pages环境

```bash
# 进入前端项目目录
cd action/secretballot-frontend

# 设置basePath环境变量（模拟项目站点）
export NEXT_PUBLIC_BASE_PATH="/your-repo-name"

# 构建项目
npm run build:github

# 启动本地服务器测试
npx serve out -p 3000
```

### 测试用户站点

```bash
# 不设置basePath（模拟用户站点）
unset NEXT_PUBLIC_BASE_PATH

# 构建和测试
npm run build:github
npx serve out -p 3000
```

## 🔄 部署触发

工作流会在以下情况下自动触发：

- **Push到main/master分支**: 自动构建并部署
- **Pull Request**: 仅构建测试，不部署
- **手动触发**: 在Actions页面手动运行

## 📊 支持的功能

### ✅ 已支持
- 🎯 自动basePath推导
- 📱 响应式设计
- 🔗 路由兼容性
- 🖼️ 图片优化禁用（GitHub Pages要求）
- 📄 静态文件导出
- 🚀 自动部署

### ⚠️ 限制
- 🚫 不支持服务端API路由
- 🚫 不支持服务端渲染（SSR）
- 🚫 不支持图片优化
- 📝 仅支持静态内容

## 🔧 自定义配置

### 修改构建脚本

在 `action/secretballot-frontend/package.json` 中：

```json
{
  "scripts": {
    "build:github": "npm run genabi && next build",
    "clean": "rimraf .next out"
  }
}
```

### 修改Next.js配置

在 `action/secretballot-frontend/next.config.ts` 中：

```typescript
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: 'out',
  images: {
    unoptimized: true
  },
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  assetPrefix: process.env.NEXT_PUBLIC_BASE_PATH || '',
};
```

## 🐛 故障排除

### 常见问题

1. **页面404错误**
   - 检查basePath设置是否正确
   - 确认仓库名称拼写

2. **资源加载失败**
   - 验证assetPrefix配置
   - 检查.nojekyll文件是否存在

3. **路由不工作**
   - 使用GitHubPagesLink组件
   - 确保trailingSlash设置为true

### 调试命令

```bash
# 检查环境变量
echo $NEXT_PUBLIC_BASE_PATH

# 验证构建输出
ls -la action/secretballot-frontend/out/

# 检查工作流状态
gh workflow list
gh run list
```

## 📞 获取帮助

- 📖 [Next.js静态导出文档](https://nextjs.org/docs/app/building-your-application/deploying/static-exports)
- 🏠 [GitHub Pages文档](https://docs.github.com/en/pages)
- ⚡ [GitHub Actions文档](https://docs.github.com/en/actions)

---

🎉 **现在您的SecretBallotBox项目已准备好部署到GitHub Pages！**
