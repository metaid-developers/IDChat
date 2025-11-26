import { MemberRule, RuleOp } from '@/enum'
import { SubChannel } from './talk'

// 简化的聊天类型定义
export type ChatType = 'group' | 'private' | 'sub-group'

// @提及记录
export interface MentionRecord {
  id: string // 唯一ID: `${channelId}_${messageIndex}`
  channelId: string // 频道/群组ID
  messageId: string // 消息ID (txId)
  messageIndex: number // 消息索引，用于快速跳转
  timestamp: number // 消息时间戳
  senderMetaId: string // 发送者MetaId
  senderName: string // 发送者名称
  content: string // 消息内容预览
  isRead: number // 是否已读 (0:未读, 1:已读) 用于IndexedDB索引
  createdAt: number // 记录创建时间
}

// export type MessageType = 'text' | 'image' | 'reply'
export interface MuteNotifyItem {
  groupId: string
  groupType: 'group' | 'private'
  status: boolean
}

export interface ShowSubChannleHeaderItem {
  groupId: string
  status: boolean
}

export interface BlockedChats {
  userId: string
  chatId: string
  chatType: 'group' | 'private'
  blockedAt: number
  reason: string
}

export interface GroupUserRoleInfo {
  metaId: string
  address: string
  userInfo: ChatUserInfo
  groupId: string
  channelId: string
  isCreator: boolean
  isAdmin: boolean
  isBlocked: boolean
  isWhitelist: boolean
  isRemoved: boolean
}

export interface MemberItem {
  id?: string
  index?: number
  start?: number
  rule: MemberRule
  permission: RuleOp[]
  address?: string
  metaId?: string
  timeStr?: string
  timestamp?: number
  userInfo?: {
    address: string
    avatar?: string // 改为可选
    avatarImage?: string // 改为可选
    chatPublicKey: string
    chatPublicKeyId?: string // 改为可选
    metaid: string
    name: string
  }
  [key: string]: unknown
}

export interface MemberListRes {
  admins: MemberItem[]
  blockList: MemberItem[]
  creator: MemberItem | null
  list: MemberItem[]
  whiteList: MemberItem[]
}

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
  groupId: string // 所属群聊ID
  channelId: string // 子群聊的唯一标识
  metanetId: string // MetaNet ID，通常与channelId相同
  txId: string // 交易ID
  pinId: string // Pin ID
  metaId: string // 创建者metaId
  address: string // 创建者地址
  userInfo: ChatUserInfo // 创建者用户信息
  nickName: string // 创建者昵称
  protocol: string // 协议类型，如 "/protocols/simplegroupchat"
  content: string // 内容，可能是加密的
  contentType: string // 内容类型，如 "text/plain"
  encryption: string // 加密类型，如 "aes"
  version: string // 版本号
  chatType: number // 聊天类型
  data: any // 额外数据，通常为 null
  replyPin: string // 回复消息的 pin，通常为空字符串
  replyInfo: any | null // 回复消息的详细信息，通常为 null
  replyMetaId: string // 回复的 metaId，通常为空字符串
  timestamp: number // 创建时间戳
  params: string // 参数，通常为空字符串
  chain: string // 区块链类型，如 "mvc" 或 "btc"
  blockHeight: number // 区块高度
  index: number // 索引
}

// 群聊子频道列表 API 响应
export interface GroupChannelListResponse {
  code: number
  message: string
  data: {
    total: number
    list: SubChannel[]
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
  unreadCount: number // 注意: 这个字段现在通过 lastMessage.index - lastReadIndex 动态计算，而不是存储值
  lastReadIndex?: number
  unreadMentionCount?: number // 未读的@提及数量（持久化字段）
  mentionCheckTimestamp?: number // 最后一次计算提及数量的时间戳
  // 私聊特有字段
  targetMetaId?: string // 私聊对象的metaId
  publicKeyStr?: string // 私聊加密公钥
  // 子群聊特有字段
  parentGroupId?: string // 如果是子群聊，指向主群聊ID
  // 群聊权限信息
  memberPermissions?: MemberListRes // 存储群成员权限信息
  permissionsLastUpdated?: number // 权限信息最后更新时间
  // 群聊的加入类型（来自服务端 roomJoinType），例如 '1'、'100' 等
  roomJoinType?: string
  // 群聊路径（来自服务端 path）
  path?: string
  // 私密群聊的密码密钥（仅当 roomJoinType==='100' 且当前用户是创建者时存在）
  passwordKey?: string
  // 保存原始服务端数据
  serverData?: any
  // 临时频道标识
  isTemporary?: boolean // 标识是否为临时创建的频道（不在默认channels列表中）
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

  // @ 提及功能字段
  mention: Array<string>

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

// 搜索结果类型定义
export interface SearchUserItem {
  type?: 'user'
  metaId: string
  address: string
  userName: string
  avatar: string
  avatarId: string
  chatPublicKey: string
  chatPublicKeyId: string
  timestamp: number
}

export interface SearchGroupItem {
  type: 'group'
  groupId: string
  groupName: string
  groupIcon?: string
  pinId: string
  memberCount: number
  timestamp: number
}

export type SearchResultItem = SearchUserItem | SearchGroupItem

export interface SearchGroupsAndUsersResponse {
  code: number
  data: {
    total: number
    list: SearchResultItem[]
  }
  message: string
  processingTime: number
}
