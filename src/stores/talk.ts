import {
  getAtMeChannels,
  getChannelMessages,
  getPrivateChatMessages,
  getChannels,
  getCommunities,
  getCommunityMembers,
  getCommunityMembership,
  getChannelMembership,
  getOneCommunity,
  getOneChannel,
  getChannelMembers,
  GetUserEcdhPubkeyForPrivateChat,
} from '@/api/talk'

import { ChannelPublicityType, ChannelType, GroupChannelType, NodeName } from '@/enum'
import { defineStore } from 'pinia'
import { router } from '@/router'
import { useLayoutStore } from './layout'
import { Channel, Community, Message, MessageDto, TalkError } from '@/@types/talk'
import { containsString, sleep } from '@/utils/util'
import { useUserStore } from './user'
import { GetUserInfo } from '@/api/aggregation'
import { useWsStore } from './ws_new'
import { getMetaNameAddress, isPublicChannel } from '@/utils/meta-name'
import { getUserInfoByAddress, getUserInfoByMetaId } from '@/api/man'
import { ChannelMsg_Size } from '@/data/constants'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { useCredentialsStore } from './credentials'
import { useEcdhsStore } from './ecdh'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { nextTick } from 'vue'
function sortByConditionInPlace(array, conditionFn) {
  // console.log("arrray11111111111111111111",array)
  array.sort((a, b) => {
    const aMatches = conditionFn(a)
    const bMatches = conditionFn(b)

    if (aMatches && !bMatches) {
      return -1 // a排在b前面
    } else if (!aMatches && bMatches) {
      return 1 // b排在a前面
    } else {
      return 0 // 保持原有相对顺序
    }
  })

  return array
}

export const useTalkStore = defineStore('talk', {
  state: () => {
    return {
      communities: [{ id: 'public' }, { id: '@me' }] as Community[],
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

      // 全局消息菜单状态管理
      activeMessageMenuId: '', // 当前显示菜单的消息ID

      communityStatus: 'loading', // loading, inviting, invited, ready

      inviteLink: '', // 邀请链接
      invitingChannel: null as any, // 邀请的頻道
      invitedCommunity: null as any, // 受邀请的社区
      shareToBuzzTxId: '', // 分享到Buzz的TxId

      consensualNft: null as any,
      consensualFt: null as any,
      consensualNative: null as any,
      isShowWelcome: false,
      retryMsgList: [] as MessageDto,

      // 强制更新触发器
      channelUpdateTrigger: 0,
    }
  },

  getters: {
    selfMetaId(): string {
      const userStore = useUserStore()
      return userStore.last?.metaid || ''
    },

    selfAddress(): string {
      const userStore = useUserStore()
      return userStore.last?.address || ''
    },

    realCommunities(state) {
      if (!state.communities) return []
      return state.communities.filter(community => community.id === 'public')
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
        communitySymbol = 'public'
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

    showWelcome(state): any {
      if (!this.activeChannel?.pastMessages) {
        return (state.isShowWelcome = true)
      } else {
        return (state.isShowWelcome = false)
      }
    },

    activeChannel(state): any {
      if (!this.activeCommunity) return null

      // 功能頻道
      if (this.isActiveChannelGeneral) {
        return this.generalChannels.find(channel => channel.id === state.activeChannelId)
      }
      if (this.canAccessActiveChannel) {
        return this.activeCommunity?.channels?.find((channel: any) => {
          return (
            (channel.id && channel.id === state.activeChannelId) ||
            (channel.metaId && channel.metaId === state.activeChannelId)
          )
        })
      }

      if (this.activeChannelType == 'session') {
        return this.activeCommunity?.channels?.find((channel: any) => {
          return (
            (channel.id && channel.id === state.activeChannelId) ||
            (channel.metaId && channel.metaId === state.activeChannelId)
          )
        })
      }
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

    // activeChannelType(){
    //   if (!this.activeChannel) return ChannelType.Session
    //   return this.activeChannel?.groupId ? ChannelType.Group :  ChannelType.Session
    // },
    activeChannelType: state =>
      state.activeCommunityId === 'public' ? ChannelType.Group : ChannelType.Session,

    activeChannelSymbol: state => (state.activeCommunityId === '@public' ? '@' : '#'),

    communityLastReadChannelId(): (communityId: string) => string {
      const selfMetaId = this.selfMetaId
      return (communityId: string) => {
        const latestChannelsRecords =
          localStorage.getItem('latestChannels-' + selfMetaId) || JSON.stringify({})
        const latestChannels = JSON.parse(latestChannelsRecords)

        return latestChannels[communityId] || 'index'
      }
    },

    getRetryById(): (mockId: string) => MessageDto {
      return (mockId: string) => {
        return this.retryMsgList?.find((item: MessageDto) => item.mockId == mockId)
      }
    },
  },

  actions: {
    async fetchCommunities() {
      if (!this.selfMetaId) return

      const communities = await getCommunities({ metaId: this.selfMetaId })
      this.communities = [...communities, this.atMeCommunity]
      console.log('this.communities', this.communities)
    },

    async fetchChannels(communityId?: string, isGuest?: boolean) {
      console.log('this.selfMetaId', this.selfMetaId)
      const ecdhsStore = useEcdhsStore()
      if (!communityId) communityId = this.activeCommunityId
      console.log('this.activeCommunityId', this.activeCommunityId)

      const isAtMe = communityId === '@me'

      // if(isAtMe){
      //

      //   console.log("this.activeCommunity",this.activeCommunity)
      //   return
      //   // if(this.activeCommunity!.channels.length){
      //   //   return
      //   // }
      // }
      //
      // const atMeChannel=await getAtMeChannels({
      //       metaId: this.selfMetaId,
      //     })
      // const atMeChannel=[]
      // c3085ccabe5f4320ccb638d40b16f11fea267fb051f360a994305108b16854cd
      const allChannel = await getChannels({
        metaId: this.selfMetaId,
      })

      let publicChannel: Channel[] = []
      let priviteChannel: Channel[] = []
      let channels: Channel[] = []
      publicChannel = allChannel.filter(item => {
        return item.groupId
      })
      priviteChannel = allChannel.filter(item => {
        return !item.groupId && item.metaId.length == 64
      })

      if (priviteChannel.length) {
        for (let channel of priviteChannel) {
          const userInfo = await GetUserEcdhPubkeyForPrivateChat(channel.metaId)

          if (userInfo.chatPublicKey) {
            channel.publicKeyStr = userInfo.chatPublicKey
            channel.id = userInfo.metaid
            let ecdh = ecdhsStore.getEcdh(userInfo.chatPublicKey)

            if (!ecdh) {
              ecdh = await getEcdhPublickey(userInfo.chatPublicKey)
              ecdhsStore.insert(ecdh, ecdh?.externalPubKey)
            }
          }
        }
      }

      //const channels = [...publicChannel]
      // [...publicChannel,...atMeChannel]

      // const channels = isAtMe
      //   ? await getAtMeChannels({
      //       metaId: this.selfMetaId,
      //     })
      //   : await getChannels({
      //       communityId,
      //     })

      if (!this.activeCommunity?.channels) this.activeCommunity!.channels = []
      const activeChannelList = allChannel.filter(
        item => item?.groupId || item.metaId?.length == 64
      )
      this.activeCommunity!.channels = activeChannelList //publicChannel//isAtMe ? priviteChannel : publicChannel //allChannel//publicChannel //channels

      console.log('activeChannel', channels)
      console.log('communityId', communityId)

      if (!isGuest) {
        // 写入存储
        this.initCommunityChannelIds()

        // 只保存頻道id
        const publicChannelIds = publicChannel.map((channel: Channel) => channel.id)
        const privateChannelIds = priviteChannel.map((channel: Channel) => channel.metaId)
        // const channelIds = allChannel.map((channel: any) => channel.id)
        // console.log("channelIds",channelIds,communityId)
        //
        if (communityId == 'public') {
          this.communityChannelIds[communityId] = publicChannelIds.filter(item => item)
          this.communityChannelIds['@me'] = privateChannelIds.filter(item => item.length == 64)
        } else if (communityId == '@me') {
          this.communityChannelIds[communityId] = privateChannelIds.filter(
            item => item.length == 64
          )
          this.communityChannelIds['public'] = publicChannelIds.filter(item => item)
        }

        localStorage.setItem(
          'communityChannels-' + this.selfMetaId,
          JSON.stringify(this.communityChannelIds)
        )
      }

      return activeChannelList
    },

    async refetchChannels() {
      const channels = await getChannels({
        metaId: this.selfMetaId,
      })
      channels.forEach((channel: any) => {
        // 如果是新頻道，则添加到頻道列表
        if (!this.activeCommunityChannels.find((c: any) => c.id === channel.id)) {
          this.activeCommunityChannels.push(channel)
        }
      })
    },

    async checkCommunityMetaName(communityId: string) {
      // 检查metaname字段是否为空，以及metaname所属地址是否是自己
      // c3085ccabe5f4320ccb638d40b16f11fea267fb051f360a994305108b16854cd
      if (isPublicChannel(communityId) || communityId == '') {
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

    async checkChannelMembership(routeCommunityId: string, routeChannelId: string) {
      const selfMetaId = this.selfMetaId

      if (routeChannelId == 'welcome') {
        return false
      }
      const isMember = await getChannelMembership(routeChannelId, selfMetaId)

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
    },

    async inviteChannel(routeChannelId: string) {
      const { openConnectionModal } = useConnectionModal()
      const layout = useLayoutStore()

      const userStore = useUserStore()

      this.invitingChannel = await getOneChannel(routeChannelId)
      if (routeChannelId == 'welcome') {
        return
      }

      if (!userStore.isAuthorized) {
        openConnectionModal()
        return
      }

      layout.isShowChannelAcceptInviteModal = true
      // this.communityStatus ='inviting' //'inviting'

      getChannelMembers({ groupId: routeChannelId })
        .then((members: any) => {
          this.members = members
        })
        .catch(() => {
          ElMessage.error('获取群组成员失败')
        })

      const isGuest = true

      // await this.fetchChannels('public', isGuest)
    },

    async initCommunity(routeCommunityId: string, routeChannelId?: string) {
      this.communityStatus = 'loading'

      const isAtMe = routeCommunityId === '@me'
      const isPublic = routeCommunityId == 'public'
      this.activeCommunityId = routeCommunityId

      if (!isAtMe) {
        getChannelMembers({
          groupId: routeChannelId,
        })
          .then((members: any) => {
            this.members = members
          })
          .catch(() => {
            ElMessage.error('获取群聊成员失败')
          })

        // getCommunityMembers(routeCommunityId)
        //   .then((members: any) => {
        //     this.members = members
        //   })
        //   .catch(() => {
        //     ElMessage.error('获取社区成员失败')
        //   })
      } else {
      }

      await this.fetchChannels(routeCommunityId)

      this.updateReadPointers()
      this.communityStatus = 'ready'
    },

    async initChannel(routeCommunityId: string, routeChannelId?: string) {
      // 如果是私聊，而且路由中的頻道 ID 不存在，则新建会话
      if (
        routeCommunityId === '@me' &&
        routeChannelId &&
        !this.activeCommunityChannels.some((channel: any) => channel.metaId === routeChannelId)
      ) {
        const userInfo = await GetUserEcdhPubkeyForPrivateChat(routeChannelId)

        // const userInfo=await
        // const metaidInfo = await getUserInfoByMetaId(routeChannelId)
        //
        // const userInfo= await getUserInfoByAddress(metaidInfo?.address)

        const newSession = {
          id: routeChannelId,
          name: userInfo.name,
          address: userInfo.address,
          publicKeyStr: userInfo.chatPublicKey,
          avatarImage: userInfo.avatar,
          metaId: userInfo.metaid,
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
        this.activeCommunity?.channels?.map((channel: any) => {
          if (channel.id === messageMetaId) {
            channel.newMessages = [message]
          }
        })

        try {
          sortByConditionInPlace(
            this.activeCommunity?.channels,
            channel => channel?.groupId == messageMetaId
          )
          return
        } catch (error) {
          console.log('socket推送11111', error.toString())
          return
        }
      }

      // 当前頻道，插入新消息
      // 先去重
      const isDuplicate =
        this.activeChannel?.newMessages?.some((item: Message) => item.txId === message.txId) ||
        this.activeChannel?.pastMessages?.some((item: Message) => item.txId === message.txId)

      if (isDuplicate) return

      // 更新当前頻道的已读指针
      this._updateCurrentChannelReadPointers(message.timestamp)

      // 优先查找替代mock数据
      let mockMessage: any

      if (containsString(message.protocol, NodeName.SimpleGroupChat)) {
        mockMessage = this.activeChannel?.newMessages?.find(
          (item: Message) =>
            item.txId === '' &&
            item.isMock === true &&
            item.content === message.content &&
            item.metaId === message.metaId &&
            containsString(message.protocol, item?.protocol!)
        )
      } else if (containsString(message.protocol, NodeName.SimpleFileGroupChat)) {
        mockMessage = this.activeChannel?.newMessages?.find(
          (item: Message) =>
            item.txId === '' &&
            item.isMock === true &&
            item.metaId === message.metaId &&
            containsString(message.protocol, item?.protocol!)
        )
      } else if (containsString(message.protocol, NodeName.SimpleGroupOpenLuckybag)) {
        mockMessage = this.activeChannel?.newMessages?.find(
          (item: Message) =>
            item.txId === '' &&
            item.isMock === true &&
            item.metaId === message.metaId &&
            containsString(message.protocol, item?.protocol!)
        )
      } else if (containsString(message.protocol, NodeName.SimpleGroupLuckyBag)) {
        mockMessage = this.activeChannel?.newMessages?.find(
          (item: Message) =>
            item.txId === '' &&
            item.isMock === true &&
            item.metaId === message.metaId &&
            containsString(message.protocol, item?.protocol!)
        )
      }

      if (mockMessage) {
        console.log('替换中')
        if (containsString(message.protocol, NodeName.SimpleFileGroupChat)) {
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

      this.activeChannel.newMessages.push(message)

      try {
        sortByConditionInPlace(
          this.activeCommunity?.channels,
          channel => channel?.groupId == messageMetaId
        )
      } catch (error) {
        console.log('socket推送2222', error.toString())
      }

      // this.activeCommunity?.channels.sort(()=>{

      // })

      //  this.activeCommunity?.channels.sort((a,b)=>{
      //   if(b?.newMessages?.length && a?.newMessages?.length){

      //     return b?.newMessages[0].timestamp - a?.newMessages[0]?.timestamp
      //   }else if(b?.newMessages?.length && !a?.newMessages?.length){

      //     return b?.newMessages?.length
      //   }else if(!b?.newMessages?.length && a?.newMessages?.length){

      //     return -1
      //   }
      //  })

      // if(this.activeCommunity?.channels && this.activeCommunity?.channels.length){
      //
      //   for(let channel of this.activeCommunity.channels){
      //
      //     if(channel?.newMessages?.length){

      //     }else{
      //       continue
      //     }
      //   }
      // }

      //   console.log("this.activeCommunity.channels",this.activeCommunity?.channels)
      //

      // if(message){
      //    getUserInfoByAddress(message.address).then((userInfo)=>{
      //     message.userInfo=userInfo

      //     if(message.replyInfo){
      //       getUserInfoByAddress(message.replyInfo.address).then((replayInfo)=>{
      //         message.replyInfo.userInfo=replayInfo
      //           console.log("message",message)

      //      // 如果没有替代mock数据，就直接添加到新消息队列首
      //       this.activeChannel.newMessages.push(message)
      //       })

      //     }else{
      //          console.log("message",message)

      //      // 如果没有替代mock数据，就直接添加到新消息队列首
      //     this.activeChannel.newMessages.push(message)
      //     }

      //   })

      // }
    },

    async handleNewSessionMessage(message: any) {
      const messageMetaId = message.from === this.selfMetaId ? message.to : message.from

      const isFromActiveChannel = messageMetaId === this.activeChannelId

      // 如果不是当前頻道的消息，则更新未读指针
      if (!isFromActiveChannel) {
        this._updateReadPointers(message.timestamp, messageMetaId)

        this.activeCommunity?.channels?.map((channel: any) => {
          if (channel?.userInfo?.metaid === messageMetaId) {
            channel.newMessages = [message]
          }
        })

        try {
          sortByConditionInPlace(
            this.activeCommunity?.channels,
            channel => channel?.userInfo?.metaid == messageMetaId
          )

          return
        } catch (error) {
          console.log('socket推送11111', error.toString())
          return
        }
      }
      console.log('11111111', this.activeChannel.newMessages, message.txId)

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
          item.txId === '' &&
          item.isMock === true &&
          (item.nodeName === message.nodeName || containsString(message?.protocol, item.nodeName))
      )

      if (mockMessage) {
        console.log('替换中')
        if (containsString(message.protocol, NodeName.SimpleFileMsg)) {
          console.log('image')
          await sleep(2000)
          this.$patch(state => {
            mockMessage.txId = message.txId
            mockMessage.timestamp = message.timestamp
            mockMessage.data.content = message.content || message.data?.content
          })
        } else {
          this.$patch(state => {
            mockMessage.txId = message.txId
            mockMessage.timestamp = message.timestamp
            mockMessage.data.content = message.content || message.data?.content
            delete mockMessage.isMock
          })
        }

        return
      }

      if (message) {
        this.activeChannel.newMessages.push(message)
        try {
          sortByConditionInPlace(
            this.activeCommunity?.channels,
            channel => channel?.userInfo?.metaid == messageMetaId
          )
          console.log('this.activeCommunity?.channels', this.activeCommunity?.channels)
        } catch (error) {
          console.log('socket推送2222', error.toString())
        }
      }

      // 如果没有替代mock数据，就直接添加到新消息队列首
      // this.activeChannel.newMessages.push(message)
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

      console.log('this.activeChannelType', this.activeChannelType, this.activeChannelId)

      let messages
      if (this.activeChannelType == 'session') {
        messages = await getPrivateChatMessages({
          otherMetaId: this.activeChannelId,
          metaId: selfMetaId,
        })
      } else {
        messages = await getChannelMessages({
          groupId: this.activeChannelId,
          metaId: selfMetaId,
        })
      }

      // for(let i of messages){
      //   const userInfo= await getUserInfoByAddress(i.address)
      //    i.userInfo=userInfo
      //   if(i.replyInfo){
      //     const replyUserInfo=await getUserInfoByAddress(i.replyInfo.address)
      //     i.replyInfo.userInfo=replyUserInfo
      //   }

      // }

      // 优化：使用nextTick来减少对session列表的影响
      await nextTick()
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

    async updateChannelMessages(messages: any) {
      // 最少1秒，防止闪烁
      const currentTimestamp = new Date().getTime()
      console.log('this.activeChannelType', this.activeChannelType)

      const newMsg = []
      let index = 0
      outerLoop: for (const i of this.activeChannel.pastMessages) {
        if (index >= ChannelMsg_Size) break outerLoop
        for (const j of messages) {
          if (i.txId == j.txId) {
            console.log('跳出了循环')
            break outerLoop
          } else {
            console.log('插入了新数据')
            newMsg.push(j)
          }
          index++
        }
      }

      if (newMsg.length) {
        //   for(let i of newMsg){
        //   const userInfo= await getUserInfoByAddress(i.address)
        //    i.userInfo=userInfo
        //   if(i.replyInfo){
        //     const replyUserInfo=await getUserInfoByAddress(i.replyInfo.address)
        //     i.replyInfo.userInfo=replyUserInfo
        //   }

        // }

        this.activeChannel.pastMessages.unshift(...newMsg)
        for (const i of this.activeChannel.newMessages) {
          if (i?.error) {
            this.activeChannel.newMessages = [i]
          } else {
            this.activeChannel.newMessages = []
            break
          }
        }

        // 设置已读指针
        const latestTimestamp = newMsg.length ? newMsg[0].timestamp : 0
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
        const delay = Math.max(1000 - (new Date().getTime() - currentTimestamp), 0)
        if (delay) await sleep(delay)

        // 滚动到底部
        await sleep(1)
        const messagesContainer = document.getElementById('messagesScroll')
        if (messagesContainer) {
          messagesContainer.scrollTop = messagesContainer.scrollHeight
        }
      }

      // for(let i of messages){
      //   const userInfo= await getUserInfoByAddress(i.address)
      //    i.userInfo=userInfo
      //   if(i.replyInfo){
      //     const replyUserInfo=await getUserInfoByAddress(i.replyInfo.address)
      //     i.replyInfo.userInfo=replyUserInfo
      //   }

      // }
    },

    addMessage(message: any) {
      console.log('this.activeChannel333333333333333', this.activeChannel)
      if (!this.activeChannel) return
      if (!this.activeChannel.newMessages) {
        this.activeChannel.newMessages = []
      }
      console.log('message', message)

      const isSession = Number(message.type) == 2 ? true : false
      if (isSession) {
        sortByConditionInPlace(this.activeCommunity?.channels, channel => channel?.id == message.to)
        console.log('this.activeChannel333333333333333', this.activeChannel)
      } else {
        sortByConditionInPlace(
          this.activeCommunity?.channels,
          channel => channel?.groupId == message.groupId
        )
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

    addRetryList(message: MessageDto) {
      this.retryMsgList.push(message)
    },

    removeRetryList(mockId: string) {
      this.retryMsgList = this.retryMsgList.filter((item: MessageDto) => item.mockId !== mockId)
    },

    reset() {
      console.log('resetting')
      const ws = useWsStore()

      ws.disconnect()
      this.closeReadPointerTimer()
      this.communities = [{ id: 'public' }]
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

    // 全局消息菜单状态管理
    setActiveMessageMenu(messageId: string) {
      this.activeMessageMenuId = messageId
    },

    clearActiveMessageMenu() {
      this.activeMessageMenuId = ''
    },

    // 更新频道信息
    updateChannelInfo(
      channelId: string,
      updates: {
        roomName?: string
        roomNote?: string
        roomAvatarUrl?: string
        roomIcon?: string
        [key: string]: any
      }
    ) {
      // 查找并更新活动社区中的频道
      if (this.activeCommunity?.channels) {
        const channel = this.activeCommunity.channels.find(
          (c: any) => c.groupId === channelId || c.id === channelId
        )
        if (channel) {
          // 直接更新属性，确保响应式
          if (updates.roomName !== undefined) channel.roomName = updates.roomName
          if (updates.roomNote !== undefined) channel.roomNote = updates.roomNote
          if (updates.roomAvatarUrl !== undefined) channel.roomAvatarUrl = updates.roomAvatarUrl
          if (updates.roomIcon !== undefined) channel.roomIcon = updates.roomIcon

          // 更新其他属性
          Object.keys(updates).forEach(key => {
            if (!['roomName', 'roomNote', 'roomAvatarUrl', 'roomIcon'].includes(key)) {
              ;(channel as any)[key] = updates[key]
            }
          })

          console.log('Channel info updated:', channel)
          this.activeCommunity.channels = this.activeCommunity.channels.map(c =>
            c.groupId === channel.groupId ? channel : c
          )

          this.$patch({})

          // 触发强制更新
          this.channelUpdateTrigger++
        }
      }

      // 如果是通用频道，也需要更新
      const generalChannel = this.generalChannels.find(
        (c: any) => c.groupId === channelId || c.id === channelId
      )
      if (generalChannel) {
        // 通用频道的更新（如果需要的话）
        Object.keys(updates).forEach(key => {
          if ((generalChannel as any)[key] !== undefined) {
            ;(generalChannel as any)[key] = updates[key]
          }
        })
        console.log('General channel info updated:', generalChannel)
      }
    },

    // 更新频道公告
    updateChannelAnnouncement(channelId: string, announcement: string) {
      this.updateChannelInfo(channelId, { roomNote: announcement })
    },
  },
})
