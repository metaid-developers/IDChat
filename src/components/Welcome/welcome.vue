<template>

<div class="bg-inherit flex items-center" >
     
    <div class="block lg:hidden w-full max-w-full  py-5" v-if="(!connectionStore.connected || !credentialsStore.get) && !rootStore.isWebView">
        <div class="flex items-center justify-center">
               <template v-if="!connectionStore.connected">
    <a  class="main-border  primary text-center connect-wallet" @click="openConnectionModal">{{
      $t('Login.connectWallet')
    }}</a>
  </template>

  <template v-else-if="!credentialsStore.get">
    <a class="main-border  primary text-center connect-wallet" @click="credentialsStore.login()">{{
      $t('Login.authorize')
    }}</a>
  </template>
        </div>
    </div>



  <template v-else>
      <div v-if="layoutStore.showJoinView" class=" flex flex-col items-center justify-center px-3 py-6 ">
      <div>
        <div class="font-medium text-sm">{{ $t('welcome.desc') }}</div>

     <div class="flex flex-col items-center  mt-5">
          <div class="font-medium text-sm flex flex-row items-center">
            <span>{{ $t('link.metaid.group') }}</span
            >
            <el-icon><CaretBottom /></el-icon>
          </div>
          <a class="main-border w-[200PX] text-center font-medium cursor-pointer mt-5 text-base primary p-2" @click="toMetaIdGrop">{{
            $t('MetaID.official_group')
          }}</a>
        </div>
    </div>
     </div>
  </template>
</div>
 
</template>
<script setup lang='ts'>
import { CaretBottom } from '@element-plus/icons-vue'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { useConnectionStore } from '@/stores/connection'
import { useCredentialsStore } from '@/stores/credentials'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
import { useRootStore } from '@/stores/root'

const router=useRouter()
const rootStore=useRootStore()
const connectionStore = useConnectionStore()
const userStore=useUserStore()
const credentialsStore = useCredentialsStore()
const layoutStore=useLayoutStore()
const { openConnectionModal } = useConnectionModal()

function toMetaIdGrop() {
  if (userStore.isAuthorized) {
    router.push({
      name: 'talkChannel',
      params: {
        communityId: 'public',
        channelId: '396809572f936c66979755477b15ae9adfe9fae119bdabb8f3ffb9a362a176d0i0',
      },
    })
    // setTimeout(() => {
    //   window.location.reload()
    // }, 2000);
  } else {
    openConnectionModal()
  }
}
</script>
<style lang='scss' scoped>
.connect-wallet {
  padding: 12px 16px;
  cursor: pointer;
  width: 200px;
  
  margin-right: 18px;
}
</style>