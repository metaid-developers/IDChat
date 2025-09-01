<template>
  <div
    class="fixed left-0 right-0 top-0 flex items-center px-4 h-12 border-b-2 border-solid border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-700 z-30 lg:h-15 lg:absolute"
  >
    <div class="max-w-[50%] flex items-center">
      <Icon
        name="bars"
        class="w-6 h-6 text-dark-800 dark:text-gray-100 mx-2 shrink-0 lg:hidden"
        @click="layout.isShowLeftNav = true"
      />

      <div class="flex shrink-0 items-center">
        <div class=" hidden lg:block" v-if="talkStore.isActiveChannelReserved">
          <!-- 图标：仅保留頻道拥有 -->
          <Image
            v-if="talkStore.activeCommunity?.icon"
            :src="talkStore.activeCommunity.icon"
            :customClass="'!w-8 !h-8 rounded-2xl object-cover object-center mr-2'"
          />
        </div>

        <!-- 功能頻道头 -->
        <div class="" v-if="talkStore.isActiveChannelGeneral && talkStore.activeChannel?.nameKey">
          {{
            talkStore.activeChannel.id === 'DAO' && talkStore.activeCommunity?.dao
              ? talkStore.activeCommunity?.dao.daoName
              : $t(talkStore.activeChannel.nameKey)
          }}
        </div>

        <template v-else>
          <div
            class="min-w-4 min-h-2 "
            :class="[
              talkStore.isActiveChannelReserved ? metaNameClass : 'text-dark-800 dark:text-white',
              'text-base leading-tight no-wrap grow whitespace-nowrap truncate mr-2 max-w-[40vw] lg:max-w-[600PX]',
              isMobile ? 'cursor-pointer' : '',
            ]"
            @click="handleChannelNameClick"
          >
            {{
              talkStore.isActiveChannelReserved
                ? talkStore.activeCommunity?.name || 'kkkk'
                : talkStore.activeChannel?.name || talkStore.activeCommunity?.name || '----'
            }}
          </div>

          <template v-if="talkStore.activeChannel?.name && !talkStore.isActiveChannelReserved">
            <div
              class="border-r border-solid border-dark-300 dark:border-gray-400 hidden lg:block"
            ></div>
            <div
              class="text-base leading-tight no-wrap grow whitespace-nowrap text-dark-300 dark:text-gray-400 px-2 hidden lg:block capitalize"
            >
              {{
                talkStore.isActiveChannelPublic
                  ? $t('Talk.Channel.public_channel')
                  : $t('Talk.Channel.private_channel')
              }}
            </div>
          </template>
        </template>
      </div>
    </div>
    <div class="flex flex-row-reverse items-center justify-between grow">
      <div class="shrink-0 flex items-center">
        <div class="indicator-container mr-3" v-if="hasWS">
          <div
            class="w-2 h-2 rounded-full flex items-center justify-center border-2 border-lime-500 animate-pulse-glow"
          >
            <span
              class="w-1 h-1 rounded-full bg-lime-600 animate-pulse-glow"
              style="animation-delay: 0.2s"
            ></span>
          </div>
        </div>

        <div class="indicator-container mr-3" v-else>
          <div
            class="w-2 h-2 rounded-full flex items-center justify-center border-2 border-rose-500 animate-pulse-glow-2"
          >
            <span
              class="w-1 h-1 rounded-full bg-rose-600 animate-pulse-glow-2"
              style="animation-delay: 0.2s"
            ></span>
          </div>
        </div>
        <LoginedUserOperate />
      </div>

      <div
        class="ml-1 hidden lg:flex lg:items-center group"
        v-if="!talkStore.isActiveChannelGeneral && talkStore.activeChannel?.id"
      >
        <div
          class="text-xs text-dark-300 dark:text-gray-400 bg-dark-100 dark:bg-gray-800 px-3 py-1 rounded"
        >
          {{ shortenMetaId(talkStore.activeChannel.id) }}
        </div>
        <button
          class=" w-8 h-8 flex items-center justify-center rounded-3xl text-dark-400 cursor-pointer hover:text-dark-800 hover:border-solid hover:border-dark-300 hover:bg-primary transition-all duration-300"
        >
          <Icon
            name="arrow_up_right"
            class="w-3 h-3 p-1 box-content text-gray-500  cursor-pointer"
            @click="goCheckTxId(currentChannel.val?.txId, currentChannel.val?.chain)"
          />
        </button>

        <button
          class="mr-5 w-8 h-8 flex items-center justify-center rounded-3xl text-dark-400 cursor-pointer hover:text-dark-800 hover:border-solid hover:border-dark-300 hover:bg-primary transition-all duration-300"
          @click.stop="popInvite"
        >
          <Icon name="user_plus" class="w-4 h-4" />
        </button>
      </div>

      <div
        class="ml-1 hidden lg:flex lg:items-center group"
        v-else-if="talkStore.isActiveChannelReserved && talkStore.activeCommunityId"
      >
        <div
          class="text-xs text-dark-300 dark:text-gray-400 bg-dark-100 dark:bg-gray-800 px-3 py-1 rounded"
        >
          {{ shortenMetaId(talkStore.activeCommunityId) }}
        </div>
        <Icon
          name="arrow_up_right"
          class="w-3 h-3 p-1 box-content text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 hidden group-hover:block cursor-pointer"
          @click="goCheckTxId(talkStore.activeCommunity?.txId)"
        />
      </div>

      <!-- 占位 -->
      <div v-else class="w-1"></div>

      <!-- <div
        class="grow-0 pl-3 pr-2 truncate text-xs leading-tight overflow-x-hidden py-1 text-dark-800"
        @click="showDescModal = true"
      >
        {{ channel.description }}
      </div>
      <Teleport to="body">
        <ScreenModal
          v-if="showDescModal"
          :name="name"
          :description="description"
          @close-modal="showDescModal = false"
        />
      </Teleport> -->

      <!-- <div class="flex gap-x-4">
        <div class="" @click="doNothing()">
          <Icon
            name="share"
            class="w-5 h-5 transition-all ease-in-out duration-300 lg:hover:text-primary cursor-pointer"
          />
        </div>

        <div class="w-5 h-5" @click="$emit('toggleMemberList')">
          <Icon
            name="users"
            class="w-5 h-5 transition-all ease-in-out duration-300 lg:hover:text-primary cursor-pointer"
            :class="[showMembers ? 'text-primary lg:text-dark-800' : 'text-dark-800']"
          />
        </div>
      </div> -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'

import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { isMobile } from '@/stores/root'

import LoginedUserOperate from '@/components/LoginedUserOperate/LoginedUserOperate.vue'
import { useWsStore } from '@/stores/ws_new'
import { useRoute } from 'vue-router'
import { getOneChannel } from '@/api/talk'
import { Channel } from '@/@types/talk'
import { ChatChain } from '@/enum'

const talkStore = useTalkStore()
const layout = useLayoutStore()
const WS = useWsStore()
const route = useRoute()
const currentChannelId = ref(route.params?.channelId || '')

const currentChannel: { val: Channel | Object } = reactive({
  val: {},
})

const hasWS = computed(() => {
  return !!WS?.ws
})

watch(
  () => route.params,
  newVal => {
    if (newVal) {
      currentChannelId.value = newVal.channelId as string
      getOneChannel(currentChannelId.value as string).then(res => {
        currentChannel.val = res
      })
    }
  }
)

getOneChannel(currentChannelId.value as string).then(res => {
  currentChannel.val = res
})

const shortenMetaId = (id: string) => {
  return id.substring(0, 6) + '...' + id.substring(id.length - 6)
}

const createCommunity = () => {
  console.log('createCommunity')
}

const metaNameClass = computed(() => {
  return talkStore.activeCommunitySymbolInfo.suffix === 'eth' ? 'meta-name ens' : 'meta-name'
})

const popInvite = () => {
  talkStore.inviteLink = `${location.origin}/talk/channels/${talkStore.activeCommunitySymbol}/${talkStore.activeChannelId}`
  talkStore.invitingChannel = {
    community: talkStore.activeCommunity,
    channel: talkStore.activeChannel,
  }
  layout.isShowInviteModal = true
}

const goCheckTxId = (txId: string, chain: ChatChain) => {
  if (chain == ChatChain.btc) {
    window.open(`https://mempool.space/tx/${txId}`, '_blank')
  } else {
    window.open(`https://mvcscan.com/tx/${txId}`, '_blank')
  }
}

const doNothing = () => {}

const handleChannelNameClick = () => {
  // if (isMobile) {
  layout.isShowMemberListDrawer = true
  // }
}
</script>

<style lang="scss" scoped>
@keyframes pulse-glow {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 5px theme('colors.lime.500'), 0 0 10px theme('colors.lime.600');
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 10px theme('colors.lime.500'), 0 0 20px theme('colors.lime.600');
  }
}

@keyframes pulse-glow-2 {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 5px theme('colors.rose.500'), 0 0 10px theme('colors.rose.600');
  }
  50% {
    opacity: 0.6;
    box-shadow: 0 0 10px theme('colors.rose.500'), 0 0 20px theme('colors.rose.600');
  }
}

.animate-pulse-glow {
  animation: pulse-glow 1.5s ease-in-out infinite;
}

.animate-pulse-glow-2 {
  animation: pulse-glow-2 1.5s ease-in-out infinite;
}

/* 添加悬停暂停效果 */
.indicator-container:hover .animate-pulse-glow {
  animation-play-state: paused;
}
</style>
