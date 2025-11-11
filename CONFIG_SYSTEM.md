# 运行时配置系统

本项目已从环境变量配置迁移到运行时配置系统，允许在打包后修改配置而无需重新构建。

## 📁 文件结构

```
showbuzzv3/
├── public/
│   ├── app-config.json           # 默认配置文件（主网）
│   ├── app-config.dev.json       # 开发环境配置模板
│   └── app-config.test.json      # 测试环境配置模板（可创建）
├── src/
│   └── config/
│       ├── runtime-config.ts     # 配置加载和管理
│       ├── app-config.ts         # 配置访问辅助函数
│       ├── config-validator.ts   # 配置验证工具
│       └── usage-examples.ts     # 使用示例
├── scripts/
│   ├── switch-config.js          # 配置切换脚本
│   ├── compare-configs.js        # 配置对比工具
│   └── deploy-config.sh          # 部署配置脚本（Shell）
└── docs/
    └── APP_CONFIG.md             # 详细配置文档
```

## 🚀 快速开始

### 1. 在代码中使用配置

```typescript
import { getAppConfig } from '@/config/app-config'

const config = getAppConfig()
console.log(config.baseApi) // 获取 API 地址
console.log(config.appName) // 获取应用名称
console.log(config.enableChat) // 获取功能开关
```

### 2. 切换环境配置

```bash
# 切换到开发环境
node scripts/switch-config.js dev

# 切换到生产环境
node scripts/switch-config.js prod
```

### 3. 对比不同环境配置

```bash
# 对比开发和生产环境的差异
node scripts/compare-configs.js dev prod
```

## 📝 配置文件说明

配置文件采用 JSON 格式，包含以下主要部分：

### 应用信息 (`app`)

- `name` - 应用名称
- `description` - 应用描述
- `logo` - Logo 路径
- `favicon` - 网站图标

### API 端点 (`api`)

- `baseApi` - 主 API 地址
- `chatApi` - 聊天 API
- `metaSvApi` - MetaSV API
- 等其他 API 端点...

### 区块链配置 (`blockchain`)

- `network` - 网络类型 (mainnet/testnet)
- `ethChain` - 以太坊链
- `polygonChain` - Polygon 链
- 等区块链相关配置...

### 功能开关 (`features`)

- `enableChat` - 启用聊天功能
- `enablePayment` - 启用支付功能
- 等功能开关...

完整配置项说明请查看 [APP_CONFIG.md](./APP_CONFIG.md)

## 🔧 常用命令

### 开发环境

```bash
# 使用开发环境配置
node scripts/switch-config.js dev
yarn chat
```

### 生产环境打包

```bash
# 使用生产环境配置
node scripts/switch-config.js prod
yarn build:chat
```

### 配置验证

应用启动时会自动验证配置，在开发模式下会在控制台输出验证结果。

## 📦 部署后修改配置

1. 打包应用：

   ```bash
   yarn build:chat
   ```

2. 在 `dist/` 目录下找到 `app-config.json`

3. 根据需要修改配置：

   ```json
   {
     "api": {
       "baseApi": "https://your-api.example.com",
       ...
     }
   }
   ```

4. 部署到服务器，无需重新构建！

## 🔄 配置迁移指南

### 从环境变量迁移到运行时配置

**之前（使用环境变量）：**

```typescript
const baseApi = import.meta.env.VITE_BASEAPI
const appName = import.meta.env.VITE_AppName
```

**之后（使用运行时配置）：**

```typescript
import { getAppConfig } from '@/config/app-config'

const config = getAppConfig()
const baseApi = config.baseApi
const appName = config.appName
```

或使用兼容的导出函数：

```typescript
import { VITE_BASEAPI, VITE_AppName } from '@/config/app-config'

const baseApi = VITE_BASEAPI() // 注意：这是函数调用
const appName = VITE_AppName()
```

## 📊 环境变量对照表

| 旧环境变量        | 新配置路径             | 类型   |
| ----------------- | ---------------------- | ------ |
| `VITE_BASEAPI`    | `api.baseApi`          | string |
| `VITE_AppName`    | `app.name`             | string |
| `VITE_NET_WORK`   | `blockchain.network`   | string |
| `VITE_ETH_CHAIN`  | `blockchain.ethChain`  | string |
| `VITE_CHAT_API`   | `api.chatApi`          | string |
| `VITE_PAY_AMOUNT` | `blockchain.payAmount` | number |
| ...               | ...                    | ...    |

完整对照表请参考 `src/config/app-config.ts`

## ⚙️ 高级功能

### 热更新配置

```typescript
import { reloadRuntimeConfig } from '@/config/runtime-config'

// 重新加载配置文件
const newConfig = await reloadRuntimeConfig()
```

### 部分更新配置

```typescript
import { updateRuntimeConfig } from '@/config/runtime-config'

updateRuntimeConfig({
  features: {
    enableChat: false,
    enablePayment: true,
  },
})
```

### 配置验证

```typescript
import { loadAndValidateConfig } from '@/config/config-validator'

const result = await loadAndValidateConfig()
if (!result.valid) {
  console.error('配置错误:', result.errors)
}
```

## 🛡️ 安全提示

1. **敏感信息**：不要在配置文件中存储敏感密钥（如 API 密钥、私钥等）
2. **访问控制**：确保配置文件不包含需要保密的业务逻辑
3. **验证**：使用配置验证工具确保配置格式正确

## 🔗 相关链接

- [详细配置文档](./APP_CONFIG.md)
- [使用示例](../src/config/usage-examples.ts)
- [配置接口定义](../src/config/runtime-config.ts)

## ❓ 常见问题

### Q: 配置文件加载失败怎么办？

A: 应用会自动回退到代码中的默认配置，不影响正常运行。检查控制台错误信息。

### Q: 如何添加新的配置项？

A: 在 `runtime-config.ts` 的 `AppRuntimeConfig` 接口中添加定义，然后更新所有配置文件模板。

### Q: 打包后修改配置需要重启吗？

A: 需要刷新浏览器页面以加载新配置。

### Q: 可以动态切换配置吗？

A: 可以使用 `reloadRuntimeConfig()` 重新加载配置文件。

## 📄 许可

本配置系统是项目的一部分，遵循项目的开源许可协议。
