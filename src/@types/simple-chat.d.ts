// 简化的聊天类型定义 - 添加子群聊类型
export type ChatType = 'group' | 'private' | 'sub-group'

// export type MessageType = 'text' | 'image' | 'reply'

export enum MessageType {
  msg = 0,
  red = 23,
  img = 3,
}

// 群聊房间详细信息
export interface GroupRoomInfo {
  communityId: string
  groupId: string
  txId: string
  pinId: string
  roomName: string
  roomNote: string
  roomIcon: string
  roomType: string
  roomStatus: string
  roomJoinType: string
  roomAvatarUrl: string
  roomNinePersonHash: string
  roomNewestTxId: string
  roomNewestPinId: string
  roomNewestMetaId: string
  roomNewestUserName: string
  roomNewestProtocol: string
  roomNewestContent: string
  roomNewestTimestamp: number
  createUserMetaId: string
  createUserAddress: string
  createUserInfo: ChatUserInfo
  userCount: number
  chatSettingType: number
  deleteStatus: number
  timestamp: number
  chain: string
  blockHeight: number
  index: number
}

// 群聊房间信息 API 响应
export interface GroupRoomInfoResponse {
  code: number
  data: GroupRoomInfo
  message: string
  processingTime: number
}

// 子群聊频道信息
export interface GroupChannel {
  channelId: string // 子群聊的唯一标识
  groupId: string // 所属群聊ID
  channelName: string // 子群聊名称
  channelIcon: string // 子群聊图标
  channelNote: string // 子群聊描述
  channelType: number // 子群聊类型
  createUserMetaId: string // 创建者metaId
  createUserAddress: string // 创建者地址
  timestamp: number // 创建时间戳
  chain: string // 区块链类型
  blockHeight: number // 区块高度
  index: number // 索引
}

// 群聊子频道列表 API 响应
export interface GroupChannelListResponse {
  code: number
  message: string
  data: {
    total: number
    list: GroupChannel[]
  }
  timestamp: number
}

// 简化的频道结构
export interface SimpleChannel {
  id: string
  type: ChatType
  name: string
  avatar?: string
  members?: string[] // metaId列表，私聊时只有两个成员
  createdBy: string
  createdAt: number
  roomNote?: string
  userCount?: number
  lastMessage?: {
    content: string
    sender: string
    senderName: string
    timestamp: number
    type: MessageType
    chatPublicKey?: string // 私聊加密公钥
    index?: number
  }
  unreadCount: number
  lastReadIndex?: number
  // 私聊特有字段
  targetMetaId?: string // 私聊对象的metaId
  publicKeyStr?: string // 私聊加密公钥
  // 子群聊特有字段
  parentGroupId?: string // 如果是子群聊，指向主群聊ID
  // 保存原始服务端数据
  serverData?: any
}

// 简化的用户信息
export interface SimpleUser {
  metaId: string
  name: string
  avatar?: string
  address?: string
  chatPublicKey?: string // 私聊加密公钥
}

// WebSocket消息格式
export interface WSMessage {
  M: 'WS_SERVER_NOTIFY_GROUP_CHAT' | 'WS_SERVER_NOTIFY_PRIVATE_CHAT' | 'HEART_BEAT'
  D: any // 数据载荷
  C?: number // 状态码
}

// Socket事件类型
export interface SocketEvents {
  'new-group-message': (message: SimpleMessage) => void
  'new-private-message': (message: SimpleMessage) => void
  'message-status-update': (data: {
    messageId: string
    status: 'sent' | 'delivered' | 'read'
  }) => void
  'user-online': (metaId: string) => void
  'user-offline': (metaId: string) => void
}

// 统一的聊天消息用户信息
export interface ChatUserInfo {
  metaid: string
  address: string
  name: string
  avatar?: string
  avatarImage?: string
  chatPublicKey: string
  chatPublicKeyId?: string
}

// 统一的回复消息信息
export interface ChatReplyInfo {
  channelId: string
  pinId: string
  metaId: string
  address: string
  userInfo: ChatUserInfo
  nickName: string
  protocol: string
  content: string
  contentType: string
  encryption: string
  version: string
  chatType: number
  timestamp: number
  chain: string
  blockHeight: number
  index: number
}

// 统一的聊天消息结构（支持私聊和群聊）
export interface UnifiedChatMessage {
  mockId?: string // 本地模拟的唯一ID，用于前端区分消息，非服务端字段
  error?: string // 消息错误信息，如果有的话
  // 通用字段
  txId: string // 交易ID
  pinId: string // Pin ID
  metaId: string // 发送者 metaId
  address: string // 发送者地址
  userInfo: ChatUserInfo // 发送者用户信息
  nickName: string // 昵称，通常为空字符串
  protocol: string // 协议类型
  content: string // 消息内容，可能是加密的
  contentType: string // 内容类型，如 "text/plain" 或 "png"
  encryption: string // 加密类型，如 "ecdh" 或 "aes"
  version: string // 版本号
  chatType: number // 聊天类型 0=文本消息，3=文件消息等
  data: any // 额外数据，通常为 null
  replyPin: string // 回复消息的 pin，没有回复时为空字符串
  replyInfo: ChatReplyInfo | null // 回复消息的详细信息，没有回复时为 null
  replyMetaId: string // 回复的 metaId，没有回复时为空字符串
  timestamp: number // 时间戳
  params: string // 参数，通常为空字符串
  chain: string // 区块链类型，如 "mvc" 或 "btc"
  blockHeight: number // 区块高度
  index: number // 消息索引

  // 私聊特有字段
  from?: string // 私聊：发送者的 metaId
  fromUserInfo?: ChatUserInfo // 私聊：发送者信息
  to?: string // 私聊：接收者的 metaId
  toUserInfo?: ChatUserInfo // 私聊：接收者信息

  // 群聊特有字段
  groupId?: string // 群聊：群组ID
  channelId?: string // 群聊：频道ID，通常为空字符串
  metanetId?: string // 群聊：MetaNet ID，与 groupId 相同
}

// 统一的消息列表响应数据结构
export interface UnifiedChatResponseData {
  total: number // 总消息数
  nextTimestamp: number // 下一页时间戳
  list: UnifiedChatMessage[] // 消息列表
}

// 统一的 API 响应结构
export interface UnifiedChatApiResponse {
  code: number // 响应状态码
  data: UnifiedChatResponseData // 响应数据
  message: string // 响应消息
  processingTime: number // 处理时间
}

// 类型守护函数 - 判断是否为私聊消息
export const isPrivateChatMessage = (
  message: UnifiedChatMessage
): message is UnifiedChatMessage & {
  from: string
  fromUserInfo: ChatUserInfo
  to: string
  toUserInfo: ChatUserInfo
} => {
  return !!(message.from && message.fromUserInfo && message.to && message.toUserInfo)
}

// 类型守护函数 - 判断是否为群聊消息
export const isGroupChatMessage = (
  message: UnifiedChatMessage
): message is UnifiedChatMessage & {
  groupId: string
  metanetId: string
} => {
  return !!(message.groupId && message.metanetId)
}

// 为了向后兼容，保留原有类型别名
export type PrivateChatUserInfo = ChatUserInfo
export type GroupChatUserInfo = ChatUserInfo
export type PrivateChatReplyInfo = ChatReplyInfo
export type GroupChatReplyInfo = ChatReplyInfo
export type PrivateChatMessage = UnifiedChatMessage
export type GroupChatMessage = UnifiedChatMessage
export type PrivateChatResponseData = UnifiedChatResponseData
export type GroupChatResponseData = UnifiedChatResponseData
export type PrivateChatApiResponse = UnifiedChatApiResponse
export type GroupChatApiResponse = UnifiedChatApiResponse
