<template>
  <!-- 社区列表 -->
  <!-- <div
    class="w-22.5 fullscreen bg-white dark:bg-gray-700 space-y-4.5 left-navigation z-50 py-4.5 overflow-y-auto lg:overflow-y-hidden lg:hover:overflow-y-auto  slimmer-scrollbar"
    :class="[layout.isShowLeftNav ? '' : 'hidden lg:block']"
  >
    <div class="space-y-4.5">
      <el-tooltip
        effect="light"
        popper-class="text-dark-800 dark:text-dark-200 !bg-white dark:!bg-gray-800 text-base font-medium py-2 px-4 shadow-md rounded-lg"
        :content="item.title()"
        :offset="5"
        placement="right"
        :disabled="isMobile"
        v-for="(item, index) in apps"
      >
        <router-link
          :to="item.path"
          class="flex items-center justify-center group relative"
          :class="item.extraClass"
          :key="index"
          @click="item.symbol !== '@me' ? (layout.isShowLeftNav = false) : ''"
        >
          <div
            class="absolute left-0 h-full flex items-center top-0"
            v-if="item.icon === 'talk' && talk.hasUnreadMessagesOfCommunity('@me')"
          >
            <span
              class="w-1.5 h-3 bg-dark-800 dark:bg-gray-200 rounded-r-md lg:group-hover:h-6 transition-all duration-150"
            ></span>
          </div>
          <span
            class="absolute left-0 bg-dark-800 dark:bg-gray-200 w-1.5 h-7 rounded-r-md"
            v-if="route.path.includes(item.symbol)"
          ></span>
          <span
            class="bg-primary w-13.5 h-13.5 flex items-center justify-center rounded-3xl group-hover:scale-110 transition-all duration-200"
          >
            <Icon
              :name="item.icon"
              customClass="w-[22PX] h-[19PX]  lg:group-hover:scale-110 transition-all duration-200"
              color="#303133"
            />
          </span>
        </router-link>
      </el-tooltip>
    </div>

    <div class="divide flex items-center justify-center">
      <div class="w-7.5 border-b-2 border-solid border-dark-100 dark:border-gray-600"></div>
    </div>

    <div class="space-y-4.5 flex flex-col items-center justify-center">
      <el-tooltip
        effect="light"
        popper-class="text-dark-800 dark:text-dark-200 !bg-white dark:!bg-gray-800 text-base font-medium py-2 px-4 shadow-md rounded-lg"
        :content="community.name"
        :offset="5"
        placement="right"
        :disabled="isMobile"
        v-for="(community, index) in talk.realCommunities"
      >
        <router-link
          :to="
            '/talk/channels/' +
              getCommunityKey(community) +
              '/' +
              talk.communityLastReadChannelId(community.id)
          "
          class="flex items-center justify-center relative w-full group"
          :key="index"
        >
          <div
            class="absolute left-0 h-full flex items-center top-0"
            v-if="talk.hasUnreadMessagesOfCommunity(community.id)"
          >
            <span
              class="w-1.5 h-3 bg-dark-800 dark:bg-gray-200 rounded-r-md lg:group-hover:h-6 transition-all duration-150"
            ></span>
          </div>
          <span
            class="absolute left-0 bg-dark-800 dark:bg-gray-200 w-1.5 h-8 rounded-r-md"
            v-if="talk.activeCommunityId === community.id && route.path.includes('talk')"
          ></span>

          <Image
            :src="community.icon"
            :customClass="
              '!w-13.5 !h-13.5 rounded-3xl object-cover object-center lg:group-hover:scale-110 transition-all duration-200'
            "
          />
        </router-link>
      </el-tooltip>

      <div
        class="border-dashed border-2 border-gray-200 dark:border-gray-600 w-13.5 h-13.5 flex items-center justify-center rounded-3xl text-dark-400 cursor-pointer hover:text-dark-800 hover:border-solid hover:border-dark-300 hover:bg-primary transition-all duration-300"
        v-if="userStore.isAuthorized"
        @click="
          userStore.isAuthorized
            ? (layout.isShowCreateCommunityModal = true)
            : (rootStore.isShowLogin = true)
        "
      >
        <Icon name="plus" class="w-[24PX] h-[24PX]" />
      </div>
    </div>

    <CreateCommunityModal v-if="layout.isShowCreateCommunityModal" />
  </div> -->
</template>

<script setup lang="ts">
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import { isMobile, useRootStore } from '@/stores/root'
import CreateCommunityModal from '@/views/talk/components/modals/community/Create.vue'
import { onBeforeUnmount, reactive, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useWsStore } from '@/stores/ws_new'
import { Community } from '@/@types/talk'
const layout = useLayoutStore()
const ws = useWsStore()

const userStore = useUserStore()
const route = useRoute()
const rootStore = useRootStore()
const i18n = useI18n()
const isProduction = import.meta.env.MODE === 'mainnet'
const whiteList = [
  '7a7c301023d20f8dd3af3a4461f8e9726256286cc3c79b7fb0673a4a0d7d4625',
  'e9ab42667c5f5a6a1e7d45ed023f8961ee6950bba8a771d68732c8fb460a7aae',
]
// const isInWhitelist = talk.selfMetaId && whiteList.includes(talk.selfMetaId)

function getCommunityKey(community: Community) {
  // return community.id

  return 'public'
  if (!community.metaName) return community.id

  const originalMetaName = community.metaName
  // return originalMetaName.includes('.') ? originalMetaName : `${originalMetaName}.metaid`

  // 目前不解析.eth
  return originalMetaName.includes('.') ? community.id : `${originalMetaName}.metaid`
}

const apps = reactive([
  // {
  //   icon: 'feed',
  //   path: '/buzz',
  //   extraClass: 'left-navigation-item',
  //   title: () => i18n.t('Talk.Community.feed'),
  //   symbol: 'buzz',
  // },
  {
    icon: 'talk',
    path: '/talk/channels/@me',
    title: () => i18n.t('Talk.Community.atme'),
    symbol: '@me',
  },
  // {
  //   icon: 'market',
  //   path: '/nft/collection/index',
  //   title: () => i18n.t('NFT.NFT Market'),
  //   symbol: 'nft',
  // },
])

if (userStore.isAuthorized) {
  //talk.fetchCommunities()
  // talk.initCommunityChannelIds()
  // talk.initReceivedRedPacketIds()
  // talk.initReadPointers()
  ws.init()
}

watch(
  () => userStore.isAuthorized,
  isAuthorized => {
    if (isAuthorized) {
      //talk.fetchCommunities()
      // talk.initCommunityChannelIds()
      // talk.initReceivedRedPacketIds()
      // talk.initReadPointers()
      ws.init()
    } else {
      // talk.reset()
      ws.disconnect()
      // talk.saveReadPointers()
      // talk.closeReadPointerTimer()
    }
  }
)

onBeforeUnmount(() => {
  ws.disconnect()

  // talk.saveReadPointers()
  // talk.closeReadPointerTimer()
})
</script>

<style lang="scss" scoped src="./LeftNavigation.scss"></style>
