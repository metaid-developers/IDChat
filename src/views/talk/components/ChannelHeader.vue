<template>
  <div
    class="fixed left-0 right-0 top-0 flex items-center px-4 h-12 border-b-2 border-solid border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-700 z-30 lg:h-15 lg:absolute"
  >
    <div class="max-w-[50%] flex items-center justify-center " v-if="!isWelcomePage">
      <a class="mt-1 text-center  lg:hidden" @click="backWelcome">
        <el-icon class="w-3 h-3 cursor-pointer  mx-2 shrink-0"><Back /></el-icon>
      </a>

      <div class="flex shrink-0 items-center">
        <div class="  lg:block" v-if="activeChannel?.type === 'private'">
          <div class="flex shrink-0 items-center">
            <UserAvatar
              :image="activeChannel?.avatar || ''"
              :meta-id="activeChannel?.id"
              :name="activeChannel?.name"
              :meta-name="''"
              class="lg:w-8 lg:h-8 shrink-0 select-none w-6 h-6 lg:block mr-2"
              :disabled="true"
            />
            <div
              class="leading-tight no-wrap grow whitespace-nowrap truncate pr-2 max-w-[35vw] lg:max-w-[600PX]"
              @click="layout.isShowUserInfo = !layout.isShowUserInfo"
            >
              <UserName :name="activeChannel?.name" :meta-name="''" :text-class="'!text-base'" />
            </div>
          </div>
        </div>

        <template v-else>
          <div
            class="min-w-4 min-h-2 text-dark-800 dark:text-white"
            :class="[
              {
                'text-base leading-tight no-wrap grow whitespace-nowrap truncate mr-2 max-w-[40vw] lg:max-w-[600PX]': true,
                'cursor-pointer': isMobile,
              },
            ]"
            @click="handleChannelNameClick"
          >
            {{ activeChannel?.name }}
          </div>

          <template v-if="activeChannel?.type === 'group'">
            <div
              class="border-r border-solid border-dark-300 dark:border-gray-400 hidden lg:block"
            ></div>
            <div
              class="text-base leading-tight no-wrap grow whitespace-nowrap text-dark-300 dark:text-gray-400 px-2 hidden lg:block capitalize"
            >
              {{
                isPrivateGroup
                  ? $t('Talk.Channel.private_group')
                  : $t('Talk.Channel.public_channel')
              }}
            </div>
          </template>
        </template>
      </div>
    </div>
    <div class="flex flex-row-reverse items-center justify-between grow">
      <div class="shrink-0 flex items-center">
        <LoginedUserOperate />
        <div
          class="ml-1 cursor-pointer "
          v-if="userStore.isAuthorized && activeChannel?.type === 'group' && !isWelcomePage"
          @click="handleChannelNameClick"
        >
          <Icon
            v-if="rootStore.theme == 'light'"
            name="right_bars_4"
            class="w-[24PX] h-[20PX]  mx-2 shrink-0 "
          />

          <Icon v-else name="right_bars_5" class="w-[24PX] h-[20PX]  mx-2 shrink-0 " />
        </div>
      </div>

      <div
        class="ml-1 hidden lg:flex lg:items-center group"
        v-if="activeChannel?.type === 'group' && !isWelcomePage"
      >
        <div
          class="text-xs text-dark-300 dark:text-gray-400 bg-dark-100 dark:bg-gray-800 px-3 py-1 rounded"
        >
          {{ shortenMetaId(activeChannel.id) }}
        </div>

        <button
          class="mr-5 w-8 h-8 flex items-center justify-center rounded-3xl text-dark-400 cursor-pointer hover:text-dark-800 hover:border-solid hover:border-dark-300 hover:bg-primary transition-all duration-300"
          @click.stop="handleInviteClick"
        >
          <Icon name="user_plus" class="w-4 h-4" />
        </button>
      </div>

      <div v-else class="w-1"></div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'

import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { isMobile, useRootStore } from '@/stores/root'

import LoginedUserOperate from '@/components/LoginedUserOperate/LoginedUserOperate.vue'
import { useWsStore } from '@/stores/ws_new'
import { useRoute, useRouter } from 'vue-router'
import { getOneChannel } from '@/api/talk'
import { Channel } from '@/@types/talk'
import { ChatChain } from '@/enum'
import { useUserStore } from '@/stores/user'
import { Back } from '@element-plus/icons-vue'
import lightBar from '@/assets/images/lightBar.png'
import darkBar from '@/assets/images/darkBar.png'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { storeToRefs } from 'pinia'

// const talkStore = useTalkStore()
const { activeChannel: simpleTalkActiveChannel } = storeToRefs(useSimpleTalkStore())
const layout = useLayoutStore()
const userStore = useUserStore()
const WS = useWsStore()
const route = useRoute()
const router = useRouter()
const rootStore = useRootStore()
const currentChannelId = ref(route.params?.channelId || '')

const activeChannel = computed(() => {
  return simpleTalkActiveChannel.value?.type === 'sub-group'
    ? useSimpleTalkStore().getParentGroupChannel(simpleTalkActiveChannel.value.id!)
    : simpleTalkActiveChannel.value
})

const isPrivateGroup = computed(() => {
  return activeChannel.value?.roomJoinType === '100'
})

const isWelcomePage = computed(() => {
  if (route.params?.channelId == 'welcome') {
    return true
  } else return false
})

const currentChannel: { val: Channel | Object } = reactive({
  val: {},
})

const hasWS = computed(() => {
  return !!WS?.ws
})

const isAtMe = computed(() => {
  return route.name == 'talkAtMe'
})

// watch(
//   () => route.params,
//   newVal => {
//     if (newVal) {
//       currentChannelId.value = newVal.channelId as string
//       if (isAtMe.value) {
//         return
//       }

//       getOneChannel(currentChannelId.value as string).then(res => {
//         currentChannel.val = res
//       })
//     }
//   }
// )

// getOneChannel(currentChannelId.value as string).then(res => {
//   currentChannel.val = res
// })

// if (!isAtMe.value) {
//   getOneChannel(currentChannelId.value as string).then(res => {
//     currentChannel.val = res
//   })
// }

const shortenMetaId = (id: string) => {
  return id.substring(0, 6) + '...' + id.substring(id.length - 6)
}

const popInvite = () => {
  layout.inviteLink = window.location.href
  layout.isShowInviteModal = true
}

const handleInviteClick = () => {
  if (isPrivateGroup.value) {
    // 私密群聊：打开成员列表抽屉，用户可以在里面点击邀请
    layout.isShowMemberListDrawer = true
  } else {
    // 公开群聊：显示邀请链接弹窗
    popInvite()
  }
}

const goCheckTxId = (txId: string, chain: ChatChain) => {
  if (chain == ChatChain.btc) {
    window.open(`https://mempool.space/tx/${txId}`, '_blank')
  } else {
    window.open(`https://mvcscan.com/tx/${txId}`, '_blank')
  }
}

const backWelcome = () => {
  layout.$patch({ isShowLeftNav: true, isShowContactList: true })
  router.push({
    name: 'talkChannel',
    params: {
      communityId: 'public',
      channelId: 'welcome',
    },
  })
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

.back {
  width: 24px;
  height: 24px;
  text-align: center;
  line-height: 24px;
  position: relative;
  z-index: 2;
  cursor: pointer;

  .icon {
    width: 12px;
    height: 12px;
    display: inline-block;
    transform: rotate(90deg);
  }

  &:hover {
    .icon {
      &:deep(use) {
        stroke: var(--themeBtnTextColor);
        stroke-width: 2px;
      }
    }
  }
}
</style>
