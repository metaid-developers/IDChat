# ⚡ 快速参考 - 配置系统使用

## 🚀 快速开始

### 1. 启动应用

```bash
yarn chat
```

### 2. 切换环境

```bash
# 切换到开发环境
node scripts/switch-config.js dev

# 切换到生产环境
node scripts/switch-config.js prod
```

### 3. 检查迁移进度

```bash
node scripts/check-api-migration.js
```

## 📝 常用代码片段

### 在 API 文件中使用

```typescript
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

// 创建 API 客户端
const MyApi = createLazyApiClient(() => `${getRuntimeConfig().api.baseApi}/endpoint`, {
  // options
})
```

### 在组件中使用

```typescript
import { getAppConfig } from '@/config/app-config'

const config = getAppConfig()

// 使用配置
console.log(config.appName)
console.log(config.baseApi)
console.log(config.enableChat)
```

### 在普通函数中使用

```typescript
import { getRuntimeConfig } from '@/config/runtime-config'

export function myFunction() {
  const config = getRuntimeConfig()
  const network = config.blockchain.network
  // ...
}
```

## 🔧 配置文件位置

```
public/app-config.json          # 当前使用的配置
public/app-config.dev.json      # 开发环境配置
dist/app-config.json            # 打包后的配置（可直接修改）
```

## 📋 配置结构速查

```typescript
{
  app: {
    name, description, logo, favicon, designSize
  },
  api: {
    baseApi, chatApi, manApi, metasoUrl, ...
  },
  blockchain: {
    network, ethChain, polygonChain, ...
  },
  features: {
    enableChat, enablePayment, ...
  },
  whiteListCreateBroadcast: [...],
  chat: { defaultChannel },
  security: { secretKey, signMsg },
  sentry: { url, project, ... },
  other: { ... }
}
```

## 🎯 常见任务

### 修改 API 地址

```json
// 编辑 public/app-config.json
{
  "api": {
    "baseApi": "https://your-new-api.com",
    "chatApi": "https://your-chat-api.com"
  }
}
```

### 切换网络

```json
{
  "blockchain": {
    "network": "testnet", // 或 "mainnet"
    "ethChain": "goerli" // 或 "eth"
  }
}
```

### 开关功能

```json
{
  "features": {
    "enableChat": false, // 禁用聊天
    "enablePayment": true // 启用支付
  }
}
```

## ⚠️ 注意事项

1. **不要在模块顶层调用配置函数**

   ```typescript
   // ❌ 错误
   const api = VITE_BASEAPI()

   // ✅ 正确
   function getApi() {
     return VITE_BASEAPI()
   }
   ```

2. **确保配置已加载**

   - 配置在 `main.ts` 中通过 `loadRuntimeConfig()` 加载
   - 应用启动后才能使用配置

3. **修改配置后需刷新**
   - 修改 `dist/app-config.json` 后刷新浏览器
   - 或使用 `reloadRuntimeConfig()` 重新加载

## 🆘 遇到问题？

### "Runtime config not loaded" 错误

**原因：** 配置还未加载完成  
**解决：**

- 检查 `main.ts` 是否调用了 `loadRuntimeConfig()`
- 确保在配置加载后才使用相关功能
- 使用 `createLazyApiClient` 延迟初始化 API

### API 调用失败

**检查：**

1. 配置文件格式是否正确
2. API 地址是否有效
3. 网络配置是否正确

### 配置不生效

**解决：**

1. 清除浏览器缓存
2. 重新启动开发服务器
3. 检查配置文件是否有语法错误

## 📞 获取帮助

查看详细文档：

- `CONFIG_SYSTEM.md` - 系统总览
- `docs/APP_CONFIG.md` - 配置说明
- `docs/API_MIGRATION_GUIDE.md` - 迁移指南
- `MIGRATION_SUMMARY.md` - 迁移总结
