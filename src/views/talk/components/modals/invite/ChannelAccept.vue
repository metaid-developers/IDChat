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

        <div class="flex items-center gap-x-3 mt-6">
          <Image
            :src="talk.invitingChannel?.icon"
            :customClass="
              '!w-13.5 !h-13.5 rounded-3xl object-cover object-center lg:group-hover:scale-110 transition-all duration-200'
            "
          />
          <div class="flex flex-col">
            <h4 class="text-2xl font-bold tracking-wider">
              {{ talk.invitingChannel?.roomName }}
            </h4>

            <div class="flex space-x-1.5 items-center">
              <div class="w-2.5 h-2.5 bg-lime-500 rounded-full"></div>
              <div class="text-dark-400 dark:text-gray-200 text-sm">
                {{ talk.invitingChannel?.userCount }}
                {{ $t('Talk.Community.members', talk.invitingChannel?.memberTotal) }}
              </div>
            </div>
          </div>
        </div>

        <div class="mt-11 w-full">
          <Button
            class="w-full main-border bg-primary dark:text-dark-800 font-medium text-base py-3 outline-0"
            @click="tryJoinChannel"
          >
            {{ $t('Talk.Modals.join') }}
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
import { useRouter } from 'vue-router'
import { useRootStore } from '@/stores/root'
import { sleep } from '@/utils/util'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import i18n from '@/utils/i18n'
const layout = useLayoutStore()
const root = useRootStore()
const talk = useTalkStore()
const user = useUserStore()
const router = useRouter()
const { openConnectionModal, closeConnectionModal, setMissingWallet } =
  useConnectionModal()

const loginFirst = () => {
  talk.communityStatus = 'auth processing'
  layout[ShowControl.isShowChannelAcceptInviteModal] = false
  openConnectionModal()
  //root.isShowLogin = true
}

const tryJoinChannel = async () => {
  // 游客
 try {
   
  if (!user.isAuthorized) {
    return loginFirst()
  }

  layout[ShowControl.isShowChannelAcceptInviteModal] = false
  layout.isShowLoading = true
  
  
  const joinRes = await joinChannel(talk.invitingChannel.groupId)
  
    console.log("joinRes",joinRes)

  
  layout.isShowLoading = false

  // 如果没有成功加入，则跳转回buzz页面
  if (joinRes.status === 'failed') {
    talk.invitingChannel = null
    router.push('/')
    return
  }
  // talk.
  // const find = talk.communities.find(
  //   community => community.communityId === talk.invitedCommunity.communityId
  // )
  // if (!find) {
  //   talk.communities.push(talk.invitedCommunity)
  // }
  talk.invitingChannel = null

  // 等待3秒后改变状态（防止后端还未同步）
  await sleep(1000)

  talk.communityStatus = 'invited'
  layout.$patch({showJoinView:false})
  window.location.reload()
 } catch (error) {
   talk.invitingChannel = null
  layout.isShowLoading = false
  ElMessage.error(`${(error as any).toString()}! ${i18n.global.t('retry_join')}`,)
 }
}
</script>
