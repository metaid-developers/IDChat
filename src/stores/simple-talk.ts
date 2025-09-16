import { defineStore } from 'pinia'
import type { SimpleChannel, SimpleMessage, SimpleUser, ChatType } from '@/@types/simple-chat.d'
import { MessageType } from '@/@types/simple-chat.d'
import { useUserStore } from './user'
import { useEcdhsStore } from './ecdh'
import { GetUserEcdhPubkeyForPrivateChat, getChannels } from '@/api/talk'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'

// IndexedDB 管理类
class SimpleChatDB {
  private db: IDBDatabase | null = null
  private readonly DB_NAME = 'SimpleChatDB'
  private readonly DB_VERSION = 1
  private userPrefix = '' // 用户数据前缀

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
        
        // 创建频道表
        if (!this.db.objectStoreNames.contains('channels')) {
          const channelStore = this.db.createObjectStore('channels', { keyPath: 'id' })
          channelStore.createIndex('userPrefix', 'userPrefix')
          channelStore.createIndex('type', 'type')
          channelStore.createIndex('lastActivity', 'lastMessage.timestamp')
        }

        // 创建消息表
        if (!this.db.objectStoreNames.contains('messages')) {
          const messageStore = this.db.createObjectStore('messages', { keyPath: 'id' })
          messageStore.createIndex('userPrefix', 'userPrefix')
          messageStore.createIndex('channelId', 'channelId')
          messageStore.createIndex('timestamp', 'timestamp')
        }

        // 创建用户表
        if (!this.db.objectStoreNames.contains('users')) {
          const userStore = this.db.createObjectStore('users', { keyPath: 'id' })
          userStore.createIndex('userPrefix', 'userPrefix')
          userStore.createIndex('metaId', 'metaId')
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

  // 清除当前用户的所有数据
  async clearUserData(): Promise<void> {
    if (!this.db) return
    
    const transaction = this.db.transaction(['channels', 'messages', 'users'], 'readwrite')
    
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
        targetMetaId: channel.targetMetaId,
        publicKeyStr: channel.publicKeyStr
      }

      // 安全处理 lastMessage
      if (channel.lastMessage) {
        cloneable.lastMessage = {
          content: String(channel.lastMessage.content || ''),
          sender: String(channel.lastMessage.sender || ''),
          senderName: String(channel.lastMessage.senderName || ''),
          timestamp: Number(channel.lastMessage.timestamp || 0),
          type: channel.lastMessage.type,
          chatPublicKey: channel.lastMessage.chatPublicKey ? String(channel.lastMessage.chatPublicKey) : undefined
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
        unreadCount: channel.unreadCount || 0
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

  async saveMessage(message: SimpleMessage): Promise<void> {
    if (!this.db) return
    
    // 创建可以安全存储到 IndexedDB 的消息副本
    const safeMessageData = this.createCloneableMessage(message)
    
    // 添加用户前缀
    const messageWithPrefix = {
      ...safeMessageData,
      userPrefix: this.userPrefix
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
  private createCloneableMessage(message: SimpleMessage): SimpleMessage {
    try {
      const cloneable: SimpleMessage = {
        id: String(message.id),
        channelId: String(message.channelId),
        sender: String(message.sender),
        senderName: String(message.senderName),
        senderAvatar: message.senderAvatar ? String(message.senderAvatar) : undefined,
        senderChatPublicKey: message.senderChatPublicKey ? String(message.senderChatPublicKey) : undefined,
        content: String(message.content),
        timestamp: Number(message.timestamp),
        type: message.type,
        replyTo: message.replyTo ? String(message.replyTo) : undefined,
        isMock: Boolean(message.isMock)
      }

      return cloneable
    } catch (error) {
      console.error('创建可克隆消息数据失败:', error)
      // 返回最小安全数据
      return {
        id: String(message.id || `fallback_${Date.now()}`),
        channelId: String(message.channelId),
        sender: String(message.sender),
        senderName: String(message.senderName || 'Unknown'),
        content: String(message.content || ''),
        timestamp: Number(message.timestamp || Date.now()),
        type: message.type
      }
    }
  }

  async getMessages(channelId: string, limit = 50): Promise<SimpleMessage[]> {
    if (!this.db) return []
    
    return new Promise((resolve) => {
      const transaction = this.db!.transaction(['messages'], 'readonly')
      const store = transaction.objectStore('messages')
      const request = store.getAll()
      
      request.onsuccess = () => {
        const allMessages = request.result || []
        const userMessages = allMessages.filter(msg => 
          msg.userPrefix === this.userPrefix && msg.channelId === channelId
        )
        
        const messages = userMessages
          .map(({ userPrefix, ...message }) => message)
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
        
        resolve(messages)
      }
      request.onerror = () => resolve([])
    })
  }

  async clearAllData(): Promise<void> {
    if (!this.db) return
    
    const stores = ['channels', 'messages', 'users']
    
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
}

export const useSimpleTalkStore = defineStore('simple-talk', {
  state: () => ({
    // 所有聊天频道（群聊+私聊）
    channels: [] as SimpleChannel[],
    
    // 当前激活的聊天
    activeChannelId: '',
    
    // 消息缓存（内存中保存最近的消息）
    messageCache: new Map<string, SimpleMessage[]>(),
    
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
  }),

  getters: {
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
    activeChannelMessages(): SimpleMessage[] {
      return this.messageCache.get(this.activeChannelId) || []
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

        // 4. 恢复上次的激活频道
        this.restoreLastActiveChannel()

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
    restoreLastActiveChannel(): void {
        console.log(`🔄 恢复上次激活频道`)
      if (!this.selfMetaId) return
      
      const lastChannelId = localStorage.getItem(`lastActiveChannel-${this.selfMetaId}`)
      console.log('🚀 上次激活频道ID', lastChannelId,this.channels)
      if (lastChannelId && this.channels.find(c => c.id === lastChannelId)) {
        this.activeChannelId = lastChannelId
        console.log(`🔄 恢复上次激活频道: ${lastChannelId}`)
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
      } catch (error) {
        console.error('从本地加载数据失败:', error)
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
      return getChannels({ 
        metaId: this.selfMetaId,
        cursor: '0',
        size: '100'
      })
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
              chatPublicKey: userInfo?.chatPublicKey
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
            lastMessage:  {
              content: channel.content,
              sender: channel.createMetaId,
              type: channel.chatType,
              senderName: channel.userInfo?.name || channel.createUserInfo?.name || '',
              timestamp: channel.timestamp || 0
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
            // 使用更新的消息
            lastMessage: this.getNewerMessage(existing.lastMessage, serverChannel.lastMessage)
          }
          mergedChannels.push(merged)
          existingMap.delete(serverChannel.id)
        } else {
          // 新频道
          mergedChannels.push(serverChannel)
        }

        // 保存到本地数据库
        await this.db.saveChannel(serverChannel)
      }

      // 保留本地独有频道
      existingMap.forEach(localChannel => {
        mergedChannels.push(localChannel)
      })

      this.channels = mergedChannels
    },

    /**
     * 获取较新的消息
     */
    getNewerMessage(local?: any, server?: any) {
      if (!local) return server
      if (!server) return local
      return (server.timestamp || 0) > (local.timestamp || 0) ? server : local
    },

    /**
     * 设置当前激活频道
     */
    async setActiveChannel(channelId: string): Promise<void> {
      if (this.activeChannelId === channelId) return

      this.activeChannelId = channelId

      // 加载消息到缓存
      if (!this.messageCache.has(channelId)) {
        await this.loadMessages(channelId)
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
        const messages = await this.db.getMessages(channelId)
        this.messageCache.set(channelId, messages)
      } catch (error) {
        console.error('加载消息失败:', error)
      }
    },

    /**
     * 标记频道为已读
     */
    markAsRead(channelId: string): void {
      const channel = this.channels.find(c => c.id === channelId)
      if (channel && channel.unreadCount > 0) {
        channel.unreadCount = 0
        this.db.saveChannel(channel)
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
          unreadCount: 0
        }

        this.channels.unshift(newGroup)
        await this.db.saveChannel(newGroup)

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
     * 发送消息并更新频道数据
     */
    async sendMessage(channelId: string, content: string, messageType: MessageType = MessageType.msg): Promise<SimpleMessage | null> {
      try {
        const userStore = useUserStore()
        
        // 创建消息对象
        const message: SimpleMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          channelId,
          sender: this.selfMetaId,
          senderName: userStore.last?.name || 'Unknown',
          senderAvatar: userStore.last?.avatar,
          content,
          type: messageType,
          timestamp: Date.now()
        }

        // 保存消息到本地
        await this.addMessage(message)

        // 这里应该调用实际的发送 API
        // const result = await sendMessageAPI(message)
        // if (result.success) {
        //   message.serverData = result.serverData
        //   await this.updateMessage(message)
        // }

        console.log(`✅ 发送消息到频道 ${channelId}: ${content}`)
        return message
      } catch (error) {
        console.error('发送消息失败:', error)
        return null
      }
    },

    /**
     * 添加消息到频道（本地）
     */
    async addMessage(message: SimpleMessage): Promise<void> {
      try {
        // 保存消息到数据库
        await this.db.saveMessage(message)

        // 更新内存缓存
        if (this.messageCache.has(message.channelId)) {
          const messages = this.messageCache.get(message.channelId)!
          messages.unshift(message) // 新消息在前
          // 限制缓存大小
          if (messages.length > 100) {
            messages.splice(100)
          }
        } else {
          this.messageCache.set(message.channelId, [message])
        }

        // 更新频道信息
        await this.updateChannelLastMessage(message.channelId, message)

        console.log(`✅ 消息已添加到频道 ${message.channelId}`)
      } catch (error) {
        console.error('添加消息失败:', error)
        throw error
      }
    },

    /**
     * 更新频道的最后一条消息信息
     */
    async updateChannelLastMessage(channelId: string, message: SimpleMessage): Promise<void> {
      const channel = this.channels.find(c => c.id === channelId)
      if (!channel) {
        console.warn(`频道 ${channelId} 不存在`)
        return
      }

      // 更新最后一条消息
      channel.lastMessage = {
        content: message.content,
        sender: message.sender,
        senderName: message.senderName,
        timestamp: message.timestamp,
        type: message.type,
        chatPublicKey: message.senderChatPublicKey || ''
      }

      // 如果不是当前激活频道，增加未读数
      if (this.activeChannelId !== channelId) {
        channel.unreadCount = (channel.unreadCount || 0) + 1
      }

      // 保存到数据库
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
    async receiveMessage(message: SimpleMessage): Promise<void> {
      try {
        // 检查消息是否已存在（避免重复）
        const existingMessages = this.messageCache.get(message.channelId) || []
        const exists = existingMessages.some(m => m.id === message.id)
        
        if (!exists) {
          await this.addMessage(message)
          console.log(`📨 收到新消息: ${message.content}`)
        }
      } catch (error) {
        console.error('接收消息失败:', error)
      }
    },

    /**
     * 更新消息状态（如发送成功后更新服务器数据）
     */
    async updateMessage(message: SimpleMessage): Promise<void> {
      try {
        // 更新数据库
        await this.db.saveMessage(message)

        // 更新内存缓存
        const messages = this.messageCache.get(message.channelId)
        if (messages) {
          const index = messages.findIndex(m => m.id === message.id)
          if (index !== -1) {
            messages[index] = message
          }
        }

        console.log(`✅ 消息 ${message.id} 已更新`)
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
        // 从数据库删除（这里需要实现 db.deleteMessage）
        // await this.db.deleteMessage(messageId)

        // 从内存缓存删除
        const messages = this.messageCache.get(channelId)
        if (messages) {
          const index = messages.findIndex(m => m.id === messageId)
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
      this.isInitialized = false
      this.lastSyncTime = 0
      
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
    }
  }
})
