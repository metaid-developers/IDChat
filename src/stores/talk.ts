import {
  getAtMeChannels,
  getChannelMessages,
  getChannels,
  getCommunities,
  getCommunityMembers,
  getCommunityMembership,
  getOneCommunity,
} from '@/api/talk'
import { ChannelPublicityType, ChannelType, GroupChannelType } from '@/enum'
import { defineStore } from 'pinia'
import { router } from '@/router'
import { useLayoutStore } from './layout'
import { Channel, Community, Message, TalkError } from '@/@types/talk'
import { sleep } from '@/utils/util'
import { useUserStore } from './user'
import { GetUserInfo } from '@/api/aggregation'
import { useWsStore } from './ws'
import { getMetaNameAddress,isPublicChannel } from '@/utils/meta-name'

export const useTalkStore = defineStore('talk', {
  state: () => {
    return {
      communities: [{ id: '@me' }] as Community[],
      members: [] as any,

      activeCommunityId: '' as string,
      activeChannelId: '' as string,

      generalChannels: [
        {
          id: 'announcements',
          nameKey: 'Talk.Community.announcements',
        },
        {
          id: 'topics',
          nameKey: 'Talk.Community.topics',
        },
        {
          id: 'DAO',
          nameKey: 'Talk.Community.DAO',
        },
      ] as {
        id: string
        nameKey: string
      }[],

      error: {} as TalkError,

      channelsReadPointers: null as any, // 頻道已读指针
      saveReadPointerTimer: null as NodeJS.Timeout | null,

      communityChannelIds: null as any, // 社区頻道列表
      receivedRedPacketIds: null as any, // 已领取红包列表

      hasActiveChannelConsent: false, // 是否持有当前頻道的共识

      communityStatus: 'loading', // loading, inviting, invited, ready

      inviteLink: '', // 邀请链接
      invitingChannel: null as any, // 邀请的頻道
      invitedCommunity: null as any, // 受邀请的社区
      shareToBuzzTxId: '', // 分享到Buzz的TxId

      consensualNft: null as any,
      consensualFt: null as any,
      consensualNative: null as any,
    }
  },

  getters: {
    selfMetaId(): string {
      const userStore = useUserStore()
      return 'f21f4fc0328e2398e0978d6171d970620c6827976bd77345188ae7a1ae85b5dd' //userStore.last?.metaid || ''
    },

    selfAddress(): string {
      const userStore = useUserStore()
      return userStore.last?.address || ''
    },

    realCommunities(state) {
      
      if (!state.communities) return []
      return state.communities.filter(community => community.id !== '@me')
    },

    atMeCommunity(state) {
      
      if (!state.communities) return []
      return state.communities.find(community => community.id === '@me')
    },

    activeCommunity(state) {
      if (!state.communities) return null
      
      return state.communities.find(community => community.id === state.activeCommunityId)
    },

    // 当前社区的标志：优先使用metaName，如果没有就使用id
    activeCommunitySymbol(): string {
      if (!this.activeCommunity) return ''

      let communitySymbol: string
      if (this.activeCommunity.metaName) {
        communitySymbol='public'
        // const metaName = this.activeCommunity.metaName
        // // 如果不带后缀，就加上
        // if (!metaName.includes('.')) {
        //   communitySymbol = metaName + '.metaid'
        // } else {
        //   communitySymbol = metaName
        // }
      } else {
        communitySymbol = this.activeCommunityId
      }

      return communitySymbol
    },

    activeCommunitySymbolInfo(): {
      name: string
      suffix: 'metaid' | 'eth' | 'bit'
    } {
      if (!this.activeCommunitySymbol) return { name: '', suffix: 'metaid' }

      return {
        name: this.activeCommunitySymbol.split('.')[0],
        suffix: this.activeCommunitySymbol.split('.')[1] as 'metaid' | 'eth' | 'bit',
      }
    },

    activeChannel(state): any {
      
      if (!this.activeCommunity) return null

      // 功能頻道
      if (this.isActiveChannelGeneral) {
        return this.generalChannels.find(channel => channel.id === state.activeChannelId)
      }
      if (this.canAccessActiveChannel)
        return this.activeCommunity.channels?.find((channel: any) => {
          return channel.id === state.activeChannelId
        })
    },

    channelType(channel) {
      return (channel: any) => {
        if (channel.roomType === ChannelPublicityType.Public) return GroupChannelType.PublicText

        if (channel.roomJoinType === '1') return GroupChannelType.Password
        if (channel.roomJoinType === '2' || channel.roomJoinType === '2000') {
          return GroupChannelType.NFT
        }
        if (channel.roomJoinType === '2001') return GroupChannelType.ETH_NFT
        if (channel.roomJoinType === '2002') return GroupChannelType.POLYGON_NFT
        if (channel.roomJoinType === '2003') return GroupChannelType.BSV_NFT
        if (channel.roomJoinType === '3') return GroupChannelType.BSV_FT
        if (channel.roomJoinType === '3003') return GroupChannelType.BSV_FT
        if (channel.roomJoinType === '3000') return GroupChannelType.FT

        if (channel.roomJoinType === '4000') return GroupChannelType.Native

        return null
      }
    },

    canAccessActiveChannel(): boolean {
      if (!this.activeChannel) return true

      // 判定：是公开頻道，或者持有共识，或者是管理员
      return this.isActiveChannelPublic || this.hasActiveChannelConsent || this.isAdmin()
    },

    activeGroupChannelType(): GroupChannelType | null {
      if (!this.activeChannel) return null

      return this.channelType(this.activeChannel)
    },

    activeCommunityChannels(): Channel[] {
      
      if (!this.activeCommunity) return []
      return this.activeCommunity.channels || []
    },

    activeCommunityPublicChannels(): any[] {
      return this.activeCommunityChannels.filter(
        (channel: any) => channel.roomType === ChannelPublicityType.Public
      )
    },

    activeCommunityConsensualChannels(): any[] {
      return this.activeCommunityChannels.filter(
        (channel: any) => channel.roomType === ChannelPublicityType.Private
      )
    },

    isAdmin(): () => boolean {
      const selfMetaId = this.selfMetaId

      return () => {
        if (!this.activeCommunity) return false
        if (!this.activeCommunity.admins) return false

        return this.activeCommunity.admins.includes(selfMetaId)
      }
    },

    hasUnreadMessagesOfChannel(): (channelId: string) => boolean {
      return (channelId: string) => {
        
        if (channelId === this.activeChannelId) return false
        
        // 如果頻道已读指针不存在，则说明没有未读消息
        if (!this.channelsReadPointers || !this.channelsReadPointers[channelId]) return false

        // 如果頻道已读指针存在，则判断lastRead和latest
        const pointer = this.channelsReadPointers[channelId]
        return pointer.lastRead < pointer.latest
      }
    },

    hasUnreadMessagesOfCommunity(): (communityId: string) => boolean {
      return (communityId: string) => {
        // 从本地存储中获取社区頻道列表和已读指针
        if (!this.communityChannelIds) return false

        const channels = this.communityChannelIds[communityId] || []

        if (channels.length === 0) return false

        return channels.some((channelId: string) => {
          return this.hasUnreadMessagesOfChannel(channelId)
        })
      }
    },

    isActiveChannelPublic(): boolean {
      if (!this.activeChannel) return true

      return this.activeChannel.roomType === ChannelPublicityType.Public
    },

    isActiveChannelTheVoid(): boolean {
      return this.activeChannelId === 'welcome'
    },

    isActiveChannelSettings(): boolean {
      return this.activeChannelId === 'settings'
    },

    isActiveChannelReserved(): boolean {
      return this.isActiveChannelTheVoid || this.isActiveChannelSettings
    },

    isActiveChannelGeneral(): boolean {
      return this.generalChannels.some((channel: any) => channel.id === this.activeChannelId)
    },

    newMessages(): any {
      if (!this.activeChannel) return []

      return this.activeChannel.newMessages
    },

    activeChannelType: state =>
      state.activeCommunityId === '@me' ? ChannelType.Session : ChannelType.Group,

    activeChannelSymbol: state => (state.activeCommunityId === '@me' ? '@' : '#'),

    communityLastReadChannelId(): (communityId: string) => string {
      
      const selfMetaId = this.selfMetaId
      return (communityId: string) => {
        const latestChannelsRecords =
          localStorage.getItem('latestChannels-' + selfMetaId) || JSON.stringify({})
        const latestChannels = JSON.parse(latestChannelsRecords)

        return latestChannels[communityId] || 'index'
      }
    },
  },

  actions: {
    async fetchCommunities() {
      if (!this.selfMetaId) return

      const communities = await getCommunities({ metaId: this.selfMetaId })
      this.communities = [...communities, this.atMeCommunity]
      console.log("this.communities",this.communities)
      
    },

    async fetchChannels(communityId?: string, isGuest?: boolean) {
      
      if (!communityId) communityId = this.activeCommunityId
      const isAtMe = communityId === '@me'
      
      const atMeChannel=await getAtMeChannels({
            metaId: this.selfMetaId,
          })
      //const atMeChannel=[]
     
      const publicChannel=await getChannels({
            communityId:"c3085ccabe5f4320ccb638d40b16f11fea267fb051f360a994305108b16854cd",
          })

      const channels=[...atMeChannel.slice(0,1),...publicChannel,...atMeChannel.slice(1)]
      //[...publicChannel,...atMeChannel]

      // const channels = isAtMe
      //   ? await getAtMeChannels({
      //       metaId: this.selfMetaId,
      //     })
      //   : await getChannels({
      //       communityId,
      //     })

      if (!this.activeCommunity?.channels) this.activeCommunity!.channels = []
      this.activeCommunity!.channels = channels
      console.log('activeChannel',channels)

      if (!isGuest) {
        
        // 写入存储
        this.initCommunityChannelIds()
        // 只保存頻道id
        const channelIds = channels.map((channel: any) => channel.id)
        this.communityChannelIds[communityId] = channelIds
        localStorage.setItem(
          'communityChannels-' + this.selfMetaId,
          JSON.stringify(this.communityChannelIds)
        )
      }
    },

    async refetchChannels() {
      const channels = await getChannels({ communityId: this.activeCommunityId })
      channels.forEach((channel: any) => {
        // 如果是新頻道，则添加到頻道列表
        if (!this.activeCommunityChannels.find((c: any) => c.id === channel.id)) {
          this.activeCommunityChannels.push(channel)
        }
      })
    },

    async checkCommunityMetaName(communityId: string) {
      // 检查metaname字段是否为空，以及metaname所属地址是否是自己
      
      if(isPublicChannel(communityId) || communityId == 'c3085ccabe5f4320ccb638d40b16f11fea267fb051f360a994305108b16854cd'){
        return true
      }

      const community = await getOneCommunity(communityId)
      if (!community) return false

      if (!community.metaNameNft) return false

      // 判断metaname地址
      const { metaNameNft } = community

      // 不判断ens协议
      if (metaNameNft.startsWith('ens://')) return true

      const { address } = await getMetaNameAddress(metaNameNft)
      if (!address) return false

      return address === community.ownerInfo.address
    },

    async checkMembership(routeCommunityId: string) {
      const selfMetaId = this.selfMetaId

      const isMember = await getCommunityMembership(routeCommunityId, selfMetaId)

      return isMember
    },

    async addTempCommunity(communityId: string) {
      const tempCommunity = await getOneCommunity(communityId)
      this.communities.push(tempCommunity)
      this.activeCommunityId = communityId

      getCommunityMembers(communityId)
        .then((members: any) => {
          this.members = members
        })
        .catch(() => {
          ElMessage.error('获取社区成员失败')
        })

      const isGuest = true
      await this.fetchChannels(communityId, isGuest)
    },

    async invite(routeCommunityId: string) {
      const layout = useLayoutStore()
      this.invitedCommunity = await getOneCommunity(routeCommunityId)
      layout.isShowAcceptInviteModal = true
      this.communityStatus = 'inviting'

      getCommunityMembers(routeCommunityId)
        .then((members: any) => {
          this.members = members
        })
        .catch(() => {
          ElMessage.error('获取社区成员失败')
        })

      const isGuest = true
      await this.fetchChannels(routeCommunityId, isGuest)

      return
    },

    async initCommunity(routeCommunityId: string) {
      
      this.communityStatus = 'loading'
      const isAtMe = routeCommunityId === '@me'
      this.activeCommunityId = routeCommunityId
      if (!isAtMe) {
        
        getCommunityMembers(routeCommunityId)
          .then((members: any) => {
            this.members = members
          })
          .catch(() => {
            ElMessage.error('获取社区成员失败')
          })
      }
      
      await this.fetchChannels(routeCommunityId)
      this.updateReadPointers()
      this.communityStatus = 'ready'

      return
    },

    async initChannel(routeCommunityId: string, routeChannelId: string) {
      // 如果是私聊，而且路由中的頻道 ID 不存在，则新建会话
      if (
        routeCommunityId === '@me' &&
        routeChannelId &&
        !this.activeCommunityChannels.some((channel: any) => channel.id === routeChannelId)
      ) {
        const { data } = await GetUserInfo(routeChannelId)
        const newSession = {
          id: routeChannelId,
          name: data.name,
          publicKeyStr: data.pubKey,
          lastMessage: '',
          lastMessageTimestamp: null,
          pastMessages: [],
          newMessages: [],
        }
        this.activeCommunityChannels.unshift(newSession)
      }

      // 如果没有指定頻道，则先从存储中尝试读取该社区的最后阅读頻道
      const latestChannelsRecords =
        localStorage.getItem('latestChannels-' + this.selfMetaId) || JSON.stringify({})
      const latestChannels = JSON.parse(latestChannelsRecords)

      if (!routeChannelId || routeChannelId === 'index') {
        let channelId
        if (routeCommunityId === '@me') {
          channelId = this.activeCommunityChannels[0].id
        } else {
          channelId = latestChannels[routeCommunityId] || 'welcome'
        }

        this.activeChannelId = channelId
        return

        // router.push(`/talk/channels/${routeCommunityId}/${channelId}`)
        // return 'redirect'
      }

      // 将最后阅读頻道存储到本地
      latestChannels[routeCommunityId] = routeChannelId
      localStorage.setItem('latestChannels-' + this.selfMetaId, JSON.stringify(latestChannels))

      this.activeChannelId = routeChannelId
      return 'ready'
    },

    _updateReadPointers(messageTimestamp: number, messageMetaId: string) {
      if (!this.channelsReadPointers[messageMetaId]) {
        this.channelsReadPointers[messageMetaId] = {
          lastRead: 0,
          latest: 0,
        }
      }

      if (messageTimestamp > this.channelsReadPointers[messageMetaId].latest) {
        this.channelsReadPointers[messageMetaId].latest = messageTimestamp
      }
    },
    _updateCurrentChannelReadPointers(messageTimestamp: number) {
      if (this.channelsReadPointers[this.activeChannelId]) {
        this.channelsReadPointers[this.activeChannelId].latest = messageTimestamp
        this.channelsReadPointers[this.activeChannelId].lastRead = messageTimestamp
      } else {
        this.channelsReadPointers[this.activeChannelId] = {
          lastRead: messageTimestamp,
          latest: messageTimestamp,
        }
      }
    },

    async handleNewGroupMessage(message: any) {
      const messageMetaId = message.groupId
      const isFromActiveChannel = messageMetaId === this.activeChannelId

      // 如果不是当前頻道的消息，则更新未读指针
      if (!isFromActiveChannel) {
        this._updateReadPointers(message.timestamp, messageMetaId)
        return
      }

      // 当前頻道，插入新消息
      // 先去重
      const isDuplicate =
        this.activeChannel.newMessages?.some((item: Message) => item.txId === message.txId) ||
        this.activeChannel.pastMessages?.some((item: Message) => item.txId === message.txId)

      if (isDuplicate) return

      // 更新当前頻道的已读指针
      this._updateCurrentChannelReadPointers(message.timestamp)

      // 优先查找替代mock数据
      let mockMessage: any
      if (message.protocol === 'simpleGroupChat') {
        mockMessage = this.activeChannel.newMessages.find(
          (item: Message) =>
            item.txId === '' &&
            item.isMock === true &&
            item.content === message.content &&
            item.metaId === message.metaId &&
            item.protocol === message.protocol
        )
      } else if (message.protocol === 'SimpleFileGroupChat') {
        mockMessage = this.activeChannel.newMessages.find(
          (item: Message) =>
            item.txId === '' &&
            item.isMock === true &&
            item.metaId === message.metaId &&
            item.protocol === message.protocol
        )
      }

      if (mockMessage) {
        console.log('替换中')
        if (message.protocol === 'SimpleFileGroupChat') {
          await sleep(2000) // 等待图片上传完成
          this.$patch(state => {
            mockMessage.txId = message.txId
            mockMessage.timestamp = message.timestamp
            // mockMessage.content = message.content // 图片不替换内容，以防止图片闪烁
            delete mockMessage.isMock
          })
        } else {
          this.$patch(state => {
            mockMessage.txId = message.txId
            mockMessage.timestamp = message.timestamp
            mockMessage.content = message.content
            delete mockMessage.isMock
          })
        }

        return
      }

      // 如果没有替代mock数据，就直接添加到新消息队列首
      this.activeChannel.newMessages.push(message)
    },

    async handleNewSessionMessage(message: any) {
      const messageMetaId = message.from === this.selfMetaId ? message.to : message.from
      const isFromActiveChannel = messageMetaId === this.activeChannelId

      // 如果不是当前頻道的消息，则更新未读指针
      if (!isFromActiveChannel) {
        this._updateReadPointers(message.timestamp, messageMetaId)
        return
      }

      // 去重
      const isDuplicate =
        this.activeChannel.newMessages.some((item: Message) => item.txId === message.txId) ||
        this.activeChannel.pastMessages.some((item: Message) => item.txId === message.txId)

      if (isDuplicate) return

      // 更新当前頻道的已读指针
      this._updateCurrentChannelReadPointers(message.timestamp)

      // 优先查找替代mock数据
      const mockMessage = this.activeChannel.newMessages.find(
        (item: Message) =>
          item.txId === '' && item.isMock === true && item.nodeName === message.nodeName
      )

      if (mockMessage) {
        console.log('替换中')
        if (message.protocol === 'SimpleFileMsg') {
          console.log('image')
          await sleep(2000)
          this.$patch(state => {
            mockMessage.txId = message.txId
            mockMessage.timestamp = message.timestamp
            mockMessage.data = message.data
          })
        } else {
          this.$patch(state => {
            mockMessage.txId = message.txId
            mockMessage.timestamp = message.timestamp
            mockMessage.data.content = message.data.content
            delete mockMessage.isMock
          })
        }

        return
      }

      // 如果没有替代mock数据，就直接添加到新消息队列首
      this.activeChannel.newMessages.push(message)
    },

    initCommunityChannelIds() {
      const selfMetaId = this.selfMetaId
      
      if (this.communityChannelIds || !selfMetaId) return

      // 从本地存储中读取社区頻道id
      const communityChannels =
        localStorage.getItem('communityChannels-' + selfMetaId) || JSON.stringify({})
      const parsedCommunityChannels = JSON.parse(communityChannels)
      this.communityChannelIds = parsedCommunityChannels
    },

    initReceivedRedPacketIds() {
      if (this.receivedRedPacketIds || !this.selfMetaId) return

      const receivedRedPacketIds = localStorage.getItem('receivedRedPacketIds-' + this.selfMetaId)
      if (receivedRedPacketIds && JSON.parse(receivedRedPacketIds)) {
        this.receivedRedPacketIds = JSON.parse(receivedRedPacketIds)
      } else {
        this.receivedRedPacketIds = []
      }
    },

    addReceivedRedPacketId(id: string) {
      if (!id) return

      this.initReceivedRedPacketIds()

      // 如果已经存在，则不再添加
      if (this.receivedRedPacketIds.includes(id)) return

      this.receivedRedPacketIds.push(id)
      localStorage.setItem(
        'receivedRedPacketIds-' + this.selfMetaId,
        JSON.stringify(this.receivedRedPacketIds)
      )
    },

    initReadPointers() {
      if (this.channelsReadPointers || !this.selfMetaId) return

      const readPointers = localStorage.getItem('readPointers-' + this.selfMetaId)
      if (readPointers && JSON.parse(readPointers)) {
        this.channelsReadPointers = JSON.parse(readPointers)
      } else {
        this.channelsReadPointers = {}
      }

      // 设置定时器，每隔一段时间保存一次
      this.saveReadPointerTimer = setInterval(() => {
        this.saveReadPointers()
      }, 1000 * 30)
    },

    updateReadPointers() {
      if (!this.activeCommunity?.channels || !this.selfMetaId) return
      this.initReadPointers()

      this.activeCommunity.channels.forEach((channel: any) => {
        if (!this.channelsReadPointers[channel.id]) {
          this.channelsReadPointers[channel.id] = {
            lastRead: 0,
            latest: 0,
          }
        }
      })
    },

    closeReadPointerTimer() {
      if (this.saveReadPointerTimer) {
        clearInterval(this.saveReadPointerTimer)
        this.saveReadPointerTimer = null
      }
    },

    saveReadPointers() {
      const selfMetaId = this.selfMetaId
      localStorage.setItem('readPointers-' + selfMetaId, JSON.stringify(this.channelsReadPointers))
    },

    async initChannelMessages(selfMetaId?: string) {
      if (!selfMetaId) selfMetaId = this.selfMetaId

      if (!this.activeChannel) return

      const layoutStore = useLayoutStore()

      layoutStore.isShowMessagesLoading = true

      // 最少1秒，防止闪烁
      const currentTimestamp = new Date().getTime()
      console.log("this.activeChannelType",this.activeChannelType)
      
      const messages = await getChannelMessages(
        this.activeChannelId,
        { metaId: selfMetaId },
        this.activeChannelType
      )

      this.activeChannel.pastMessages = messages
      this.activeChannel.newMessages = []

      // 设置已读指针
      const latestTimestamp = messages.length ? messages[0].timestamp : 0
      if (latestTimestamp) {
        if (
          this.channelsReadPointers[this.activeChannelId] &&
          latestTimestamp > this.channelsReadPointers[this.activeChannelId].latest
        ) {
          this.channelsReadPointers[this.activeChannelId].latest = latestTimestamp
          this.channelsReadPointers[this.activeChannelId].lastRead = latestTimestamp
        } else {
          this.channelsReadPointers[this.activeChannelId] = {
            latest: latestTimestamp,
            lastRead: latestTimestamp,
          }
        }
      }

      // 保证至少1秒
      // const delay = Math.max(1000 - (new Date().getTime() - currentTimestamp), 0)
      // if (delay) await sleep(delay)

      layoutStore.isShowMessagesLoading = false

      // 滚动到底部
      await sleep(1)
      const messagesContainer = document.getElementById('messagesScroll')
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight
      }
    },

    addMessage(message: any) {
      if (!this.activeChannel) return
      if (!this.activeChannel.newMessages) {
        this.activeChannel.newMessages = []
      }

      this.activeChannel.newMessages.push(message)
    },

    removeMessage(mockId: string) {
      console.log('removing message', mockId)
      if (!mockId || !this.activeChannel || !this.activeChannel.newMessages) return

      this.activeChannel.newMessages = this.activeChannel.newMessages.filter(
        (message: any) => message.mockId !== mockId
      )
    },

    reset() {
      console.log('resetting')
      const ws = useWsStore()
      ws.close()
      this.closeReadPointerTimer()
      this.communities = [{ id: '@me' }]
      this.members = []
      this.activeCommunityId = ''
      this.activeChannelId = ''
      this.error = {} as TalkError

      this.channelsReadPointers = null
      this.communityChannelIds = null
      this.receivedRedPacketIds = null
      this.hasActiveChannelConsent = false
      this.inviteLink = ''
      this.invitingChannel = null
    },

    resetCurrentChannel() {
      this.activeChannelId = ''
    },
  },
})
