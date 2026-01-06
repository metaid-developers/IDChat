<template>
  <div>
    <UnreadMessagesDivider
      v-if="props.lastReadIndex !== undefined && message.index === props.lastReadIndex + 1"
      id="unread-divider"
    />
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
            decryptedMessage(
              message?.content,
              message?.encryption,
              message?.protocol,
              message?.isMock
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
        @toTimeStamp="handlerScrollIndex"
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
            class="flex space-x-2 "
            :class="[isMyMessage ? 'flex-row-reverse  items-center' : 'items-baseline ']"
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
              :class="[isMyMessage ? 'ml-2 flex items-center' : '']"
            />
            <div
              class="text-xs shrink-0 whitespace-nowrap flex   "
              :class="[
                isMyMessage ? 'flex-row-reverse' : 'gap-1 ',
                msgChain == ChatChain.btc
                  ? 'text-[#EBA51A]'
                  : msgChain == ChatChain.doge
                  ? 'text-[#C3A634]'
                  : 'text-dark-300 dark:text-gray-400',
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
                <Icon
                  name="doge"
                  v-if="msgChain == ChatChain.doge"
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
              @click="
                previewPublicImage(
                  decryptedMessage(
                    message?.content,
                    message?.encryption,
                    message?.protocol,
                    message?.isMock
                  )
                )
              "
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
                :useThumbnail="true"
                :isPublicGroupChat="true"
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
            class="w-full py-0.5 flex items-center"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isPrivateImage"
          >
            <div
              class="w-fit max-w-[90%] md:max-w-[50%] lg:max-w-[235PX] max-h-[600PX] overflow-y-hidden rounded bg-transparent cursor-pointer transition-all duration-200"
              :class="[message.error && 'opacity-50']"
              @click="previewImage2(decryptedImageMessage)"
            >
              <Image
                :src="decryptedImageMessage"
                :isPrivateChat="true"
                :chatPasswordForDecrypt="chatPasswordKeyForDecrypt"
                customClass="rounded py-0.5 object-scale-down"
              />
            </div>
            <button v-if="message.error" class="ml-3" :title="resendTitle" @click="tryResend">
              <Icon
                name="arrow_path"
                class="w-4 h-4 text-dark-400 dark:text-gray-200 hover:animate-spin-once"
              />
            </button>
            <Teleport to="body" v-if="isPrivateImage && showImagePreview">
              <TalkImagePreview
                v-if="showImagePreview"
                :src="message.content"
                :isPrivateChat="true"
                :chatPasswordForDecrypt="chatPasswordKeyForDecrypt"
                @close="showImagePreview = false"
              />
            </Teleport>
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
              class="lg:max-w-full max-w-[300PX] shadow rounded-xl cursor-pointer origin-center hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-700 group"
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
              class="lg:max-w-full max-w-[300px] shadow rounded-xl transition-all duration-200 bg-white dark:bg-gray-700 group"
              :class="[
                isMyMessage ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:shadow-md',
              ]"
              @click="handleGroupLinkClick"
            >
              <div class="p-4 space-y-3">
                <!-- 群头像和基本信息 -->
                <div class="flex items-center space-x-3">
                  <div class="relative">
                    <ChatIcon
                      :src="groupLinkInfo.groupAvatar"
                      :alt="groupLinkInfo.groupName"
                      custom-class="w-12 h-12 min-w-12 min-h-12 rounded-full"
                      :size="48"
                    />
                    <!-- 私密群标识 -->
                    <div
                      v-if="groupLinkInfo.isPrivate"
                      class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 dark:bg-yellow-600 rounded-full flex items-center justify-center"
                      :title="$t('Talk.Channel.private_group')"
                    >
                      <Icon name="lock_closed" class="w-3 h-3 text-white" />
                    </div>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <div
                        class="text-dark-800 dark:text-gray-100 font-medium text-base truncate max-w-[180px]"
                      >
                        {{ groupLinkInfo.groupName || 'Group Chat' }}
                      </div>
                      <!-- 私密群徽章 -->
                      <div
                        v-if="groupLinkInfo.isPrivate"
                        class="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-xs rounded-full font-medium"
                      >
                        {{ $t('Talk.Channel.private') }}
                      </div>
                    </div>
                    <div class="text-dark-400 dark:text-gray-400 text-sm mt-1">
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
                    v-if="!isMyMessage"
                    class="main-border bg-primary hover:bg-primary-dark text-black text-center py-2 px-4 rounded-lg transition-colors duration-200 font-medium"
                  >
                    VIEW GROUP
                  </div>
                  <div
                    v-else
                    class="bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 text-center py-2 px-4 rounded-lg font-medium cursor-not-allowed"
                  >
                    {{ $t('Talk.Channel.invite_sent') }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 卡片消息（SimpleCardMsg） -->
          <div
            class="my-1.5 max-w-full flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isCardMsg"
          >
            <CardMsgCard
              :content="decryptedContentForProtocolCard"
              :message="message"
              :is-my-message="isMyMessage"
              @signed="handleCardMsgSigned"
              @error="handleCardMsgError"
            />
          </div>

          <!-- 协议卡片（MetaApp、Buzz、SimpleNote、MetaFile 等） -->
          <div
            class="my-1.5 max-w-full flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="shouldUseProtocolCard"
          >
            <ProtocolCard
              ref="protocolCardRef"
              :content="decryptedContentForProtocolCard"
              :is-my-message="isMyMessage"
            />
          </div>

          <div
            class="my-1.5 max-w-[85%] lg:max-w-[70%] flex"
            :class="[isMyMessage ? 'flex-row-reverse ml-auto' : '']"
            v-else
          >
            <div
              class="text-sm  text-dark-800 dark:text-gray-100 font-normal  p-3 rounded-xl  transition-all duration-200"
              :class="[
                msgChain == ChatChain.btc && 'btc-item',
                msgChain == ChatChain.doge && 'doge-item',
                isMyMessage
                  ? 'bg-primary dark:text-gray-800 rounded-tr'
                  : 'not-mine bg-white dark:bg-gray-700 rounded-tl',
                message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
              ]"
              v-if="translateStatus === 'showing'"
              @click="handleMessageClick"
            >
              <div class="" v-html="translatedContent"></div>
              <div class="text-xxs text-dark-300 dark:text-gray-400 mt-1 underline">
                {{ $t('Talk.Messages.translated') }}
              </div>
            </div>

            <div
              class="flex items-center gap-2 text-sm   text-dark-800 dark:text-gray-100 font-normal  p-3 rounded-xl  transition-all duration-200"
              :class="[
                msgChain == ChatChain.btc && 'btc-item',
                msgChain == ChatChain.doge && 'doge-item',
                isMyMessage
                  ? 'bg-primary dark:text-gray-800 rounded-tr'
                  : 'not-mine bg-white dark:bg-gray-700 rounded-tl',
                message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
              ]"
              v-else
              @click="handleMessageClick"
            >
              <!-- Markdown 消息渲染 -->
              <div
                v-if="isMarkdown"
                class="markdown-content prose prose-sm max-w-none dark:prose-invert"
                v-html="
                  parseMarkdownMessage(
                    decryptedMessage(
                      message?.content,
                      message?.encryption,
                      message?.protocol,
                      message?.isMock
                    )
                  )
                "
              ></div>
              <!-- 普通文本消息渲染 -->
              <div
                v-else
                class="whitespace-pre-wrap break-all"
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
  useAttrs,
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
import { getOneChannel,getGroupChannelList } from '@/api/talk'
import { getUserInfoByAddress, getUserInfoByGlobalMetaId } from '@/api/man'
import { useImagePreview } from '@/stores/imagePreview'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'
import MessageItemQuote from './MessageItemQuote.vue'
import { NodeName ,ChatChain} from '@/enum'
import { marked } from 'marked'
import { containsString } from '@/utils/util'
import { ElMessage } from 'element-plus'
import type { ChatMessageItem } from '@/@types/common'
import { isMobile, useRootStore } from '@/stores/root'
import { useRouter } from 'vue-router'
import ChatImage from '@/components/ChatImage/ChatImage.vue'
import btcIcon from '@/assets/images/btc.png'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { UnifiedChatMessage } from '@/@types/simple-chat'
import {openAppBrowser} from '@/wallet-adapters/metalet'
import UnreadMessagesDivider from './UnreadMessagesDivider.vue'
import { VideoPlay } from '@element-plus/icons-vue'
import { isPrivate } from 'tiny-secp256k1'
import { DB } from '@/utils/db'
import TalkImagePreview from './ImagePreview.vue'
import ProtocolCard from '@/components/ProtocolCard/index.vue'
import CardMsgCard from '@/components/CardMsgCard/index.vue'

const i18n = useI18n()

const modals = useModalsStore()
const userStore = useUserStore()
const rootstore=useRootStore()
const simpleTalk= useSimpleTalkStore()
const layout = useLayoutStore()
const jobs = useJobsStore()
const reply: any = inject('Reply')
const router=useRouter()
const imagePreview = useImagePreview()
const visiableMenu = ref(false)

// 获取用于图片解密的 passwordKey（处理子群聊的情况）
const chatPasswordKeyForDecrypt = computed(() => {
  const activeChannel = simpleTalk.activeChannel
  if (!activeChannel) return ''

  // 如果是子群聊，获取父群聊的 passwordKey
  if (activeChannel.type === 'sub-group' && activeChannel.parentGroupId) {
    const parentChannel = simpleTalk.getParentGroupChannel(activeChannel.parentGroupId)
    if (parentChannel?.roomJoinType === '100' && parentChannel.passwordKey) {
      return parentChannel.passwordKey
    }
  }

  // 主群聊或非私密群聊，使用自己的 passwordKey
  return activeChannel.passwordKey || ''
})

// 群信息缓存
const channelInfo = ref<any>(null)
const subChannelInfo = ref<any>(null)
const showImagePreview = ref(false)

// 通用 PIN 信息缓存（包含所有类型：MetaApp, Buzz, SimpleNote 等）
interface UniversalPinInfo {
  id: string
  metaid: string
  address: string
  creator: string
  timestamp: number
  path: string
  contentSummary: string
  parsedSummary?: any
}

const universalPinInfo = ref<UniversalPinInfo | null>(null)

// MetaApp 信息缓存（保留用于类型检查）
interface MetaAppContentSummary {
  title: string
  appName: string
  runtime: string
  icon: string
  prompt: string
  coverImg: string
  introImgs: string[]
  intro: string
  disabled: boolean
  indexFile: string
  code: string
  contentHash: string
  metadata: string
  tags: string[]
  version: string
  contentType: string
  content: string
}

interface MetaAppPinInfo {
  id: string
  metaid: string
  address: string
  creator: string
  timestamp: number
  path: string
  contentSummary: string
  parsedSummary?: MetaAppContentSummary
}

const metaAppInfo = ref<MetaAppPinInfo | null>(null)

// Pin 信息缓存 (Buzz/SimpleNote)
interface PinContentSummary {
  content?: string
  contentType?: string
  attachments?: string[]
  title?: string
  subtitle?: string
  coverImg?: string
  encryption?: string
  createTime?: number
  tags?: string[]
}

interface PinInfo {
  id: string
  metaid: string
  address: string
  creator: string
  timestamp: number
  path: string
  contentSummary: string
  parsedSummary?: PinContentSummary
}

interface UserInfoCache {
  [address: string]: {
    name?: string
    avatar?: string
    metaid?: string
  }
}

const pinInfo = ref<PinInfo | null>(null)
const pinUserInfo = ref<UserInfoCache>({})

// Mention 用户信息缓存
interface MentionedUser {
  globalMetaId: string
  name: string
  avatar?: string
}

const mentionedUsers = ref<Map<string, MentionedUser>>(new Map())

const isText = computed(() => containsString(props.message.protocol, NodeName.SimpleGroupChat))
const isMarkdown = computed(() => props.message.contentType === 'text/markdown')
// console.log("props.message",props.message)
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
  lastReadIndex?:number
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


function handlerScrollIndex(index:number){

  emit("to-time-stamp",index)
}


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

// 使用 globalMetaId 进行私聊跳转
const targetGlobalMetaId = message.globalMetaId || message.userInfo?.globalMetaId
router.push({
  name:'talkAtMe',
  params:{
    channelId: targetGlobalMetaId,
  }
 })
 simpleTalk.setActiveChannel(targetGlobalMetaId)



}
// 在组件挂载和卸载时处理事件监听器和定时器清理
onMounted(() => {
  // 初始化被提及用户信息
  initMentionedUsers()
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

// 预览公开群聊图片（使用大图）
const previewPublicImage = (image: string) => {
  // 构建公开群聊大图 URL
  const cleanSrc = image.replace('metafile://', '')
  const fullImageUrl = `https://file.metaid.io/metafile-indexer/api/v1/files/accelerate/content/${cleanSrc}?process=`
  imagePreview.images = [fullImageUrl]
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

const decryptedImageMessage = computed(() => {
  console.log("props.message.content",props.message)

  if (props.message.isMock) {
    return props.message.content
  }

  // 私密图片（encryption === '1'）：返回加密的 metafile 链接，由 Image 组件使用 passwordKey 解密
  // 公开图片（encryption !== '1'）：直接返回图片链接
  if (props.message.encryption === '1') {
    console.log("props.message.content encryption === '1'", props.message.content)
    return props.message.data?.attachment || props.message?.content
  }

  if (props.message.encryption !== '1') {
    console.log("props.message.content props.message.encryption !== '1'",props.message.content)
    return props.message.data?.attachment || props.message?.content
  }

  return props.message.content
})

const decryptedImgMessage=async (content:string,chatPubkeyForDecrypt:string): Promise<string | undefined> => {
  try {
    const res=await  DB.getMetaFileData(content, 235,true,'',chatPubkeyForDecrypt)
    return URL.createObjectURL(res.data)
  } catch (error) {
    console.error('Failed to decrypt image:', error)
    return undefined
  }
}

const previewImage2 = async (image: string) => {
  const _image = await decryptedImgMessage(image, chatPasswordKeyForDecrypt.value)
  if (_image) {
    imagePreview.images = [_image]
    imagePreview.index = 0
    imagePreview.visibale = true
  } else {
    console.error('Failed to decrypt image for preview')
  }
}

const openWindowTarget = () => {
  if(rootstore.isWebView){
    return "_self";
  }else if (window.innerWidth > 768) {
    return "_blank";
  }
  return "_self";
};

// const parseTextMessage = (text: string) => {
//   if (typeof text === 'undefined') {
//     return ''
//   }

//   const HTML = /<\/?.+?>/gi
//   const COOKIE = /document\.cookie/gi
//   const HTTP = /(http|https):\/\//gi
//   const re = /(f|ht){1}(tp|tps):\/\/([\w-]+\S)+[\w-]+([\w-?%#&=]*)?(\/[\w- ./?%#&=]*)?/g

//   if (HTML.test(text)) {
//     return '无效输入,别耍花样!'
//   }
//   if (COOKIE.test(text)) {
//     return '无效输入,你想干嘛!'
//   }
//   // text = text.replace(re, function(url) {
//   //   if (HTTP.test(text)) {
//   //     return `<a href=${url} target="${openWindowTarget()}" style="text-decoration: underline;cursor: pointer;word-break: break-all;" class="url"> ${url} </a>`
//   //   }
//   //   return `<a onClick="window.open('http://${text}','${openWindowTarget()}')" style="text-decoration: underline;cursor: pointer;word-break: break-all;" target="${openWindowTarget()}">${text}</a>`
//   // })
//     text = text.replace(re, function(url) {
//     if (HTTP.test(text)) {
//       if(rootstore.isWebView){
//         openAppBrowser({url})
//         return
//       }

//       return `<a href=${url} target="${openWindowTarget()}" style="text-decoration: underline;cursor: pointer;word-break: break-all;" class="url"> ${url} </a>`
//     }


//     return `<a onClick="window.open('http://${text}','${openWindowTarget()}')" style="text-decoration: underline;cursor: pointer;word-break: break-all;" target="${openWindowTarget()}">${text}</a>`
//   })
//   text = text.replace(/\\n/g, '\n')
//   return text.replace(/\n/g, '<br />')
// }
const parseTextMessage = (text: string) => {
  if (typeof text === 'undefined') {
    return ''
  }

  // HTML 转义函数，防止 XSS 攻击
  const escapeHtml = (str: string) => {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  const COOKIE = /document\.cookie/gi
  const HTTP = /(http|https):\/\//gi
  const re = /(f|ht){1}(tp|tps):\/\/([\w-]+\S)+[\w-]+([\w-?%#&=]*)?(\/[\w- ./?%#&=]*)?/g

  // 检测特殊协议链接（这些链接会渲染成卡片，不需要转换成 HTML 链接）
  const specialProtocolPatterns = [
    /\/channels\/public\/[a-f0-9]+/i,           // 群聊链接
  ]

  // 通用 PIN 检测：检测 URL 中是否包含 PIN (64位16进制+"i"+数字)
  const urlPattern = /(https?:\/\/[^\s]+)/i
  const pinPattern = /([a-f0-9]{64}i\d+)/i

  const isUrl = urlPattern.test(text)
  const hasPinId = pinPattern.test(text)

  // 如果是 URL 且包含 PIN，说明是协议卡片链接，直接返回原文（转义后）
  if (isUrl && hasPinId) {
    return escapeHtml(text).replace(/\\n/g, '\n').replace(/\n/g, '<br />')
  }

  // 如果消息匹配其他特殊协议，直接返回原文（转义后）
  for (const pattern of specialProtocolPatterns) {
    if (pattern.test(text)) {
      return escapeHtml(text).replace(/\\n/g, '\n').replace(/\n/g, '<br />')
    }
  }

  // 检测恶意脚本
  if (COOKIE.test(text)) {
    return escapeHtml(text).replace(/\\n/g, '\n').replace(/\n/g, '<br />')
  }

  // 先转义 HTML，防止 XSS 攻击
  text = escapeHtml(text)

  text = text.replace(re, function(url) {
    if (HTTP.test(text)) {
      if(rootstore.isWebView){
        return `<a href="javascript:void(0);" data-webview-url="${url}" class="url webview-link" style="text-decoration: underline;cursor: pointer;word-break: break-all;"> ${url} </a>`
      }

      return `<a href=${url} target="${openWindowTarget()}" style="text-decoration: underline;cursor: pointer;word-break: break-all;" class="url"> ${url} </a>`
    }

    if(rootstore.isWebView){
        return `<a href="javascript:void(0);" data-webview-url="http://${text}" class="webview-link" style="text-decoration: underline;cursor: pointer;word-break: break-all;">${text}</a>`
    }


    return `<a onClick="window.open('http://${text}','${openWindowTarget()}')" style="text-decoration: underline;cursor: pointer;word-break: break-all;" target="${openWindowTarget()}">${text}</a>`
  })

  // 处理 @ 提及：使用 message.mention 字段精确匹配
  if (props.message.mention && props.message.mention.length > 0) {
    // 为每个被提及的用户进行替换
    mentionedUsers.value.forEach((user, metaId) => {
      const username = user.name
      // 使用边界匹配确保完整匹配用户名，支持用户名中的空格
      // 匹配 @username 的格式，username 可以包含空格，但必须是完整的用户名
      const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const mentionRegex = new RegExp(`@${escapedUsername}(?=\\s|$|<|\\.|,|!|\\?|;)`, 'g')

      text = text.replace(mentionRegex, function(match) {
        return `<span class="mention" data-metaid="${metaId}" style="color: #fc457b; font-weight: 600; cursor: pointer;">${match}</span>`
      })
    })
  }

  text = text.replace(/\\n/g, '\n')
  return text.replace(/\n/g, '<br />')
}

// 解析 markdown 消息
const parseMarkdownMessage = (text: string) => {
  if (typeof text === 'undefined' || text === '') {
    return ''
  }

  try {
    // 配置 marked 选项
    marked.setOptions({
      breaks: true, // 支持换行
      gfm: true, // 启用 GitHub 风格的 Markdown
    })

    return marked.parse(text)
  } catch (error) {
    console.error('Markdown parse error:', error)
    // 如果解析失败，回退到普通文本处理
    return parseTextMessage(text)
  }
}

// 处理 webview 链接和 mention 点击的事件委托
const handleMessageClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // 处理 webview 链接点击
  if (target.tagName === 'A' && target.classList.contains('webview-link')) {
    event.preventDefault()
    const url = target.getAttribute('data-webview-url')
    if (url) {
      openAppBrowser({ url })
    }
    return
  }

  // 处理 mention 点击
  if (target.classList.contains('mention')) {
    event.preventDefault()
    const metaId = target.getAttribute('data-metaid')
    if (metaId) {
      handleMentionClick(metaId)
    }
  }
}

// 处理 mention 点击跳转到私聊
const handleMentionClick = async (metaId: string) => {
  // 如果是自己，不跳转（使用 globalMetaId 判断）
  const selfGlobalMetaId = userStore.last?.globalMetaId
  if (metaId === selfGlobalMetaId) {
    return
  }

  // 检查自己是否支持私聊
  if (!userStore.last?.chatpubkey) {
    return ElMessage.error(`${i18n.t('self_private_chat_unsupport')}`)
  }

  // 跳转到私聊页面
  router.push({
    name: 'talkAtMe',
    params: {
      channelId: metaId,
    }
  })
  simpleTalk.setActiveChannel(metaId)
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
  // 使用 globalMetaId 判断是否是自己的消息（支持多链 MVC/BTC/DOGE）
  const selfGlobalMetaId = userStore.last?.globalMetaId
  // 群聊消息使用 message.globalMetaId，私聊消息使用 message.fromGlobalMetaId
  const messageGlobalMetaId = props.message.globalMetaId || props.message.fromGlobalMetaId

  // 添加调试日志
  if (selfGlobalMetaId !== messageGlobalMetaId) {
    console.log('🔍 isMyMessage check:', { selfGlobalMetaId, messageGlobalMetaId, metaId: props.message.metaId })
  }

  return selfGlobalMetaId === messageGlobalMetaId
})

// 卡片消息签名成功处理
const handleCardMsgSigned = (result: { txid: string; button: any }) => {
  console.log('Card message signed successfully:', result)
  // 可以在这里添加额外的处理逻辑，比如刷新消息等
}

// 卡片消息错误处理
const handleCardMsgError = (error: Error) => {
  console.error('Card message error:', error)
}

const handleOpenRedPacket = async() => {
  if(simpleTalk.activeChannel?.isTemporary){
     ElMessage.error('Please join the channel to claim the red packet')
     return
  }
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
  await simpleTalk.tryResend(props.message)
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
const isImage = computed(() =>simpleTalk.activeChannel?.roomJoinType!=='100' && containsString(props.message.protocol, NodeName.SimpleFileGroupChat))
const isPrivateImage = computed(() =>simpleTalk.activeChannel?.roomJoinType==='100' && containsString(props.message.protocol, NodeName.SimpleFileGroupChat))
const isGiveawayRedPacket = computed(() =>
  containsString(props.message.protocol, NodeName.SimpleGroupLuckyBag)
)
// 卡片消息判断
const isCardMsg = computed(() =>
  containsString(props.message.protocol, NodeName.SimpleCardMsg)
)
const isChatGroupLink = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    props.message.isMock
  )

  // 检测群聊链接的正则表达式（支持公开和私密群聊）
  const groupLinkPattern = /\/channels\/(public|private)\/([a-f0-9]+)/i
  const subChannelLinkPattern=/\/channels\/(public|private)\/([a-f0-9]+i0)(?:\/([a-f0-9]+))?/i
  const isGroupLink = groupLinkPattern.test(messageContent)
  const isSubChannelLink = subChannelLinkPattern.test(messageContent)

  // 如果是群链接且还没有获取过群信息，则获取群信息
  if (isGroupLink  && !channelInfo.value) {
        const match = messageContent.match(groupLinkPattern)
        if (match) {

        const pinId = match[2]
        fetchChannelInfo(pinId+'i0')
        }

      if(isSubChannelLink && !subChannelInfo.value){

         const subMatch = messageContent.match(subChannelLinkPattern)
     if (subMatch) {

      const pinId = subMatch[2]
      fetchSubChannelInfo(pinId)
    }
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

  const groupLinkPattern = /\/channels\/(public|private)\/([a-f0-9]+)/i
  const subChannelLinkPattern=/\/channels\/(public|private)\/([a-f0-9]+i0)(?:\/([a-f0-9]+))?/i

  const match = messageContent.match(groupLinkPattern)
  const subChannleMatch= messageContent.match(subChannelLinkPattern)

  if (match && (!subChannleMatch || !subChannleMatch[3])) {

    const pinId = match[2] + 'i0'
    const isPrivate = match[1] === 'private'

    return {
      pinId,
      groupName: channelInfo.value?.roomName ,
      groupAvatar: channelInfo.value?.roomIcon || '',
      memberCount: channelInfo.value?.userCount || 0,
      fullUrl: messageContent,
      creator:channelInfo.value?.createUserInfo?.name || '',
      isPrivate,
    }
  }else if(subChannleMatch && subChannleMatch[3]){
    console.log("subChannleMatch",messageContent)

    const pinId =subChannleMatch[3] + 'i0'
    const isPrivate = subChannleMatch[1] === 'private'

      return {
      pinId,
      groupName: subChannelInfo.value?.channelName ,
      groupAvatar: subChannelInfo.value?.channelIcon || '',
      memberCount: channelInfo.value?.userCount || 0,
      fullUrl: messageContent,
      creator:channelInfo.value?.createUserInfo?.name || '',
      isPrivate,
    }
  }

  return {
    pinId: '',
    groupName: 'Group Chat',
    groupAvatar: '',
    memberCount: 0,
    creator: '',
    fullUrl: messageContent,
    isPrivate: false,
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

const fetchSubChannelInfo=async(pinId:string)=>{
  try {

    const subChannel = await getGroupChannelList({groupId:pinId})

    if(subChannel.data.list.length){

      subChannelInfo.value = subChannel.data.list[0]
    }

  } catch (error) {

  }
}

// 从 URL 中提取 PIN ID（64位16进制 + "i" + 数字）
const extractPinId = (url: string): string | null => {
  // PIN 格式：64位16进制字符 + "i" + 数字
  const pinPattern = /([a-f0-9]{64}i\d+)/i
  const match = url.match(pinPattern)
  return match ? match[1] : null
}

// ProtocolCard 用的解密消息内容
const decryptedContentForProtocolCard = computed(() => {
  return decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false
  ) || ''
})

// ProtocolCard 组件的引用
const protocolCardRef = ref<InstanceType<typeof ProtocolCard> | null>(null)

// 是否应该使用 ProtocolCard 渲染（由 ProtocolCard 组件内部判断）
const shouldUseProtocolCard = computed(() => {
  // 如果是群聊邀请链接，不使用 ProtocolCard
  if (isChatGroupLink.value) return false

  // 检查消息内容是否包含协议链接
  const content = decryptedContentForProtocolCard.value
  if (!content) return false

  // 检测 metafile:// 和 metaapp:// 协议
  const hasMetafile = /metafile:\/\/([a-f0-9]{64}i\d+)/i.test(content)
  const hasMetaapp = /metaapp:\/\/([a-f0-9]{64}i\d+)/i.test(content)

  // 如果是 metafile 或 metaapp 协议，直接返回 true
  if (hasMetafile || hasMetaapp) return true

  // 对于 https:// URL，只有包含 PIN ID 才渲染卡片
  const urlMatch = content.match(/(https?:\/\/[^\s]+)/i)
  if (urlMatch) {
    const pinPattern = /([a-f0-9]{64}i\d+)/i
    return pinPattern.test(urlMatch[1])
  }

  return false
})

// 检测消息是否包含 PIN 链接
const hasPinLink = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false
  )

  if (!messageContent) return false

  // 检测是否是 URL 且包含 PIN
  const urlPattern = /(https?:\/\/[^\s]+)/i
  const hasUrl = urlPattern.test(messageContent)

  if (!hasUrl) return false

  const pinId = extractPinId(messageContent)

  if (pinId && !universalPinInfo.value) {
    fetchUniversalPinInfo(pinId, messageContent)
  }

  return !!pinId
})

// 获取通用 PIN 信息
const fetchUniversalPinInfo = async (pinId: string, fullUrl: string) => {
  try {
    const response = await fetch(`https://manapi.metaid.io/pin/${pinId}`)
    const result = await response.json()

    if (result.code === 1 && result.data) {
      universalPinInfo.value = result.data

      // 解析 contentSummary
      if (result.data.contentSummary && universalPinInfo.value) {
        try {
          universalPinInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
        } catch (e) {
          console.error('Failed to parse contentSummary:', e)
        }
      }

      // 获取创建者用户信息
      if (result.data.creator && !pinUserInfo.value[result.data.creator]) {
        fetchPinUserInfo(result.data.creator)
      }

      // 根据 path 更新对应的缓存
      const path = result.data.path
      if (path === '/protocols/metaapp') {
        metaAppInfo.value = result.data
        if (result.data.contentSummary && metaAppInfo.value) {
          try {
            metaAppInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
          } catch (e) {}
        }
      } else if (path === '/protocols/simplebuzz' || path === '/protocols/simplenote') {
        pinInfo.value = result.data
        if (result.data.contentSummary && pinInfo.value) {
          try {
            pinInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
          } catch (e) {}
        }
      }

      console.log('Fetched Universal Pin info:', universalPinInfo.value)
    }
  } catch (error) {
    console.error('Failed to fetch Universal Pin info:', error)
  }
}

// 判断是否为 MetaApp（基于 path）
const isMetaAppLink = computed(() => {
  return hasPinLink.value && universalPinInfo.value?.path === '/protocols/metaapp'
})

// 判断是否为 Buzz（基于 path）
const isBuzzLink = computed(() => {
  return hasPinLink.value && universalPinInfo.value?.path === '/protocols/simplebuzz'
})

// 判断是否为 SimpleNote（基于 path）
const isSimpleNoteLink = computed(() => {
  return hasPinLink.value && universalPinInfo.value?.path === '/protocols/simplenote'
})

// 解析 MetaApp 链接信息
const metaAppLinkInfo = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false
  )

  if (!metaAppInfo.value) {
    return {
      pid: '',
      title: 'MetaApp',
      appName: '',
      version: '',
      icon: '',
      coverImg: '',
      creator: '',
      fullUrl: messageContent || ''
    }
  }

  const summary = metaAppInfo.value.parsedSummary

  return {
    pid: metaAppInfo.value.id || '',
    title: summary?.title || 'MetaApp',
    appName: summary?.appName || '',
    version: summary?.version || '',
    icon: summary?.icon || '',
    coverImg: summary?.coverImg || '',
    creator: metaAppInfo.value.creator || '',
    fullUrl: messageContent || ''
  }
})

// 处理 MetaApp 链接点击
const handleMetaAppLinkClick = () => {
  const linkInfo = metaAppLinkInfo.value
  if (linkInfo.fullUrl) {
    // 在新窗口打开 MetaApp 链接
    if (rootstore.isWebView) {
      openAppBrowser({url:linkInfo.fullUrl})
      return
    }
    window.open(linkInfo.fullUrl, openWindowTarget())
  }
}

// 获取 Pin 创建者用户信息
const fetchPinUserInfo = async (addressOrGlobalMetaId: string, globalMetaId?: string) => {
  const cacheKey = globalMetaId || addressOrGlobalMetaId
  try {
    // 优先使用 globalMetaId 查询
    let userInfo
    if (globalMetaId) {
      userInfo = await getUserInfoByGlobalMetaId(globalMetaId)
    } else if (addressOrGlobalMetaId.length > 40) {
      // 如果看起来像 globalMetaId（长度 > 40），尝试用 globalMetaId 查询
      try {
        userInfo = await getUserInfoByGlobalMetaId(addressOrGlobalMetaId)
      } catch {
        userInfo = await getUserInfoByAddress(addressOrGlobalMetaId)
      }
    } else {
      userInfo = await getUserInfoByAddress(addressOrGlobalMetaId)
    }
    pinUserInfo.value[cacheKey] = {
      name: userInfo.name || addressOrGlobalMetaId.slice(0, 8),
      avatar: userInfo.avatar,
      metaid: userInfo.metaid
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error)
    // 设置默认值
    pinUserInfo.value[cacheKey] = {
      name: addressOrGlobalMetaId.slice(0, 8),
      avatar: '',
      metaid: ''
    }
  }
}

// 获取被提及用户的信息
const fetchMentionedUserInfo = async (globalMetaId: string) => {
  if (mentionedUsers.value.has(globalMetaId)) {
    return mentionedUsers.value.get(globalMetaId)!
  }

  try {
    // 通过 API 查询用户信息（支持 globalMetaId 和旧的 metaId）
    const userInfo = await getUserInfoByGlobalMetaId(globalMetaId)
    const mentionedUser: MentionedUser = {
      globalMetaId,
      name: userInfo.name || globalMetaId.slice(0, 8),
      avatar: userInfo.avatar
    }
    mentionedUsers.value.set(globalMetaId, mentionedUser)
    return mentionedUser
  } catch (error) {
    console.error('Failed to fetch mentioned user info:', error)
    const defaultUser: MentionedUser = {
      globalMetaId,
      name: globalMetaId.slice(0, 8)
    }
    mentionedUsers.value.set(globalMetaId, defaultUser)
    return defaultUser
  }
}

// 初始化 mention 用户信息
const initMentionedUsers = async () => {
  if (!props.message.mention || props.message.mention.length === 0) {
    return
  }

  // 批量获取被提及用户的信息
  await Promise.all(
    props.message.mention.map(globalMetaId => fetchMentionedUserInfo(globalMetaId))
  )
}

// 判断附件是否为图片
const isImageAttachment = (attachment: string): boolean => {
  if (!attachment) return false
  const metafilePattern = /^metafile:\/\/[a-f0-9]+i0(\.(png|jpg|jpeg|gif|webp))?$/i
  return metafilePattern.test(attachment)
}

// 判断附件是否为视频
const isVideoAttachment = (attachment: string): boolean => {
  if (!attachment) return false
  const videoPattern = /^metafile:\/\/video\/[a-f0-9]+i0$/i
  return videoPattern.test(attachment)
}

// 获取 Buzz 的第一张图片
const buzzFirstImage = computed(() => {
  if (!pinInfo.value?.parsedSummary?.attachments) return null

  const images = pinInfo.value.parsedSummary.attachments.filter(isImageAttachment)
  return images.length > 0 ? images[0] : null
})

// 判断 Buzz 是否有视频
const buzzHasVideo = computed(() => {
  if (!pinInfo.value?.parsedSummary?.attachments || pinInfo.value.parsedSummary.attachments.length === 0) return false
  return isVideoAttachment(pinInfo.value.parsedSummary.attachments[0])
})

// 获取 SimpleNote 的封面图
const noteCoverImage = computed(() => {
  const summary = pinInfo.value?.parsedSummary
  if (!summary) return null

  // 优先使用 coverImg
  if (summary.coverImg && isImageAttachment(summary.coverImg)) {
    return summary.coverImg
  }

  // 尝试从 attachments 获取
  if (summary.attachments && summary.attachments.length > 0) {
    const images = summary.attachments.filter(isImageAttachment)
    if (images.length > 0) return images[0]
  }

  return null
})

// 处理 Buzz/Note 链接点击
const handleBuzzOrNoteLinkClick = () => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false
  )

  if (messageContent) {
    if (rootstore.isWebView) {
      openAppBrowser({ url: messageContent })
      return
    }
    window.open(messageContent, openWindowTarget())
  }
}


// 处理群链接点击
// 处理群链接点击
const handleGroupLinkClick = () => {
  // 如果是自己发送的消息，不允许点击
  if (isMyMessage.value) {
    console.log('发送人本人不可点击邀请链接')
    return
  }

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
  &.doge-item {
    background: linear-gradient(113deg, #fff9e6 -12%, #d4b84a 103%);
    color: #5a4a15;
  }
}
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
.rounded-none {
  border-radius: 0 !important;
}

/* Markdown 内容样式 */
.markdown-content {
  word-break: break-word;

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) {
    margin-top: 0.5em;
    margin-bottom: 0.25em;
    font-weight: 600;
    line-height: 1.3;
  }

  :deep(h1) {
    font-size: 1.5em;
  }
  :deep(h2) {
    font-size: 1.3em;
  }
  :deep(h3) {
    font-size: 1.1em;
  }

  :deep(p) {
    margin: 0.25em 0;
  }

  :deep(ul),
  :deep(ol) {
    margin: 0.25em 0;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin: 0.1em 0;
  }

  :deep(code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.1em 0.3em;
    border-radius: 3px;
    font-family: monospace;
    font-size: 0.9em;
  }

  :deep(pre) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.5em;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0.5em 0;

    code {
      background-color: transparent;
      padding: 0;
    }
  }

  :deep(blockquote) {
    border-left: 3px solid #fc457b;
    padding-left: 0.75em;
    margin: 0.5em 0;
    opacity: 0.85;
  }

  :deep(a) {
    color: #3b82f6;
    text-decoration: underline;
  }

  :deep(table) {
    border-collapse: collapse;
    margin: 0.5em 0;
    font-size: 0.9em;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid rgba(0, 0, 0, 0.2);
    padding: 0.25em 0.5em;
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid rgba(0, 0, 0, 0.2);
    margin: 0.5em 0;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
  }
}

/* 暗色模式下的 Markdown 样式 */
.dark .markdown-content {
  :deep(code) {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :deep(pre) {
    background-color: rgba(255, 255, 255, 0.1);
  }

  :deep(th),
  :deep(td) {
    border-color: rgba(255, 255, 255, 0.2);
  }

  :deep(hr) {
    border-top-color: rgba(255, 255, 255, 0.2);
  }
}
</style>
