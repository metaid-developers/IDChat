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
} from '@/api/talk'
import { ElMessage } from 'element-plus'
import { useLayoutStore } from './stores/layout'
const { closeConnectionModal } =
  useConnectionModal()
const MAX_RETRY_TIME = 5000 // 最大等待时间（毫秒）
const RETRY_INTERVAL = 100  // 重试间隔（毫秒）
const rootStore = useRootStore()
const userStore = useUserStore()
const route = useRoute()
const blackRoute = reactive(['home'])
const router = useRouter()
const isNetworkChanging = ref(false)
const i18n = useI18n()
const accountInterval=ref()
const layout=useLayoutStore()
const routeKey = (route: any) => {
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
  
  if (useConnectionStore().last.wallet !== 'metalet') return

  // sync here to prevent chronological error
  //connectionStore.sync()

  connectionStore.disconnect(router)

  ElMessage.warning({
    message:i18n.t('account.change'),
    type: 'warning',
    onClose: () => {
      completeReload()
    },
  })
}
const metaletNetworkChangedHandler = (network: Network) => {
  if (useConnectionStore().last.wallet !== 'metalet') return
  handleNetworkChanged(network)
}


async function connectMetalet() {


 
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
     setTimeout(() => {
       window.location.reload()
     }, 2000);
    }else{
    let newChannelId
    const myChannelList= await getChannels({
      metaId:userStore.last.metaid
    })

    if(myChannelList.length){

      newChannelId=myChannelList[0].groupId

    }else{
   
      newChannelId='welcome' //import.meta.env.VITE_CHAT_DEFAULT_CHANNEL//allChannelList[1].groupId
      layout.$patch({showJoinView:true})
    }
    router.push({
        name: 'talkChannel',
        params:{
          communityId:'public',
          channelId:newChannelId
        }
      })
    }


  }

}



onMounted(async () => {
  let retryCount = 0
  let timeoutId: number
  //document.addEventListener('visibilitychange', handleVisibilityChange);
  accountInterval.value=setInterval(async()=>{
    if(window.metaidwallet && connectionStore.last.status == 'connected' && userStore.isAuthorized){
      
         window.metaidwallet.getAddress().then((res)=>{
          
             if (res?.status == 'not-connected' || userStore.last?.address !== res) {
              connectionStore.disconnect(router)
              ElMessage.warning({
              message:i18n.t('account.change'),
              type: 'warning',
              })
      }
        })
   
    }
  },5 * 1000)

  const checkMetalet = async () => {
    if (window.metaidwallet) {

      try {
         window.metaidwallet?.on('accountsChanged', metaletAccountsChangedHandler)
         window.metaidwallet?.on('networkChanged', metaletNetworkChangedHandler)

  window.metaidwallet?.on('LoginSuccess',async(data)=>{
    
      console.log("调用成功",data)
      ElMessage.success(connectionStore.last.status)

    
  if(rootStore.isWebView && connectionStore.last.status !== 'connected' && !userStore.isAuthorized ){
       await connectMetalet()

  }
  

  })

   window.metaidwallet?.on('Logout',async(data)=>{
    
      console.log("退出登录成功",data)
  if(rootStore.isWebView && connectionStore.last.status == 'connected' && userStore.isAuthorized ){
        await connectionStore.disconnect(router)
        closeConnectionModal()
  
  }
  

  })


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



  onUnmounted(() => {
    
    clearTimeout(timeoutId)
  })
})



onBeforeUnmount(async() => {
  // remove event listener

  window.metaidwallet?.removeListener(
    'accountsChanged',
    metaletAccountsChangedHandler,
  )
  window.metaidwallet.removeListener(
    'networkChanged',
    metaletNetworkChangedHandler,
  )

   window.metaidwallet?.removeListener(
    'LoginSuccess'
  )

   window.metaidwallet?.removeListener(
    'Logout'
  )

  clearInterval(accountInterval.value)

  
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
