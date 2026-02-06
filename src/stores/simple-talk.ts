import { defineStore } from 'pinia'
import type { SimpleChannel,ShowSubChannleHeaderItem,MuteNotifyItem,BlockedChats, UnifiedChatMessage, SimpleUser, ChatType, UnifiedChatApiResponse, UnifiedChatResponseData,GroupChannel,GroupUserRoleInfo,MemberListRes,MemberItem, MentionRecord } from '@/@types/simple-chat.d'
import { GetUserEcdhPubkeyForPrivateChat, getChannels,getUserGroupRole,getGroupChannelList,getChannelMembers, getOneChannel, getNewstPrivateChatMessages, getPrivateChatMessages, getSubChannelMessages, getChannelMessages } from '@/api/talk'

import { isPrivateChatMessage, MessageType } from '@/@types/simple-chat.d'
import { useUserStore } from './user'
import { useEcdhsStore } from './ecdh'

import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { decrypt } from '@/utils/crypto'
import { useChainStore } from './chain'
import { tryCreateNode } from '@/utils/talk'
import { getTimestampInSeconds, sleep, tx } from '@/utils/util'
import { NodeName } from '@/enum'
import { getMyBlockChatList} from "@/api/chat-notify";
import { SubChannel } from '@/@types/talk'
import { useRootStore } from './root'
import { VITE_AVATAR_CONTENT_API, VITE_FILE_API } from '@/config/app-config'









// IndexedDB 管理类
class SimpleChatDB {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'SimpleChatDB'
  private readonly DB_VERSION = 7 // 增加版本号以添加 settings 表
  private userPrefix = 'default_' // 用户数据前缀（使用 globalMetaId）

  constructor(globalMetaId?: string) {
    this.userPrefix = globalMetaId ? `user_${globalMetaId}_` : 'default_'
  }

  async init(globalMetaId?: string): Promise<void> {
    
    if (globalMetaId) {
      this.userPrefix = `user_${globalMetaId}_`
    }
    
    return new Promise((resolve, reject) => {
      // 添加超时保护（15秒）
      const timeoutId = setTimeout(() => {
        console.error('❌ IndexedDB 初始化超时（15秒）')
        reject(new Error('IndexedDB initialization timeout'))
      }, 15000)

      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
      // 处理数据库被阻塞的情况（其他标签页占用）
      request.onblocked = () => {
        console.warn('⚠️ IndexedDB 被其他连接阻塞，请关闭其他标签页后重试')
        clearTimeout(timeoutId)
        // 不拒绝，而是继续等待，但记录警告
      }

      request.onupgradeneeded = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        const oldVersion = event.oldVersion
        const newVersion = event.newVersion || this.DB_VERSION
        
        console.log(`🔄 数据库升级: ${oldVersion} → ${newVersion}`)
        
        // 创建频道表
        if (!this.db.objectStoreNames.contains('channels')) {
          const channelStore = this.db.createObjectStore('channels', { keyPath: 'id' })
          channelStore.createIndex('userPrefix', 'userPrefix')
          channelStore.createIndex('type', 'type')
          channelStore.createIndex('lastActivity', 'lastMessage.timestamp')
          console.log('✅ 创建频道表')
        } else {
          // 表已存在，检查并添加缺失的索引
          const transaction = (event.target as IDBOpenDBRequest).transaction
          if (transaction) {
            const channelStore = transaction.objectStore('channels')
            if (!channelStore.indexNames.contains('userPrefix')) {
              channelStore.createIndex('userPrefix', 'userPrefix')
              console.log('✅ 添加频道表 userPrefix 索引')
            }
            if (!channelStore.indexNames.contains('type')) {
              channelStore.createIndex('type', 'type')
              console.log('✅ 添加频道表 type 索引')
            }
            if (!channelStore.indexNames.contains('lastActivity')) {
              channelStore.createIndex('lastActivity', 'lastMessage.timestamp')
              console.log('✅ 添加频道表 lastActivity 索引')
            }
          }
        }

        // 创建消息表
        if (!this.db.objectStoreNames.contains('messages')) {
          const messageStore = this.db.createObjectStore('messages', { keyPath: 'id' })
          messageStore.createIndex('userPrefix', 'userPrefix')
          messageStore.createIndex('channelId', 'channelId')
          messageStore.createIndex('timestamp', 'timestamp')
          console.log('✅ 创建消息表')
        } else {
          // 表已存在，检查并添加缺失的索引
          const transaction = (event.target as IDBOpenDBRequest).transaction
          if (transaction) {
            const messageStore = transaction.objectStore('messages')
            if (!messageStore.indexNames.contains('userPrefix')) {
              messageStore.createIndex('userPrefix', 'userPrefix')
              console.log('✅ 添加消息表 userPrefix 索引')
            }
            if (!messageStore.indexNames.contains('channelId')) {
              messageStore.createIndex('channelId', 'channelId')
              console.log('✅ 添加消息表 channelId 索引')
            }
            if (!messageStore.indexNames.contains('timestamp')) {
              messageStore.createIndex('timestamp', 'timestamp')
              console.log('✅ 添加消息表 timestamp 索引')
            }
          }
        }

        // 创建用户表
        if (!this.db.objectStoreNames.contains('users')) {
          const userStore = this.db.createObjectStore('users', { keyPath: 'id' })
          userStore.createIndex('userPrefix', 'userPrefix')
          userStore.createIndex('metaId', 'metaId')
          console.log('✅ 创建用户表')
        } else {
          // 表已存在，检查并添加缺失的索引
          const transaction = (event.target as IDBOpenDBRequest).transaction
          if (transaction) {
            const userStore = transaction.objectStore('users')
            if (!userStore.indexNames.contains('userPrefix')) {
              userStore.createIndex('userPrefix', 'userPrefix')
              console.log('✅ 添加用户表 userPrefix 索引')
            }
            if (!userStore.indexNames.contains('metaId')) {
              userStore.createIndex('metaId', 'metaId')
              console.log('✅ 添加用户表 metaId 索引')
            }
          }
        }

        // 创建红包ID表（版本2新增）
        if (!this.db.objectStoreNames.contains('redPacketIds')) {
          const redPacketStore = this.db.createObjectStore('redPacketIds', { keyPath: 'id' })
          redPacketStore.createIndex('userPrefix', 'userPrefix')
          redPacketStore.createIndex('redPacketId', 'redPacketId')
          console.log('✅ 创建红包ID表')
        } else {
          // 表已存在，检查并添加缺失的索引
          const transaction = (event.target as IDBOpenDBRequest).transaction
          if (transaction) {
            const redPacketStore = transaction.objectStore('redPacketIds')
            if (!redPacketStore.indexNames.contains('userPrefix')) {
              redPacketStore.createIndex('userPrefix', 'userPrefix')
              console.log('✅ 添加红包ID表 userPrefix 索引')
            }
            if (!redPacketStore.indexNames.contains('redPacketId')) {
              redPacketStore.createIndex('redPacketId', 'redPacketId')
              console.log('✅ 添加红包ID表 redPacketId 索引')
            }
          }
        }

        // 创建 lastReadIndex 表（版本4新增）
        if (!this.db.objectStoreNames.contains('lastReadIndexes')) {
          const lastReadIndexStore = this.db.createObjectStore('lastReadIndexes', { keyPath: 'id' })
          lastReadIndexStore.createIndex('userMetaId', 'userMetaId')
          lastReadIndexStore.createIndex('channelId', 'channelId')
          lastReadIndexStore.createIndex('userChannel', ['userMetaId', 'channelId'], { unique: true })
          console.log('✅ 创建 lastReadIndex 表')
        } else {
          // 表已存在，检查并添加缺失的索引
          const transaction = (event.target as IDBOpenDBRequest).transaction
          if (transaction) {
            const lastReadIndexStore = transaction.objectStore('lastReadIndexes')
            if (!lastReadIndexStore.indexNames.contains('userMetaId')) {
              lastReadIndexStore.createIndex('userMetaId', 'userMetaId')
              console.log('✅ 添加 lastReadIndex 表 userMetaId 索引')
            }
            if (!lastReadIndexStore.indexNames.contains('channelId')) {
              lastReadIndexStore.createIndex('channelId', 'channelId')
              console.log('✅ 添加 lastReadIndex 表 channelId 索引')
            }
            if (!lastReadIndexStore.indexNames.contains('userChannel')) {
              lastReadIndexStore.createIndex('userChannel', ['userMetaId', 'channelId'], { unique: true })
              console.log('✅ 添加 lastReadIndex 表 userChannel 联合索引')
            }
          }
        }

        // 创建 mentions 表（版本6新增）
        if (!this.db.objectStoreNames.contains('mentions')) {
          const mentionStore = this.db.createObjectStore('mentions', { keyPath: 'id' })
          mentionStore.createIndex('userPrefix', 'userPrefix')
          mentionStore.createIndex('channelId', 'channelId')
          mentionStore.createIndex('isRead', 'isRead')
          mentionStore.createIndex('timestamp', 'timestamp')
          mentionStore.createIndex('channelRead', ['channelId', 'isRead'])
          console.log('✅ 创建 mentions 表')
        } else {
          // 表已存在，检查并添加缺失的索引
          const transaction = (event.target as IDBOpenDBRequest).transaction
          if (transaction) {
            const mentionStore = transaction.objectStore('mentions')
            if (!mentionStore.indexNames.contains('userPrefix')) {
              mentionStore.createIndex('userPrefix', 'userPrefix')
              console.log('✅ 添加 mentions 表 userPrefix 索引')
            }
            if (!mentionStore.indexNames.contains('channelId')) {
              mentionStore.createIndex('channelId', 'channelId')
              console.log('✅ 添加 mentions 表 channelId 索引')
            }
            if (!mentionStore.indexNames.contains('isRead')) {
              mentionStore.createIndex('isRead', 'isRead')
              console.log('✅ 添加 mentions 表 isRead 索引')
            }
            if (!mentionStore.indexNames.contains('timestamp')) {
              mentionStore.createIndex('timestamp', 'timestamp')
              console.log('✅ 添加 mentions 表 timestamp 索引')
            }
            if (!mentionStore.indexNames.contains('channelRead')) {
              mentionStore.createIndex('channelRead', ['channelId', 'isRead'])
              console.log('✅ 添加 mentions 表 channelRead 联合索引')
            }
          }
        }

        // 创建 settings 表（版本7新增）- 用于存储用户设置如子频道显示状态
        if (!this.db.objectStoreNames.contains('settings')) {
          const settingsStore = this.db.createObjectStore('settings', { keyPath: 'id' })
          settingsStore.createIndex('userPrefix', 'userPrefix')
          settingsStore.createIndex('key', 'key')
          console.log('✅ 创建 settings 表')
        }
      }

      request.onsuccess = () => {
        clearTimeout(timeoutId)
        this.db = request.result
        resolve()
      }

      request.onerror = () => {
        clearTimeout(timeoutId)
        reject(request.error)
      }
    })
  }

  // 设置当前用户
  setUser(userMetaId: string): void {
    this.userPrefix = `user_${userMetaId}_`
  }

  // 获取数据库实例
  get database(): IDBDatabase | null {
    return this.db
  }

  // 获取用户前缀
  get prefix(): string {
    return this.userPrefix
  }

  // 清除当前用户的所有数据
  async clearUserData(): Promise<void> {
    if (!this.db) return
    
    const transaction = this.db.transaction(['channels', 'messages', 'users', 'redPacketIds', 'lastReadIndexes', 'mentions'], 'readwrite')
    
    // 清除频道
    const channelStore = transaction.objectStore('channels')
    const channelIndex = channelStore.index('userPrefix')
    const channelRequest = channelIndex.getAllKeys(this.userPrefix)
    
    channelRequest.onsuccess = () => {
      const keys = channelRequest.result
      keys.forEach(key => channelStore.delete(key))
    }

    // 清除消息
    const messageStore = transaction.objectStore('messages')
    const messageIndex = messageStore.index('userPrefix')
    const messageRequest = messageIndex.getAllKeys(this.userPrefix)
    
    messageRequest.onsuccess = () => {
      const keys = messageRequest.result
      keys.forEach(key => messageStore.delete(key))
    }

    // 清除用户缓存
    const userStore = transaction.objectStore('users')
    const userIndex = userStore.index('userPrefix')
    const userRequest = userIndex.getAllKeys(this.userPrefix)
    
    userRequest.onsuccess = () => {
      const keys = userRequest.result
      keys.forEach(key => userStore.delete(key))
    }

    // 清除红包ID
    const redPacketStore = transaction.objectStore('redPacketIds')
    const redPacketIndex = redPacketStore.index('userPrefix')
    const redPacketRequest = redPacketIndex.getAllKeys(this.userPrefix)
    
    redPacketRequest.onsuccess = () => {
      const keys = redPacketRequest.result
      keys.forEach(key => redPacketStore.delete(key))
    }

    // 清除已读索引（基于当前用户的 metaId）
    const currentUserMetaId = this.userPrefix.replace('user_', '').replace('_', '')
    if (currentUserMetaId && currentUserMetaId !== 'default') {
      const lastReadIndexStore = transaction.objectStore('lastReadIndexes')
      const lastReadIndexIndex = lastReadIndexStore.index('userMetaId')
      const lastReadIndexRequest = lastReadIndexIndex.getAllKeys(currentUserMetaId)
      
      lastReadIndexRequest.onsuccess = () => {
        const keys = lastReadIndexRequest.result
        keys.forEach(key => lastReadIndexStore.delete(key))
      }
    }

    // 清除@提及记录
    const mentionStore = transaction.objectStore('mentions')
    const mentionIndex = mentionStore.index('userPrefix')
    const mentionRequest = mentionIndex.getAllKeys(this.userPrefix)
    
    mentionRequest.onsuccess = () => {
      const keys = mentionRequest.result
      keys.forEach(key => mentionStore.delete(key))
    }
  }

  async saveChannel(channel: SimpleChannel): Promise<void> {
    if (!this.db) return
    
    // 创建可以安全存储到 IndexedDB 的数据副本
    const safeChanelData = this.createCloneableChannel(channel)
    
    // 添加用户前缀
    const channelWithPrefix = {
      ...safeChanelData,
      userPrefix: this.userPrefix
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['channels'], 'readwrite')
      const store = transaction.objectStore('channels')
      const request = store.put(channelWithPrefix)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 创建可以安全克隆的成员数据
  private createCloneableMemberItem(member: any): any {
    if (!member) return null
    
    try {
      return {
        id: member.id ? String(member.id) : undefined,
        index: typeof member.index === 'number' ? member.index : undefined,
        rule: typeof member.rule === 'number' ? member.rule : 0,
        permission: Array.isArray(member.permission) ? [...member.permission] : [],
        address: member.address ? String(member.address) : undefined,
        metaId: member.metaId ? String(member.metaId) : undefined,
        timeStr: member.timeStr ? String(member.timeStr) : undefined,
        timestamp: typeof member.timestamp === 'number' ? member.timestamp : undefined,
        userInfo: member.userInfo ? {
          address: member.userInfo.address ? String(member.userInfo.address) : '',
          avatar: member.userInfo.avatar ? String(member.userInfo.avatar) : undefined,
          avatarImage: member.userInfo.avatarImage ? String(member.userInfo.avatarImage) : undefined,
          chatPublicKey: member.userInfo.chatPublicKey ? String(member.userInfo.chatPublicKey) : '',
          chatPublicKeyId: member.userInfo.chatPublicKeyId ? String(member.userInfo.chatPublicKeyId) : undefined,
          metaid: member.userInfo.metaid ? String(member.userInfo.metaid) : '',
          name: member.userInfo.name ? String(member.userInfo.name) : ''
        } : undefined
      }
    } catch (error) {
      console.warn('创建安全成员数据失败:', error)
      return {
        metaId: member.metaId ? String(member.metaId) : '',
        rule: 0,
        permission: []
      }
    }
  }

  // 创建可以安全克隆的频道数据
  private createCloneableChannel(channel: SimpleChannel): SimpleChannel {
    try {
      // 使用深拷贝并处理可能的问题数据
      const cloneable: SimpleChannel = {
        id: channel.id,
        type: channel.type,
        name: channel.name,
        avatar: channel.avatar,
        members: Array.isArray(channel.members) ? [...channel.members] : undefined,
        createdBy: channel.createdBy,
        createdAt: channel.createdAt,
        unreadCount: channel.unreadCount,
        unreadMentionCount: channel.unreadMentionCount || 0, // 保留@提及未读数
        mentionCheckTimestamp: channel.mentionCheckTimestamp || 0, // 保留提及检查时间戳
        lastReadIndex: channel.lastReadIndex||0, // 保留已读索引
        targetMetaId: channel.targetMetaId,
        publicKeyStr: channel.publicKeyStr,
        // 保留临时频道标识
        isTemporary: channel.isTemporary,
  // 保留群聊的加入类型（来自服务端 roomJoinType），方便本地判断和展示
  roomJoinType: (channel as any).roomJoinType || undefined,
  // 保留服务端返回的 path 字段
  path: (channel as any).path || undefined,
  // 保留私密群聊的密码密钥（如果存在）
  passwordKey: (channel as any).passwordKey || undefined,
        // 群聊特有字段
        roomNote: channel.roomNote,
        userCount: channel.userCount,
        parentGroupId: channel.parentGroupId,
        // 权限信息字段 - 深度清理所有嵌套数据
        memberPermissions: channel.memberPermissions ? {
          admins: Array.isArray(channel.memberPermissions.admins) ? 
            channel.memberPermissions.admins.map(admin => this.createCloneableMemberItem(admin)) : [],
          blockList: Array.isArray(channel.memberPermissions.blockList) ? 
            channel.memberPermissions.blockList.map(member => this.createCloneableMemberItem(member)) : [],
          creator: channel.memberPermissions.creator ? 
            this.createCloneableMemberItem(channel.memberPermissions.creator) : null,
          list: Array.isArray(channel.memberPermissions.list) ? 
            channel.memberPermissions.list.map(member => this.createCloneableMemberItem(member)) : [],
          whiteList: Array.isArray(channel.memberPermissions.whiteList) ? 
            channel.memberPermissions.whiteList.map(member => this.createCloneableMemberItem(member)) : []
        } : undefined,
        permissionsLastUpdated: channel.permissionsLastUpdated
      }

      // 安全处理 lastMessage
      if (channel.lastMessage) {
        cloneable.lastMessage = {
          content: String(channel.lastMessage.content || ''),
          sender: String(channel.lastMessage.sender || ''),
          senderName: String(channel.lastMessage.senderName || ''),
          timestamp: Number(channel.lastMessage.timestamp || 0),
          type: channel.lastMessage.type,
          chatPublicKey: channel.lastMessage.chatPublicKey ? String(channel.lastMessage.chatPublicKey) : undefined,
          index: Number(channel.lastMessage.index || 0) < 1 ? 0 : Number(channel.lastMessage.index || 0), // 保留消息索引
          protocol: channel.lastMessage.protocol ? String(channel.lastMessage.protocol) : undefined // 保存消息协议
        }
      }

      // 安全处理 serverData - 只保留简单的可序列化数据
      if (channel.serverData && typeof channel.serverData === 'object') {
        try {
          // 使用 JSON 序列化测试是否可克隆，并过滤不可序列化的数据
          cloneable.serverData = JSON.parse(JSON.stringify(channel.serverData))
        } catch (error) {
          console.warn('频道 serverData 包含不可序列化的数据，将被忽略:', error)
          cloneable.serverData = { 
            _error: 'Non-serializable data removed',
            _timestamp: Date.now()
          }
        }
      }

      return cloneable
    } catch (error) {
      console.error('创建可克隆频道数据失败:', error)
      // 返回最小安全数据
      return {
        id: channel.id,
        type: channel.type,
        name: channel.name || 'Unknown',
        createdBy: channel.createdBy,
        createdAt: channel.createdAt || Date.now(),
        unreadCount: channel.unreadCount || 0,
        lastReadIndex: channel.lastReadIndex || 0, // 保留已读索引
        roomJoinType: (channel as any).roomJoinType || undefined,
        path: (channel as any).path || undefined,
        passwordKey: (channel as any).passwordKey || undefined
      }
    }
  }

  async getChannels(): Promise<SimpleChannel[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      // 添加超时保护（5秒）
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ getChannels 超时（5秒），返回空数组')
        resolve([])
      }, 5000)

      const transaction = this.db!.transaction(['channels'], 'readonly')
      const store = transaction.objectStore('channels')
      const index = store.index('userPrefix')
      const request = index.getAll(this.userPrefix)
      
      request.onsuccess = () => {
        clearTimeout(timeoutId)
        const channels = (request.result || []).map(({ userPrefix, ...channel }) => channel)

        
        resolve(channels)
      }
      
      request.onerror = () => {
        clearTimeout(timeoutId)
        resolve([])
      }
    })
  }

  async saveMessage(message: UnifiedChatMessage): Promise<void> {
    if (!this.db) return
    
    // 创建可以安全存储到 IndexedDB 的消息副本
    const safeMessageData = this.createCloneableMessage(message)
    const isPrivateChat = isPrivateChatMessage(safeMessageData)
    // 确定频道ID（使用 fromGlobalMetaId/toGlobalMetaId）
    const channelId = isPrivateChat ? (this.userPrefix.indexOf(safeMessageData.fromGlobalMetaId) !== -1 ? safeMessageData.toGlobalMetaId : safeMessageData.fromGlobalMetaId) : message.channelId ||  message.groupId 
    if (!channelId) {
      
      console.warn('⚠️ 无法确定消息的频道ID，跳过保存')
      return
    }
    
    // 添加用户前缀和id字段（用于IndexedDB的keyPath）
    const messageWithPrefix = {
      ...safeMessageData,
      id: safeMessageData.txId, // 添加id字段作为IndexedDB的主键
      userPrefix: this.userPrefix,
      channelId: channelId // 确保设置正确的channelId用于查询
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite')
      const store = transaction.objectStore('messages')
      const request = store.put(messageWithPrefix)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // 创建可以安全克隆的消息数据
  private createCloneableMessage(message: UnifiedChatMessage): UnifiedChatMessage {
    try {
      // 安全处理 userInfo
      const safeUserInfo = message.userInfo ? {
        metaid: String(message.userInfo.metaid || message.metaId || ''),
        address: String(message.userInfo.address || message.address || ''),
        name: String(message.userInfo.name || message.nickName || 'Unknown'),
        avatar: message.userInfo.avatar ? String(message.userInfo.avatar) : undefined,
        avatarImage: message.userInfo.avatarImage ? String(message.userInfo.avatarImage) : undefined,
        chatPublicKey: message.userInfo.chatPublicKey ? String(message.userInfo.chatPublicKey) : ''
      } : {
        metaid: message.metaId,
        address: message.address || '',
        name: message.nickName || 'Unknown',
        chatPublicKey: ''
      }

      // 安全处理 fromUserInfo
      const safeFromUserInfo = message.fromUserInfo ? {
        metaid: String(message.fromUserInfo.metaid || message.metaId || ''),
        address: String(message.fromUserInfo.address || ''),
        name: String(message.fromUserInfo.name || message.nickName || 'Unknown'),
        avatar: message.fromUserInfo.avatar ? String(message.fromUserInfo.avatar) : undefined,
        avatarImage: message.fromUserInfo.avatarImage ? String(message.fromUserInfo.avatarImage) : undefined,
        chatPublicKey: message.fromUserInfo.chatPublicKey ? String(message.fromUserInfo.chatPublicKey) : ''
      } : undefined

      // 安全处理 toUserInfo
      const safeToUserInfo = message.toUserInfo ? {
        metaid: String(message.toUserInfo.metaid || ''),
        address: String(message.toUserInfo.address || ''),
        name: String(message.toUserInfo.name || 'Unknown'),
        avatar: message.toUserInfo.avatar ? String(message.toUserInfo.avatar) : undefined,
        avatarImage: message.toUserInfo.avatarImage ? String(message.toUserInfo.avatarImage) : undefined,
        chatPublicKey: message.toUserInfo.chatPublicKey ? String(message.toUserInfo.chatPublicKey) : ''
      } : undefined

      // 安全处理 replyInfo
      const safeReplyInfo = message.replyInfo ? {
        channelId: String(message.replyInfo.channelId || ''),
        pinId: String(message.replyInfo.pinId || ''),
        metaId: String(message.replyInfo.metaId || ''),
        address: String(message.replyInfo.address || ''),
        userInfo: message.replyInfo.userInfo ? {
          metaid: String(message.replyInfo.userInfo.metaid || ''),
          address: String(message.replyInfo.userInfo.address || ''),
          name: String(message.replyInfo.userInfo.name || ''),
          avatar: message.replyInfo.userInfo.avatar ? String(message.replyInfo.userInfo.avatar) : undefined,
          avatarImage: message.replyInfo.userInfo.avatarImage ? String(message.replyInfo.userInfo.avatarImage) : undefined,
          chatPublicKey: String(message.replyInfo.userInfo.chatPublicKey || '')
        } : {
          metaid: '',
          address: '',
          name: '',
          chatPublicKey: ''
        },
        nickName: String(message.replyInfo.nickName || ''),
        protocol: String(message.replyInfo.protocol || ''),
        content: String(message.replyInfo.content || ''),
        contentType: String(message.replyInfo.contentType || 'text/plain'),
        encryption: String(message.replyInfo.encryption || '0'),
        version: String(message.replyInfo.version || '1.0.0'),
        chatType: Number(message.replyInfo.chatType || 1),
        timestamp: Number(message.replyInfo.timestamp || 0),
        chain: String(message.replyInfo.chain || 'mvc'),
        blockHeight: Number(message.replyInfo.blockHeight || 0),
        index: Number(message.replyInfo.index || 0)
      } : null

      // 安全处理 data 字段 - 只保留简单的可序列化数据
      let safeData = null
      if (message.data && typeof message.data === 'object') {
        try {
          // 尝试序列化测试
          JSON.parse(JSON.stringify(message.data))
          safeData = message.data
        } catch (error) {
          console.warn('消息 data 字段包含不可序列化的数据，将被置为 null:', error)
          safeData = null
        }
      } else if (message.data !== null && message.data !== undefined) {
        safeData = message.data
      }

      const cloneable: UnifiedChatMessage = {
        // 通用字段
        txId: String(message.txId),
        pinId: String(message.pinId || message.txId),
        metaId: String(message.metaId),
        address: String(message.address || ''),
        userInfo: safeUserInfo,
        nickName: String(message.nickName || ''),
        protocol: String(message.protocol || 'simpleGroupChat'),
        content: String(message.content),
        contentType: String(message.contentType || 'text/plain'),
        encryption: String(message.encryption || '0'),
        version: String(message.version || '1.0.0'),
        chatType: Number(message.chatType || 1),
        data: safeData,
        replyPin: String(message.replyPin || ''),
        replyInfo: safeReplyInfo,
        replyMetaId: String(message.replyMetaId || ''),
        timestamp: Number(message.timestamp),
        params: String(message.params || ''),
        chain: String(message.chain || 'btc'),
        blockHeight: Number(message.blockHeight || 0),
        index: Number(message.index || 0)<1 ? 0 : Number(message.index || 0), // 确保index不为负数

        // 本地状态字段
        mockId: message.mockId ? String(message.mockId) : undefined,
        error: message.error ? String(message.error) : undefined,

        // 私聊特有字段（使用 globalMetaId）
        fromGlobalMetaId: message.fromGlobalMetaId ? String(message.fromGlobalMetaId) : undefined,
        fromUserInfo: safeFromUserInfo,
        toGlobalMetaId: message.toGlobalMetaId ? String(message.toGlobalMetaId) : undefined,
        toUserInfo: safeToUserInfo,

        // 群聊特有字段
        groupId: message.groupId ? String(message.groupId) : undefined,
        channelId: message.channelId ? String(message.channelId) : undefined,
        metanetId: message.metanetId ? String(message.metanetId) : undefined,
        
        // @提及字段
        mention: Array.isArray(message.mention) ? [...message.mention] : []
      }

      // 最后做一次序列化测试，确保整个对象可以被克隆
      JSON.parse(JSON.stringify(cloneable))
      
      return cloneable
    } catch (error) {
      console.error('创建可克隆消息数据失败:', error)
      // 返回最小安全数据
      return {
        txId: String(message.txId || `fallback_${Date.now()}`),
        pinId: String(message.pinId || message.txId || `fallback_${Date.now()}`),
        metaId: String(message.metaId),
        address: String(message.address || ''),
        userInfo: {
          metaid: message.metaId,
          address: message.address || '',
          name: message.nickName || 'Unknown',
          chatPublicKey: ''
        },
        nickName: String(message.nickName || 'Unknown'),
        protocol: 'simpleGroupChat',
        content: String(message.content || ''),
        contentType: 'text/plain',
        encryption: '0',
        version: '1.0.0',
        chatType: 1,
        data: null,
        replyPin: '',
        replyInfo: null,
        replyMetaId: '',
        timestamp: Number(message.timestamp || Date.now()),
        params: '',
        chain: 'btc',
        blockHeight: 0,
        index: 0,
        // 本地状态字段
        mockId: message.mockId ? String(message.mockId) : undefined,
        error: message.error ? String(message.error) : undefined,
        // @提及字段
        mention: Array.isArray(message.mention) ? [...message.mention] : []
      }
    }
  }

  async getMessages(channelId: string, limit = 50): Promise<UnifiedChatMessage[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      // 添加超时保护（5秒）
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ getMessages 超时（5秒），返回空数组')
        resolve([])
      }, 5000)

      const transaction = this.db!.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')

      // 优先使用 channelId 索引获取
      let request: IDBRequest
      if (store.indexNames.contains('channelId')) {
        const index = store.index('channelId')
        request = index.getAll(channelId)
      } else {
        request = store.getAll()
      }
      
      request.onsuccess = () => {
        clearTimeout(timeoutId)
        const allMessages = request.result || []
        const userMessages = allMessages.filter((msg: any) => msg.userPrefix === this.userPrefix && String(msg.channelId) === String(channelId))
        const messages = userMessages
          .map(({ userPrefix, id, ...message }: any) => message)
          .sort((a: any, b: any) => (a.index || 0) - (b.index || 0))
          .slice(0, limit)
        resolve(messages)
      }
      request.onerror = () => {
        clearTimeout(timeoutId)
        console.error('❌ 获取消息失败:', request.error)
        resolve([])
      }
    })
  }

  /**
   * 获取指定索引范围的消息
   */
  async getMessagesInRange(channelId: string, startIndex: number, endIndex: number): Promise<UnifiedChatMessage[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allMessages = request.result || []
        
        const userMessages = allMessages.filter(msg => {
          const matchUser = msg.userPrefix === this.userPrefix
          const matchChannel = msg.channelId === channelId
          const inRange = msg.index >= startIndex && msg.index <= endIndex
          
          return matchUser && matchChannel && inRange
        })
        
        // 按 index 升序排序
        const messages = userMessages
          .map(({ userPrefix, id, ...message }) => message)
          .sort((a, b) => a.index - b.index)
        
        console.log(`📋 获取索引范围 [${startIndex}-${endIndex}] 的消息: ${messages.length} 条`)
        resolve(messages)
      }
      request.onerror = () => {
        console.error('❌ 获取消息失败:', request.error)
        resolve([])
      }
    })
  }

  async deleteMessage(messageId: string): Promise<void> {
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite')
      const store = transaction.objectStore('messages')
      const request = store.delete(messageId)
      
      request.onsuccess = () => {
        console.log(`🗑️ 成功删除消息: ${messageId}`)
        resolve()
      }
      request.onerror = () => {
        console.error(`❌ 删除消息失败: ${messageId}`, request.error)
        reject(request.error)
      }
    })
  }

  /**
   * 删除指定频道的所有消息
   * 用于服务端数据源切换时清除本地过期消息
   */
  async deleteChannelMessages(channelId: string): Promise<void> {
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['messages'], 'readwrite')
      const store = transaction.objectStore('messages')
      const index = store.index('channelId')
      const request = index.openCursor(IDBKeyRange.only(channelId))
      
      let deletedCount = 0
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
        if (cursor) {
          // 只删除当前用户的消息
          if (cursor.value.userPrefix === this.userPrefix) {
            cursor.delete()
            deletedCount++
          }
          cursor.continue()
        } else {
          console.log(`🗑️ 成功删除频道 ${channelId} 的 ${deletedCount} 条消息`)
          resolve()
        }
      }
      
      request.onerror = () => {
        console.error(`❌ 删除频道消息失败: ${channelId}`, request.error)
        reject(request.error)
      }
    })
  }

  // ==================== Mention 相关方法 ====================
  
  /**
   * 保存@提及记录
   */
  async saveMention(mention: any): Promise<void> {
    if (!this.db) return
    
    const mentionWithPrefix = {
      ...mention,
      userPrefix: this.userPrefix
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mentions'], 'readwrite')
      const store = transaction.objectStore('mentions')
      const request = store.put(mentionWithPrefix)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 根据channelId获取未读@提及列表
   */
  async getUnreadMentions(channelId: string): Promise<any[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['mentions'], 'readonly')
      const store = transaction.objectStore('mentions')
      const index = store.index('channelRead')
      const request = index.getAll([channelId, 0]) // 0 表示未读
      
      request.onsuccess = () => {
        const mentions = (request.result || [])
          .filter((m: any) => m.userPrefix === this.userPrefix)
          .map(({ userPrefix, ...mention }) => mention)
          .sort((a: any, b: any) => a.timestamp - b.timestamp)
        resolve(mentions)
      }
      
      request.onerror = () => resolve([])
    })
  }

  /**
   * 根据channelId获取所有@提及列表（包含已读）
   */
  async getAllMentions(channelId: string): Promise<any[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['mentions'], 'readonly')
      const store = transaction.objectStore('mentions')
      const index = store.index('channelId')
      const request = index.getAll(channelId)
      
      request.onsuccess = () => {
        const mentions = (request.result || [])
          .filter((m: any) => m.userPrefix === this.userPrefix)
          .map(({ userPrefix, ...mention }) => mention)
          .sort((a: any, b: any) => a.timestamp - b.timestamp)
        resolve(mentions)
      }
      
      request.onerror = () => resolve([])
    })
  }

  /**
   * 统计频道未读@提及数量
   */
  async countUnreadMentions(channelId: string): Promise<number> {
    if (!this.db) return 0
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['mentions'], 'readonly')
      const store = transaction.objectStore('mentions')
      const index = store.index('channelRead')
      const request = index.count([channelId, 0]) // 0 表示未读
      
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(0)
    })
  }

  /**
   * 标记@提及为已读
   */
  async markMentionAsRead(mentionId: string): Promise<void> {
    if (!this.db) {
      console.warn('❌ 数据库未初始化，无法标记@提及已读')
      return
    }
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mentions'], 'readwrite')
      const store = transaction.objectStore('mentions')
      const getRequest = store.get(mentionId)
      
      getRequest.onsuccess = () => {
        const mention = getRequest.result
        if (mention) {
          console.log(`📌 找到@提及记录:`, { id: mentionId, isRead: mention.isRead })
          if (mention.isRead === 1 || mention.isRead === true) {
            console.log(`📌 @提及 ${mentionId} 已经是已读状态`)
            resolve()
            return
          }
          mention.isRead = 1 // 使用数字 1 而不是 true，保持一致性
          const putRequest = store.put(mention)
          putRequest.onsuccess = () => {
            console.log(`✅ @提及 ${mentionId} 状态已更新为已读`)
            resolve()
          }
          putRequest.onerror = () => {
            console.error(`❌ 更新@提及状态失败:`, putRequest.error)
            reject(putRequest.error)
          }
        } else {
          console.warn(`⚠️ 未找到@提及记录: ${mentionId}`)
          resolve() // 找不到记录也算成功，避免阻塞
        }
      }
      
      getRequest.onerror = () => {
        console.error(`❌ 获取@提及记录失败:`, getRequest.error)
        reject(getRequest.error)
      }
    })
  }

  /**
   * 标记频道所有@提及为已读
   */
  async markAllMentionsAsRead(channelId: string): Promise<void> {
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mentions'], 'readwrite')
      const store = transaction.objectStore('mentions')
      const index = store.index('channelRead')
      const request = index.openCursor([channelId, 0]) // 0 表示未读
      
      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result
        if (cursor) {
          const mention = cursor.value
          if (mention.userPrefix === this.userPrefix) {
            mention.isRead = true
            cursor.update(mention)
          }
          cursor.continue()
        } else {
          resolve()
        }
      }
      
      request.onerror = () => reject(request.error)
    })
  }

  /**
   * 删除@提及记录
   */
  async deleteMention(mentionId: string): Promise<void> {
    if (!this.db) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['mentions'], 'readwrite')
      const store = transaction.objectStore('mentions')
      const request = store.delete(mentionId)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // ==================== End Mention 方法 ====================

  // ==================== Settings 方法 ====================

  /**
   * 保存子频道头部显示状态
   */
  async saveSubChannelHeaderStatus(groupId: string, status: boolean): Promise<void> {
    if (!this.db) return
    
    const record = {
      id: `${this.userPrefix}subChannelHeader_${groupId}`,
      key: 'subChannelHeader',
      groupId,
      status,
      userPrefix: this.userPrefix,
      updatedAt: Date.now()
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['settings'], 'readwrite')
        const store = transaction.objectStore('settings')
        const request = store.put(record)
        
        request.onsuccess = () => {
          console.log(`✅ 子频道头部状态已保存: ${groupId} = ${status}`)
          resolve()
        }
        request.onerror = () => {
          console.error('❌ 保存子频道头部状态失败:', request.error)
          reject(request.error)
        }
      } catch (error) {
        console.error('❌ 创建设置事务失败:', error)
        reject(error)
      }
    })
  }

  /**
   * 获取子频道头部显示状态
   */
  async getSubChannelHeaderStatus(groupId: string): Promise<boolean | null> {
    if (!this.db) return null
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['settings'], 'readonly')
        const store = transaction.objectStore('settings')
        const request = store.get(`${this.userPrefix}subChannelHeader_${groupId}`)
        
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result.status)
          } else {
            resolve(null) // 没有记录，返回 null 表示使用默认值
          }
        }
        request.onerror = () => {
          console.error('❌ 获取子频道头部状态失败:', request.error)
          reject(request.error)
        }
      } catch (error) {
        console.error('❌ 创建设置读取事务失败:', error)
        reject(error)
      }
    })
  }

  /**
   * 获取所有子频道头部显示状态
   */
  async getAllSubChannelHeaderStatus(): Promise<Array<{groupId: string, status: boolean}>> {
    if (!this.db) return []
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['settings'], 'readonly')
        const store = transaction.objectStore('settings')
        const index = store.index('userPrefix')
        const request = index.openCursor(IDBKeyRange.only(this.userPrefix))
        
        const results: Array<{groupId: string, status: boolean}> = []
        
        request.onsuccess = () => {
          const cursor = request.result
          if (cursor) {
            const record = cursor.value
            if (record.key === 'subChannelHeader') {
              results.push({
                groupId: record.groupId,
                status: record.status
              })
            }
            cursor.continue()
          } else {
            resolve(results)
          }
        }
        request.onerror = () => {
          console.error('❌ 获取所有子频道头部状态失败:', request.error)
          reject(request.error)
        }
      } catch (error) {
        console.error('❌ 创建设置读取事务失败:', error)
        reject(error)
      }
    })
  }

  // ==================== End Settings 方法 ====================


  async clearAllData(): Promise<void> {
    if (!this.db) return
    
    const stores = ['channels', 'messages', 'users', 'redPacketIds', 'lastReadIndexes', 'mentions', 'settings']
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(stores, 'readwrite')
      let completed = 0
      
      stores.forEach(storeName => {
        const store = transaction.objectStore(storeName)
        const request = store.clear()
        
        request.onsuccess = () => {
          completed++
          if (completed === stores.length) resolve()
        }
        request.onerror = () => reject(request.error)
      })
    })
  }

  // 保存已领取的红包ID
  async saveReceivedRedPacketId(redPacketId: string): Promise<void> {
    if (!this.db || !redPacketId) return
    
    console.log(`💾 保存红包ID: ${redPacketId}`)
    
    // 检查数据库中是否存在 redPacketIds 表
    if (!this.db.objectStoreNames.contains('redPacketIds')) {
      console.error('❌ redPacketIds 表不存在，数据库可能需要升级')
      throw new Error('redPacketIds store not found. Database needs upgrade.')
    }
    
    const record = {
      id: `${this.userPrefix}${redPacketId}`,
      redPacketId,
      userPrefix: this.userPrefix,
      receivedAt: Date.now()
    }
    
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['redPacketIds'], 'readwrite')
        const store = transaction.objectStore('redPacketIds')
        const request = store.put(record)
        
        request.onsuccess = () => {
          console.log(`✅ 红包ID ${redPacketId} 保存成功`)
          resolve()
        }
        request.onerror = () => {
          console.error('❌ 保存红包ID失败:', request.error)
          reject(request.error)
        }
        
        transaction.onerror = () => {
          console.error('❌ 红包ID事务失败:', transaction.error)
          reject(transaction.error)
        }
      } catch (error) {
        console.error('❌ 创建红包ID事务失败:', error)
        reject(error)
      }
    })
  }

  // 获取所有已领取的红包ID
  async getReceivedRedPacketIds(): Promise<string[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['redPacketIds'], 'readonly')
      const store = transaction.objectStore('redPacketIds')
      const index = store.index('userPrefix')
      const request = index.getAll(this.userPrefix)
      
      request.onsuccess = () => {
        const records = request.result || []
        const redPacketIds = records.map(record => record.redPacketId)
        resolve(redPacketIds)
      }
      request.onerror = () => resolve([])
    })
  }

  // 检查红包ID是否已领取
  async hasReceivedRedPacketId(redPacketId: string): Promise<boolean> {
    if (!this.db || !redPacketId) return false
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['redPacketIds'], 'readonly')
      const store = transaction.objectStore('redPacketIds')
      const request = store.get(`${this.userPrefix}${redPacketId}`)
      
      request.onsuccess = () => {
        resolve(!!request.result)
      }
      request.onerror = () => resolve(false)
    })
  }

  // =================== LastReadIndex 相关方法 ===================
  
  /**
   * 保存用户在某个频道的最后已读索引
   * @param userMetaId 用户的 MetaId
   * @param channelId 频道ID
   * @param messageIndex 消息索引
   * @param messageTimestamp 可选的消息时间戳，来自UnifiedChatMessage.timestamp
   */
  async saveLastReadIndex(userMetaId: string, channelId: string, messageIndex: number, messageTimestamp?: number): Promise<void> {
    if (!this.db || !userMetaId || !channelId) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['lastReadIndexes'], 'readwrite')
      const store = transaction.objectStore('lastReadIndexes')
      
      const record = {
        id: `${userMetaId}_${channelId}`, // 联合主键
        userMetaId,
        channelId,
        messageIndex,
        messageTimestamp: messageTimestamp || null, // 最后阅读的消息时间戳
        updatedAt: Date.now() // 记录更新时间戳
      }
      
      const request = store.put(record)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getLastReadIndexRecord(userMetaId: string, channelId: string): Promise<{channelId: string, messageIndex: number, messageTimestamp: number} | null> {
    if (!this.db || !userMetaId || !channelId) return null

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['lastReadIndexes'], 'readonly')
      const store = transaction.objectStore('lastReadIndexes')
      const request = store.get(`${userMetaId}_${channelId}`)

      request.onsuccess = () => {
        const record = request.result
        if (record) {
          resolve({
            channelId: record.channelId,
            messageIndex: record.messageIndex,
            messageTimestamp: record.messageTimestamp || 0
          })
        } else {
          resolve(null)
        }
      }
      request.onerror = () => resolve(null)
    })
  }

  /**
   * 获取用户在某个频道的最后已读索引
   * @param userMetaId 用户的 MetaId
   * @param channelId 频道ID
   * @returns 最后已读的消息索引，未找到则返回 0
   */
  async getLastReadIndex(userMetaId: string, channelId: string): Promise<number> {
    if (!this.db || !userMetaId || !channelId) return 0
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['lastReadIndexes'], 'readonly')
      const store = transaction.objectStore('lastReadIndexes')
      const request = store.get(`${userMetaId}_${channelId}`)
      
      request.onsuccess = () => {
        const record = request.result
        resolve(record ? record.messageIndex : 0)
      }
      request.onerror = () => resolve(0)
    })
  }

  /**
   * 获取用户在某个频道的最后已读消息时间戳
   * @param userMetaId 用户的 MetaId
   * @param channelId 频道ID
   * @returns 最后已读的消息时间戳，未找到则返回 0
   */
  async getLastReadTimestamp(userMetaId: string, channelId: string): Promise<number> {
    if (!this.db || !userMetaId || !channelId) return 0

    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['lastReadIndexes'], 'readonly')
      const store = transaction.objectStore('lastReadIndexes')
      const request = store.get(`${userMetaId}_${channelId}`)

      request.onsuccess = () => {
        const record = request.result
        resolve(record ? record.messageTimestamp : 0)
      }
      request.onerror = () => resolve(0)
    })
  }

  /**
   * 获取用户的所有已读索引记录
   * @param userMetaId 用户的 MetaId
   * @returns 该用户的所有已读索引记录
   */
  async getAllLastReadIndexes(userMetaId: string): Promise<Array<{channelId: string, messageIndex: number}>> {
    if (!this.db || !userMetaId) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['lastReadIndexes'], 'readonly')
      const store = transaction.objectStore('lastReadIndexes')
      const index = store.index('userMetaId')
      const request = index.getAll(userMetaId)
      
      request.onsuccess = () => {
        const records = request.result || []
        const results = records.map(record => ({
          channelId: record.channelId,
          messageIndex: record.messageIndex
        }))
        resolve(results)
      }
      request.onerror = () => resolve([])
    })
  }

  /**
   * 删除用户在某个频道的已读索引记录
   * @param userMetaId 用户的 MetaId
   * @param channelId 频道ID
   */
  async deleteLastReadIndex(userMetaId: string, channelId: string): Promise<void> {
    if (!this.db || !userMetaId || !channelId) return
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['lastReadIndexes'], 'readwrite')
      const store = transaction.objectStore('lastReadIndexes')
      const request = store.delete(`${userMetaId}_${channelId}`)
      
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }
}

export const useSimpleTalkStore = defineStore('simple-talk', {
  state: () => ({
    showSubChannelHeader:JSON.parse(localStorage.getItem('showSubChannelHeaderList') || JSON.stringify([])) || [] as ShowSubChannleHeaderItem[],
    muteNotifyList: JSON.parse(localStorage.getItem('muteNotifyList') || JSON.stringify([])) || [] as MuteNotifyItem[],  //localStorage.getItem('isMuteNotify') || false,
    // 所有聊天频道（群聊+私聊）
    channels: [] as SimpleChannel[],
    
    // 当前激活的聊天
    activeChannelId: '',
    
    // 消息缓存（内存中保存最近的消息）
    messageCache: new Map<string, UnifiedChatMessage[]>(),
    
    // 用户信息缓存
    userCache: new Map<string, SimpleUser>(),
    
    // IndexedDB实例
    db: new SimpleChatDB(),
    
    // 当前用户的 GlobalMetaId（用于用户切换检测，支持多链 MVC/BTC/DOGE）
    currentUserMetaId: '',
    
    // 系统状态
    isInitialized: false,
    isInitializing: false,
    isLoading: false,
    lastSyncTime: 0,
    
    // 红包相关状态
    receivedRedPacketIds: [] as string[], // 已领取红包列表
    
    // 全局消息菜单状态管理
    activeMessageMenuId: '', // 当前显示菜单的消息ID

    isSendRedPacketinProgress: false, // 是否正在发送红包

    isSetActiveChannelIdInProgress: false, // 是否正在设置当前激活频道
  }),

  getters: {

    getMuteNotifyList(state){
      return state.muteNotifyList || JSON.parse(localStorage.getItem('muteNotifyList') || JSON.stringify([]))
    },

    getShowSubChannleHeaderList(state){
      return state.showSubChannelHeader || JSON.parse(localStorage.getItem('showSubChannelHeaderList') || JSON.stringify([]))
    },

 
    getOneChannelMuteStatus():(channelId: string) => boolean {
      return (channelId: string) => {
        if(this.muteNotifyList.length){
            const channel:MuteNotifyItem= this.muteNotifyList.find((c:MuteNotifyItem) => c.groupId === channelId)
        if(channel){
          return channel.status
        }else{
          return false
        }
        }else{  
          return false
        }
      }
    },

     getOneChannelSubHeaderShowStatus():(channelId: string) => boolean {
      return (channelId: string) => {
        console.log('🟢 getOneChannelSubHeaderShowStatus 查询, channelId:', channelId)
        console.log('🟢 showSubChannelHeader 数组:', JSON.stringify(this.showSubChannelHeader))
        if(this.showSubChannelHeader.length){
            const show:ShowSubChannleHeaderItem= this.showSubChannelHeader.find((c:ShowSubChannleHeaderItem) => c.groupId === channelId)
        if(show){
          console.log('🟢 找到记录, status:', show.status)
          return show.status
        }else{
          console.log('🟢 未找到记录, 返回 true')
          return true
        }
        }else{  
          console.log('🟢 数组为空, 返回 true')
          return true
        }
      }
    },

     selfAddress(): string {
      const userStore = useUserStore()
      return userStore.last?.address || ''
    },
    // 当前用户的 MetaId（现在统一使用 globalMetaId）
    selfMetaId(): string {
      const userStore = useUserStore();
      // 只使用 globalMetaId，不降级
      const globalMetaId = userStore.last?.globalMetaId || ''
      console.log('🚀 获取当前用户 GlobalMetaId', globalMetaId)
      return globalMetaId
    },

    // 当前用户的全局 MetaId（支持多链 MVC/BTC/DOGE）- 与 selfMetaId 相同
    selfGlobalMetaId(): string {
      return this.selfMetaId  // 直接复用 selfMetaId
    },
  
    // 获取当前激活的频道
    activeChannel(): SimpleChannel | null {
      return this.channels.find(c => c.id === this.activeChannelId) || null
    },

    // 获取当前频道的消息
    activeChannelMessages(): UnifiedChatMessage[] {
      return (this.messageCache.get(this.activeChannelId) || []) as UnifiedChatMessage[];
    },



    // 获取所有频道（按最后活跃时间排序）
    allChannels(): SimpleChannel[] {
      return this.channels
        .slice() // 创建副本避免直接修改状态
        .sort((a, b) => (b.lastMessage?.timestamp || b.createdAt) - (a.lastMessage?.timestamp || a.createdAt))
    },

    // 获取群聊频道
    groupChannels(): SimpleChannel[] {
      return this.allChannels.filter(c => c.type === 'group')
    },

    // 获取私聊频道  
    privateChannels(): SimpleChannel[] {
      return this.allChannels.filter(c => c.type === 'private')
    },

    // 获取临时频道列表
    temporaryChannels(): SimpleChannel[] {
      return this.channels.filter(c => c.isTemporary === true)
    },

    // 获取常规频道列表（非临时）
    regularChannels(): SimpleChannel[] {
      return this.channels.filter(c => !c.isTemporary)
    },

    // 检查指定频道是否为临时频道
    isTemporaryChannel(): (channelId: string) => boolean {
      return (channelId: string) => {
        const channel = this.channels.find(c => c.id === channelId)
        return channel?.isTemporary === true
      }
    },

    // 获取未读消息总数
    totalUnreadCount(): number {
      return this.channels.reduce((sum, channel) => {
        // 基于 lastReadIndex 和 lastMessage.index 的差值计算未读数
        const lastMessageIndex = channel.lastMessage?.index || 0
        const lastReadIndex = channel.lastReadIndex || 0
        const unreadCount = Math.max(0, lastMessageIndex - lastReadIndex)
        return sum + unreadCount
      }, 0)
    },

    // 获取指定频道的未读消息数量
    getChannelUnreadCount(): (channelId: string) => number {
      return (channelId: string) => {
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) return 0
        
        // 基于 lastReadIndex 和 lastMessage.index 的差值计算未读数
        const lastMessageIndex = channel.lastMessage?.index || 0
        const lastReadIndex = channel.lastReadIndex || 0
        return Math.max(0, lastMessageIndex - lastReadIndex)
      }
    },

    // 获取指定频道的未读@提及数量
    getChannelUnreadMentionCount(): (channelId: string) => number {
      return (channelId: string) => {
        const channel = this.channels.find(c => c.id === channelId)
        return channel?.unreadMentionCount || 0
      }
    },

    // 获取所有频道的未读@提及总数
    totalUnreadMentionCount(): number {
      return this.channels.reduce((sum, channel) => sum + (channel.unreadMentionCount || 0), 0)
    },

    // 检查是否有本地数据
    hasLocalData(): boolean {
      return this.channels.length > 0
    },

    // 检查是否需要同步（超过5分钟未同步）
    needsSync(): boolean {
      const SYNC_INTERVAL = 5 * 60 * 1000 // 5分钟
      return Date.now() - this.lastSyncTime > SYNC_INTERVAL
    },

    // 检查红包是否已领取
    hasReceivedRedPacket(): (redPacketId: string) => boolean {
      return (redPacketId: string) => {
        return this.receivedRedPacketIds.includes(redPacketId)
      }
    },


    // 获取所有主群聊（不包括子群聊）
    mainGroupChannels(): SimpleChannel[] {
      return this.groupChannels.filter(c => !c.parentGroupId)
    },

    // 获取所有子群聊频道（现在作为独立频道）
    subGroupChannels(): SimpleChannel[] {
      return this.channels.filter(c => c.type === 'sub-group')
    },

    // 根据父群聊ID获取子群聊列表
    getSubChannelsByParent(): (parentGroupId: string) => SimpleChannel[] {
      return (parentGroupId: string) => {
        return this.subGroupChannels.filter(c => c.parentGroupId === parentGroupId)
      }
    },

    // 判断频道是否为子群聊
    isSubGroupChannel(): (channelId: string) => boolean {
      return (channelId: string) => {
        const channel = this.channels.find(c => c.id === channelId)
        return channel?.type === 'sub-group'
      }
    },

    // 获取子群聊的父群聊信息
    getParentGroupChannel(): (channelId: string) => SimpleChannel | null {
      return (channelId: string) => {
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel?.parentGroupId) return null
        return this.channels.find(c => c.id === channel.parentGroupId) || null
      }
    },

    // 获取群聊的广播聊天信息（用于顶部展示）
    getBroadcastChatInfo(): (groupId: string) => SimpleChannel[] | null {
      return (groupId: string) => {
        const groupChannel = this.channels.find(c => c.id === groupId && c.type === 'group' && !c.parentGroupId)
        if (!groupChannel) return null

        const subChannels = this.getSubChannelsByParent(groupId)
        const hasSubChannels = subChannels.length > 0
        if (!hasSubChannels) return null
        // 找到最近有消息的子频道
        const latestSubChannel = subChannels
          .sort((a, b) => (b.lastMessage?.timestamp || 0) - (a.lastMessage?.timestamp || 0))
        return latestSubChannel
      }
    },

    // 检查当前激活频道是否需要显示广播聊天区域
    currSubChannels(): SimpleChannel[] {
      if (!this.activeChannelId) return []
      const channel = this.activeChannel
      if (!channel || channel.type !== 'group' || channel.parentGroupId) return []

      const broadcastInfo = this.getBroadcastChatInfo(this.activeChannelId)
      return broadcastInfo || []
    },

    // 获取当前用户在指定群聊中的角色信息
    getCurrentUserRoleInGroup(): (groupId: string) => { isCreator: boolean; isAdmin: boolean; isBlocked: boolean; isWhitelist: boolean; memberInfo: MemberItem | null } {
      return (groupId: string) => {
        const channel = this.channels.find(c => c.id === groupId && c.type === 'group')
        if (!channel || !channel.memberPermissions) {
          return { isCreator: false, isAdmin: false, isBlocked: false, isWhitelist: false, memberInfo: null }
        }

        const currentUserMetaId = this.selfMetaId
        const permissions = channel.memberPermissions

        // 检查是否是创建者
        const isCreator = permissions.creator?.metaId === currentUserMetaId

        // 检查是否是管理员
        const isAdmin = permissions.admins.some(admin => admin.metaId === currentUserMetaId)

        // 检查是否被阻止
        const isBlocked = permissions.blockList.some(blocked => blocked.metaId === currentUserMetaId)

        // 检查是否在白名单
        const isWhitelist = permissions.whiteList.some(whitelisted => whitelisted.metaId === currentUserMetaId)

        // 获取成员信息
        const memberInfo = permissions.list.find(member => member.metaId === currentUserMetaId) || null

        return { isCreator, isAdmin, isBlocked, isWhitelist, memberInfo }
      }
    }
  },

  actions: {
    /**
     * 通知 IDChat app 未读消息数量
     */
    notifyIDChatAppBadge() {
      try {
       
        // 检查是否在 IDChat 环境下
        if (navigator.userAgent.includes('IDChat')) {
           const totalCount = this.totalUnreadCount
          console.log(`📱 通知 IDChat app 未读消息数: ${totalCount}`)
          
          // 调用 app 注入的方法设置 badge
          if (window.metaidwallet && typeof (window.metaidwallet as any).setAppBadge === 'function') {
            ;(window.metaidwallet as any).setAppBadge(totalCount)
          } else {
            console.warn('⚠️ window.metaidwallet.setAppBadge 方法不可用')
          }
        }
      } catch (error) {
        console.error('❌ 通知 IDChat app badge 失败:', error)
      }
    },

    /**
     * 初始化聊天系统
     */
    async init(): Promise<void> {
      if (this.isInitializing) {
        
        console.log('⏳ 聊天系统正在初始化中...')
        return
      }
      this.isInitializing = true
      const userStore = useUserStore()
      const rootStore=useRootStore()
      // 使用 globalMetaId 作为本地数据 key（支持多链）
      const currentUserMetaId = userStore.last?.globalMetaId
      
      // 确保 Map 对象正确初始化（处理持久化恢复问题）
      if (!(this.messageCache instanceof Map)) {
        console.log('🔧 修复消息缓存 Map 对象')
        this.messageCache = new Map<string, UnifiedChatMessage[]>()
      }
      if (!(this.userCache instanceof Map)) {
        console.log('🔧 修复用户缓存 Map 对象')
        this.userCache = new Map<string, SimpleUser>()
      }
      
      if (!currentUserMetaId) {
        console.warn('⚠️ 用户未登录，无法初始化聊天系统')
        this.isInitializing = false
        return
      }

      // 检查是否需要重新初始化（用户切换）
      const needReinit = !this.isInitialized || this.currentUserMetaId !== currentUserMetaId
      
      if (!needReinit) {
        console.log('✅ 聊天系统已为当前用户初始化')
        this.isInitializing = false
        return
      }

      try {
        console.log(`🚀 为用户 ${currentUserMetaId} 初始化聊天系统...`)
        
        // 如果是切换用户，先清理之前用户的数据
        if (this.currentUserMetaId && this.currentUserMetaId !== currentUserMetaId) {
          console.log(`🔄 检测到用户切换 ${this.currentUserMetaId} → ${currentUserMetaId}`)
          await this.reset()
        }
        
        // 设置当前用户
        this.currentUserMetaId = currentUserMetaId
        
        // 1. 初始化IndexedDB（带用户隔离）
        await this.db.init(currentUserMetaId)
        console.log('✅ IndexedDB 初始化成功')
        // 2. 加载本地缓存数据（快速显示）
        await this.loadFromLocal()
        console.log('✅ 本地数据加载完成')
        // 3. 异步同步服务端数据
        console.log('🚀 开始后台同步服务端数据...')
         this.syncFromServer().then(async ()=>{
 // 加载已读索引到内存（向后兼容）
        await this.loadLastReadIndexes()
        console.log('✅ 服务端数据同步完成')

        // 从 IndexedDB 加载子频道头部显示状态
        await this.loadSubChannelHeaderStatusFromDB()
        console.log('✅ 子频道头部状态加载完成')

         }).catch(error => {
          console.warn('⚠️ 后台同步失败:', error)
        }).finally(() => {
           // 5. 异步加载最近三个月的历史消息（后台执行，不阻塞界面）
        setTimeout(() => {
          this.loadRecentHistoryMessages().catch(error => {
            console.warn('⚠️ 后台加载历史消息失败:', error)
          })
        }, 5000)
        })

       
        // 4. 恢复上次的激活频道（异步）
        // await this.restoreLastActiveChannel()

        this.isInitialized = true
        console.log(`✅ 用户 ${currentUserMetaId} 的聊天系统初始化成功`)

        // 通知 IDChat app 未读消息数量
        this.notifyIDChatAppBadge()

       
        
         if (userStore.isAuthorized && !userStore.last?.chatpubkey) {
          
          GetUserEcdhPubkeyForPrivateChat(userStore.last?.globalMetaId).then((ecdhRes) => {
            if (ecdhRes?.chatPublicKey) {
            userStore.updateUserInfo({
            chatpubkey: ecdhRes?.chatPublicKey
            })
            rootStore.updateShowCreatePubkey(false)
          }else{
            rootStore.updateShowCreatePubkey(true)
          }
          })
          
      }

      } catch (error) {
        console.error('❌ 聊天系统初始化失败:', error)
        // 即使初始化失败，也标记为已初始化，避免卡在 loading 页面
        // 用户可以看到界面，只是可能没有数据
        this.isInitialized = true
        console.warn('⚠️ 初始化失败但仍标记为已初始化，用户可以看到界面')
        throw error
      }
      finally {
        this.isInitializing = false
      }
    },

    /**
     * 恢复上次的激活频道
     */
    async restoreLastActiveChannel(): Promise<void> {
        console.log(`🔄 恢复上次激活频道`)
      if (!this.selfMetaId) return
      
      const lastChannelId = localStorage.getItem(`lastActiveChannel-${this.selfMetaId}`)
      console.log('🚀 上次激活频道ID', lastChannelId,this.channels)
      if (lastChannelId && this.channels.find(c => c.id === lastChannelId)) {
        console.log(`🔄 恢复上次激活频道: ${lastChannelId}`)
        // 使用 setActiveChannel 来正确加载消息
        await this.setActiveChannel(lastChannelId)
      }
    },

    /**
     * 自动初始化（仅在需要时）
     * 这个方法会在第一次访问 store 的关键数据时自动调用
     */
    async autoInit(): Promise<void> {
      if (!this.isInitialized && this.selfMetaId) {
        await this.init()
      }
    },

    /**
     * 从本地加载数据
     */
    async loadFromLocal(): Promise<void> {
      try {
        const channels = await this.db.getChannels()
        this.channels = channels
        console.log(`📂 从本地加载了 ${channels.length} 个频道`)
       
        // 加载已领取的红包ID
        await this.initReceivedRedPacketIds()

        // 加载每个频道的消息到缓存，并从mention表统计未读@提及数量
        // for (const channel of channels) {
        //   try {
        //     // const messages = await this.db.getMessages(channel.id)
        //     // if (messages.length > 0) {
        //     //   this.messageCache.set(channel.id, messages)
        //     //   console.log(`📂 频道 ${channel.name} 加载了 ${messages.length} 条消息`)
        //     // }
            
        //     // 从mention表统计未读@提及数量
        //     const unreadMentionCount = await this.db.countUnreadMentions(channel.id)
        //     channel.unreadMentionCount = unreadMentionCount
        //     if (unreadMentionCount > 0) {
        //       console.log(` 频道 ${channel.name} 有 ${unreadMentionCount} 条未读 @ 提及`)
        //     }
        //   } catch (error) {
        //     console.warn(`⚠️ 加载频道 ${channel.id} 消息失败:`, error)
        //   }
        // }
        
      } catch (error) {
        console.error('从本地加载数据失败:', error)
      }
    },

    /**
     * 异步加载最近三个月的历史消息
     * 智能检查消息连续性，只加载缺失的部分
     */
    async loadRecentHistoryMessages(): Promise<void> {
      if (!this.selfMetaId) return

      console.log('🔄 开始智能加载历史消息（检查连续性）...')
      
      try {
        // 计算三个月前的时间戳（秒）
        const threeMonthsAgo = Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)
        
        // 遍历所有频道，检查并加载缺失消息
        const loadPromises = this.channels.map(async (channel) => {
          try {
            
await this.loadChannelHistoryMessagesIntelligent(channel.id, threeMonthsAgo)
            
           

            
            
          } catch (error) {
            console.warn(`⚠️ 加载频道 ${channel.name} 历史消息失败:`, error)
          }
        })

        // 并发加载，限制并发数
        const batchSize = 2
        for (let i = 0; i < loadPromises.length; i += batchSize) {
          const batch = loadPromises.slice(i, i + batchSize)
          await Promise.all(batch)
          // 每批次之间稍微延迟，避免请求过于集中
          await sleep(500)
        }

        console.log('✅ 历史消息加载完成')
        
        // 加载完成后同步未读@提及数量
        await this.syncUnreadMentionCounts()
        
      } catch (error) {
        console.error('❌ 加载历史消息失败:', error)
      }
    },

    /**
     * 智能加载频道历史消息
     * 检查本地消息连续性，只加载缺失部分
     * 加载方向：从最新往历史方向加载
     */
    async loadChannelHistoryMessagesIntelligent(channelId: string, threeMonthsAgo: number): Promise<void> {
      const channel = this.channels.find(c => c.id === channelId)
      if (!channel) return

      // 如果没有最新消息，跳过
      if (!channel.lastMessage || !channel.lastMessage.index) {
        console.log(`⏭️ 频道 ${channel.name} 没有消息，跳过加载`)
        return
      }

      const latestIndex = channel.lastMessage.index

      // 从数据库加载已有消息
      const localMessages = await this.db.getMessages(channelId, 100000)
      
      if (localMessages.length === 0) {
        // 本地没有消息，从最新位置开始往前翻页加载
        console.log(`📥 频道 ${channel.name} 本地无消息，从最新位置开始加载...`)
        await this.loadChannelHistoryMessages(channelId, latestIndex, threeMonthsAgo)
        return
      }

      // 检查消息连续性，找出所有缺失的消息段
      const missingRanges = this.findMissingMessageRanges(localMessages, latestIndex)
      
      if (missingRanges.length === 0) {
        console.log(`✅ 频道 ${channel.name} 消息完整，无需加载`)
        return
      }

      // 检查缺失的消息是否都比较旧（超过3个月），如果是则跳过
      const sortedLocal = localMessages.filter(msg => msg.timestamp < threeMonthsAgo).sort((a, b) => b.index - a.index)
      const oldestLocal = sortedLocal[0]
      
      if (oldestLocal && oldestLocal.timestamp < threeMonthsAgo) {
        // 最早的本地消息已经超过3个月，检查缺失段是否都在这之前
        const hasRecentMissing = missingRanges.some(range => {
          // 如果缺失段的 endIndex 大于或等于最早本地消息的 index，说明有最近的缺失
          return range.endIndex >= oldestLocal.index
        })
        
        if (!hasRecentMissing) {
          console.log(`⏭️ 频道 ${channel.name} 的缺失消息都超过3个月，跳过加载`)
          return
        }
      }

      console.log(`📥 频道 ${channel.name} 发现 ${missingRanges.length} 个缺失段，开始补全...`)
      
      // 从最新的缺失段开始补全（优先补全最新的消息）
      // missingRanges 已经是从旧到新排序的，需要反转
      const reversedRanges = [...missingRanges].reverse()
      
      for (const range of reversedRanges) {
        const rangeSize = range.endIndex - range.startIndex + 1
        console.log(`📥  频道 ${channel.name} 补全缺失段 [${range.startIndex}, ${range.endIndex}]，共 ${rangeSize} 条消息`)
        
        // 检查这个缺失段是否超过三个月前
        // 如果 range.endIndex 对应的消息时间戳可以判断，就跳过
        // 这里简化处理：继续加载，在 loadChannelHistoryMessages 中处理时间戳
        
        await this.loadChannelHistoryMessages(channelId, range.endIndex, threeMonthsAgo,range.startIndex)
        
        // 每个缺失段补全后稍作延迟
        await sleep(300)
      }
      
      console.log(`✅ 频道 ${channel.name} 历史消息补全完成`)
    },

    /**
     * 加载指定频道的历史消息（从最新往历史方向分页加载）
     * @param channelId 频道ID
     * @param fromIndex 从这个 index 开始往前加载（通常是 lastMessage.index 或缺失段的 endIndex）
     * @param stopTimestamp 停止时间戳（三个月前），防止加载过旧的消息
     */
    async loadChannelHistoryMessages(
      channelId: string, 
      fromIndex: number,
      stopTimestamp?: number,
      endIndex: number = 1
    ): Promise<void> {
      const channel = this.channels.find(c => c.id === channelId)
      if (!channel) return

      const threeMonthsAgo = stopTimestamp || Math.floor((Date.now() - 90 * 24 * 60 * 60 * 1000) / 1000)
      const batchSize = 50 // 每批加载30条

      try {
        let currentEndIndex = fromIndex // 当前批次的结束位置
        let batchCount = 0
        const maxBatches = 30 // 最多加载30批，防止无限循环

        while (batchCount < maxBatches && currentEndIndex > 0 &&currentEndIndex>=endIndex) {
          // 计算这批的 startIndex：向前推 batchSize 条
          const currentStartIndex = Math.max(1, currentEndIndex - batchSize + 1)
          const expectedCount = currentEndIndex - currentStartIndex + 1
          
          console.log(`📥 频道 ${channel.name} 第 ${batchCount + 1} 批，加载 [${currentStartIndex}, ${currentEndIndex}]，预期 ${expectedCount} 条`)
          
          // 使用 fetchServerNewsterMessages 按 index 分页获取消息
          const messages = await this.fetchServerNewsterMessages(channelId, channel, currentStartIndex,batchSize)
          
          if (messages.length === 0) {
            console.log(`⏹️ 频道 ${channel.name} 没有更多消息，已到达边界`)
            break
          }

          console.log(`📡 获取到 ${messages.length} 条消息`)

          // 按 index 排序
          const sortedMessages = messages.sort((a, b) => a.index - b.index)

          // 检查是否到达边界条件
          let reachedBoundary = false

          // 保存消息并处理@提及
          for (const message of sortedMessages) {
            // 边界条件1: 检查是否超过三个月
            if (message.timestamp < threeMonthsAgo) {
              console.log(`⏹️ 消息 index=${message.index} 已超过三个月，停止加载`)
              reachedBoundary = true
            }

            // 边界条件2: 检查是否到达最早消息 (index=1)
            if (message.index === 1) {
              console.log(`⏹️ 已到达最早消息 (index=1)，停止加载`)
              reachedBoundary = true
            }

            // 保存消息到数据库
            await this.db.saveMessage(message)

            // 检查是否有@提及当前用户
            if (message.mention && 
                Array.isArray(message.mention) && 
                message.mention.includes(this.selfMetaId) &&
                message.metaId !== this.selfMetaId) {
              
              // 创建@提及记录
              const mentionRecord: MentionRecord = {
                id: `${channelId}_${message.index}`,
                channelId: channelId,
                messageId: message.txId,
                messageIndex: message.index,
                timestamp: message.timestamp,
                senderMetaId: message.metaId,
                senderName: message.userInfo?.name || message.nickName || 'Unknown',
                content: message.content.substring(0, 100),
                isRead: message.index <= (channel.lastReadIndex || 0) ? 1 : 0,
                createdAt: Date.now()
              }
              
              await this.db.saveMention(mentionRecord)
              console.log(`📌 创建历史@提及记录: ${mentionRecord.id}`)
            }
          }

          if (reachedBoundary) {
            console.log(`✅ 频道 ${channel.name} 到达边界条件，停止加载`)
            break
          }

          // 检查本地消息连续性（只检查已加载的部分）
          const localMessages = await this.db.getMessages(channelId, 100000)
          const sortedLocal = localMessages.sort((a, b) => a.index - b.index)
          
          // 检查从 currentStartIndex 到 fromIndex 这个范围内是否连续
          const rangeMessages = sortedLocal.filter(msg => msg.index >= currentStartIndex && msg.index <= fromIndex)
          const isRangeContinuous = this.checkMessageRangeContinuity(rangeMessages, currentStartIndex, fromIndex)
          
          if (isRangeContinuous) {
            console.log(`✅ 当前范围 [${currentStartIndex}, ${fromIndex}] 消息已连续`)
            
            // 如果已经到达 index=1，完全停止
            if (currentStartIndex === 1) {
              console.log(`✅ 已到达最早消息 (index=1)，停止加载`)
              break
            }
            
            // 继续往前加载
            currentEndIndex = currentStartIndex - 1
          } else {
            console.log(`⚠️ 当前范围 [${currentStartIndex}, ${fromIndex}] 消息不连续，继续补全`)
            // 不更新 currentEndIndex，继续尝试补全同一范围
            currentEndIndex = currentStartIndex - 1
          }

          batchCount++
          
          // 每批之间稍作延迟
          await sleep(300)
        }

        console.log(`✅ 频道 ${channel.name} 历史消息加载完成，共 ${batchCount} 批`)
      } catch (error) {
        console.error(`❌ 加载频道 ${channelId} 历史消息失败:`, error)
      }
    },

    /**
     * 计算所有频道的未读 @ 提及数量
     */
    calculateUnreadMentions(): void {
      if (!this.selfMetaId) return

      console.log('🔄 开始计算未读 @ 提及数量...')
      const now = Date.now()

      for (const channel of this.channels) {
        const lastReadIndex = channel.lastReadIndex || 0
        let mentionCount = 0

        // 从缓存或数据库获取消息
        const messages = this.messageCache.get(channel.id) || []
        
        // 统计未读消息中提及当前用户的数量
        for (const message of messages) {
          // 只统计未读消息
          if (message.index > lastReadIndex) {
            // 检查是否提及了当前用户
            if (message.mention && Array.isArray(message.mention) && 
                message.mention.includes(this.selfMetaId)) {
              mentionCount++
            }
          }
        }

        // 更新频道的未读提及数量和检查时间戳
        channel.unreadMentionCount = mentionCount
        channel.mentionCheckTimestamp = now
        
        if (mentionCount > 0) {
          console.log(`📌 频道 ${channel.name} 有 ${mentionCount} 条未读 @ 提及`)
        }
      }

      // 保存更新后的频道信息（包括持久化的提及数量和时间戳）
      this.channels.forEach(channel => {
        this.db.saveChannel(channel).catch(error => {
          console.warn(`保存频道 ${channel.id} 失败:`, error)
        })
      })

      console.log('✅ 未读 @ 提及计算完成')
    },

    /**
     * 初始化已领取红包ID列表
     */
    async initReceivedRedPacketIds(): Promise<void> {
      if (!this.selfMetaId) return
      
      try {
        const redPacketIds = await this.db.getReceivedRedPacketIds()
        this.receivedRedPacketIds = redPacketIds
        console.log(`📂 从本地加载了 ${redPacketIds.length} 个已领取红包ID`)
      } catch (error) {
        console.error('初始化红包ID列表失败:', error)
        this.receivedRedPacketIds = []
      }
    },

    /**
     * 加载已读索引到内存（向后兼容）
     */
    async loadLastReadIndexes(): Promise<void> {
      if (!this.selfMetaId) return
      
      try {
        const lastReadIndexes = await this.db.getAllLastReadIndexes(this.selfMetaId)
        
        // 将已读索引更新到对应的频道内存中
        for (const { channelId, messageIndex } of lastReadIndexes) {
          const channel = this.channels.find(c => c.id === channelId)
          if (channel) {
            channel.lastReadIndex = Math.max(channel.lastReadIndex || 0, messageIndex)
            console.log(`🔖 频道 ${channelId} 的已读索引更新为 ${channel.lastReadIndex}`)
          }
        }
        
        console.log(`📂 从本地加载了 ${lastReadIndexes.length} 个已读索引`)

        // 迁移旧数据：将 channel 中的 lastReadIndex 迁移到独立表
        await this.migrateLastReadIndexes()
      } catch (error) {
        console.error('初始化已读索引失败:', error)
      }
    },

    /**
     * 迁移已读索引数据：将 channel 中的 lastReadIndex 迁移到独立表
     */
    async migrateLastReadIndexes(): Promise<void> {
      if (!this.selfMetaId) return
      
      try {
        let migratedCount = 0
        
        for (const channel of this.channels) {
          if (channel.lastReadIndex && channel.lastReadIndex > 0) {
            // 检查独立表中是否已经存在该记录
            const existingIndex = await this.db.getLastReadIndex(this.selfMetaId, channel.id)
            
            if (existingIndex === 0) {
              // 独立表中不存在，进行迁移
              await this.db.saveLastReadIndex(this.selfMetaId, channel.id, channel.lastReadIndex)
              migratedCount++
            }
          }
        }
        
        if (migratedCount > 0) {
          console.log(`📦 迁移了 ${migratedCount} 个已读索引到独立表`)
        }
      } catch (error) {
        console.error('迁移已读索引失败:', error)
      }
    },

    /**
     * 添加已领取的红包ID
     */
    async addReceivedRedPacketId(id: string): Promise<void> {
      if (!id) return

      // 检查是否已存在
      if (this.receivedRedPacketIds.includes(id)) return

      try {
        // 保存到IndexedDB
        await this.db.saveReceivedRedPacketId(id)
        
        // 更新内存状态
        this.receivedRedPacketIds.push(id)
        
        console.log(`✅ 红包ID ${id} 已添加到已领取列表`)
      } catch (error) {
        console.error('添加红包ID失败:', error)
      }
    },

    /**
     * 检查红包是否已领取（异步版本，从IndexedDB检查）
     */
    async checkRedPacketReceived(id: string): Promise<boolean> {
      if (!id) return false
      
      try {
        return await this.db.hasReceivedRedPacketId(id)
      } catch (error) {
        console.error('检查红包状态失败:', error)
        return false
      }
    },

    /**
     * 从服务端同步数据
     */
    async syncFromServer(): Promise<void> {
      if (!this.selfGlobalMetaId) {  // 改为 globalMetaId
        console.warn('⚠️ 未找到用户信息，跳过同步')
        return
      }

      this.isLoading = true
      
      try {
        console.log('🔄 开始同步服务端数据...')
        
        // 使用统一的 latest-chat-info-list 接口获取所有聊天数据
        let allChannelsData: any[] = []
        try {
          allChannelsData = await this.fetchLatestChatInfo()
          console.log(`✅ 获取到 ${allChannelsData.length} 条聊天数据`)
        } catch (e) {
          console.warn('获取聊天列表失败，使用本地数据:', e)
          // 接口报错时不清空本地数据，直接返回
          return
        }

        // 如果返回空数组且本地有数据，也不覆盖本地数据
        if ((!allChannelsData || allChannelsData.length === 0) && this.channels.length > 0) {
          console.warn('⚠️ 服务端返回空数据，保留本地数据')
          return
        }

        // 转换数据格式
        const serverChannels = this.transformLatestChatInfo(allChannelsData)
        console.log(`✅ 转换为 ${serverChannels.length} 个频道数据`)

        // 合并到本地
        await this.mergeChannels(serverChannels)
        console.log(`✅ 合并到本地完成，共 ${this.channels.length} 个频道`)
        
        this.lastSyncTime = Date.now()
        console.log(`✅ 同步完成，共 ${serverChannels.length} 个频道`)
        
      } catch (error) {
        console.error('❌ 同步服务端数据失败:', error)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * 获取最新聊天信息列表
     */
    async fetchLatestChatInfo(): Promise<any[]> {
      console.log('🌐 开始调用 API 获取聊天数据...', {
        selfGlobalMetaId: this.selfGlobalMetaId,
        apiEndpoint: '/user/latest-chat-info-list'
      })
      const result = await getChannels({ 
        metaId: this.selfGlobalMetaId,  // 参数名保持 metaId，值使用 globalMetaId
        cursor: '0',
        size: '100'
      })
      return result
    },

    /**
     * 获取群聊的子频道列表
     */
    async fetchGroupChannels(groupId: string): Promise<SubChannel[]> {
      try {
        console.log(`🌐 获取群聊 ${groupId} 的子频道列表...`)
        const response = await getGroupChannelList({ groupId })
        
        if (response.code === 0 && response.data?.list) {
          console.log(`✅ 获取到 ${response.data.list.length} 个子频道`)
          return response.data.list
        } else {
          console.warn(`⚠️ 获取子频道失败: ${response.message}`)
          return []
        }
      } catch (error) {
        console.error(`❌ 获取群聊 ${groupId} 子频道失败:`, error)
        return []
      }
    },

    /**
     * 获取并存储群聊成员权限信息
     */
    async fetchGroupMemberPermissions(groupId: string): Promise<MemberListRes | null> {
      
      try {
        console.log(`🔄 获取群聊 ${groupId} 成员权限信息...`)
        
        const apiResponse = await getChannelMembers({
          groupId,
          size: '1' // 可以根据需要调整每次获取的数量
        })
        
        // 转换 MemberListItem 到 MemberItem 格式
        const convertMemberItem = (item: any): MemberItem => ({
          id: item.metaId,
          metaId: item.metaId,
          address: item.address,
          timeStr: item.timeStr,
          timestamp: item.timestamp,
          rule: 0, // 默认规则，可根据实际需求调整
          permission: [], // 默认权限，可根据实际需求调整
          userInfo: item.userInfo
        })
        
        const memberPermissions: MemberListRes = {
          admins: (apiResponse.admins || []).map(convertMemberItem),
          blockList: (apiResponse.blockList || []).map(convertMemberItem),
          creator: apiResponse.creator ? convertMemberItem(apiResponse.creator) : null,
          list: (apiResponse.list || []).map(convertMemberItem),
          whiteList: (apiResponse.whiteList || []).map(convertMemberItem)
        }
        
        // 找到对应的群聊频道
        const channelIndex = this.channels.findIndex(c => c.id === groupId && c.type === 'group')
        if (channelIndex === -1) {
          console.warn(`⚠️ 未找到群聊频道: ${groupId}`)
          return null
        }
        
        // 更新频道的权限信息
        this.channels[channelIndex] = {
          ...this.channels[channelIndex],
          memberPermissions,
          permissionsLastUpdated: Date.now()
        }
        
        // 安全保存到数据库，移除可能导致序列化错误的字段
        const channelToSave = { ...this.channels[channelIndex] }
        // delete channelToSave.serverData // 移除可能包含不可序列化数据的字段
        await this.db.saveChannel(channelToSave)
        
        console.log(`✅ 群聊 ${groupId} 权限信息已更新并保存`)
        return memberPermissions
        
      } catch (error) {
        console.error(`❌ 获取群聊 ${groupId} 权限信息失败:`, error)
        return null
      }
    },

    /**
     * 获取群聊成员权限信息（优先从本地缓存获取）
     */
    async getGroupMemberPermissions(groupId: string, forceRefresh: boolean = false): Promise<MemberListRes | null> {
      
      
      const channel = this.channels.find(c => c.id === groupId && c.type === 'group')
      if (!channel) {
        console.warn(`⚠️ 未找到群聊频道: ${groupId}`)
        return null
      }
      
      // 如果有缓存的权限信息且不强制刷新，检查是否过期
      if (channel.memberPermissions && !forceRefresh) {
        const cacheAge = Date.now() - (channel.permissionsLastUpdated || 0)
        const cacheExpiry = 5 * 60 * 1000 // 5分钟过期
        
        if (cacheAge < cacheExpiry) {
          console.log(`📋 使用缓存的权限信息 (${Math.round(cacheAge / 1000)}s ago)`)
          return channel.memberPermissions
        }
      }
      
      // 从服务器获取最新权限信息
      return await this.fetchGroupMemberPermissions(groupId)
    },

    /**
     * 为群聊加载子频道数据
     */
    async loadGroupChannels(groupId: string): Promise<void> {
      const groupChannel = this.channels.find(c => c.id === groupId && c.type === 'group')
      if (!groupChannel) {
        console.warn(`⚠️ 未找到群聊: ${groupId}`)
        return
      }

      try {
        console.log(`🔄 为群聊 ${groupId} 加载子频道...`)
        const channels = await this.fetchGroupChannels(groupId)
        
        // 现在子群聊作为独立频道处理，需要创建独立的子群聊频道
        for (const channelData of channels) {
          await this.createSubGroupChannel(groupId, channelData)
        }
        
        console.log(`✅ 群聊 ${groupId} 子频道加载完成，共 ${channels.length} 个独立频道`)
      } catch (error) {
        console.error(`❌ 加载群聊 ${groupId} 子频道失败:`, error)
      }
    },

    /**
     * 获取群聊的所有子频道（从本地缓存或服务器获取，现在返回独立频道）
     */
    async getGroupChannels(groupId: string): Promise<GroupChannel[]> {
      // 从独立频道列表中找到属于该群聊的子群聊
      const subChannels = this.channels.filter(c => 
        c.type === 'sub-group' && c.parentGroupId === groupId
      )

      if (subChannels.length > 0) {
        console.log(`📂 从独立频道获取子频道，共 ${subChannels.length} 个`)
        // 转换为 GroupChannel 格式
        return subChannels.map(sc => sc.serverData as GroupChannel).filter(Boolean)
      }

      // 否则从服务器获取
      console.log(`📡 本地无子频道，从服务器获取...`)
      await this.loadGroupChannels(groupId)
      
      // 重新获取创建的子频道
      const newSubChannels = this.channels.filter(c => 
        c.type === 'sub-group' && c.parentGroupId === groupId
      )
      return newSubChannels.map(sc => sc.serverData as GroupChannel).filter(Boolean)
    },

    /**
     * 创建子群聊频道（作为独立的聊天频道）
     */
    async createSubGroupChannel(parentGroupId: string, channelData: SubChannel): Promise<SimpleChannel | null> {
      try {
        // 从内容中解析频道信息，如果内容是加密的则需要解密
        let channelName = `` // 默认名称
        let channelNote = ''
        
        // 尝试解密内容获取真实的频道信息
        
        // 获取父群聊信息，继承 roomJoinType
        const parentChannel = this.channels.find(c => c.id === parentGroupId && c.type === 'group')
        const parentRoomJoinType = parentChannel?.roomJoinType || '1' // 默认为公开群聊
        
        console.log(`📝 为群聊 ${parentGroupId} 创建子群聊频道: ${channelName}, 继承 roomJoinType: ${parentRoomJoinType}`)
        
        // 创建子群聊作为独立频道，和群聊、私聊同一层级
        const subChannel: SimpleChannel = {
          id: channelData.channelId, // 使用 channelId 作为独立频道的 ID
          type: 'sub-group', // 使用新的子群聊类型
          name: channelData.channelName, // 使用解析出的频道名称
          avatar: channelData.channelIcon, // 暂时置空，如用户要求
          members: [], // 成员信息暂时置空
          createdBy: channelData.createUserInfo?.globalMetaId || channelData.createUserMetaId, // 使用 globalMetaId
          createdAt: channelData.timestamp , // 转换为毫秒
          unreadCount: 0,
          lastReadIndex: 0, // 初始化已读索引为 0，与群聊、私聊保持一致
          roomNote: channelData.channelNote, // 使用解析出的频道描述
          // 子群聊特有字段
          parentGroupId: channelData.groupId, // 指向父群聊ID
          roomJoinType: parentRoomJoinType, // 继承父群聊的 roomJoinType
          serverData: channelData,
          
          lastMessage:  {
              content: channelData.channelNewestContent||'',
              sender: channelData.channelNewestMetaId||'',
              type: channelData.channelNewestProtocol.includes('luckybag')?MessageType.red:channelData.channelNewestProtocol.includes('file')?MessageType.img:MessageType.msg, // 子频道最新消息类型暂时设为文本
              senderName: channelData.channelNewestUserName||'', 
              timestamp: channelData.channelNewestTimestamp ,
              index: channelData.index || 0
            },
        }

        // 添加到频道列表，与群聊、私聊并列
        const existingIndex = this.channels.findIndex(c => c.id === subChannel.id)
        if (existingIndex !== -1) {
          // 更新已存在的子频道，保留 lastReadIndex 和 unreadCount
          const existing = this.channels[existingIndex]
          this.channels[existingIndex] = { 
            ...existing, 
            ...subChannel,
            lastReadIndex: existing.lastReadIndex || 0, // 保留原有的已读索引
            unreadCount: existing.unreadCount || 0 // 保留原有的未读计数
          }
          // 安全保存，移除可能有问题的字段
          const channelToSave = { ...this.channels[existingIndex] }
          // delete channelToSave.serverData
          await this.db.saveChannel(channelToSave)
        } else {
          // 添加新的子频道
          this.channels.push(subChannel)
          // 安全保存，移除可能有问题的字段
          const subChannelToSave = { ...subChannel }
          // delete subChannelToSave.serverData
          await this.db.saveChannel(subChannelToSave)
        }

       

        console.log(`✅ 子群聊频道创建成功: ${channelName} (独立频道)`)
        return subChannel
      } catch (error) {
        console.error('❌ 创建子群聊频道失败:', error)
        return null
      }
    },

    /**
     * 转换最新聊天信息数据格式
     */
    transformLatestChatInfo(serverChannels: any[]): SimpleChannel[] {
      return serverChannels.map(channel => {
        // 判断是群聊还是私聊 (type: "1"=群聊, "2"=私聊)
        const isPrivateChat = channel.type === "2"
        
        if (isPrivateChat) {
          // 私聊数据转换 - 使用对方的 globalMetaId 作为频道ID
          const userInfo = channel.userInfo
          // 私聊中 globalMetaId 在 userInfo 里面
          const targetGlobalMetaId = userInfo?.globalMetaId
          return {
            id: targetGlobalMetaId,
            type: 'private' as ChatType,
            name: userInfo?.name || '未知用户',
            avatar: userInfo?.avatarImage.length>64?userInfo?.avatarImage.replace('/content','/thumbnail'):'',
            members: [this.selfMetaId, targetGlobalMetaId],
            createdBy: this.selfMetaId,
            createdAt: channel.timestamp || Date.now(),
            unreadCount: 0, // 未读数由本地管理
            targetMetaId: targetGlobalMetaId,
            publicKeyStr: userInfo?.chatPublicKey,
            isTemporary: false, // 服务端返回的频道表示用户已加入
            lastMessage:  {
              content: channel.content,
              type: channel.chatType,
              sender: userInfo?.globalMetaId || channel.createMetaId,
              senderName: userInfo?.name || '',
              timestamp: channel.timestamp || 0,
              chatPublicKey: userInfo?.chatPublicKey,
              index: channel.index || 1
            },
            serverData: channel
          }
        } else {
          // 群聊数据转换  
          return {
            id: channel.groupId,
            type: 'group' as ChatType,
            name: channel.roomName || '未命名群聊',
            avatar: channel.roomIcon ? `${VITE_FILE_API()}/content/${channel.roomIcon.replace('metafile://', '')}` : undefined,
            members: [], // 群成员需要单独获取
            createdBy: channel.createUserInfo?.globalMetaId || channel.createUserMetaId || '',
            createdAt: channel.timestamp || Date.now(),
            unreadCount: 0, // 未读数由本地管理
            isTemporary: false, // 服务端返回的频道表示用户已加入
            // 保留服务端返回的 roomJoinType（默认为 '1' 表示公开）
            roomJoinType: channel.roomJoinType || '1',
            // 保留服务端返回的 path 字段（若有）
            path: channel.path || undefined,
            // 群聊特有字段
            roomNote: channel.roomNote||'', // 群聊公告
            userCount: channel.userCount, // 群聊用户数量
            lastMessage:  {
              content: channel.content,
              sender: channel.createMetaId,
              type: channel.chatType,
              senderName: channel.userInfo?.name || channel.createUserInfo?.name || '',
              timestamp: channel.timestamp || 0,
              index: channel.index || 1
            },
            serverData: channel
          }
        }
      }).filter(Boolean) // 过滤掉可能的空值
    },

    /**
     * 合并频道数据
     */
    async mergeChannels(serverChannels: SimpleChannel[]): Promise<void> {
      const existingMap = new Map(this.channels.map(c => [c.id, c]))
      const mergedChannels: SimpleChannel[] = []

      // 处理服务端频道
      for (const serverChannel of serverChannels) {
        const existing = existingMap.get(serverChannel.id)
       
        if (existing) {
          // 合并已存在的频道
          const merged: SimpleChannel = {
            ...serverChannel,
            unreadCount: existing.unreadCount, // 保留本地未读数
            lastReadIndex: existing.lastReadIndex || 0, // 保留本地已读消息索引
            unreadMentionCount: existing.unreadMentionCount || 0, // 保留本地未读@提及数
            // 保留本地的权限信息和缓存时间
            memberPermissions: existing.memberPermissions,
            permissionsLastUpdated: existing.permissionsLastUpdated,
            // 保留本地的 passwordKey（服务端不返回此字段）
            passwordKey: existing.passwordKey,
            // 私密群聊保留本地已解密的名称，避免显示加密内容
            name: (serverChannel.roomJoinType === '100' && existing.passwordKey) 
              ? existing.name 
              : serverChannel.name,
            // 私密群聊保留本地已解密的公告，避免显示加密内容
            roomNote: (serverChannel.roomJoinType === '100' && existing.passwordKey && existing.roomNote) 
              ? existing.roomNote 
              : serverChannel.roomNote,
            // 使用更新的消息
            lastMessage: this.getNewerMessage(existing.lastMessage, serverChannel.lastMessage)
          }

          mergedChannels.push(merged)
      
          existingMap.delete(serverChannel.id)
          // 安全保存，移除可能有问题的字段
          const mergedToSave = { ...merged }
          // delete mergedToSave.serverData
          await this.db.saveChannel(mergedToSave)
        } else {
          // 新频道
          mergedChannels.push({...serverChannel, unreadCount: 0, lastReadIndex: 0})
          // 安全保存，移除可能有问题的字段
          const serverToSave = { ...serverChannel }
          // delete serverToSave.serverData
          await this.db.saveChannel(serverToSave)
        }
      }

      // 保留本地独有频道（包括子群聊频道和临时频道）
      existingMap.forEach(localChannel => {
        // 保留本地的子群聊频道
        if (localChannel.parentGroupId) {
          console.log(`📂 保留本地子群聊频道: ${localChannel.name} (${localChannel.id})`)
          mergedChannels.push(localChannel)
          return // 避免重复添加
        }
        
        // 保留临时频道（未加入的群聊）
        const isNotInServer = !serverChannels.find(c => c.id === localChannel.id)
        if (isNotInServer) {
          // 如果是临时频道，或者是当前激活的频道，都要保留
          if (localChannel.isTemporary === true || localChannel.id === this.activeChannelId) {
            console.log(`📂 保留本地临时频道: ${localChannel.name} (${localChannel.id}), isTemporary: ${localChannel.isTemporary}`)
            // 确保标记为临时频道
            localChannel.isTemporary = true
            mergedChannels.push(localChannel)
          }
        }
      })

      this.channels = mergedChannels

      // 异步为私密群聊（创建者是当前用户）获取 passwordKey 并解密
      await this.fetchPasswordKeysForPrivateGroups(mergedChannels)

      // 异步加载群聊的子频道列表
      this.loadSubChannelsForGroups(mergedChannels)

      // 同步更新所有频道的未读@提及数量
      await this.syncUnreadMentionCounts()
    },

    /**
     * 为所有群聊设置 passwordKey
     * - roomJoinType === '100' 且是创建者：通过钱包获取 pkh 派生
     * - 其他情况：使用 channelId.substring(0, 16)
     */
    async fetchPasswordKeysForPrivateGroups(channels: SimpleChannel[]): Promise<void> {
      // 动态导入 CryptoJS
      const CryptoJS = await import('crypto-js')
      
      // 第一步：为已有 passwordKey 但名称仍加密的私密群聊解密名称
      const channelsWithEncryptedNames = channels.filter(channel => 
        channel.type === 'group' && 
        channel.roomJoinType === '100' && 
        channel.passwordKey &&
        channel.name && 
        /^[A-Za-z0-9+/=]+$/.test(channel.name) && 
        channel.name.length > 20
      )

      if (channelsWithEncryptedNames.length > 0) {
        console.log(`🔓 发现 ${channelsWithEncryptedNames.length} 个私密群聊名称需要解密...`)
        
        for (const channel of channelsWithEncryptedNames) {
          let hasChanges = false
          
          // 解密群名称
          try {
            const decrypted = CryptoJS.AES.decrypt(channel.name, channel.passwordKey!)
            const decryptedName = decrypted.toString(CryptoJS.enc.Utf8)
            
            if (decryptedName) {
              console.log(`🔓 群聊名称已解密: "${channel.name.substring(0, 20)}..." -> "${decryptedName}"`)
              channel.name = decryptedName
              hasChanges = true
            }
          } catch (error) {
            console.warn(`⚠️ 解密群名称失败:`, channel.id, error)
          }
          
          // 解密群公告
          if (channel.roomNote && /^[A-Za-z0-9+/=]+$/.test(channel.roomNote) && channel.roomNote.length > 20) {
            try {
              const decrypted = CryptoJS.AES.decrypt(channel.roomNote, channel.passwordKey!)
              const decryptedNote = decrypted.toString(CryptoJS.enc.Utf8)
              
              if (decryptedNote) {
                console.log(`🔓 群公告已解密: "${channel.roomNote.substring(0, 20)}..." -> "${decryptedNote}"`)
                channel.roomNote = decryptedNote
                hasChanges = true
              }
            } catch (error) {
              console.warn(`⚠️ 解密群公告失败:`, channel.id, error)
            }
          }
          
          if (hasChanges) {
            await this.db.saveChannel(channel)
          }
        }
      }
      
      // 第二步：筛选出需要设置 passwordKey 的频道（所有群聊且尚未设置 passwordKey）
      // 注意：如果用户通过邀请链接加入私密群聊，passwordKey 已经被解密并保存，这里会跳过
      const needPasswordKeyChannels = channels.filter(channel => 
        channel.type === 'group' && !channel.passwordKey
      )

      if (needPasswordKeyChannels.length === 0) {
        console.log('✅ 所有群聊的 passwordKey 均已设置，无需处理')
        return
      }

      console.log(`🔑 开始为 ${needPasswordKeyChannels.length} 个群聊设置 passwordKey...`)

      // 分为三组：
      // 1. 私密群聊创建者（roomJoinType==='100' && createdBy===selfMetaId）- 从钱包获取
      // 2. 私密群聊成员（roomJoinType==='100' && createdBy!==selfMetaId）- 跳过，等待通过邀请链接获取
      // 3. 公开群聊及其他 - 使用 channelId.substring(0, 16)
      const privateCreatorChannels = needPasswordKeyChannels.filter(
        channel => channel.roomJoinType === '100' && channel.createdBy === this.selfMetaId
      )
      const privateMemberChannels = needPasswordKeyChannels.filter(
        channel => channel.roomJoinType === '100' && channel.createdBy !== this.selfMetaId
      )
      const otherChannels = needPasswordKeyChannels.filter(
        channel => channel.roomJoinType !== '100'
      )

      // 为私密群聊创建者通过钱包获取 passwordKey
      if (privateCreatorChannels.length > 0) {
        // 检查钱包是否可用
        if (!window.metaidwallet || typeof (window.metaidwallet as any).getPKHByPath !== 'function') {
          console.warn('⚠️ 钱包不可用，私密群聊创建者无法获取 passwordKey')
        } else {
          await Promise.allSettled(
            privateCreatorChannels.map(async (channel) => {
              try {
                const path = `m/${channel.path || '100/0'}`
                // getPKHByPath 直接返回字符串
                const pkh = await (window.metaidwallet as any).getPKHByPath({ path })
                
                // 使用 pkh 的前16位作为 passwordKey（与消息加密保持一致）
                const passwordKey = pkh.substring(0, 16)

                // 更新频道的 passwordKey
                channel.passwordKey = passwordKey

                // 尝试解密群名称（如果是加密的）
                try {
                  // 检查群名称是否看起来像加密的（通常包含 Base64 字符）
                  if (channel.name && /^[A-Za-z0-9+/=]+$/.test(channel.name) && channel.name.length > 20) {
                    const decrypted = CryptoJS.AES.decrypt(channel.name, passwordKey)
                    const decryptedName = decrypted.toString(CryptoJS.enc.Utf8)
                    
                    if (decryptedName) {
                      console.log(`🔓 私密群聊名称已解密: "${channel.name.substring(0, 20)}..." -> "${decryptedName}"`)
                      channel.name = decryptedName
                    }
                  }
                } catch (decryptError) {
                  console.warn(`⚠️ 解密群名称失败，使用原名称:`, channel.name)
                  // 解密失败不影响整体流程，保留原名称
                }
                
                // 尝试解密群公告（如果是加密的）
                try {
                  if (channel.roomNote && /^[A-Za-z0-9+/=]+$/.test(channel.roomNote) && channel.roomNote.length > 20) {
                    const decrypted = CryptoJS.AES.decrypt(channel.roomNote, passwordKey)
                    const decryptedNote = decrypted.toString(CryptoJS.enc.Utf8)
                    
                    if (decryptedNote) {
                      console.log(`🔓 私密群聊公告已解密: "${channel.roomNote.substring(0, 20)}..." -> "${decryptedNote}"`)
                      channel.roomNote = decryptedNote
                    }
                  }
                } catch (decryptError) {
                  console.warn(`⚠️ 解密群公告失败，使用原公告:`, channel.roomNote)
                  // 解密失败不影响整体流程，保留原公告
                }

                // 保存到数据库
                await this.db.saveChannel(channel)

                console.log(`✅ 私密群聊 ${channel.name} 的 passwordKey 已设置（来自钱包）`)
              } catch (error) {
                console.error(`❌ 获取私密群聊 ${channel.name} 的 passwordKey 失败:`, error)
              }
            })
          )
        }
      }

      // 私密群聊成员：尝试通过 API 获取最新的 passcode
      // 这些用户应该通过邀请链接加入群组，在 ChannelInvite.vue 中解密 passcode 并保存 passwordKey
      // 如果这里有频道，说明用户可能是通过其他方式加入的或者本地 passwordKey 丢失
      if (privateMemberChannels.length > 0) {
        console.log(
          `🔍 发现 ${privateMemberChannels.length} 个私密群聊（成员身份）没有 passwordKey，尝试从服务器获取...`
        )
        
        // 检查钱包是否可用（需要用来解密 passcode）
        if (!window.metaidwallet || typeof (window.metaidwallet as any).common?.ecdh !== 'function') {
          console.warn('⚠️ 钱包不可用，无法解密 passcode')
        } else {
          // 动态导入 API
          const { getGroupMetaidJoinList } = await import('@/api/talk')
          
          await Promise.allSettled(
            privateMemberChannels.map(async (channel) => {
              try {
                // 调用接口获取加入信息
                const response = await getGroupMetaidJoinList({
                  metaId: this.selfMetaId,
                  groupId: channel.id
                })
                
                if (response.code === 0 && response.data.items && response.data.items.length > 0) {
                  // 获取最新的加入记录（通常是最后一条）
                  const joinItem = response.data.items[response.data.items.length - 1]
                  const encryptedPasscode = joinItem.k
                  
                  if (!encryptedPasscode) {
                    console.warn(`⚠️ 群聊 ${channel.name} 的加入记录中没有 passcode`)
                    return
                  }
                  
                  // 获取群主的 chatPublicKey
                  const creatorChatPublicKey = channel.serverData?.createUserInfo?.chatPublicKey
                  
                  if (!creatorChatPublicKey) {
                    console.warn(`⚠️ 无法获取群聊 ${channel.name} 的群主 chatPublicKey`)
                    return
                  }
                  
                  console.log(`🔑 开始解密群聊 ${channel.name} 的 passcode...`)
                  
                  // 使用 ECDH 解密 passcode
                  try {
                    const ecdhResult = await (window.metaidwallet as any).common.ecdh({
                      externalPubKey: creatorChatPublicKey
                    })
                    const sharedSecret = ecdhResult.sharedSecret
                    
                    // 使用共享密钥解密 passcode 得到 passwordKey
                    const decrypted = CryptoJS.AES.decrypt(encryptedPasscode, sharedSecret)
                    const passwordKey = decrypted.toString(CryptoJS.enc.Utf8)
                    
                    if (!passwordKey) {
                      console.warn(`⚠️ 解密 passcode 失败，群聊: ${channel.name}`)
                      return
                    }
                    
                    console.log(`✅ 成功解密 passwordKey，群聊: ${channel.name}`)
                    
                    // 更新频道的 passwordKey
                    channel.passwordKey = passwordKey
                    
                    // 尝试解密群名称
                    try {
                      if (channel.name && /^[A-Za-z0-9+/=]+$/.test(channel.name) && channel.name.length > 20) {
                        const decryptedName = CryptoJS.AES.decrypt(channel.name, passwordKey)
                        const nameText = decryptedName.toString(CryptoJS.enc.Utf8)
                        
                        if (nameText) {
                          console.log(`🔓 群聊名称已解密: "${channel.name.substring(0, 20)}..." -> "${nameText}"`)
                          channel.name = nameText
                        }
                      }
                    } catch (decryptError) {
                      console.warn(`⚠️ 解密群名称失败:`, channel.name, decryptError)
                    }
                    
                    // 尝试解密群公告
                    try {
                      if (channel.roomNote && /^[A-Za-z0-9+/=]+$/.test(channel.roomNote) && channel.roomNote.length > 20) {
                        const decryptedNote = CryptoJS.AES.decrypt(channel.roomNote, passwordKey)
                        const noteText = decryptedNote.toString(CryptoJS.enc.Utf8)
                        
                        if (noteText) {
                          console.log(`🔓 群公告已解密: "${channel.roomNote.substring(0, 20)}..." -> "${noteText}"`)
                          channel.roomNote = noteText
                        }
                      }
                    } catch (decryptError) {
                      console.warn(`⚠️ 解密群公告失败:`, channel.roomNote, decryptError)
                    }
                    
                    // 保存到数据库
                    await this.db.saveChannel(channel)
                    
                    console.log(`✅ 私密群聊 ${channel.name} 的 passwordKey 已设置（来自服务器 passcode）`)
                  } catch (ecdhError) {
                    console.error(`❌ ECDH 解密失败，群聊: ${channel.name}`, ecdhError)
                  }
                } else {
                  console.warn(`⚠️ 未找到群聊 ${channel.name} 的加入记录`)
                }
              } catch (error) {
                console.error(`❌ 获取群聊 ${channel.name} 的加入信息失败:`, error)
              }
            })
          )
        }
      }

      // 为其他群聊使用 channelId.substring(0, 16)
      if (otherChannels.length > 0) {
        await Promise.allSettled(
          otherChannels.map(async (channel) => {
            try {
              const passwordKey = channel.id.substring(0, 16)

              // 更新频道的 passwordKey
              channel.passwordKey = passwordKey

              // 保存到数据库
              await this.db.saveChannel(channel)

              console.log(`✅ 群聊 ${channel.name} 的 passwordKey 已设置（来自 channelId）`)
            } catch (error) {
              console.error(`❌ 设置群聊 ${channel.name} 的 passwordKey 失败:`, error)
            }
          })
        )
      }

      console.log(`✅ passwordKey 设置完成`)
      
      // 强制触发响应式更新，确保解密后的名称显示在 UI 上
      // 通过重新赋值 channels 数组来触发 Vue 的响应式系统
      this.channels = [...this.channels]
    },

    /**
     * 为所有群聊异步加载子频道
     */
    async loadSubChannelsForGroups(channels: SimpleChannel[]): Promise<void> {
      const groupChannels = channels.filter(c => c.type === 'group' && !c.parentGroupId)
      
      console.log(`🔄 开始为 ${groupChannels.length} 个群聊加载子频道...`)
      
      // 使用 Promise.allSettled 避免单个失败影响整体
      const results = await Promise.allSettled(
        groupChannels.map(async (groupChannel) => {
          try {
            await this.loadGroupChannels(groupChannel.id)
            console.log(`✅ 群聊 ${groupChannel.name} 子频道加载完成`)
          } catch (error) {
            console.warn(`⚠️ 群聊 ${groupChannel.name} 子频道加载失败:`, error)
          }
        })
      )

      const successCount = results.filter(r => r.status === 'fulfilled').length
      console.log(`✅ 子频道加载完成: ${successCount}/${groupChannels.length} 个群聊成功`)
    },

    /**
     * 获取较新的消息
     */
    getNewerMessage(local?: any, server?: any) {
      if (!local) return server
      if (!server) return local
      return server
    },

    /**
     * 设置当前激活频道
     */
    async setActiveChannel(channelId: string): Promise<void> {
      if (this.activeChannelId === channelId) return

      // 检查频道是否存在于当前channels列表中
      let channel = this.channels.find(c => c.id === channelId)
      this.isSetActiveChannelIdInProgress = true
      // 如果频道不存在，尝试创建临时频道
      if (!channel) {
        console.log(`🔍 频道 ${channelId} 不在当前列表中，尝试创建临时频道...`)
        const temporaryChannel = await this.createTemporaryChannel(channelId)
       
        
        if (!temporaryChannel) {
          console.error(`❌ 无法创建临时频道: ${channelId}`)
          this.isSetActiveChannelIdInProgress = false
          return
        }
        
        
        channel = temporaryChannel
        // 将临时频道添加到频道列表中
        this.channels.unshift(channel)
        
        // 将临时频道保存到数据库（确保刷新后能恢复）
        try {
          await this.db.saveChannel(channel)
          console.log(`💾 临时频道已保存到数据库: ${channel.name}, isTemporary: ${channel.isTemporary}`)
        } catch (dbError) {
          console.warn('⚠️ 保存临时频道到数据库失败:', dbError)
        }
        
        if(temporaryChannel.type==='group'){
          await this.loadGroupChannels(temporaryChannel.id)
        }
        console.log(`✅ 临时频道已创建并添加到列表: ${channel.name} (${channel.type})`)
      }

      this.activeChannelId = channelId

      // 总是重新加载消息以确保数据最新
      try {
        await this.loadMessages(channelId)
        console.log(`✅ 激活频道设置完成，当前消息数: ${this.activeChannelMessages.length}`)
        if(this.activeChannelMessages.length === 0){
          this.isSetActiveChannelIdInProgress = false
        }
      } catch (error) {
        console.error(`❌ 加载消息失败:`, error)
        // 消息加载失败时也要重置状态，避免卡住
        this.isSetActiveChannelIdInProgress = false
      }
      // 如果是群聊，获取权限信息
      if (channel && channel.type === 'group') {
        // 在后台获取权限信息，不阻塞界面
        this.getGroupMemberPermissions(channelId).catch(error => {
          console.warn(`⚠️ 获取群聊 ${channelId} 权限信息失败:`, error)
        })
      }

      // 标记为已读
      // this.markAsRead(channelId)

      // 保存到本地存储
      // localStorage.setItem(`lastActiveChannel-${this.selfMetaId}`, channelId)
      // this.isSetActiveChannelIdInProgress = false
    },

    setActiveChannelIdInProgress(value: boolean) {
      this.isSetActiveChannelIdInProgress = value
    },

    /**
     * 创建临时频道
     * 当 channelId 不在当前 channels 列表中时，尝试从服务器获取信息并创建临时频道
     */
    async createTemporaryChannel(channelId: string): Promise<SimpleChannel | null> {
      try {
        const userStore = useUserStore()
        const ecdhsStore = useEcdhsStore()
        
        // 判断是否是群聊：群聊 ID 格式为 [64位hex]i0，以 i0 结尾
        // 私聊使用 globalMetaId，不以 i0 结尾
        const isGroupChannel = channelId.endsWith('i0') && /^[a-fA-F0-9]{64}i0$/.test(channelId)
        
        if (!isGroupChannel) {
          // 私聊频道
          console.log(`🔍 检测到私聊 channelId: ${channelId}`)
          
          try {
            const userInfo = await GetUserEcdhPubkeyForPrivateChat(channelId)
            
            // if (!userInfo.chatPublicKey) {
            //   console.warn(`⚠️ 用户 ${channelId} 未开启私聊功能`)
            //   return null
            // }

            // 设置 ECDH 密钥
            // let ecdh = ecdhsStore.getEcdh(userInfo.chatPublicKey)
            // if (!ecdh) {
            //   ecdh = await getEcdhPublickey(userInfo.chatPublicKey)
            //   if (ecdh) {
            //     ecdhsStore.insert(ecdh, ecdh?.externalPubKey)
            //   }
            // }

            const privateChannel: SimpleChannel = {
              id: channelId,
              type: 'private',
              name: userInfo.name || '私聊用户',
              avatar: userInfo.avatarImage,
              members: [this.selfMetaId, channelId],
              createdBy: this.selfMetaId,
              createdAt: Date.now(),
              unreadCount: 0,
              targetMetaId: channelId,
              publicKeyStr: userInfo.chatPublicKey,
              isTemporary: true, // 标记为临时频道
              serverData: {
                userInfo
              }
            }

            console.log(`✅ 创建临时私聊频道: ${privateChannel.name}`)
            return privateChannel
          } catch (error) {
            console.error(`❌ 获取私聊用户信息失败 ${channelId}:`, error)
            return null
          }
        } else {
          // 群聊频道
          console.log(`🔍 检测到群聊 channelId: ${channelId}`)
          
          try {
            const channelInfo = await getOneChannel(channelId)
            
            if (!channelInfo) {
              console.warn(`⚠️ 群聊 ${channelId} 不存在或无权访问`)
              return null
            }

            // 检查数据库中是否有该频道的 passwordKey
            let passwordKeyFromDB: string | undefined
            try {
              const dbChannels = await this.db.getChannels()
              const existingChannel = dbChannels.find(ch => ch.id === channelId)
              if (existingChannel?.passwordKey) {
                passwordKeyFromDB = existingChannel.passwordKey
                console.log('✅ 从数据库中恢复 passwordKey:', passwordKeyFromDB)
              }
            } catch (dbError) {
              console.warn('⚠️ 无法从数据库获取 passwordKey:', dbError)
            }

            const groupChannel: SimpleChannel = {
              id: channelInfo.groupId || channelId,
              type: 'group',
              name: channelInfo.roomName || '群聊',
              avatar: channelInfo.roomAvatarUrl,
              createdBy: channelInfo.createUserInfo?.globalMetaId || channelInfo.createUserMetaId || '',
              createdAt: channelInfo.timestamp || Date.now(),
              roomNote: channelInfo.roomNote,
              userCount: channelInfo.userCount,
              unreadCount: 0,
              roomJoinType: channelInfo.roomJoinType || '1', // 保留群聊类型
              passwordKey: passwordKeyFromDB, // 从数据库恢复 passwordKey
              isTemporary: true, // 标记为临时频道
              serverData: channelInfo
            }

            console.log(`✅ 创建临时群聊频道: ${groupChannel.name}, passwordKey: ${passwordKeyFromDB ? '已恢复' : '未设置'}`)
            return groupChannel
          } catch (error) {
            console.error(`❌ 获取群聊信息失败 ${channelId}:`, error)
            return null
          }
        }
      } catch (error) {
        console.error(`❌ 创建临时频道失败 ${channelId}:`, error)
        return null
      }
    },

    /**
     * 加载频道消息
     */
    async loadMessages(channelId: string): Promise<void> {
      // 添加整体超时保护（30秒）
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`loadMessages 超时（30秒）: ${channelId}`))
        }, 30000)
      })

      try {
        await Promise.race([
          this._loadMessagesInternal(channelId),
          timeoutPromise
        ])
      } catch (error) {
        console.error('❌ 加载消息失败:', error)
        // 出错时至少设置本地消息或空数组
        const fallbackMessages = await this.db.getMessages(channelId).catch(() => [])
        this.messageCache.set(channelId, fallbackMessages)
      }
    },

    /**
     * 加载频道消息的内部实现
     */
    async _loadMessagesInternal(channelId: string): Promise<void> {
      console.log(`📝 开始加载频道 ${channelId} 的消息...`)
      
      // 1. 查找频道信息
      const channel = this.channels.find(c => c.id === channelId)
      if (!channel) {
        console.warn(`⚠️ 未找到频道 ${channelId}`)
        this.messageCache.set(channelId, [])
        return
      }

      const { index: lastReadIndex, timestamp: lastReadTimestamp } = await this.getLastReadIndexWithTimestamp(channelId)
      console.log(`📖 频道 ${channelId} 的最后已读索引: ${lastReadIndex}`)

      // 计算未读消息数量
      const serverLastIndex = channel.lastMessage?.index || 0
      
      // 如果 serverLastIndex <= 0（例如 -1），说明 latest-chat-info-list 接口返回的 index 无效
      // 此时应该直接加载最新消息
      if (serverLastIndex <= 0) {
        console.log(`⚠️ serverLastIndex 无效 (${serverLastIndex})，直接加载最新消息`)
        await this.loadNewestMessages(channelId)
        return
      }
      
      const unreadCount = serverLastIndex - lastReadIndex
      const UNREAD_AUTO_SCROLL_THRESHOLD = 5 // 未读消息数量在此范围内时直接加载最新消息
      
      // 如果未读消息数量 <= 5 条，直接加载最新消息
      if (unreadCount >= 0 && unreadCount <= UNREAD_AUTO_SCROLL_THRESHOLD) {
        console.log(`📜 未读消息数量在阈值内 (${unreadCount} <= ${UNREAD_AUTO_SCROLL_THRESHOLD})，直接加载最新消息`)
        await this.loadNewestMessages(channelId)
        return
      }

      // 2. 先从本地 IndexedDB 加载消息，基于 lastReadIndex 查找
      const { messages: localMessages, readMessage } = await this.loadMessagesAroundReadIndex(channelId, lastReadIndex)
      console.log(`📂 从本地加载了 ${localMessages.length} 条消息，已读消息:`, readMessage)
      
      // 3. 检查本地消息是否充足且连续
      console.log(`🔍 检查本地消息连续性...`)
      const messagesAreContinuous = this.checkMessagesContinuity(localMessages, lastReadIndex)
      
      // 4. 检测服务端数据源是否切换（本地消息 index 远大于服务端 lastMessage.index）
      const localMaxIndex = localMessages.length > 0 
        ? Math.max(...localMessages.map(m => m.index || 0)) 
        : 0
      
      // 如果本地最大索引比服务端最新索引大超过10，且本地消息数量超过5条，说明服务端数据源可能切换了
      // 增加本地消息数量阈值，避免因本地消息过少导致误判
      const isServerDataSourceChanged = serverLastIndex > 0 && localMaxIndex > serverLastIndex + 10 && localMessages.length > 5
      
      if (isServerDataSourceChanged) {
        console.log(`⚠️ 检测到服务端数据源切换: 本地最大index=${localMaxIndex}, 服务端lastIndex=${serverLastIndex}, 本地消息数=${localMessages.length}`)
        console.log(`🔄 清除本地缓存消息，从服务端重新拉取...`)
        // 清除该频道的本地消息缓存
        await this.db.deleteChannelMessages(channelId)
        // 从服务端重新获取消息
        await this.loadServerMessagesAroundReadIndex(channelId, channel, 0, null, [], null)
        return
      }
      
      if (localMessages.length >= 20 && messagesAreContinuous) {
        console.log(`🚀 本地消息充足且连续 (${localMessages.length}条)，直接展示`)
        this.messageCache.set(channelId, localMessages)
        return // 直接返回，不再请求服务器
      } else if (localMessages.length >= 20) {
        console.log(`⚠️ 本地消息充足但不连续 (${localMessages.length}条)，需要从服务器补充`)
      } else {
        console.log(`📡 本地消息不足 (${localMessages.length}条)，从服务器获取更多...`)
      }
     
      // 5. 本地消息不足或不连续，需要从服务器获取
      await this.loadServerMessagesAroundReadIndex(channelId, channel, lastReadIndex, readMessage, localMessages, lastReadTimestamp)
    },

    async loadMessageByIndex(index:number){
      const channelId=this.activeChannelId;
      if(!channelId)return;
      const serverMessages = await this.fetchServerNewsterMessages(channelId, this.activeChannel!, Math.max(0,index-19));
      this.mergeAndSaveMessages(channelId,[],serverMessages);
      this.messageCache.set(channelId, serverMessages);
    },

    /**
     * 检查消息是否连续
     * 基于消息的 index 字段判断是否存在缺失的消息
     */
    checkMessagesContinuity(messages: UnifiedChatMessage[], lastReadIndex: number): boolean {
      if (messages.length === 0) {
        return false
      }

      // 按 index 升序排序
      const sortedMessages = messages.sort((a, b) => a.index - b.index)
      
      // 检查消息索引是否连续
      for (let i = 1; i < sortedMessages.length; i++) {
        const prevIndex = sortedMessages[i - 1].index
        const currentIndex = sortedMessages[i].index
        
        // 如果索引不连续（中间有缺失的消息）
        if (currentIndex - prevIndex > 1) {
          console.log(`⚠️ 消息不连续: index ${prevIndex} -> ${currentIndex}, 缺失 ${currentIndex - prevIndex - 1} 条消息`)
          return false
        }
      }

      // 检查是否包含 lastReadIndex 附近足够的上下文
      const minIndex = sortedMessages[0].index
      const maxIndex = sortedMessages[sortedMessages.length - 1].index
      
      // 确保已读消息在范围内，或者已读索引为0（初始状态）
      if (lastReadIndex > 0 && (lastReadIndex < minIndex || lastReadIndex > maxIndex)) {
        console.log(`⚠️ 已读索引 ${lastReadIndex} 不在消息范围 [${minIndex}-${maxIndex}] 内`)
        return false
      }

      console.log(`✅ 消息连续性检查通过: 索引范围 [${minIndex}-${maxIndex}], 共 ${messages.length} 条消息`)
      return true
    },

    /**
     * 根据 lastReadIndex 从本地数据库加载消息
     */
    async loadMessagesAroundReadIndex(channelId: string, lastReadIndex: number): Promise<{
      messages: UnifiedChatMessage[],
      readMessage: UnifiedChatMessage | null
    }> {
      // 获取所有本地消息
      const allLocalMessages = await this.db.getMessages(channelId, 100000) // 获取更多消息用于查找
      
      if (allLocalMessages.length === 0) {
        return { messages: [], readMessage: null }
      }

      // 按 index 升序排序（index 对应消息在频道中的顺序）
      const sortedMessages = allLocalMessages.sort((a, b) => a.index - b.index)
      
      // 找到 lastReadIndex 对应的消息（根据消息的index字段匹配）
      let readMessage: UnifiedChatMessage | null = null
      let readMessageArrayIndex = -1

      // 查找 msg.index === lastReadIndex 的消息
      for (let i = 0; i < sortedMessages.length; i++) {
        if (sortedMessages[i].index === lastReadIndex) {
          readMessage = sortedMessages[i]
          readMessageArrayIndex = i
          console.log(`📖 找到已读消息 (msg.index: ${lastReadIndex}, 数组位置: ${i})`)
          break
        }
      }

      // 计算要显示的消息范围：以已读消息为中心，向上取更多历史消息
      let startIndex: number
      let endIndex: number
      
      // 获取本地消息的最大 index
      const maxLocalIndex = sortedMessages[sortedMessages.length - 1].index
      const minLocalIndex = sortedMessages[0].index
      
      if (readMessage && readMessageArrayIndex >= 0) {
        // 从已读消息位置向上取20条消息（包含已读消息本身）
        startIndex = Math.max(0, readMessageArrayIndex - 19) // 向上19条 + 已读消息 = 20条
        endIndex = readMessageArrayIndex
      } else if (lastReadIndex !== 0 && sortedMessages.length > 0) {
        // 本地消息有数据但找不到精确匹配的 readMessage
        // 参考 loadServerMessagesAroundReadIndex 的逻辑计算 startIndex
        console.log(`📖 未找到精确匹配的已读消息 (lastReadIndex: ${lastReadIndex})，从本地消息中计算位置`)
        
        // 计算目标起始 index（参考 loadServerMessagesAroundReadIndex 的逻辑）
        const targetStartIndex = maxLocalIndex - lastReadIndex > 20 
          ? Math.max(0, lastReadIndex - 1) 
          : maxLocalIndex - 22
        
        // 在本地消息数组中找到最接近 targetStartIndex 的位置
        let nearestArrayIndex = 0
        for (let i = 0; i < sortedMessages.length; i++) {
          if (sortedMessages[i].index >= targetStartIndex) {
            nearestArrayIndex = i
            break
          }
          // 如果遍历完还没找到，说明所有消息的 index 都小于 targetStartIndex
          nearestArrayIndex = sortedMessages.length - 1
        }
        
        // 同时查找最接近 lastReadIndex 的消息作为 readMessage
        for (let i = 0; i < sortedMessages.length; i++) {
          if (sortedMessages[i].index >= lastReadIndex) {
            readMessage = sortedMessages[i]
            readMessageArrayIndex = i
            console.log(`📖 找到最接近的已读消息 (msg.index: ${sortedMessages[i].index}, 目标 lastReadIndex: ${lastReadIndex})`)
            break
          }
        }
        
        startIndex = nearestArrayIndex
        endIndex = Math.min(sortedMessages.length - 1, nearestArrayIndex + 19)
        console.log(`📖 计算出的消息范围: 数组位置 [${startIndex}-${endIndex}], index范围 [${sortedMessages[startIndex]?.index}-${sortedMessages[endIndex]?.index}]`)
      } else if (lastReadIndex === 0 && sortedMessages.length > 0) {
        // lastReadIndex 为 0，表示没有已读记录或全部已读，返回最新的20条消息
        console.log(`📖 lastReadIndex 为 0，返回最新的消息`)
        startIndex = Math.max(0, sortedMessages.length - 20)
        endIndex = sortedMessages.length - 1
      } else {
         return { messages: [], readMessage: null }
      }

      // 提取目标范围的消息
      const messages = sortedMessages.slice(startIndex, endIndex + 1)
      return { messages, readMessage }
    },

    /**
     * 从服务器加载基于 lastReadIndex 的消息
     */
    async loadServerMessagesAroundReadIndex(
      channelId: string, 
      channel: SimpleChannel, 
      lastReadIndex: number,
      readMessage: UnifiedChatMessage | null,
      localMessages: UnifiedChatMessage[],
      lastReadTimestamp: number | null
    ): Promise<void> {
      try {
        let serverMessages: UnifiedChatMessage[] = []

        // 添加 channel.lastMessage.index > 0 检查，确保 index 有效
        // 当 latest-chat-info-list 接口返回 index = -1 时，直接使用 fetchServerMessages 获取最新消息
        if (lastReadIndex!==0 && channel.lastMessage && channel.lastMessage.index && channel.lastMessage.index > 0 && lastReadIndex < channel.lastMessage.index) {
          // 如果有已读消息，以其时间戳为基准获取服务器消息
          console.log(` 基于已读消息时间戳 ${lastReadTimestamp} 获取服务器消息`)
          const startIndex = channel.lastMessage.index-lastReadIndex>20?Math.max(0,lastReadIndex-1):channel.lastMessage.index-22;
          console.log(` 基于已读消息索引 ${lastReadIndex} 获取服务器消息，从 ${startIndex} 开始`,channel.lastMessage.index,lastReadIndex,startIndex)
          serverMessages = await this.fetchServerNewsterMessages(channelId, channel,startIndex )
        } else {
          // 没有已读消息，或 lastMessage.index 无效（<= 0），获取最新消息
          const lastMsgIndex = channel.lastMessage?.index
          const invalidIndexMsg = (lastMsgIndex !== undefined && lastMsgIndex <= 0) ? ` (lastMessage.index 无效: ${lastMsgIndex})` : ''
          console.log(`📡 获取最新服务器消息${invalidIndexMsg}`)
          serverMessages = await this.fetchServerMessages(channelId, channel)
        }

        // 合并本地和服务器消息
        const mergedMessages = await this.mergeAndSaveMessages(channelId, localMessages, serverMessages)
        
        // 如果有已读消息，重新基于 lastReadIndex 筛选消息
        let finalMessages = mergedMessages
        if (readMessage && mergedMessages.length > 0) {
          const sortedMerged = mergedMessages.sort((a, b) => a.timestamp - b.timestamp)
          const readIndex = sortedMerged.findIndex(msg => msg.txId === readMessage.txId)
          
          if (readIndex >= 0) {
            // 从已读消息位置向上取20条
            const startIndex = Math.max(0, readIndex - 19)
            finalMessages = sortedMerged.slice(startIndex, startIndex + 20)
          } else {
            // 如果找不到已读消息，取最新20条
            finalMessages = sortedMerged.slice(-20)
          }
        }
        
        // 更新缓存
        this.messageCache.set(channelId, finalMessages)
        console.log(`✅ 基于已读索引加载完成，共 ${finalMessages.length} 条消息`)
        
      } catch (error) {
        console.error('❌ 从服务器加载消息失败:', error)
        // 出错时使用本地消息
        this.messageCache.set(channelId, localMessages)
      }
    },

    /**
     * 从指定时间戳开始获取服务器消息
     */
    async fetchServerMessagesFromTimestamp(channelId: string, channel: SimpleChannel, fromTimestamp: number): Promise<UnifiedChatMessage[]> {
      let serverMessages: any[] = []
      
      try {
        if (channel.type === 'group') {
          // 群聊消息 - 使用timestamp参数从指定时间点获取消息
          console.log(`🌐 获取群聊 ${channelId} 从时间戳 ${fromTimestamp} 开始的服务端消息...`)
          const { getChannelMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getChannelMessages({
            groupId: channelId,
            metaId: this.selfMetaId,
            cursor: '0',
            size: '50',
            timestamp: fromTimestamp.toString()
          })
          serverMessages = result.list || []
          console.log(`📡 群聊API返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'sub-group') {
          // 子群聊消息 - 使用timestamp参数从指定时间点获取消息
          console.log(`🌐 获取子群聊 ${channelId} 从时间戳 ${fromTimestamp} 开始的服务端消息...`)
          const { getSubChannelMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getSubChannelMessages({
            channelId: channelId,
            metaId: this.selfMetaId,
            cursor: '0',
            size: '50',
            timestamp: fromTimestamp.toString()
          })
          serverMessages = result.list || []
          console.log(`📡 子群聊API返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'private') {
          // 私聊消息 - 使用timestamp参数从指定时间点获取消息
          console.log(`🌐 获取私聊 ${channelId} 从时间戳 ${fromTimestamp} 开始的服务端消息...`)
          const { getPrivateChatMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getPrivateChatMessages({
            metaId: this.selfMetaId,
            otherMetaId: channelId,
            cursor: '0',
            size: '50',
            timestamp: fromTimestamp.toString()
          })
          serverMessages = result.list || []
          console.log(`📡 私聊API返回 ${serverMessages.length} 条消息`)
        }
      } catch (apiError) {
        console.error(`❌ 基于时间戳的API调用失败:`, apiError)
        // 如果基于时间戳的查询失败，回退到普通查询
        return this.fetchServerMessages(channelId, channel)
      }
      
      return serverMessages
    },

    /**
     * 加载最新消息（清空当前消息缓存，从服务器获取最新消息）
     * 用于用户想要快速跳转到最新消息位置的场景
     */
    async loadNewestMessages(channelId?: string): Promise<void> {
      const targetChannelId = channelId || this.activeChannelId
      if (!targetChannelId) {
        console.warn('⚠️ 没有指定频道ID且无当前激活频道')
        return
      }

      try {
        console.log(`🚀 加载频道 ${targetChannelId} 的最新消息...`)
        
       

        // 2. 查找频道信息
        const channel = this.channels.find(c => c.id === targetChannelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${targetChannelId}`)
          this.messageCache.set(targetChannelId, [])
          return
        }

        // 3. 强制从服务器获取最新消息
        console.log(`📡 强制从服务器获取最新消息...`)
        const serverMessages = await this.fetchServerMessages(targetChannelId, channel)
        
        if (serverMessages.length === 0) {
          console.log(`📭 服务器没有返回消息`)
          this.messageCache.set(targetChannelId, [])
          return
        }
         // 1. 清空当前消息缓存
        this.messageCache.delete(targetChannelId)
        console.log(`🗑️ 已清空频道 ${targetChannelId} 的消息缓存`)

        // 4. 按时间排序并设置为当前消息
        const sortedMessages = serverMessages.sort((a, b) => a.timestamp - b.timestamp)
        this.messageCache.set(targetChannelId, sortedMessages)

        // 5. 保存新消息到本地数据库
        for (const msg of serverMessages) {
          await this.db.saveMessage(msg)
        }

        console.log(`✅ 已加载 ${sortedMessages.length} 条最新消息`)
        
      } catch (error) {
        console.error('❌ 加载最新消息失败:', error)
        // 出错时设置空数组
        this.messageCache.set(targetChannelId, [])
      }
    },

    /**
     * 同步加载服务器消息（阻塞式）
     */
    async loadServerMessagesSync(channelId: string, channel: SimpleChannel, localMessages: UnifiedChatMessage[]): Promise<void> {
      console.log(`🔄 同步加载服务器消息...`)
      
      const serverMessages = await this.fetchServerMessages(channelId, channel)
      const mergedMessages = await this.mergeAndSaveMessages(channelId, localMessages, serverMessages)
      
      // 更新缓存
      this.messageCache.set(channelId, mergedMessages)
      console.log(`✅ 同步加载完成，共 ${mergedMessages.length} 条消息`)
    },

    /**
     * 异步后台加载服务器消息（非阻塞式）
     */
    async loadServerMessagesInBackground(channelId: string, channel: SimpleChannel): Promise<void> {
      console.log(`🔄 后台加载服务器消息...`)
      
      try {
        const localMessages = this.messageCache.get(channelId) || []
        const serverMessages = await this.fetchServerMessages(channelId, channel)
        const mergedMessages = await this.mergeAndSaveMessages(channelId, localMessages, serverMessages)
        
        // 静默更新缓存，不影响当前显示
        this.messageCache.set(channelId, mergedMessages)
        console.log(`✅ 后台加载完成，更新了 ${mergedMessages.length} 条消息`)
      } catch (error) {
        console.warn('⚠️ 后台加载服务器消息失败:', error)
      }
    },

    /**
     * 获取服务器最新消息
     */
    async fetchServerMessages(channelId: string, channel: SimpleChannel): Promise<UnifiedChatMessage[]> {
      let serverMessages: any[] = []
      
      try {
        // 计算从哪个 index 开始获取最新消息
        // 使用 lastMessage.index 来获取最新的消息，而不是 cursor: '0'
        const lastMessageIndex = channel.lastMessage?.index || 0
        
        // 如果 lastMessage.index <= 0（例如 -1），说明 latest-chat-info-list 接口返回的 index 无效
        // 此时应该使用 /group-chat-list-v2 接口并传入 timestamp=0 来获取最新消息
        if (lastMessageIndex <= 0) {
          console.log(`⚠️ lastMessage.index 无效 (${lastMessageIndex})，使用 timestamp=0 获取最新消息`)
          return await this.fetchServerMessagesWithTimestampZero(channelId, channel)
        }
        
        const startIndex = Math.max(0, lastMessageIndex - 49) // 获取最新50条消息
        
        if (channel.type === 'group') {
          // 群聊消息 - 使用 index 方式获取最新消息
          console.log(`🌐 获取群聊 ${channelId} 的服务端最新消息... startIndex=${startIndex}`)
          const { getChannelNewestMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getChannelNewestMessages({
            groupId: channelId,
            startIndex: String(startIndex),
            size: '50'
          })
          serverMessages = result.list || []
          console.log(`📡 群聊API返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'sub-group') {
          // 子群聊消息 - 使用 index 方式获取最新消息
          console.log(`🌐 获取子群聊 ${channelId} 的服务端最新消息... startIndex=${startIndex}`)
          const { getSubChannelNewestMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getSubChannelNewestMessages({
            channelId: channelId,
            startIndex: String(startIndex),
            size: '50'
          })
          serverMessages = result.list || []
          console.log(`📡 子群聊API返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'private') {
          // 私聊消息 - 使用 index 方式获取最新消息
          console.log(`🌐 获取私聊 ${channelId} 的服务端最新消息... startIndex=${startIndex}`)
          const result: UnifiedChatResponseData = await getNewstPrivateChatMessages({
            metaId: this.selfMetaId,
            otherMetaId: channelId,
            startIndex: String(startIndex),
            size: '50'
          })
          serverMessages = result.list || []
          console.log(`📡 私聊API返回 ${serverMessages.length} 条消息`)
        }
      } catch (apiError) {
        console.error(`❌ API调用失败:`, apiError)
        serverMessages = []
      }
      
      return serverMessages
    },
    
    /**
     * 当 lastMessage.index 无效时，使用 timestamp=0 获取服务器最新消息
     * 通过 /group-chat-list-v2 等接口获取
     */
    async fetchServerMessagesWithTimestampZero(channelId: string, channel: SimpleChannel): Promise<UnifiedChatMessage[]> {
      let serverMessages: any[] = []
      
      try {
        if (channel.type === 'group') {
          // 群聊消息 - 使用 /group-chat-list-v2 接口，timestamp=0 获取最新消息
          console.log(`🌐 获取群聊 ${channelId} 的服务端最新消息 (timestamp=0)...`)
          const { getChannelMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getChannelMessages({
            groupId: channelId,
            metaId: this.selfMetaId,
            cursor: '0',
            size: '50',
            timestamp: '0'
          })
          serverMessages = result.list || []
          console.log(`📡 群聊API(timestamp=0)返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'sub-group') {
          // 子群聊消息 - 使用 /channel-chat-list-v3 接口，timestamp=0 获取最新消息
          console.log(`🌐 获取子群聊 ${channelId} 的服务端最新消息 (timestamp=0)...`)
          const { getSubChannelMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getSubChannelMessages({
            channelId: channelId,
            metaId: this.selfMetaId,
            cursor: '0',
            size: '50',
            timestamp: '0'
          })
          serverMessages = result.list || []
          console.log(`📡 子群聊API(timestamp=0)返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'private') {
          // 私聊消息 - 使用 /private-chat-list 接口，timestamp=0 获取最新消息
          console.log(`🌐 获取私聊 ${channelId} 的服务端最新消息 (timestamp=0)...`)
          const { getPrivateChatMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getPrivateChatMessages({
            metaId: this.selfMetaId,
            otherMetaId: channelId,
            cursor: '0',
            size: '50',
            timestamp: '0'
          })
          serverMessages = result.list || []
          console.log(`📡 私聊API(timestamp=0)返回 ${serverMessages.length} 条消息`)
        }
      } catch (apiError) {
        console.error(`❌ API调用(timestamp=0)失败:`, apiError)
        serverMessages = []
      }
      
      return serverMessages
    },

    /**
     * 合并并保存消息
     */
    async mergeAndSaveMessages(channelId: string, localMessages: UnifiedChatMessage[], serverMessages: UnifiedChatMessage[]): Promise<UnifiedChatMessage[]> {
      // 合并本地和服务器消息（去重 + 排序）
      const allMessagesMap = new Map<string, UnifiedChatMessage>()
      
      // 添加本地消息
      localMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
      
      // 添加服务器消息（覆盖相同ID的本地消息）
      serverMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
      
      // 按时间升序排序：旧消息在前，新消息在后
      const mergedMessages = Array.from(allMessagesMap.values()).sort((a, b) => a.timestamp - b.timestamp)
      
      // 保存新消息到本地
      const newMessages = serverMessages.filter(serverMsg => 
        !localMessages.some(localMsg => localMsg.txId === serverMsg.txId)
      )
      
      for (const msg of newMessages) {
        await this.db.saveMessage(msg)
      }
      
      if (newMessages.length > 0) {
        console.log(`💾 保存了 ${newMessages.length} 条新消息到本地`)
      }
      
      return mergedMessages
    },

    /**
     * 手动触发服务器消息更新（供用户滑动或手动刷新时使用）
     */
    async refreshMessagesFromServer(channelId: string): Promise<void> {
      try {
        console.log(`🔄 手动刷新频道 ${channelId} 的服务器消息...`)
        
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${channelId}`)
          return
        }

        // 获取当前本地消息
        const localMessages = this.messageCache.get(channelId) || []
        
        // 从服务器获取最新消息
        const serverMessages = await this.fetchServerMessages(channelId, channel)
        
        // 合并并更新缓存
        const mergedMessages = await this.mergeAndSaveMessages(channelId, localMessages, serverMessages)
        this.messageCache.set(channelId, mergedMessages)
        
        console.log(`✅ 手动刷新完成，更新了 ${mergedMessages.length} 条消息`)
      } catch (error) {
        console.error('❌ 手动刷新消息失败:', error)
      }
    },

    /**
     * 加载更多历史消息（分页加载）
     */
    async loadMoreMessages(channelId: string, beforeTimestamp?: number): Promise<boolean> {
      try {
        console.log(`📜 加载更多历史消息: ${channelId}, 早于时间: ${beforeTimestamp ? new Date(beforeTimestamp).toLocaleString() : '无'}`)
        
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${channelId}`)
          return false
        }

        // 获取当前消息
        const currentMessages = this.messageCache.get(channelId) || []
        
        // 第一步：尝试从本地加载连续的历史消息
        if (currentMessages.length > 0) {
          // 找到当前最小的 index
          const minIndex = Math.min(...currentMessages.map(msg => msg.index || 0))
          console.log(`📊 当前消息中最小的 index: ${minIndex}`)
          
          if (minIndex > 1) { // 只有当最小index大于1时才尝试本地加载
            // 查找本地是否有比最小index小的连续20条消息
            const localHistoryMessages = await this.loadLocalHistoryMessages(channelId, minIndex - 1, 20)
            
            if (localHistoryMessages.length > 0) {
              console.log(`📂 从本地找到 ${localHistoryMessages.length} 条历史消息`)
              
              // 检查是否连续
              const sortedLocalMessages = localHistoryMessages.sort((a, b) => (a.index || 0) - (b.index || 0))
              const isConsecutive = this.checkConsecutiveIndexes(sortedLocalMessages, minIndex - localHistoryMessages.length)
              
              if (isConsecutive) {
                console.log(`✅ 本地历史消息 index 连续，直接使用本地数据`)
                
                // 合并到现有消息中
                const allMessagesMap = new Map<string, UnifiedChatMessage>()
                
                // 添加现有消息
                currentMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
                
                // 添加本地历史消息
                localHistoryMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
                
                // 重新排序
                const mergedMessages = Array.from(allMessagesMap.values()).sort((a, b) => a.timestamp - b.timestamp)
                
                // 更新缓存
                this.messageCache.set(channelId, mergedMessages)
                
                console.log(`✅ 本地历史消息加载完成，新增 ${localHistoryMessages.length} 条消息，总计 ${mergedMessages.length} 条`)
                return true
              } else {
                console.log(`⚠️ 本地历史消息 index 不连续，需要从服务器加载`)
              }
            } else {
              console.log(`📭 本地没有找到更多历史消息`)
            }
          }
        }
        
        // 第二步：从服务器加载历史消息
        console.log(`🌐 开始从服务器加载历史消息...`)
        
        // 确定分页的 timestamp 参数
        let timestamp = '0'
        if (beforeTimestamp) {
          // 如果指定了时间戳，直接使用
          timestamp = Math.floor(beforeTimestamp / 1000).toString() // 转换为秒
        } else if (currentMessages.length > 0) {
          // 使用最早消息的时间戳
          const earliestMessage = currentMessages[0] // 因为是降序排列
          timestamp = earliestMessage.timestamp.toString()
        }

        console.log(`📄 分页参数: timestamp=${timestamp}, size=20`)

        // 从服务器获取更多历史消息
        let serverMessages: any[] = []
        
        if (channel.type === 'group') {
          // 群聊消息
          const { getChannelMessages } = await import('@/api/talk')
          const result = await getChannelMessages({
            groupId: channelId,
            metaId: this.selfMetaId,
            cursor: '0', // cursor 保持默认
            timestamp: timestamp, // 使用 timestamp 参数进行分页
            size: '20' // 每次加载20条
          })
          console.log(`📡 分页群聊API返回:`, result)
          serverMessages = result.list || []
        }else if (channel.type === 'sub-group') {
          // 子群聊消息
          const { getSubChannelMessages } = await import('@/api/talk')
          const result = await getSubChannelMessages({
            channelId: channelId, // 子群聊使用自己的channelId作为groupId
            metaId: this.selfMetaId,
            cursor: '0', // cursor 保持默认
            timestamp: timestamp, // 使用 timestamp 参数进行分页
            size: '20' // 每次加载20条
          })
          console.log(`📡 分页子群聊API返回:`, result)
          serverMessages = result.list || []
        }else if (channel.type === 'private') {
          // 私聊消息  
          const { getPrivateChatMessages } = await import('@/api/talk')
          const result = await getPrivateChatMessages({
            metaId: this.selfMetaId,
            otherMetaId: channelId,
            cursor: '0', // cursor 保持默认
            timestamp: timestamp, // 使用 timestamp 参数进行分页
            size: '20'
          })
          serverMessages = result.list || []
        }

        console.log(`📡 分页加载获取了 ${serverMessages.length} 条历史消息`)

        if (serverMessages.length === 0) {
          console.log(`📭 没有更多历史消息了`)
          return false // 没有更多消息
        }

        // 转换消息格式
        const convertedMessages = serverMessages
        
        // 合并到现有消息中（去重）
        const allMessagesMap = new Map<string, UnifiedChatMessage>()
        
        // 添加现有消息
        currentMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
        
        // 添加新加载的消息
        convertedMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
        
        // 重新排序
        const mergedMessages = Array.from(allMessagesMap.values()).sort((a, b) => a.timestamp - b.timestamp)

        // 更新缓存
        this.messageCache.set(channelId, mergedMessages)
        
        // 保存新消息到本地
        for (const msg of convertedMessages) {
          await this.db.saveMessage(msg)
        }
        
        console.log(`✅ 服务器分页加载完成，新增 ${convertedMessages.length} 条消息，总计 ${mergedMessages.length} 条`)
        
        return true // 成功加载了更多消息
        
      } catch (error) {
        console.error('❌ 分页加载消息失败:', error)
        return false
      }
    },

    /**
     * 从本地数据库加载历史消息（按 index 范围）
     */
    async loadLocalHistoryMessages(channelId: string, maxIndex: number, limit: number): Promise<UnifiedChatMessage[]> {
      if (!this.db.database) return []
      
      return new Promise((resolve) => {
        const transaction = this.db.database!.transaction(['messages'], 'readonly')
        const store = transaction.objectStore('messages')
        const request = store.getAll()
        
        request.onsuccess = () => {
          const allMessages = request.result || []
          
          const historyMessages = allMessages
            .filter((msg: any) => {
              const matchUser = msg.userPrefix === this.db.prefix
              const matchChannel = msg.channelId === channelId
              const matchIndex = (msg.index || 0) <= maxIndex && (msg.index || 0) > 0
              return matchUser && matchChannel && matchIndex
            })
            .map(({ userPrefix, id, ...message }: any) => message) // 移除额外字段
            .sort((a: any, b: any) => (b.index || 0) - (a.index || 0)) // 按 index 降序
            .slice(0, limit) // 限制数量
          
          console.log(`📊 本地历史查询: channelId=${channelId}, maxIndex=${maxIndex}, 找到 ${historyMessages.length} 条消息`)
          resolve(historyMessages)
        }
        
        request.onerror = () => {
          console.error('❌ 加载本地历史消息失败:', request.error)
          resolve([])
        }
      })
    },

    /**
     * 加载更多最新消息（向前获取）
     */
    async loadMoreNewestMessages(channelId: string, afterTimestamp?: number): Promise<boolean> {
      try {
        console.log(`📜 加载更多最新消息: ${channelId}, 晚于时间: ${afterTimestamp ? new Date(afterTimestamp).toLocaleString() : '无'}`)
        
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${channelId}`)
          return false
        }

       

        // 获取当前消息
        const currentMessages = this.messageCache.get(channelId) || []
        
        // 第一步：尝试从本地加载连续的最新消息
        if (currentMessages.length > 0) {
          // 找到当前最大的 index
          const maxIndex = Math.max(...currentMessages.map(msg => msg.index || 0))
          console.log(`📊 当前消息中最大的 index: ${maxIndex}`)
          
          // 查找本地是否有比最大index大的连续20条消息
          const localNewestMessages = await this.loadLocalNewestMessages(channelId, maxIndex + 1, 20)
          
          if (localNewestMessages.length > 0) {
            console.log(`📂 从本地找到 ${localNewestMessages.length} 条最新消息`)
            
            // 检查是否连续
            const sortedLocalMessages = localNewestMessages.sort((a, b) => (a.index || 0) - (b.index || 0))
            const isConsecutive = this.checkConsecutiveIndexes(sortedLocalMessages, maxIndex + 1)
            
            if (isConsecutive) {
              console.log(`✅ 本地最新消息 index 连续，直接使用本地数据`)
              
              // 合并到现有消息中
              const allMessagesMap = new Map<string, UnifiedChatMessage>()
              
              // 添加现有消息
              currentMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
              
              // 添加本地最新消息
              localNewestMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
              
              // 重新排序
              const mergedMessages = Array.from(allMessagesMap.values()).sort((a, b) => a.timestamp - b.timestamp)
              
              // 更新缓存
              this.messageCache.set(channelId, mergedMessages)
              
              console.log(`✅ 本地最新消息加载完成，新增 ${localNewestMessages.length} 条消息，总计 ${mergedMessages.length} 条`)
              return true
            } else {
              console.log(`⚠️ 本地最新消息 index 不连续，需要从服务器加载`)
            }
          } else {
            console.log(`📭 本地没有找到更多最新消息`)
          }
        }
        
        // 第二步：从服务器加载最新消息
        console.log(`🌐 开始从服务器加载最新消息...`)
        
        // 确定起始 index
        let startIndex = 1
        if (currentMessages.length > 0) {
          // 使用最新消息的 index + 1
          const latestMessage = currentMessages[currentMessages.length - 1] // 因为是升序排列
          startIndex = (latestMessage.index || 0) + 1
        }

        console.log(`📄 分页参数: startIndex=${startIndex}, size=20`)

        // 使用 fetchServerNewsterMessages 获取最新消息
        const serverMessages = await this.fetchServerNewsterMessages(channelId, channel, startIndex)

        console.log(`📡 分页加载获取了 ${serverMessages.length} 条最新消息`)

        if (serverMessages.length === 0) {
          console.log(`📭 没有更多最新消息了`)
          return false // 没有更多消息
        }

        // 转换消息格式（serverMessages 已经是正确格式）
        const convertedMessages = serverMessages
        
        // 合并到现有消息中（去重）
        const allMessagesMap = new Map<string, UnifiedChatMessage>()
        
        // 添加现有消息
        currentMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
        
        // 添加新加载的消息
        convertedMessages.forEach(msg => allMessagesMap.set(msg.txId, msg))
        
        // 重新排序
        const mergedMessages = Array.from(allMessagesMap.values()).sort((a, b) => a.timestamp - b.timestamp)

        // 更新缓存
        this.messageCache.set(channelId, mergedMessages)
        
        // 保存新消息到本地
        for (const msg of convertedMessages) {
          await this.db.saveMessage(msg)
        }
        
        console.log(`✅ 服务器分页加载完成，新增 ${convertedMessages.length} 条消息，总计 ${mergedMessages.length} 条`)
        
        return true // 成功加载了更多消息
        
      } catch (error) {
        console.error('❌ 分页加载最新消息失败:', error)
        return false
      }
    },

    /**
     * 从本地数据库加载最新消息（按 index 范围）
     */
    async loadLocalNewestMessages(channelId: string, minIndex: number, limit: number): Promise<UnifiedChatMessage[]> {
      if (!this.db.database) return []
      
      return new Promise((resolve) => {
        const transaction = this.db.database!.transaction(['messages'], 'readonly')
        const store = transaction.objectStore('messages')
        const request = store.getAll()
        
        request.onsuccess = () => {
          const allMessages = request.result || []
          
          const newestMessages = allMessages
            .filter((msg: any) => {
              const matchUser = msg.userPrefix === this.db.prefix
              const matchChannel = msg.channelId === channelId
              const matchIndex = (msg.index || 0) >= minIndex
              return matchUser && matchChannel && matchIndex
            })
            .map(({ userPrefix, id, ...message }: any) => message) // 移除额外字段
            .sort((a: any, b: any) => (a.index || 0) - (b.index || 0)) // 按 index 升序
            .slice(0, limit) // 限制数量
          
          console.log(`📊 本地最新消息查询: channelId=${channelId}, minIndex=${minIndex}, 找到 ${newestMessages.length} 条消息`)
          resolve(newestMessages)
        }
        
        request.onerror = () => {
          console.error('❌ 加载本地最新消息失败:', request.error)
          resolve([])
        }
      })
    },


      /**
     * 获取服务器消息
     */
    async fetchServerNewsterMessages(channelId: string, channel: SimpleChannel,startIndex:number,size:number=30): Promise<UnifiedChatMessage[]> {
      let serverMessages: any[] = []
      
      try {
        if (channel.type === 'group') {
          // 群聊消息
          const { getChannelNewestMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getChannelNewestMessages({
            groupId: channelId,
            startIndex: String(startIndex),
            size: String(size)
          })
          serverMessages = result.list || []
        } else if (channel.type === 'sub-group') {
          // 子群聊消息 - 使用 channelId 而不是 parentGroupId
          const { getSubChannelNewestMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getSubChannelNewestMessages({
            channelId: channelId, // 子群聊使用自己的channelId作为groupId
            startIndex: String(startIndex),
            size: String(size)
          })
          serverMessages = result.list || []
        } else if (channel.type === 'private') {
          const result: UnifiedChatResponseData = await getNewstPrivateChatMessages({
            metaId: this.selfMetaId,
            otherMetaId: channelId,
            startIndex: String(startIndex),
            size:  String(size)
          })
          serverMessages = result.list || [] 
        }
      } catch (apiError) {
        console.error(`❌ API调用失败:`, apiError)
        serverMessages = []
      }
      
      return serverMessages
    },

    /**
     * 检查消息列表的 index 是否连续
     */
    checkConsecutiveIndexes(messages: UnifiedChatMessage[], startIndex: number): boolean {
      if (messages.length === 0) return false
      
      for (let i = 0; i < messages.length; i++) {
        const expectedIndex = startIndex + i
        const actualIndex = messages[i].index || 0
        
        if (actualIndex !== expectedIndex) {
          console.log(`❌ Index 不连续: 期望 ${expectedIndex}, 实际 ${actualIndex}`)
          return false
        }
      }
      
      return true
    },

    /**
     * 检查指定范围内的消息是否连续
     * @param messages 消息列表（应该已按 index 排序）
     * @param startIndex 范围起始 index
     * @param endIndex 范围结束 index
     * @returns 是否连续
     */
    checkMessageRangeContinuity(messages: UnifiedChatMessage[], startIndex: number, endIndex: number): boolean {
      const expectedCount = endIndex - startIndex + 1
      
      if (messages.length !== expectedCount) {
        console.log(`⚠️ 消息数量不匹配: 期望 ${expectedCount} 条，实际 ${messages.length} 条`)
        return false
      }

      for (let i = 0; i < messages.length; i++) {
        const expectedIndex = startIndex + i
        const actualIndex = messages[i].index
        
        if (actualIndex !== expectedIndex) {
          console.log(`⚠️ Index 不连续: 期望 ${expectedIndex}, 实际 ${actualIndex}`)
          return false
        }
      }

      return true
    },

    /**
     * 检查本地消息的连续性，找出所有缺失的消息段
     * @param messages 本地消息列表
     * @param maxIndex 频道最新消息的 index
     * @returns 缺失的消息段数组 [{startIndex, endIndex}]
     */
    findMissingMessageRanges(messages: UnifiedChatMessage[], maxIndex: number): Array<{startIndex: number, endIndex: number}> {
      if (messages.length === 0) {
        // 如果本地没有消息，且有最新消息，返回整个范围
        if (maxIndex > 0) {
          return [{startIndex: 1, endIndex: maxIndex}]
        }
        return []
      }

      // 按 index 排序
      const sortedMessages = [...messages].sort((a, b) => a.index - b.index)
      const missingRanges: Array<{startIndex: number, endIndex: number}> = []

      // 检查第一条消息之前是否有缺失
      const firstIndex = sortedMessages[0].index
      if (firstIndex > 1) {
        missingRanges.push({startIndex: 1, endIndex: firstIndex - 1})
        console.log(`🔍 发现缺失段: [1, ${firstIndex - 1}]`)
      }

      // 检查消息之间的间隙
      for (let i = 0; i < sortedMessages.length - 1; i++) {
        const currentIndex = sortedMessages[i].index
        const nextIndex = sortedMessages[i + 1].index
        
        if (nextIndex - currentIndex > 1) {
          missingRanges.push({startIndex: currentIndex + 1, endIndex: nextIndex - 1})
          console.log(`🔍 发现缺失段: [${currentIndex + 1}, ${nextIndex - 1}]`)
        }
      }

      // 检查最后一条消息之后是否有缺失
      const lastIndex = sortedMessages[sortedMessages.length - 1].index
      if (lastIndex < maxIndex) {
        missingRanges.push({startIndex: lastIndex + 1, endIndex: maxIndex})
        console.log(`🔍 发现缺失段: [${lastIndex + 1}, ${maxIndex}]`)
      }

      return missingRanges
    },

    /**
     * 解密消息内容
     */
    decryptMessageContent(content: string, channelId: string, encryption?: string): string {
      if (!content) return ''
      if (encryption === '0' || !encryption) {
        return content
      }

      try {
        // 使用频道ID的前16个字符作为解密密钥
        const decryptKey = channelId.substring(0, 16)
        return decrypt(content, decryptKey)
      } catch (error) {
        console.error('❌ 消息解密失败:', error)
        return content // 解密失败时返回原始内容
      }
    },

   

    /**
     * 标记频道为已读
     */
    markAsRead(channelId: string): void {
      const channel = this.channels.find(c => c.id === channelId)
      if (channel && channel.lastMessage?.index) {
        // 现在通过设置 lastReadIndex 来标记已读，而不是直接设置 unreadCount
        // 未读数会通过 lastMessage.index - lastReadIndex 自动计算
        this.setLastReadIndex(channelId, channel.lastMessage.index, channel.lastMessage.timestamp)
        
        // 标记所有@提及为已读
        if (channel.unreadMentionCount && channel.unreadMentionCount > 0) {
          this.db.markAllMentionsAsRead(channelId).then(async () => {
            // 重新统计未读数量（应该为0）
            const unreadCount = await this.db.countUnreadMentions(channelId)
            channel.unreadMentionCount = unreadCount
            channel.mentionCheckTimestamp = Date.now()
            await this.db.saveChannel(channel)
            console.log(`✅ 频道 ${channel.name} 未读 @ 提及已清除`)
          }).catch(error => {
            console.warn(`标记频道 ${channelId} 提及为已读失败:`, error)
          })
        }
      }
    },

    /**
     * 设置频道的最后已读消息索引
     * 只能设置比当前值更大的索引，不能设置更小的值，防止已读状态倒退
     * 使用用户metaId和channelId作为联合唯一索引，独立存储
     * @param channelId 频道ID
     * @param messageIndex 消息索引
     * @param timestamp 可选的消息时间戳，来自UnifiedChatMessage.timestamp
     */
    async setLastReadIndex(channelId: string, messageIndex: number, timestamp?: number): Promise<void> {
      try {
        if (!this.selfMetaId) {
          console.warn(`⚠️ 未获取到用户MetaId，无法设置已读索引`)
          return
        }

        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${channelId}，无法设置已读索引`)
          return
        }
        console.log(`🔖 设置频道 ${channelId} 的已读索引为 ${messageIndex} (当前值: ${channel.lastReadIndex})`)

        
        
        // 只允许设置比当前值更大的索引
        if (messageIndex <= (channel.lastReadIndex ?? 0)) {
          // console.warn(`⚠️ 已读索引 ${messageIndex} 不能小于或等于当前值 ${currentIndex}，跳过设置`)
          return
        }
         channel.lastReadIndex = messageIndex
        
        
        // 保存到独立的 lastReadIndex 表，使用消息的时间戳
        await this.db.saveLastReadIndex(this.selfMetaId, channelId, messageIndex, timestamp)

        // 更新内存中的 lastReadIndex（保持向后兼容）

        
       

        const timestampInfo = timestamp ? ` (消息时间: ${new Date(timestamp).toLocaleString()})` : ''
        console.log(`✅ 频道 ${channelId} 已读索引已从 ${channel.lastReadIndex} 更新为: ${messageIndex} (用户: ${this.selfMetaId})${timestampInfo}`)
        
        // 通知 IDChat app 未读消息数量
        this.notifyIDChatAppBadge()
      } catch (error) {
        console.error('❌ 设置已读索引失败:', error)
        throw error
      }
    },

    /**
     * 获取频道的最后已读消息索引
     * 从独立存储中获取，基于用户metaId和channelId联合索引
     */
    async getLastReadIndex(channelId: string): Promise<number> {
      try {
        if (!this.selfMetaId) {
          console.warn(`⚠️ 未获取到用户MetaId，无法获取已读索引`)
          return 0
        }

        // 从独立存储获取已读索引
        const lastReadIndex = await this.db.getLastReadIndex(this.selfMetaId, channelId)
        
        // 同时更新内存中的值（保持向后兼容）
        const channel = this.channels.find(c => c.id === channelId)
        if (channel && channel.lastReadIndex !== lastReadIndex) {
          channel.lastReadIndex = lastReadIndex
        }

        return lastReadIndex
      } catch (error) {
        console.error('❌ 获取已读索引失败:', error)
        // 降级到从内存中获取
        const channel = this.channels.find(c => c.id === channelId)
        return channel?.lastReadIndex || 0
      }
    },

    async getLastReadIndexWithTimestamp(channelId: string): Promise<{ index: number, timestamp: number | null }> {
      try {
        if (!this.selfMetaId) {
          console.warn(`⚠️ 未获取到用户MetaId，无法获取已读索引`)
          return { index: 0, timestamp: null }
        }

        // 从独立存储获取已读索引和时间戳
        const record = await this.db.getLastReadIndexRecord(this.selfMetaId, channelId)
        const lastReadIndex = record ? record.messageIndex : 0
        const timestamp = record ? record.messageTimestamp : null

        // 同时更新内存中的值（保持向后兼容）
        const channel = this.channels.find(c => c.id === channelId)
        if (channel && channel.lastReadIndex !== lastReadIndex) {
          channel.lastReadIndex = lastReadIndex
        }

        return { index: lastReadIndex, timestamp }
      } catch (error) {
        console.error('❌ 获取已读索引失败:', error)
        // 降级到从内存中获取
        const channel = this.channels.find(c => c.id === channelId)
        return { index: channel?.lastReadIndex || 0, timestamp: null }
      }
    },

    /**
     * 同步获取频道的最后已读消息索引（向后兼容方法）
     * 从内存中获取，可能不是最新值
     */
    getLastReadIndexSync(channelId: string): number {
      const channel = this.channels.find(c => c.id === channelId)
      return channel?.lastReadIndex || 0
    },

    /**
     * 清理频道的已读索引（当删除或离开频道时调用）
     */
    async cleanupChannelLastReadIndex(channelId: string): Promise<void> {
      try {
        if (!this.selfMetaId) return

        await this.db.deleteLastReadIndex(this.selfMetaId, channelId)
        console.log(`🗑️ 已清理频道 ${channelId} 的已读索引`)
      } catch (error) {
        console.error(`❌ 清理频道 ${channelId} 已读索引失败:`, error)
      }
    },

    /**
     * 创建群聊
     */
    async createGroupChat(name: string, members: string[] = []): Promise<SimpleChannel | null> {
      try {
        const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        
        const newGroup: SimpleChannel = {
          id: groupId,
          type: 'group',
          name,
          members: [this.selfMetaId, ...members],
          createdBy: this.selfMetaId,
          createdAt: Date.now(),
          unreadCount: 0,
          lastReadIndex: 0 // 显式初始化已读索引为 0
        }

        this.channels.unshift(newGroup)
        await this.db.saveChannel(newGroup)

        // 在后台获取新群聊的权限信息
        this.getGroupMemberPermissions(groupId).catch(error => {
          console.warn(`⚠️ 获取新群聊 ${groupId} 权限信息失败:`, error)
        })

        console.log(`✅ 创建群聊: ${name}`)
        return newGroup
      } catch (error) {
        console.error('创建群聊失败:', error)
        return null
      }
    },

    /**
     * 创建私聊
     */
    async createPrivateChat(targetGlobalMetaId: string): Promise<SimpleChannel | null> {
      // 检查是否已存在
      const existing = this.channels.find(
        c => c.type === 'private' && c.targetMetaId === targetGlobalMetaId
      )
      if (existing) return existing

      try {
        // 获取用户信息
        const userInfo = await GetUserEcdhPubkeyForPrivateChat(targetGlobalMetaId)
        if (!userInfo.chatPublicKey) {
          throw new Error('用户未开启私聊功能')
        }

        // 设置加密密钥
        const ecdhsStore = useEcdhsStore()
        let ecdh = ecdhsStore.getEcdh(userInfo.chatPublicKey)
        if (!ecdh) {
          ecdh = await getEcdhPublickey(userInfo.chatPublicKey)
          if (ecdh) {
            ecdhsStore.insert(ecdh, ecdh.externalPubKey)
          }
        }

        const newChat: SimpleChannel = {
          id: targetGlobalMetaId,
          type: 'private',
          name: userInfo.name,
          avatar: userInfo.avatarImage,
          members: [this.selfMetaId, targetGlobalMetaId],
          createdBy: this.selfMetaId,
          createdAt: Date.now(),
          unreadCount: 0,
          lastReadIndex: 0, // 显式初始化已读索引为 0
          targetMetaId: targetGlobalMetaId,
          publicKeyStr: userInfo.chatPublicKey
        }

        this.channels.unshift(newChat)
        await this.db.saveChannel(newChat)

        console.log(`✅ 创建私聊: ${userInfo.name}`)
        return newChat
      } catch (error) {
        console.error('创建私聊失败:', error)
        return null
      }
    },

    /**
     * 更新频道信息
     * @param channelId 频道ID
     * @param updates 要更新的字段
     */
    async updateChannelInfo(channelId: string, updates: {
      name?: string,
      avatar?: string,
      roomNote?: string
    }): Promise<boolean> {
      try {
        console.log(`🔄 更新频道信息: ${channelId}`, updates)

        // 查找频道
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${channelId}`)
          return false
        }

        // 记录更新前的信息
        const oldInfo = {
          name: channel.name,
          avatar: channel.avatar,
          roomNote: channel.roomNote
        }

        // 更新频道信息
        let hasChanges = false
        
        if (updates.name !== undefined && updates.name !== channel.name) {
          channel.name = updates.name
          hasChanges = true
          console.log(`📝 更新频道名称: "${oldInfo.name}" → "${updates.name}"`)
        }

        if (updates.avatar !== undefined && updates.avatar !== channel.avatar) {
          if(updates.avatar && updates.avatar.startsWith('metafile://')){
            updates.avatar = `${VITE_FILE_API()}/content/${updates.avatar.replace('metafile://', '')}`
          }
          channel.avatar = updates.avatar
          hasChanges = true
          console.log(`🖼️ 更新频道头像: "${oldInfo.avatar}" → "${updates.avatar}"`)
        }

        if (updates.roomNote !== undefined && updates.roomNote !== channel.roomNote) {
          channel.roomNote = updates.roomNote
          hasChanges = true
          console.log(`📋 更新群聊公告: "${oldInfo.roomNote}" → "${updates.roomNote}"`)
        }

        if (!hasChanges) {
          console.log(`ℹ️ 频道信息无变化，跳过保存`)
          return true
        }

        // saveChannel 方法内部会调用 createCloneableChannel 来安全序列化
        await this.db.saveChannel(channel)
        
        console.log(`✅ 频道 ${channelId} 信息更新成功`)
        return true

      } catch (error) {
        console.error('❌ 更新频道信息失败:', error)
        return false
      }
    },

    /**
     * 发送消息并更新频道数据
     */
    async sendMessage(
      channelId: string, 
      content: string, 
      messageType: MessageType = MessageType.msg, 
      reply: any,
      mentions?: Array<{ globalMetaId: string; name: string }>  // 使用 globalMetaId
    ): Promise<UnifiedChatMessage | null> {
      console.log(`✉️ 发送消息到频道 ${channelId}`, { content, messageType, reply, mentions })
      try {
        const chainStore = useChainStore()
        const userStore = useUserStore()
        const channel = this.channels.find(c => c.id === channelId)

        //  if((channel!.lastReadIndex ?? 0) < (channel!.lastMessage?.index || 0)){
        //     await this.loadNewestMessages(channelId)
        //     await sleep(500)
        //   }
        const isPrivateChat = channel?.type === 'private'
        // 判断是否是子群聊
        const isSubGroupChat = channel?.type === 'sub-group'
        const mockId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = getTimestampInSeconds()
        
        console.log(`📤 准备发送消息到频道 ${channelId}`, {
          isPrivateChat,
          isSubGroupChat,
          channelType: channel?.type,
          parentGroupId: channel?.parentGroupId,
          channelName: channel?.name,
          timestamp
        })
        
        // 创建消息对象
        const message: UnifiedChatMessage = {
          mockId,
          // 通用字段
          txId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pinId: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metaId: this.selfMetaId,
          globalMetaId: this.selfGlobalMetaId, // 添加 globalMetaId 用于识别消息发送者
          address: userStore.last?.address || '',
          userInfo: {
            metaid: this.selfMetaId,
            globalMetaId: this.selfGlobalMetaId, // 添加 globalMetaId
            address: userStore.last?.address || '',
            name: userStore.last?.name || 'Unknown',
            avatar: userStore.last?.avatar,
            avatarImage: userStore.last?.avatar,
            chatPublicKey: ''
          },
          nickName: userStore.last?.name || 'Unknown',
          protocol: "/protocols/simplemsg",
          content,
          contentType: 'text/plain',
          encryption: isPrivateChat ? 'ecdh' : 'aes',
          version: '1.0.0',
          chatType: 0,
          data: null,
          replyPin: reply ? `${reply.txId}i0` : '',
          replyInfo: reply,
          replyMetaId: '',
          timestamp: timestamp,
          params: '',
          chain: chainStore.state.currentChain,
          blockHeight: 0,
          index: channel?.lastMessage ? (channel.lastMessage.index || 0) + 1 : 1,
          
          // @ 提及功能 - 使用 globalMetaId
          mention: mentions && mentions.length > 0 ? mentions.map(m => m.globalMetaId) : [],

          // 私聊特有字段（使用 fromGlobalMetaId/toGlobalMetaId）
          fromGlobalMetaId: isPrivateChat ? this.selfMetaId : undefined,
          fromUserInfo: isPrivateChat ? {
            metaid: this.selfMetaId,
            address: userStore.last?.address || '',
            name: userStore.last?.name || 'Unknown',
            avatar: userStore.last?.avatar,
            avatarImage: userStore.last?.avatar,
            chatPublicKey: ''
          } : undefined,
          toGlobalMetaId: isPrivateChat ? channelId : undefined,
          toUserInfo: isPrivateChat ? channel?.serverData?.userInfo : undefined,

          // 群聊特有字段
          groupId: isPrivateChat ? undefined : (isSubGroupChat ? channel?.parentGroupId : channelId), // 子群聊使用父群聊ID
          channelId: isPrivateChat ? undefined : (isSubGroupChat ? channelId : ''), // 子群聊使用频道ID
          metanetId: isPrivateChat ? undefined : (isSubGroupChat ? channel?.parentGroupId : channelId)
        }

        console.log(`📝 消息对象创建完成:`, {
          groupId: message.groupId,
          channelId: message.channelId,
          isSubGroupChat
        })
        
        // 保存消息到本地
        await this.addMessage(message)
        
        if (channel!.type === 'group' || channel!.type === 'sub-group') {
          const contentType = 'text/plain'
          const encryption = 'aes'
          const externalEncryption = '0' as const
          
          // 构建发送数据
          const dataCarrier = {
            groupID: isSubGroupChat ? channel?.parentGroupId : channelId, // 子群聊使用父群聊ID发送
            channelID: isSubGroupChat ? channelId : undefined, // 子群聊需要指定频道ID
            timestamp,
            nickName: userStore.last?.name || '',
            content,
            contentType,
            encryption,
            replyPin: reply ? `${reply.txId}i0` : '',
            mention: mentions && mentions.length > 0 ? mentions.map(m => m.globalMetaId) : [],  // 使用 globalMetaId
          } 
          
          const node = {
            protocol: NodeName.SimpleGroupChat,
            body: dataCarrier,
            timestamp: Date.now(), // 服务端返回的是毫秒，所以模拟需要乘以1000
            externalEncryption,
          }
          
          console.log(`🚀 发送群聊消息:`, {
            groupID: dataCarrier.groupID,
            channelID: dataCarrier.channelID,
            isSubGroupChat,
            content,
            node
          })
          
          await tryCreateNode(node, mockId)
        } else {
          // 私聊逻辑保持不变
          const contentType = 'text/plain'
          const encrypt = 'ecdh'
          const externalEncryption = '0' as const
          const dataCarrier = {
            to: channelId,
            timestamp,
            content,
            contentType,
            encrypt,
            replyPin: reply ? `${reply.txId}i0` : '',
          }

          const node = {
            protocol: NodeName.SimpleMsg,
            body: dataCarrier,
            timestamp,
            externalEncryption,
          }
          
          console.log(`🚀 发送私聊消息到: ${channelId}`)
          await tryCreateNode(node, mockId)
        }

        console.log(`✅ 发送消息到频道 ${channelId} ${isSubGroupChat ? '(子群聊)' : ''}: ${content}`)
        return message
      } catch (error) {
        console.error('发送消息失败:', error)
        return null
      }
    },

    async removeMessage(mockId: string) {
      console.log(`🗑️ 开始删除消息 mockId: ${mockId}`)
      
      try {
        let foundMessage: UnifiedChatMessage | null = null
        let foundChannelId: string | null = null

        // 1. 在所有缓存的频道中查找包含指定 mockId 的消息
        for (const [channelId, messages] of this.messageCache) {
          const messageIndex = messages.findIndex(msg => msg.mockId === mockId)
          if (messageIndex !== -1) {
            foundMessage = messages[messageIndex]
            foundChannelId = channelId
            
            // 从缓存中删除消息
            messages.splice(messageIndex, 1)
            console.log(`📝 从缓存中删除消息: channelId=${channelId}, mockId=${mockId}`)
            break
          }
        }

        if (!foundMessage || !foundChannelId) {
          console.warn(`⚠️ 未找到 mockId 为 ${mockId} 的消息`)
          return
        }

        // 2. 根据消息的 txId 从数据库中删除记录
        if (foundMessage.txId) {
          await this.db.deleteMessage(foundMessage.txId)
          console.log(`🗄️ 从数据库中删除消息: txId=${foundMessage.txId}`)
        } else {
          console.warn(`⚠️ 消息没有 txId，跳过数据库删除: mockId=${mockId}`)
        }

        console.log(`✅ 消息删除完成: mockId=${mockId}`)
      } catch (error) {
        console.error(`❌ 删除消息失败: mockId=${mockId}`, error)
        throw error
      }
    },

    async setMessageError(mockId: string, error: string) {
      console.log(`❌ 设置消息错误状态 mockId: ${mockId}, error: ${error}`)
      
      try {
        let foundMessage: UnifiedChatMessage | null = null
        let foundChannelId: string | null = null

        // 1. 在所有缓存的频道中查找包含指定 mockId 的消息
        for (const [channelId, messages] of this.messageCache) {
          const message = messages.find(msg => msg.mockId === mockId)
          if (message) {
            await this.db.deleteMessage(message.txId)
            foundMessage = message
            foundChannelId = channelId
            
            // 设置错误信息
            message.error = error
            this.updateMessage(message)
            console.log(`📝 为消息设置错误状态: channelId=${channelId}, mockId=${mockId}, error=${error}`)
            break
          }
        }

        if (!foundMessage || !foundChannelId) {
          console.warn(`⚠️ 未找到 mockId 为 ${mockId} 的消息`)
          return
        }

        // 2. 如果消息已经有 txId，也更新数据库中的记录
        if (foundMessage.txId) {
          // 这里需要更新数据库中的消息记录，添加错误信息
          await this.db.saveMessage(foundMessage)
          console.log(`🗄️ 更新数据库中消息的错误状态: txId=${foundMessage.txId}`)
        } else {
          console.log(`💡 消息尚未发送到服务器，仅更新内存缓存: mockId=${mockId}`)
        }

        console.log(`✅ 消息错误状态设置完成: mockId=${mockId}`)
      } catch (error) {
        console.error(`❌ 设置消息错误状态失败: mockId=${mockId}`, error)
        throw error
      }
    },

    async updateMessageMockId(mockId: string, txid: string) {
      try {
        let foundMessage: UnifiedChatMessage | null = null
        let foundChannelId: string | null = null
        // 1. 在所有缓存的频道中查找包含指定 mockId 的消息
        for (const [channelId, messages] of this.messageCache) {
          const message = messages.find(msg => msg.mockId === mockId)
          if (message) {
            foundMessage = message
            foundChannelId = channelId
            // 设置错误信息
            message.txId = txid
            

           const messages = this.messageCache.get(channelId)
        if (messages) {
          const index = messages.findIndex(m => m.mockId === message.mockId)
          if (index !== -1) {
            messages[index] = message
          }
        }
            break
          }
        }
        if (!foundMessage || !foundChannelId) {
          console.warn(`⚠️ 未找到 mockId 为 ${mockId} 的消息`)
          return
        }
       console.log(`✅ txId 设置完成: mockId=${mockId} txid=${txid}`)
      } catch (error) {
        console.error(`❌ txId 设置失败: mockId=${mockId}`, error)
        throw error
      }
    },

    /**
     * 重新发送失败的消息
     * @param message 需要重发的消息对象
     */
    async tryResend(message: UnifiedChatMessage): Promise<boolean> {
      console.log(`🔄 尝试重新发送消息: mockId=${message.mockId}`, message)
      
      if (!message.mockId) {
        console.error('❌ 消息没有 mockId，无法重发')
        return false
      }

      try {
        const userStore = useUserStore()
        
        // 清除错误状态
        message.error = undefined
        
        // 更新缓存中的消息状态
        for (const [channelId, messages] of this.messageCache) {
          const index = messages.findIndex(msg => msg.mockId === message.mockId)
          if (index !== -1) {
            messages[index] = { ...message }
            break
          }
        }

        // 判断消息类型
        const isPrivateChat = message.fromGlobalMetaId !== undefined && message.toGlobalMetaId !== undefined
        const isSubGroupChat = !isPrivateChat && !!message.channelId && message.channelId !== ''
        
        if (!isPrivateChat) {
          // 群聊消息重发
          const timestamp = message.timestamp || getTimestampInSeconds()
          const contentType = message.contentType || 'text/plain'
          const encryption = 'aes'
          const externalEncryption = '0' as const
          
          const dataCarrier = {
            groupID: isSubGroupChat ? message.groupId : (message.groupId || message.metanetId),
            channelID: isSubGroupChat ? message.channelId : undefined,
            timestamp,
            nickName: userStore.last?.name || '',
            content: message.content,
            contentType,
            encryption,
            replyPin: message.replyPin || '',
            mention: message.mention || [],
          }
          
          const node = {
            protocol: NodeName.SimpleGroupChat,
            body: dataCarrier,
            timestamp: Date.now(),
            externalEncryption,
          }
          
          console.log(`🚀 重发群聊消息:`, { groupID: dataCarrier.groupID, channelID: dataCarrier.channelID })
          await tryCreateNode(node, message.mockId)
        } else {
          // 私聊消息重发
          const timestamp = message.timestamp || getTimestampInSeconds()
          const contentType = message.contentType || 'text/plain'
          const encrypt = 'ecdh'
          const externalEncryption = '0' as const
          
          const dataCarrier = {
            to: message.toGlobalMetaId,  // 改为 toGlobalMetaId
            timestamp,
            content: message.content,
            contentType,
            encrypt,
            replyPin: message.replyPin || '',
          }

          const node = {
            protocol: NodeName.SimpleMsg,
            body: dataCarrier,
            timestamp,
            externalEncryption,
          }
          
          console.log(`🚀 重发私聊消息到: ${message.toGlobalMetaId}`)  // 改为 toGlobalMetaId
          await tryCreateNode(node, message.mockId)
        }

        console.log(`✅ 消息重发请求已发送: mockId=${message.mockId}`)
        return true
      } catch (error) {
        console.error(`❌ 消息重发失败: mockId=${message.mockId}`, error)
        // 重新设置错误状态
        this.setMessageError(message.mockId, (error as any).message || '重发失败')
        return false
      }
    },

    /**
     * 添加消息到频道（本地）
     */
    async addMessage(message: UnifiedChatMessage): Promise<void> {
      try {
        // 确定频道ID - 支持子群聊
        let channelId: string | undefined;
        
        const isPrivateChat = isPrivateChatMessage(message);
        if (isPrivateChat) {
          // 私聊：使用发送者或接收者的 globalMetaId
          channelId = message.toGlobalMetaId === this.selfMetaId ? message.fromGlobalMetaId : message.toGlobalMetaId;
        } else {
          // 群聊：优先使用 channelId（子群聊），其次使用 groupId（主群聊）
          channelId = message.channelId || message.groupId;
        }

        if (!channelId) {
          console.error('无法确定消息的频道ID', {
            isPrivateChat,
            channelId: message.channelId,
            groupId: message.groupId,
            fromGlobalMetaId: message.fromGlobalMetaId,
            toGlobalMetaId: message.toGlobalMetaId
          })
          return
        }

        // 保存消息到数据库
        if(!message.mockId){
          await this.db.saveMessage(message)
        }
       

        // 更新内存缓存
        if(channelId ===this.activeChannelId){

          if (this.messageCache.has(channelId)) {
             const messages = this.messageCache.get(channelId)!
            if(message.index>=1 && message.index > (messages[messages.length -1]?.index || 0) +1){
              // 如果新消息的 index 比当前最新消息的 index 大超过1，说明中间有缺失
              const currentLatestIndex = messages[messages.length-1]?.index || 0;
              if(message.index-currentLatestIndex ===1){
                messages.push(message) // 新消息在前
                // 限制缓存大小
                if (messages.length > 5000) {
                  messages.splice(5000)
                }
              }
              
            }else{
                messages.push(message) // 新消息在前
                // 限制缓存大小
              if (messages.length > 5000) {
                messages.splice(5000)
              }
            }
           
          } else {
            this.messageCache.set(channelId, [message])
          }
      }

      // 更新频道信息
      if(!message.mockId){
        await this.updateChannelLastMessage(channelId, message)
        
        // 检查是否提及了当前用户，创建@提及记录
        if (message.mention && Array.isArray(message.mention) && 
            message.mention.includes(this.selfMetaId) &&
            message.metaId !== this.selfMetaId) { // 排除自己发送的消息
          
          // 创建@提及记录
          const mentionRecord: MentionRecord = {
            id: `${channelId}_${message.index}`,
            channelId: channelId,
            messageId: message.txId,
            messageIndex: message.index,
            timestamp: message.timestamp,
            senderMetaId: message.metaId,
            senderName: message.userInfo?.name || message.nickName || 'Unknown',
            content: message.content.substring(0, 100), // 内容预览，最多100字符
            isRead: 0, // 0表示未读
            createdAt: Date.now()
          }

          console.log(`📌 创建@提及记录数据:`, mentionRecord)
          
          await this.db.saveMention(mentionRecord)
          console.log(`📌 创建@提及记录: ${mentionRecord.id}`)
          
          // 更新频道未读提及计数
          const channel = this.channels.find(c => c.id === channelId)
          if (channel) {
            const unreadCount = await this.db.countUnreadMentions(channelId)
            channel.unreadMentionCount = unreadCount
            channel.mentionCheckTimestamp = Date.now()
            await this.db.saveChannel(channel)
            console.log(`📌 频道 ${channel.name} 未读 @ 提及: ${unreadCount}`)
          }
        }
      }
      

        console.log(`✅ 消息已添加到频道 ${channelId} ${message.channelId ? '(子群聊)' : '(主群聊/私聊)'}`)
      } catch (error) {
        console.error('添加消息失败:', error)
        throw error
      }
    },

    /**
     * 更新频道的最后一条消息信息
     */
    async updateChannelLastMessage(channelId: string, message: UnifiedChatMessage): Promise<void> {

      
      const channel = this.channels.find(c => c.id === channelId)
      if (!channel) {
        console.warn(`频道 ${channelId} 不存在`)
        return
      }

      // 更新最后一条消息
      channel.lastMessage = {
        content: message.content,
        sender: message.metaId,
        senderName: message.userInfo?.name || message.nickName,
        timestamp: message.timestamp,
        type: message.chatType,
        chatPublicKey: message.userInfo?.chatPublicKey || '',
        index: message.index < 1 ? (channel.lastMessage?.index ?? 0) + 1 : message.index,
        protocol: message.protocol // 保存消息协议
      }

      // 未读数现在通过 lastMessage.index - lastReadIndex 自动计算
      // 不需要手动增加 unreadCount，只要有新消息且没有更新 lastReadIndex 就会显示为未读

      // saveChannel 方法内部会调用 createCloneableChannel 来安全序列化
      await this.db.saveChannel(channel)

      // 重新排序频道列表（最新消息的频道在前）
      this.channels.sort((a, b) => {
        const aTime = a.lastMessage?.timestamp || a.createdAt
        const bTime = b.lastMessage?.timestamp || b.createdAt
        return bTime - aTime
      })

      console.log(`✅ 频道 ${channelId} 最后消息已更新`)
    },

    /**
     * 接收消息（来自服务器或 WebSocket）
     */
    async receiveMessage(message: UnifiedChatMessage): Promise<void> {
      try {
        
        console.log('📩 接收到新消息:', message)
        // 确定频道ID - 支持子群聊
        let channelId: string | undefined;
        // 如果消息是自己发的 并且消息页面不在最下面 让消息滚到最下面；
        // if(message.metaId === this.selfMetaId && this.activeChannel){
        //   if((this.activeChannel!.lastReadIndex ?? 0) < (this.activeChannel!.lastMessage?.index || 0)){
        //     await this.loadNewestMessages(this.activeChannelId)
        //     await sleep(500)
        //   }
        // }

        
        const isPrivateChat = isPrivateChatMessage(message);
        if (isPrivateChat) {
          // 私聊：使用发送者或接收者的 globalMetaId
          channelId = message.toGlobalMetaId === this.selfMetaId ? message.fromGlobalMetaId : message.toGlobalMetaId;
        } else {
          // 群聊：检查是否是子群聊消息
          // 如果 channelId 不为空且不是空字符串，则是子群聊消息
          const hasSubChannel = message.channelId && message.channelId.trim() !== '';
          channelId = hasSubChannel ? message.channelId : message.groupId;
          
          console.log('📩 群聊消息分析:', {
            channelId: message.channelId,
            groupId: message.groupId,
            hasSubChannel,
            targetChannelId: channelId
          });
        }
        
        if (!channelId) {
          console.error('无法确定消息的频道ID', {
            isPrivateChat,
            channelId: message.channelId,
            groupId: message.groupId,
            fromGlobalMetaId: message.fromGlobalMetaId,
            toGlobalMetaId: message.toGlobalMetaId,
            message
          })
          return
        }

        // 检查是否是子群聊消息
        const isSubGroupMessage = !isPrivateChat && message.channelId && message.channelId.trim() !== '';
        console.log(`📩 消息目标频道: ${channelId} ${isSubGroupMessage ? '(子群聊)' : '(主群聊/私聊)'}`)

        // 如果是子群聊消息，确保子群聊频道存在
        if (isSubGroupMessage) {
          const existingChannel = this.channels.find(c => c.id === channelId);
          if (!existingChannel) {
            console.log(`🔄 子群聊频道 ${channelId} 不存在，尝试创建...`);
            await this.loadGroupChannels(message.groupId || '');
            return
          }
        }

        if(isPrivateChat){
          const existingPrivate = this.channels.find(c => c.type === 'private' && c.id === channelId);
          if(existingPrivate&&existingPrivate?.isTemporary){
            this.convertTemporaryToRegular(existingPrivate.id)
          }
          if(!existingPrivate){
            console.log(`🔄 私聊频道 ${channelId} 不存在，尝试创建...`);
            await sleep(3000)
            await this.syncFromServer()
            return
          }
        }

        // 检查消息是否已存在（避免重复）
        const existingMessages = this.messageCache.get(channelId) || []
        const exists = existingMessages.some(m => m.txId === message.txId)
        
        // 从后往前查找对应的mock消息
        // 需要同时比较 globalMetaId（因为本地消息使用 globalMetaId，服务器消息也有 globalMetaId）
        let mockMessage = null
        const serverGlobalMetaId = message.globalMetaId || message.userInfo?.globalMetaId
        
        for (let i = existingMessages.length - 1; i >= 0; i--) {
          const msg = existingMessages[i]
          // 匹配条件：有 mockId，内容相同，且发送者相同（比较 globalMetaId）
          const msgGlobalMetaId = msg.globalMetaId
          if (msg.mockId && msg.content === message.content && 
              msgGlobalMetaId === serverGlobalMetaId) {
            mockMessage = msg
            console.log('🔍 Mock消息匹配成功:', { 
              localMetaId: msg.metaId, 
              localGlobalMetaId: msg.globalMetaId,
              serverMetaId: message.metaId, 
              serverGlobalMetaId: serverGlobalMetaId 
            })
            break
          }
        }
        
        if (mockMessage) {
          console.log('找到对应的mock消息:', mockMessage)
          // 如果找到了对应的mock消息，更新其txId等信息
          mockMessage.txId = message.txId
          mockMessage.pinId = message.pinId
          mockMessage.timestamp = message.timestamp
          mockMessage.mockId = '' // 清空mockId，表示已发送成功
          // 更新 globalMetaId 和 metaId（用服务器返回的正确值）
          mockMessage.globalMetaId = message.globalMetaId
          mockMessage.metaId = message.metaId
          mockMessage.userInfo = isPrivateChat && message.fromGlobalMetaId === this.selfMetaId ? message.toUserInfo : message.userInfo
          // 更新数据库
          if(message.index >0 ){
            mockMessage.index = message.index
          }

          await this.updateMessage(mockMessage)
           await this.updateChannelLastMessage(channelId, mockMessage)
          console.log(`🔄 更新了已存在的草稿消息为正式消息: ${message.txId}`)
          return
       }  
      
        
        
        if (!exists) {
          if(message.index <1 && this.channels.find(c => c.id === channelId)?.lastMessage){
            const channel = this.channels.find(c => c.id === channelId)
            message.index = (channel?.lastMessage?.index || 0) + 1
          }
          await this.addMessage(message)
          console.log(`📨 收到新消息: ${message.content}`)
        }else{
          // tip: 如果消息已存在，可以选择更新内容（如状态变更等
        }
      } catch (error) {
        console.error('接收消息失败:', error)
      }
    },

    /**
     * 更新消息状态（如发送成功后更新服务器数据）
     */
    async updateMessage(message: UnifiedChatMessage): Promise<void> {
      try {
        // 确定频道ID - 支持子群聊
        let channelId: string | undefined;
        
        const isPrivateChat = isPrivateChatMessage(message);
        if (isPrivateChat) {
          // 私聊：使用发送者或接收者的 globalMetaId
          channelId = message.toGlobalMetaId === this.selfMetaId ? message.fromGlobalMetaId : message.toGlobalMetaId;
        } else {
          // 群聊：优先使用 channelId（子群聊），其次使用 groupId（主群聊）
          channelId = message.channelId || message.groupId;
        }
        
        if (!channelId) {
          console.error('无法确定消息的频道ID', {
            isPrivateChat,
            channelId: message.channelId,
            groupId: message.groupId,
            fromGlobalMetaId: message.fromGlobalMetaId,
            toGlobalMetaId: message.toGlobalMetaId,
            message
          })
          return
        }

        // 更新数据库
        if(!message.mockId){
          await this.db.saveMessage(message)
        }
        

        // 更新内存缓存
        const messages = this.messageCache.get(channelId)
        if (messages) {
          const index = messages.findIndex(m => m.txId === message.txId)
          if (index !== -1) {
            messages[index] = message
          }
        }

        console.log(`✅ 消息 ${message.txId} 已更新到频道 ${channelId} ${message.channelId ? '(子群聊)' : '(主群聊/私聊)'}`)
      } catch (error) {
        console.error('更新消息失败:', error)
        throw error
      }
    },

    /**
     * 删除消息
     */
    async deleteMessage(messageId: string, channelId: string): Promise<void> {
      try {
        // 从数据库删除
        await this.db.deleteMessage(messageId)

        // 从内存缓存删除
        const messages = this.messageCache.get(channelId)
        if (messages) {
          const index = messages.findIndex(m => m.txId === messageId)
          if (index !== -1) {
            messages.splice(index, 1)
          }
        }

        console.log(`✅ 消息 ${messageId} 已删除`)
      } catch (error) {
        console.error('删除消息失败:', error)
        throw error
      }
    },

    /**
     * 手动刷新数据
     */
    async refresh(): Promise<void> {
      await this.syncFromServer()
    },

     // 全局消息菜单状态管理
    setActiveMessageMenu(messageId: string) {
      this.activeMessageMenuId = messageId
    },

    clearActiveMessageMenu() {
      this.activeMessageMenuId = ''
    },

    /**
     * 获取群聊的子频道列表（用于广播聊天界面）
     */
    async getSubChannelsForBroadcast(groupId: string): Promise<SimpleChannel[]> {
      try {
        console.log(`🔍 获取群聊 ${groupId} 的子频道列表`)
        
        // 确保子频道数据已加载
        await this.loadGroupChannels(groupId)
        
        // 获取子频道列表
        const subChannels = this.getSubChannelsByParent(groupId)
        
        // 按最后消息时间排序
        const sortedSubChannels = subChannels.sort((a, b) => {
          const timeA = a.lastMessage?.timestamp || a.createdAt
          const timeB = b.lastMessage?.timestamp || b.createdAt
          return timeB - timeA
        })
        
        console.log(`✅ 获取到 ${sortedSubChannels.length} 个子频道`)
        return sortedSubChannels
      } catch (error) {
        console.error('❌ 获取子频道列表失败:', error)
        return []
      }
    },

    /**
     * 进入子群聊（从广播聊天区域点击进入）
     */
    async enterSubGroupChat(channelId: string): Promise<boolean> {
      try {
        console.log(`🚪 进入子群聊: ${channelId}`)
        
        // 检查子群聊是否存在
        const subChannel = this.channels.find(c => c.id === channelId)
        if (!subChannel) {
          console.warn(`⚠️ 子群聊 ${channelId} 不存在`)
          return false
        }
        
        // 设置为当前激活频道
        await this.setActiveChannel(channelId)
        
        console.log(`✅ 成功进入子群聊: ${subChannel.name}`)
        return true
      } catch (error) {
        console.error('❌ 进入子群聊失败:', error)
        return false
      }
    },

    /**
     * 从子群聊返回主群聊
     */
    async backToMainGroup(subChannelId: string): Promise<boolean> {
      try {
        const subChannel = this.channels.find(c => c.id === subChannelId)
        if (!subChannel?.parentGroupId) {
          console.warn(`⚠️ 无法找到子群聊 ${subChannelId} 的父群聊`)
          return false
        }
        
        console.log(`🔙 从子群聊 ${subChannel.name} 返回主群聊`)
        
        // 切换到主群聊
        await this.setActiveChannel(subChannel.parentGroupId)
        
        console.log(`✅ 成功返回主群聊`)
        return true
      } catch (error) {
        console.error('❌ 返回主群聊失败:', error)
        return false
      }
    },

    /**
     * 刷新群聊的子频道数据（现在子群聊作为独立频道处理）
     */
    async refreshSubChannels(groupId: string): Promise<void> {
      try {
        console.log(`🔄 刷新群聊 ${groupId} 的子频道数据`)
        
        // 子群聊现在作为独立频道，直接重新加载频道列表即可
        await this.loadGroupChannels(groupId)
        
        console.log(`✅ 子频道数据刷新完成`)
      } catch (error) {
        console.error('❌ 刷新子频道数据失败:', error)
      }
    },

    /**
     * 重置系统（用于用户登出或切换用户）
     */
    async reset(): Promise<void> {
      console.log('🔄 重置聊天系统...')
      
      // 清理内存状态
      this.channels = []
      this.activeChannelId = ''
      this.messageCache.clear()
      this.userCache.clear()
      this.receivedRedPacketIds = []
      this.isInitialized = false
      this.lastSyncTime = 0
      this.activeMessageMenuId = ''
      
      // 如果有当前用户，清理其本地数据
      if (this.currentUserMetaId) {
        try {
          // await this.db.clearUserData()
          console.log(`✅ 用户 ${this.currentUserMetaId} 的本地数据已清理`)
        } catch (error) {
          console.error('清理用户数据失败:', error)
        }
      }
      
      // 重置用户标识
      this.currentUserMetaId = ''
      
      console.log('✅ 聊天系统重置完成')
    },
    async receiveUserRoleMessage(message: GroupUserRoleInfo) {
      
      console.log('📩 接收到用户角色消息:', message)
       // 2. 加载本地缓存数据（快速显示）
     
    
      if(message && message.groupId && message.metaId){
        await this.getGroupMemberPermissions(message.groupId, true)
      }
    },

   async initMuteNotify(){
      const blockedChats:BlockedChats[] =await getMyBlockChatList()
      
      if(!blockedChats.length){
        return
      }else{
        this.muteNotifyList=[]
      }

      for(let item of blockedChats){
        this.muteNotifyList.push({
          groupId: item.chatId,
          groupType: item.chatType,
          status:true
        })

      }
      localStorage.setItem('muteNotifyList',JSON.stringify(this.muteNotifyList))
    },

    updateMuteNotify(payload:MuteNotifyItem){
       
      const hasRecord=this.muteNotifyList.length && this.muteNotifyList.find((item:MuteNotifyItem)=>item.groupId == payload.groupId)

      if(hasRecord){
          this.muteNotifyList=this.muteNotifyList.map((c:MuteNotifyItem) => {
        if(c.groupId === payload.groupId){
          c.status=payload.status
        }
        return c
      })
      }else{
        this.muteNotifyList.push(payload)
      }
  
      localStorage.setItem('muteNotifyList',JSON.stringify(this.muteNotifyList))
    },

      async updateShowSubChannelHeader(payload:ShowSubChannleHeaderItem){
      console.log('🔵 updateShowSubChannelHeader 被调用, payload:', payload)
      console.log('🔵 当前 showSubChannelHeader:', JSON.stringify(this.showSubChannelHeader))
       
      const hasRecord=this.showSubChannelHeader.length && this.showSubChannelHeader.find((item:ShowSubChannleHeaderItem)=>item.groupId == payload.groupId)

      if(hasRecord){
          this.showSubChannelHeader=this.showSubChannelHeader.map((c:ShowSubChannleHeaderItem) => {
        if(c.groupId === payload.groupId){
          c.status=payload.status
        }
        return c
      })
      }else{
        this.showSubChannelHeader.push(payload)
      }
      
      console.log('🔵 更新后 showSubChannelHeader:', JSON.stringify(this.showSubChannelHeader))
  
      localStorage.setItem('showSubChannelHeaderList',JSON.stringify(this.showSubChannelHeader))
      
      // 同时保存到 IndexedDB
      try {
        await this.db.saveSubChannelHeaderStatus(payload.groupId, payload.status)
      } catch (error) {
        console.error('❌ 保存子频道头部状态到 IndexedDB 失败:', error)
      }
    },

    /**
     * 从 IndexedDB 加载子频道头部显示状态
     */
    async loadSubChannelHeaderStatusFromDB() {
      try {
        const statuses = await this.db.getAllSubChannelHeaderStatus()
        if (statuses.length > 0) {
          console.log('📦 从 IndexedDB 加载子频道头部状态:', statuses.length, '条')
          // 合并到内存中的状态
          statuses.forEach(({ groupId, status }) => {
            const existing = this.showSubChannelHeader.find((item: ShowSubChannleHeaderItem) => item.groupId === groupId)
            if (existing) {
              existing.status = status
            } else {
              this.showSubChannelHeader.push({ groupId, status })
            }
          })
        }
      } catch (error) {
        console.error('❌ 从 IndexedDB 加载子频道头部状态失败:', error)
      }
    },

    clearMuteNotifyList(){
      this.muteNotifyList=[]
       localStorage.removeItem('muteNotifyList')
    },

      clearShowSubChannelHeader(){
      this.showSubChannelHeader=[]
       localStorage.removeItem('showSubChannelHeaderList')
    },

    /**
     * 清理临时频道
     * 移除指定的临时频道或所有非活跃的临时频道
     */
    cleanupTemporaryChannels(channelId?: string): void {
      if (channelId) {
        // 移除指定的临时频道
        const index = this.channels.findIndex(c => c.id === channelId && c.isTemporary)
        if (index > -1) {
          this.channels.splice(index, 1)
          console.log(`🗑️ 已移除临时频道: ${channelId}`)
          
          // 如果移除的是当前活跃频道，清除活跃状态
          if (this.activeChannelId === channelId) {
            this.activeChannelId = ''
          }
        }
      } else {
        // 移除所有非活跃的临时频道（保留当前活跃的临时频道）
        const initialLength = this.channels.length
        this.channels = this.channels.filter(c => 
          !c.isTemporary || c.id === this.activeChannelId
        )
        const removedCount = initialLength - this.channels.length
        if (removedCount > 0) {
          console.log(`🗑️ 已清理 ${removedCount} 个非活跃临时频道`)
        }
      }
    },

    /**
     * 将临时频道转换为常规频道
     * 当用户主动加入频道时，可以将临时频道转为常规频道
     */
    convertTemporaryToRegular(channelId: string): boolean {
      const channel = this.channels.find(c => c.id === channelId)
      if (channel && channel.isTemporary !== false) {
        channel.isTemporary = false
        // 保存到数据库
        this.db.saveChannel(channel).catch(err => {
          console.warn('⚠️ 保存频道到数据库失败:', err)
        })
        console.log(`✅ 频道 ${channelId} 已标记为已加入 (isTemporary: false)`)
        return true
      }
      return false
    },

    // ==================== @提及相关方法 ====================
    
    /**
     * 同步所有频道的未读@提及数量
     */
    async syncUnreadMentionCounts(): Promise<void> {
      console.log('🔄 开始同步所有频道的未读@提及数量...')
      
      try {
        for (const channel of this.channels) {
          const unreadCount = await this.db.countUnreadMentions(channel.id)
          channel.unreadMentionCount = unreadCount
          
          if (unreadCount > 0) {
            console.log(`📌 频道 ${channel.name} 有 ${unreadCount} 条未读 @ 提及`)
          }
        }
        
        console.log('✅ 未读@提及数量同步完成')
      } catch (error) {
        console.error('❌ 同步未读@提及数量失败:', error)
      }
    },
    
    /**
     * 获取频道的未读@提及列表
     */
    async getChannelUnreadMentions(channelId: string): Promise<MentionRecord[]> {
      try {
        const mentions = await this.db.getUnreadMentions(channelId)
        return mentions as MentionRecord[]
      } catch (error) {
        console.error('获取未读@提及失败:', error)
        return []
      }
    },

    /**
     * 获取频道的所有@提及列表（包含已读）
     */
    async getChannelAllMentions(channelId: string): Promise<MentionRecord[]> {
      try {
        const mentions = await this.db.getAllMentions(channelId)
        return mentions as MentionRecord[]
      } catch (error) {
        console.error('获取@提及失败:', error)
        return []
      }
    },

    /**
     * 跳转到指定的@提及消息
     * @param mention @提及记录
     * @returns 是否成功找到消息
     */
    async jumpToMention(mention: MentionRecord): Promise<boolean> {
      try {
        // 1. 切换到对应的频道（如果不是当前频道）
        if (this.activeChannelId !== mention.channelId) {
          this.setActiveChannel(mention.channelId)
        }

        // 2. 确保消息已加载到缓存
        let messages = this.messageCache.get(mention.channelId) || []
        
        // 如果缓存中没有该消息，尝试加载
        const hasMessage = messages.some(m => m.index === mention.messageIndex)
        if (!hasMessage) {
          console.log(`📥 消息 index=${mention.messageIndex} 不在缓存中，正在加载...`)
          // 从数据库加载消息
          const dbMessages = await this.db.getMessages(mention.channelId)
          if (dbMessages.length > 0) {
            this.messageCache.set(mention.channelId, dbMessages)
            messages = dbMessages
          }
        }

        // 3. 查找消息
        const targetMessage = messages.find(m => m.index === mention.messageIndex)
        if (!targetMessage) {
          console.warn(`⚠️ 未找到 index=${mention.messageIndex} 的消息`)
          return false
        }

        // 4. 标记该提及为已读
        await this.db.markMentionAsRead(mention.id)
        
        // 5. 更新频道未读提及计数
        const channel = this.channels.find(c => c.id === mention.channelId)
        if (channel) {
          const unreadCount = await this.db.countUnreadMentions(mention.channelId)
          channel.unreadMentionCount = unreadCount
          await this.db.saveChannel(channel)
        }

        // 6. 触发滚动到消息的事件（通过 DOM ID 或其他方式）
        // 这部分需要在组件中配合实现
        console.log(`✅ 跳转到消息 index=${mention.messageIndex}`)
        
        return true
      } catch (error) {
        console.error('跳转到@提及失败:', error)
        return false
      }
    },

    /**
     * 标记单个@提及为已读
     */
    async markMentionRead(index: number, channelId?: string): Promise<void> {
      try {
        if(!channelId) channelId = this.activeChannelId
        const mentionId = `${channelId}_${index}`
        
        console.log(`📌 尝试标记@提及为已读: mentionId=${mentionId}, channelId=${channelId}, index=${index}`)
        
        await this.db.markMentionAsRead(mentionId)
        
        // 更新频道未读提及计数
        const channel = this.channels.find(c => c.id === channelId)
        if (channel) {
          const unreadCount = await this.db.countUnreadMentions(channelId)
          const oldCount = channel.unreadMentionCount || 0
          channel.unreadMentionCount = unreadCount
          await this.db.saveChannel(channel)
          console.log(`📌 频道 ${channel.name} 未读@提及: ${oldCount} -> ${unreadCount}`)
        }
        
        console.log(`✅ @提及 ${mentionId} 已标记为已读`)
      } catch (error) {
        console.error('标记@提及已读失败:', error, { index, channelId })
      }
    }
  },
  
})


