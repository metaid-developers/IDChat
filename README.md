# IDChat

<p align="center">
  <img src="public/pwa-512x512-assets/icon.png" alt="IDChat Logo" width="120" height="120">
</p>

<p align="center">
  <strong>A decentralized, blockchain-based instant messaging application built on MetaID protocol</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#license">License</a>
</p>

---

## ✨ Features

- 🔐 **Decentralized Identity** - Built on MetaID protocol, your identity is truly yours
- 💬 **End-to-End Encryption** - Private messages are encrypted using ECIES
- 👥 **Group Chat** - Create and manage encrypted group conversations
- 🧧 **Crypto Red Packets** - Send BTC/MVC red packets to friends
- 📁 **Decentralized Storage** - Files stored on blockchain via MetaFile
- 🌐 **Multi-language Support** - i18n internationalization
- 📱 **PWA Support** - Install as a native app on any device
- 🔗 **Wallet Integration** - Connect with MetaletWallet and other Web3 wallets

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16
- Yarn package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/metaid-developers/IDChat.git

# Navigate to project directory
cd IDChat

# Install dependencies
yarn install
```

### Development

```bash
# Start development server (testnet)
yarn gray

# Start development server (mainnet)
yarn mainnet
```

### Build

```bash
# Build for testnet
yarn build:gray

# Build for mainnet
yarn build:mainnet
```

## 🛠 Tech Stack

- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **UI Components**: Element Plus, Headless UI
- **Styling**: Tailwind CSS, SCSS
- **State Management**: Harlem
- **Blockchain**: MVC (MicrovisionChain), Bitcoin
- **Protocol**: MetaID

## 📁 Project Structure

```
src/
├── api/          # API service modules
├── components/   # Reusable Vue components
├── config/       # App configuration
├── hooks/        # Vue composables
├── languages/    # i18n translation files
├── layout/       # Layout components
├── lib/          # Third-party libraries
├── stores/       # State management
├── utils/        # Utility functions
├── views/        # Page components
└── wallet-adapters/  # Wallet integration adapters
```

## ⚙️ Configuration

API configuration is located in `public/app-config.json`:

```json
{
  "api": {
    "chatApi": "https://api.idchat.io",
    "chatWs": "wss://api.idchat.io",
    "fileApi": "https://file.metaid.io/metafile-indexer/api/v1/files"
  }
}
```

## 💬 聊天功能与加解密实现

IDChat 支持三种聊天模式：**公开群聊**、**私密群聊**、**私聊**，每种模式都有独立的加解密机制。

### 📋 聊天类型对比

| 特性         | 公开群聊           | 私密群聊                    | 私聊          |
| ------------ | ------------------ | --------------------------- | ------------- |
| 加密算法     | AES-CBC            | AES-CBC                     | AES + ECDH    |
| 密钥来源     | channelId 前 16 位 | 钱包派生的 passwordKey      | ECDH 共享密钥 |
| 加入方式     | 直接加入           | 邀请链接（含加密 passcode） | 直接发起      |
| roomJoinType | `'1'`              | `'100'`                     | -             |
| 群名称       | 明文               | AES 加密                    | -             |
| 图片加密     | AES (channelId)    | AES (passwordKey)           | ECDH + AES    |

---

### 1️⃣ 公开群聊 (Public Group)

#### 概述

公开群聊使用 **AES-CBC** 对称加密，密钥为 `channelId` 的前 16 位字符。

#### 密钥生成

```typescript
// 密钥 = channelId 的前 16 位
const secretKey = channelId.substring(0, 16)
```

#### 消息加密流程 (`src/utils/crypto.ts`)

```typescript
export function encrypt(message: string, secretKeyStr: string): string {
  const messageWordArray = Utf8.parse(message)
  const secretKey = Utf8.parse(secretKeyStr)
  const iv = Utf8.parse('0000000000000000') // 固定 IV

  const encrypted = AES.encrypt(messageWordArray, secretKey, {
    iv,
    mode: mode.CBC,
    padding: pad.Pkcs7,
  })

  // 转为 hex 格式
  return Buffer.from(encrypted.toString(), 'base64').toString('hex')
}
```

#### 消息解密流程

```typescript
export function decrypt(message: string, secretKeyStr: string): string {
  const secretKey = Utf8.parse(secretKeyStr)

  // hex -> base64 -> 解密
  const messageBuffer = Buffer.from(message, 'hex')
  const messageBase64 = messageBuffer.toString('base64')

  const messageBytes = AES.decrypt(messageBase64, secretKey, {
    iv,
    mode: mode.CBC,
    padding: pad.Pkcs7,
  })

  return messageBytes.toString(Utf8)
}
```

#### 发送消息 (`src/views/talk/components/TheInput.vue`)

```typescript
// 公开群聊消息加密
content = encrypt(chatInput.value, simpleTalk.activeChannel.id.substring(0, 16))
```

---

### 2️⃣ 私密群聊 (Private Group)

#### 概述

私密群聊使用更复杂的加密机制：

- **创建者**：使用钱包派生的 `passwordKey`
- **成员**：通过邀请链接获取加密的 `passcode`，用 ECDH 解密得到 `passwordKey`

#### 标识

```typescript
// roomJoinType === '100' 表示私密群聊
channel.roomJoinType === '100'
```

#### 密钥生成（创建者）

创建群聊时 (`src/utils/talk.ts`)：

```typescript
// 1. 获取唯一路径 (格式: '100/N')
const newPath = `100/${maxIndex + 1}`
dataCarrier.path = newPath

// 2. 通过钱包派生 passwordKey
const fullPath = `m/${newPath}`
const pkh = await window.metaidwallet.getPKHByPath({ path: fullPath })
const passwordKey = pkh.substring(0, 16)

// 3. 加密群名称
const encryptedGroupName = CryptoJS.AES.encrypt(groupName, passwordKey).toString()
dataCarrier.groupName = encryptedGroupName
```

#### 成员获取密钥（邀请流程）

**邀请方生成邀请链接** (`src/views/talk/components/ChannelMemberListDrawer.vue`)：

```typescript
// 1. 获取被邀请者的 chatPublicKey
const userInfo = await BatchGetUsersEcdhPubkeyForPrivateChat({ metaIds: [user.metaId] })

// 2. ECDH 协商共享密钥
const ecdhResult = await window.metaidwallet.common.ecdh({
  externalPubKey: userInfo.chatPublicKey,
})
const sharedSecret = ecdhResult.sharedSecret

// 3. 使用共享密钥加密 passwordKey
const encryptedPasscode = CryptoJS.AES.encrypt(passwordKey, sharedSecret).toString()

// 4. 生成邀请链接
const inviteUrl = `/channels/private/${groupId}?passcode=${encodeURIComponent(
  encryptedPasscode
)}&from=${myGlobalMetaId}`
```

**被邀请方解密** (`src/views/talk/ChannelInvite.vue`)：

```typescript
// 1. 获取邀请者的公钥
const senderInfo = await getUserInfoByGlobalMetaId(fromGlobalMetaId)

// 2. ECDH 协商相同的共享密钥
const ecdhResult = await window.metaidwallet.common.ecdh({
  externalPubKey: senderInfo.chatpubkey,
})
const sharedSecret = ecdhResult.sharedSecret

// 3. 解密 passcode 得到 passwordKey
const passwordKey = ecdhDecrypt(decodeURIComponent(passcode), sharedSecret)

// 4. 保存到本地频道
channel.passwordKey = passwordKey
```

#### 消息加密（子群聊支持）

```typescript
// 子群聊使用父群聊的 passwordKey
let secretKey =
  simpleTalk.activeChannel.type === 'sub-group' && parentChannel
    ? parentChannel.passwordKey
    : simpleTalk.activeChannel.passwordKey

// 加密消息
content = encrypt(chatInput.value, secretKey)
```

#### 群名称/群公告解密 (`src/stores/simple-talk.ts`)

```typescript
// 检测是否为加密内容 (Base64格式且长度>20)
if (/^[A-Za-z0-9+/=]+$/.test(channel.name) && channel.name.length > 20) {
  const decrypted = CryptoJS.AES.decrypt(channel.name, passwordKey)
  const decryptedName = decrypted.toString(CryptoJS.enc.Utf8)
  if (decryptedName) {
    channel.name = decryptedName
  }
}
```

---

### 3️⃣ 私聊 (Private Chat)

#### 概述

私聊使用 **ECDH (椭圆曲线 Diffie-Hellman)** 密钥交换 + **AES** 对称加密。

#### 密钥协商流程

```
用户A                          用户B
  |                              |
  | -- A的公钥(chatPublicKey) --> |
  | <-- B的公钥(chatPublicKey) -- |
  |                              |
  |  ECDH(A私钥, B公钥)          |  ECDH(B私钥, A公钥)
  |      = sharedSecret          |      = 相同的 sharedSecret
  |                              |
  | <-- 使用 sharedSecret 加密消息 --> |
```

#### secretKey (sharedSecret) 生成详解

**核心原理**：ECDH 算法保证 `A私钥 × B公钥 = B私钥 × A公钥`，双方无需交换私钥即可得到相同的共享密钥。

**1. 获取对方的 chatPublicKey**

每个用户在开通私聊时会生成一对密钥，公钥 `chatPublicKey` 存储在服务器：

```typescript
// 通过 API 获取对方的 chatPublicKey
const userInfo = await GetUserEcdhPubkeyForPrivateChat(targetGlobalMetaId)
const otherPublicKey = userInfo.chatPublicKey // 对方的公钥
```

**2. 调用钱包计算 sharedSecret** (`src/wallet-adapters/metalet.ts`)

```typescript
export const getEcdhPublickey = async (
  pubkey?: string
): Promise<{
  externalPubKey: string // 对方的公钥（原样返回）
  sharedSecret: string // 共享密钥（用于加解密）
  ecdhPubKey: string // 自己的 ECDH 公钥
  creatorPubkey: string
}> => {
  // 调用钱包的 ECDH 接口
  // 钱包内部使用「自己的私钥」与「对方的公钥」计算共享密钥
  const ecdh = await window.metaidwallet.common.ecdh({
    externalPubKey: pubkey, // 传入对方的公钥
  })

  return ecdh // 返回包含 sharedSecret 的对象
}
```

**3. 缓存 ECDH 结果** (`src/stores/ecdh.ts`)

为避免重复计算，将 ECDH 结果缓存到本地：

```typescript
// ECDH 结果类型
interface ECDH_TYPE {
  externalPubKey: string // 对方公钥（作为缓存 key）
  sharedSecret: string // 共享密钥
  ecdhPubKey: string
  creatorPubkey: string
}

// 存储和获取
const ecdhsStore = useEcdhsStore()
ecdhsStore.insert(ecdh, ecdh.externalPubKey) // 缓存
const cached = ecdhsStore.getEcdh(publicKey) // 读取
const sharedSecret = cached?.sharedSecret // 获取 secretKey
```

#### 创建私聊 (`src/stores/simple-talk.ts`)

```typescript
async createPrivateChat(targetGlobalMetaId: string): Promise<SimpleChannel | null> {
  // 1. 获取对方的 chatPublicKey
  const userInfo = await GetUserEcdhPubkeyForPrivateChat(targetGlobalMetaId)
  if (!userInfo.chatPublicKey) {
    throw new Error('用户未开启私聊功能')
  }

  // 2. 计算 ECDH 共享密钥
  const ecdhsStore = useEcdhsStore()
  let ecdh = ecdhsStore.getEcdh(userInfo.chatPublicKey)
  if (!ecdh) {
    ecdh = await getEcdhPublickey(userInfo.chatPublicKey)
    ecdhsStore.insert(ecdh, ecdh.externalPubKey)
  }

  // 3. 创建频道，保存对方公钥
  const newChat: SimpleChannel = {
    id: targetGlobalMetaId,
    type: 'private',
    publicKeyStr: userInfo.chatPublicKey,
    // ...
  }
}
```

#### 消息加密 (`src/utils/crypto.ts`)

```typescript
export function ecdhEncrypt(message: string, secretKey: string): string {
  return AES.encrypt(message, secretKey).toString()
}
```

#### 消息解密

```typescript
export function ecdhDecrypt(message: string, secretKey: string): string {
  const messageBytes = AES.decrypt(message, secretKey)
  return messageBytes.toString(enc.Utf8)
}
```

#### 发送私聊消息 (`src/views/talk/components/TheInput.vue`)

```typescript
// 1. 获取对方公钥
const otherPublicKey = simpleTalk.activeChannel.publicKeyStr

// 2. 从缓存获取或计算 ECDH
let ecdh = ecdhsStore.getEcdh(otherPublicKey)
if (!ecdh) {
  // 调用钱包计算 ECDH（内部使用自己私钥 + 对方公钥）
  ecdh = await getEcdhPublickey(otherPublicKey)
  ecdhsStore.insert(ecdh, ecdh.externalPubKey) // 缓存结果
}

// 3. 获取 sharedSecret（这就是 secretKey）
const sharedSecret = ecdh?.sharedSecret

// 4. 使用 sharedSecret 加密消息
content = ecdhEncrypt(chatInput.value, sharedSecret)
```

#### 接收消息解密 (`src/utils/talk.ts`)

```typescript
function decryptedMessage(
  content,
  encryption,
  protocol,
  isMock,
  isSession,
  secretKeyStr,
  publicKeyStr
) {
  if (isSession) {
    // 私聊解密
    const ecdhPubkey = publicKeyStr || simpleTalk.activeChannel.publicKeyStr
    const ecdh = ecdhsStore.getEcdh(ecdhPubkey)
    const sharedSecret = ecdh?.sharedSecret
    return ecdhDecrypt(content, sharedSecret)
  }
  // ... 群聊解密逻辑
}
```

---

### 4️⃣ 图片加密

#### 私聊图片加密 (`src/utils/crypto.ts`)

```typescript
export function ecdhEncryptForPrivateImg(message: string, secretKey: string): string {
  // 输入为 hex 格式的图片数据
  const messageWordArray = enc.Hex.parse(message)
  const secretKeyWordArray = enc.Hex.parse(secretKey)

  const encrypted = AES.encrypt(messageWordArray, secretKeyWordArray, {
    mode: mode.CBC,
    padding: pad.Pkcs7,
    iv: iv,
  })

  return encrypted.ciphertext.toString(enc.Hex)
}
```

#### 私聊图片解密

```typescript
export function ecdhDecryptForPrivateImg(message: string, secretKey: string): string {
  const messageWordArray = enc.Hex.parse(message)
  const secretKeyWordArray = enc.Hex.parse(secretKey)

  const cipherParams = { ciphertext: messageWordArray }

  const messageBytes = AES.decrypt(cipherParams, secretKeyWordArray, {
    mode: mode.CBC,
    padding: pad.Pkcs7,
    iv: iv,
  })

  return messageBytes.toString(enc.Hex)
}
```

#### 私密群聊图片

```typescript
// 子群聊使用父群聊的 passwordKey
const chatPasswordKeyForDecrypt = computed(() => {
  const activeChannel = simpleTalkStore.activeChannel

  if (activeChannel.type === 'sub-group' && activeChannel.parentGroupId) {
    const parentChannel = simpleTalkStore.getParentGroupChannel(activeChannel.parentGroupId)
    if (parentChannel?.roomJoinType === '100' && parentChannel.passwordKey) {
      return parentChannel.passwordKey
    }
  }

  return activeChannel.passwordKey || ''
})
```

---

### 5️⃣ 核心文件位置

| 功能             | 文件路径                                                            |
| ---------------- | ------------------------------------------------------------------- |
| 加解密工具函数   | `src/utils/crypto.ts`                                               |
| 消息解密统一入口 | `src/utils/talk.ts` - `decryptedMessage()`                          |
| 发送消息加密     | `src/views/talk/components/TheInput.vue`                            |
| 群聊创建         | `src/utils/talk.ts` - `createChannel()`                             |
| 私聊创建         | `src/stores/simple-talk.ts` - `createPrivateChat()`                 |
| 邀请链接处理     | `src/views/talk/ChannelInvite.vue`                                  |
| passwordKey 管理 | `src/stores/simple-talk.ts` - `fetchPasswordKeysForPrivateGroups()` |
| ECDH 密钥管理    | `src/stores/ecdh.ts`                                                |

### 6️⃣ 加密库依赖

- **crypto-js**: AES 加解密
- **mvc-ecies.min.js**: ECDH 密钥协商 (位于 `public/` 目录)
- **mvc.min.js**: 比特币签名验证 (位于 `public/` 目录)

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## 🔗 Links

- [MetaID Protocol](https://metaid.io)
- [MicrovisionChain](https://mvc.space)
- [MetaletWallet](https://metalet.space)
