# API 文件迁移指南

## 问题说明

在模块顶层直接调用 `VITE_CHAT_API()` 等函数会导致错误，因为：

1. 这些函数内部调用 `getRuntimeConfig()`
2. 运行时配置需要在应用启动时通过 `loadRuntimeConfig()` 异步加载
3. 但模块导入时就会执行顶层代码，此时配置还未加载

## 解决方案

使用 `createLazyApiClient` 工厂函数创建延迟初始化的 API 客户端。

### 示例：修改 talk.ts

#### ❌ 错误写法（会报错）

```typescript
import { VITE_CHAT_API } from '@/config/app-config'

// 这行代码在模块加载时就会执行，但配置可能还未加载
const TalkApi = new HttpRequest(`${VITE_CHAT_API()}/group-chat`, options).request
```

#### ✅ 正确写法

```typescript
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

// 使用工厂函数，只在第一次使用时才初始化
const TalkApi = createLazyApiClient(() => {
  const config = getRuntimeConfig()
  return `${config.api.chatApi}/group-chat`
}, options)
```

## 需要修改的文件列表

### 1. src/api/talk.ts ✅ 已完成

```typescript
// 之前
const TalkApi = new HttpRequest(`${VITE_CHAT_API()}/group-chat`, {...}).request

// 之后
const TalkApi = createLazyApiClient(
  () => `${getRuntimeConfig().api.chatApi}/group-chat`,
  {...}
)
```

### 2. src/api/aggregation.ts

```typescript
// 之前
const aggregation = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/aggregation`, {
  SiteConfigMetanetId: import.meta.env.VITE_SiteConfigMetanetId,
}).request

// 之后
import { createLazyApiClient } from '@/utils/api-factory'
import { getRuntimeConfig } from '@/config/runtime-config'

const aggregation = createLazyApiClient(() => `${getRuntimeConfig().api.baseApi}/aggregation`, {
  SiteConfigMetanetId: getRuntimeConfig().other.siteConfigMetanetId,
})
```

### 3. src/api/legal.ts

```typescript
// 之前
const Legal = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/legal-currency`, {...}).request

// 之后
const Legal = createLazyApiClient(
  () => `${getRuntimeConfig().api.baseApi}/legal-currency`,
  {...}
)
```

### 4. src/api/metaname.ts

```typescript
// 之前
const metanameApi = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/metaname-indexer`, {...}).request

// 之后
const metanameApi = createLazyApiClient(
  () => `${getRuntimeConfig().api.baseApi}/metaname-indexer`,
  {...}
)
```

### 5. src/api/dao.ts

```typescript
// 之前
const DAO = new HttpRequest(`${import.meta.env.VITE_DAO_API}`, {...}).request

// 之后
const DAO = createLazyApiClient(
  () => getRuntimeConfig().api.daoApi,
  {...}
)
```

### 6. src/api/dashbroad.ts

```typescript
// 之前
const Dashbroad = new HttpRequest(import.meta.env.VITE_Dashbroad_API, {...}).request

// 之后
const Dashbroad = createLazyApiClient(
  () => getRuntimeConfig().api.dashbroadApi,
  {...}
)
```

### 7. 其他 API 文件

所有使用 `import.meta.env.VITE_BASEAPI` 的文件：

```typescript
// 通用模式
import { createLazyApiClient } from '@/utils/api-factory'
import { getRuntimeConfig } from '@/config/runtime-config'

const ApiClient = createLazyApiClient(() => `${getRuntimeConfig().api.baseApi}/endpoint`, options)
```

## 批量迁移脚本

为了方便批量修改，可以创建一个脚本：

```bash
# 查找所有需要修改的文件
grep -r "import.meta.env.VITE_" src/api/*.ts
```

## 迁移检查清单

- [x] src/api/talk.ts
- [ ] src/api/aggregation.ts
- [ ] src/api/legal.ts
- [ ] src/api/metaname.ts
- [ ] src/api/dao.ts
- [ ] src/api/dashbroad.ts
- [ ] src/api/canvas-base.ts
- [ ] src/api/metaid-base.ts
- [ ] src/api/core.ts
- [ ] src/api/avatar.ts
- [ ] src/api/wxcore.ts
- [ ] src/api/smirktiger.ts
- [ ] src/api/buzz.ts
- [ ] src/api/broad.ts
- [ ] src/api/showman.ts
- [ ] src/api/dormancy.ts
- [ ] src/api/v3.ts
- [ ] src/api/pay.ts

## 测试

修改后，测试以下场景：

1. ✅ 应用启动正常
2. ✅ API 调用正常工作
3. ✅ 配置加载日志正确
4. ✅ 打包后修改配置文件能正常工作

## 注意事项

1. **不要在模块顶层调用配置函数**

   ```typescript
   // ❌ 错误
   const api = VITE_BASEAPI()

   // ✅ 正确 - 在函数内部调用
   function getApi() {
     return VITE_BASEAPI()
   }

   // ✅ 正确 - 使用延迟初始化
   const client = createLazyApiClient(() => VITE_BASEAPI())
   ```

2. **HttpRequest options 中的配置值也需要延迟获取**

   ```typescript
   // ❌ 错误
   const client = createLazyApiClient(() => getRuntimeConfig().api.baseApi, {
     apiKey: getRuntimeConfig().security.secretKey, // 这里会在模块加载时执行
   })

   // ✅ 正确 - 修改 createLazyApiClient 支持动态 options
   // 或者在 options 中使用函数
   ```

3. **确保配置已在 main.ts 中加载**

   ```typescript
   // main.ts
   import { loadRuntimeConfig } from '@/config/runtime-config'

   async function bootstrap() {
     await loadRuntimeConfig() // 必须在创建 app 之前
     const app = createApp(App)
     // ...
   }
   bootstrap()
   ```

## 遇到问题？

如果遇到 "Runtime config not loaded" 错误：

1. 检查 `main.ts` 中是否调用了 `loadRuntimeConfig()`
2. 确保配置加载完成后才挂载应用
3. 检查浏览器控制台是否有配置加载日志
