<template>
  <div
    class="bg-white dark:bg-gray-700 fixed inset-0 fullscreen w-screen z-40 lg:static lg:shrink-0 lg:w-auto"
    :class="[layout.isShowLeftNav ? '' : 'hidden lg:block']"
  >
    <div class="w-full h-full flex">
      <!-- 占位 -->
      <!-- <div class="shrink-0 bg-white dark:bg-gray-700 w-22.5 lg:hidden"></div> -->

      <div
        class="h-full bg-dark-100 dark:bg-gray-800 grow lg:w-70 flex flex-col justify-between items-stretch"
      >
      
        <div class="flex flex-col overflow-y-hidden">
          <!-- 搜索栏 -->
          <DirectContactSearch />

         
           <div @click="createPubkeyNode">Pubkey</div>
          <!-- 联系人列表 -->
          <div class="overflow-y-auto">
            <DirectContactItem
              v-for="session in talkStore.activeCommunityChannels"
              :key="session.timestamp"
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
import { computed} from 'vue'
import {createUserPubkey} from '@/utils/userInfo'
import { useCredentialsStore } from '@/stores/credentials'
const layout = useLayoutStore()
const talkStore = useTalkStore()
const credentialsStore=useCredentialsStore()

async function createPubkeyNode() {
  debugger
  try {
      const credential=credentialsStore.get
  const txid= await createUserPubkey({
        pubkey:credential.publicKey,
        options: {
        feeRate: 1,
        network: 'mainnet',
        assistDomain: 'https://www.metaso.network/assist-open-api',
      },
  })
  console.log('txid',txid)
  debugger
  } catch (error) {
    debugger
  }
}


const test=computed(()=>{
 return talkStore.activeCommunityChannels
})
console.log("test",test.value)

</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 0px !important;
}
</style>
