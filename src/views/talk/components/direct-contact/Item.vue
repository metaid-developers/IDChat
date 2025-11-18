<template>
  <div
    class="p-3 flex w-full max-w-[100vw] items-center space-x-3 overflow-x-hidden lg:hover:bg-gray-200 lg:hover:dark:bg-gray-900 cursor-pointer"
    :class="[isActive ? 'bg-gray-200 dark:bg-gray-900' : '']"
    @click="switchChannel"
  >
    <div class="rounded-3xl w-12 h-12 shrink-0  relative">
      <ChatIcon
        :src="session?.avatar || ''"
        :alt="session?.name"
        :customClass="'w-12 h-12 rounded-full'"
      />
    </div>

    <div class="flex flex-col items-stretch grow space-y-1 overflow-x-hidden">
      <div class="flex relative items-center justify-between self-stretch">
        <div class="flex items-center justify-center">
          <Icon
            name="group_chat_1"
            v-show="session?.type === ChannelType.Group"
            class="w-[20PX] h-[15PX] mr-1 shrink-0 text-gray-500 dark:text-white"
          />
          <div class=" font-medium dark:text-gray-100 max-w-[150px] truncate">
            {{ session?.name }}
          </div>
        </div>

        <div class="shrink-0  text-dark-250 dark:text-gray-400 text-xs">
          {{ formatTimestamp(session?.lastMessage?.timestamp, i18n, false) }}
        </div>
      </div>
      <!-- <div class="text-xs truncate font-medium max-w-[50PX]">{{session?.newMessages ? session?.newMessages[session?.newMessages?.length -1]?.userInfo?.name : '' }}</div> -->
      <!-- <div class="text-xs truncate font-medium max-w-[50PX]">{{session?.newMessages ? session?.newMessages[session?.newMessages?.length -1]?.timestamp : '' }}</div> -->
      <div class="flex items-center justify-between gap-2">
        <div class="text-xs flex items-center truncate max-w-fit ">
          <div
            v-if="session?.type === 'group' && session?.lastMessage"
            class="text-dark-800  dark:text-gray-500 font-medium"
          >
            <UserName :name="session?.lastMessage?.senderName" :meta-name="''" />&nbsp;:&nbsp;
          </div>

          <span class="text-dark-300 dark:text-gray-400 truncate">
            {{ computeDecryptedMsg(session) }}
          </span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <!-- @ mention badge -->
          <el-badge
            v-show="session?.unreadMentionCount && session.unreadMentionCount > 0"
            class="item mention-badge"
            :value="session.unreadMentionCount"
            :offset="[10, 5]"
            :max="999"
          >
            <div class="flex items-center justify-center  text-white text-xs font-bold">
              @
            </div>
          </el-badge>
          <!-- regular unread badge -->
          <el-badge
            v-show="unReadCount(session) > 0"
            class="item"
            :value="unReadCount(session)"
            :offset="[10, 5]"
            :max="999"
          >
          </el-badge>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { MessageType, SimpleChannel } from '@/@types/simple-chat.d'
import { useSimpleTalkStore } from '@/stores/simple-talk'
export default defineComponent({
  name: 'DirectContactItem',
})
</script>

<script lang="ts" setup>
import { formatTimestamp, decryptedMessage } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { computed, toRaw, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { decrypt, ecdhDecrypt } from '@/utils/crypto'
import { useCredentialsStore } from '@/stores/credentials'
import { useConnectionStore } from '@/stores/connection'
import { atobToHex, containsString } from '@/utils/util'
import { NodeName, IsEncrypt, ChatType, ChannelType } from '@/enum'
import { nextTick } from 'process'
import { storeToRefs } from 'pinia'
import { useEcdhsStore } from '@/stores/ecdh'
const i18n = useI18n()

const layout = useLayoutStore()
const router = useRouter()
const route = useRoute()

const imageType = ['jpg', 'jpeg', 'png', 'gif']
const props = defineProps(['session'])

const simpleTalkStore = useSimpleTalkStore()
const unReadCount = (session: SimpleChannel) => {
  if (
    session &&
    session.lastMessage &&
    typeof session.lastMessage.index === 'number' &&
    typeof session.lastReadIndex === 'number'
  ) {
    return session.lastMessage.index - session.lastReadIndex
  }
  return 0
}
const computeDecryptedMsg = (session: SimpleChannel) => {
  try {
    if (!session.lastMessage || !session.lastMessage.content) {
      return ''
    }
    let content
    if (session.type === 'group') {
      let secretKeyStr = session.id?.substring(0, 16) || ''
      switch (session.lastMessage.type) {
        case MessageType.msg:
          return decrypt(session.lastMessage.content, secretKeyStr)
        case MessageType.red:
          return session.lastMessage.content
        case MessageType.img:
          return `[${i18n.t('new_msg_img')}]`
        default:
          return ''
      }
    } else {
      const ecdhsStore = useEcdhsStore()
      // console.log("talk.activeChannel.publicKeyStr",talk.activeChannel.publicKeyStr)
      const ecdhPubkey = session?.lastMessage?.chatPublicKey
      if (!ecdhPubkey) {
        return ''
      }
      let ecdh = ecdhsStore.getEcdh(ecdhPubkey)

      try {
        const sharedSecret = ecdh?.sharedSecret
        if (!sharedSecret) {
          return ''
        }

        return ecdhDecrypt(session.lastMessage.content, sharedSecret)
      } catch (error) {
        return ''
      }
    }
  } catch (error) {
    return ''
  }
}

const isActive = computed(() => {
  return (
    (simpleTalkStore.activeChannelId === props.session?.id ||
      simpleTalkStore.activeChannel?.parentGroupId === props.session?.id) &&
    route.params?.channelId !== 'welcome'
  )
})

const switchChannel = () => {
  layout.$patch({
    isShowLeftNav: false,
  })
  simpleTalkStore.setActiveChannel(props.session?.id || '')

  if (props.session?.type === ChannelType.Group) {
    router.push(`/talk/channels/public/${props.session?.id}`)
  } else {
    router.push(`/talk/@me/${props.session?.id}`)
  }
}
</script>

<style lang="scss" scoped>
.transition-all {
  transition: all 0.2s ease-in-out;
}

* {
  backface-visibility: hidden;
  transform: translateZ(0);
}
</style>
