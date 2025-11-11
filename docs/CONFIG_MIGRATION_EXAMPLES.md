# 配置系统实战示例

## 示例 1: 修改 API 服务使用运行时配置

### 修改前：使用环境变量

```typescript
// src/api/index.ts
const baseApi = import.meta.env.VITE_BASEAPI
const metasvApi = import.meta.env.VITE_META_SV_API

const Http = new HttpRequest(baseApi, {})
```

### 修改后：使用运行时配置

```typescript
// src/api/index.ts
import { getRuntimeConfig } from '@/config/runtime-config'

const config = getRuntimeConfig()
const baseApi = config.api.baseApi
const metasvApi = config.api.metaSvApi

const Http = new HttpRequest(baseApi, {})
```

## 示例 2: 在组件中使用配置

### 修改前

```vue
<script setup lang="ts">
const appName = import.meta.env.VITE_AppName
const baseApi = import.meta.env.VITE_BASEAPI

function openMetanote() {
  window.open(`${import.meta.env.VITE_METANOTE}/detail/${txId}`, '_blank')
}
</script>
```

### 修改后

```vue
<script setup lang="ts">
import { getAppConfig } from '@/config/app-config'

const config = getAppConfig()
const appName = config.appName
const baseApi = config.baseApi

function openMetanote() {
  window.open(`${config.metanoteUrl}/detail/${txId}`, '_blank')
}
</script>
```

## 示例 3: 在工具函数中使用配置

### 修改前

```typescript
// src/utils/util.ts
export function setDocumentTitle(title: string) {
  document.title = `${title} - ${import.meta.env.VITE_AppName}`
}

export function getImageUrl(metafile: string) {
  return `${import.meta.env.VITE_AppImgApi}/metafile/${metafile}`
}

export function getMinAmount() {
  return parseInt(import.meta.env.VITE_MinAmount)
}
```

### 修改后

```typescript
// src/utils/util.ts
import { getAppConfig } from '@/config/app-config'

export function setDocumentTitle(title: string) {
  const config = getAppConfig()
  document.title = `${title} - ${config.appName}`
}

export function getImageUrl(metafile: string) {
  const config = getAppConfig()
  return `${config.appImgApi}/metafile/${metafile}`
}

export function getMinAmount() {
  const config = getAppConfig()
  return config.minAmount
}
```

## 示例 4: 在 WebSocket 连接中使用配置

### 修改前

```typescript
// src/stores/ws_new.ts
const ws = io(`${import.meta.env.VITE_SHOW_NOW_WS}`, {
  path: `${import.meta.env.VITE_IDCHAT_PATH_WS}/socket.io`,
})
```

### 修改后

```typescript
// src/stores/ws_new.ts
import { getRuntimeConfig } from '@/config/runtime-config'

const config = getRuntimeConfig()
const ws = io(config.api.showNowWs, {
  path: `${config.api.idchatPathWs}/socket.io`,
})
```

## 示例 5: 在区块链操作中使用配置

### 修改前

```typescript
// src/hooks/use-build-tx.ts
const network = import.meta.env.VITE_NET_WORK
const serviceAddress = import.meta.env.VITE_SERVICE_ADDRESS
const serviceFee = import.meta.env.VITE_SERVICE_FEE

const tx = {
  path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
  network,
  serviceFee,
}
```

### 修改后

```typescript
// src/hooks/use-build-tx.ts
import { getAppConfig } from '@/config/app-config'

const config = getAppConfig()
const network = config.network
const serviceAddress = config.serviceAddress
const serviceFee = config.serviceFee

const tx = {
  path: `${config.addressHost}:/protocols/${protocol}`,
  network,
  serviceFee,
}
```

## 示例 6: 功能开关控制

### 在路由中使用功能开关

```typescript
// src/router.ts
import { getAppConfig } from '@/config/app-config'

router.beforeEach((to, from, next) => {
  const config = getAppConfig()

  // 如果聊天功能未启用，重定向
  if (to.path.startsWith('/chat') && !config.enableChat) {
    ElMessage.warning('聊天功能暂未开放')
    next('/')
    return
  }

  next()
})
```

### 在组件中使用功能开关

```vue
<template>
  <div>
    <ChatButton v-if="config.enableChat" />
    <PaymentButton v-if="config.enablePayment" />
  </div>
</template>

<script setup lang="ts">
import { getAppConfig } from '@/config/app-config'

const config = getAppConfig()
</script>
```

## 示例 7: 白名单检查

### 修改前

```typescript
// src/config.ts
const whiteList = ['16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo', '1APkQsxmFLtVKT9Fng7Z6t7pSJ3q17km1F']

export function canCreateBroadcast(address: string) {
  return whiteList.includes(address)
}
```

### 修改后

```typescript
// src/config.ts
import { getRuntimeConfig } from '@/config/runtime-config'

export function canCreateBroadcast(address: string) {
  const config = getRuntimeConfig()
  return config.whiteListCreateBroadcast.includes(address)
}
```

## 示例 8: 链配置使用

### 修改前

```typescript
// src/utils/util.ts
const chainMap = {
  [import.meta.env.VITE_ETH_CHAINID]: import.meta.env.VITE_ETH_CHAIN,
  [import.meta.env.VITE_POLYGON_CHAINID]: import.meta.env.VITE_POLYGON_CHAIN,
}

export function getChainName(chainId: number) {
  return chainMap[chainId]
}
```

### 修改后

```typescript
// src/utils/util.ts
import { getAppConfig } from '@/config/app-config'

export function getChainName(chainId: number) {
  const config = getAppConfig()
  const chainMap = {
    [config.ethChainId]: config.ethChain,
    [config.polygonChainId]: config.polygonChain,
  }
  return chainMap[chainId]
}
```

## 示例 9: 在 Pinia Store 中使用

```typescript
// src/stores/config.ts
import { defineStore } from 'pinia'
import { getRuntimeConfig, reloadRuntimeConfig } from '@/config/runtime-config'
import { getAppConfig } from '@/config/app-config'

export const useConfigStore = defineStore('config', {
  state: () => ({
    config: getAppConfig(),
  }),

  actions: {
    async reloadConfig() {
      await reloadRuntimeConfig()
      this.config = getAppConfig()
      console.log('配置已重新加载')
    },
  },

  getters: {
    apiEndpoints: state => ({
      base: state.config.baseApi,
      chat: state.config.chatApi,
      metasv: state.config.metaSvApi,
      dao: state.config.daoApi,
    }),

    blockchainConfig: state => ({
      network: state.config.network,
      ethChain: state.config.ethChain,
      polygonChain: state.config.polygonChain,
    }),

    features: state => ({
      chat: state.config.enableChat,
      payment: state.config.enablePayment,
    }),
  },
})
```

## 示例 10: 部署场景

### 场景 1: 部署到测试环境

```bash
# 1. 切换到开发配置
node scripts/switch-config.js dev

# 2. 构建
yarn build:chat

# 3. 部署 dist/ 目录
# (可以直接修改 dist/app-config.json 切换到其他环境)
```

### 场景 2: 部署到生产环境后临时切换 API

```bash
# 在服务器上修改 dist/app-config.json
{
  "api": {
    "baseApi": "https://api-backup.example.com",
    ...
  }
}

# 刷新浏览器即可生效，无需重新构建！
```

### 场景 3: A/B 测试不同配置

```nginx
# Nginx 配置
location /app-config.json {
  # 50% 用户使用配置 A
  if ($random ~ "^[0-4]") {
    rewrite ^ /app-config-a.json break;
  }
  # 50% 用户使用配置 B
  rewrite ^ /app-config-b.json break;
}
```

## 总结

### ✅ 优势

1. **无需重新构建**：修改配置后只需刷新页面
2. **环境隔离**：不同环境使用不同配置文件
3. **类型安全**：完整的 TypeScript 类型定义
4. **易于维护**：集中管理所有配置
5. **灵活部署**：支持多种部署场景

### 📋 迁移检查清单

- [ ] 更新 API 服务配置
- [ ] 更新组件中的环境变量引用
- [ ] 更新工具函数中的环境变量引用
- [ ] 更新 WebSocket 连接配置
- [ ] 更新区块链相关配置
- [ ] 更新路由守卫
- [ ] 测试所有功能开关
- [ ] 验证配置文件格式
- [ ] 测试打包后配置修改
- [ ] 更新部署文档
