import {
  Chains,
  ChannelPublicityType,
  GroupChannelType,
  RedPacketDistributeType,
  CreateGroupType,
} from '@/enum'
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
import { useUserStore } from './user'
import { Channel } from '@/@types/talk'
import { GetFT, GetGenesis } from '@/api/aggregation'
// @ts-ignore
import { SHA256 } from 'crypto-es/lib/sha256.js'
import Decimal from 'decimal.js-light'
import { useChainStore } from './chain'
import i18n from '@/utils/i18n'
import { ElMessage } from 'element-plus'
import { useSimpleTalkStore } from './simple-talk'

const MIN = new Decimal(0.0001).mul(10 ** 8).toNumber()
const MAX = new Decimal(10).mul(10 ** 8).toNumber()

// BTC红包特殊限制
const BTC_MIN_TOTAL_SATS = 2730 // 0.000015 BTC
const BTC_MAX_TOTAL_SATS = 10000000 // 0.1 BTC
export const BTC_MIN_PER_PACKET_SATS = 910 // 0.000008 BTC
const BTC_MAX_PER_PACKET_SATS = 100000 // 0.001 BTC
const BTC_MIN_QUANTITY = 3
const BTC_MAX_QUANTITY = 100

export const useCommunityFormStore = defineStore('communityForm', {
  state: () => {
    return {
      icon: null as File | null,
      description: '',
      cover: null as File | null,
      name: '',

      // metaName: null as MetaNameItem | null,
    }
  },

  getters: {
    isStep1Finished(state) {
      return !!state.icon && state.name.length > 0 //! !state.metaName && state.name.length > 0
      // return !!state.icon && state.name.length > 0
    },

    isStep2Finished(state) {
      return !!state.description && !!state.cover
    },

    isFinished(state) {
      // return !!state.icon && !!state.name
      return !!state.icon && !!state.name // && !!state.metaName
    },

    isAllFinished(state) {
      return (
        !!state.icon && !!state.description && !!state.name && !!state.cover // && !!state.metaName
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

      // this.metaName = null
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
      // metaName: null as MetaNameItem | null,
      name: '',
    }
  },

  getters: {
    isChanged(state) {
      const descriptionChanged = state.description !== state.original.description
      const nameChanged = state.name !== state.original.name
      return state.icon || descriptionChanged || state.cover || nameChanged // ||  !!state.metaName
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
      // this.metaName = null
      this.name = ''
    },

    resetInForm() {
      this.icon = null
      this.cover = null
      // this.metaName = null
      this.description = this.original.description
      this.name = this.original.name
    },

    async submit() {
      if (!this.isFinished) return

      // const metaName = await getCommunityAuth(this.original.communityId)
      // const replacingMetaName = this.metaName

      const layout = useLayoutStore()
      const user = useUserStore()
      layout.isShowCreateCommunityModal = false
      layout.isShowLoading = true
      const form = {
        icon: this.icon,
        description: this.description,
        cover: this.cover,
        original: this.original,
        // metaName,
        // replacingMetaName,
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
        case GroupChannelType.Broadcast:
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

      if (channel.roomType === ChannelPublicityType.Broadcast) {
        this.type = GroupChannelType.Broadcast
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

// MetaContract FT Token 接口类型
export interface MetaContractToken {
  codeHash: string
  genesis: string
  name: string
  symbol: string
  icon: string
  decimal: number
  sensibleId: string
  utxoCount: string
  confirmed: number
  confirmedString: string
  unconfirmed: number
  unconfirmedString: string
}

export const useRedPacketFormStore = defineStore('redPacketForm', {
  state: () => {
    const chainStore = useChainStore()
    const currentChain = chainStore.state.currentChain

    // 为不同链分别读取设置
    const savedSettings = localStorage.getItem(`redPacketFormSettings_${currentChain}`)

    // 根据当前链设置不同的默认值
    const isBtcChain = currentChain === 'btc'
    const defaultSettings = isBtcChain
      ? {
          amount: 0.00003, // 0.00003 BTC = 3000 sats
          each: 0.00001, // 0.00001 BTC = 1000 sats
          unit: 'BTC' as 'Sats' | 'Space' | 'BTC' | 'Token',
          quantity: 3,
          message: '',
          type: RedPacketDistributeType.Random,
        }
      : {
          amount: 0.1,
          each: 0.05,
          unit: 'Space' as 'Sats' | 'Space' | 'BTC' | 'Token',
          quantity: 2,
          message: '',
          type: RedPacketDistributeType.Random,
        }

    let settings = defaultSettings
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings)
        settings = { ...defaultSettings, ...parsed }
      } catch (e) {
        console.warn('Failed to parse saved red packet settings:', e)
      }
    }

    return {
      amount: settings.amount as number | '',
      each: settings.each as number,
      unit: settings.unit as 'Sats' | 'Space' | 'BTC' | 'Token',
      quantity: settings.quantity,
      message: settings.message,
      type: settings.type,
      nft: null as any,
      chain: null as any,
      currentRedPacketType: 'mvc' as 'btc' | 'mvc' | 'token', // 当前红包类型，独立于gas链
      // 新增 MetaContract Token 相关字段
      selectedToken: null as MetaContractToken | null,
      availableTokens: [] as MetaContractToken[],
    }
  },

  getters: {
    nicerAmount(state): string {
      if (state.amount === '') return '0'
      console.log('state.amount', state.amount)
      // 小于 0.01 的红包金额，会使用sat为单位

      return new Decimal(state.amount).toString()
      // return state.amount < 0.01 ? (state.amount * 100000000).toFixed(0) : state.amount.toFixed(2)
    },

    amountUnit(state) {
      return state.unit // 'sats'
      // if (state.amount === 0 || state.amount === '') return 'Space'
      // return state.amount < 0.01 ? 'sats' : 'Space'
    },

    nicerAmountWithUnit(state): any {
      return {
        amount: this.nicerAmount,
        unit: this.amountUnit,
      }
    },

    // 获取Token余额
    tokenBalance(state): string {
      if (!state.selectedToken) return '0'
      return new Decimal(state.selectedToken.confirmed)
        .div(new Decimal(10).pow(state.selectedToken.decimal))
        .toString()
    },

    // 生成Token图标背景色 (使用更温和的颜色)
    tokenIconBgColor(state): string {
      if (!state.selectedToken) return '#6366f1'
      // 使用genesis生成一致的背景色，但调整到合适的范围
      const hash = SHA256(state.selectedToken.genesis).toString()
      const r = Math.floor(parseInt(hash.slice(0, 2), 16) * 0.6) + 60 // 60-213
      const g = Math.floor(parseInt(hash.slice(2, 4), 16) * 0.6) + 60 // 60-213
      const b = Math.floor(parseInt(hash.slice(4, 6), 16) * 0.6) + 60 // 60-213
      return `rgb(${r}, ${g}, ${b})`
    },

    // 获取Token图标显示文字
    tokenIconText(state): string {
      if (!state.selectedToken) return ''
      return state.selectedToken.symbol.slice(0, 2).toUpperCase()
    },

    isFinished(state) {
      if (state.type === RedPacketDistributeType.Nft) {
        return !!state.each && !!state.quantity && !!state.nft && !!state.chain
      }

      // Token红包需要选择token
      if (state.unit === 'Token') {
        return !!state.amount && !!state.quantity && !!state.selectedToken
      }

      return !!state.amount && !!state.quantity
    },
  },

  actions: {
    // 获取MetaContract Token余额
    async loadTokenBalances() {
      try {
        if (window.metaidwallet && window.metaidwallet.token) {
          const tokens = await window.metaidwallet.token.getBalance()
          this.availableTokens = tokens || []
        }
      } catch (error) {
        console.warn('Failed to load token balances:', error)
        this.availableTokens = []
      }
    },

    // 选择Token
    selectToken(token: MetaContractToken) {
      this.selectedToken = token
      this.unit = 'Token'
      this.currentRedPacketType = 'token'

      // 重置金额，因为不同Token的精度可能不同
      this.amount = 0.1
      this.each = 0.05

      // 保存选择的Token到localStorage
      try {
        localStorage.setItem('selectedRedPacketToken', JSON.stringify(token))
      } catch (e) {
        console.warn('Failed to save selected token:', e)
      }
    },

    // 从localStorage恢复选择的Token
    loadSelectedToken() {
      try {
        const saved = localStorage.getItem('selectedRedPacketToken')
        if (saved) {
          this.selectedToken = JSON.parse(saved)
        }
      } catch (e) {
        console.warn('Failed to load selected token:', e)
      }
    },

    // 根据红包类型保存设置到 localStorage（独立于gas链）
    saveSettings() {
      // 使用红包类型而不是gas链来保存设置
      const redPacketType = this.currentRedPacketType
      const storageKey = `redPacketFormSettings_${redPacketType}`

      const settings = {
        amount: this.amount,
        each: this.each,
        unit: this.unit,
        quantity: this.quantity,
        message: this.message,
        type: this.type,
      }

      try {
        localStorage.setItem(storageKey, JSON.stringify(settings))
      } catch (e) {
        console.warn('Failed to save red packet settings:', e)
      }
    },

    // 根据红包类型加载特定的设置（独立于gas链）
    loadSettings() {
      // 使用红包类型而不是gas链来加载设置
      const redPacketType = this.currentRedPacketType

      // 为不同红包类型分别读取设置
      const storageKey = `redPacketFormSettings_${redPacketType}`
      const savedSettings = localStorage.getItem(storageKey)

      // 根据红包类型设置不同的默认值
      const isBtcRedPacket = redPacketType === 'btc'
      const isTokenRedPacket = redPacketType === 'token'

      let defaultSettings
      if (isBtcRedPacket) {
        defaultSettings = {
          amount: 0.00003, // 0.00003 BTC = 3000 sats
          each: 0.00001, // 0.00001 BTC = 1000 sats
          unit: 'BTC' as 'Sats' | 'Space' | 'BTC' | 'Token',
          quantity: 3,
          message: '',
          type: RedPacketDistributeType.Random,
        }
      } else if (isTokenRedPacket) {
        defaultSettings = {
          amount: 1, // Token默认1个
          each: 0.5, // 每个0.5
          unit: 'Token' as 'Sats' | 'Space' | 'BTC' | 'Token',
          quantity: 2,
          message: '',
          type: RedPacketDistributeType.Random,
        }
      } else {
        defaultSettings = {
          amount: 0.1,
          each: 0.05,
          unit: 'Space' as 'Sats' | 'Space' | 'BTC' | 'Token',
          quantity: 2,
          message: '',
          type: RedPacketDistributeType.Random,
        }
      }

      let settings = defaultSettings
      if (savedSettings) {
        try {
          const parsed = JSON.parse(savedSettings)
          settings = { ...defaultSettings, ...parsed }
        } catch (e) {
          console.warn('Failed to parse saved red packet settings:', e)
        }
      }

      // 更新状态
      this.amount = settings.amount
      this.each = settings.each
      this.unit = settings.unit
      this.quantity = settings.quantity
      this.message = settings.message
      this.type = settings.type

      // 如果是Token红包，加载选择的Token
      if (isTokenRedPacket) {
        this.loadSelectedToken()
      }
    },

    validateQuantity() {
      // 根据红包类型而不是gas链来验证
      const isBtcRedPacket = this.currentRedPacketType === 'btc'

      if (isBtcRedPacket) {
        // BTC红包特殊限制
        if (this.quantity < BTC_MIN_QUANTITY) {
          this.quantity = BTC_MIN_QUANTITY
        }
        if (this.quantity > BTC_MAX_QUANTITY) {
          this.quantity = BTC_MAX_QUANTITY
        }
      } else {
        // 其他类型红包的默认限制
        if (this.quantity < 1) {
          this.quantity = 1
        }
        if (this.quantity > 100) {
          this.quantity = 100
        }
      }

      // 金额校验
      if (this.type === RedPacketDistributeType.Random) {
        this.validateAmount()
      }
    },
    validateAmount() {
      // 根据红包类型而不是gas链来验证
      const isBtcRedPacket = this.currentRedPacketType === 'btc'
      const isTokenRedPacket = this.currentRedPacketType === 'token'

      if (isBtcRedPacket) {
        // BTC红包特殊限制
        if (this.unit === 'BTC') {
          // BTC单位验证
          const minTotalBtc = BTC_MIN_TOTAL_SATS / 100000000 // 转换为BTC
          const maxTotalBtc = BTC_MAX_TOTAL_SATS / 100000000 // 转换为BTC

          if (+this.amount < minTotalBtc) {
            this.amount = minTotalBtc
            // ElMessage.warning('BTC紅包總金額不能小於0.000015 BTC（1500聰）')
          }
          if (+this.amount > maxTotalBtc) {
            this.amount = maxTotalBtc
            // ElMessage.warning('BTC紅包總金額不能超過0.1 BTC（10000000聰）')
          }

          // 检查平均单红包金额限制
          const avgPerPacket = +this.amount / this.quantity
          const minAvgBtc = BTC_MIN_PER_PACKET_SATS / 100000000
          const maxAvgBtc = BTC_MAX_PER_PACKET_SATS / 100000000

          if (avgPerPacket < minAvgBtc) {
            this.amount = minAvgBtc * this.quantity
            // ElMessage.warning('BTC紅包平均金額不能小於0.000005 BTC（500聰）')
          }
          if (avgPerPacket > maxAvgBtc) {
            this.amount = maxAvgBtc * this.quantity
            // ElMessage.warning('BTC紅包平均金額不能超過0.001 BTC（100000聰）')
          }
        } else if (this.unit === 'Sats') {
          // 聪单位验证
          if (+this.amount < BTC_MIN_TOTAL_SATS) {
            this.amount = BTC_MIN_TOTAL_SATS
            // ElMessage.warning('BTC紅包總金額不能小於1500聰')
          }
          if (+this.amount > BTC_MAX_TOTAL_SATS) {
            this.amount = BTC_MAX_TOTAL_SATS
            // ElMessage.warning('BTC紅包總金額不能超過10000000聰')
          }

          // 检查平均单红包金额限制
          const avgPerPacket = +this.amount / this.quantity
          if (avgPerPacket < BTC_MIN_PER_PACKET_SATS) {
            this.amount = BTC_MIN_PER_PACKET_SATS * this.quantity
            // ElMessage.warning('BTC紅包平均金額不能小於500聰')
          }
          if (avgPerPacket > BTC_MAX_PER_PACKET_SATS) {
            this.amount = BTC_MAX_PER_PACKET_SATS * this.quantity
            // ElMessage.warning('BTC紅包平均金額不能超過100000聰')
          }
        }
      } else if (isTokenRedPacket && this.selectedToken) {
        // Token红包验证
        const tokenBalance = new Decimal(this.selectedToken.confirmed)
          .div(new Decimal(10).pow(this.selectedToken.decimal))
          .toNumber()

        // 最小金额为Token的最小单位
        const minAmount = new Decimal(1)
          .div(new Decimal(10).pow(this.selectedToken.decimal))
          .toNumber()

        if (+this.amount < minAmount * this.quantity) {
          this.amount = minAmount * this.quantity
          ElMessage.warning(
            `${this.selectedToken.symbol}红包总金额不能小于 ${minAmount * this.quantity}`
          )
        }

        if (+this.amount > tokenBalance) {
          this.amount = tokenBalance
          ElMessage.warning(`${this.selectedToken.symbol}红包总金额不能超过余额 ${tokenBalance}`)
        }

        // 检查平均单红包金额限制
        const avgPerPacket = +this.amount / this.quantity
        if (avgPerPacket < minAmount) {
          this.amount = minAmount * this.quantity
          ElMessage.warning(`${this.selectedToken.symbol}红包平均金额不能小于 ${minAmount}`)
        }
      } else {
        // 其他链的默认验证逻辑
        const min = MIN
        const max = MAX

        if (this.unit == 'Sats') {
          const minAmount = min * this.quantity
          const maxAmount = max // 2 Space = 200_000_000 sat
          if (+this.amount < minAmount) {
            this.amount = minAmount
          }
          if (+this.amount > maxAmount) {
            this.amount = maxAmount
          }
        } else {
          const minAmount = new Decimal(min)
            .div(10 ** 8)
            .mul(this.quantity)
            .toNumber()
          const maxAmount = new Decimal(max)
            .div(10 ** 8)
            .mul(this.quantity)
            .toNumber() // 2 Space = 200_000_000 sat
          if (+this.amount < minAmount) {
            this.amount = minAmount
          }
          if (+this.amount > maxAmount) {
            this.amount = maxAmount
          }
        }
      }
    },
    validateEach() {
      const min = MIN
      const max = MAX
      if (this.unit == 'Sats') {
        const minAmount = min
        const maxAmount = max
        if (this.each < minAmount) {
          this.each = minAmount
        }
        if (this.each > maxAmount) {
          this.each = maxAmount
        }
      } else {
        const minAmount = new Decimal(min).div(10 ** 8).toNumber()
        const maxAmount = new Decimal(max).div(10 ** 8).toNumber()
        if (this.each < minAmount) {
          this.each = minAmount
        }
        if (this.each > maxAmount) {
          this.each = maxAmount
        }
      }
    },

    reset() {
      const chainStore = useChainStore()
      const isBtcChain = chainStore.state.currentChain === 'btc'

      // 重置 nft 和 chain
      this.nft = null
      this.chain = null
      this.message = ''

      // 重置Token相关字段
      this.selectedToken = null
      this.availableTokens = []

      // 根据当前链设置不同的默认值
      if (isBtcChain) {
        this.amount = 0.00003
        this.each = 0.00001
        this.unit = 'BTC'
        this.quantity = 3
        this.type = RedPacketDistributeType.Random
        this.currentRedPacketType = 'btc'
      } else {
        this.amount = 0.1
        this.each = 0.05
        this.unit = 'Space'
        this.quantity = 2
        this.type = RedPacketDistributeType.Random
        this.currentRedPacketType = 'mvc'
      }
    },

    async submit() {
      // const talk = useTalkStore()
      const simpleTalk = useSimpleTalkStore()
      const user = useUserStore()
      const layout = useLayoutStore()
      const chainStore = useChainStore()

      if (!this.isFinished) return

      // Token红包特殊处理
      if (this.unit === 'Token' && this.selectedToken) {
        // TODO: 实现Token红包发送逻辑
        console.log('发送Token红包:', {
          token: this.selectedToken,
          amount: this.amount,
          quantity: this.quantity,
          message: this.message,
          type: this.type,
        })

        // 保存当前设置
        this.saveSettings()

        // ElMessage.success('Token红包功能开发中，敬请期待！')
        // return { success: false, message: 'Token红包功能开发中' }
      }

      // BTC红包特殊验证
      // if (chainStore.state.currentChain === 'btc') {
      //   // 费率设为固定值1，不需要验证范围
      //   // 用户选择的链就是要发送的红包类型
      // }

      // 保存当前设置
      this.saveSettings()

      layout.isShowLoading = true
      simpleTalk.isSendRedPacketinProgress = true
      const ret = await giveRedPacket(
        {
          amount: this.amount,
          message: this.message,
          each: this.each,
          quantity: this.quantity,
          chain: this.chain,
          nft: this.nft,
          type: this.type,
          unit: this.unit,
          token: this.selectedToken,
        },
        simpleTalk.activeChannel,
        simpleTalk.selfMetaId
        //simpleTalk.activeSubChannelId
      )
      simpleTalk.isSendRedPacketinProgress = false
      console.log('giveRedPacket ret', ret)
      return ret
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
      communityId: '', // string
      daoName: '', // string
      daoID: SHA256(realRandomString(64)).toString(), // string, 生成方法hash(随机64位)，必须确保是唯一。Sha256 once after generating a 64-bit random string.
      daoAdmins: [userStroe.user!.metaId], // array, 管理员metaId数组
      daoIntro: '', // string
      daoMission: '', // string
      daoTypes: [], // array, 值: "protocol/service/social/investment/grant/collector/culture",
      daoLogo: '', // string, logo所在的metafile
      governanceType: 'space', // string, 治理类型：ft/nft/bsv/space/none
      governanceSymbol: 'space', // {space/ft-symbol} string, Symbol of Governance Token.治理代币的Symbol。
      governanceToken: 'space', // string, 治理tokenId,若为源生币为"space", 如没有则为"none",
      daoWebsite: '', // string, DAO官网
      daoTwitter: '', // string, 推特账号
      daoDiscord: '', // string, discord地址
      daoTelegram: '', // string, telegrame地址
      daoTerms: '', // string,
      daoTermsContentType: 'text/markdwon', // string, 进入条款的内容格式
      joinDaoRequireTokenNumber: 1, // number, 加入该DAO的时候，需要最少治理token数量，如果治理Token为none，则忽略此值
      createProposalRequireTokenNumber: 10000, // number, 创建议题需要的治理Token数量，如果治理Token为none，则忽略此值
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
      this.communityId = '' // string
      this.daoName = '' // string
      this.daoID = SHA256(realRandomString(64)).toString() // string, 生成方法hash(随机64位)，必须确保是唯一。Sha256 once after generating a 64-bit random string.
      this.daoAdmins = [] // array, 管理员metaId数组
      this.daoIntro = '' // string
      this.daoMission = '' // string
      this.daoTypes = [] // array, 值: "protocol/service/social/investment/grant/collector/culture",
      this.daoLogo = '' // string, logo所在的metafile
      this.governanceType = 'space' // string, 治理类型：ft/nft/bsv/space/none
      this.governanceSymbol = 'space' // {space/ft-symbol} string, Symbol of Governance Token.治理代币的Symbol。
      this.governanceToken = 'space' // string, 治理tokenId,若为源生币为"space", 如没有则为"none",
      this.daoWebsite = '' // string, DAO官网
      this.daoTwitter = '' // string, 推特账号
      this.daoDiscord = '' // string, discord地址
      this.daoTelegram = '' // string, telegrame地址
      this.daoTerms = '' // string,
      this.daoTermsContentType = 'text/markdwon' // string, 进入条款的内容格式
      this.joinDaoRequireTokenNumber = 1 // number, 加入该DAO的时候，需要最少治理token数量，如果治理Token为none，则忽略此值
      this.createProposalRequireTokenNumber = 10000 // number, 创建议题需要的治理Token数量，如果治理Token为none，则忽略此值
    },
  },
})
