import { defineStore, storeToRefs } from 'pinia'
import { useLocalStorage, type RemovableRef } from '@vueuse/core'
import { type UserInfo, getUserInfoByAddress } from '@/api/man'
import { useConnectionStore } from '@/stores/connection'
import { useLayoutStore } from './layout'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import {getEcdhPublickey} from '@/wallet-adapters/metalet'
export const useUserStore = defineStore('user', {
  state: () => {
    return {
      last: useLocalStorage('user-info', {
        address: '',
        avatar: '',
        avatarId: '',
        background: '',
        bio: '',
        bioId: '',
        blocked: false,
        chainName: 'mvc',
        fdv: 0,
        followCount: 0,
        isInit: false,
        metaid: '',
        globalMetaId: '',  // 新增：全局 MetaId，支持多链（MVC/BTC/DOGE）
        name: '',
        nameId: '',
        nftAvatar: '',
        nftAvatarId: '',
        number: 0,
        pdv: 0,
        pinId: '',
        soulbondToken: '',
        unconfirmed: '',
        chatpubkey:''
      } as UserInfo) as RemovableRef<UserInfo>,
    }
  },

  getters: {
    has: (state) => !!state.last,
    isAuthorized: (state) => {
      const connectedStore = useConnectionStore()
      return !!(state.last.address && state.last.globalMetaId && connectedStore.last.status == 'connected')
    },

  },

   actions: {

      // async checkUserIsChange(){
      //   debugger
      // const connectedStore = useConnectionStore()
      // const router=useRouter()
      // const i18n=useI18n()
      //  const res=await connectedStore.adapter.getAddress()

      //     if (res?.status == 'not-connected' || this.last?.address !== res) {
      //     connectedStore.disconnect(router)
      //     ElMessage.warning({
      //     message:i18n.t('account.change'),
      //     type: 'warning',
      //     })
      //     }
      // },

      async updateUserInfo(userInfo:Partial<UserInfo>){
        
        this.last={...this.last,...userInfo}
      },

      /**
       * 初始化用户信息 - 确保老用户有正确的 globalMetaId
       * 在应用启动时调用，如果用户已登录但没有 globalMetaId，则通过 API 获取
       */
      async ensureGlobalMetaId(): Promise<boolean> {
        // 如果没有登录，跳过
        if (!this.last?.address) {
          return false
        }
        
        // 如果已经有 globalMetaId，跳过
        if (this.last.globalMetaId && this.last.globalMetaId !== this.last.metaid) {
          console.log('✅ 用户已有 globalMetaId:', this.last.globalMetaId)
          return true
        }
        
        console.log('🔄 检测到老用户，尝试获取 globalMetaId...')
        
        try {
          // 1. 先尝试从钱包获取
          if (window.metaidwallet?.getGlobalMetaid) {
            const globalMetaIdInfo = await window.metaidwallet.getGlobalMetaid()
            if (globalMetaIdInfo?.mvc?.globalMetaId) {
              this.last.globalMetaId = globalMetaIdInfo.mvc.globalMetaId
              console.log('✅ 从钱包获取到 globalMetaId:', this.last.globalMetaId)
              return true
            } else if (globalMetaIdInfo?.btc?.globalMetaId) {
              this.last.globalMetaId = globalMetaIdInfo.btc.globalMetaId
              console.log('✅ 从钱包获取到 globalMetaId:', this.last.globalMetaId)
              return true
            } else if (globalMetaIdInfo?.doge?.globalMetaId) {
              this.last.globalMetaId = globalMetaIdInfo.doge.globalMetaId
              console.log('✅ 从钱包获取到 globalMetaId:', this.last.globalMetaId)
              return true
            }
          }
          
          // 2. 通过 API 获取
          const userRes = await getUserInfoByAddress(this.last.address)
          if (userRes?.globalMetaId) {
            this.last.globalMetaId = userRes.globalMetaId
            console.log('✅ 从 API 获取到 globalMetaId:', this.last.globalMetaId)
            return true
          }
          
          console.warn('⚠️ 无法获取 globalMetaId，用户需要重新登录')
          return false
        } catch (e) {
          console.error('❌ 获取 globalMetaId 失败:', e)
          return false
        }
      },

      async setUserInfo(address: string) {
        
      const user: UserInfo = this.last
        ? (JSON.parse(JSON.stringify(this.last)) as UserInfo)
        : {
            address: '',
            avatar: '',
            avatarId: '',
            background: '',
            bio: '',
            bioId: '',
            blocked: false,
           chatpubkey:'',
            chainName: 'mvc',
            fdv: 0,
            followCount: 0,
            isInit: false,
            metaid: '',
            globalMetaId: '',  // 新增：全局 MetaId
            name: '',
            nameId: '',
            nftAvatar: '',
            nftAvatarId: '',
            number: 0,
            pdv: 0,
            pinId: '',
            soulbondToken: '',
            unconfirmed: '',
          }

      if (!address) {
        return user
      }

      const userRes = await getUserInfoByAddress(address)
      
      // 如果 API 没有返回 globalMetaId，尝试从钱包获取
      if (!userRes.globalMetaId && window.metaidwallet?.getGlobalMetaid) {
        try {
          const globalMetaIdInfo = await window.metaidwallet.getGlobalMetaid()
          // 优先使用 mvc 链的 globalMetaId，因为 MVC 链是主链
          if (globalMetaIdInfo?.mvc?.globalMetaId) {
            userRes.globalMetaId = globalMetaIdInfo.mvc.globalMetaId
          } else if (globalMetaIdInfo?.btc?.globalMetaId) {
            userRes.globalMetaId = globalMetaIdInfo.btc.globalMetaId
          } else if (globalMetaIdInfo?.doge?.globalMetaId) {
            userRes.globalMetaId = globalMetaIdInfo.doge.globalMetaId
          }
        } catch (e) {
          console.warn('从钱包获取 globalMetaId 失败:', e)
        }
      }
      
      // 如果最终还是没有 globalMetaId，提示用户重新登录
      if (!userRes.globalMetaId) {
        console.error('❌ 无法获取 globalMetaId，请用户重新登录')
        ElMessage.error('登录信息不完整，请重新登录')
        this.clearUserInfo()
        throw new Error('无法获取 globalMetaId，请重新登录')
      }
      
      // debugger
      // if(!userRes.chatpubkey){
      //      const res= await getEcdhPublickey()
      //      if(res.ecdhPubKey){
      //         userRes.chatpubkey=res.ecdhPubKey
      //      }
      // }
      try {
        if (userRes) {
          // 直接使用 API 返回的 globalMetaId
          this.last = userRes
          
          if (!this.last.name) {
            console.log(this.last, 'this.last')
            const layoutStore = useLayoutStore()
            layoutStore.isShowProfileEditModal = true
          }

          // 用户登录成功后，初始化简化聊天系统
          if (this.last.metaid) {
           
          }

          return this.last
        }
      } catch (e: any) {
        ElMessage.error(e.message)
      }

      return this.last
    },

    clearUserInfo() {
      if (!this.last) return
      
      // 用户登出时，重置聊天系统（延迟执行避免循环依赖）
      setTimeout(async () => {
        try {
          const { useSimpleTalkStore } = await import('@/stores/simple-talk')
          const simpleTalkStore = useSimpleTalkStore()
          await simpleTalkStore.reset()
          console.log('✅ 用户登出，聊天数据已清理')
        } catch (error) {
          console.warn('⚠️ 登出时清理聊天数据失败:', error)
        }
      }, 100)
      
      this.last = {
        address: '',
        avatar: '',
        avatarId: '',
        background: '',
        bio: '',
        bioId: '',
        blocked: false,
        chainName: 'mvc',
        fdv: 0,
        followCount: 0,
        isInit: false,
        metaid: '',
        globalMetaId: '',  // 新增：全局 MetaId
        name: '',
        nameId: '',
        nftAvatar: '',
        nftAvatarId: '',
        number: 0,
        pdv: 0,
        pinId: '',
        soulbondToken: '',
        unconfirmed: '',
        chatpubkey: ''
      }
    }
   
  }
})
// import { encode, decode } from 'js-base64'
// import { SDK } from '@/utils/sdk'
// import { toRaw } from 'vue'
// import { GetUserKycInfo } from '@/api/wxcore'
// import { GetProdTestMetaIds } from '@/api/strapi'
// import axios from 'axios'
// import { ElMessageBox } from 'element-plus'
// import { SdkPayType } from '@/enum'
// import {
//   RouteLocationNormalized,
//   RouteLocationNormalizedLoaded,
//   useRoute,
//   useRouter,
// } from 'vue-router'
// import { router } from '@/router'
// import { useTalkStore } from './talk'
// import { useRootStore } from './root'
// import detectEthereumProvider from '@metamask/detect-provider'
// import { useGenesisStore } from './genesis'
// import { setUser } from '@sentry/vue'
// import { MetaletSDK } from '@/utils/metalet-sdk'

// export interface KycInfoTypes {
//   name: string
//   idCard: string
//   bank_card: string
//   phone: string
// }
// interface UserState {
//   user: null | UserInfo
//   metaletLogin: boolean
//   password: string | null
//   isNeedConfirm?: {
//     me: boolean
//     bsv: boolean
//   }
//   wallet: SDK | MetaletSDK | null
//   //metaletWallet?: MetaletSDK | null
//   kycInfo: null | KycInfoTypes
//   isGetedKycInfo: boolean
//   isSetedisTestUser: boolean
//   isTestUser: boolean
//   sdkPayConfirm: {
//     [key in SdkPayType]: {
//       value: number
//       visible: boolean
//     }
//   }
//   sdkPayment: SdkPayType
// }

// const userkey = encode('user')

// let user: any = null
// if (window.localStorage.getItem(userkey)) {
//   user = decode(window.localStorage.getItem(userkey)!)
//   user = JSON.parse(user)
//   setUser({
//     id: user.metaId,
//     email: user.phone || user.email,
//     username: user.name,
//   })
// }
// const passwordkey = encode('password')
// let password = ''
// if (window.localStorage.getItem(passwordkey)) {
//   password = decode(window.localStorage.getItem(passwordkey)!)
// }

// const sdkPayConfirmPaymentKey = 'SDK-PAYMENT'
// const sdkPayConfirmHideKey = {
//   [SdkPayType.ME]: 'HIDE-ME-CONFIRM',
//   [SdkPayType.SPACE]: 'HIDE-SPACE-CONFIRM',
// }
// const sdkPayConfirmMaxKey = {
//   [SdkPayType.ME]: 'MAX-ME',
//   [SdkPayType.SPACE]: 'MAX-SPACE',
// }
// const sdkPayConfirm = {
//   [SdkPayType.ME]: {
//     value: localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.ME])
//       ? parseInt(localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.ME])!)
//       : 5,
//     visible: localStorage.getItem(sdkPayConfirmHideKey[SdkPayType.ME]) ? false : true,
//   },
//   [SdkPayType.SPACE]: {
//     value: localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.SPACE])
//       ? parseInt(localStorage.getItem(sdkPayConfirmMaxKey[SdkPayType.SPACE])!)
//       : 3000,
//     visible: localStorage.getItem(sdkPayConfirmHideKey[SdkPayType.SPACE]) ? false : true,
//   },
// }

// if (user && password) {
//   setTimeout(() => {
//     const genesisStore = useGenesisStore()
//     genesisStore.initGenesis()
//   })
// }

// export const useUserStore = defineStore('user', {
//   state: () =>
//     <UserState>{
//       user: user,
//       password,
//       wallet: null,
//       //metaletWallet: null,
//       kycInfo: null,
//       isGetedKycInfo: false,
//       isSetedisTestUser: false,
//       isTestUser: false,
//       sdkPayConfirm: sdkPayConfirm,
//       metaletLogin: Boolean(Number(localStorage.getItem('useMetaletLogin'))) || Boolean(0),
//       sdkPayment: localStorage.getItem(sdkPayConfirmPaymentKey) || SdkPayType.ME,
//     },
//   getters: {
//     getMetaletloginState: state => {
//       console.log('222222', Boolean(0))
//       return state.metaletLogin
//     },
//     getSdkPayment: state => {
//       if (state.metaletLogin) {
//         return SdkPayType.SPACE
//       } else {
//         return state.sdkPayment
//       }
//     },
//     isAuthorized: state => <boolean>!!(state.user && state.user.token) || state.metaletLogin,
//     userName: state => {
//       if (state.user && state.user.token) {
//         // @ts-ignore
//         return state.user!.userType === 'email' || state.user!.registerType === 'email'
//           ? state.user!.email!
//           : state.user!.phone!
//       } else {
//         return undefined
//       }
//     },
//     token: state => {
//       if (state.user && state.user.token) {
//         return state.user.token
//       } else {
//         return undefined
//       }
//     },
//     showWallet: state => {
//       if (state.metaletLogin) {
//         return <MetaletSDK>(state.wallet ? toRaw(state.wallet) : state.wallet)
//       }
//       return <SDK>(state.wallet ? toRaw(state.wallet) : state.wallet)
//     },
//   },
//   actions: {
//     logout(route: RouteLocationNormalizedLoaded) {
//       return new Promise<void>(async resolve => {
//         const talkStore = useTalkStore()
//         const rootStore = useRootStore()
//         const genesStore = useGenesisStore()
//         //
//         // 只保存pwaInstall状态
//         const pwaInstall = localStorage.getItem('pwaInstall')
//         localStorage.clear()
//         if (pwaInstall) localStorage.setItem('pwaInstall', pwaInstall)

//         if (rootStore.updatePlanRes) rootStore.updateAccountPlan(null)
//         if (rootStore.isShowLogin) rootStore.$patch({ isShowLogin: false })
//         if (this.metaletLogin) {
//           this.updateMetaletLoginState(false)
//           localStorage.removeItem('useMetaletLogin')
//           const state = await window.metaidwallet.isConnected()
//           if (state) {
//             await window.metaidwallet.disconnect()
//           }
//         }
//         if (window.provider) window.provider = undefined
//         // localStorage.removeItem(encode('user'))
//         // localStorage.removeItem(encode('password'))
//         // localStorage.removeItem('walletconnect')
//         try {
//           rootStore.updateShowLoginBindEvmAccount({
//             isUpdatePlan: false,
//             loginedButBind: false,
//             bindEvmChain: '',
//           })
//           this.user = null
//           this.password = null
//         } catch {}

//         talkStore.reset()
//         genesStore.initGenesis()
//         //
//         if (route.meta.isAuth) router.push('/')
//         // talk的路由跳buzz推荐页
//         if (route.path.includes('talk')) router.push('/buzz/recommend')

//         resolve()
//       })
//     },

//     updateUserInfo(userInfo: Partial<SetUserInfo>) {
//       return new Promise<void>(async resolve => {
//         console.log('userInfo', userInfo)
//         //
//         const { password, ...data } = userInfo

//         // 兼容处理
//         // @ts-ignore
//         if (!data.address && data.rootAddress) {
//           // @ts-ignore
//           data.address = data.rootAddress
//         }
//         // @ts-ignore
//         if (!data.userType && data.registerType) {
//           // @ts-ignore
//           data.userType = data.registerType
//         }
//         // localStorage.setItem('user', JSON.stringify(data))
//         // window.localStorage.setItem('password', password)

//         localStorage.setItem(encode('user'), encode(JSON.stringify(data)))

//         if (password) {
//           window.localStorage.setItem(encode('password'), encode(password))
//         }

//         try {
//           this.user = data
//           console.log('this.uesr', this.user)
//           //
//         } catch {}

//         const genesisStore = useGenesisStore()
//         genesisStore.initGenesis()
//         resolve()
//       })
//     },

//     updateMetaletLoginState(isUseMetalet: boolean) {
//       this.metaletLogin = isUseMetalet
//       localStorage.setItem('useMetaletLogin', Number(isUseMetalet).toString())
//     },

//     setKycInfo() {
//       return new Promise<void>(async resolve => {
//         try {
//           this.isGetedKycInfo = true
//           const res = await GetUserKycInfo(this.user!.metaId!)
//           if (res.code === 0) {
//             this.kycInfo = {
//               name: res.data.name,
//               idCard: res.data.id_card,
//               phone: res.data.phone,
//               bank_card: res.data.bank_card,
//             }
//             resolve()
//           }
//         } catch (error) {
//           resolve()
//         }
//       })
//     },
//     setIsTestUser() {
//       return new Promise<void>(async resolve => {
//         this.isSetedisTestUser = true
//         const res = await GetProdTestMetaIds({
//           metaId: this.user!.metaId!,
//           _limit: 1,
//         }).catch(() => {
//           this.isSetedisTestUser = false
//           resolve()
//         })
//         if (res) {
//           if (res.length > 0) {
//             this.isTestUser = true
//           }
//         }
//         resolve()
//       })
//     },
//     checkUserToken(route: RouteLocationNormalized) {
//       return new Promise<void>(async (resolve, reject) => {
//         if (this.metaletLogin) {
//           resolve()
//           return
//         }
//         const res = await axios
//           .get(
//             `${import.meta.env.VITE_BASEAPI}/showpaycore/api/v1/user/checkUserToken?user_ctoken=${
//               this.user!.token
//             }`
//           )
//           .catch(() => resolve())
//         if (res.data && res.data.code === 0) {
//           resolve()
//         } else {
//           this.logout(route)
//           const rootStore = useRootStore()
//           ElMessageBox.alert('登录信息过期，请重新登录', '温馨提示', {
//             confirmButtonText: '去登录',
//           }).then(() => {
//             rootStore.$patch({ isShowLogin: true })
//           })
//           reject(new Error('登录信息过期'))
//         }
//       })
//     },
//     changeSdkPayConfirm(type: 'visible' | 'value', value: number | boolean, payType: SdkPayType) {
//       if (type === 'visible') {
//         if (value) {
//           localStorage.removeItem(sdkPayConfirmHideKey[payType])
//         } else {
//           localStorage.setItem(sdkPayConfirmHideKey[payType], true.toString())
//         }
//         this.sdkPayConfirm[payType].visible = value as boolean
//       } else {
//         localStorage.setItem(sdkPayConfirmMaxKey[payType], value.toString())
//         this.sdkPayConfirm[payType].value = value as number
//       }
//     },
//     changeSdkPayment(payType: SdkPayType) {
//       if (payType === this.sdkPayment) return
//       localStorage.setItem(sdkPayConfirmPaymentKey, payType)
//       this.sdkPayment = payType
//     },
//   },
// })

// export function getUserName() {
//   if (localStorage.getItem('user')) {
//     const user = JSON.parse(localStorage.getItem('user')!)
//     return user!.userType === 'email' ? user!.email! : user!.phone!
//   } else {
//     return undefined
//   }
// }

// export function getToken() {
//   if (localStorage.getItem('user')) {
//     const user = JSON.parse(localStorage.getItem('user')!)
//     return user.token
//   } else {
//     return undefined
//   }
// }
