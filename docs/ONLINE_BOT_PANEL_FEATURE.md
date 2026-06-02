# 在线 Bot 面板开发文档

日期：2026-06-02

## 背景

当前 `idchat` 左侧栏已经有搜索入口、创建群聊按钮和会话列表。用户希望在搜索框左侧增加一个小文字按钮 `在线Bot`，点击后在左侧会话列表上方浮出一个在线 Bot 列表面板。用户点击某个 Bot 后，右侧进入与该 Bot 的私聊，会话也应能在左侧列表中看到。

本功能只改聊天前端交互，不改变后端在线状态语义。

## 已确认的现有代码入口

- 左侧会话列表容器：`src/views/talk/components/direct-contact/List.vue`
- 顶部搜索栏：`src/views/talk/components/direct-contact/Search.vue`
- 会话列表 item：`src/views/talk/components/direct-contact/Item.vue`
- 搜索弹窗及远程用户跳私聊示例：`src/views/talk/components/direct-contact/SearchModal.vue`
- 私聊路由：`/talk/@me/:channelId`，路由名 `talkAtMe`
- 私聊频道创建和切换：`src/stores/simple-talk.ts`
  - `setActiveChannel(channelId)`
  - `createTemporaryChannel(channelId)`
  - `createPrivateChat(targetGlobalMetaId)`
- API 基础地址：`VITE_CHAT_API()`，默认指向 `https://api.idchat.io/chat-api`

## 后端 API 契约

在线列表接口来自 `show-now-tmp` 的 Group Chat socket presence API：

```text
GET ${VITE_CHAT_API()}/group-chat/socket/online-users?cursor=0&size=100&withUserInfo=true
```

响应外层：

```ts
interface ApiResponse<T> {
  code: number
  data: T
  message: string
  processingTime: number
}
```

业务数据：

```ts
interface OnlineUsersData {
  total: number
  cursor: number
  size: number
  onlineWindowSeconds: number
  list: OnlineUserItem[]
}

interface OnlineUserItem {
  globalMetaId: string
  lastSeenAt: number
  lastSeenAgoSeconds: number
  deviceCount: number
  userInfo?: {
    globalMetaId: string
    metaid: string
    address: string
    name: string
    avatar: string
    avatarImage: string
    bio: string | Record<string, unknown>
    chatPublicKey: string
    chatPublicKeyId: string
  }
}
```

字段使用规则：

- `globalMetaId` 是私聊启动的主键。
- 列表展示名称优先用 `userInfo.name`，兜底为 `globalMetaId` 截断。
- 头像优先用 `userInfo.avatarImage`，为空或加载失败时复用 `ChatIcon` 的首两字圆形头像兜底。
- 简介优先用 `userInfo.bio`。当 `bio` 是 object 或 JSON object 字符串时，优先取 `primaryProvider`、`fallbackProvider` 或 `LLM/llm`，以 `LLM：{provider}` 展示；如果在线列表没带出可解析的 LLM 信息，则用 `globalMetaId` 补查 `/info/globalmetaid/{globalMetaId}` 的 `/info/bio`；仍为空时显示最近在线状态，例如 `刚刚在线` 或 `20 分钟内活跃`。
- `chatPublicKey` 是可私聊能力判断字段。没有 `chatPublicKey` 的条目第一版建议不展示，避免点进去后无法发送私聊。
- 在线状态在入口按钮和每个 Bot 名字右侧用小绿点提示，不额外增加说明文案。

开放项：接口语义是“在线用户”，不是严格“在线 Bot”。如果后端已有 Bot 身份标记，前端应新增过滤字段；如果没有，第一版按“有 `chatPublicKey` 的在线实体”展示，并在标题和代码注释中保留后续精确过滤位置。

## Frontend Skill 设计约束

Visual thesis：这是一个安静、轻量的操作层，浮在左侧会话列表上，不抢走主聊天区注意力。

Content plan：入口按钮、在线 Bot 面板、Bot 列表项、点击进入私聊。

Interaction thesis：

- `在线Bot` 按钮点击后面板轻微淡入并从上方滑入。
- 列表项 hover 只做背景加深和文字清晰度变化，保持会话列表同一套手感。
- 点击 Bot 后立即关闭面板，左侧隐藏规则跟现有会话点击保持一致，右侧进入私聊。

## 推荐方案

推荐方案 A：在 `direct-contact/List.vue` 内部管理浮动面板状态。

实现方式：

- `Search.vue` 在搜索框左侧增加 `在线Bot` 小文字按钮，并通过 `emit('open-online-bots')` 通知父组件。
- `List.vue` 监听 `@open-online-bots`，控制 `OnlineBotPanel.vue` 的显示。
- 新增 `OnlineBotPanel.vue`，绝对定位在左侧会话列表容器内，宽度略窄于会话列表，覆盖在列表上方。
- 新增 `src/api/online-bots.ts` 或在 `src/api/talk.ts` 增加 `getOnlineBots()`，封装在线列表接口和字段归一化。
- 点击 Bot 时调用统一的私聊启动函数：`simpleTalkStore.createPrivateChat(globalMetaId)` 或 `simpleTalkStore.setActiveChannel(globalMetaId)`，然后 `router.push({ name: 'talkAtMe', params: { channelId: globalMetaId } })`。

优点：

- 改动集中在左侧栏，不影响全局搜索弹窗。
- 位置和截图要求一致。
  - 后续可以独立加刷新、筛选。

备选方案 B：复用 `SearchModal.vue` 做在线 Bot tab。

优点是复用搜索弹窗的远程用户点击逻辑；缺点是它现在是全屏覆盖，不符合截图里“浮在左侧会话列表上方”的产品要求。

备选方案 C：做成全局右/左抽屉。

优点是独立性强；缺点是打断聊天主界面，也不符合用户指定位置。

结论：采用方案 A。

## 组件设计

### Search.vue

增加小文字按钮：

- 文案：`在线Bot`
- 位置：搜索框左侧，截图蓝色框区域。
- 尺寸：高度与搜索框接近，宽度按文字自适应，建议 `h-8 px-2.5`。
- 状态：
  - 未登录时隐藏或置灰。建议第一版隐藏，和现有 `+` 按钮一致依赖 `userStore.isAuthorized`。
  - 打开面板时增加轻微选中背景。

新增 emit：

```ts
interface Emits {
  (e: 'open-search'): void
  (e: 'open-online-bots'): void
}
```

### List.vue

新增状态：

```ts
const isOnlineBotPanelVisible = ref(false)
```

新增方法：

```ts
const handleOpenOnlineBots = () => {
  isOnlineBotPanelVisible.value = true
}

const handleOnlineBotSelect = async (bot: OnlineBot) => {
  isOnlineBotPanelVisible.value = false
  await simpleTalkStore.createPrivateChat(bot.globalMetaId)
  await simpleTalkStore.setActiveChannel(bot.globalMetaId)
  router.push({ name: 'talkAtMe', params: { channelId: bot.globalMetaId } })
}
```

注意：现有 `_allChannels` 会过滤 `isTemporary`。如果使用 `setActiveChannel()` 创建临时频道，左侧列表可能看不到该 Bot。为了满足“左侧对话列表应该能看得到这个 Bot”，实现时优先使用 `createPrivateChat()` 创建非临时私聊频道，或调整 `_allChannels` 允许当前激活临时私聊显示。

### OnlineBotPanel.vue

职责：

- 拉取在线 Bot 列表。
- 显示加载态、空态、错误态。
- 渲染头像、名称、简介。
- 关闭面板。
- 选择 Bot 时向父组件 emit。

建议 props/emits：

```ts
interface Emits {
  (e: 'close'): void
  (e: 'select', bot: OnlineBot): void
}
```

布局：

- 定位在 `List.vue` 的左侧栏内容容器内。
- `position: absolute; top: 56px; left: 12px; right: 12px;`
- 宽度比左侧列表略窄。
- 最大高度 `calc(100vh - 112px)`，内部滚动。
- `z-index` 高于会话列表，低于全局搜索弹窗。
- 右上角关闭按钮，使用现有 `Icon name="x"` 或文字 `×`。

列表 item：

- 头像：`ChatIcon`，尺寸 48。
- 名称：单行截断。
- 简介：`bio` 两行或单行截断，样式接近现有会话摘要。
- 在线状态：名称右侧显示很小的绿点，不占用主要视觉。
- 分页：一页 100 个在线 Bot，超过 100 时底部显示上一页/下一页。

## API 封装设计

新增类型：

```ts
export interface OnlineBot {
  globalMetaId: string
  name: string
  avatar: string
    bio: string
  chatPublicKey: string
  lastSeenAt: number
  lastSeenAgoSeconds: number
  deviceCount: number
}
```

归一化规则：

```ts
const normalizeOnlineBot = (item: OnlineUserItem): OnlineBot | null => {
  const userInfo = item.userInfo
  const globalMetaId = userInfo?.globalMetaId || item.globalMetaId
  if (!globalMetaId) return null
  if (!userInfo?.chatPublicKey) return null

  return {
    globalMetaId,
    name: userInfo.name || `${globalMetaId.slice(0, 8)}...`,
    avatar: userInfo.avatarImage || userInfo.avatar || '',
    bio: userInfo.bio || '',
    chatPublicKey: userInfo.chatPublicKey,
    lastSeenAt: item.lastSeenAt,
    lastSeenAgoSeconds: item.lastSeenAgoSeconds,
    deviceCount: item.deviceCount,
  }
}
```

请求策略：

- 打开面板时请求第一页，`size=100`。
- 使用 `cursor` 翻页，每页固定最多 100 条。
- 每次打开都可刷新一次，保证“在线”有实时感。
- 请求失败时展示一行错误和重试按钮，不影响原会话列表。

## 私聊启动流程

点击在线 Bot：

1. 校验当前用户已登录且 `userStore.last?.chatpubkey` 存在。
2. 如果点击自己，提示或忽略。
3. 调用 `simpleTalkStore.createPrivateChat(globalMetaId)`，创建可在左侧显示的私聊频道。
4. 调用 `simpleTalkStore.setActiveChannel(globalMetaId)`，加载消息。
5. 跳转 `router.push({ name: 'talkAtMe', params: { channelId: globalMetaId } })`。
6. 关闭在线 Bot 面板。
7. 移动端沿用现有左侧栏隐藏逻辑：`layout.isShowLeftNav = false`。

失败处理：

- 当前用户没有私聊公钥：复用现有 `self_private_chat_unsupport` 提示。
- 目标 Bot 没有 `chatPublicKey`：不展示；如果接口后续返回了但点击时校验失败，提示“该 Bot 暂未开启私聊”。
- `createPrivateChat()` 返回空：保留面板关闭前的错误提示，不切换路由。

## 测试和验收

开发完成后至少验证：

- `npm run type-check` 或当前项目可用的 TypeScript 检查命令。
- `npm run build:chat`。
- 本地浏览器打开聊天页，确认：
  - `在线Bot` 出现在搜索框左侧。
  - 点击后面板浮在左侧会话列表上方，宽度略窄于左栏。
  - 面板可关闭，不能拖动。
  - 列表显示头像、名字、简介。
  - 空态、错误态不会遮断原会话列表操作。
  - 点击某个 Bot 后右侧进入私聊。
  - 点击后该 Bot 能出现在左侧会话列表。
  - 暗色模式下文字、背景、hover 可读。
  - 移动端左侧栏展开时布局不溢出。

## 不在第一版范围

- 在线 Bot 搜索。
- 按能力、服务、技能分类。
- WebSocket 实时订阅在线列表变化。
- 精确 Bot 身份过滤，除非后端已经在在线列表中返回稳定字段。
- 面板拖动、固定、调整大小。

## 实施顺序

1. 新增 API 类型和 `getOnlineBots()`。
2. 新增 `OnlineBotPanel.vue`。
3. 修改 `Search.vue` 增加 `在线Bot` 按钮和 emit。
4. 修改 `List.vue` 接入面板、选择事件和私聊启动。
5. 修正左侧列表对新私聊频道的可见性。
6. 运行构建和浏览器验收。
