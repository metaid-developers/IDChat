import { SignUserType, ToCurrency, NodeName } from '@/enum'
import { defineStore } from 'pinia'
import { GetCertMetaIdList } from '@/api/aggregation'
import i18n from '@/utils/i18n'
import { GetCertifiedMetaId } from '@/api/strapi'
import { ElMessage } from 'element-plus'
import { useConnectionStore } from './connection'
import { useUserStore } from './user'

export interface SignBaseInfo {
  userType: SignUserType
  areaCode: string
  phone: string
  email: string
}
interface RootState {
  signBaseInfo: SignBaseInfo
  sendCodeTimer: number
  showCreatePubkey: boolean
  redirectUri: string
  exchangeRate: ExchangeRate[]
  isGetedExchangeRate: boolean
  isShowLogin: boolean
  isShowMetaMak: boolean
  isCertedMetaIds: string[]
  currentPrice: ToCurrency
  theme: 'light' | 'dark'

  showLoginBindEvmAccount: {
    isUpdatePlan: boolean
    loginedButBind: boolean
    bindEvmChain: string
  }
  chainWhiteList: Array<string>
  updatePlanRes: {
    registerTime: number
    signHash: string
  } | null
  updatePlanWhiteList: string[]
  showDiffLang?: number
  isImportMnemonicLogin?: boolean
  isRereshData?: boolean
  myBlackList?: string[]
  metaletWhiteProtocolList: NodeName[]
  bandProposalList: string[]
  isWebView: boolean
}

const UA = window.navigator.userAgent.toLowerCase()
// 根据尺寸判断是否是移动端
export const isMobile = window.innerWidth <= 1024
export const isShortDevice = window.innerHeight <= 700
export const isAndroid = !!(UA && UA.indexOf('android') > 0)
export const isIOS = !!(UA && /iphone|ipad|ipod|ios/.test(UA))
export const isWechat = !!(UA && /micromessenger/.test(UA))
export const isApp = !!window.appMetaIdJsV2
export const isSafari = !!(UA && /safari/.test(UA) && !/chrome/.test(UA))
export const isIosApp = isIOS && isApp
export const isAndroidApp = isApp && isAndroid
export const emptySignBaseInfo = {
  userType: SignUserType.Phone,
  areaCode: '86',
  phone: '',
  email: '',
}

const theme = localStorage.theme
  ? localStorage.theme
  : window.matchMedia('(prefers-color-scheme: dark)').matches
  ? 'dark'
  : 'light'

const initCurrentPrice = window.localStorage.getItem('currentPrice')
  ? window.localStorage.getItem('currentPrice')
  : i18n.global.locale.value === 'en'
  ? 'USD'
  : 'CNY'

const polygonChian = ['0x89', '0x13881']
const ethChian = ['0x1', '0x5']

export const useRootStore = defineStore('root', {
  state: () =>
    <RootState>{
      isCertedMetaIds: [],
      showCreatePubkey: false,
      signBaseInfo: emptySignBaseInfo,
      sendCodeTimer: 60,
      redirectUri: '/',
      exchangeRate: [],
      isGetedExchangeRate: false,
      isShowLogin: false,
      isShowMetaMak: false,
      showLoginBindEvmAccount: {
        isUpdatePlan: false,
        loginedButBind: false,
        bindEvmChain: '',
      },
      currentPrice: initCurrentPrice,
      theme,
      chainWhiteList: import.meta.env.MODE == 'gray' ? ['0x5', '0x13881'] : ['0x1', '0x89'],
      updatePlanRes: null,
      updatePlanWhiteList: [
        '0x0c45B536C69AB0B8806a65C94BA8C8e6e71Ba7c',
        '0x4E5e9F98089De7f953FD099a54b04d218B3f08eb',
        '0x1391aeb954c2a85e69a29b39cd78b47f7cc6aec9',
        '0xEB2db37BAEA78f6eBB10ec80Ff96caD9f86dfe7C',
      ],
      isImportMnemonicLogin: localStorage.getItem('isImportMnemonicLogin') || false,
      isRereshData: false,
      myBlackList: [],
      metaletWhiteProtocolList: [
        NodeName.SendMoney,
        NodeName.SimpleCommunityJoin,
        NodeName.Name,
        NodeName.SimpleVote,
      ],
      bandProposalList: [
        'a6931c4487cf0728cb2a63357fe88a2f156d2225',
        'ae3063476b431ca43df8574b05095f9a3721b40f',
        'b6c2d447f308aa02225f2938d1551c3c6891f9ec',
        '160c8b1b10839d7d5ccde756d0f9c01fb894945c',
        '2ba561b144b1db16d866e0801cbf44c8a4a5cb62',
        'bc4e1e7875a9f776dc493a0ae023866d829ef030',
        '6d5e30f1d4c84f0e11fa06aca341a7183d431008',
        '2bf3f5ebd0e194ed47b150ac4ceafbaad4f1e126',
        '05f0850d892f47a3e15ae97adda25ab68eb85578',
      ],
      isWebView: false, //false

      // showDiffLang:
      //   localStorage.getItem('showDiffLang') && Number(localStorage.getItem('showDiffLang')),
    },
  getters: {
    GetIsImportMnemonicLogin: state => {
      return state.isImportMnemonicLogin || localStorage.getItem('isImportMnemonicLogin')
    },
    GetCurrentChain: state => {
      window.ethereum && polygonChian.includes(window.ethereum?.chainId)
        ? (state.currentChain = 'polygon')
        : window.ethereum && ethChian.includes(window.ethereum?.chainId)
        ? (state.currentChain = 'eth')
        : ''
    },
    currentPriceSymbol: state => {
      const Symbols = {
        USD: '$',
        CNY: '￥',
      }
      return Symbols[state.currentPrice]
    },
    currentExchangeRate: state =>
      state.exchangeRate.find(item => item.symbol === state.currentPrice),
  },
  actions: {
    // updateShowDiffLang(payload: number) {
    //   this.showDiffLang = payload
    //   localStorage.setItem('showDiffLang', String(payload))
    // },
    async updateShowCreatePubkey(playload: boolean) {
      this.showCreatePubkey = playload
    },

    async checkBtcAddressSameAsMvc() {
      const connectionStore = useConnectionStore()
      const userStore = useUserStore()
      const mvcAddress = await connectionStore.adapter.getMvcAddress() //userStore.last.address
      const btcAddress = await connectionStore.adapter.getBtcAddress()
      if (mvcAddress && btcAddress && mvcAddress !== btcAddress) {
        throw new Error(`${i18n.global.t('btcSameAsMvcError')}`)
      }
    },

    refreshData(payload: boolean) {
      this.isRereshData = payload
    },
    updateLoginFromMnemonic(payload: boolean) {
      this.isImportMnemonicLogin = payload
      localStorage.setItem('isImportMnemonicLogin', String(payload))
    },
    updateShowLoginBindEvmAccount(payload: {
      isUpdatePlan: boolean
      loginedButBind: boolean
      bindEvmChain: string
    }) {
      this.showLoginBindEvmAccount = payload
    },
    updateAccountPlan(payload: { registerTime: number; signHash: string } | null) {
      this.updatePlanRes = payload
    },
    getExchangeRate() {
      this.isGetedExchangeRate = true
      fetchExchangeRate().then((res: any) => {
        if (res) {
          this.exchangeRate = res
        }
      })
      // setInterval(() => {
      //   fetchExchangeRate().then((res: any) => {
      //     if (res) {
      //       this.exchangeRate = res
      //     }
      //   })
      // }, 30 * 1000)
    },
    changePrices(payload: string) {
      if (payload == this.currentPrice) {
        return
      } else {
        this.currentPrice = payload
        window.localStorage.setItem('currentPrice', payload)
      }
    },

    startSendCodeCountdown() {
      setInterval(() => {
        if (this.sendCodeTimer > 0) {
          this.sendCodeTimer--
        }
      }, 1000)
    },
    setSystemConfig() {
      GetCertifiedMetaId().then(res => {
        if (res) {
          this.isCertedMetaIds = res.data.list
        }
      })
    },

    checkWebViewBridge(): boolean {
      if (isIOS || isAndroid) {
        if (window?.navigator) {
          const userAgent = window?.navigator?.userAgent || ''
          if (userAgent == 'IDChat-iOS' || userAgent == 'IDChat-Android') {
            this.isWebView = true
            console.log('当前环境是app webview')
            return true
          } else {
            return false //false
          }
        } else {
          return false
        }
      } else {
        return false
      }
    },
  },
})

function fetchExchangeRate() {
  return new Promise(resolve => {
    fetch(`${import.meta.env.VITE_BASEAPI}/metaid-base/v1/exchange/rates`)
      .then(response => {
        return response.json()
      })
      .then(res => {
        if (res?.result) {
          resolve(res.result.rates)
        }
      })
      .catch(() => resolve(null))
  })
}
