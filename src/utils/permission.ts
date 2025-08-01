import { router } from '@/router'
import { useUserStore } from '@/stores/user'
import { ElMessageBox } from 'element-plus'

import { isApp, isIosApp, useRootStore } from '@/stores/root'
import { openLoading } from './util'
import { SDK } from './sdk'
import { usePostTagStore } from '@/stores/buzz/tag'
import { useMetaNameStore } from '@/stores/metaname'
import { useHead } from '@vueuse/head'
import { RouteLocationNormalized } from 'vue-router'
import { useImagePreview } from '@/stores/imagePreview'
import { MetaletWallet } from '@/utils/wallet/Metalet-wallet'
import { MetaletSDK } from '@/utils/metalet-sdk'
import { resolve } from 'path'
let loading: any

function sleep(time: number) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, time * 1000)
  })
}

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore()
  const rootStore = useRootStore()
  const metaNameStore = useMetaNameStore()
  const imagePreview = useImagePreview()
  const postTagStroe = usePostTagStore()

  // 当正在全屏预览图片时， 后退操作会变成关闭预览不后退
  if (imagePreview.visibale) {
    imagePreview.visibale = false
    return
  }

  SetMeta(to)

  // talk之间的页面跳转不处理
  const isTalkRoutes = (route: any) => route.name?.startsWith('talk')
  if (isTalkRoutes(to) && isTalkRoutes(from)) return next()

  loading = openLoading()
  // 设置页面标题
  document.title = `${to.meta.title ? to.meta.title + ' - ' : ''}` + import.meta.env.VITE_AppName

  if (to.name === 'register' && userStore.isAuthorized) {
    // 用户已登录时，先退出登录
    await userStore.logout(to)
    next()
  }

  // 获取换算费率
  if (!rootStore.isGetedExchangeRate) {
    rootStore.getExchangeRate()
  }

  // if (!rootStore.isCertedMetaIds.length) {
  //   rootStore.setSystemConfig()
  // }

  // if (userStore.showWallet) {
  //   // App 未获取用户信息，先去获取用户信息
  //   if (!userStore.isAuthorized && isApp) {
  //     await userStore.showWallet.appSetUserInfo()
  //   }
  // }

  // if (!userStore.showWallet) {
  //   if (userStore.getMetaletloginState) {
  //     await sleep(5)
  //     const address = await window.metaidwallet.getAddress()

  //     const { network } = await window.metaidwallet.getNetwork()

  //     const xpub = await window.metaidwallet.getXPublicKey()

  //     const metaidWallet = new MetaletWallet({
  //       xpub,
  //       address: address,
  //       metaIDJsWallet: window.metaidwallet,
  //       network: network,
  //     })
  //     userStore.$patch({
  //       wallet: null,
  //     })
  //     userStore.$patch({
  //       wallet: new MetaletSDK({
  //         network: import.meta.env.VITE_NET_WORK,
  //         wallet: metaidWallet,
  //       }),
  //     })
  //   } else {
  //     // userStore.$patch({
  //     //   wallet: null,
  //     // })
  //     userStore.$patch({ wallet: new SDK(import.meta.env.VITE_NET_WORK) })
  //   }
  // }

  // MetaName
  // if (
  //   to.path.indexOf('/metaname/') !== -1 &&
  //   (metaNameStore.MetaNameFeePerYear.third === 0 ||
  //     metaNameStore.MetaNameFeePerYear.four === 0 ||
  //     metaNameStore.MetaNameFeePerYear.five === 0)
  // ) {
  //   await metaNameStore.getMetaNameAllPrice()
  // }

  if (userStore.isAuthorized ) {
    // 用户已登录但未初始化sdk 里面钱包， 则去 初始化 sdk 里面的钱包
    // if (!userStore.showWallet.isInitSdked) {
    //   if (rootStore.GetIsImportMnemonicLogin) {
    //     await userStore.showWallet.initWalletFromMnemonic()
    //   } else {
    //     await userStore.showWallet.initWallet()
    //   }
    // }

    // 没有拿用户实名信息时， 先要去拿用户实名信息
    // if (!userStore.isGetedKycInfo) {
    
    // }

    // if (!userStore.isSetedisTestUser) {
      
    // }

    // 检查用户的token
    //await userStore.checkUserToken(to)
  }

  //  buzz 页面先获取一次 postTag 信息
  // if (postTagStroe.list.length <= 0) {
  //   await postTagStroe.getPostTags()
  // }

  // 检查跳转 路由是否有权限
  const isAuth = to.meta?.isAuth ? to.meta?.isAuth : false
  if (isAuth) {
    if (isIosApp ) {
      next()
    } else {
      if (userStore.isAuthorized) {
        next()
      } else {
        if (loading) loading.close()
        if (from.meta.isAuth || from.fullPath === '/') {
          next('/')
        }
        rootStore.$patch({
          isShowLogin: true,
        })
      }
    }
  } else {
    next()
  }
})

router.beforeResolve(() => {
  if (loading) loading.close()
})

function SetMeta(to: RouteLocationNormalized) {
  if (to.path.indexOf('/metaname/') !== -1) {
    useHead({
      title: 'MetaName, Web3 Naming Brings You Real Value',
      meta: [
        {
          name: 'description',
          content:
            'MetaName is a Decentralized, Open-sourced and Cross-chain Name System Based on MetaID Protocol',
        },
        {
          name: 'keywords',
          content: 'Name system, Web3 Naming, MetaName, Meta, MetaID',
        },
      ],
      link: [
        {
          rel: 'icon',
          key: 'favicon',
          href: '/metaname.ico',
        },
      ],
    })
  } else {
    useHead({
      title: `ShowNow`,
      meta: [
        {
          name: 'description',
          content: `ShowNow`,
        },
        {
          name: 'keywords',
          content: 'ShowNow',
        },
      ],
      link: [
        {
          rel: 'icon',
          key: 'favicon',
          href: '/favicon.ico',
        },
      ],
    })
  }
}

// router.afterEach((to, from, failure) => {
//   console.log(window.history)
//   //
// })
