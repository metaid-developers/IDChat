<template>
  <div
    class="bg-[#FFFFFF] dark:bg-gray-900 rounded-lg"
    v-if="
      simpleTalk.activeChannel?.type === 'private' ||
        simpleTalk.activeChannel?.type === 'group' ||
        simpleTalk.activeChannel?.type === 'sub-group'
    "
  >
    <!-- 回复/引用 -->
    <div class="quote flex flex-align-center rounded-lg" v-if="quote">
      <div class="flex1 flex flex-align-center whitespace-nowrap">
        {{ $t('Talk.Quote.tips') }}
        <a @click="emit('toQuote')" class="user"
          ><UserName
            :name="quote.userInfo ? quote.userInfo.name : quote.fromUserInfo.name"
            :meta-name="''"
            :no-tag="true"
        /></a>
        <span class="grow truncate">:{{ computeDecryptedMsg(quote) }}</span>
      </div>
      <Icon name="x_circle" class="close" @click="emit('update:quote', undefined)" />
    </div>

    <!-- 上传图预览 -->
    <div
      v-if="hasImage"
      class="border-b-2 border-solid border-dark-200 dark:border-gray-600 pb-2 px-3 pt-3"
    >
      <div class="p-2 w-50 h-50 main-border still relative">
        <div class="absolute right-0 top-0 z-10 -my-2 -mx-3 flex space-x-2.5 items-center">
          <!-- 压缩按钮 -->
          <div
            class="main-border small bg-white dark:bg-gray-700 p-1.5 cursor-pointer !rounded-lg text-xs flex items-center justify-center gap-x-1"
            @click="useCompression = !useCompression"
          >
            <div class="">{{ $t('Talk.Input.compress') }}</div>

            <Icon
              name="check_bold"
              v-if="useCompression"
              class="w-2.5 h-2.5 inline bg-primary rounded p-0.5 box-content"
            />
            <div
              class="w-3.5 h-3.5 bg-gray-100 dark:bg-gray-950 rounded shadow-inner shadow-gray-200 dark:shadow-gray-950"
              v-else
            ></div>
          </div>

          <!-- 删除按钮 -->
          <div
            class="main-border small bg-white dark:bg-gray-700 p-1.5 cursor-pointer !rounded-lg"
            @click="deleteImage"
          >
            <Icon name="x_mark" class="w-4 h-4 text-dark-800 dark:text-gray-100" />
          </div>

          <!-- 发送按钮 -->
          <div
            class="main-border primary p-1.5 cursor-pointer small !rounded-lg"
            @click="trySendImage"
          >
            <Icon name="send" class="w-4 h-4 text-dark-800 -rotate-6" />
          </div>
        </div>
        <img
          :src="imagePreviewUrl"
          class="w-full h-full object-scale-down cursor-zoom-in"
          @click="showImagePreview = true"
        />
      </div>

      <Teleport to="body" v-if="showImagePreview">
        <TalkImagePreview
          v-if="showImagePreview"
          :src="imagePreviewUrl"
          @close="showImagePreview = false"
        />
      </Teleport>
    </div>

    <!-- 输入框区域（一行布局） -->
    <div :class="[rows > 1 ? 'items-start' : 'items-center', 'flex h-fit']">
      <!-- 左侧费率选择器 -->
      <FeeSelector class="bg-[#F5F7FA] dark:bg-gray-800 shrink-0" />

      <!-- 输入框容器 -->
      <div
        class="self-stretch flex items-center grow bg-[#F5F7FA] dark:bg-gray-800 px-3 py-2 mx-2 rounded-lg"
      >
        <textarea
          class="w-full !outline-none placeholder:text-dark-250 placeholder:dark:text-gray-400 placeholder:text-sm placeholder:truncate text-dark-800 dark:text-gray-100 text-base caret-gray-600 dark:caret-gray-400 resize-none !h-fit bg-transparent transition-all duration-150 delay-100"
          :rows="rows"
          ref="theTextBox"
          :placeholder="
            $t('Talk.Channel.message_to', {
              channel:
                (simpleTalk.activeChannel?.type === 'group' ||
                simpleTalk.activeChannel?.type === 'sub-group'
                  ? '#'
                  : '@') + (simpleTalk.activeChannel?.name || ''),
            })
          "
          v-model="chatInput"
          @keydown="handleKeyDown"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
          @input="handleInput"
        />

        <!-- 发送按钮（在输入框内） -->
        <transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
        >
          <div v-if="hasInput" class="shrink-0 ml-2">
            <div class="cursor-pointer" @click="trySendText">
              <div class="text-primary scale-110 -rotate-6">
                <Icon name="send" class="w-5 h-5" />
              </div>
            </div>
          </div>
        </transition>
      </div>

      <!-- @ 提及下拉菜单 -->
      <MentionDropdown
        :show="showMentionDropdown"
        :users="mentionUsers"
        :position="mentionDropdownPosition"
        :loading="mentionLoading"
        :query="mentionQuery"
        @select="handleMentionSelect"
        ref="mentionDropdownRef"
      />

      <Teleport to="body">
        <input
          type="file"
          id="imageUploader"
          ref="imageUploader"
          accept="image/jpeg,image/png,image/gif,image/webp,image/*"
          @change="handleImageChange"
          class="hidden"
        />
      </Teleport>

      <!-- 右侧快捷按钮 -->
      <div class="flex items-center shrink-0 gap-1">
        <!-- 表情选择器 -->
        <ElPopover placement="bottom-end" width="300px" trigger="click">
          <StickerVue @input="params => (chatInput = chatInput + params.value)" />
          <template #reference>
            <div
              class="w-7 h-7 flex items-center justify-center transition-all lg:hover:animate-wiggle cursor-pointer"
            >
              <Icon
                name="emoji_icon"
                class="w-8 h-8 text-dark-800 dark:text-gray-100 transition-all ease-in-out duration-300"
                :class="{ 'text-primary -rotate-6 scale-110': showStickersBox }"
              />
            </div>
          </template>
        </ElPopover>

        <!-- 更多按钮（+号） -->
        <Popover class="relative flex items-center" v-slot="{ open }">
          <PopoverButton as="div">
            <div
              class="w-6 h-6 flex items-center justify-center rounded-full cursor-pointer border-2 border-dark-300 dark:border-gray-400 transition-all hover:border-dark-500 dark:hover:border-gray-300"
            >
              <Icon
                name="plus_2"
                :class="[
                  open && 'rotate-45',
                  'w-3 h-3 text-dark-800 dark:text-gray-100 transition duration-200',
                ]"
              />
            </div>
          </PopoverButton>

          <transition
            enter-active-class="transition duration-200 ease-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition duration-150 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <PopoverPanel
              class="absolute z-10 transform top-[-12px] right-0 -translate-y-full"
              v-slot="{ close }"
            >
              <div
                class="bg-white dark:bg-gray-800 py-2 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 min-w-[260px]"
              >
                <!-- Photos 按钮 -->
                <div
                  class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  @click="openImageUploader(close)"
                >
                  <div
                    class="w-9 h-9 rounded-full bg-[#FFC107] flex items-center justify-center shrink-0"
                  >
                    <Icon name="photo" class="w-5 h-5 text-dark-800" />
                  </div>
                  <span class="text-sm text-dark-800 dark:text-gray-100">Photos</span>
                </div>

                <!-- Red Bag 按钮 -->
                <div
                  v-if="
                    (simpleTalk.activeChannel?.type === 'group' ||
                      simpleTalk.activeChannel?.type === 'sub-group') &&
                      !quote
                  "
                  class="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  @click="handleRedPackClick(close)"
                >
                  <div
                    class="w-9 h-9 rounded-full bg-[#FFC107] flex items-center justify-center shrink-0"
                  >
                    <Icon name="red_envelope" class="w-5 h-5 text-dark-800" />
                  </div>
                  <span class="text-sm text-dark-800 dark:text-gray-100">Red Bag</span>
                </div>
              </div>
            </PopoverPanel>
          </transition>
        </Popover>
      </div>
    </div>
  </div>

  <div
    class="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3 text-sm text-dark-250 dark:text-gray-500 cursor-not-allowed truncate"
    v-else
  >
    {{ $t('Talk.Input.dont_have_permission') }}
  </div>

  <!-- Apple Style Action Sheet -->
  <Teleport to="body">
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="showRedPacketActionSheet"
        class="fixed inset-0 z-50 flex items-end justify-center  bg-black bg-opacity-50 md:items-center"
        @click="closeActionSheet"
      >
        <transition
          enter-active-class="transition duration-300 ease-out"
          enter-from-class="transform translate-y-full opacity-0"
          enter-to-class="transform translate-y-0 opacity-100"
          leave-active-class="transition duration-200 ease-in"
          leave-from-class="transform translate-y-0 opacity-100"
          leave-to-class="transform translate-y-full opacity-0"
        >
          <div
            v-if="showRedPacketActionSheet"
            class="w-full max-w-xs sm:max-w-xs md:w-96 bg-white dark:bg-gray-800 rounded-t-xl shadow-xl transform md:rounded-xl"
            @click.stop
          >
            <!-- Options -->
            <div class="px-2 py-2">
              <!-- MVC Red Packet -->
              <button
                @click="selectRedPacketType('mvc')"
                class="w-full flex items-center px-4 py-4 justify-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 active:scale-95"
              >
                <h4 class="text-lg text-center font-medium text-gray-900 dark:text-gray-100">
                  SPACE {{ $t('Talk.Modals.red_packet') }}
                </h4>
              </button>
              <!-- BTC Red Packet -->
              <button
                @click="selectRedPacketType('btc')"
                class="w-full flex text-center items-center px-4 py-4 justify-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 active:scale-95"
              >
                <h4 class="text-lg  font-medium text-gray-900 dark:text-gray-100">
                  BTC {{ $t('Talk.Modals.red_packet') }}
                </h4>
              </button>
              <!-- Token Red Packet -->
              <button
                @click="selectRedPacketType('token')"
                class="w-full flex text-center items-center px-4 py-4 justify-center hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 active:scale-95"
              >
                <h4 class="text-lg font-medium text-gray-900 dark:text-gray-100">
                  Token {{ $t('Talk.Modals.red_packet') }}
                </h4>
              </button>
            </div>

            <!-- Cancel Button -->
            <div class="px-2 pb-2">
              <button
                @click="closeActionSheet"
                class="w-full py-4 text-center text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-colors duration-200 active:scale-95"
              >
                {{ $t('cancel') }}
              </button>
            </div>
          </div>
        </transition>
      </div>
    </transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, toRaw, Ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { Popover, PopoverButton, PopoverPanel, TransitionRoot } from '@headlessui/vue'
import { ElMessage, ElPopover, ElMessageBox } from 'element-plus'

import { sendMessage, validateTextMessage, isImage, isFileTooLarge } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useConnectionStore } from '@/stores/connection'
import { FileToAttachmentItem, compressImage, atobToHex } from '@/utils/util'
import { useCredentialsStore } from '@/stores/credentials'
import {
  encrypt,
  ecdhEncrypt,
  ecdhDecrypt,
  ecdhEncryptForPrivateImg,
  decrypt,
} from '@/utils/crypto'
import { useTalkStore } from '@/stores/talk'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { ChannelType, MessageType, ChatChain } from '@/enum'
import { useLayoutStore } from '@/stores/layout'
import { MessageType as SimpleMessageType, SimpleChannel } from '@/@types/simple-chat.d'
import TalkImagePreview from './ImagePreview.vue'
import StickerVue from '@/components/Sticker/Sticker.vue'
import MentionDropdown from './MentionDropdown.vue'
import FeeSelector from '@/components/FeeSelector/FeeSelector.vue'
import Decimal from 'decimal.js-light'
import { router } from '@/router'
import { useChainStore } from '@/stores/chain'
import { useI18n } from 'vue-i18n'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { useEcdhsStore } from '@/stores/ecdh'
import { needWebRefresh } from '@/wallet-adapters/metalet'
import { useRootStore } from '@/stores/root'
import { searchChannelMembers, getChannelMembers } from '@/api/talk'

interface Props {
  quote?: any
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:quote', 'toQuote', 'scrollToBottom'])

const doNothing = () => {}
const i18n = useI18n()
const chainStore = useChainStore()
const showMoreCommandsBox = ref(false)
const showStickersBox = ref(false)
const showRedPacketActionSheet = ref(false)
const spaceNotEnoughFlag = ref(false)
const layout = useLayoutStore()
const credentialsStore = useCredentialsStore()
const ecdhsStore = useEcdhsStore()
const talk = useTalkStore()
const simpleTalk = useSimpleTalkStore()
const hasInput = computed(() => chatInput.value.length > 0)
const rootStore = useRootStore()
const computeDecryptedMsg = (session: any) => {
  console.log('props.session', session)

  try {
    if (session.encryption == 'aes') {
      let secretKeyStr = (session.channelId || session.groupId)?.substring(0, 16) || ''
      switch (session.chatType) {
        case 1:
        case SimpleMessageType.msg:
          return decrypt(session.content, secretKeyStr)
        case SimpleMessageType.red:
          return session.content
        case SimpleMessageType.img:
          return `[${i18n.t('new_msg_img')}]`
        default:
          return ''
      }
    } else {
      const ecdhsStore = useEcdhsStore()
      const ecdhPubkey =
        session.metaId !== simpleTalk.selfMetaId
          ? session?.fromUserInfo?.chatPublicKey
          : session?.toUserInfo?.chatPublicKey
      if (!ecdhPubkey) {
        return ''
      }
      let ecdh = ecdhsStore.getEcdh(ecdhPubkey)

      try {
        const sharedSecret = ecdh?.sharedSecret
        if (!sharedSecret) {
          return ''
        }

        return ecdhDecrypt(session.content, sharedSecret)
      } catch (error) {
        return ''
      }
    }
  } catch (error) {
    return ''
  }
}

/** 输入框样式 */
const isShowingButtonGroup = computed(() => {
  const isMobile = window.innerWidth <= 1024
  return !isMobile || !hasInput.value
})
const moreCommands = () => {
  let commands = [
    {
      titleKey: 'Talk.Input.share_nft',
      descriptionKey: 'Talk.Input.share_nft_tip',
      icon: 'lit_ward',
      action: doNothing as any,
    },
    {
      titleKey: 'Talk.Input.sell_nft',
      descriptionKey: 'Talk.Input.sell_nft_tip',
      icon: 'sell_tag',
      action: doNothing,
    },
  ]

  if (!isShowingButtonGroup.value) {
    const newCommands = [
      {
        titleKey: 'Talk.Input.giveaway_short',
        descriptionKey: 'Talk.Input.giveaway',
        icon: 'red_envelope',
        action: () => (layout.isShowRedPacketModal = true),
      },
      {
        titleKey: 'Talk.Channel.upload_image',
        descriptionKey: 'Talk.Channel.upload_image',
        icon: 'photo_3',
        action: (close: any) => openImageUploader(close),
      },
      {
        titleKey: 'Talk.Input.emoji',
        descriptionKey: 'Talk.Input.emoji',
        icon: 'face_smile',
        action: doNothing,
      },
    ]

    commands = commands.concat(newCommands)
  }

  return commands
}
/** ------ */

/** 上传图片 */
const imageUploader = ref<HTMLInputElement | null>(null)
const imageFile = ref<File | null>(null)
const showImagePreview = ref(false)
const useCompression = ref(true)

const hasImage = computed(() => imageFile.value !== null)

const activeChannel = computed(() => {
  return simpleTalk.activeChannel
})

const openImageUploader = (close: Function) => {
  rootStore.checkWebViewBridge()

  // 先关闭弹窗，避免影响文件选择
  close()

  // 延迟触发文件选择，确保弹窗完全关闭
  setTimeout(() => {
    if (rootStore.isWebView) {
      needWebRefresh({ isNeed: false })
    }

    // 重置 input 的值，确保可以重复选择同一文件
    if (imageUploader.value) {
      imageUploader.value.value = ''
      imageUploader.value.click()
      console.log('🔘 触发文件选择器')
    } else {
      console.error('❌ imageUploader ref 为空')
    }
  }, 100)
}

const openRedPackDialog = () => {
  showRedPacketActionSheet.value = true
}

// 包装函数：用于弹窗中的红包按钮点击
const handleRedPackClick = (closePopover: () => void) => {
  openRedPackDialog()
  closePopover()
}

const selectRedPacketType = (type: 'btc' | 'mvc' | 'token') => {
  showRedPacketActionSheet.value = false
  // 设置红包类型，但不改变gas链选择
  layout.selectedRedPacketType = type
  layout.isShowRedPacketModal = true
}

const closeActionSheet = () => {
  showRedPacketActionSheet.value = false
}

const handleImageChange = (e: Event) => {
  console.log('📸 handleImageChange triggered')

  // 暂时禁用 DOGE 链发送图片功能
  if (chainStore.state.currentChain === 'doge') {
    ElMessage.warning(i18n.t('doge_image_not_supported') || 'DOGE 链暂不支持发送图片')
    return
  }

  rootStore.checkWebViewBridge()
  if (rootStore.isWebView) {
    needWebRefresh({ isNeed: false })
  }

  const target = e.target as HTMLInputElement
  console.log('📸 target.files:', target.files)

  // 检查是否有文件
  if (!target.files || target.files.length === 0) {
    console.warn('⚠️ 没有选择文件或文件列表为空')
    return
  }

  const file = target.files[0]
  console.log('📸 选择的文件:', {
    name: file.name,
    type: file.type,
    size: file.size,
  })

  if (file) {
    if (!isImage(file)) {
      console.error('❌ 文件不是图片类型:', file.type)
      talk.$patch({
        error: {
          type: 'image_only',
          message: 'image_only',
          timestamp: Date.now(),
        },
      })
      return
    }

    if (isFileTooLarge(file)) {
      console.error('❌ 文件太大:', file.size)
      talk.$patch({
        error: {
          type: 'image_too_large',
          message: 'image_too_large',
          timestamp: Date.now(),
        },
      })
      return
    }

    console.log('✅ 图片验证通过，设置预览')
    imageFile.value = file
  } else {
    console.warn('⚠️ file 为空')
  }
}

const deleteImage = () => {
  imageFile.value = null
  imageUploader.value!.value = ''
}

const imagePreviewUrl = computed(() => {
  if (imageFile.value) {
    return URL.createObjectURL(imageFile.value)
  }

  return ''
})

const trySendImage = async () => {
  // 发送图片成功后滚动到底部
  emit('scrollToBottom')
  let image = imageFile.value as NonNullable<typeof imageFile.value>
  // 压缩图片
  if (useCompression.value) {
    const compressedFile = await compressImage(imageFile.value!)
    image = compressedFile
  }
  console.log('size', image.size / 1024, 'KB')

  const hexedFiles = await FileToAttachmentItem(image)

  const attachments = [hexedFiles]

  if (simpleTalk.activeChannel?.type == 'private') {
    if (!simpleTalk.activeChannel?.publicKeyStr) {
      return ElMessage.error(`${i18n.t('get_ecdh_pubey_error')}`)
    }
    let ecdh = ecdhsStore.getEcdh(simpleTalk.activeChannel?.publicKeyStr)
    if (!ecdh) {
      ecdh = await getEcdhPublickey(simpleTalk.activeChannel.publicKeyStr)
      ecdhsStore.insert(ecdh, ecdh?.externalPubKey)
    }

    console.log('contentcontentcontent2222222', attachments[0].data)

    const sharedSecret = ecdh?.sharedSecret //atobToHex(credential!.signature)
    attachments[0].data = ecdhEncryptForPrivateImg(attachments[0].data, sharedSecret)
  }

  // 处理群聊和子群聊的图片加密
  if (
    simpleTalk.activeChannel?.type === 'group' ||
    simpleTalk.activeChannel?.type === 'sub-group'
  ) {
    // 判断是否需要使用私密群聊加密
    let isPrivateGroup = simpleTalk.activeChannel.roomJoinType === '100'
    let parentChannel: any = null

    // 如果是子群聊，获取父群聊信息
    if (simpleTalk.activeChannel.type === 'sub-group' && simpleTalk.activeChannel.parentGroupId) {
      parentChannel = simpleTalk.getParentGroupChannel(simpleTalk.activeChannel.parentGroupId)
      if (parentChannel?.roomJoinType === '100') {
        isPrivateGroup = true
      }
    }

    if (isPrivateGroup) {
      // 子群聊使用父群聊的 passwordKey
      const secretKey =
        simpleTalk.activeChannel.type === 'sub-group' && parentChannel
          ? parentChannel.passwordKey
          : simpleTalk.activeChannel.passwordKey

      if (secretKey) {
        attachments[0].data = ecdhEncryptForPrivateImg(attachments[0].data, secretKey)
        console.log(
          '🔐 私密群聊图片已加密',
          simpleTalk.activeChannel.type === 'sub-group' ? '(使用父群聊密钥)' : ''
        )
      }
    }
  }

  // clone，用于填充mock信息
  const originalFileUrl = imagePreviewUrl.value
  deleteImage()

  const messageDto = {
    type: MessageType.Image,
    channelId: simpleTalk.activeChannelId,
    groupId: simpleTalk.activeChannel?.type == 'private' ? '' : simpleTalk.activeChannelId || '',
    userName: userStore.last?.name!,
    attachments,
    content: '',
    originalFileUrl,
    channelType: simpleTalk.activeChannel?.type,
    reply: props.quote,
  }

  emit('update:quote', undefined)
  await sendMessage(messageDto)
}
/** ------ */

/** 发送消息 */
const chatInput = ref('')
const userStore = useUserStore()

const connectionStore = useConnectionStore()
const isSending = ref(false)
const theTextBox: Ref<HTMLTextAreaElement | null> = ref(null)

// 中文输入法状态管理
const isComposing = ref(false)

const onCompositionStart = () => {
  isComposing.value = true
}

const onCompositionEnd = () => {
  isComposing.value = false
}

// @ 提及功能相关状态
const showMentionDropdown = ref(false)
const mentionUsers = ref<any[]>([])
const mentionLoading = ref(false)
const mentionQuery = ref('')
const mentionStartPos = ref(0)
const mentionDropdownPosition = ref<{
  top?: number
  bottom?: number
  left: number
  width?: number
}>({ left: 0 })
const mentionDropdownRef = ref<any>(null)
const currentMentions = ref<Array<{ globalMetaId: string; name: string }>>([]) // 使用 globalMetaId
const defaultMembersCache = ref<any[]>([]) // 缓存默认成员列表
const MENTION_SEARCH_DEBOUNCE_MS = 180
let mentionSearchTimer: ReturnType<typeof setTimeout> | null = null
let latestMentionReqId = 0

// 处理输入事件，检测 @ 符号
const handleInput = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  const cursorPos = target.selectionStart || 0
  const textBeforeCursor = chatInput.value.substring(0, cursorPos)

  // 同步更新 mentions：检查当前文本中是否还包含已记录的 @用户名
  syncMentionsWithText()

  // 查找最后一个 @ 符号的位置
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex !== -1) {
    // 检查 @ 符号后面是否有空格，如果有则关闭下拉框
    const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1)
    if (textAfterAt.includes(' ') || textAfterAt.includes('\n')) {
      showMentionDropdown.value = false
      return
    }

    // 提取 @ 后的查询文本
    const query = textAfterAt
    mentionQuery.value = query
    mentionStartPos.value = lastAtIndex

    // 计算下拉框位置
    updateMentionDropdownPosition(target)

    // 只在群聊中显示 @ 提及功能
    if (
      simpleTalk.activeChannel?.type === 'group' ||
      simpleTalk.activeChannel?.type === 'sub-group'
    ) {
      showMentionDropdown.value = true

      // 如果没有输入文字，使用默认成员列表或从接口获取
      if (!query) {
        if (mentionSearchTimer) {
          clearTimeout(mentionSearchTimer)
          mentionSearchTimer = null
        }
        latestMentionReqId += 1
        mentionLoading.value = false
        loadDefaultMembers()
      } else {
        queueMentionSearch(query)
      }
    }
  } else {
    showMentionDropdown.value = false
  }
}

// 同步 mentions 数组与输入文本
const syncMentionsWithText = () => {
  // 过滤出文本中仍然存在的 mentions
  currentMentions.value = currentMentions.value.filter(mention => {
    // 检查 @用户名 是否还在文本中
    const mentionPattern = `@${mention.name}`
    return chatInput.value.includes(mentionPattern)
  })

  console.log('📝 同步后的 mentions:', currentMentions.value)
}

// 计算下拉框位置（直接定位在输入框上方）
const updateMentionDropdownPosition = (textarea: HTMLTextAreaElement) => {
  const rect = textarea.getBoundingClientRect()

  // 使用 bottom 定位，直接固定在输入框上方
  // 计算从视口底部到输入框顶部的距离
  const viewportHeight = window.visualViewport?.height || window.innerHeight
  const bottomDistance = viewportHeight - rect.top + 8 // 8px 间距

  mentionDropdownPosition.value = {
    top: undefined,
    bottom: bottomDistance,
    left: rect.left + 10,
    width: Math.min(rect.width - 20, 320), // 限制宽度
  }
}

// 加载默认成员列表
const loadDefaultMembers = async () => {
  if (!simpleTalk.activeChannelId) return

  // 如果已有缓存，直接使用
  if (defaultMembersCache.value.length > 0) {
    mentionUsers.value = defaultMembersCache.value
    return
  }

  mentionLoading.value = true

  try {
    const results = await getChannelMembers({
      groupId: simpleTalk.activeChannelId,
      size: '10',
      orderBy: 'timestamp',
      orderType: 'desc',
    })

    // 合并所有成员列表，优先显示创建者和管理员
    const allMembers = [...(results.list || [])].slice(0, 10) // 只取前10个

    defaultMembersCache.value = allMembers
    mentionUsers.value = allMembers
  } catch (error) {
    console.error('获取群成员失败:', error)
    mentionUsers.value = []
  } finally {
    mentionLoading.value = false
  }
}

// 搜索群成员
const searchMentionUsers = async (query: string) => {
  if (!simpleTalk.activeChannelId) return

  const reqId = ++latestMentionReqId
  mentionLoading.value = true

  try {
    const results = await searchChannelMembers({
      groupId: simpleTalk.activeChannelId,
      query: query,
      size: '10',
    })

    if (reqId !== latestMentionReqId) return
    mentionUsers.value = results || []
  } catch (error) {
    if (reqId !== latestMentionReqId) return
    console.error('搜索群成员失败:', error)
    mentionUsers.value = []
  } finally {
    if (reqId === latestMentionReqId) {
      mentionLoading.value = false
    }
  }
}

const queueMentionSearch = (query: string) => {
  if (mentionSearchTimer) {
    clearTimeout(mentionSearchTimer)
  }
  const keyword = query.trim()
  if (!keyword) {
    latestMentionReqId += 1
    mentionLoading.value = false
    return
  }
  mentionSearchTimer = setTimeout(() => {
    mentionSearchTimer = null
    searchMentionUsers(keyword)
  }, MENTION_SEARCH_DEBOUNCE_MS)
}

// 处理选择用户
const handleMentionSelect = (user: any) => {
  const beforeMention = chatInput.value.substring(0, mentionStartPos.value)
  const afterMention = chatInput.value.substring(
    theTextBox.value?.selectionStart || chatInput.value.length
  )

  // 替换 @ 和查询文本为 @用户名
  const mentionText = `@${user.userInfo.name} `
  chatInput.value = beforeMention + mentionText + afterMention

  // 记录被提及的用户信息 - 使用 globalMetaId
  currentMentions.value.push({
    globalMetaId: user.globalMetaId,
    name: user.userInfo.name,
  })

  // 关闭下拉框
  showMentionDropdown.value = false

  // 将光标移动到插入的文本后面
  nextTick(() => {
    const newCursorPos = beforeMention.length + mentionText.length
    theTextBox.value?.setSelectionRange(newCursorPos, newCursorPos)
    theTextBox.value?.focus()
  })
}

const handleKeyDown = (e: KeyboardEvent) => {
  // 如果 @ 提及下拉框显示中，处理方向键和回车
  if (showMentionDropdown.value && mentionDropdownRef.value) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      mentionDropdownRef.value.selectNext()
      return
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      mentionDropdownRef.value.selectPrevious()
      return
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      mentionDropdownRef.value.selectCurrent()
      return
    } else if (e.key === 'Escape') {
      e.preventDefault()
      showMentionDropdown.value = false
      return
    }
  }

  // 如果正在使用输入法，不处理回车键
  if (e.key === 'Enter' && !e.shiftKey && !isComposing.value) {
    e.preventDefault()
    trySendText(e)
  }
}

const rows = computed(() => {
  if (isSending.value) {
    return 1
  }

  // 行数=换行符+过长的行数+1
  const lines = chatInput.value.split('\n')
  // 计算列数：当前textarea宽度/字体宽度 TODO

  // const cols = Math.floor(
  //   (theTextBox.value?.clientWidth || 0) / (theTextBox.value?.offsetWidth || 0)
  // )

  const rowsCount = lines.reduce((acc, line) => {
    // const lineRows = Math.max(1, Math.ceil(line.length / cols))
    const lineRows = 1
    return acc + lineRows
  }, 0)

  return Math.min(Math.max(rowsCount, 1), 10)
})

const checkSpaceBalance = () => {
  return new Promise<void>(async (resolve, reject) => {
    // 获取餘额

    const res = await connectionStore.adapter.getMvcBalance().catch(error => {
      ElMessage.error(error.message)
      resolve()
    })
    if (typeof res === 'number') {
      if (res >= talk.activeChannel.roomLimitAmount) {
        resolve()
      } else {
        ElMessage.error(
          `Insufficient channel permissions,You need to have at least ${new Decimal(
            talk.activeChannel.roomLimitAmount
          )
            .div(10 ** 8)
            .toString()} space to proceed with the operation.`
        )
        reject()
      }
    } else {
      ElMessage.error('Network error.')
      reject()
    }
  })
}

const trySendText = async (e: any) => {
  isSending.value = true

  // 去除首尾空格
  chatInput.value = chatInput.value.trim()
  if (!validateTextMessage(chatInput.value)) {
    isSending.value = false
    return
  }

  if (spaceNotEnoughFlag.value) {
    isSending.value = false
    return
  }
  console.log('activeChannel type:', simpleTalk.activeChannel?.type)
  // 发送成功后滚动到底部
  emit('scrollToBottom')
  // 私聊会话和頻道群聊的加密方式不同
  let content = ''

  if (
    simpleTalk.activeChannel?.type === 'group' ||
    simpleTalk.activeChannel?.type === 'sub-group'
  ) {
    // 判断是否需要使用私密群聊加密
    // 1. 如果是主群聊，检查 roomJoinType === '100'
    // 2. 如果是子群聊，检查父群聊的 roomJoinType === '100'
    let isPrivateGroup = simpleTalk.activeChannel.roomJoinType === '100'
    let parentChannel: any = null

    // 如果是子群聊，获取父群聊信息
    if (simpleTalk.activeChannel.type === 'sub-group' && simpleTalk.activeChannel.parentGroupId) {
      parentChannel = simpleTalk.getParentGroupChannel(simpleTalk.activeChannel.id)
      if (parentChannel?.roomJoinType === '100') {
        isPrivateGroup = true
      }
    }

    if (!isPrivateGroup) {
      content = encrypt(chatInput.value, simpleTalk.activeChannel.id.substring(0, 16))
    } else {
      // 私密群聊加密：子群聊使用父群聊的 passwordKey
      let secretKey =
        simpleTalk.activeChannel.type === 'sub-group' && parentChannel
          ? parentChannel.passwordKey
          : simpleTalk.activeChannel.passwordKey

      // 如果是创建者且没有缓存的 passwordKey，从钱包获取
      const targetChannel =
        simpleTalk.activeChannel.type === 'sub-group' && parentChannel
          ? parentChannel
          : simpleTalk.activeChannel

      if (!secretKey && targetChannel.createdBy === simpleTalk.selfMetaId) {
        const pkh = await (window.metaidwallet as any).getPKHByPath({
          path: `m/${targetChannel.path || '100/0'}`,
        })
        secretKey = pkh.substring(0, 16)

        // 更新缓存到主群聊
        targetChannel.passwordKey = secretKey
      }

      if (!secretKey) {
        isSending.value = false
        return ElMessage.error('无法获取群组密钥，请重新加入群组')
      }

      content = encrypt(chatInput.value, secretKey)
      console.log(
        '🔐 私密群聊消息已加密, passwordKey:',
        secretKey.substring(0, 8) + '...',
        simpleTalk.activeChannel.type === 'sub-group' ? '(使用父群聊密钥)' : ''
      )
    }

    console.log('sub-group chat content:', content, simpleTalk.activeChannel.id.substring(0, 16))
  } else {
    // 私聊加密
    if (!simpleTalk.activeChannel?.publicKeyStr) {
      isSending.value = false
      return ElMessage.error(`${i18n.t('get_ecdh_pubey_error')}`)
    }
    let ecdh = ecdhsStore.getEcdh(simpleTalk.activeChannel?.publicKeyStr)

    if (!ecdh) {
      ecdh = await getEcdhPublickey(simpleTalk.activeChannel.publicKeyStr)
      if (ecdh) {
        ecdhsStore.insert(ecdh, ecdh?.externalPubKey)
      }
    }

    const sharedSecret = ecdh?.sharedSecret
    if (!sharedSecret) {
      isSending.value = false
      return ElMessage.error('Failed to generate shared secret')
    }

    console.log(chatInput.value, sharedSecret)

    content = ecdhEncrypt(chatInput.value, sharedSecret)

    console.log('ecdhDecrypt', ecdhDecrypt(content, sharedSecret))
  }

  chatInput.value = ''
  console.log('simpleTalk.activeChannel.id', simpleTalk.activeChannel?.id)

  // 使用 simple-talk store 发送消息
  if (!simpleTalk.activeChannel) {
    console.error('No active channel')
    isSending.value = false
    return
  }

  try {
    // 准备 mentions 数据
    const mentions = currentMentions.value.length > 0 ? [...currentMentions.value] : undefined

    // 使用 simple-talk 的 sendMessage 方法，传递 mentions
    await simpleTalk.sendMessage(simpleTalk.activeChannel.id, content, 0, props.quote, mentions)

    // 清空 mentions 记录
    currentMentions.value = []

    if (props.quote) {
      emit('update:quote', undefined)
    }
    console.log('Message sent successfully via simpleTalk')
  } catch (error) {
    console.error('Failed to send message via simpleTalk:', error)
  }
  isSending.value = false
}
/** ------ */

// 监听频道切换，清除缓存的成员列表
watch(
  () => simpleTalk.activeChannelId,
  () => {
    if (mentionSearchTimer) {
      clearTimeout(mentionSearchTimer)
      mentionSearchTimer = null
    }
    latestMentionReqId += 1
    mentionLoading.value = false
    defaultMembersCache.value = []
    showMentionDropdown.value = false
    currentMentions.value = []
  }
)

onBeforeUnmount(() => {
  if (mentionSearchTimer) {
    clearTimeout(mentionSearchTimer)
    mentionSearchTimer = null
  }
  latestMentionReqId += 1
})
</script>

<style lang="scss" scoped>
.quote {
  border-radius: var(--rounded-lg) var(--rounded-lg) 0 0;
  background: rgba(var(--themeTextColorRgb), 0.2);
  padding: 5px var(--padding-normal);

  .user {
    margin-left: 5px;
    cursor: pointer;
    color: #fc457b;
    font-weight: bold;
  }

  .close {
    width: 20px;
    height: 20px;
    cursor: pointer;
    opacity: 0.9;
    &:hover {
      opacity: 1;
    }
  }
}

// 覆盖 FeeSelector 组件内的文字大小
:deep(.fee-selector) {
  gap: 2px !important;
  padding: 2px 4px !important;
  min-width: 40px !important;

  .chain-icon {
    width: 24px !important;
    height: 24px !important;
  }

  .fee-info {
    min-width: 28px !important;
  }

  .fee-value {
    font-size: 9px !important;
  }
  .fee-unit {
    font-size: 7px !important;
  }
}
</style>
