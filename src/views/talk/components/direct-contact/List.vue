<template>
  <div
    class="bg-white dark:bg-gray-700 fixed z-50  inset-0 fullscreen w-screen  lg:relative lg:shrink-0 lg:w-auto"
    :class="[layout.isShowLeftNav ? '' : 'hidden lg:block']"
  >
    <div class="w-full h-full flex">
      <!-- 占位 -->
      <!-- <div class="shrink-0 bg-white dark:bg-gray-700 w-22.5 lg:hidden"></div> -->

      <div
        class="h-full bg-dark-100 dark:bg-gray-800 grow lg:w-70 flex flex-col justify-between items-stretch relative"
      >
        <div class="flex lg:w-[364PX] flex-col overflow-y-hidden">
          <!-- 搜索栏 -->

          <!---->

          <DirectContactSearch @open-search="handleOpenSearchModal" />
          <CreatePubkey
            v-model:needModifyPubkey="needModifyPubkey"
            v-if="userStore.isAuthorized && rootStore.showCreatePubkey && !needModifyPubkey"
          />
          <Welcome v-show="!_allChannels?.length && layout.isShowLeftNav"></Welcome>

          <!-- 联系人列表 -->
          <div class="overflow-y-auto" v-show="userStore.isAuthorized">
            <DirectContactItem
              v-for="session in _allChannels"
              :key="getSessionKey(session)"
              :session="session"
            />
          </div>
        </div>

        <!-- 搜索弹窗 -->
        <SearchModal v-model="isSearchModalVisible" @select="handleContactSelect" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useLayoutStore } from '@/stores/layout'
import DirectContactSearch from './Search.vue'
import DirectContactItem from './Item.vue'
import SearchModal from './SearchModal.vue'
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'

import { useCredentialsStore } from '@/stores/credentials'
import { useUserStore } from '@/stores/user'
import CreatePubkey from './create-pubkey.vue'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'

import Welcome from '@/components/Welcome/welcome.vue'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useRootStore } from '@/stores/root'
const layout = useLayoutStore()
const credentialsStore = useCredentialsStore()
const userStore = useUserStore()
const rootStore = useRootStore()
const needModifyPubkey = ref(false)
const { allChannels } = storeToRefs(useSimpleTalkStore())

// console.log('talkStore', simpleTalkStore.allChannels)

// 优化key生成策略，避免不必要的重新渲染
const getSessionKey = (session: any) => {
  // 使用稳定的ID作为key，避免使用timestamp等会变化的属性
  return session.id || session.groupId || session.metaId || session.timestamp
}

const _allChannels = computed(() => {
  return allChannels.value.filter(
    channel => (channel.type === 'private' || channel.type === 'group') && !channel.isTemporary
  )
})

onMounted(async () => {
  const pubkey = userStore.last.chatpubkey
  const ecdh = await getEcdhPublickey()
  await useSimpleTalkStore().init()
  if (pubkey && pubkey !== ecdh.ecdhPubKey) {
    needModifyPubkey.value = true
  }
})

// const test=computed(()=>{
// 搜索弹窗状态
const isSearchModalVisible = ref(false)

// 处理搜索模态框打开
const handleOpenSearchModal = () => {
  console.log('Opening search modal')
  isSearchModalVisible.value = true
}

// 处理联系人选择
const handleContactSelect = (contact: any) => {
  console.log('Selected contact:', contact)

  // 如果是远程群组，可能需要特殊处理（比如加入群组）
  if (contact.isRemote) {
    console.log('Joining remote group:', contact)
    // 这里可以添加加入远程群组的逻辑
    // 例如：调用加入群组的 API
    // await joinRemoteGroup(contact.groupId)
  }

  // 切换到选中的频道
  const simpleTalkStore = useSimpleTalkStore()
  if (contact.id) {
    simpleTalkStore.setActiveChannel(contact.id)
  }
}
</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 0px !important;
}
</style>
