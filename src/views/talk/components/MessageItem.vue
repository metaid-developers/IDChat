<template>
  <div>
    <div
      class="w-full relative py-1 px-4 lg:hover:bg-gray-200 dark:lg:hover:bg-gray-950 transition-all duration-150   group message-item"
      :class="[{ replying: reply.val?.timestamp === message.timestamp }]"
      :data-message-id="messageId"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
    >
      <!-- 消息菜单 -->
      <template v-if="!isShare">
        <MessageMenu
          :message="props.message"
          :message-id="messageId"
          :parsed="
            parseTextMessage(
              decryptedMessage(
                message?.content,
                message?.encryption,
                message?.protocol,
                message?.isMock
              )
            )
          "
          v-model:translateStatus="translateStatus"
          v-model:translatedContent="translatedContent"
          @quote="message => emit('quote', message)"
          @toBuzz="data => emit('toBuzz', data)"
          :isMyMessage="isMyMessage"
          v-if="isText"
        />
        <MessageMenu
          :message="props.message"
          :message-id="messageId"
          @quote="message => emit('quote', message)"
          @toBuzz="data => emit('toBuzz', data)"
          :isMyMessage="isMyMessage"
          v-else
        />
      </template>

      <!-- quote -->
      <MessageItemQuote
        v-if="message.replyInfo"
        :quote="{ avatarImage: message.replyInfo?.userInfo?.avatar,
        index: message.replyInfo?.index,
    metaName: '',
    
    channelId:message?.replyInfo?.channelId || '',
    metaId: message.replyInfo?.metaId,
    nickName: message.replyInfo?.userInfo?.name,
    protocol: message.replyInfo?.protocol,
    content: message.replyInfo?.content,
    encryption: message.replyInfo?.encryption,
    timestamp: message.replyInfo!.timestamp}"
        v-bind="$attrs"
        :isMyMessage="(isMyMessage as boolean)"
      />

      <!-- 消息主体 -->
      <div class="flex" :class="[isMyMessage ? 'flex-row-reverse' : '']">
        <UserAvatar
          :image="props.message.userInfo?.avatar"
          :name="
            props.message.userInfo?.name
              ? props.message.userInfo?.name
              : props.message.userInfo?.metaid.slice(0, 6)
          "
          :meta-id="props.message.userInfo?.metaid"
          :meta-name="''"
          @click="toPrivateChat(props.message)"
          class="w-10 h-10 lg:w-13.5 lg:h-13.5 shrink-0 select-none cursor-pointer"
        />
        <div
          class="grow"
          :class="[isMyMessage ? 'mr-2 lg:mr-4 pl-8 lg:pl-12' : 'ml-2 lg:ml-4 pr-8 lg:pr-12']"
        >
          <div
            class="flex space-x-2"
            :class="[isMyMessage ? 'flex-row-reverse itmes-center' : 'items-baseline ']"
          >
            <!--message?.userInfo?.metaName-->
            <UserName
              :name="
                message.userInfo?.name
                  ? message.userInfo?.name
                  : message.userInfo?.metaid.slice(0, 6)
              "
              :meta-name="''"
              :text-class="'text-sm font-medium dark:text-gray-100 max-w-[120PX]'"
              :class="[isMyMessage ? 'ml-2' : '']"
            />
            <div
              class="text-xs shrink-0 whitespace-nowrap flex   "
              :class="[
                isMyMessage ? 'flex-row-reverse justify-center items-center' : 'gap-1 ',
                msgChain == ChatChain.btc ? 'text-[#EBA51A]' : 'text-dark-300 dark:text-gray-400',
              ]"
            >
              <span> {{ formatTimestamp(message.timestamp, i18n) }}</span>
              <div class="flex ">
                <Icon
                  name="btc"
                  v-if="msgChain == ChatChain.btc"
                  class="chain-icon-menu w-[16px] h-[16px]"
                  :class="isMyMessage ? 'mr-1' : ''"
                ></Icon>
                <!-- <img
                :src="btcIcon"
                class="chain-icon-menu w-[16px] h-[16px] "
                :class="isMyMessage ? 'mr-1' : ''"
                v-if="msgChain == ChatChain.btc"
              /> -->
              </div>
            </div>
          </div>

          <div
            class="w-full py-0.5 text-dark-400 dark:text-gray-200 text-xs capitalize"
            v-if="isGroupJoinAction"
          >
            {{ $t('Talk.Channel.join_channel') }}
          </div>
          <div
            class="w-full py-0.5 text-dark-400 dark:text-gray-200 text-xs capitalize"
            v-else-if="isGroupLeaveAction"
          >
            {{ $t('Talk.Channel.leave_channel') }}
          </div>
          <div
            class="w-full py-0.5 text-dark-400 dark:text-gray-200 text-xs"
            v-else-if="isGroupRemoveUserAction"
          >
            {{
              removeUserInfo?.reason
                ? $t('Talk.Channel.remove_user_with_reason', {
                    username: removeUserInfo.username,
                    reason: removeUserInfo.reason,
                  })
                : $t('Talk.Channel.remove_user', {
                    username: removeUserInfo?.username,
                  })
            }}
          </div>

          <div class="w-full" v-else-if="isNftEmoji">
            <ChatImage
              :src="
                decryptedMessage(
                  message?.content,
                  message?.encryption,
                  message?.protocol,
                  message?.isMock
                )
              "
              customClass="max-w-[80%] md:max-w-[50%] lg:max-w-[320px] py-0.5 object-scale-down"
            />

            <NftLabel class="w-8 mt-1" />
          </div>

          <div
            class="w-full flex py-0.5 items-center"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isImage"
          >
            <div
              class="w-fit max-w-[90%] md:max-w-[50%] lg:max-w-[235PX] max-h-[600PX] overflow-y-hidden rounded bg-transparent cursor-pointer transition-all duration-200 relative"
              @click="previewImage(message.content)"
            >
              <ChatImage
                :src="
                  decryptedMessage(
                    message?.content,
                    message?.encryption,
                    message?.protocol,
                    message?.isMock
                  )
                "
                customClass="rounded-xl py-0.5 object-scale-down max-w-full max-h-full"
              />
            </div>
            <!--message.error-->
            <button v-if="message.error" class="ml-3" :title="resendTitle" @click="tryResend">
              <Icon
                name="arrow_path"
                class="w-4 h-4 text-dark-400 dark:text-gray-200 hover:animate-spin-once"
              />
            </button>
          </div>

          <div
            class="text-xs text-dark-400 dark:text-gray-200 my-0.5 capitalize"
            v-else-if="isReceiveRedPacket"
          >
            {{ redPacketReceiveInfo }}
          </div>

          <div
            class="w-full py-0.5 flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isGiveawayRedPacket"
          >
            <div
              class="max-w-full sm:max-w-[300PX] shadow rounded-xl cursor-pointer origin-center hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-700 group"
              :class="[
                hasRedPacketReceived || redPackClaimOver
                  ? 'opacity-50'
                  : 'hover:animate-wiggle-subtle',
              ]"
              @click="handleOpenRedPacket"
            >
              <div
                class="rounded-xl p-4 flex space-x-2 bg-gradient-to-br  items-center"
                :class="[
                  hasRedPacketReceived
                    ? 'origin-top -skew-x-12 dark:-skew-x-6 shadow-md'
                    : 'shadow',
                  msgChain == ChatChain.btc
                    ? 'from-[#FFD897] via-[#FFD897] to-[#FFE9C5]'
                    : 'from-[#FFE8D2] via-[#FFF1B9] to-[#FEFFE3]',
                ]"
              >
                <img
                  :src="msgChain == ChatChain.btc ? giftBtcImage : giftMvcImage"
                  class="h-12 w-12"
                  loading="lazy"
                />
                <div class="">
                  <div class="text-dark-800 text-base font-medium">
                    {{ $t('Talk.Channel.come_get_red_envelope') }}
                  </div>
                  <div
                    class="text-dark-300 text-sm mt-1 truncate max-w-[150PX] lg:max-w-[180PX] min-w-[150px]"
                  >
                    {{ redPacketMessage }}
                  </div>
                </div>
              </div>

              <div class="flex py-2.5 items-center space-x-1.5 px-4">
                <Icon name="gift" class="w-4 h-4 text-dark-300 dark:text-gray-400" />
                <div class="text-dark-300 dark:text-gray-400 text-xs">
                  {{ $t('Talk.Input.giveaway') }}
                </div>
              </div>
            </div>
          </div>

          <!-- 群聊邀请链接 -->
          <div
            class="w-full py-0.5 flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isChatGroupLink"
          >
            <div
              class="max-w-full sm:max-w-[300px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md group"
              @click="handleGroupLinkClick"
            >
              <div class="p-4 space-y-3">
                <!-- 群头像和基本信息 -->
                <div class="flex items-center space-x-3">
                  <div class="">
                    <ChatIcon
                      :src="groupLinkInfo.groupAvatar"
                      :alt="groupLinkInfo.groupName"
                      custom-class="w-12 h-12 min-w-12 min-h-12 rounded-full"
                      :size="48"
                    />
                  </div>

                  <div class="flex-1 min-w-0">
                    <div
                      class="text-dark-800 dark:text-gray-100 font-medium text-base truncate max-w-[200px]"
                    >
                      {{ groupLinkInfo.groupName || 'Group Chat' }}
                    </div>
                    <div class="text-dark-400 dark:text-gray-400 text-sm">
                      {{ props.message.userInfo?.name || 'Someone' }} invites you to join this group
                    </div>
                  </div>
                </div>
                <div class="flex gap-4 items-center">
                  <div class="text-dark-400 dark:text-gray-400 text-xs mt-1 truncate max-w-[150px]">
                    creator: {{ groupLinkInfo.creator }}
                  </div>
                  <div
                    v-if="groupLinkInfo.memberCount > 0"
                    class="text-dark-400 dark:text-gray-400 text-xs mt-1"
                  >
                    members: {{ groupLinkInfo.memberCount }}
                  </div>
                </div>

                <!-- 查看群组按钮 -->
                <div class="pt-2 border-t border-gray-200 dark:border-gray-600">
                  <div
                    class="main-border bg-primary hover:bg-primary-dark text-black text-center py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
                  >
                    VIEW GROUP
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            class="my-1.5 max-w-full flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else
          >
            <div
              class="text-sm  text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl  transition-all duration-200"
              :class="[
                msgChain == ChatChain.btc && 'btc-item',
                isMyMessage
                  ? 'bg-primary dark:text-gray-800 rounded-tr'
                  : 'not-mine bg-white dark:bg-gray-700 rounded-tl',
                message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
              ]"
              v-if="translateStatus === 'showing'"
            >
              <div class="" v-html="translatedContent"></div>
              <div class="text-xxs text-dark-300 dark:text-gray-400 mt-1 underline">
                {{ $t('Talk.Messages.translated') }}
              </div>
            </div>

            <div
              class="flex items-center gap-2 text-sm   text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl  transition-all duration-200"
              :class="[
                msgChain == ChatChain.btc && 'btc-item',
                isMyMessage
                  ? 'bg-primary dark:text-gray-800 rounded-tr'
                  : 'not-mine bg-white dark:bg-gray-700 rounded-tl',
                message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
              ]"
              v-else
            >
              <div
                class="whitespace-pre-wrap"
                v-html="
                  parseTextMessage(
                    decryptedMessage(
                      message?.content,
                      message?.encryption,
                      message?.protocol,
                      message?.isMock
                    )
                  )
                "
              ></div>
              <div
                v-if="message.mockId && !message.error"
                class="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 inline-block
                opacity-50"
              ></div>
            </div>

            <!--message.error message?.reason {{ message?.reason }}-->
            <button
              v-if="message.error"
              class="ml-3   break-words flex items-center  justify-center"
              :title="resendTitle"
              @click="tryResend"
            >
              <span v-if="message?.error" class="text-[#fc457b] flex-1 font-sm mr-2">{{
                message?.error
              }}</span>
              <Icon
                name="arrow_path"
                class="w-4 h-4 flex-1  text-dark-400 dark:text-gray-200 hover:animate-spin-once"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NftLabel from './NftLabel.vue'
import MessageMenu from './MessageMenu.vue'
import {
  computed,
  inject,
  ref,
  Ref,
  onMounted,
  onUnmounted,
  nextTick,
  provide,
  defineProps,
  withDefaults,
  defineEmits,
} from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTimestamp, decryptedMessage, sendMessage } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import giftImage from '@/assets/images/gift.svg?url'
import giftBtcImage from '@/assets/images/gift_btc.svg?url'
import giftMvcImage from '@/assets/images/gift_mvc.svg?url'
import { useLayoutStore } from '@/stores/layout'
import { useModalsStore } from '@/stores/modals'
import { useJobsStore } from '@/stores/jobs'
import { getOneRedPacket } from '@/api/talk'
import { getOneChannel } from '@/api/talk'
import { useImagePreview } from '@/stores/imagePreview'
import MessageItemQuote from './MessageItemQuote.vue'
import { NodeName ,ChatChain} from '@/enum'
import { containsString } from '@/utils/util'
import { ElMessage } from 'element-plus'
import type { ChatMessageItem } from '@/@types/common'
import { isMobile } from '@/stores/root'
import { useRouter } from 'vue-router'
import {getUserInfoByAddress} from '@/api/man'
import ChatImage from '@/components/ChatImage/ChatImage.vue'
import btcIcon from '@/assets/images/btc.png'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { UnifiedChatMessage } from '@/@types/simple-chat'

const i18n = useI18n()

const modals = useModalsStore()
const userStore = useUserStore()
const simpleTalk= useSimpleTalkStore()
const layout = useLayoutStore()
const jobs = useJobsStore()
const reply: any = inject('Reply')
const router=useRouter()
const imagePreview = useImagePreview()
const visiableMenu = ref(false)

// 群信息缓存
const channelInfo = ref<any>(null)

const isText = computed(() => containsString(props.message.protocol, NodeName.SimpleGroupChat))

// 触摸状态管理
const touchStartTime = ref(0)
const touchStartPosition = ref({ x: 0, y: 0 })
const longPressTimer = ref<number | null>(null)
const LONG_PRESS_DURATION = 500 // 长按持续时间（毫秒）
const MOVE_THRESHOLD = 10 // 移动阈值（像素）

// 触摸开始处理
const handleTouchStart = (event: TouchEvent) => {
  if (!isMobile) return

  const touch = event.touches[0]
  touchStartTime.value = Date.now()
  touchStartPosition.value = { x: touch.clientX, y: touch.clientY }

  // 清除之前的菜单
  simpleTalk.clearActiveMessageMenu()

  // 设置长按定时器
  longPressTimer.value = window.setTimeout(() => {
    simpleTalk.setActiveMessageMenu(messageId.value)
  }, LONG_PRESS_DURATION)
}

// 触摸移动处理
const handleTouchMove = (event: TouchEvent) => {
  if (!isMobile || !longPressTimer.value) return

  const touch = event.touches[0]
  const deltaX = Math.abs(touch.clientX - touchStartPosition.value.x)
  const deltaY = Math.abs(touch.clientY - touchStartPosition.value.y)

  // 如果移动距离超过阈值，取消长按
  if (deltaX > MOVE_THRESHOLD || deltaY > MOVE_THRESHOLD) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// 触摸结束处理
const handleTouchEnd = () => {
  if (!isMobile) return

  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

interface Props {
  message: UnifiedChatMessage
  isSubChannelMsg?:boolean
  isShare?: boolean
}
const props = withDefaults(defineProps<Props>(), {
    isSubChannelMsg:false
})




const emit = defineEmits<{
  (e: 'quote', message: any): void
  (e: 'toBuzz', data: any): void
  (e: 'to-time-stamp', timestamp: number): void
}>()

// 为每个消息生成唯一ID
const messageId = computed(() => {
  return `${props.message.timestamp}-${props.message.metaId}-${props.message.txId || 'mock'}`
})
type TranslateStatus = 'hidden' | 'showing' | 'processing'
const translateStatus: Ref<TranslateStatus> = ref('hidden')
const translatedContent = ref('')
/** 翻译 end */



function toPrivateChat(message:ChatMessageItem){
  // if(message.userInfo.metaid == userStore.last.metaid){
  //    return
  // }
  if(!userStore.last?.chatpubkey){
     return ElMessage.error(`${i18n.t('self_private_chat_unsupport')}`)
  }

//   getUserInfoByAddress(message.userInfo.address).then((res)=>{
//     if(res.chatpubkey){
//        router.push({
//   name:'talkAtMe',
//   params:{
//     channelId:message.userInfo.metaid,
//     // metaid:message.userInfo.metaid
//   }
//  })
//     }else{
//       return ElMessage.error(`${i18n.t('user_private_chat_unsupport')}`)
//     }
//   })

router.push({
  name:'talkAtMe',
  params:{
    channelId:message.userInfo.metaid,
    // metaid:message.userInfo.metaid
  }
 })
 simpleTalk.setActiveChannel(message.userInfo.metaid)



}
// 在组件挂载和卸载时处理事件监听器和定时器清理
onMounted(() => {
  // 移除全局点击监听器，改为在更高级别处理
})

onUnmounted(() => {

  if (longPressTimer.value) {

    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
  // 移除全局点击监听器
})

const previewImage = (image: string) => {
  imagePreview.images = [image]
  imagePreview.index = 0
  imagePreview.visibale = true
}

const msgChain = computed(() => {
  return props.message.chain
})

const resendTitle = computed(() => {
  return i18n.t('Talk.Messages.resend')
})

const redPackClaimOver = computed(() => {
  return props.message?.claimOver
})

const openWindowTarget = () => {
  if (window.innerWidth > 768) {
    return "_blank";
  }
  return "_self";
};

const parseTextMessage = (text: string) => {
  if (typeof text === 'undefined') {
    return ''
  }

  const HTML = /<\/?.+?>/gi
  const COOKIE = /document\.cookie/gi
  const HTTP = /(http|https):\/\//gi
  const re = /(f|ht){1}(tp|tps):\/\/([\w-]+\S)+[\w-]+([\w-?%#&=]*)?(\/[\w- ./?%#&=]*)?/g

  if (HTML.test(text)) {
    return '无效输入,别耍花样!'
  }
  if (COOKIE.test(text)) {
    return '无效输入,你想干嘛!'
  }
  text = text.replace(re, function(url) {
    if (HTTP.test(text)) {
      return `<a href=${url} target="${openWindowTarget()}" style="text-decoration: underline;cursor: pointer;" class="url"> ${url} </a>`
    }
    return `<a onClick="window.open('http://${text}','${openWindowTarget()}')" style="text-decoration: underline;cursor: pointer;" target="_blank">${text}</a>`
  })
  text = text.replace(/\\n/g, '\n')
  return text.replace(/\n/g, '<br />')
}

const redPacketReceiveInfo = computed(() => {
  const content: string = props.message.content

  if (props.message.metaId === props.message.redMetaId) {
    return i18n.t('Talk.Channel.receive_own_red_envelope')
  }

  // const [_receiver, sender] = content.split('|-|')
  const sender = props.message?.replyInfo?.userInfo

  return i18n.t('Talk.Channel.receive_red_envelope', {
    sender: sender?.name || sender?.metaid?.slice(0, 6) || '',
  })
})

const redPacketMessage = computed(() => {
  return (
    props.message.data?.content ||
    props.message.content.split(':')[1] ||
    i18n.t('Talk.Channel.default_red_envelope_message')
  )
})

const isMyMessage = computed(() => {
  return userStore.last?.metaid && userStore.last.metaid === props.message.metaId
})

const handleOpenRedPacket = async() => {
  // 如果用户已经领取过红包，则显示红包领取信息
  const params: any = {
    groupId: simpleTalk.activeChannel?.parentGroupId || simpleTalk.activeChannel?.id,
    pinId: `${props.message?.txId}i0`,
  }

  const redPacketType = props.message?.data?.requireType
  console.log({ redPacketType })
  if (redPacketType === '2') {
    params.address = simpleTalk.selfAddress
  } else if (redPacketType === '2001' || redPacketType === '2002') {
    // params.address = userStore.user?.evmAddress
  }
  console.log("props.message",props.message)

  const redPacketInfo = await getOneRedPacket(params)
  const hasReceived = redPacketInfo.payList.some(
    (item: any) => item.userInfo?.metaid === simpleTalk.selfMetaId
  )

  if (hasReceived) {
    modals.redPacketResult = redPacketInfo
    layout.isShowRedPacketResultModal = true

    // 保存已领取红包的id
    simpleTalk.addReceivedRedPacketId(props.message?.txId)

    return
  }
  // 如果用户未领取过红包，则显示红包领取弹窗
  modals.openRedPacket = {
    message: props.message || '',
    redPacketInfo,
  }
  layout.isShowRedPacketOpenModal = true
}

const hasRedPacketReceived = computed(() => {
  return simpleTalk.hasReceivedRedPacket(props.message?.txId)
})

const redPacketCliamOver = computed(() => {})

const tryResend = async() => {
  // props.message.error = false
  // const messageDto = talk.getRetryById(props.message.mockId)

  // try {
  //   if (messageDto) {
  //     await sendMessage(messageDto)

  //     talk.removeMessage(props.message.mockId)
  //   } else {
  //     return ElMessage.error(`${i18n.t('retry_msg_error')}`)
  //   }
  // } catch (error) {
  //   return ElMessage.error((error as any).toString())
  // }

  //
  // TODO


}

const isGroupJoinAction = computed(() =>
  containsString(props.message.protocol, NodeName.SimpleGroupJoin)
)
const isGroupLeaveAction = computed(() =>
  containsString(props.message.protocol, 'SimpleGroupLeave')
)
const isGroupRemoveUserAction = computed(() =>
  containsString(props.message.protocol, NodeName.SimpleGroupRemoveUser)
)

// 解析移除用户信息
const removeUserInfo = computed(() => {
  if (!isGroupRemoveUserAction.value) return null

  const content = props.message.content
  // 从内容中提取用户ID: "User {metaId} was removed from the group"
  const userIdMatch = content.match(/User \{([^}]+)\} was removed/)
  const userMetaId = userIdMatch ? userIdMatch[1] : null

  // 检查是否有原因信息（可能在params字段或内容的其他部分）
  let reason = ''
  try {
    // 尝试解析 params 或其他字段中的原因信息
    if (props.message.params) {
      const parsedParams = JSON.parse(props.message.params)
      if (parsedParams.reason) {
        reason = parsedParams.reason
      }
    }
  } catch (e) {
    // 如果解析失败，尝试从content中提取原因
    const reasonMatch = content.match(/\(reason:\s*([^)]+)\)/i)
    if (reasonMatch) {
      reason = reasonMatch[1].trim()
    }
  }

  // 尝试获取用户名称，默认使用截取的metaId
  let username = userMetaId?.slice(0, 8) || 'Unknown User'

  // 这里可以后续扩展：通过API查询用户信息获取真实用户名
  // 目前先使用截取的metaId作为显示名称

  return {
    userMetaId,
    username,
    reason: reason.trim()
  }
})
const isNftEmoji = computed(() => containsString(props.message.protocol, 'SimpleEmojiGroupChat'))
const isImage = computed(() => containsString(props.message.protocol, NodeName.SimpleFileGroupChat))
const isGiveawayRedPacket = computed(() =>
  containsString(props.message.protocol, NodeName.SimpleGroupLuckyBag)
)
const isChatGroupLink = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    props.message.isMock
  )

  // 检测群聊链接的正则表达式
  const groupLinkPattern = /\/channels\/public\/([a-f0-9]+)/i
  const isGroupLink = groupLinkPattern.test(messageContent)

  // 如果是群链接且还没有获取过群信息，则获取群信息
  if (isGroupLink && !channelInfo.value) {
    const match = messageContent.match(groupLinkPattern)
    if (match) {
      const pinId = match[1]
      fetchChannelInfo(pinId+'i0')
    }
  }

  return isGroupLink
})

// 解析群链接信息
const groupLinkInfo = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    props.message.isMock
  )

  const groupLinkPattern = /\/channels\/public\/([a-f0-9]+)/i
  const match = messageContent.match(groupLinkPattern)

  if (match) {
    const pinId = match[1]
    return {
      pinId,
      groupName: channelInfo.value?.roomName ,
      groupAvatar: channelInfo.value?.roomIcon || '',
      memberCount: channelInfo.value?.userCount || 0,
      fullUrl: messageContent,
      creator:channelInfo.value?.createUserInfo?.name || '',
    }
  }

  return {
    pinId: '',
    groupName: 'Group Chat',
    groupAvatar: '',
    memberCount: 0,
    creator: '',
    fullUrl: messageContent
  }
})

// 获取群信息
const fetchChannelInfo = async (pinId: string) => {
  try {
    const channel = await getOneChannel(pinId)
    channelInfo.value = channel
    console.log('Fetched channel info:', channel)
  } catch (error) {
    console.error('Failed to fetch channel info:', error)
  }
}

// 处理群链接点击
const handleGroupLinkClick = () => {
  const linkInfo = groupLinkInfo.value
  if (linkInfo.fullUrl) {
    // 在新窗口打开群链接
    window.open(linkInfo.fullUrl, '_self')
  }
}
const isReceiveRedPacket = computed(() =>
  containsString(props.message.protocol, NodeName.SimpleGroupOpenLuckybag)
)
</script>

<style lang="scss" scoped>
.isMyMessage {
  display: flex;
  justify-content: flex-end;
  width: 100%;
}
.not-mine {
  &.btc-item {
    background: linear-gradient(113deg, #fff6e6 -12%, #e5bc77 103%);
    color: #5a4015;
  }
}
</style>
