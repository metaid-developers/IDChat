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

          <!-- MetaApp 应用链接卡片 -->
          <div
            class="w-full py-0.5 flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isMetaAppLink && metaAppInfo"
          >
            <div
              class="max-w-full sm:max-w-[300px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md group overflow-hidden"
              @click="handleMetaAppLinkClick"
            >
              <!-- 顶部：icon | appName version | Made by creator -->
              <div
                class="p-4 pb-2 flex items-center gap-3 border-b border-gray-200 dark:border-gray-600"
              >
                <!-- Icon -->
                <div class="w-12 h-12 shrink-0">
                  <ChatImage
                    v-if="metaAppLinkInfo.icon"
                    :src="metaAppLinkInfo.icon"
                    customClass="w-12 h-12 rounded-lg object-cover"
                  />
                  <div
                    v-else
                    class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
                  >
                    <Icon name="cube" class="w-6 h-6 text-gray-400" />
                  </div>
                </div>

                <!-- AppName & Version -->
                <div class="flex-1 min-w-0">
                  <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
                    {{ metaAppLinkInfo.appName || 'MetaApp' }}
                  </div>
                  <div class="text-dark-400 dark:text-gray-400 text-xs mt-0.5">
                    {{ metaAppLinkInfo.version }}
                  </div>
                </div>

                <!-- Made by Creator -->
                <div class="flex flex-col">
                  <div class="text-dark-400 dark:text-gray-400 font-medium text-sm">
                    Made by
                  </div>
                  <div class="flex items-center gap-1.5 shrink-0">
                    <UserAvatar
                      :image="pinUserInfo[metaAppLinkInfo.creator]?.avatar || ''"
                      :name="
                        pinUserInfo[metaAppLinkInfo.creator]?.name ||
                          metaAppLinkInfo.creator.slice(0, 8)
                      "
                      :meta-id="pinUserInfo[metaAppLinkInfo.creator]?.metaid || ''"
                      :meta-name="''"
                      class="w-6 h-6"
                      :disabled="true"
                    />
                    <div class="text-dark-800 dark:text-gray-100 text-xs">
                      {{
                        pinUserInfo[metaAppLinkInfo.creator]?.name ||
                          metaAppLinkInfo.creator.slice(0, 8)
                      }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Title -->
              <div class="px-4 py-3">
                <div class="text-dark-800 dark:text-gray-100 font-medium text-base line-clamp-2">
                  {{ metaAppLinkInfo.title }}
                </div>
              </div>

              <!-- Cover Image -->
              <div v-if="metaAppLinkInfo.coverImg" class="w-full h-40 bg-gray-100 dark:bg-gray-800">
                <ChatImage
                  :src="metaAppLinkInfo.coverImg"
                  customClass="w-full h-full object-cover rounded-none"
                  wrapperClass="w-full h-full"
                />
              </div>
            </div>
          </div>

          <!-- Buzz 卡片 -->
          <div
            class="w-full py-0.5 flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isBuzzLink && pinInfo"
          >
            <div
              class=" max-w-[300px]  min-w-[300px] lg:max-w-[420px]   shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md overflow-hidden"
              @click="handleBuzzOrNoteLinkClick"
            >
              <div class="p-4 space-y-3">
                <!-- 用户信息和时间 -->
                <div class="flex items-center space-x-2">
                  <UserAvatar
                    :image="pinUserInfo[pinInfo.creator]?.avatar || ''"
                    :name="pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8)"
                    :meta-id="pinUserInfo[pinInfo.creator]?.metaid || ''"
                    :meta-name="''"
                    class="w-10 h-10 shrink-0"
                    :disabled="true"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
                      {{ pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8) }}
                    </div>
                    <div class="text-dark-400 dark:text-gray-400 text-xs">
                      {{ formatTimestamp(pinInfo.timestamp * 1000, i18n) }}
                    </div>
                  </div>
                </div>

                <!-- 内容布局：图片 + 文本 -->
                <div class="flex gap-3">
                  <!-- 图片 -->
                  <div v-if="buzzFirstImage" class="w-20 h-20 shrink-0">
                    <ChatImage :src="buzzFirstImage" customClass="w-20 h-20 object-cover rounded" />
                  </div>

                  <!-- 文本内容 -->
                  <div class="flex-1 min-w-0">
                    <div class="text-dark-800 dark:text-gray-100 text-sm line-clamp-3">
                      {{ pinInfo.parsedSummary?.content || '' }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SimpleNote 卡片 -->
          <div
            class="w-full py-0.5 flex"
            :class="[isMyMessage ? 'flex-row-reverse' : '']"
            v-else-if="isSimpleNoteLink && pinInfo"
          >
            <div
              class="max-w-full sm:max-w-[300px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md overflow-hidden"
              @click="handleBuzzOrNoteLinkClick"
            >
              <!-- 用户信息和时间 -->
              <div class="p-4 pb-2 flex items-center space-x-2">
                <UserAvatar
                  :image="pinUserInfo[pinInfo.creator]?.avatar || ''"
                  :name="pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8)"
                  :meta-id="pinUserInfo[pinInfo.creator]?.metaid || ''"
                  :meta-name="''"
                  class="w-8 h-8 shrink-0"
                  :disabled="true"
                />
                <div class="flex-1 min-w-0">
                  <div class="text-dark-800 dark:text-gray-100 font-medium text-xs truncate">
                    {{ pinUserInfo[pinInfo.creator]?.name || pinInfo.creator.slice(0, 8) }}
                  </div>
                  <div class="text-dark-400 dark:text-gray-400 text-xxs">
                    {{ formatTimestamp(pinInfo.timestamp * 1000, i18n) }}
                  </div>
                </div>
              </div>

              <!-- 封面图 -->
              <div
                v-if="noteCoverImage"
                class="w-full h-30 bg-gray-100 dark:bg-gray-800 overflow-hidden"
              >
                <ChatImage
                  :src="noteCoverImage"
                  customClass="w-full h-full object-cover"
                  wrapperClass="w-full h-full"
                />
              </div>
              <div
                v-else
                class=" min-w-[300px] w-full h-30 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center"
              >
                <Icon name="document_text" class="w-16 h-16 text-gray-400" />
              </div>

              <!-- 标题 -->
              <div class="p-4 pt-3">
                <div class="text-dark-800 dark:text-gray-100 font-medium text-base line-clamp-2">
                  {{ pinInfo.parsedSummary?.title || 'Untitled Note' }}
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
              class="text-sm  text-dark-800 dark:text-gray-100 font-normal  p-3 rounded-xl  transition-all duration-200"
              :class="[
                msgChain == ChatChain.btc && 'btc-item',
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
                isMyMessage
                  ? 'bg-primary dark:text-gray-800 rounded-tr'
                  : 'not-mine bg-white dark:bg-gray-700 rounded-tl',
                message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
              ]"
              v-else
              @click="handleMessageClick"
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
import { getUserInfoByAddress } from '@/api/man'
import { useImagePreview } from '@/stores/imagePreview'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'
import MessageItemQuote from './MessageItemQuote.vue'
import { NodeName ,ChatChain} from '@/enum'
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

// 群信息缓存
const channelInfo = ref<any>(null)
const subChannelInfo = ref<any>(null)

// MetaApp 信息缓存
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
  text = text.replace(/\\n/g, '\n')
  return text.replace(/\n/g, '<br />')
}

// 处理 webview 链接点击的事件委托
const handleMessageClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (target.tagName === 'A' && target.classList.contains('webview-link')) {
    event.preventDefault()
    const url = target.getAttribute('data-webview-url')
    if (url) {

      openAppBrowser({ url })
    }
  }
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

  return userStore.last?.metaid === props.message.metaId
})


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
  const subChannelLinkPattern=/\/channels\/public\/([a-f0-9]+i0)(?:\/([a-f0-9]+))?/i
  const isGroupLink = groupLinkPattern.test(messageContent)
  const isSubChannelLink = subChannelLinkPattern.test(messageContent)

  // 如果是群链接且还没有获取过群信息，则获取群信息
  if (isGroupLink  && !channelInfo.value) {
        const match = messageContent.match(groupLinkPattern)
        if (match) {

        const pinId = match[1]
        fetchChannelInfo(pinId+'i0')
        }

      if(isSubChannelLink && !subChannelInfo.value){

         const subMatch = messageContent.match(subChannelLinkPattern)
     if (subMatch) {

      const pinId = subMatch[1]
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

  const groupLinkPattern = /\/channels\/public\/([a-f0-9]+)/i
  const subChannelLinkPattern=/\/channels\/public\/([a-f0-9]+i0)(?:\/([a-f0-9]+))?/i

  const match = messageContent.match(groupLinkPattern)
  const subChannleMatch= messageContent.match(subChannelLinkPattern)

  if (match && !subChannleMatch[2]) {

    const pinId = match[1] + 'i0'

    return {
      pinId,
      groupName: channelInfo.value?.roomName ,
      groupAvatar: channelInfo.value?.roomIcon || '',
      memberCount: channelInfo.value?.userCount || 0,
      fullUrl: messageContent,
      creator:channelInfo.value?.createUserInfo?.name || '',
    }
  }else if(subChannleMatch[2]){
    console.log("subChannleMatch",messageContent)

    const pinId =subChannleMatch[2] + 'i0'
      return {
      pinId,
      groupName: subChannelInfo.value?.channelName ,
      groupAvatar: subChannelInfo.value?.channelIcon || '',
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

const fetchSubChannelInfo=async(pinId:string)=>{
  try {

    const subChannel = await getGroupChannelList({groupId:pinId})

    if(subChannel.data.list.length){

      subChannelInfo.value = subChannel.data.list[0]
    }

  } catch (error) {

  }
}

// 识别 MetaApp 链接
const isMetaAppLink = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false
  )

  if (!messageContent) return false

  // 检测 MetaApp 链接的正则表达式
  const metaAppLinkPattern = /(?:https?:\/\/[^/]+)?\/metaapp\/([a-f0-9]+i0)/i

  const isMetaApp = metaAppLinkPattern.test(messageContent)

  // 如果是 MetaApp 链接且还没有获取过应用信息，则获取应用信息
  if (isMetaApp && !metaAppInfo.value) {
    const match = messageContent.match(metaAppLinkPattern)
    if (match) {
      const pid = match[1]
      fetchMetaAppInfo(pid)
    }
  }

  return isMetaApp && metaAppInfo.value?.path === '/protocols/metaapp'
})

// 获取 MetaApp 信息
const fetchMetaAppInfo = async (pid: string) => {
  try {
    const response = await fetch(`https://manapi.metaid.io/pin/${pid}`)
    const result = await response.json()

    if (result.code === 1 && result.data) {
      metaAppInfo.value = result.data

      // 解析 contentSummary
      if (result.data.contentSummary) {
        try {
          if (metaAppInfo.value) {
            metaAppInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
          }
        } catch (e) {
          console.error('Failed to parse MetaApp contentSummary:', e)
        }
      }

      // 获取创建者用户信息
      if (result.data.creator && !pinUserInfo.value[result.data.creator]) {
        fetchPinUserInfo(result.data.creator)
      }

      console.log('Fetched MetaApp info:', metaAppInfo.value)
    }
  } catch (error) {
    console.error('Failed to fetch MetaApp info:', error)
  }
}

// 解析 MetaApp 链接信息
const metaAppLinkInfo = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false
  )

  if (!messageContent || !metaAppInfo.value) {
    return {
      pid: '',
      title: 'MetaApp',
      appName: '',
      version: '',
      icon: '',
      coverImg: '',
      creator: '',
      fullUrl: ''
    }
  }

  const metaAppLinkPattern = /(?:https?:\/\/[^/]+)?\/metaapp\/([a-f0-9]+i0)/i
  const match = messageContent.match(metaAppLinkPattern)

  if (match) {
    const pid = match[1]
    const summary = metaAppInfo.value.parsedSummary

    return {
      pid,
      title: summary?.title || 'MetaApp',
      appName: summary?.appName || '',
      version: summary?.version || '',
      icon: summary?.icon || '',
      coverImg: summary?.coverImg || '',
      creator: metaAppInfo.value.creator || '',
      fullUrl: messageContent
    }
  }

  return {
    pid: '',
    title: 'MetaApp',
    appName: '',
    version: '',
    icon: '',
    coverImg: '',
    creator: '',
    fullUrl: messageContent
  }
})

// 处理 MetaApp 链接点击
const handleMetaAppLinkClick = () => {
  const linkInfo = metaAppLinkInfo.value
  if (linkInfo.fullUrl) {
    // 在新窗口打开 MetaApp 链接
    window.open(linkInfo.fullUrl, openWindowTarget())
  }
}

// 识别 Buzz/SimpleNote 链接
const isBuzzOrNoteLink = computed(() => {
  const messageContent = decryptedMessage(
    props.message.content,
    props.message.encryption,
    props.message.protocol,
    false
  )

  if (!messageContent) return false

  // 检测 Buzz 或 SimpleNote 链接的正则表达式（支持完整 URL 和相对路径）
  const buzzPattern = /(?:https?:\/\/[^/]+)?\/buzz\/([a-f0-9]+i0)/i
  const notePattern = /(?:https?:\/\/[^/]+)?\/simpleNote\/([a-f0-9]+i0)/i

  const isBuzz = buzzPattern.test(messageContent)
  const isNote = notePattern.test(messageContent)

  // 如果是 Buzz 或 Note 链接且还没有获取过信息，则获取信息
  if ((isBuzz || isNote) && !pinInfo.value) {
    const buzzMatch = messageContent.match(buzzPattern)
    const noteMatch = messageContent.match(notePattern)
    const match = buzzMatch || noteMatch

    if (match) {
      const pid = match[1]
      fetchPinInfo(pid)
    }
  }

  return isBuzz || isNote
})

// 获取 Pin 信息
const fetchPinInfo = async (pid: string) => {
  try {
    const response = await fetch(`https://manapi.metaid.io/pin/${pid}`)
    const result = await response.json()

    if (result.code === 1 && result.data) {
      pinInfo.value = result.data

      // 解析 contentSummary
      if (result.data.contentSummary) {
        try {
          if (pinInfo.value) {
            pinInfo.value.parsedSummary = JSON.parse(result.data.contentSummary)
          }
        } catch (e) {
          console.error('Failed to parse contentSummary:', e)
        }
      }

      // 获取用户信息
      if (result.data.creator && !pinUserInfo.value[result.data.creator]) {
        fetchPinUserInfo(result.data.creator)
      }

      console.log('Fetched Pin info:', pinInfo.value)
    }
  } catch (error) {
    console.error('Failed to fetch Pin info:', error)
  }
}

// 获取 Pin 创建者用户信息
const fetchPinUserInfo = async (address: string) => {
  try {
    const userInfo = await getUserInfoByAddress(address)
    pinUserInfo.value[address] = {
      name: userInfo.name || address.slice(0, 8),
      avatar: userInfo.avatar,
      metaid: userInfo.metaid
    }
  } catch (error) {
    console.error('Failed to fetch user info:', error)
    // 设置默认值
    pinUserInfo.value[address] = {
      name: address.slice(0, 8),
      avatar: '',
      metaid: ''
    }
  }
}

// 判断是否为 Buzz
const isBuzzLink = computed(() => {
  return isBuzzOrNoteLink.value && pinInfo.value?.path === '/protocols/simplebuzz'
})

// 判断是否为 SimpleNote
const isSimpleNoteLink = computed(() => {
  return isBuzzOrNoteLink.value && pinInfo.value?.path === '/protocols/simplenote'
})

// 判断附件是否为图片
const isImageAttachment = (attachment: string): boolean => {
  if (!attachment) return false
  const metafilePattern = /^metafile:\/\/[a-f0-9]+i0(\.(png|jpg|jpeg|gif|webp))?$/i
  return metafilePattern.test(attachment)
}

// 获取 Buzz 的第一张图片
const buzzFirstImage = computed(() => {
  if (!pinInfo.value?.parsedSummary?.attachments) return null

  const images = pinInfo.value.parsedSummary.attachments.filter(isImageAttachment)
  return images.length > 0 ? images[0] : null
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
    window.open(messageContent, openWindowTarget())
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
</style>
