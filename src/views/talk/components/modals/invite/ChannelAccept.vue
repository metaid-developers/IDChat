<template>
  <BaseModal
    v-model="layout[ShowControl.isShowChannelAcceptInviteModal]"
    :no-close="true"
    :full-screen="false"
  >
    <template #title>
      {{ $t('Talk.Modals.channel_accept_invite') }}
    </template>

    <template #body>
      <div class="flex flex-col items-center justify-center">
        <p class="text-base text-dark-400 dark:text-gray-200 font-medium">
          {{ $t('Talk.Modals.you_have_been_invited_channel') }}
        </p>

        <div class="flex items-center gap-x-3 mt-6" v-if="groupInfo">
          <!-- <Image
            :src="groupInfo?.roomIcon || ''"
            :customClass="
              '!w-13.5 !h-13.5 rounded-3xl object-cover object-center lg:group-hover:scale-110 transition-all duration-200'
            "
          /> -->
          <ChatIcon
            :src="groupInfo?.roomIcon || ''"
            :alt="groupInfo?.roomName"
            :customClass="'w-16 h-16 rounded-full'"
            :size="64"
          />
          <div class="flex flex-col">
            <h4 class="text-2xl font-bold tracking-wider">
              {{ groupInfo?.roomName }}
            </h4>

            <div class="flex space-x-1.5 items-center">
              <div class="w-2.5 h-2.5 bg-lime-500 rounded-full"></div>
              <div class="text-dark-400 dark:text-gray-200 text-sm">
                {{ groupInfo?.userCount }}
                {{ $t('Talk.Community.members') }}
              </div>
            </div>
          </div>
        </div>
        <template v-else>
          <el-result title="404" sub-title="Sorry, request error"> </el-result>
        </template>

        <div class="mt-11 w-full">
          <Button
            class="w-full main-border bg-primary dark:text-dark-800 font-medium text-base py-3 outline-0"
            :class="[loading ? 'opacity-50 cursor-not-allowed fade' : '']"
            @click="tryJoinChannel"
          >
            {{ !loading && !groupInfo ? $t('close') : $t('Talk.Modals.join') }}
          </Button>
        </div>
      </div>
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { ShowControl } from '@/enum'
import BaseModal from '../BaseModal.vue'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { joinChannel } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useRoute, useRouter } from 'vue-router'
import { useRootStore } from '@/stores/root'
import { sleep } from '@/utils/util'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import i18n from '@/utils/i18n'
import { GroupRoomInfo } from '@/@types/simple-chat.d'
import { onMounted, ref, watch } from 'vue'
import { getOneChannel } from '@/api/talk'
import { Channel } from '@/@types/talk'
import { ElMessage } from 'element-plus'
import { useSimpleTalkStore } from '@/stores/simple-talk'
const layout = useLayoutStore()
const root = useRootStore()
const talk = useTalkStore()
const user = useUserStore()
const router = useRouter()
const route = useRoute()
const groupInfo = ref<Channel>()
const loading = ref(false)
const { openConnectionModal, closeConnectionModal, setMissingWallet } = useConnectionModal()

const loginFirst = () => {
  talk.communityStatus = 'auth processing'
  layout[ShowControl.isShowChannelAcceptInviteModal] = false
  openConnectionModal()
  //root.isShowLogin = true
}

// 监听模态框显示状态和路由参数变化
watch(
  [() => layout[ShowControl.isShowChannelAcceptInviteModal], () => route.params.channelId],
  async ([isModalVisible, channelId]) => {
    if (isModalVisible && channelId) {
      console.log('邀请的频道信息', channelId)
      loading.value = true
      try {
        const res: Channel = await getOneChannel(channelId as string)
        if (res.txId) {
          groupInfo.value = res
          talk.invitingChannel = res
        }
      } catch (error) {
        console.error('获取频道信息失败:', error)
        if (
          error instanceof Error &&
          (error.message.includes('404') || error.message.includes('not found'))
        ) {
          ElMessage.error(i18n.global.t('Talk.Modals.channel_not_exist'))
        } else {
          ElMessage.error(i18n.global.t('Talk.Modals.failed_get_channel_info'))
        }
      } finally {
        loading.value = false
      }
    }
  },
  { immediate: true }
)

onMounted(async () => {
  // console.log('邀请的频道信息', route.params.channelId)
  // const channelId = route.params.channelId as string
  // if (channelId) {
  //   const res: Channel = await getOneChannel(channelId)
  //   if (res.txId) {
  //     groupInfo.value = res
  //     talk.invitingChannel = res
  //   }
  // }
})

const tryJoinChannel = async () => {
  // 游客
  try {
    if (!user.isAuthorized) {
      return loginFirst()
    }
    if (!groupInfo.value && !loading.value) {
      layout[ShowControl.isShowChannelAcceptInviteModal] = false
      return
    }

    layout[ShowControl.isShowChannelAcceptInviteModal] = false
    layout.isShowLoading = true

    const joinRes = await joinChannel(groupInfo.value!.groupId)

    console.log('joinRes', joinRes)

    layout.isShowLoading = false

    // 如果没有成功加入，则跳转回buzz页面
    if (joinRes.status === 'failed') {
      router.push('/')
      return
    }

    // 等待3秒后改变状态（防止后端还未同步）
    await sleep(1000)
    const simpleTalk = useSimpleTalkStore()
    if (!simpleTalk.isInitialized) {
      await simpleTalk.init()
    }
    await simpleTalk.syncFromServer()
    await simpleTalk.loadMessages(groupInfo.value!.groupId)
  } catch (error) {
    talk.invitingChannel = null
    layout.isShowLoading = false
    ElMessage.error(`${(error as any).toString()}! ${i18n.global.t('retry_join')}`)
  }
}
</script>
