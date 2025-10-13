import i18n from '@/utils/i18n'
import { Chains, Lang, PayPlatform, ToCurrency } from './enum'
import WechatPayIcon from '@/assets/images/wechatTitle.svg?url'
import AliPayIcon from '@/assets/images/alipay-circle.svg?url'
import SandPayIcon from '@/assets/images/sandPay_title.svg?url'
import ETHIcon from '@/assets/svg/eth.svg?url'
import MVC from '@/assets/svg/mvc.svg?url'
import POLYGON from '@/assets/svg/polygon.svg?url'

import { useUserStore } from './stores/user'
import { useRootStore } from './stores/root'
import { getRuntimeConfig } from './config/runtime-config'

// 使用函数而不是常量，这样可以获取最新的配置
export function getWhiteListCreateBroadcast(): string[] {
  try {
    const config = getRuntimeConfig()
    return config.whiteListCreateBroadcast
  } catch {
    // 如果配置未加载，返回默认值
    return [
      '16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo',
      '1APkQsxmFLtVKT9Fng7Z6t7pSJ3q17km1F',
      '12ghVWG1yAgNjzXj4mr3qK9DgyornMUikZ',
      '18fhajgmPcR6DVn5vQU2AqmkSzoGJBy9oV',
      '16cuqxU9RBJeTRvh7Ya6Bdk77acTNeeT7v',
    ]
  }
}

export interface Unit {
  unit: string
  sats: number
}

export interface ethBindingData {
  eth: string
  polygon: string
}

export enum UnitName {
  BSV = 'BSV',
  SATS = 'SATS',
  RMB = 'CNY',
}

export enum Platform {
  native = 1,
  app = 2,
  h5 = 3,
  jsapi = 4,
}

export const units: Unit[] = [
  {
    unit: UnitName.BSV,
    sats: 0.00000001,
  },
  {
    unit: UnitName.SATS,
    sats: Math.pow(10, 8),
  },
]

//export const whiteListCreateBroadcast=['16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo','1APkQsxmFLtVKT9Fng7Z6t7pSJ3q17km1F','12ghVWG1yAgNjzXj4mr3qK9DgyornMUikZ','18fhajgmPcR6DVn5vQU2AqmkSzoGJBy9oV','16cuqxU9RBJeTRvh7Ya6Bdk77acTNeeT7v']
export const whiteListCreateBroadcast = getWhiteListCreateBroadcast()

export const classifyList = [
  // @ts-ignore
  { classify: 'art', disabled: false, name: () => i18n.global.t('NFT.ClassifyList.art') },
  { classify: 'game', disabled: false, name: () => i18n.global.t('NFT.ClassifyList.game') },
  { classify: 'card', disabled: false, name: () => i18n.global.t('NFT.ClassifyList.card') },
  { classify: 'alias', disabled: true, name: () => i18n.global.t('NFT.ClassifyList.alias') },
  { classify: 'avatar', disabled: false, name: () => i18n.global.t('NFT.ClassifyList.avatar') },
  { classify: 'rights', disabled: false, name: () => i18n.global.t('NFT.ClassifyList.rights') },
  { classify: 'music', disabled: true, name: () => i18n.global.t('NFT.ClassifyList.music') },
  { classify: 'Name', disabled: true, name: () => i18n.global.t('NFT.ClassifyList.Name') },
]

export const initPagination: Pagination = {
  page: 1,
  pageSize: 16,
  loading: false,
  nothing: false,
  totalPages: 0,
  flag: '',
}

export const classifyName: { [key: string]: string } = {
  fragment: '碎片',
  art: '艺术',
  card: '纪念卡',
  alias: '别名',
  rights: '权益',
  game: '游戏',
  avatar: '头像',
  music: '音乐',
  article: '文章',
  emoji: '表情包',
  background: '背景',
}

export const pagination: Pagination = {
  page: 1,
  pageSize: 16,
  loading: false,
  nothing: false,
}

export interface PayPlatformItem {
  icon: string
  name: () => string
  platform: PayPlatform
  background: string
  disabled: () => boolean
  suffix: boolean
  key: string
}

function GetChain() {
  if (!window.ethereum) return ''
  const polygon = ['0x89', '0x13881']
  const eth = ['0x1', '0x5']
  if (polygon.includes(window.ethereum?.chainId)) {
    return 'polygon'
  } else if (eth.includes(window.ethereum?.chainId)) {
    return 'eth'
  }
}

export const payPlatformList: PayPlatformItem[] = [
  {
    icon: ETHIcon,
    name: () => {
      // @ts-ignore
      return `${import.meta.env.VITE_ETH_CHAIN.toUpperCase()}${
        // @ts-ignore
        i18n.global.locale === Lang.ZH ? '' : ' '
        // @ts-ignore
      }${i18n.global.t('Pay')}`
    },
    platform: PayPlatform.ETH,
    background: '#108EE9',
    key: import.meta.env.VITE_ETH_CHAIN,
    disabled: () => {
      let result = true
      const userStore = useUserStore()
      if (userStore.isAuthorized && userStore.user?.evmAddress && GetChain() === Chains.ETH) {
        result = false
      }
      return result
    },
    suffix: false,
  },
  {
    icon: POLYGON,
    name: () => {
      // @ts-ignore
      return `MATIC${i18n.global.locale === Lang.ZH ? '' : ' '}${i18n.global.t('Pay')}`
    },
    platform: PayPlatform.POLYGON,
    background: '#108EE9',
    key: 'MATIC',
    disabled: () => {
      let result = true
      const userStore = useUserStore()
      if (userStore.isAuthorized && userStore.user?.evmAddress && GetChain() === Chains.POLYGON) {
        result = false
      }
      return result
    },
    suffix: false,
  },
  // {
  //   icon: BSV,
  //   name: () => {
  //     // @ts-ignore
  //     return `BSV${i18n.global.locale === Lang.ZH ? '' : ' '}${i18n.global.t('Pay')}`
  //   },
  //   platform: PayPlatform.BSV,
  //   background: '#108EE9',
  //   key: 'BSV',
  //   disabled: () => false,
  //   suffix: false,
  // },
  {
    icon: MVC,
    name: () => {
      // @ts-ignore
      return `MVC${i18n.global.locale === Lang.ZH ? '' : ' '}${i18n.global.t('Pay')}`
    },
    platform: PayPlatform.SPACE,
    background: '#108EE9',
    key: 'MVC',
    disabled: () => false,
    suffix: false,
  },
  // {
  //   icon: SandPayIcon,
  //   name: () => {
  //     // @ts-ignore
  //     return i18n.global.t('quickPay')
  //   },
  //   key: 'UnionPay',
  //   platform: PayPlatform.UnionPay,
  //   background: '#FCA63D',
  //   disabled: () => {
  //     return false
  //   },
  //   suffix: true,
  // },
  // {
  //   icon: WechatPayIcon,
  //   name: () => {
  //     return i18n.global.t('wechatpay') as string
  //   },
  //   platform: PayPlatform.WechatPay,
  //   background: '#909399',
  //   disabled: () => {
  //     return true
  //   },
  //   suffix: false,
  // },
  // {
  //   icon: AliPayIcon,
  //   name: () => {
  //     return i18n.global.t('aliPay')
  //   },
  //   platform: PayPlatform.AliPay,
  //   background: '#108EE9',
  //   disabled: () => {
  //     return true
  //   },
  //   suffix: false,
  // },
]

export const payPlatformAmountRate = {
  [PayPlatform.ETH]: Math.pow(10, 18),
  [PayPlatform.POLYGON]: Math.pow(10, 18),
  [PayPlatform.BSV]: Math.pow(10, 8),
  [PayPlatform.SPACE]: Math.pow(10, 8),
  [PayPlatform.AliPay]: 100,
  [PayPlatform.AliPaySelf]: 100,
  [PayPlatform.BalancePay]: 100,
  [PayPlatform.QuickPay]: 100,
  [PayPlatform.UnionPay]: 100,
  [PayPlatform.WechatPay]: 100,
}

export const payPlatformAmountFix = {
  [PayPlatform.ETH]: 9,
  [PayPlatform.POLYGON]: 9,
  [PayPlatform.BSV]: 8,
  [PayPlatform.SPACE]: 8,
  [PayPlatform.AliPay]: 2,
  [PayPlatform.AliPaySelf]: 2,
  [PayPlatform.BalancePay]: 2,
  [PayPlatform.QuickPay]: 2,
  [PayPlatform.UnionPay]: 2,
  [PayPlatform.WechatPay]: 2,
}

export const payPlatformToCurrency = {
  [PayPlatform.BSV]: ToCurrency.BSV,
  [PayPlatform.ETH]: ToCurrency.ETH,
  [PayPlatform.POLYGON]: ToCurrency.POLYGON,
  [PayPlatform.AliPay]: ToCurrency.CNY,
  [PayPlatform.AliPaySelf]: ToCurrency.CNY,
  [PayPlatform.BalancePay]: ToCurrency.CNY,
  [PayPlatform.QuickPay]: ToCurrency.CNY,
  [PayPlatform.SPACE]: ToCurrency.MVC,
  [PayPlatform.UnionPay]: ToCurrency.CNY,
  [PayPlatform.WechatPay]: ToCurrency.CNY,
}

export const currentSupportChain: Array<{
  chainId: string
  chainName: string
}> = [
  {
    chainId: '0x1',
    chainName: 'eth',
  },
  {
    chainId: '0x5',
    chainName: 'goerli',
  },
  {
    chainId: '0x89',
    chainName: 'polygon',
  },
  {
    chainId: '0x13881',
    chainName: 'mumbai',
  },
]

export const chains = [
  {
    name: 'MVC',
    icon: MVC,
    value: 'mvc',
    disabled: () => false,
  },
  {
    name: import.meta.env.VITE_ETH_CHAIN.toUpperCase(),
    icon: ETHIcon,
    value: import.meta.env.VITE_ETH_CHAIN,
    address: () => {
      const userStore = useUserStore()
      return userStore.user?.evmAddress || ''
    },
    disabled: () => {
      const userStore = useUserStore()
      return !(userStore.isAuthorized && (userStore.user!.evmAddress || userStore.user!.ethAddress))
    },
  },
  {
    name: import.meta.env.MODE == 'gray' ? 'MUMBAI' : 'POLYGON',
    icon: POLYGON,
    value: import.meta.env.VITE_POLYGON_CHAIN,
    disabled: () => {
      const userStore = useUserStore()
      return !(userStore.isAuthorized && (userStore.user!.evmAddress || userStore.user!.ethAddress))
    },
    address: () => {
      return ''
    },
  },

  // {
  //   name: 'BSV',
  //   icon: BSV,
  //   value: 'bsv',
  //   disabled: () => false,
  // },
]
