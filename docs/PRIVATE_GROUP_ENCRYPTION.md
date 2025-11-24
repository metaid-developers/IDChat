# 私密群聊邀请加密实现方案

## 概述

本文档描述了私密群聊邀请链接中 passwordKey 加密传输的实现方案。

## 流程图

```
邀请方（群主）                       被邀请方（用户）
     |                                    |
     | 1. 获取被邀请用户的 chatPublicKey    |
     |    TODO: 接口待更新                 |
     |                                    |
     | 2. 使用 ECDH 协商密钥               |
     |    - 邀请方私钥                     |
     |    + 被邀请方公钥                   |
     |    = 共享密钥 (secret)              |
     |                                    |
     | 3. 使用共享密钥 AES 加密 passwordKey |
     |    encryptedPasscode = encrypt(    |
     |      passwordKey, secret           |
     |    )                               |
     |                                    |
     | 4. 生成邀请链接                     |
     |    /channels/private/:groupId?     |
     |    passcode=encryptedPasscode      |
     |                                    |
     | ------- 发送邀请链接 ------->       |
     |                                    |
     |                                    | 5. 点击链接
     |                                    |
     |                                    | 6. 使用 ECDH 协商密钥
     |                                    |    - 被邀请方私钥
     |                                    |    + 邀请方公钥
     |                                    |    = 相同的共享密钥
     |                                    |
     |                                    | 7. 解密 passcode
     |                                    |    passwordKey = decrypt(
     |                                    |      encryptedPasscode, secret
     |                                    |    )
     |                                    |
     |                                    | 8. 保存到本地
     |                                    |    channel.passwordKey = passwordKey
```

## 关键技术点

### 1. ECDH（椭圆曲线 Diffie-Hellman）密钥交换

ECDH 允许双方在不安全的信道上交换信息，生成一个共享的密钥，而第三方无法从交换的信息中推导出这个密钥。

```typescript
// 伪代码示例
async function getEcdhSharedSecret(myPrivateKey: string, otherPublicKey: string): Promise<string> {
  // 使用 mvc-ecies 或类似库
  const ecdh = new ECDH()
  const sharedSecret = ecdh.computeSecret(myPrivateKey, otherPublicKey)
  return sharedSecret
}
```

### 2. AES 加密/解密

使用 ECDH 协商出的共享密钥作为 AES 对称加密的密钥。

```typescript
// 加密
async function encryptPasswordKey(passwordKey: string, sharedSecret: string): Promise<string> {
  // 使用 sharedSecret 作为 AES 密钥
  const encrypted = AES.encrypt(passwordKey, sharedSecret)
  return encrypted.toString() // Base64 编码
}

// 解密
async function decryptPasswordKey(
  encryptedPasscode: string,
  sharedSecret: string
): Promise<string> {
  // 使用 sharedSecret 作为 AES 密钥
  const decrypted = AES.decrypt(encryptedPasscode, sharedSecret)
  return decrypted.toString(CryptoJS.enc.Utf8)
}
```

## 实现位置

### 1. ChannelMemberListDrawer.vue - 邀请功能

文件：`src/views/talk/components/ChannelMemberListDrawer.vue`

函数：`handleInviteUser()`

TODO 标记：

```typescript
// TODO: 获取用户的 chatPublicKey（等待接口更新）
// const userChatPublicKey = await getUserChatPublicKey(user.metaId)

// TODO: 使用 ECDH 协商密钥加密 passwordKey
// const ecdh = await getEcdhPublickey(userChatPublicKey)
// const encryptedPasscode = encrypt(currentChannelInfo.value.passwordKey, ecdh.secret)
```

当前临时实现：

```typescript
// 临时使用未加密的 passcode（等待 chatPublicKey 接口）
const passcode = currentChannelInfo.value.passwordKey
const inviteUrl = `${window.location.origin}/channels/private/${groupId}?passcode=${passcode}`
```

### 2. ChannelInvite.vue - 接受邀请

文件：`src/views/talk/ChannelInvite.vue`

TODO 标记：

```typescript
// TODO: 解密 passcode（使用 ECDH 协商密钥）
// const decryptedPasswordKey = await decryptPasscode(passcode.value)

// 临时直接使用 passcode
const passwordKey = passcode.value
```

## API 需求

### 获取用户的 chatPublicKey

**✅ 已实现：使用 BatchGetUsersEcdhPubkeyForPrivateChat 接口**

```typescript
// 接口定义
export const BatchGetUsersEcdhPubkeyForPrivateChat = (params: {
  metaIds?: string[]
  addresses?: string[]
}): Promise<Array<{
  metaid: string
  name: string
  avatar: string
  avatarImage: string
  chatPublicKey: string
  chatPublicKeyId: string
  address: string
}>>

// 使用示例
const userInfos = await BatchGetUsersEcdhPubkeyForPrivateChat({
  metaIds: ['user1', 'user2']
})
```

**实现位置：**

- `src/api/talk.ts` - API 函数定义
- `src/views/talk/components/ChannelMemberListDrawer.vue` - 调用实现

**功能说明：**

1. 在搜索用户后，自动批量获取所有搜索结果用户的 chatPublicKey
2. 存储在 `userChatPublicKeys` Map 中，key 为 metaId，value 为 chatPublicKey
3. 如果用户没有 chatPublicKey，邀请按钮会被禁用
4. 鼠标悬停在禁用按钮上会显示提示："该用户未开通私聊"

## 工具函数实现建议

### 创建新文件：`src/utils/encryption.ts`

```typescript
import CryptoJS from 'crypto-js'

/**
 * 使用 ECDH 计算共享密钥
 * @param myPrivateKey 自己的私钥
 * @param otherPublicKey 对方的公钥
 * @returns 共享密钥
 */
export async function computeECDHSecret(
  myPrivateKey: string,
  otherPublicKey: string
): Promise<string> {
  // TODO: 实现 ECDH 密钥协商
  // 使用 mvc-ecies.min.js 或其他加密库
  throw new Error('Not implemented')
}

/**
 * 加密 passwordKey
 * @param passwordKey 群聊密码密钥
 * @param secret ECDH 共享密钥
 * @returns Base64 编码的加密数据
 */
export function encryptPasswordKey(passwordKey: string, secret: string): string {
  const encrypted = CryptoJS.AES.encrypt(passwordKey, secret)
  return encrypted.toString()
}

/**
 * 解密 passwordKey
 * @param encryptedPasscode 加密的密码
 * @param secret ECDH 共享密钥
 * @returns 解密后的 passwordKey
 */
export function decryptPasswordKey(encryptedPasscode: string, secret: string): string {
  const decrypted = CryptoJS.AES.decrypt(encryptedPasscode, secret)
  return decrypted.toString(CryptoJS.enc.Utf8)
}

/**
 * 获取自己的私钥（从钱包）
 */
export async function getMyPrivateKey(): Promise<string> {
  // TODO: 从 window.metaidwallet 获取私钥
  // 或者使用其他安全的方式
  throw new Error('Not implemented')
}
```

## 安全考虑

1. **共享密钥的一致性**：确保邀请方和被邀请方使用相同的 ECDH 算法和参数
2. **URL 安全**：加密后的 passcode 应该 URL 编码，避免特殊字符问题
3. **过期机制**：考虑为邀请链接添加过期时间
4. **重放攻击**：考虑添加 nonce 或 timestamp 防止重放攻击
5. **密钥存储**：passwordKey 存储在 IndexedDB 时应该考虑额外的保护措施

## 测试计划

1. **单元测试**：

   - ECDH 密钥协商正确性
   - AES 加密/解密对称性
   - Base64 编码/解码

2. **集成测试**：

   - 完整的邀请流程
   - 用户 A 邀请用户 B
   - 用户 B 成功加入并能够解密消息

3. **错误处理测试**：
   - chatPublicKey 不存在
   - 加密/解密失败
   - 网络错误

## 依赖库

- `crypto-js`: AES 加密/解密
- `mvc-ecies.min.js`: ECDH 密钥协商（已在 public/ 目录）
- `mvc.min.js`: 比特币签名验证（已在 public/ 目录）

## 实施步骤

1. ✅ 创建路由和页面框架
2. ✅ 添加翻译字符串
3. ✅ 集成 BatchGetUsersEcdhPubkeyForPrivateChat 接口
4. ✅ 实现邀请按钮禁用逻辑（未开通私聊的用户）
5. ✅ 添加提示信息显示
6. ⏳ 实现 `src/utils/encryption.ts` 工具函数
7. ⏳ 更新 `handleInviteUser()` 使用 ECDH 加密
8. ⏳ 更新 `ChannelInvite.vue` 使用 ECDH 解密
9. ⏳ 编写单元测试和集成测试
10. ⏳ 端到端测试

## 参考资料

- [ECDH 密钥交换原理](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman)
- [AES 加密标准](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
- [CryptoJS 文档](https://cryptojs.gitbook.io/docs/)
