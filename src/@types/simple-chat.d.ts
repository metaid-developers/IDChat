// 简化的聊天类型定义
export type ChatType = 'group' | 'private'

// export type MessageType = 'text' | 'image' | 'reply'

export enum MessageType {
  msg = 0,
  red = 23,
  img = 3,
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
  lastMessage?: {
    content: string
    sender: string
    senderName: string
    timestamp: number
    type: MessageType
    chatPublicKey?: string // 私聊加密公钥
  }
  unreadCount: number
  // 私聊特有字段
  targetMetaId?: string // 私聊对象的metaId
  publicKeyStr?: string // 私聊加密公钥
  // 保存原始服务端数据
  serverData?: any
}

// 简化的消息结构
export interface SimpleMessage {
  id: string
  channelId: string
  sender: string // metaId
  senderName: string
  senderAvatar?: string
  senderChatPublicKey?: string
  content: string
  timestamp: number
  type: MessageType
  replyTo?: string // 回复消息ID
  // Mock消息标识（发送中状态）
  isMock?: boolean
  mockId?: string
  // 加密相关（私聊）
  isEncrypted?: boolean
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
