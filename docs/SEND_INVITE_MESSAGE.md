# 发送邀请消息功能实现

## 更新日期

2025 年 11 月 23 日

## 功能说明

实现了通过私聊消息自动发送邀请链接给用户的功能，集成到批量邀请流程中。

## 实现位置

**文件：** `src/utils/talk.ts`

**函数：** `sendInviteMessage` (第 2073-2161 行)

## 函数签名

```typescript
const sendInviteMessage = async (
  toMetaId: string,      // 接收方 MetaId
  inviteUrl: string,     // 邀请链接
  sharedSecret?: string  // ECDH 共享密钥（可选）
) => Promise<void>
```

## 实现流程

```
1. 构建消息内容
   ├─ 如果有 sharedSecret（私密群聊）
   │  └─ AES 加密邀请链接：AES.encrypt(inviteUrl, sharedSecret)
   └─ 否则（公开群聊）
      └─ 使用明文邀请链接

2. 构建消息数据
   ├─ protocol: NodeName.SimpleMsg
   ├─ contentType: 'text/plain'
   ├─ encrypt: 'ecdh'
   └─ externalEncryption: '0'

3. 创建 Mock 消息
   └─ 显示在发送方的聊天界面

4. 发送到区块链
   └─ 调用 tryCreateNode(node, mockId)
```

## 代码示例

### 发送私密群聊邀请

```typescript
// 在 batchInviteUsersToGroup 中
const { sharedSecret } = await window.metaidwallet.common.ecdh({
  externalPubKey: user.chatPublicKey,
})

const inviteUrl = `${origin}/channels/private/${groupId}?passcode=${encodedPasscode}`

// 发送加密邀请消息
await sendInviteMessage(user.metaId, inviteUrl, sharedSecret)
```

### 发送公开群聊邀请

```typescript
const inviteUrl = `${origin}/channels/public/${groupId}`

// 发送明文邀请消息
await sendInviteMessage(user.metaId, inviteUrl)
```

## 消息格式

### 私密群聊消息

```json
{
  "protocol": "SimpleMsg",
  "body": {
    "to": "abc123...",
    "timestamp": 1700000000000,
    "content": "U2FsdGVkX1... (AES加密后的密文)",
    "contentType": "text/plain",
    "encrypt": "ecdh",
    "replyPin": ""
  },
  "externalEncryption": "0"
}
```

**content 内容：**

```
AES.encrypt(
  "https://app.com/channels/private/groupId?passcode=...",
  sharedSecret
).toString()
```

### 公开群聊消息

```json
{
  "protocol": "SimpleMsg",
  "body": {
    "to": "abc123...",
    "timestamp": 1700000000000,
    "content": "https://app.com/channels/public/groupId",
    "contentType": "text/plain",
    "encrypt": "ecdh",
    "replyPin": ""
  },
  "externalEncryption": "0"
}
```

## 安全性

### 双重加密（私密群聊）

1. **第一层：passcode 加密**

   ```
   passwordKey → AES(passwordKey, sharedSecret) → base64 → URL encode
   ```

2. **第二层：链接加密**

   ```
   inviteUrl → AES(inviteUrl, sharedSecret) → base64
   ```

3. **总体安全链**
   ```
   原始 passwordKey
     ↓ AES 加密（共享密钥 A）
   URL 中的 passcode
     ↓ 组合成完整链接
   邀请链接
     ↓ AES 加密（共享密钥 B，同一个）
   传输的消息内容
   ```

### 为什么要双重加密？

1. **passcode 加密**：确保群组密钥只有特定用户能解密
2. **链接加密**：防止链接在传输过程中被窃取

### 密钥来源

- **sharedSecret**：通过 ECDH 协商获得
  ```typescript
  const { sharedSecret } = await window.metaidwallet.common.ecdh({
    externalPubKey: user.chatPublicKey, // 接收方公钥
  })
  ```
- 每个用户使用不同的共享密钥
- 无法从通信内容推导出密钥

## 错误处理

```typescript
try {
  await sendInviteMessage(user.metaId, inviteUrl, sharedSecret)
  console.log(`📨 邀请消息已发送给用户 ${user.metaId.slice(0, 8)}...`)
} catch (sendError) {
  console.error(`⚠️ 发送邀请消息失败（链接已生成）:`, sendError)
  // 即使发送失败，邀请链接已生成，仍然标记为成功
}
```

**设计理念：**

- 发送消息失败不影响邀请状态
- 链接已生成并添加到白名单
- 用户可以通过其他方式分享链接

## 日志输出

### 成功流程

```
🔒 邀请链接已加密, 密文长度: 128
🚀 发送私聊消息到: abc123...
📨 邀请消息已发送给用户 abc123...
```

### 失败处理

```
⚠️ 发送邀请消息失败（链接已生成）: 用户取消操作
✅ 用户 abc123... 邀请链接生成成功
```

## Mock 消息

发送方会在聊天界面看到一条 mock 消息：

```typescript
{
  mockId: "xyz789",       // 前端唯一ID
  txId: "",               // 等待区块链确认后填充
  from: "发送方 metaId",
  to: "接收方 metaId",
  content: "加密的邀请链接",
  timestamp: 1700000000000,
  protocol: "SimpleMsg",
  chatType: 0,            // 文本消息
  // ... 其他字段
}
```

## 接收方体验

1. **收到消息通知**
2. **打开消息**：看到加密内容
3. **系统自动解密**：
   - 使用接收方私钥 + 发送方公钥
   - ECDH 协商出相同的 sharedSecret
   - AES 解密得到邀请链接
4. **点击链接加入群组**

## 与批量邀请的集成

```typescript
// 在 batchInviteUsersToGroup 函数中
for (const user of userList) {
  try {
    // 1. 生成邀请链接（可能包含加密的 passcode）
    let inviteUrl = ''
    let sharedSecret: string | undefined = undefined

    if (isPrivateGroup && user.chatPublicKey) {
      const ecdhResult = await window.metaidwallet.common.ecdh({
        externalPubKey: user.chatPublicKey,
      })
      sharedSecret = ecdhResult.sharedSecret

      const encryptedPasscode = CryptoJS.AES.encrypt(passwordKey, sharedSecret).toString()

      inviteUrl = `${origin}/channels/private/${groupId}?passcode=${encodedPasscode}`
    } else {
      inviteUrl = `${origin}/channels/public/${groupId}`
    }

    // 2. 记录成功结果
    results.push({
      metaId: user.metaId,
      userName: user.userName,
      status: 'success',
      inviteUrl,
    })

    // 3. 发送邀请消息（新增步骤）
    try {
      await sendInviteMessage(user.metaId, inviteUrl, sharedSecret)
      console.log(`📨 邀请消息已发送给用户 ${user.metaId.slice(0, 8)}...`)
    } catch (sendError) {
      console.error(`⚠️ 发送邀请消息失败（链接已生成）:`, sendError)
      // 不影响整体流程
    }
  } catch (err) {
    // 处理生成链接失败的情况
    results.push({
      metaId: user.metaId,
      status: 'failed',
      error: err.message,
    })
  }
}
```

## 测试要点

### 功能测试

- [ ] 私聊消息成功发送
- [ ] 公开群聊链接正确发送
- [ ] 私密群聊链接正确加密
- [ ] Mock 消息显示在聊天列表
- [ ] 区块链交易成功确认

### 加密测试

- [ ] 接收方能正确解密链接
- [ ] 第三方无法解密链接内容
- [ ] 不同用户收到不同的加密内容
- [ ] ECDH 密钥协商成功

### 错误处理测试

- [ ] 钱包拒绝签名时的处理
- [ ] 网络异常时的处理
- [ ] 发送失败不影响邀请状态
- [ ] 错误日志正确输出

### 用户体验测试

- [ ] 接收方能看到消息通知
- [ ] 点击链接能正确跳转
- [ ] 解密后的链接格式正确
- [ ] 能成功加入群组

## 相关文件

- `src/utils/talk.ts` - 消息发送实现
- `src/utils/crypto.ts` - 加密解密工具
- `src/stores/simple-talk.ts` - 消息存储
- `src/hooks/use-build-tx.ts` - 交易构建

## 依赖项

- `crypto-js` - AES 加密
- `window.metaidwallet.common.ecdh` - ECDH 密钥协商
- `tryCreateNode` - 发送节点到区块链
- `simpleTalkStore.addMessage` - 添加 mock 消息

## 未来优化

1. **消息模板**

   - 支持自定义邀请消息文案
   - 添加群组名称和描述
   - 支持多语言模板

2. **批量发送优化**

   - 并行发送多条消息
   - 失败自动重试
   - 进度条显示

3. **消息追踪**
   - 记录消息发送状态
   - 用户已读状态
   - 点击链接统计

## 总结

`sendInviteMessage` 函数完成了批量邀请流程的最后一环，实现了：

✅ 自动发送邀请链接给用户
✅ 双重加密保证安全性
✅ 完善的错误处理
✅ 详细的日志输出
✅ 与批量邀请流程无缝集成

现在用户只需勾选要邀请的用户，点击"批量邀请"按钮，系统会自动：

1. 添加到白名单
2. 生成邀请链接
3. 发送私聊消息
4. 显示邀请结果

整个流程自动化、安全、可靠！
