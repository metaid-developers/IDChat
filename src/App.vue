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
  <!-- <UserCardFloater /> -->
  <!-- <PWA /> -->

  <!-- 图片预览 -->
  <ImagePreviewVue />
</template>

<script setup lang="ts">
import { reactive, ref, onMounted, nextTick, watch, provide ,onBeforeUnmount,onUnmounted} from 'vue'
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
const MAX_RETRY_TIME = 5000 // 最大等待时间（毫秒）
const RETRY_INTERVAL = 100  // 重试间隔（毫秒）
const rootStore = useRootStore()
const userStore = useUserStore()
const route = useRoute()
const blackRoute = reactive(['home'])
const router = useRouter()
const isNetworkChanging = ref(false)
const i18n = useI18n()
const routeKey = (route: any) => {
  if (route.params.communityId) return route.params.communityId
  return route.fullPath
}

const networkStore = useNetworkStore()
const connectionStore = useConnectionStore()
const credentialsStore = useCredentialsStore()

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
  connectionStore.sync()

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


onMounted(async () => {
  let retryCount = 0
  let timeoutId: number

  const checkMetalet = async () => {
    if (window.metaidwallet) {
     
      try {
        await window.metaidwallet.on('accountsChanged', metaletAccountsChangedHandler)
        await window.metaidwallet.on('networkChanged', metaletNetworkChangedHandler)
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
  
 await window.metaidwallet?.removeListener(
    'accountsChanged',
    metaletAccountsChangedHandler,
  )
 await window.metaidwallet.removeListener(
    'networkChanged',
    metaletNetworkChangedHandler,
  )
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
