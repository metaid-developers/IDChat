<template>
  <div
    class="py-3 px-2 main-border only-bottom cursor-pointer !bg-white dark:!bg-gray-700 relative group"
    :class="[
      channel.id === talk.activeChannelId || 'faded',
      channel.isPlaceHolder && 'animate-pulse',
    ]"
    @click="goChannel()"
    v-loading="loading"
    :element-loading-svg="LoadingTEXT"
  >
    <span
      class="absolute right-0 top-0 flex items-start bg-red-500 w-2.5 h-2.5 rounded-full -translate-y-1/3 translate-x-1/3"
      v-if="talk.hasUnreadMessagesOfChannel(channel.id)"
    >
    </span>

    <div
      class="text-dark-800 dark:text-gray-100 text-sm font-medium flex items-center"
      :title="channel.name"
    >
      <Icon
        :name="channelSymbol(channel)"
        class="w-5 h-4 text-dark-400 dark:text-gray-200 shrink-0"
        :class="talk.channelType(channel) === 'FT' ? 'py-0.75' : ''"
      />

      <div class="ml-1 truncate grow">
        {{ channel.name }}
      </div>

      <template v-if="hasButtons && isDesktop">
        <button
          class="hover:text-dark-800 dark:hover:text-white text-dark-300 dark:text-gray-400 mr-2 hidden group-hover:!block"
          @click.stop="editChannel"
          v-if="talk.isAdmin()"
        >
          <Icon name="edit" class="w-3 h-3" />
        </button>

        <button
          class="hover:text-dark-800 dark:hover:text-white text-dark-300 dark:text-gray-400 hidden group-hover:!block"
          @click.stop="popInvite(channel.id)"
        >
          <Icon name="user_plus" class="w-4 h-4" />
        </button>
      </template>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { defineProps, ref, watch, computed } from 'vue'
import { useRouter } from 'vue-router'

import { Channel } from '@/@types/talk'
import { GroupChannelType, JobStatus } from '@/enum'
import { useChannelFormStore } from '@/stores/forms'
import { useJobsStore } from '@/stores/jobs'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { LoadingTEXT } from '@/utils/LoadingSVGText'

const talk = useTalkStore()
const router = useRouter()
const layout = useLayoutStore()

interface Props {
  channel: any
  hasButtons?: boolean
}
const props = withDefaults(defineProps<Props>(), {
  channel: {} as Channel,
  hasButtons: true,
})

const loading = ref(false)
const isDesktop = computed(() => window.innerWidth > 1024)

// 如果是占位符，则使用订阅id来观察ws消息
const jobsStore = useJobsStore()
watch(
  () => jobsStore.waitingNotify.find(job => job.id === props.channel.uuid)?.status,
  status => {
    if (status === JobStatus.Success) {
      const job = jobsStore.waitingNotify.find(job => job.id === props.channel.uuid)
      props.channel.id = job!.steps.at(-1)?.metanetId
      props.channel.txId = job!.steps.at(-1)?.txId
      // 删除占位符标识，并写入真正的channelId
      props.channel.isPlaceHolder = false
    } else if (status === JobStatus.Failed) {
      // 从列表中删除
      talk.activeCommunityChannels.splice(
        talk.activeCommunityChannels.findIndex(channel => channel.id === props.channel.uuid),
        1
      )
    }
  }
)

const goChannel = () => {
  if (props.channel.isPlaceHolder) {
    return
  }

  const currentCommunityId = router.currentRoute.value.params.communityId
  const currentChannelId = router.currentRoute.value.params.channelId

  // layout.isShowLeftNav = false
  layout.$patch({ isShowLeftNav: false,isShowContactList:false })

  if (currentChannelId === props.channel.id) {
    return
  }

  router.push(`/talk/channels/${currentCommunityId}/${props.channel.id}`)
}

const channelSymbol = (channel: any) => {
  // 功能頻道
  switch (channel.id) {
    case 'announcements':
      return 'megaphone'
    case 'topics':
      return 'fire'
  }

  switch (talk.channelType(channel)) {
    case GroupChannelType.PublicText:
      return 'hashtag'
    case GroupChannelType.Password:
      return 'lock'
    case GroupChannelType.NFT:
    case GroupChannelType.ETH_NFT:
    case GroupChannelType.BSV_NFT:
    case GroupChannelType.POLYGON_NFT:
      return 'NFT'
    case GroupChannelType.FT:
      return 'FT'
    case GroupChannelType.Native:
      return 'circle_stack'
    default:
      return 'hashtag'
  }
}

const popInvite = (channelId: string) => {
  talk.inviteLink = `${location.origin}/talk/channels/${talk.activeCommunitySymbol}/${channelId}`
  talk.invitingChannel = {
    community: talk.activeCommunity,
    channel: talk.activeCommunityChannels.find(c => c.id === channelId),
  }
  layout.isShowInviteModal = true
}

async function editChannel() {
  loading.value = true

  const form = useChannelFormStore()
  await form.recover(props.channel)
  if (props.channel.roomType === '1') {
    layout.isShowCreatePublicChannelModal = true
  } else {
    layout.isShowCreateConsensualChannelModal = true
  }

  loading.value = false
}
</script>
