import { Chains, ChannelPublicityType, GroupChannelType, RedPacketDistributeType } from '@/enum'
import {
  createAnnouncement,
  deleteAnnouncement,
  editAnnouncement,
  giveRedPacket,
  updateCommunity,
} from '@/utils/talk'
import { realRandomString, sleep } from '@/utils/util'
import { defineStore } from 'pinia'
import { useLayoutStore } from './layout'
import { getCommunityAuth } from '@/api/talk'
import { useTalkStore } from './talk'
import { useUserStore } from './user'
import { Channel } from '@/@types/talk'
import { GetFT, GetGenesis } from '@/api/aggregation'
// @ts-ignore
import { SHA256 } from 'crypto-es/lib/sha256.js'
import Decimal from 'decimal.js-light'

const MIN=new Decimal(0.0001).mul(10 ** 8).toNumber()
const MAX=new Decimal(10).mul(10 ** 8).toNumber()


export const useCommunityFormStore = defineStore('communityForm', {
  state: () => {
    return {
      icon: null as File | null,
      description: '',
      cover: null as File | null,
      name: '',
     //metaName: null as MetaNameItem | null,
    }
  },

  getters: {
    isStep1Finished(state) {
      return !!state.icon &&  state.name.length > 0 //!!state.metaName && state.name.length > 0
      //return !!state.icon && state.name.length > 0
    },

    isStep2Finished(state) {
      return !!state.description && !!state.cover
    },

    isFinished(state) {
      //return !!state.icon && !!state.name
      return !!state.icon  && !!state.name //&& !!state.metaName
    },

    isAllFinished(state) {
      return (
        !!state.icon && !!state.description  && !!state.name && !!state.cover //&& !!state.metaName 
      )
    },

    iconPreviewUrl(state) {
      return state.icon ? URL.createObjectURL(state.icon) : ''
    },

    coverPreviewUrl(state) {
      return state.cover ? URL.createObjectURL(state.cover) : ''
    },
  },

  actions: {
    reset() {
      this.icon = null
      this.description = ''
      this.cover = null
      this.name = ''
      //this.metaName = null
    },
  },
})

export const useCommunityUpdateFormStore = defineStore('communityUpdateForm', {
  state: () => {
    return {
      icon: null as File | null,
      description: '',
      cover: null as File | null,
      original: null as any,
      //metaName: null as MetaNameItem | null,
      name: '',
    }
  },

  getters: {
    isChanged(state) {
      const descriptionChanged = state.description !== state.original.description
      const nameChanged = state.name !== state.original.name
      return state.icon  || descriptionChanged  || state.cover || nameChanged  //||  !!state.metaName
    },

    isFinished(state): boolean {
      return this.isChanged && this.description !== '' && this.name !== ''
    },

    iconPreviewUrl(state) {
      return state.icon ? URL.createObjectURL(state.icon) : ''
    },

    coverPreviewUrl(state) {
      return state.cover ? URL.createObjectURL(state.cover) : ''
    },
  },

  actions: {
    reset() {
      this.icon = null
      this.description = ''
      this.cover = null
      //this.metaName = null
      this.name = ''
    },

    resetInForm() {
      this.icon = null
      this.cover = null
      //this.metaName = null
      this.description = this.original.description
      this.name = this.original.name
    },

    async submit() {
      if (!this.isFinished) return

      //const metaName = await getCommunityAuth(this.original.communityId)
      //const replacingMetaName = this.metaName

      const layout = useLayoutStore()
      const user = useUserStore()
      layout.isShowCreateCommunityModal = false
      layout.isShowLoading = true
      const form = {
        icon: this.icon,
        description: this.description,
        cover: this.cover,
        original: this.original,
        //metaName,
        //replacingMetaName,
        name: this.name,
      }
      await updateCommunity(form, user.showWallet)

      this.reset()
      await sleep(1000)
      layout.isShowCommunitySettingsModal = false
      layout.isShowLoading = false

      // 跳转刷新
      window.location.reload()
    },
  },
})

export interface ChannelFormState {
  type: GroupChannelType
  name: string
  password: string
  chain: null | Chains
  chainInfo: null | any
  nft: null | UserNFTItem
  ft: null | FungibleToken
  amount: number
  adminOnly: boolean // 发言设置，0：所有人，1：管理员
  uuid?: string
  // 修改
  publicKey?: string
  groupId?: string
  txId?: string
  nativeAmount?: number
}
export const useChannelFormStore = defineStore('channelForm', {
  state: () => {
    return <ChannelFormState>{
      type: GroupChannelType.PublicText,
      name: '',
      password: '',
      chain: null,
      nft: null as any,
      ft: null as any,
      amount: 1,
      adminOnly: false, // 发言设置，0：所有人，1：管理员
      publicKey: undefined,
      groupId: undefined,
      uuid: undefined, // 用于 订阅和 key， 不可修改
      txId: undefined,
      chainInfo: null as any,
    }
  },

  getters: {
    isFinished(state) {
      switch (state.type) {
        case GroupChannelType.PublicText:
          return !!state.name
        case GroupChannelType.Password:
          return !!state.name && !!state.password
        case GroupChannelType.NFT:
          return !!state.name && !!state.nft && !!state.chain
        case GroupChannelType.FT:
          return !!state.name && !!state.ft && !!state.chain
        case GroupChannelType.Native:
          return !!state.name && !!state.chain && !!state.amount

        default:
          return true
      }
    },
  },

  actions: {
    // 从现有数据恢复填充表单，用于编辑
    async recover(channel: Channel) {
      this.reset()

      if (channel.roomType === ChannelPublicityType.Public) {
        this.type = GroupChannelType.PublicText
      }

      if (channel.roomType === ChannelPublicityType.Private) {
        switch (channel.roomJoinType) {
          case '1':
            this.type = GroupChannelType.Password
            break
          case '2':
            this.type = GroupChannelType.NFT
            this.chain = Chains.MVC
            break
          case '3':
            this.type = GroupChannelType.FT
            break
          case '2001':
            this.type = GroupChannelType.NFT
            this.chain = import.meta.env.VITE_ETH_CHAIN as Chains
            break
          case '2002':
            this.type = GroupChannelType.NFT
            this.chain = import.meta.env.VITE_POLYGON_CHAIN as Chains
          default:
            this.type = GroupChannelType.PublicText
        }
      }
      if (this.type === GroupChannelType.NFT) {
        const nftSeriesRes = await GetGenesis({
          chain: this.chain as string,
          codehash: channel.roomCodeHash,
          genesis: channel.roomGenesis,
        })
        if (nftSeriesRes.code === 0) {
          this.nft = nftSeriesRes.data.results.items[0]
        }
      }
      if (this.type === GroupChannelType.FT) {
        const ftSeriesRes = await GetFT({
          chain: this.chain as string,
          codehash: channel.roomCodeHash,
          genesis: channel.roomGenesis,
        })
          .then((res: any) => res)
          .catch((e: any) => {
            this.ft = null
            this.amount = channel.roomLimitAmount
          })
        if (ftSeriesRes?.code === 0) {
          this.ft = ftSeriesRes.data.results.items[0]
          this.amount = channel.roomLimitAmount
        }
      }

      this.name = channel.name
      this.adminOnly = channel.chatSettingType === 1
      this.publicKey = channel.roomPublicKey
      this.groupId = channel.groupId
      this.uuid = channel.uuid
      this.txId = channel.txId
    },

    reset() {
      this.type = GroupChannelType.PublicText
      this.name = ''
      this.password = ''
      this.nft = null
      this.ft = null
      this.chain = null
      this.amount = 1
      this.adminOnly = false
      this.publicKey = undefined
      this.groupId = undefined
      this.uuid = undefined
      this.txId = undefined
    },
  },
})

export const usePasswordFormStore = defineStore('passwordForm', {
  state: () => {
    return {
      password: '',
    }
  },

  getters: {
    isFinished(state) {
      return !!state.password
    },
  },
})

export const useRedPacketFormStore = defineStore('redPacketForm', {
  state: () => {
    return {
      amount: 0.001 as number | '',
      each: 0.001 as number,
      unit:'Space' as 'Sats' | 'Space',
      quantity: 1,
      message: '',
      type: RedPacketDistributeType.Random,
      nft: null as any,
      chain: null as any,
    }
  },

  getters: {
    nicerAmount(state): string {
      if (state.amount === '') return '0'
      console.log("state.amount",state.amount)
      // 小于 0.01 的红包金额，会使用sat为单位
      
      return new Decimal(state.amount).toString()
      // return state.amount < 0.01 ? (state.amount * 100000000).toFixed(0) : state.amount.toFixed(2)
    },

    amountUnit(state) {
      return state.unit //'sats'
      // if (state.amount === 0 || state.amount === '') return 'Space'
      // return state.amount < 0.01 ? 'sats' : 'Space'
    },

    nicerAmountWithUnit(state): any {
      return {
        amount: this.nicerAmount,
        unit: this.amountUnit,
      }
    },

    isFinished(state) {
      if (state.type === RedPacketDistributeType.Nft) {
        return !!state.each && !!state.quantity && !!state.nft && !!state.chain
      }

      return !!state.amount && !!state.quantity
    },
  },

  actions: {
    validateQuantity() {
      if (this.quantity < 1) {
        this.quantity = 1
      }
      if (this.quantity > 100) {
        this.quantity = 100
      }

      // 金额校验
      if (this.type === RedPacketDistributeType.Random) {
        this.validateAmount()
      }
    },
    validateAmount() {
      // 每个人最少 1000 sat（0.00001 Space）
      const min = MIN
      const max= MAX
      
      if(this.unit == 'Sats'){
      const minAmount = min * this.quantity
      const maxAmount = max // 2 Space = 200_000_000 sat
      if (+this.amount < minAmount) {
        this.amount = minAmount
      }
      if (+this.amount > maxAmount) {
        this.amount = maxAmount
      }
      }else{
      const minAmount = new Decimal(min).div(10 ** 8).mul(this.quantity).toNumber()
      const maxAmount = new Decimal(max).div(10 ** 8).mul(this.quantity).toNumber() // 2 Space = 200_000_000 sat
      if (+this.amount < minAmount) {
        this.amount = minAmount
      }
      if (+this.amount > maxAmount) {
        this.amount = maxAmount
      }
      }

    
    },
    validateEach() {
      const min =MIN
      const max=MAX
      if(this.unit == 'Sats'){
        const minAmount=min
        const maxAmount=max
          if (this.each < minAmount) {
        this.each = minAmount
      }
      if (this.each > maxAmount) {
        this.each = maxAmount
      }
      }else{
         const minAmount=new Decimal(min).div(10 ** 8).toNumber()
        const maxAmount=new Decimal(max).div(10 ** 8).toNumber()
        if (this.each < minAmount) {
        this.each = minAmount
      }
      if (this.each > maxAmount) {
        this.each = maxAmount
      }
      }

    
    },

    reset() {
      this.amount =this.unit == 'Sats' ? 1000 : 0.00001
      this.each = this.unit == 'Sats' ? 1000 : 0.00001
      this.quantity = 1
      this.message = ''
      this.nft = null
      this.chain = null
    },

    async submit() {
      const talk = useTalkStore()
      const user = useUserStore()
      const layout = useLayoutStore()
      if (!this.isFinished) return
      
      layout.isShowRedPacketModal = false
      layout.isShowLoading = true
      await giveRedPacket(
        {
          amount: this.amount,
          message: this.message,
          each: this.each,
          quantity: this.quantity,
          chain: this.chain,
          nft: this.nft,
          type: this.type,
          unit:this.unit
        },
        talk.activeChannelId,
        talk.selfMetaId,
      )
      layout.isShowLoading = false
      this.reset()
    },
  },
})

// 新公告、编辑公告
export const useCreateAnnouncementFormStore = defineStore('createAnnouncementForm', {
  state: () => {
    return {
      title: '',
      content: '',
      communityId: '',
      type: 'create' as 'create' | 'edit',
      txId: null as null | string,
      publickey: null as null | string,
      original: null as any,
    }
  },

  getters: {
    hasWhitespaceField(state): boolean {
      return !state.title.trim() || !state.content.trim()
    },

    hasChanged(state): boolean {
      if (!state.original) return true

      return state.title !== state.original.title || state.content !== state.original.content
    },

    isFinished(state): boolean {
      if (state.type === 'edit') {
        return !!state.title && !!state.content && !this.hasWhitespaceField && this.hasChanged
      }

      return !!state.title && !!state.content && !this.hasWhitespaceField
    },
  },

  actions: {
    async submit() {
      if (!this.isFinished) return

      const user = useUserStore()
      const layout = useLayoutStore()
      layout.isShowLoading = true

      const form: {
        title: string
        content: string
        communityId: string
        txId?: string
        publickey?: string
      } = {
        title: this.title,
        content: this.content,
        communityId: this.communityId,
      }
      if (this.type === 'edit') {
        form.txId = this.txId as string
        form.publickey = this.publickey as string
        await editAnnouncement(form, user.showWallet)
      } else {
        await createAnnouncement(form, user.showWallet)
      }

      layout.isShowLoading = false
      this.reset()
    },

    reset() {
      this.title = ''
      this.content = ''
      this.communityId = ''
      this.type = 'create'
      this.txId = null
      this.publickey = null
      this.original = null
    },
  },
})

// 删除公告
export const useDeleteAnnouncementFormStore = defineStore('deleteAnnouncementForm', {
  state: () => {
    return {
      announcementId: '',
      communityId: '',
      title: '',
    }
  },

  getters: {
    isFinished(state) {
      return !!state.announcementId && !!state.communityId
    },
  },

  actions: {
    async submit() {
      if (!this.isFinished) return

      const user = useUserStore()
      const layout = useLayoutStore()
      layout.isShowLoading = true

      await deleteAnnouncement(
        {
          announcementId: this.announcementId,
          communityId: this.communityId,
        },
        user.showWallet
      )

      layout.isShowLoading = false
      this.reset()
    },

    reset() {
      this.announcementId = ''
      this.communityId = ''
      this.title = ''
    },
  },
})

// 创建、编辑DAO
export const useMutateDaoFormStore = defineStore('mutateDaoForm', {
  state: () => {
    const userStroe = useUserStore()
    return {
      communityId: '', //string
      daoName: '', //string
      daoID: SHA256(realRandomString(64)).toString(), //string, 生成方法hash(随机64位)，必须确保是唯一。Sha256 once after generating a 64-bit random string.
      daoAdmins: [userStroe.user!.metaId], //array, 管理员metaId数组
      daoIntro: '', //string
      daoMission: '', //string
      daoTypes: [], //array, 值: "protocol/service/social/investment/grant/collector/culture",
      daoLogo: '', //string, logo所在的metafile
      governanceType: 'space', //string, 治理类型：ft/nft/bsv/space/none
      governanceSymbol: 'space', // {space/ft-symbol} string, Symbol of Governance Token.治理代币的Symbol。
      governanceToken: 'space', //string, 治理tokenId,若为源生币为"space", 如没有则为"none",
      daoWebsite: '', //string, DAO官网
      daoTwitter: '', //string, 推特账号
      daoDiscord: '', //string, discord地址
      daoTelegram: '', //string, telegrame地址
      daoTerms: '', //string,
      daoTermsContentType: 'text/markdwon', //string, 进入条款的内容格式
      joinDaoRequireTokenNumber: 1, //number, 加入该DAO的时候，需要最少治理token数量，如果治理Token为none，则忽略此值
      createProposalRequireTokenNumber: 10000, //number, 创建议题需要的治理Token数量，如果治理Token为none，则忽略此值
      publiceKey: '',
    }
  },

  actions: {
    switchCategory(val: string) {
      if (this.daoTypes.some(item => item === val)) {
        this.daoTypes = this.daoTypes.filter(c => c !== val)
      } else {
        this.daoTypes.push(val)
      }
    },

    reset() {
      this.communityId = '' //string
      this.daoName = '' //string
      this.daoID = SHA256(realRandomString(64)).toString() //string, 生成方法hash(随机64位)，必须确保是唯一。Sha256 once after generating a 64-bit random string.
      this.daoAdmins = [] //array, 管理员metaId数组
      this.daoIntro = '' //string
      this.daoMission = '' //string
      this.daoTypes = [] //array, 值: "protocol/service/social/investment/grant/collector/culture",
      this.daoLogo = '' //string, logo所在的metafile
      this.governanceType = 'space' //string, 治理类型：ft/nft/bsv/space/none
      this.governanceSymbol = 'space' // {space/ft-symbol} string, Symbol of Governance Token.治理代币的Symbol。
      this.governanceToken = 'space' //string, 治理tokenId,若为源生币为"space", 如没有则为"none",
      this.daoWebsite = '' //string, DAO官网
      this.daoTwitter = '' //string, 推特账号
      this.daoDiscord = '' //string, discord地址
      this.daoTelegram = '' //string, telegrame地址
      this.daoTerms = '' //string,
      this.daoTermsContentType = 'text/markdwon' //string, 进入条款的内容格式
      this.joinDaoRequireTokenNumber = 1 //number, 加入该DAO的时候，需要最少治理token数量，如果治理Token为none，则忽略此值
      this.createProposalRequireTokenNumber = 10000 //number, 创建议题需要的治理Token数量，如果治理Token为none，则忽略此值
    },
  },
})
