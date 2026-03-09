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
      v-model="layout.isShowMemberListDrawer"
      :key="($route.params.channelId as string)"
    />

    <!-- modals -->
    <PasswordModal v-if="layout.isShowPasswordModal" />
    <RequireNftModal v-if="layout.isShowRequireNftModal" />
    <RequireFtModal v-if="layout.isShowRequireFtModal" />
    <RequireNativeModal v-if="layout.isShowRequireNativeModal" />
    <CheckingPass />
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
    <leaveCommunityModal v-if="layout.isShowLeaveCommunityModal" />
    <CreatePublicChannelModal v-if="layout.isShowCreatePublicChannelModal" />
    <CreateBroadcastChannelModal v-if="layout.isShowCreateBroadcastChannelModal" />
    <!-- <CreateGroupTypeModal v-if="layout.isShowCreateGroupTypeModal" /> -->
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onUnmounted, watch, onMounted, onActivated } from 'vue'
import { useRoute } from 'vue-router'

import { useTalkStore } from '@/stores/talk'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import { isMetaName, resolveMetaName, isPublicChannel } from '@/utils/meta-name'

import ChannelHeader from './components/ChannelHeader.vue'
import CommunityInfo from './components/CommunityInfo.vue'
import ChannelMemberListWrap from './components/ChannelMemberListWrap.vue'
import ChannelMemberListDrawer from './components/ChannelMemberListDrawer.vue'
import PasswordModal from './components/modals/consensus/Password.vue'
import CommunitySettingsModal from './components/modals/community/settings/Index.vue'
import RequireNftModal from './components/modals/consensus/RequireNft.vue'
import RequireFtModal from './components/modals/consensus/RequireFt.vue'
import CheckingPass from './components/modals/consensus/CheckingPass.vue'
import RequireNativeModal from './components/modals/consensus/RequireNative.vue'
import RedPacketOpenModal from './components/modals/red-packet/Open.vue'
import RedPacketResultModal from './components/modals/red-packet/Result.vue'
import RedPacketCreateModal from './components/modals/red-packet/Create.vue'
import AcceptInviteModal from './components/modals/invite/Accept.vue'
import ChannelAcceptInviteModal from './components/modals/invite/ChannelAccept.vue'
import InviteModal from './components/modals/invite/Invite.vue'
import CommunityCardModal from './components/modals/invite/CommunityCard.vue'
import ShareToBuzzModal from './components/modals/invite/ShareToBuzz.vue'
import ShareSuccessModal from './components/modals/invite/ShareSuccess.vue'
import NoMetaNameModal from './components/modals/community/NoMetaName.vue'
import leaveCommunityModal from './components/modals/community/Leave.vue'
import DirectContactList from './components/direct-contact/List.vue'
import CreatePublicChannelModal from './components/modals/CreatePublicChannelModal.vue'
import CreateBroadcastChannelModal from './components/modals/CreateBroadcastChannelModal.vue'
//import CreateGroupTypeModal from './components/modals/CreateGroupTypeModal.vue'
import LoadingCover from './components/modals/LoadingCover.vue'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'

// const talk = useTalkStore()
const simpleTalk = useSimpleTalkStore()
const user = useUserStore()
const route = useRoute()
const layout = useLayoutStore()
const i18n = useI18n()
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
