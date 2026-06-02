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
        <div class="relative flex h-full min-h-0 lg:w-[364PX] flex-col overflow-y-hidden">
          <!-- 搜索栏 -->

          <!---->

          <DirectContactSearch
            :is-online-bot-panel-open="isOnlineBotPanelVisible"
            @open-search="handleOpenSearchModal"
            @open-online-bots="handleOpenOnlineBots"
          />
          <OnlineBotPanel
            v-if="isOnlineBotPanelVisible && userStore.isAuthorized"
            @close="handleCloseOnlineBots"
            @select="handleOnlineBotSelect"
          />
          <CreatePubkey
            v-model:needModifyPubkey="needModifyPubkey"
            v-if="userStore.isAuthorized && rootStore.showCreatePubkey && !needModifyPubkey"
          />
          <Welcome v-show="!_allChannels?.length && layout.isShowLeftNav"></Welcome>

          <!-- 联系人列表 -->
          <div class="min-h-0 flex-1 overflow-y-auto" v-show="userStore.isAuthorized">
            <DirectContactItem
              v-for="session in _allChannels"
              :key="getSessionKey(session)"
              :session="session"
            />
          </div>
        </div>

        <!-- 搜索弹窗 -->
        <SearchModal
          v-if="isSearchModalVisible"
          v-model="isSearchModalVisible"
          @select="handleContactSelect"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useLayoutStore } from '@/stores/layout'
import DirectContactSearch from './Search.vue'
import { computed, defineAsyncComponent, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'

import { useUserStore } from '@/stores/user'

import Welcome from '@/components/Welcome/welcome.vue'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useRootStore } from '@/stores/root'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { OnlineBot } from '@/api/online-bots'
import { useI18n } from 'vue-i18n'

const DirectContactItem = defineAsyncComponent(() => import('./Item.vue'))
const SearchModal = defineAsyncComponent(() => import('./SearchModal.vue'))
const CreatePubkey = defineAsyncComponent(() => import('./create-pubkey.vue'))
const OnlineBotPanel = defineAsyncComponent(() => import('./OnlineBotPanel.vue'))

const layout = useLayoutStore()
const userStore = useUserStore()
const rootStore = useRootStore()
const needModifyPubkey = ref(false)
const simpleTalkStore = useSimpleTalkStore()
const { allChannels } = storeToRefs(simpleTalkStore)
const router = useRouter()
const i18n = useI18n()

// console.log('talkStore', simpleTalkStore.allChannels)

// 优化key生成策略，避免不必要的重新渲染
const getSessionKey = (session: any) => {
  // 使用稳定的ID作为key，避免使用timestamp等会变化的属性
  return session.id || session.groupId || session.metaId || session.timestamp
}

const _allChannels = computed(() => {
  if (!userStore.isAuthorized) return []
  return allChannels.value.filter(
    channel => (channel.type === 'private' || channel.type === 'group') && !channel.isTemporary
  )
})

const ensureDirectContactReady = async () => {
  if (!userStore.isAuthorized) return
  const { getEcdhPublickey } = await import('@/wallet-adapters/metalet')
  const pubkey = userStore.last?.chatpubkey
  const [ecdh] = await Promise.all([getEcdhPublickey(), simpleTalkStore.ensureInitialized()])
  if (pubkey && pubkey !== ecdh.ecdhPubKey) {
    needModifyPubkey.value = true
  }
}

onMounted(ensureDirectContactReady)

// 监听登录状态：用户连接钱包登录后重新初始化聊天列表
watch(
  () => userStore.isAuthorized,
  (authorized) => {
    if (authorized) {
      ensureDirectContactReady()
    }
  }
)

// const test=computed(()=>{
// 搜索弹窗状态
const isSearchModalVisible = ref(false)
const isOnlineBotPanelVisible = ref(false)

// 处理搜索模态框打开
const handleOpenSearchModal = () => {
  console.log('Opening search modal')
  isOnlineBotPanelVisible.value = false
  isSearchModalVisible.value = true
}

const handleOpenOnlineBots = () => {
  if (!userStore.isAuthorized) return
  isSearchModalVisible.value = false
  isOnlineBotPanelVisible.value = true
}

const handleCloseOnlineBots = () => {
  isOnlineBotPanelVisible.value = false
}

const handleOnlineBotSelect = async (bot: OnlineBot) => {
  if (!bot.globalMetaId) return

  if (bot.globalMetaId === userStore.last?.globalMetaId) {
    ElMessage.warning('不能和自己发起私聊')
    return
  }

  if (!userStore.last?.chatpubkey) {
    ElMessage.warning(`${i18n.t('self_private_chat_unsupport')}`)
    return
  }

  const privateChannel = await simpleTalkStore.createPrivateChat(bot.globalMetaId)
  if (!privateChannel) {
    ElMessage.warning('无法创建私聊')
    return
  }

  if (privateChannel.isTemporary) {
    simpleTalkStore.convertTemporaryToRegular(bot.globalMetaId)
  }

  isOnlineBotPanelVisible.value = false
  await simpleTalkStore.setActiveChannel(bot.globalMetaId)
  await router.push({ name: 'talkAtMe', params: { channelId: bot.globalMetaId } })
  layout.isShowLeftNav = false
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
