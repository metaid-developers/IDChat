# 应用配置说明

## 概述

应用配置已从环境变量（`.env` 文件）迁移到运行时配置文件 `public/app-config.json`。这样做的好处是：

1. **可部署后修改**：打包后，用户可以通过修改 `dist/app-config.json` 文件来调整配置，无需重新构建应用
2. **环境隔离**：不同环境的配置可以通过替换 JSON 文件实现，而不是重新打包
3. **热更新支持**：支持运行时更新配置（可选功能）
4. **更灵活**：JSON 格式支持更复杂的数据结构

## 配置文件结构

`public/app-config.json` 文件包含以下主要配置项：

### 1. 应用基本信息 (`app`)

```json
{
  "app": {
    "name": "应用名称",
    "description": "应用描述",
    "keywords": "应用关键词",
    "key": "应用标识",
    "logo": "/show3.svg",
    "favicon": "/favicon.ico",
    "designSize": 1920
  }
}
```

- **name**: 应用名称，会显示在标题栏
- **description**: 应用描述，用于 SEO
- **keywords**: 应用关键词，用于 SEO
- **key**: 应用唯一标识
- **logo**: 应用 Logo 路径
- **favicon**: 网站图标路径
- **designSize**: UI 设计稿基准尺寸

### 2. API 端点配置 (`api`)

```json
{
  "api": {
    "baseApi": "https://api.show3.io",
    "adminBaseApi": "https://cmsapi.nos.art",
    "wxcoreApi": "https://www.showpay.top",
    "appImgApi": "https://api.show3.io",
    "metaSvApi": "https://mainnet.mvcapi.com",
    "bsvMetaSvApi": "https://apiv2.metasv.com",
    "mvcBaseApi": "https://api.mvcscan.com/browser",
    "cyber3Api": "https://api.microvisionchain.com/open-api",
    "manApi": "https://man.metaid.io",
    "daoApi": "https://api.mvcswap.com/stake",
    "dashbroadApi": "https://api.show3.io/tool/api",
    "chatApi": "https://www.show.now/chat-api-test",
    "chatNotify": "https://api.idchat.io",
    "metanoteUrl": "https://gray.metanote.app",
    "metasoUrl": "https://www.metaso.network",
    "showMoneyApp": "https://www.visionmoney.space",
    "showNowHost": "https://www.show.now",
    "chatWs": "https://www.show.now",
    "idchatHost": "https://idchat.io/chat",
    "chatWsPath": "/socket-test"
  }
}
```

所有后端 API 服务的端点地址都在这里配置，方便切换不同环境（开发、测试、生产）。

### 3. 区块链配置 (`blockchain`)

```json
{
  "blockchain": {
    "network": "mainnet",
    "networkNew": "livenet",
    "metaidTag": "metaid",
    "walletPath": "10001",
    "changeAddress": "1By2LtxHQRwzhL2vYMNXuV2WQzkrXM4oS",
    "serviceAddress": "115AxP3jECNa5XmnVHYtEJa2cqP6wYjSJV",
    "serviceFee": 1999,
    "addressHost": "bc1p20k3x2c4mglfxr5wa5sgtgechwstpld80kru2cg4gmm4urvuaqqsvapxu0",
    "ethChain": "eth",
    "ethChainId": 1,
    "polygonChain": "polygon",
    "polygonSymbol": "MATIC",
    "polygonChainId": 80001,
    "payAmount": 0,
    "minAmount": 0
  }
}
```

- **network**: Bitcoin 网络类型 (mainnet/testnet)
- **ethChain**: 以太坊链名称
- **polygonChain**: Polygon 链名称
- **serviceAddress**: 服务地址
- **serviceFee**: 服务费用

### 4. 功能开关 (`features`)

```json
{
  "features": {
    "enableChat": true,
    "enablePayment": true,
    "stakeholderOnlyLimit": 1
  }
}
```

可以通过这些开关控制应用的功能模块是否启用。

### 5. 白名单配置 (`whiteListCreateBroadcast`)

```json
{
  "whiteListCreateBroadcast": [
    "16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo",
    "1APkQsxmFLtVKT9Fng7Z6t7pSJ3q17km1F"
  ]
}
```

允许创建广播的用户地址白名单。

### 6. 聊天配置 (`chat`)

```json
{
  "chat": {
    "defaultChannel": "e836d1b5d05a59c163b89dad69b15fe76cb76314e81b55bbb9e6526def4620b6i0"
  }
}
```

### 7. 安全配置 (`security`)

```json
{
  "security": {
    "secretKey": "fF3nMXzGPQMw10Kc",
    "signMsg": "metalet.space"
  }
}
```

⚠️ **注意**: 敏感信息（如 secretKey）建议不要暴露在前端配置中，应该通过后端 API 获取。

### 8. Sentry 监控配置 (`sentry`)

```json
{
  "sentry": {
    "url": "https://sentry.show3.space",
    "project": "show3",
    "authToken": "...",
    "org": "frontend",
    "dsn": "..."
  }
}
```

用于错误监控和日志收集的 Sentry 配置。

### 9. 其他配置 (`other`)

```json
{
  "other": {
    "siteConfigMetanetId": "",
    "myStakeSymbol": "space_c96faa7fac17b68eab693bb2a4c43e921d169a21310d56ce6eefd51230e4e23d",
    "bandProposalId": ["a6931c4487cf0728cb2a63357fe88a2f156d2225"]
  }
}
```

## 如何使用

### 在代码中访问配置

有两种方式访问配置：

#### 方式 1：使用辅助函数（推荐）

```typescript
import { getAppConfig } from '@/config/app-config'

// 获取所有配置
const config = getAppConfig()

// 使用配置
console.log(config.baseApi)
console.log(config.appName)
```

#### 方式 2：使用单独的导出函数（兼容旧代码）

```typescript
import { VITE_BASEAPI, VITE_AppName, VITE_ETH_CHAIN } from '@/config/app-config'

// 注意：这些是函数，需要调用
const baseApi = VITE_BASEAPI()
const appName = VITE_AppName()
const ethChain = VITE_ETH_CHAIN()
```

#### 方式 3：直接访问运行时配置

```typescript
import { getRuntimeConfig } from '@/config/runtime-config'

const config = getRuntimeConfig()
console.log(config.api.baseApi)
console.log(config.app.name)
```

### 代码迁移示例

**之前（使用环境变量）：**

```typescript
const baseApi = import.meta.env.VITE_BASEAPI
const appName = import.meta.env.VITE_AppName
```

**之后（使用运行时配置）：**

```typescript
import { VITE_BASEAPI, VITE_AppName } from '@/config/app-config'

const baseApi = VITE_BASEAPI()
const appName = VITE_AppName()
```

或者：

```typescript
import { getAppConfig } from '@/config/app-config'

const config = getAppConfig()
const baseApi = config.baseApi
const appName = config.appName
```

## 部署后修改配置

1. 打包应用：`npm run build` 或 `yarn build`
2. 在 `dist` 目录下找到 `app-config.json` 文件
3. 根据需要修改配置项
4. 部署 `dist` 目录到服务器

**示例：切换到生产环境**

修改 `dist/app-config.json` 中的 API 端点：

```json
{
  "api": {
    "baseApi": "https://api.production.example.com",
    "chatApi": "https://chat.production.example.com",
    ...
  }
}
```

刷新页面后，应用会使用新的配置。

## 配置模板

在 `public/` 目录下可以创建多个配置模板：

- `app-config.json` - 默认配置
- `app-config.dev.json` - 开发环境配置
- `app-config.test.json` - 测试环境配置
- `app-config.prod.json` - 生产环境配置

部署时根据环境复制对应的配置文件。

## 注意事项

1. **配置加载时机**：应用启动时会自动加载配置（在 `main.ts` 中），确保在使用配置前已经加载完成
2. **默认配置**：如果加载配置失败，应用会使用代码中定义的默认配置
3. **缓存控制**：配置请求会添加时间戳参数避免浏览器缓存
4. **类型安全**：配置接口有完整的 TypeScript 类型定义
5. **敏感信息**：不要在配置文件中存储敏感密钥，应该通过环境变量或后端 API 获取

## 环境变量与运行时配置对照表

| 旧环境变量        | 新配置路径             | 说明          |
| ----------------- | ---------------------- | ------------- |
| `VITE_BASEAPI`    | `api.baseApi`          | 基础 API 地址 |
| `VITE_AppName`    | `app.name`             | 应用名称      |
| `VITE_NET_WORK`   | `blockchain.network`   | 区块链网络    |
| `VITE_ETH_CHAIN`  | `blockchain.ethChain`  | 以太坊链      |
| `VITE_CHAT_API`   | `api.chatApi`          | 聊天 API      |
| `VITE_PAY_AMOUNT` | `blockchain.payAmount` | 支付金额      |
| ...               | ...                    | ...           |

完整对照表请参考 `src/config/app-config.ts` 文件。
