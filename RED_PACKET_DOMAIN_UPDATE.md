# 红包接口 Domain 动态切换功能

## 概述

优化了红包相关接口 `grabRedPacket` 和 `getRedPacketRemains`，支持根据 `getOneRedPacket` 返回的 `domain` 字段动态切换请求地址。

## 背景

当红包数据包含自定义 `domain` 字段时，需要使用该 domain 替换默认的 API 地址进行请求，以支持多域名红包服务。

## 主要改动

### 1. API 接口修改 (`src/api/talk.ts`)

#### `getRedPacketRemains` 接口

添加可选的 `domain` 参数：

```typescript
export const getRedPacketRemains = async (params: {
  groupId: string
  pinId: string
  domain?: string // 新增：可选的自定义 domain
}): Promise<any> => {
  const { domain, ...queryParams } = params
  const path =
    params.groupId === TESTGROUPID ? '/lucky-bag-unused-info-v2' : '/lucky-bag-unused-info'
  const query = new URLSearchParams(queryParams as any).toString()

  // 如果提供了 domain，使用自定义 domain 请求
  if (domain) {
    return axios
      .get(`${domain}/group-chat${path}?${query}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(res => {
        if (res.data?.code === 0) {
          return res.data.data
        }
        throw new Error(res.data?.message || 'Request failed')
      })
  }

  // 使用默认 API
  return TalkApi.get(`${path}?${query}`).then(res => {
    return res.data
  })
}
```

#### `grabRedPacket` 接口

添加可选的 `domain` 参数：

```typescript
export const grabRedPacket = async (params: {
  groupId: string
  pinId: string
  metaId: string
  address: string
  domain?: string // 新增：可选的自定义 domain
}): Promise<any> => {
  const { domain, ...requestParams } = params
  const path = params.groupId === TESTGROUPID ? '/grab-lucky-bag-v2' : '/grab-lucky-bag'

  // 如果提供了 domain，使用自定义 domain 请求
  if (domain) {
    return axios
      .post(`${domain}/group-chat${path}`, requestParams, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then(res => {
        if (res.data?.code === 0) {
          return res.data.data
        } else {
          throw new Error(res.data?.message || res.data)
        }
      })
      .catch(e => {
        throw new Error(e.message)
      })
  }

  // 使用默认 API
  return TalkApi.post(`${path}`, requestParams)
    .then(res => {
      if (res?.code == 0) {
        return res.data
      } else {
        throw new Error(res.data)
      }
    })
    .catch(e => {
      throw new Error(e.message)
    })
}
```

### 2. 红包打开弹窗修改 (`src/views/talk/components/modals/red-packet/Open.vue`)

#### 领取红包时传递 domain

在 `tryOpenRedPacket` 函数中：

```typescript
const tryOpenRedPacket = async () => {
  try {
    layout.isShowLoading = true
    const params: any = {
      groupId: simpleTalk.activeChannel?.parentGroupId || simpleTalk.activeChannelId,
      pinId: `${message?.txId}i0`,
      metaId: simpleTalk.selfMetaId,
      address: simpleTalk.selfAddress,
    }

    // 如果红包信息中包含 domain 字段，传递给 grabRedPacket
    if (redPacket.value?.domain) {
      params.domain = redPacket.value.domain
    }

    await grabRedPacket(params)
    // ...
  } catch (error) {
    // ...
  }
}
```

#### 查询剩余红包时传递 domain

在 `onMounted` 钩子中：

```typescript
onMounted(async () => {
  const params: any = {
    groupId,
    pinId,
  }

  // 如果红包信息中包含 domain 字段，传递给 getRedPacketRemains
  if (redPacket.value?.domain) {
    params.domain = redPacket.value.domain
  }

  getRedPacketRemains(params).then(res => {
    remains.value = res.unused
  })
  // ...
})
```

## 工作流程

```
1. 用户点击红包消息
   ↓
2. MessageItem.vue 调用 getOneRedPacket()
   ↓
3. 获取红包信息（可能包含 domain 字段）
   ↓
4. 打开红包弹窗，传递红包信息到 Open.vue
   ↓
5. Open.vue 检查 redPacket.value?.domain
   ↓
6. 如果存在 domain，传递给 grabRedPacket() 和 getRedPacketRemains()
   ↓
7. 接口使用自定义 domain 发送请求
```

## 数据结构

### getOneRedPacket 返回示例

```typescript
{
  pinId: "xxx",
  groupId: "xxx",
  count: 10,
  usedCount: 3,
  requireType: "1",
  domain: "https://custom-domain.com",  // 可选字段
  payList: [...],
  // ... 其他字段
}
```

### 请求地址对比

**默认请求地址：**

```
${config.api.chatApi}/group-chat/grab-lucky-bag
```

**使用自定义 domain 的请求地址：**

```
${domain}/group-chat/grab-lucky-bag
```

例如：

- 默认: `https://api.example.com/group-chat/grab-lucky-bag`
- 自定义: `https://custom-domain.com/group-chat/grab-lucky-bag`

## 兼容性

- **向后兼容**：如果红包数据中没有 `domain` 字段，接口会使用默认的 API 地址
- **可选参数**：`domain` 参数是可选的，不影响现有功能
- **透明传递**：从 `getOneRedPacket` → `Open.vue` → `grabRedPacket/getRedPacketRemains` 的数据流是透明的

## 使用场景

1. **单域名红包**（默认）：红包数据不包含 `domain` 字段，使用默认 API
2. **多域名红包**：红包数据包含 `domain` 字段，使用指定的 domain 进行请求
3. **跨域红包服务**：支持不同的红包服务提供商，通过 domain 区分

## 测试要点

1. ✅ 测试不包含 domain 字段的红包（应使用默认 API）
2. ✅ 测试包含 domain 字段的红包（应使用自定义 domain）
3. ✅ 测试查询剩余红包数量
4. ✅ 测试领取红包
5. ✅ 测试 domain 为空字符串的情况
6. ✅ 测试 domain 格式错误的容错处理
7. ✅ 测试 TESTGROUPID 特殊群组的处理

## 注意事项

1. **请求头**：自定义 domain 请求使用 `axios`，需要设置正确的请求头
2. **错误处理**：保持与默认 API 相同的错误处理逻辑
3. **响应格式**：确保自定义 domain 的响应格式与默认 API 一致
4. **安全性**：需要验证 domain 的合法性（在实际使用中可以添加白名单机制）

## 潜在改进

1. **Domain 白名单**：添加允许的 domain 白名单，防止恶意请求
2. **缓存策略**：对相同 domain 的请求进行缓存优化
3. **超时控制**：为自定义 domain 请求设置合理的超时时间
4. **日志记录**：记录使用自定义 domain 的请求，便于排查问题
