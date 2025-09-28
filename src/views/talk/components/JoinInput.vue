<template>
  <div
    class="bg-white flex  items-center justify-center dark:bg-gray-700 w-full  py-[20px]"
    @click="tryJoinChannel"
  >
    <span class="font-lg text-[#FC4F60]">
      {{ $t('Join') }}
    </span>
  </div>
</template>
<script setup lang="ts">
import { ShowControl } from '@/enum'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { sleep } from '@/utils/util'
import { joinChannel } from '@/utils/talk'
const layout = useLayoutStore()
const user = useUserStore()
const router = useRouter()
const route = useRoute()
const i18n = useI18n()
const { openConnectionModal, closeConnectionModal, setMissingWallet } = useConnectionModal()

const loginFirst = () => {
  layout[ShowControl.isShowChannelAcceptInviteModal] = false
  openConnectionModal()
}

const tryJoinChannel = async () => {
  // 游客
  try {
    if (!user.isAuthorized) {
      return loginFirst()
    }
    const simpleTalk = useSimpleTalkStore()

    layout[ShowControl.isShowChannelAcceptInviteModal] = false
    layout.isShowLoading = true

    const joinRes = await joinChannel(simpleTalk.activeChannelId)

    layout.isShowLoading = false

    // 如果没有成功加入，则跳转回buzz页面
    if (joinRes.status === 'failed') {
      router.push('/')
      return
    }

    // 等待3秒后改变状态（防止后端还未同步）
    await sleep(1000)

    if (!simpleTalk.isInitialized) {
      await simpleTalk.init()
    }
    simpleTalk.convertTemporaryToRegular(simpleTalk.activeChannelId)
    await simpleTalk.syncFromServer()
  } catch (error) {
    layout.isShowLoading = false
    ElMessage.error(`${(error as any).toString()}! ${i18n.t('retry_join')}`)
  }
}
</script>
<style lang="scss" scoped></style>
