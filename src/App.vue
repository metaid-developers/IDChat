<template>
  <RouterView
    v-if="
      $route.path === '/' ||
        $route.path.indexOf('/metaname') !== -1 ||
        $route.path.indexOf('/home') !== -1
    "
  />
  <div class="flex main" v-else>
    <LeftNavigationVue v-if="!blackRoute.includes(route.name)" />
    <PullDownVue class="flex1">
      <template #default>
        <div class="flex1 main-right" ref="MainRightRef">
          <RouterView v-slot="{ Component, route }">
            <KeepAlive>
              <component
                :is="Component"
                :key="route.fullPath"
                v-if="route.meta && route.meta.keepAlive"
              />
            </KeepAlive>
            <component
              :is="Component"
              :key="routeKey(route)"
              v-if="!route.meta || (route.meta && !route.meta.keepAlive)"
            />
          </RouterView>
        </div>
      </template>
    </PullDownVue>
  </div>
  <DragonBall />
  <SearchModal />
  <ConnectWalletModalVue />
  <WalletMissingModal />
  <!-- <UserCardFloater /> -->
  <!-- <PWA /> -->

  <!-- 图片预览 -->
  <ImagePreviewVue />
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, nextTick, watch, provide ,onBeforeUnmount,onUnmounted,computed} from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useRootStore } from '@/stores/root'
import { useUserStore } from '@/stores/user'

// VConsole 调试工具 - 针对特定地址显示
const DEBUG_ADDRESSES = ['195gtuVbW9DsKPnSZLrt9kdJrQmvrAt7e3']
let vConsoleInstance: any = null

const initVConsoleForDebug = async (address: string) => {
  if (DEBUG_ADDRESSES.includes(address) && !vConsoleInstance) {
    try {
      // const VConsole = (await import('vconsole')).default
      // vConsoleInstance = new VConsole()
      // console.log('🔧 VConsole 已为调试地址启用:', address)
    } catch (error) {
      console.error('加载 VConsole 失败:', error)
    }
  }
}

import ConnectWalletModalVue from './components/ConnectWalletModal/ConnectWalletModal.vue'
import LeftNavigationVue from './components/LeftNavigation/LeftNavigation.vue'
import DragonBall from './views/talk/components/DragonBall.vue'
import SearchModal from './components/Search/Index.vue'
//import PWA from './components/PWA/PWA.vue'
import UserCardFloater from './components/UserCard/Floater.vue'
import PullDownVue from './layout/PullDown/PullDown.vue'
import ImagePreviewVue from '@/components/ImagePreview/ImagePreview.vue'
import { type Network, useNetworkStore } from '@/stores/network'
import { useCredentialsStore } from '@/stores/credentials'
import { useConnectionStore } from '@/stores/connection'
import {completeReload} from '@/utils/util'
import { useI18n } from 'vue-i18n'
import WalletMissingModal from './components/ConnectWalletModal/WalletMissingModal.vue'
import {getEcdhPublickey} from '@/wallet-adapters/metalet'
import { sleep } from '@/utils/util'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import {
  getChannels,
  GetUserEcdhPubkeyForPrivateChat
} from '@/api/talk'
import { openLoading } from '@/utils/util'
import { ElMessage } from 'element-plus'
import { useLayoutStore } from './stores/layout'
import { settings } from 'cluster'
import { useSimpleTalkStore } from './stores/simple-talk'
import { useWsStore } from './stores/ws_new'
const { closeConnectionModal } =
  useConnectionModal()
const MAX_RETRY_TIME = 10000 // 最大等待时间（毫秒）
const RETRY_INTERVAL = 100  // 重试间隔（毫秒）
const rootStore = useRootStore()
const userStore = useUserStore()
const route = useRoute()
const blackRoute = reactive(['home'])
const router = useRouter()
const isNetworkChanging = ref(false)
const simpleTalkStore=useSimpleTalkStore()
const i18n = useI18n()
const accountInterval=ref()
const layout=useLayoutStore()
const wsStore=useWsStore()
const routeKey = (route: any) => {
  // 对于 talk 路由，统一使用 'talk' 作为 key，避免重新创建组件
  if (route.path.startsWith('/talk')) {
    return 'talk'
  }
  if (route.params.communityId) return route.params.communityId
  return route.fullPath
}

const networkStore = useNetworkStore()
const connectionStore = useConnectionStore()
const credentialsStore = useCredentialsStore()

// const currentMetaletAddress=computed(async()=>{
//   return window.metaidwallet && window.metaidwallet.getAddress().then((res)=>{
//     return res
//   })
// })


// console.log('currentMetaletAddress',currentMetaletAddress.value)
// debugger





function handleNetworkChanged(network: Network) {
  isNetworkChanging.value = true

  const appNetwork = networkStore.network
  if (network !== appNetwork) {
    connectionStore.disconnect(router)
  }

  isNetworkChanging.value = false
}

const metaletAccountsChangedHandler = () => {
  try {
    if (useConnectionStore().last.wallet !== 'metalet') return
    if(rootStore.isWebView) return
    // sync here to prevent chronological error
    //connectionStore.sync()

    connectionStore.disconnect(router)

    ElMessage.warning({
      message: i18n.t('account.change'),
      type: 'warning',
      onClose: () => {
        completeReload()
      },
    })



  } catch (error) {
    console.error('Error in metaletAccountsChangedHandler:', error)
  }
}




const metaletNetworkChangedHandler = (network: Network) => {
  if (useConnectionStore().last.wallet !== 'metalet') return
   if(rootStore.isWebView) return
  handleNetworkChanged(network)
}

const appLoginSuccessHandler= async (data: any) => {
      // ElMessage.success('调用LoginSuccess')
          try {
            //  if(userStore.isAuthorized && rootStore.isWebView && data !== userStore.last.address){
            //       connectionStore.disconnect(router)
            //   simpleTalkStore.$patch({isInitialized:false})
            //   await connectMetalet()

            //   if (!userStore.last.chatpubkey) {
            //     const ecdhRes = await GetUserEcdhPubkeyForPrivateChat(userStore.last.metaid)
            //     if (ecdhRes?.chatPublicKey) {
            //       userStore.updateUserInfo({
            //         chatpubkey: ecdhRes?.chatPublicKey
            //       })
            //     }
            //   }

            // setTimeout(() => {
            //    return window.location.reload()
            // }, 1000);
            // }


            if (!userStore.isAuthorized) {


              await connectMetalet()
              //  ElMessage.success('调用LoginSuccess成功')
              if (!userStore.last.chatpubkey) {
                const ecdhRes = await GetUserEcdhPubkeyForPrivateChat(userStore.last.globalMetaId)
                if (ecdhRes?.chatPublicKey) {
                  userStore.updateUserInfo({
                    chatpubkey: ecdhRes?.chatPublicKey
                  })
                  rootStore.updateShowCreatePubkey(false)
                }else{
                  rootStore.updateShowCreatePubkey(true)
                }
              }
              // setTimeout(() => {
              //   window.location.reload()
              // }, 5000);

            }

          } catch (error) {
            ElMessage.error(error as any)
            console.error('Error in LoginSuccess handler:', error)
          }
        }


const appLangChangeHandler= async (lang: string) => {

          try {
          if (i18n.locale.value === lang) return
              i18n.locale.value = lang
              window.localStorage.setItem('lang', lang)
          } catch (error) {
            ElMessage.error(error as any)
            console.error('Error in SwitchLang handler:', error)
          }
        }

const appAccountSwitchHandler= async(data:any)=>{
            //ElMessage.success('调用onAccountSwitch')
          try {
            if(rootStore.isWebView){

              await connectionStore.disconnect(router)
              simpleTalkStore.$patch({isInitialized:false})
              await connectMetalet()
               //ElMessage.success('调用onAccountSwitch成功')
              if (!userStore.last.chatpubkey) {
                const ecdhRes = await GetUserEcdhPubkeyForPrivateChat(userStore.last.globalMetaId)
                if (ecdhRes?.chatPublicKey) {
                  userStore.updateUserInfo({
                    chatpubkey: ecdhRes?.chatPublicKey
                  })
                  rootStore.updateShowCreatePubkey(false)
                }else{
                  rootStore.updateShowCreatePubkey(true)
                }
              }

            // setTimeout(() => {
            //     window.location.reload()
            // }, 5000);

          }
          } catch (error) {
            throw new Error(error)
          }
         }

const appLogoutHandler= async (data: any) => {
try {
  console.log("退出登录成功", data)
  if (userStore.isAuthorized) {
    await connectionStore.disconnect(router)
    closeConnectionModal()
  }
} catch (error) {
  console.error('Error in Logout handler:', error)
}
}

const appRreshHandler=()=>{
          // ElMessage.success('调用onRefresh')
          //监听APP数据刷新
          if(userStore.isAuthorized){
            try{
              if(!wsStore.isConnected){
                wsStore.init()
              }

                if (!simpleTalkStore.isInitialized) {
                simpleTalkStore.init().then().catch((e)=>{
                  ElMessage.error(`${i18n.t('simpleTalk.init.error')}`)
                })
                }
                simpleTalkStore.syncFromServer().then().catch((e)=>{
                  ElMessage.error(`${i18n.t('simpleTalk.init.error')}`)
                })
              // simpleTalkStore.$patch({isInitialized:false})
              //  simpleTalkStore.init().then(()=>{
              //    //ElMessage.success('调用onRefresh成功')
              //  })

            }catch{

            }

          }

        }


async function connectMetalet() {

  try {
    const connection = await connectionStore.connect('metalet').catch((err) => {
    ElMessage.warning({
      message: err.message,
      type: 'warning',
    })
  })
    if (connection?.status === 'connected') {
    await credentialsStore.login()

    await sleep(300)



    const channelId=route.params.channelId
    const communityId=route.params.communityId


    if(channelId && channelId !== 'welcome'){
      router.push({
        name: 'talkChannel',
        params:{
          communityId:communityId,
          channelId:channelId
        }
      })
    //  setTimeout(() => {
    //    window.location.reload()
    //  }, 2000);
    }else{
     setTimeout(async() => {
         await simpleTalkStore.init()

     }, 1000);

      simpleTalkStore.initMuteNotify().then().catch((e)=>{

                })
    // let newChannelId
    // const myChannelList= await getChannels({
    //   metaId:userStore.last.metaid
    // })

    // if(myChannelList.length){

    //   newChannelId=myChannelList[0].groupId

    // }else{

    //   newChannelId='welcome' //import.meta.env.VITE_CHAT_DEFAULT_CHANNEL//allChannelList[1].groupId
    //   //layout.$patch({showJoinView:true})
    // }
    // router.push({
    //     name: 'talkChannel',
    //     params:{
    //       communityId:'public',
    //       channelId:newChannelId
    //     }
    //   })
    }


  }
  } catch (error) {
    ElMessage.error(error)
  }



}



onMounted(async () => {

  // 确保老用户有正确的 globalMetaId
  if (userStore.last?.address) {
    const hasGlobalMetaId = await userStore.ensureGlobalMetaId()
    if (!hasGlobalMetaId) {
      console.warn('⚠️ 无法获取 globalMetaId，部分功能可能受限')
    }
  }

  let retryCount = 0
  let timeoutId: NodeJS.Timeout | undefined
  //document.addEventListener('visibilitychange', handleVisibilityChange);

      accountInterval.value = setInterval(async () => {
    try {
       rootStore.checkWebViewBridge()
       if(rootStore.isWebView) return
      if (window.metaidwallet && connectionStore.last.status == 'connected' && userStore.isAuthorized) {
        const res = await window.metaidwallet.getAddress()

        if ((res as any)?.status === 'not-connected' || userStore.last?.address !== res) {
          connectionStore.disconnect(router)
          ElMessage.warning({
            message: i18n.t('account.change'),
            type: 'warning',
          })
        }
      }
    } catch (error) {
      console.error('Error checking account status:', error)
    }
  }, 5 * 1000)








  const checkMetalet =  () => {
    rootStore.checkWebViewBridge()
    if (window.metaidwallet) {

      try {

           ;(window.metaidwallet as any)?.on('accountsChanged',metaletAccountsChangedHandler)
              ;(window.metaidwallet as any)?.on('networkChanged',metaletNetworkChangedHandler)

          ;(window.metaidwallet as any)?.on('LoginSuccess',appLoginSuccessHandler)
        // debugger



           ;(window.metaidwallet as any)?.on('onAccountSwitch',appAccountSwitchHandler)
         ;(window.metaidwallet as any)?.on('onLanguageChange',appLangChangeHandler)






  //         window.metaidwallet?.on('LoginSuccess',async()=>{

  //            ElMessage.success(`调用了LoginSuccess`)
  // if(rootStore.isWebView && connectionStore.last.status !== 'connected' && !userStore.isAuthorized ){
  //    ElMessage.success(`调用了LoginSuccess internal`)
  //      await connectMetalet()

  //      if(!userStore.last.chatpubkey){
  //          const ecdhRes= await GetUserEcdhPubkeyForPrivateChat(userStore.last.metaid)
  //       if(ecdhRes?.chatPublicKey ){
  //         userStore.updateUserInfo({
  //           chatpubkey:ecdhRes?.chatPublicKey
  //         })



  // }
  //      }
  //     }



  // })


  ;(window.metaidwallet as any)?.on('Logout',appLogoutHandler)


        // setInterval(async()=>{
        //       ElMessage.success('成功调用了app刷新功能')
        //   //监听APP数据刷新
        //   if(userStore.isAuthorized){
        //     debugger
        //       const loading = openLoading({
        //         text: i18n.t('reload'),
        //       })
        //     try{


        //       if(!wsStore.isConnected){
        //         ElMessage.success('重新连接socket')
        //         wsStore.init()
        //       }

        //       simpleTalkStore.$patch({isInitialized:false})
        //       await simpleTalkStore.init()
        //       ElMessage.success('✅ Simple-talk store 初始化成功')
        //       loading.close()
        //     }catch{
        //       loading.close()
        //     }

        //   }

        // },20 * 1000)

        ;(window.metaidwallet as any)?.on('onRefresh',appRreshHandler)
        //监听页面可见性变化



      } catch (err) {

        console.error('Failed to setup Metalet listeners:', err)
      }
    } else if (retryCount * RETRY_INTERVAL < MAX_RETRY_TIME) {

      retryCount++
      timeoutId = setTimeout(checkMetalet, RETRY_INTERVAL)
    } else {

      console.warn('Metalet wallet not detected after timeout')
    }
  }

  // 初始检查
  checkMetalet()

  // 检查是否需要为调试地址启用 VConsole
  if (userStore.last?.address) {
    initVConsoleForDebug(userStore.last.address)
  }

  if(window.metaidwallet && connectionStore.last.status == 'connected' && userStore.isAuthorized){
      rootStore.checkBtcAddressSameAsMvc().then().catch((err)=>{

            ElMessage.warning({
              message:i18n.t('btcSameAsMvcError'),
              type: 'warning',
              })
              setTimeout(() => {
                 connectionStore.disconnect(router)
              }, 3000);

        })



  }


  onUnmounted(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
})

// 监听用户地址变化，为调试地址启用 VConsole
watch(
  () => userStore.last?.address,
  (newAddress) => {
    if (newAddress) {
      initVConsoleForDebug(newAddress)
    }
  },
  { immediate: true }
)

onBeforeUnmount(async () => {
  // remove event listener
  try {
    ;(window.metaidwallet as any)?.removeListener(
      'accountsChanged',
      metaletAccountsChangedHandler,
    )
    ;(window.metaidwallet as any)?.removeListener(
      'networkChanged',
      metaletNetworkChangedHandler,
    )

    ;(window.metaidwallet as any)?.removeListener('LoginSuccess',appLoginSuccessHandler)
    ;(window.metaidwallet as any)?.removeListener('Logout',appLogoutHandler)
     ;(window.metaidwallet as any)?.removeListener(
      'onRefresh',
      appRreshHandler
    )
    ;(window.metaidwallet as any)?.removeListener(
    'onAccountSwitch',
    appAccountSwitchHandler

    )
    ;(window.metaidwallet as any)?.removeListener('onLanguageChange',appLangChangeHandler)

    clearInterval(accountInterval.value)
  } catch (error) {
    console.error('Error removing event listeners:', error)
  }
})

// if (!localStorage.getItem('showDiffLang')) {
//   localStorage.setItem('showDiffLang', String(1))
// }

// onMounted(() => {
//   setTimeout(async () => {
//     if (userStore.metaletLogin) {
//       const res = await window.metaidwallet.getAddress()
//       if (res?.status == 'not-connected' || userStore.user?.address !== res) {
//         ElMessage.error('We detected changes to your account. Please log in again.')
//         await userStore.logout(route)
//         window.location.reload()
//       }

//       window.metaidwallet.on(
//         'accountsChanged',
//         async (res: { mvcAddress: string; btcAddress: string }) => {
//           if (res.mvcAddress !== userStore.user?.address) {
//             ElMessage.error('We detected changes to your account. Please log in again.')
//             await userStore.logout(route)
//             window.location.reload()
//           }
//         }
//       )
//     }
//   }, 500)
// })
</script>
<style lang="css" src="@/assets/styles/tailwind.css"></style>
<style lang="scss" scoped>
@font-face {
  font-family: Whitney;
  font-style: normal;
  src: local('Whitney'), url('@/assets/fonts/whitneybook.otf') format('opentype');
  font-weight: 400;
}
@font-face {
  font-family: Whitney;
  font-style: normal;
  src: local('Whitney Medium'), url('@/assets/fonts/whitneymedium.otf') format('opentype');
  font-weight: 500;
}
@font-face {
  font-family: Whitney;
  font-style: normal;
  src: local('Whitney Bold'), url('@/assets/fonts/whitneybold.otf') format('opentype');
  font-weight: 700;
}
</style>
