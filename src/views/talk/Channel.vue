<template>
  <div class="relative lg:flex text-base fullscreen overscroll-y-none">
    <DirectContactList />
    <!-- <CommunityInfo v-if="!isPublicChannel(communityId)" /> -->

    <div class="lg:grow fullscreen lg:!h-screen lg:relative lg:flex">
      <ChannelHeader />

      <div class="pt-12 lg:relative w-full bg-dark-200 dark:bg-gray-900 lg:pt-15 h-full">
        <router-view :key="($route.params.channelId as string)"></router-view>
      </div>

      <!-- <Transition name="slide">
        <ChannelMemberListWrap v-show="layout.isShowMemberList" />
      </Transition> -->
    </div>

    <ChannelMemberListDrawer
      v-if="layout.isShowMemberListDrawer"
      v-model="layout.isShowMemberListDrawer"
      :key="($route.params.channelId as string)"
    />

    <!-- modals -->
    <PasswordModal v-if="layout.isShowPasswordModal" />
    <RequireNftModal v-if="layout.isShowRequireNftModal" />
    <RequireFtModal v-if="layout.isShowRequireFtModal" />
    <RequireNativeModal v-if="layout.isShowRequireNativeModal" />
    <CheckingPass v-if="layout.isShowCheckingPass" />
    <InviteModal v-if="layout.isShowInviteModal" />
    <CommunityCardModal v-if="layout.isShowCommunityCardModal" />
    <AcceptInviteModal v-if="layout.isShowAcceptInviteModal" />
    <ChannelAcceptInviteModal v-if="layout.isShowChannelAcceptInviteModal" />

    <LoadingCover v-if="layout.isShowLoading" />
    <RedPacketOpenModal v-if="layout.isShowRedPacketOpenModal" />
    <RedPacketCreateModal v-if="layout.isShowRedPacketModal" />
    <RedPacketResultModal v-if="layout.isShowRedPacketResultModal" />
    <ShareToBuzzModal v-if="layout.isShowShareToBuzzModal" />
    <ShareSuccessModal v-if="layout.isShowShareSuccessModal" />
    <CommunitySettingsModal v-if="layout.isShowCommunitySettingsModal" />
    <!-- <NoMetaNameModal v-if="layout.isShowNoMetaNameModal" /> -->
    <LeaveCommunityModal v-if="layout.isShowLeaveCommunityModal" />
    <CreatePublicChannelModal v-if="layout.isShowCreatePublicChannelModal" />
    <CreateBroadcastChannelModal v-if="layout.isShowCreateBroadcastChannelModal" />
    <!-- <CreateGroupTypeModal v-if="layout.isShowCreateGroupTypeModal" /> -->
  </div>
</template>

<script setup lang="ts">
import { defineAsyncComponent, watch } from 'vue'
import { useRoute } from 'vue-router'

import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import { isPublicChannel } from '@/utils/meta-name'

import ChannelHeader from './components/ChannelHeader.vue'
import DirectContactList from './components/direct-contact/List.vue'
//import CreateGroupTypeModal from './components/modals/CreateGroupTypeModal.vue'
import { useUserStore } from '@/stores/user'

const ChannelMemberListDrawer = defineAsyncComponent(
  () => import('./components/ChannelMemberListDrawer.vue')
)
const PasswordModal = defineAsyncComponent(() => import('./components/modals/consensus/Password.vue'))
const CommunitySettingsModal = defineAsyncComponent(
  () => import('./components/modals/community/settings/Index.vue')
)
const RequireNftModal = defineAsyncComponent(
  () => import('./components/modals/consensus/RequireNft.vue')
)
const RequireFtModal = defineAsyncComponent(() => import('./components/modals/consensus/RequireFt.vue'))
const CheckingPass = defineAsyncComponent(
  () => import('./components/modals/consensus/CheckingPass.vue')
)
const RequireNativeModal = defineAsyncComponent(
  () => import('./components/modals/consensus/RequireNative.vue')
)
const RedPacketOpenModal = defineAsyncComponent(
  () => import('./components/modals/red-packet/Open.vue')
)
const RedPacketResultModal = defineAsyncComponent(
  () => import('./components/modals/red-packet/Result.vue')
)
const RedPacketCreateModal = defineAsyncComponent(
  () => import('./components/modals/red-packet/Create.vue')
)
const AcceptInviteModal = defineAsyncComponent(() => import('./components/modals/invite/Accept.vue'))
const ChannelAcceptInviteModal = defineAsyncComponent(
  () => import('./components/modals/invite/ChannelAccept.vue')
)
const InviteModal = defineAsyncComponent(() => import('./components/modals/invite/Invite.vue'))
const CommunityCardModal = defineAsyncComponent(
  () => import('./components/modals/invite/CommunityCard.vue')
)
const ShareToBuzzModal = defineAsyncComponent(
  () => import('./components/modals/invite/ShareToBuzz.vue')
)
const ShareSuccessModal = defineAsyncComponent(
  () => import('./components/modals/invite/ShareSuccess.vue')
)
const LeaveCommunityModal = defineAsyncComponent(() => import('./components/modals/community/Leave.vue'))
const LoadingCover = defineAsyncComponent(() => import('./components/modals/LoadingCover.vue'))
const CreatePublicChannelModal = defineAsyncComponent(
  () => import('./components/modals/CreatePublicChannelModal.vue')
)
const CreateBroadcastChannelModal = defineAsyncComponent(
  () => import('./components/modals/CreateBroadcastChannelModal.vue')
)

// const talk = useTalkStore()
const simpleTalk = useSimpleTalkStore()
const user = useUserStore()
const route = useRoute()
const layout = useLayoutStore()
console.log('route', route)
// onMounted(()=>{

//   // if(route.path.indexOf('@me') < 0){
//   //   layout.$patch({isShowLeftNav:true})
//   // }
//
// })

// 初始化 simple-talk store
const initSimpleTalk = async () => {
  if (user.isAuthorized) {
    try {
      await simpleTalk.ensureInitialized()
      console.log('✅ Simple-talk store 初始化成功')
    } catch (error) {
      console.error('❌ Simple-talk store 初始化失败:', error)
    }
  }
}

// 初始化頻道
function init(communityId: string, channelId: string) {
  // 初始化 simple-talk store
  console.log('🚀 初始化 simple-talk store')
  initSimpleTalk()

  // 先检查社区是否还佩戴有效的metaname
  // talk.checkCommunityMetaName(communityId).then((isValid: boolean) => {
  //   layout.isShowNoMetaNameModal = false

  //   if (!isValid) {
  //     // 显示社区没有metaname modal
  //     talk.activeCommunityId = communityId
  //     // layout.isShowNoMetaNameModal = true
  //     return
  //   }

  //   // 如果是游客，则返回游客模式
  //   if (!user.isAuthorized) {
  //     return initChannelGuestMode(channelId)
  //     // return initGuestMode(communityId)
  //   }

  //   talk.checkChannelMembership(communityId, channelId).then(async (isMember: boolean) => {
  //     if (!isMember) {
  //       await talk.inviteChannel(channelId)
  //       return
  //     }

  //     talk.initCommunity(communityId, channelId)
  //   })
  // })
}

// 初始化游客模式
async function initGuestMode(communityId: string) {
  // 1. 将当前社区推入社区列表
  // await talk.addTempCommunity(communityId)
  // 2. 弹出邀请框
  // await talk.invite(communityId)
  // 2. 弹出注册框
  // 4. 接受邀请逻辑
}

// 初始化游客模式
async function initChannelGuestMode(channelId: string) {
  // 1. 将当前社区推入社区列表
  // await talk.addTempCommunity(communityId)
  // 2. 弹出邀请框
  // await talk.inviteChannel(channelId)
  // 2. 弹出注册框
  // 4. 接受邀请逻辑
}

const { communityId, channelId, subId } = route.params as {
  communityId: string
  channelId: string
  subId?: string
}

watch(
  () => route.params,
  (newVal, oldVal) => {
    // 检查 channelId 或 communityId 是否变化
    const channelChanged = newVal.channelId != oldVal.channelId
    const communityChanged = newVal.communityId != oldVal.communityId

    if (channelChanged || communityChanged) {
      console.log('🔄 路由参数变化:', {
        oldCommunityId: oldVal.communityId,
        newCommunityId: newVal.communityId,
        oldChannelId: oldVal.channelId,
        newChannelId: newVal.channelId,
      })

      if (newVal?.subId && newVal?.subId !== oldVal?.subId) {
        resolve(newVal.communityId as string, newVal.channelId as string, newVal.subId as string)
      } else {
        resolve(newVal.communityId as string, newVal.channelId as string)
      }
    } else {
      if (oldVal.subId) {
        resolve(newVal.communityId as string, newVal.channelId as string)
      } else if (newVal.subId) {
        resolve(newVal.communityId as string, newVal.channelId as string, newVal.subId as string)
      }
    }
  },
  { deep: true }
)

// 解析 communityId 为 metaName 的情况
async function resolve(communityId: string, channelId: string, subId?: string) {
  console.log('解析 communityId:', communityId, channelId, subId)

  if (isPublicChannel(communityId)) {
    await simpleTalk.ensureInitialized()
    if (simpleTalk.channels.find(c => c.id === channelId)) {
      if (simpleTalk.activeChannelId !== channelId) {
        console.log('切换频道:subId', subId)
        if (channelId && subId) {
          await simpleTalk.enterSubGroupChat(subId)
        } else {
          console.log('频道已存在，直接激活:', channelId)
          await simpleTalk.setActiveChannel(channelId)
        }
      } else {
        if (channelId && subId) {
          await simpleTalk.enterSubGroupChat(subId)
        }
      }
    } else {
      if (channelId !== 'welcome') {
        console.log('频道不存在，尝试创建或获取:', channelId)
        if (subId) {
          // ElMessage.warning(`${i18n.t('Talk.Channel.Join.Main_Neeed')}`)
          layout.isShowLoading = true
          await simpleTalk.setActiveChannel(channelId)
          await simpleTalk.enterSubGroupChat(subId)
          layout.isShowLoading = false
        } else {
          await simpleTalk.setActiveChannel(channelId)
        }
      }
    }
  } else {
    await simpleTalk.ensureInitialized()
    await simpleTalk.setActiveChannel(channelId)
  }
}
resolve(communityId, channelId, subId)

// watch(
//   () => talk.communityStatus,
//   async (status: string) => {
//     if (status === 'invited') {
//       return resolve(communityId, channelId)
//     }
//   },
//   { immediate: true }
// )

// watch(
//   [ () => user.isAuthorized],
//   ([status, isAuthorized]) => {
//     if (status === 'auth processing' && isAuthorized) {
//       talk.communityStatus = 'authed'
//       return resolve(communityId, channelId)
//     }
//   },
//   { immediate: true }
// )

// 监听路由参数变化，激活对应的频道
// watch(
//   () => route.params.channelId,
//   async (newChannelId: string | string[]) => {
//     if (user.isAuthorized && simpleTalk.isInitialized && newChannelId) {
//       const channelId = Array.isArray(newChannelId) ? newChannelId[0] : newChannelId
//       console.log('🔄 路由变化，切换到频道:', channelId)

//       // 设置激活的频道
//       simpleTalk.activeChannelId = channelId

//       // 如果频道不存在于本地，尝试创建或获取
//       const existingChannel = simpleTalk.channels.find(c => c.id === channelId)
//       if (!existingChannel) {
//         console.log('🔍 频道不存在于本地，尝试获取或创建...')
//         // 这里可能需要根据 channelId 的类型判断是私聊还是群聊
//         // 暂时先同步一下服务器数据
//         try {
//           await simpleTalk.syncFromServer()
//         } catch (error) {
//           console.warn('同步服务器数据失败:', error)
//         }
//       }
//     }
//   },
//   { immediate: true }
// )

// onBeforeUnmount(() => {
//   talk.saveReadPointers()
//   talk.closeReadPointerTimer()
// })
</script>

<style lang="scss" scoped>
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
}

::-webkit-scrollbar {
  width: 0px;
}
</style>
