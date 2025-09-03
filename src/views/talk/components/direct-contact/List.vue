<template>
  <div
    class="bg-white dark:bg-gray-700 fixed inset-0 fullscreen w-screen z-40 lg:static lg:shrink-0 lg:w-auto"
    :class="[layout.isShowLeftNav ? '' : 'hidden lg:block']"
  >
    <div class="w-full h-full flex">
      <!-- 占位 -->
      <!-- <div class="shrink-0 bg-white dark:bg-gray-700 w-22.5 lg:hidden"></div> -->

      <div
        class="h-full bg-dark-100 max-w-[380PX] w-[380PX] dark:bg-gray-800 grow lg:w-70 flex flex-col justify-between items-stretch"
      >
        <div class="flex flex-col overflow-y-hidden">
          <!-- 搜索栏 -->
          <DirectContactSearch />

          <CreatePubkey :needModifyPubkey="needModifyPubkey" v-if="userStore.isAuthorized && !userStore.last?.chatpubkey && !needModifyPubkey" />

          <!-- 联系人列表 -->
          <div class="overflow-y-auto">
            <DirectContactItem
              v-for="session in talkStore.activeCommunityChannels"
              :key="getSessionKey(session)"
              :session="session"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useLayoutStore } from '@/stores/layout'
import DirectContactSearch from './Search.vue'
import DirectContactItem from './Item.vue'
import { useTalkStore } from '@/stores/talk'
import { computed, onMounted,ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useCredentialsStore } from '@/stores/credentials'
import { useUserStore } from '@/stores/user'
import CreatePubkey from './create-pubkey.vue'
import {getEcdhPublickey} from '@/wallet-adapters/metalet'
const layout = useLayoutStore()
const talkStore = useTalkStore()
const credentialsStore = useCredentialsStore()
const userStore = useUserStore()
const needModifyPubkey=ref(false)

// 优化key生成策略，避免不必要的重新渲染
const getSessionKey = (session: any) => {
  // 使用稳定的ID作为key，避免使用timestamp等会变化的属性
  return session.id || session.groupId || session.metaId || session.timestamp
}




const { activeCommunity } = storeToRefs(useTalkStore())


onMounted(async()=>{
   const pubkey=userStore.last.chatpubkey
   const ecdh= await getEcdhPublickey()
   
    if(pubkey && pubkey !== ecdh.ecdhPubKey){
      
      needModifyPubkey.value=true
    }
})

// const test=computed(()=>{
//  return talkStore.activeCommunityChannels
// })
// console.log("test",test.value)
</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 0px !important;
}
</style>
