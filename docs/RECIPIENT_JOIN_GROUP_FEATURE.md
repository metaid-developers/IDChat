# 邀请链接接收者加群功能实现文档

## 概述

实现了接收者点击邀请链接后的完整加群流程,包括白名单验证、passcode 解密、加群 API 调用和本地数据保存。

## 实现日期

2024 年 11 月 23 日

## 功能描述

当被邀请用户点击私密群聊邀请链接时:

1. 检查用户是否在群组白名单中
2. 如果在白名单中,解密邀请链接中的 passcode 获取 passwordKey
3. 调用 joinChannel API 加入群组
4. 保存 passwordKey 到本地数据库用于后续消息加解密
5. 自动跳转到群聊页面

## 技术实现

### 1. 邀请链接格式更新

**文件**: `src/utils/talk.ts`

**修改点**: `batchInviteUsersToGroup` 函数

在邀请链接中添加发送者的 metaId,以便接收者可以获取发送者的公钥来解密 passcode:

```typescript
// 添加发送者的 metaId,以便接收者可以获取发送者的公钥来解密 passcode
const senderMetaId = userStore.last?.metaid
inviteUrl = `${window.location.origin}/channels/private/${groupId}?passcode=${encodedPasscode}&from=${senderMetaId}`
```

**链接格式**:

- 公开群聊: `/channels/public/{groupId}`
- 私密群聊: `/channels/private/{groupId}?passcode={encryptedPasswordKey}&from={senderMetaId}`

### 2. 路由配置

**文件**: `src/router.ts`

路由已预先配置好:

```typescript
{
  path: '/channels/:groupType(public|private)/:groupId',
  name: 'channelInvite',
  component: () => import('@/views/talk/ChannelInvite.vue'),
  meta: { isAuth: true },
}
```

### 3. ChannelInvite.vue 组件实现

**文件**: `src/views/talk/ChannelInvite.vue`

#### 3.1 组件状态

```typescript
const loading = ref(true) // 加载中
const joining = ref(false) // 加群中
const error = ref('') // 错误信息
const success = ref(false) // 成功状态
const successMessage = ref('') // 成功消息
const groupInfo = ref<SimpleChannel | null>(null) // 群组信息
const isMember = ref(false) // 是否已是成员
const decryptedPasswordKey = ref('') // 解密后的 passwordKey
```

#### 3.2 URL 参数提取

```typescript
const groupType = computed(() => route.params.groupType as 'public' | 'private')
const groupId = computed(() => route.params.groupId as string)
const passcode = computed(() => route.query.passcode as string | undefined)
const fromMetaId = computed(() => route.query.from as string | undefined)
const isPrivateGroup = computed(() => groupType.value === 'private')
```

#### 3.3 组件挂载时的初始化流程

```typescript
onMounted(async () => {
  // 1. 检查用户登录状态
  if (!userStore.isAuthorized) {
    error.value = t('talk.please_login_first')
    return
  }

  // 2. 验证 groupId 格式
  if (!groupId.value || !groupId.value.match(/^[a-fA-F0-9]{64}i0$/)) {
    error.value = t('talk.invalid_invite_link')
    return
  }

  // 3. 私密群聊需要 passcode 和 fromMetaId
  if (isPrivateGroup.value && (!passcode.value || !fromMetaId.value)) {
    error.value = t('talk.private_group_requires_passcode')
    return
  }

  // 4. 初始化 store
  await simpleTalkStore.autoInit()

  // 5. 检查是否已是群成员
  const channel = simpleTalkStore.channels.find(ch => ch.id === groupId.value)

  if (channel) {
    // 已是成员
    groupInfo.value = channel
    isMember.value = true
  } else {
    // 不是成员,获取群聊信息
    const channelData = await getOneChannel(groupId.value)
    groupInfo.value = {
      id: groupId.value,
      type: 'group',
      name: channelData.roomName || t('talk.unknown_group'),
      avatar: channelData.roomAvatarUrl,
      createdBy: channelData.createUserMetaId || '',
      createdAt: Date.now(),
      unreadCount: 0,
      roomJoinType: isPrivateGroup.value ? '100' : '1',
      userCount: channelData.userCount,
      roomNote: channelData.roomNote,
    }
    isMember.value = false
  }
})
```

#### 3.4 加群处理流程

```typescript
const handleJoinGroup = async () => {
  if (isMember.value) {
    // 已是成员,直接跳转
    goToChannel()
    return
  }

  joining.value = true

  try {
    // 步骤 1: 检查白名单(私密群聊)
    if (isPrivateGroup.value) {
      const controlListRes = await getGroupJoinControlList({ groupId: groupId.value })

      if (controlListRes.code !== 0) {
        throw new Error(t('talk.whitelist_check_failed'))
      }

      const whitelist = controlListRes.data.joinWhitelistMetaIds || []
      const currentUserMetaId = userStore.last?.metaid

      if (!whitelist.includes(currentUserMetaId)) {
        // 不在白名单中
        error.value = t('talk.not_in_whitelist')
        return
      }
    }

    // 步骤 2: 解密 passcode(私密群聊)
    if (isPrivateGroup.value && passcode.value && fromMetaId.value) {
      // 2.1 获取发送者的公钥
      const senderInfo = await getUserInfoByMetaId(fromMetaId.value)
      if (!senderInfo.chatpubkey) {
        throw new Error(t('talk.sender_pubkey_not_found'))
      }

      // 2.2 使用 ECDH 协商密钥
      const ecdhResult = await window.metaidwallet.common.ecdh({
        externalPubKey: senderInfo.chatpubkey,
      })
      const sharedSecret = ecdhResult.sharedSecret

      // 2.3 URL 解码 passcode
      const decodedPasscode = decodeURIComponent(passcode.value)

      // 2.4 使用 AES 解密获取 passwordKey
      decryptedPasswordKey.value = ecdhDecrypt(decodedPasscode, sharedSecret)

      if (!decryptedPasswordKey.value) {
        throw new Error(t('talk.passcode_decrypt_failed'))
      }
    }

    // 步骤 3: 调用加群 API
    const joinResult = await joinChannel(groupId.value, '', decryptedPasswordKey.value || '')

    if (joinResult.status === 'failed') {
      throw new Error(t('talk.join_group_api_failed'))
    }

    // 步骤 4: 创建本地频道记录
    const passwordKey = decryptedPasswordKey.value || groupId.value.substring(0, 16)

    const newChannel: SimpleChannel = {
      id: groupId.value,
      type: 'group',
      name: groupInfo.value?.name || t('talk.unknown_group'),
      avatar: groupInfo.value?.avatar,
      createdBy: groupInfo.value?.createdBy || '',
      createdAt: Date.now(),
      unreadCount: 0,
      roomJoinType: isPrivateGroup.value ? '100' : '1',
      passwordKey, // 关键: 保存解密后的 passwordKey
      userCount: groupInfo.value?.userCount,
      roomNote: groupInfo.value?.roomNote,
    }

    // 步骤 5: 保存到本地数据库和 store
    await simpleTalkStore.db.saveChannel(newChannel)
    simpleTalkStore.channels.push(newChannel)

    success.value = true
    successMessage.value = t('talk.join_group_success')

    // 2秒后自动跳转
    setTimeout(() => {
      goToChannel()
    }, 2000)
  } catch (err) {
    console.error('❌ 加群失败:', err)
    const errorMessage = (err as Error).message || t('talk.join_group_failed')
    ElMessage.error(errorMessage)
    error.value = errorMessage
  } finally {
    joining.value = false
  }
}
```

### 4. 国际化文本

**文件**:

- `src/languages/zh.json`
- `src/languages/en.json`

**新增字段**:

| 键名                    | 中文                             | 英文                                                    |
| ----------------------- | -------------------------------- | ------------------------------------------------------- |
| whitelist_check_failed  | 白名单检查失败                   | Whitelist check failed                                  |
| not_in_whitelist        | 您不在该群组的白名单中，无法加入 | You are not in the whitelist and cannot join this group |
| sender_pubkey_not_found | 无法获取发送者的公钥             | Unable to get sender's public key                       |
| passcode_decrypt_failed | 通行码解密失败                   | Passcode decryption failed                              |
| join_group_api_failed   | 加群 API 调用失败                | Join group API call failed                              |

## 加密流程

### 发送者生成邀请链接

1. 使用 ECDH 协商密钥: `window.metaidwallet.common.ecdh({ externalPubKey: receiverPublicKey })`
2. 使用共享密钥加密 passwordKey: `AES.encrypt(passwordKey, sharedSecret)`
3. URL 编码: `encodeURIComponent(encryptedPasswordKey)`
4. 生成链接: `/channels/private/${groupId}?passcode=${encoded}&from=${senderMetaId}`

### 接收者解密 passcode

1. 从 URL 获取 `passcode` 和 `from` 参数
2. 通过 `from` (senderMetaId) 获取发送者的公钥
3. 使用 ECDH 协商密钥: `window.metaidwallet.common.ecdh({ externalPubKey: senderPublicKey })`
4. URL 解码: `decodeURIComponent(passcode)`
5. 使用共享密钥解密: `AES.decrypt(decodedPasscode, sharedSecret)`
6. 得到 passwordKey 用于后续消息加解密

## API 调用

### getGroupJoinControlList

**用途**: 查询群组的白名单和黑名单

**请求**:

```typescript
{
  groupId: string
}
```

**响应**:

```typescript
{
  code: number
  data: {
    groupId: string
    joinWhitelistMetaIds: string[] | null
    joinBlockMetaIds: string[] | null
  }
  message: string
}
```

### getUserInfoByMetaId

**用途**: 获取用户信息,包括公钥

**请求**: `metaId: string`

**响应**:

```typescript
{
  chatpubkey: string // 用户的 ECDH 公钥
  // ... 其他用户信息
}
```

### joinChannel

**用途**: 加入群组

**请求**:

```typescript
(
  groupId: string,
  referrer?: string,
  passcode?: string  // 这里的 passcode 是解密后的 passwordKey
)
```

**响应**:

```typescript
{
  status: 'success' | 'failed'
  groupId?: string
}
```

## 用户界面

### 加载状态

显示加载动画和提示文本

### 错误状态

- 显示错误图标
- 显示错误信息
- 提供"返回首页"按钮

### 成功状态

- 显示成功图标
- 显示成功消息
- 提供"进入群聊"按钮
- 2 秒后自动跳转

### 群组信息展示

- 群组头像
- 群组名称
- 成员数量
- 群组简介(如果有)
- 私密群聊提示(黄色背景)
- "加入群组"/"进入群聊"按钮(根据是否已是成员)

## 测试场景

### 场景 1: 公开群聊

1. 用户点击公开群聊邀请链接
2. 系统验证用户登录状态
3. 显示群组信息
4. 用户点击"加入群组"
5. 调用 joinChannel API
6. 保存到本地数据库
7. 跳转到群聊页面

### 场景 2: 私密群聊(在白名单中)

1. 用户点击私密群聊邀请链接(包含 passcode 和 from 参数)
2. 系统验证用户登录状态
3. 检查白名单,确认用户在白名单中
4. 获取发送者公钥
5. 使用 ECDH 协商共享密钥
6. 解密 passcode 获得 passwordKey
7. 调用 joinChannel API
8. 保存到本地数据库(包含 passwordKey)
9. 跳转到群聊页面

### 场景 3: 私密群聊(不在白名单中)

1. 用户点击私密群聊邀请链接
2. 系统验证用户登录状态
3. 检查白名单,发现用户不在白名单中
4. 显示错误信息: "您不在该群组的白名单中，无法加入"
5. 用户无法加入群组

### 场景 4: 已是群成员

1. 用户点击邀请链接
2. 系统检测到用户已是该群成员
3. 显示"进入群聊"按钮(而不是"加入群组")
4. 点击后直接跳转到群聊页面

### 场景 5: 解密失败

1. 用户点击私密群聊邀请链接
2. 解密 passcode 失败(可能是链接损坏或密钥不匹配)
3. 显示错误信息: "通行码解密失败"
4. 用户无法加入群组

## 安全考虑

1. **白名单验证**: 私密群聊强制检查白名单,只有被邀请的用户才能加入
2. **端到端加密**: passwordKey 使用 ECDH + AES 加密传输,确保只有指定接收者能解密
3. **URL 安全**: passcode 经过 URL 编码,防止特殊字符导致的解析错误
4. **登录验证**: 必须登录后才能访问邀请链接
5. **格式验证**: 严格验证 groupId 格式,防止恶意链接

## 依赖

- **Wallet API**: `window.metaidwallet.common.ecdh()` - ECDH 密钥协商
- **Crypto**: `ecdhDecrypt()` - AES 解密
- **IndexedDB**: SimpleChatDB - 本地数据存储
- **Vue Router**: 路由跳转和参数提取
- **Element Plus**: UI 组件和消息提示
- **i18n**: 多语言支持

## 后续优化建议

1. **缓存优化**: 缓存已获取的发送者公钥,避免重复请求
2. **错误重试**: 网络请求失败时提供重试机制
3. **链接过期**: 添加邀请链接过期时间,提高安全性
4. **批量处理**: 支持一次性处理多个邀请链接
5. **离线支持**: 缓存群组信息,支持离线查看邀请详情
6. **通知功能**: 成功加入后发送系统通知
7. **分享功能**: 加入成功后提供分享群聊功能

## 相关文档

- [批量邀请功能文档](./BATCH_INVITE_FEATURE.md)
- [发送邀请消息文档](./SEND_INVITE_MESSAGE.md)
- [邀请链接渲染文档](./INVITE_LINK_RENDERING.md)
- [私密群聊配置系统](./CONFIG_SYSTEM.md)

## 更新日志

- 2024-11-23: 初始实现
  - 添加白名单验证
  - 实现 passcode 解密逻辑
  - 集成 joinChannel API
  - 保存 passwordKey 到本地数据库
  - 添加国际化文本
  - 完善错误处理和用户反馈
