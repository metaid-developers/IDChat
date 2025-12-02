// 协议卡片类型定义

// 卡片类型
export type ProtocolCardType = 'metaapp' | 'buzz' | 'note' | 'metafile' | 'none'

// 用户信息接口
export interface ProtocolCardUserInfo {
  name: string
  avatar: string
  metaid: string
}

// 卡片信息接口
export interface ProtocolCardInfo {
  shouldRender: boolean
  type: ProtocolCardType
  pinId: string
  fullUrl: string
  clickUrl: string // 点击时打开的 URL
  // 通用字段
  title?: string
  content?: string
  creator?: string
  creatorInfo?: ProtocolCardUserInfo
  timestamp?: number
  coverImg?: string
  // MetaApp 特有
  appName?: string
  version?: string
  icon?: string
  // Buzz/Note 特有
  firstImage?: string
  hasVideo?: boolean
  subtitle?: string
  // MetaFile 特有
  fileName?: string
  fileSize?: number
  fileType?: string
  fileExtension?: string
}

// MetaFile API 响应
export interface MetaFileApiResponse {
  code: number
  message: string
  processingTime: number
  data: {
    pin_id: string
    tx_id: string
    path: string
    operation: string
    encryption: string
    content_type: string
    file_type: string
    file_extension: string
    file_name: string
    file_size: number
    file_md5: string
    file_hash: string
    storage_path: string
    chain_name: string
    block_height: number
    timestamp: number
    creator_meta_id: string
    creator_address: string
    owner_meta_id: string
    owner_address: string
  }
}
