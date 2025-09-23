import { defineStore } from 'pinia'
import type { SimpleChannel, UnifiedChatMessage, SimpleUser, ChatType, UnifiedChatApiResponse, UnifiedChatResponseData,GroupChannel,GroupUserRoleInfo,MemberListRes,MemberItem } from '@/@types/simple-chat.d'
import { GetUserEcdhPubkeyForPrivateChat, getChannels,getUserGroupRole,getGroupChannelList,getChannelMembers } from '@/api/talk'

import { isPrivateChatMessage, MessageType } from '@/@types/simple-chat.d'
import { useUserStore } from './user'
import { useEcdhsStore } from './ecdh'

import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { decrypt } from '@/utils/crypto'
import { useChainStore } from './chain'
import { tryCreateNode } from '@/utils/talk'
import { getTimestampInSeconds } from '@/utils/util'
import { NodeName ,MemberRule,RuleOp} from '@/enum'

const getPermission = (rule:MemberRule) =>{
  switch(rule){
    case MemberRule.Owner:
      return [RuleOp.CanSpeak,RuleOp.SetAdmin,RuleOp.RemoveAdmin,RuleOp.SetSpeaker,RuleOp.RemoveSpeaker,RuleOp.DeleteMember,RuleOp.Normal]
    case MemberRule.Admin:
      return [RuleOp.CanSpeak,RuleOp.SetSpeaker,RuleOp.RemoveSpeaker,RuleOp.DeleteMember,RuleOp.Normal]
    case MemberRule.Speaker:
      return [RuleOp.CanSpeak,RuleOp.Normal]
    case MemberRule.Normal:
      return [RuleOp.Normal]
    default:
      return [RuleOp.Normal]
  }
}

const MuteRoleList=[MemberRule.Normal,MemberRule.Block,MemberRule.Leave]




// IndexedDB 管理类
class SimpleChatDB {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'SimpleChatDB'
  private readonly DB_VERSION = 3 // 增加版本号以确保索引更新
  private userPrefix = 'default_' // 用户数据前缀

  constructor(userMetaId?: string) {
    this.userPrefix = userMetaId ? `user_${userMetaId}_` : 'default_'
  }

  async init(userMetaId?: string): Promise<void> {
    if (userMetaId) {
      this.userPrefix = `user_${userMetaId}_`
    }
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION)
      
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
      }

      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onerror = () => reject(request.error)
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
    
    const transaction = this.db.transaction(['channels', 'messages', 'users', 'redPacketIds'], 'readwrite')
    
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
        lastReadIndex: channel.lastReadIndex, // 保留已读索引
        targetMetaId: channel.targetMetaId,
        publicKeyStr: channel.publicKeyStr,
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
          index: Number(channel.lastMessage.index || 0) // 保留消息索引
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
        lastReadIndex: channel.lastReadIndex || 0 // 保留已读索引
      }
    }
  }

  async getChannels(): Promise<SimpleChannel[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['channels'], 'readonly')
      const store = transaction.objectStore('channels')
      const index = store.index('userPrefix')
      const request = index.getAll(this.userPrefix)
      
      request.onsuccess = () => {
        const channels = (request.result || []).map(({ userPrefix, ...channel }) => channel)
        resolve(channels)
      }
      request.onerror = () => resolve([])
    })
  }

  async saveMessage(message: UnifiedChatMessage): Promise<void> {
    if (!this.db) return
    
    // 创建可以安全存储到 IndexedDB 的消息副本
    const safeMessageData = this.createCloneableMessage(message)
    const isPrivateChat = isPrivateChatMessage(safeMessageData)
    // 确定频道ID
    const channelId = isPrivateChat ? (this.userPrefix.indexOf(safeMessageData.from) !== -1 ? safeMessageData.to : safeMessageData.from) : message.channelId ||  message.groupId 
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
        index: Number(message.index || 0),

        // 本地状态字段
        mockId: message.mockId ? String(message.mockId) : undefined,
        error: message.error ? String(message.error) : undefined,

        // 私聊特有字段
        from: message.from ? String(message.from) : undefined,
        fromUserInfo: safeFromUserInfo,
        to: message.to ? String(message.to) : undefined,
        toUserInfo: safeToUserInfo,

        // 群聊特有字段
        groupId: message.groupId ? String(message.groupId) : undefined,
        channelId: message.channelId ? String(message.channelId) : undefined,
        metanetId: message.metanetId ? String(message.metanetId) : undefined
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
        error: message.error ? String(message.error) : undefined
      }
    }
  }

  async getMessages(channelId: string, limit = 50): Promise<UnifiedChatMessage[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allMessages = request.result || []
        console.log(`📊 IndexedDB中总消息数: ${allMessages.length}`)
        console.log(`🔍 查找频道 ${channelId} 的消息，当前用户前缀: ${this.userPrefix}`)
        
        const userMessages = allMessages.filter(msg => {
          const matchUser = msg.userPrefix === this.userPrefix
          const matchChannel = msg.channelId === channelId
          
          return matchUser && matchChannel
        })
        
        console.log(`📝 找到 ${userMessages.length} 条匹配的消息`,userMessages)
        
        const messages = userMessages
          .map(({ userPrefix, id, ...message }) => message) // 同时移除userPrefix和id字段
          .sort((a, b) => b.index - a.index) // 按时间升序：旧消息在前，新消息在后
          .slice(0, limit).sort((a, b) => a.index - b.index)
        
        console.log(`📋 消息排序: 按时间升序排列，共 ${messages.length} 条消息`)
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

  async clearAllData(): Promise<void> {
    if (!this.db) return
    
    const stores = ['channels', 'messages', 'users', 'redPacketIds']
    
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
}

export const useSimpleTalkStore = defineStore('simple-talk', {
  state: () => ({
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
    
    // 当前用户的 MetaId（用于用户切换检测）
    currentUserMetaId: '',
    
    // 系统状态
    isInitialized: false,
    isLoading: false,
    lastSyncTime: 0,
    
    // 红包相关状态
    receivedRedPacketIds: [] as string[], // 已领取红包列表
    
    // 全局消息菜单状态管理
    activeMessageMenuId: '', // 当前显示菜单的消息ID
  }),

  getters: {

     selfAddress(): string {
      const userStore = useUserStore()
      return userStore.last?.address || ''
    },
    // 当前用户的 MetaId
    selfMetaId(): string {
      const userStore = useUserStore();
      console.log('🚀 获取当前用户 MetaId', userStore.last?.metaid)
      return userStore.last?.metaid || ''
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

    // 获取未读消息总数
    totalUnreadCount(): number {
      return this.channels.reduce((sum, channel) => sum + channel.unreadCount, 0)
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
     * 初始化聊天系统
     */
    async init(): Promise<void> {
      const userStore = useUserStore()
      const currentUserMetaId = userStore.last?.metaid
      
      if (!currentUserMetaId) {
        console.warn('⚠️ 用户未登录，无法初始化聊天系统')
        return
      }

      // 检查是否需要重新初始化（用户切换）
      const needReinit = !this.isInitialized || this.currentUserMetaId !== currentUserMetaId
      
      if (!needReinit) {
        console.log('✅ 聊天系统已为当前用户初始化')
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
        
        // 2. 加载本地缓存数据（快速显示）
        await this.loadFromLocal()
        
        // 3. 异步同步服务端数据
        console.log('🚀 开始后台同步服务端数据...')
        await this.syncFromServer().catch(error => {
          console.warn('⚠️ 后台同步失败:', error)
        })

        // 4. 恢复上次的激活频道（异步）
        await this.restoreLastActiveChannel()

        this.isInitialized = true
        console.log(`✅ 用户 ${currentUserMetaId} 的聊天系统初始化成功`)
      } catch (error) {
        console.error('❌ 聊天系统初始化失败:', error)
        throw error
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
      } catch (error) {
        console.error('从本地加载数据失败:', error)
      }
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
      if (!this.selfMetaId) {
        console.warn('⚠️ 未找到用户信息，跳过同步')
        return
      }

      this.isLoading = true
      
      try {
        console.log('🔄 开始同步服务端数据...')
        
        // 使用统一的 latest-chat-info-list 接口获取所有聊天数据
        const allChannelsData = await this.fetchLatestChatInfo().catch(e => {
          console.warn('获取聊天列表失败:', e)
          return []
        })

        // 转换数据格式
        const serverChannels = this.transformLatestChatInfo(allChannelsData)

        // 合并到本地
        await this.mergeChannels(serverChannels)
        
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
        selfMetaId: this.selfMetaId,
        apiEndpoint: '/user/latest-chat-info-list'
      })
      const result = await getChannels({ 
        metaId: this.selfMetaId,
        cursor: '0',
        size: '100'
      })
      return result
    },

    /**
     * 获取群聊的子频道列表
     */
    async fetchGroupChannels(groupId: string): Promise<GroupChannel[]> {
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
        delete channelToSave.serverData // 移除可能包含不可序列化数据的字段
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
    async createSubGroupChannel(parentGroupId: string, channelData: GroupChannel): Promise<SimpleChannel | null> {
      try {
        // 从内容中解析频道信息，如果内容是加密的则需要解密
        let channelName = `` // 默认名称
        let channelNote = ''
        
        // 尝试解密内容获取真实的频道信息
        if (channelData.content && channelData.encryption === 'aes') {
          try {
            const decryptedContent = decrypt(channelData.content, parentGroupId.substring(0, 16))
            console.log('解密后的子群聊内容:', decryptedContent)
            
            // 尝试解析为 JSON（新的格式）
            try {
              const contentData = JSON.parse(decryptedContent)
              if (contentData.channelName) {
                channelName = contentData.channelName
              }
              if (contentData.channelNote) {
                channelNote = contentData.channelNote
              }
            } catch (jsonError) {
              // 如果不是 JSON 格式，可能是纯文本频道名称
              if (decryptedContent && decryptedContent.trim()) {
                channelName = decryptedContent.trim()
              }
            }
          } catch (e) {
            console.warn('解密子群聊内容失败，使用默认名称', e)
          }
        } else if (channelData.content && channelData.encryption === '0') {
          // 未加密的内容，直接解析
          try {
            const contentData = JSON.parse(channelData.content)
            if (contentData.channelName) {
              channelName = contentData.channelName
            }
            if (contentData.channelNote) {
              channelNote = contentData.channelNote
            }
          } catch (jsonError) {
            // 如果不是 JSON，当作纯文本处理
            if (channelData.content && channelData.content.trim()) {
              channelName = channelData.content.trim()
            }
          }
        }
        
        console.log(`📝 为群聊 ${parentGroupId} 创建子群聊频道: ${channelName}`)
        
        // 创建子群聊作为独立频道，和群聊、私聊同一层级
        const subChannel: SimpleChannel = {
          id: channelData.channelId, // 使用 channelId 作为独立频道的 ID
          type: 'sub-group', // 使用新的子群聊类型
          name: channelName, // 使用解析出的频道名称
          avatar: '', // 暂时置空，如用户要求
          members: [], // 成员信息暂时置空
          createdBy: channelData.metaId, // 使用新结构的 metaId
          createdAt: channelData.timestamp * 1000, // 转换为毫秒
          unreadCount: 0,
          lastReadIndex: 0, // 初始化已读索引为 0，与群聊、私聊保持一致
          roomNote: channelNote, // 使用解析出的频道描述
          // 子群聊特有字段
          parentGroupId: parentGroupId, // 指向父群聊ID
          serverData: channelData,
          
          lastMessage:  {
              content: channelData.content,
              sender: channelData.metaId,
              type: channelData.chatType,
              senderName: channelData.userInfo?.name || channelData.nickName || '',
              timestamp: channelData.timestamp * 1000 || 0,
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
          delete channelToSave.serverData
          await this.db.saveChannel(channelToSave)
        } else {
          // 添加新的子频道
          this.channels.push(subChannel)
          // 安全保存，移除可能有问题的字段
          const subChannelToSave = { ...subChannel }
          delete subChannelToSave.serverData
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
          // 私聊数据转换
          const userInfo = channel.userInfo
          return {
            id: channel.metaId,
            type: 'private' as ChatType,
            name: userInfo?.name || '未知用户',
            avatar: userInfo?.avatarImage,
            members: [this.selfMetaId, channel.metaId],
            createdBy: this.selfMetaId,
            createdAt: channel.timestamp || Date.now(),
            unreadCount: 0, // 未读数由本地管理
            targetMetaId: channel.metaId,
            publicKeyStr: userInfo?.chatPublicKey,
            lastMessage:  {
              content: channel.content,
              type: channel.chatType,
              sender: channel.createMetaId || channel.metaId,
              senderName: userInfo?.name || '',
              timestamp: channel.timestamp || 0,
              chatPublicKey: userInfo?.chatPublicKey,
              index: channel.index || 0
            },
            serverData: channel
          }
        } else {
          // 群聊数据转换  
          return {
            id: channel.groupId,
            type: 'group' as ChatType,
            name: channel.roomName || '未命名群聊',
            avatar: channel.roomIcon ? `https://man.metaid.io${channel.roomIcon.replace('metafile://', '/content/')}` : undefined,
            members: [], // 群成员需要单独获取
            createdBy: channel.createUserMetaId || '',
            createdAt: channel.timestamp || Date.now(),
            unreadCount: 0, // 未读数由本地管理
            // 群聊特有字段
            roomNote: channel.roomNote||'', // 群聊公告
            userCount: channel.userCount, // 群聊用户数量
            lastMessage:  {
              content: channel.content,
              sender: channel.createMetaId,
              type: channel.chatType,
              senderName: channel.userInfo?.name || channel.createUserInfo?.name || '',
              timestamp: channel.timestamp || 0,
              index: channel.index || 0
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
            // 保留本地的权限信息和缓存时间
            memberPermissions: existing.memberPermissions,
            permissionsLastUpdated: existing.permissionsLastUpdated,
            // 使用更新的消息
            lastMessage: this.getNewerMessage(existing.lastMessage, serverChannel.lastMessage)
          }

          mergedChannels.push(merged)
          existingMap.delete(serverChannel.id)
          // 安全保存，移除可能有问题的字段
          const mergedToSave = { ...merged }
          delete mergedToSave.serverData
          await this.db.saveChannel(mergedToSave)
        } else {
          // 新频道
          mergedChannels.push(serverChannel)
          // 安全保存，移除可能有问题的字段
          const serverToSave = { ...serverChannel }
          delete serverToSave.serverData
          await this.db.saveChannel(serverToSave)
        }
      }

      // 保留本地独有频道（包括子群聊频道）
      existingMap.forEach(localChannel => {
        // 保留本地的子群聊频道
        if (localChannel.parentGroupId) {
          console.log(`📂 保留本地子群聊频道: ${localChannel.name} (${localChannel.id})`)
          mergedChannels.push(localChannel)
        }
      })

      this.channels = mergedChannels

      // 异步加载群聊的子频道列表
      this.loadSubChannelsForGroups(mergedChannels)
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

      this.activeChannelId = channelId

      // 总是重新加载消息以确保数据最新
      console.log(`🔄 设置激活频道并加载消息: ${channelId}`)
      await this.loadMessages(channelId)
      console.log(`✅ 激活频道设置完成，当前消息数: ${this.activeChannelMessages.length}`)

      // 如果是群聊，获取权限信息
      const channel = this.channels.find(c => c.id === channelId)
      if (channel && channel.type === 'group') {
        // 在后台获取权限信息，不阻塞界面
        this.getGroupMemberPermissions(channelId).catch(error => {
          console.warn(`⚠️ 获取群聊 ${channelId} 权限信息失败:`, error)
        })
      }

      // 标记为已读
      this.markAsRead(channelId)

      // 保存到本地存储
      localStorage.setItem(`lastActiveChannel-${this.selfMetaId}`, channelId)
    },

    /**
     * 加载频道消息
     */
    async loadMessages(channelId: string): Promise<void> {
      try {
        console.log(`📝 开始加载频道 ${channelId} 的消息...`)
        
        // 1. 先从本地 IndexedDB 加载
        const localMessages = await this.db.getMessages(channelId)
        
        console.log(`📂 从本地加载了 ${localMessages.length} 条消息`,localMessages)
        
        // 2. 查找频道信息
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${channelId}`)
          this.messageCache.set(channelId, localMessages)
          return
        }

        // 3. 如果有本地消息，直接展示，不从服务器拉取
        if (localMessages.length > 20) {
          console.log(`🚀 检测到本地消息 ${localMessages.length} 条，直接展示，跳过服务器请求`)
          this.messageCache.set(channelId, localMessages)
          return
        }

        // 4. 只有在没有本地消息时，才从服务器获取
        console.log(`📡 本地无消息，从服务器获取...`)
        await this.loadServerMessagesSync(channelId, channel, localMessages)
        
      } catch (error) {
        console.error('❌ 加载消息失败:', error)
        // 出错时至少设置本地消息或空数组
        const fallbackMessages = await this.db.getMessages(channelId).catch(() => [])
        this.messageCache.set(channelId, fallbackMessages)
      }
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
        
        // 1. 清空当前消息缓存
        this.messageCache.delete(targetChannelId)
        console.log(`🗑️ 已清空频道 ${targetChannelId} 的消息缓存`)

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
     * 获取服务器消息
     */
    async fetchServerMessages(channelId: string, channel: SimpleChannel): Promise<UnifiedChatMessage[]> {
      let serverMessages: any[] = []
      
      try {
        if (channel.type === 'group') {
          // 群聊消息
          console.log(`🌐 获取群聊 ${channelId} 的服务端消息...`)
          const { getChannelMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getChannelMessages({
            groupId: channelId,
            metaId: this.selfMetaId,
            cursor: '0',
            size: '50' // 增加获取数量以减少请求次数
          })
          serverMessages = result.list || []
          console.log(`📡 群聊API返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'sub-group') {
          // 子群聊消息 - 使用 channelId 而不是 parentGroupId
          console.log(`🌐 获取子群聊 ${channelId} 的服务端消息...`)
          const { getSubChannelMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getSubChannelMessages({
            channelId: channelId, // 子群聊使用自己的channelId作为groupId
            metaId: this.selfMetaId,
            cursor: '0',
            size: '20'
          })
          serverMessages = result.list || []
          console.log(`📡 子群聊API返回 ${serverMessages.length} 条消息`)
        } else if (channel.type === 'private') {
          // 私聊消息
          console.log(`🌐 获取私聊 ${channelId} 的服务端消息...`)
          const { getPrivateChatMessages } = await import('@/api/talk')
          const result: UnifiedChatResponseData = await getPrivateChatMessages({
            metaId: this.selfMetaId,
            otherMetaId: channelId,
            cursor: '0',
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

    async loadNewsterMessages(): Promise<void> {
      //

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
      if (channel && channel.unreadCount > 0) {
        channel.unreadCount = 0
        // saveChannel 方法内部会调用 createCloneableChannel 来安全序列化
        this.db.saveChannel(channel)
      }
    },

    /**
     * 设置频道的最后已读消息索引
     * 只能设置比当前值更大的索引，不能设置更小的值，防止已读状态倒退
     */
    async setLastReadIndex(channelId: string, messageIndex: number): Promise<void> {
      try {
        const channel = this.channels.find(c => c.id === channelId)
        if (!channel) {
          console.warn(`⚠️ 未找到频道 ${channelId}，无法设置已读索引`)
          return
        }

        const currentIndex = channel.lastReadIndex || 0
        
        // 只允许设置比当前值更大的索引
        if (messageIndex <= currentIndex) {
          // console.warn(`⚠️ 已读索引 ${messageIndex} 不能小于或等于当前值 ${currentIndex}，跳过设置`)
          return
        }

        // 更新内存中的 lastReadIndex
        channel.lastReadIndex = messageIndex

        // 使用安全的序列化方法保存到数据库
        await this.db.saveChannel(channel)  // saveChannel 方法内部会调用 createCloneableChannel

        console.log(`✅ 频道 ${channelId} 已读索引已从 ${currentIndex} 更新为: ${messageIndex}`)
      } catch (error) {
        console.error('❌ 设置已读索引失败:', error)
        throw error
      }
    },

    /**
     * 获取频道的最后已读消息索引
     */
    getLastReadIndex(channelId: string): number {
      const channel = this.channels.find(c => c.id === channelId)
      return channel?.lastReadIndex || 0
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
    async createPrivateChat(targetMetaId: string): Promise<SimpleChannel | null> {
      // 检查是否已存在
      const existing = this.channels.find(
        c => c.type === 'private' && c.targetMetaId === targetMetaId
      )
      if (existing) return existing

      try {
        // 获取用户信息
        const userInfo = await GetUserEcdhPubkeyForPrivateChat(targetMetaId)
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
          id: targetMetaId,
          type: 'private',
          name: userInfo.name,
          avatar: userInfo.avatarImage,
          members: [this.selfMetaId, targetMetaId],
          createdBy: this.selfMetaId,
          createdAt: Date.now(),
          unreadCount: 0,
          lastReadIndex: 0, // 显式初始化已读索引为 0
          targetMetaId,
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
            updates.avatar = `https://man.metaid.io${updates.avatar.replace('metafile://', '/content/')}`
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
    async sendMessage(channelId: string, content: string, messageType: MessageType = MessageType.msg, reply: any): Promise<UnifiedChatMessage | null> {
      try {
        const chainStore = useChainStore()
        const userStore = useUserStore()
        const channel = this.channels.find(c => c.id === channelId)
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
          channelName: channel?.name
        })
        
        // 创建消息对象
        const message: UnifiedChatMessage = {
          mockId,
          // 通用字段
          txId: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pinId: `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          metaId: this.selfMetaId,
          address: userStore.last?.address || '',
          userInfo: {
            metaid: this.selfMetaId,
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

          // 私聊特有字段
          from: isPrivateChat ? this.selfMetaId : undefined,
          fromUserInfo: isPrivateChat ? {
            metaid: this.selfMetaId,
            address: userStore.last?.address || '',
            name: userStore.last?.name || 'Unknown',
            avatar: userStore.last?.avatar,
            avatarImage: userStore.last?.avatar,
            chatPublicKey: ''
          } : undefined,
          to: isPrivateChat ? channelId : undefined,
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
            isSubGroupChat
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

    /**
     * 添加消息到频道（本地）
     */
    async addMessage(message: UnifiedChatMessage): Promise<void> {
      try {
        // 确定频道ID - 支持子群聊
        let channelId: string | undefined;
        
        const isPrivateChat = isPrivateChatMessage(message);
        if (isPrivateChat) {
          // 私聊：使用发送者或接收者的 metaId
          channelId = message.to === this.selfMetaId ? message.from : message.to;
        } else {
          // 群聊：优先使用 channelId（子群聊），其次使用 groupId（主群聊）
          channelId = message.channelId || message.groupId;
        }

        if (!channelId) {
          console.error('无法确定消息的频道ID', {
            isPrivateChat,
            channelId: message.channelId,
            groupId: message.groupId,
            from: message.from,
            to: message.to
          })
          return
        }

        // 保存消息到数据库
        await this.db.saveMessage(message)

        // 更新内存缓存
        if(channelId ===this.activeChannelId){
          if (this.messageCache.has(channelId)) {
            if(message.index && message.index > (this.messageCache.get(channelId)![0]?.index || 0) +1){
              // 如果新消息的 index 比当前最新消息的 index 大超过1，说明中间有缺失，触发从服务器拉取最新消息
              console.log(`⚠️ 检测到消息缺失，触发从服务器拉取最新消息: 频道 ${channelId}, 新消息 index ${message.index}, 当前最新消息 index ${this.messageCache.get(channelId)![0]?.index || 0}`)

            }else{
              const messages = this.messageCache.get(channelId)!
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
      await this.updateChannelLastMessage(channelId, message)

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
        index: message.index || (channel.lastMessage?.index ?? 0) + 1
      }

      // 如果不是当前激活频道，增加未读数
      if (this.activeChannelId !== channelId) {
        channel.unreadCount = (channel.unreadCount || 0) + 1
      }

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
        
        const isPrivateChat = isPrivateChatMessage(message);
        if (isPrivateChat) {
          // 私聊：使用发送者或接收者的 metaId
          channelId = message.to === this.selfMetaId ? message.from : message.to;
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
            from: message.from,
            to: message.to,
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
            // 创建子群聊频道的基本信息，使用新的 GroupChannel 结构
            const subChannelData: GroupChannel = {
              groupId: message.groupId!,
              channelId: message.channelId!,
              metanetId: message.channelId!, // 与channelId相同
              txId: message.txId,
              pinId: message.txId + 'i0', // 构造pinId
              metaId: message.metaId,
              address: message.address,
              userInfo: message.userInfo,
              nickName: message.userInfo?.name || '',
              protocol: message.protocol || '/protocols/simplegroupchat',
              content: `{"channelName":"子频道 ${message.channelId!.substring(0, 8)}...","channelNote":""}`, // 将频道信息作为内容
              contentType: 'application/json',
              encryption: 'aes',
              version: '',
              chatType: message.chatType || 0,
              data: null,
              replyPin: '',
              replyInfo: null,
              replyMetaId: '',
              timestamp: Math.floor(message.timestamp / 1000), // 转换为秒
              params: '',
              chain: message.chain,
              blockHeight: message.blockHeight,
              index: message.index
            };
            await this.createSubGroupChannel(message.groupId!, subChannelData);
          }
        }

        // 检查消息是否已存在（避免重复）
        const existingMessages = this.messageCache.get(channelId) || []
        const exists = existingMessages.some(m => m.txId === message.txId)

        const mockMsg = existingMessages.find(m => m.mockId && m.content === message.content && m.metaId === message.metaId && Math.abs(m.timestamp - message.timestamp) < 5 * 60 * 1000)
        if(mockMsg){
          console.log('找到对应的mock消息:',mockMsg)
          await this.db.deleteMessage(mockMsg.txId)
          // 如果找到了对应的mock消息，更新其txId等信息
          mockMsg.txId = message.txId
          mockMsg.pinId = message.pinId
          mockMsg.timestamp = message.timestamp
          mockMsg.mockId = '' // 清空mockId，表示已发送成功
          // 更新数据库
          if(message.index === 0 && this.channels.find(c => c.id === channelId)?.lastMessage){
            const channel = this.channels.find(c => c.id === channelId)
            mockMsg.index = (channel?.lastMessage?.index || 0) + 1
          }

          await this.updateMessage(mockMsg)
          console.log(`🔄 更新了已存在的草稿消息: ${mockMsg.mockId} 为正式消息: ${message.txId}`)
          return
        }
        
        
        if (!exists) {
          if(message.index === 0 && this.channels.find(c => c.id === channelId)?.lastMessage){
            const channel = this.channels.find(c => c.id === channelId)
            message.index = (channel?.lastMessage?.index || 0) + 1
          }
          await this.addMessage(message)
          console.log(`📨 收到新消息: ${message.content}`)
        }else{
          // tip: 如果消息已存在，可以选择更新内容（如状态变更等）

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
          // 私聊：使用发送者或接收者的 metaId
          channelId = message.to === this.selfMetaId ? message.from : message.to;
        } else {
          // 群聊：优先使用 channelId（子群聊），其次使用 groupId（主群聊）
          channelId = message.channelId || message.groupId;
        }
        
        if (!channelId) {
          console.error('无法确定消息的频道ID', {
            isPrivateChat,
            channelId: message.channelId,
            groupId: message.groupId,
            from: message.from,
            to: message.to,
            message
          })
          return
        }

        // 更新数据库
        await this.db.saveMessage(message)

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
          await this.db.clearUserData()
          console.log(`✅ 用户 ${this.currentUserMetaId} 的本地数据已清理`)
        } catch (error) {
          console.error('清理用户数据失败:', error)
        }
      }
      
      // 重置用户标识
      this.currentUserMetaId = ''
      
      console.log('✅ 聊天系统重置完成')
    },

    /**
     * 获取频道统计
     */
    getStats() {
      return {
        totalChannels: this.channels.length,
        groupChannels: this.groupChannels.length,
        privateChannels: this.privateChannels.length,
        totalUnreadCount: this.totalUnreadCount,
        isInitialized: this.isInitialized,
        isLoading: this.isLoading,
        lastSyncTime: this.lastSyncTime
      }
    },
    async receiveUserRoleMessage(message: GroupUserRoleInfo) {
      console.log('📩 接收到用户角色消息:', message)
      if(message && message.groupId && message.metaId){
        await this.getGroupMemberPermissions(message.groupId, true)
      }
    }
  }
})
