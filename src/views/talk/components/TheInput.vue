<template>
  <div
    class="bg-white dark:bg-gray-700 rounded-lg"
    v-if="
      talk.activeChannelType === ChannelType.Session ||
        talk.activeChannel?.chatSettingType === 0 ||
        talk.isAdmin()
    "
  >
    <!-- 回复/引用 -->
    <div class="quote flex flex-align-center rounded-lg" v-if="quote">
      <div class="flex1 flex flex-align-center">
        {{ $t('Talk.Quote.tips') }}
        <a @click="emit('toQuote')" class="user"
          ><UserName
            :name="quote.userInfo ? quote.userInfo.name : quote.fromUserInfo.name"
            :meta-name="''"
            :no-tag="true"
        /></a>
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

    <div :class="[rows > 1 ? 'items-start' : 'items-center', 'flex h-fit']">
      <!-- <Popover class="relative flex items-center" v-slot="{ open }">
        <PopoverButton
          as="button"
          class="w-14 flex items-center py-2 justify-center text-dark-800 dark:text-gray-100 outline-0"
        >
          <div
            class="bg-primary w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
          >
            <Icon
              name="plus_2"
              :class="[open && 'rotate-45', 'w-3 h-3 text-dark-800 transition duration-200']"
            />
          </div>
        </PopoverButton>

        <transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100"
          leave-to-class="opacity-0"
        >
          <PopoverPanel
            class="absolute z-10 transform top-[-16PX] left-0 -translate-y-full"
            v-slot="{ close }"
          >
            <div
              class="bg-white dark:bg-gray-700 dark:text-gray-100 py-2 px-4 rounded-xl flex flex-col w-max justify-stretch divide-dark-100 dark:divide-gray-800 divide-y divide-solid"
            >
              <button
                class="flex py-4 outline-none hover:bg-gray-100 dark:hover:bg-gray-800 px-4 -mx-4 space-x-3 items-center"
                type="button"
                v-for="command in moreCommands()"
                :key="command.titleKey"
                @click="command.action(close)"
              >
                <Icon
                  :name="command.icon"
                  class="w-6 h-6 text-dark-800 rounded-full bg-primary box-content p-1.5 shrink-0"
                />

                <div class="flex flex-col justify-start items-start">
                  <h4 class="shrink-0 text-sm">{{ $t(command.titleKey) }}</h4>
                  <p class="text-xs text-dark-300 dark:text-gray-400">
                    {{ $t(command.descriptionKey) }}
                  </p>
                </div>
              </button>
            </div>
          </PopoverPanel>
        </transition>
      </Popover> -->

      <!-- <button
        class="w-14 flex items-center py-2 justify-center text-dark-800 dark:text-gray-100"
        type="button"
        @click="showMoreCommandsBox = true"
      >
        <div
          class="bg-primary w-8 h-8 flex items-center justify-center rounded-full cursor-pointer"
        >
          <Icon name="plus_2" class="w-3 h-3 text-dark-800 dark:text-gray-100" />
        </div>
      </button> -->

      <div class="self-stretch lg:ml-2 py-2 pl-3 flex items-center grow">
        <textarea
          class=" w-full !outline-none placeholder:text-dark-250 placeholder:dark:text-gray-400 placeholder:text-sm placeholder:truncate text-dark-800 dark:text-gray-100 text-base caret-gray-600 dark:caret-gray-400 resize-none !h-fit text-base rounded-md transition-all duration-150 delay-100"
          :class="rows > 1 ? 'bg-gray-100 dark:bg-gray-800 p-1 -m-1' : 'bg-inherit'"
          :rows="rows"
          ref="theTextBox"
          :placeholder="
            $t('Talk.Channel.message_to', {
              channel:
                talk?.activeChannelSymbol +
                (talk.activeChannel?.name || activeChannel?.userInfo?.name || ''),
            })
          "
          v-model="chatInput"
          @keydown="handleKeyDown"
          @compositionstart="onCompositionStart"
          @compositionend="onCompositionEnd"
        />
      </div>

      <Teleport to="body">
        <input
          type="file"
          id="imageUploader"
          ref="imageUploader"
          accept="image/*"
          @change="handleImageChange"
          class="hidden"
        />
      </Teleport>

      <!-- 右侧按钮群 -->
      <div class="flex h-full py-1 items-center shrink-0">
        <div :class="[hasInput ? 'hidden lg:flex' : 'flex', 'items-center px-1 mr-2']">
          <div
            class="p-2 w-9 h-9 transition-all lg:hover:animate-wiggle cursor-pointer"
            v-if="talk.activeChannelType === ChannelType.Group && !quote"
            @click="openRedPackDialog"
          >
            <Icon name="red_envelope" class="w-full h-full text-dark-800 dark:text-gray-100" />
          </div>

          <Popover class="relative flex items-center">
            <PopoverButton as="div">
              <div class="p-2 w-9 h-9 transition-all lg:hover:animate-wiggle cursor-pointer">
                <Icon name="photo_3" class="w-full h-full text-dark-800 dark:text-gray-100" />
              </div>
            </PopoverButton>

            <transition
              enter-active-class="transition duration-200 ease-out"
              enter-from-class="opacity-0"
              enter-to-class="opacity-100"
              leave-active-class="transition duration-150 ease-in"
              leave-from-class="opacity-100"
              leave-to-class="opacity-0"
            >
              <PopoverPanel
                class="absolute z-10 transform top-[-16PX] right-0 -translate-y-full"
                v-slot="{ close }"
              >
                <div
                  class="bg-white dark:bg-gray-700 p-2 rounded-xl shadow-lg w-60 divide-y divide-dark-200 dark:divide-gray-600"
                >
                  <div
                    class="mx-2 py-4 flex items-center space-x-2 text-dark-800 dark:text-gray-100 rounded-sm lg:cursor-pointer lg:hover:underline cursor-pointer"
                    @click="openImageUploader(close)"
                  >
                    <div class="cursor-pointer">
                      <Icon name="photo" class="w-5 h-5 rounded-full bg-primary p-2 box-content" />
                    </div>
                    <div class="">
                      {{ $t('Talk.Channel.upload_image') }}
                    </div>
                  </div>
                  <!-- <div
                    class="mx-2 py-4 flex items-center space-x-2 text-dark-800 dark:text-gray-100 rounded-sm lg:cursor-pointer lg:hover:underline cursor-pointer"
                  >
                    <div class=" ">
                      <Icon name="link" class="w-5 h-5 rounded-full bg-primary p-2 box-content" />
                    </div>
                    <div class="">
                      {{ $t('Talk.Channel.use_onchain_image') }}
                    </div>
                  </div> -->
                </div>
              </PopoverPanel>
            </transition>
          </Popover>

          <ElPopover placement="bottom-start" width="300px" trigger="click">
            <StickerVue @input="params => (chatInput = chatInput + params.value)" />
            <template #reference>
              <div class="p-1 w-9 h-9 transition-all lg:hover:animate-wiggle cursor-pointer">
                <Icon
                  name="face_smile"
                  class="w-full h-full text-dark-800 dark:text-gray-100 transition-all ease-in-out duration-300"
                  :class="{ 'text-primary -rotate-6 scale-110': showStickersBox }"
                />
              </div>
            </template>
          </ElPopover>
        </div>

        <!-- 发送按钮 -->
        <transition
          enter-active-class="transition duration-150 ease-out"
          enter-from-class="opacity-0"
          enter-to-class="opacity-100"
        >
          <div v-if="hasInput" :class="['lg:hidden transition-all ease-in-out duration-500']">
            <div class="py-2 px-3" @click="trySendText">
              <!-- <div
              class="transition-all ease-in-out duration-500"
              :class="[
                hasInput ? 'text-primary scale-110 -rotate-6' : 'text-dark-250 dark:text-gray-400',
              ]"
            >
              <Icon name="send" class="w-5 h-5" />
            </div> -->
              <div class="text-primary scale-110 -rotate-6">
                <Icon name="send" class="w-5 h-5" />
              </div>
            </div>
          </div>
        </transition>
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
                class="w-full flex text-center items-center px-4 py-4 justify-center hover:bg-gray-50 dark:hover:bg-gray-700  rounded-t-xl transition-colors duration-200 active:scale-95"
              >
                <h4 class="text-lg  font-medium text-gray-900 dark:text-gray-100">
                  BTC {{ $t('Talk.Modals.red_packet') }}
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
import { computed, ref, toRaw, Ref } from 'vue'
import { Popover, PopoverButton, PopoverPanel, TransitionRoot } from '@headlessui/vue'
import { ElMessage, ElPopover, ElMessageBox } from 'element-plus'

import { sendMessage, validateTextMessage, isImage, isFileTooLarge } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useConnectionStore } from '@/stores/connection'
import { FileToAttachmentItem, compressImage, atobToHex } from '@/utils/util'
import { useCredentialsStore } from '@/stores/credentials'
import { encrypt, ecdhEncrypt, ecdhDecrypt, ecdhEncryptForPrivateImg } from '@/utils/crypto'
import { useTalkStore } from '@/stores/talk'
import { ChannelType, MessageType, ChatChain } from '@/enum'
import { useLayoutStore } from '@/stores/layout'

import TalkImagePreview from './ImagePreview.vue'
import StickerVue from '@/components/Sticker/Sticker.vue'
import Decimal from 'decimal.js-light'
import { router } from '@/router'
import { useChainStore } from '@/stores/chain'
import { useI18n } from 'vue-i18n'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { useEcdhsStore } from '@/stores/ecdh'
interface Props {
  quote?: any
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:quote', 'toQuote'])

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
const hasInput = computed(() => chatInput.value.length > 0)

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
const talk = useTalkStore()
const imageUploader = ref<HTMLInputElement | null>(null)
const imageFile = ref<File | null>(null)
const showImagePreview = ref(false)
const useCompression = ref(true)

const hasImage = computed(() => imageFile.value !== null)

const activeChannel = computed(() => {
  return talk.activeChannel
})

console.log('talk.activeChannel22222', activeChannel)

const openImageUploader = (close: Function) => {
  imageUploader.value?.click()
  close()
}

const openRedPackDialog = () => {
  showRedPacketActionSheet.value = true
}

const selectRedPacketType = (type: 'btc' | 'mvc') => {
  showRedPacketActionSheet.value = false
  // 设置红包类型，但不改变gas链选择
  layout.selectedRedPacketType = type
  layout.isShowRedPacketModal = true
}

const closeActionSheet = () => {
  showRedPacketActionSheet.value = false
}

const handleImageChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    if (!isImage(file)) {
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
      talk.$patch({
        error: {
          type: 'image_too_large',
          message: 'image_too_large',
          timestamp: Date.now(),
        },
      })
      return
    }

    imageFile.value = file
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
  let image = imageFile.value as NonNullable<typeof imageFile.value>
  // 压缩图片
  if (useCompression.value) {
    const compressedFile = await compressImage(imageFile.value!)
    image = compressedFile
  }
  console.log('size', image.size / 1024, 'KB')

  const hexedFiles = await FileToAttachmentItem(image)

  const attachments = [hexedFiles]

  if (talk.activeChannelType == ChannelType.Session) {
    if (!talk.activeChannel?.publicKeyStr) {
      return ElMessage.error(`${i18n.t('get_ecdh_pubey_error')}`)
    }
    let ecdh = ecdhsStore.getEcdh(talk.activeChannel?.publicKeyStr)
    if (!ecdh) {
      ecdh = await getEcdhPublickey(talk.activeChannel.publicKeyStr)
      ecdhsStore.insert(ecdh, ecdh?.externalPubKey)
    }

    console.log('contentcontentcontent2222222', attachments[0].data)

    const sharedSecret = ecdh?.sharedSecret //atobToHex(credential!.signature)
    attachments[0].data = ecdhEncryptForPrivateImg(attachments[0].data, sharedSecret)
  }

  // clone，用于填充mock信息
  const originalFileUrl = imagePreviewUrl.value
  deleteImage()

  const messageDto = {
    type: MessageType.Image,
    channelId: talk.activeChannel.id,
    groupId: talk.activeChannelType == ChannelType.Session ? '' : talk?.activeCommunity?.id || '',
    userName: userStore.last?.name!,
    attachments,
    content: '',
    originalFileUrl,
    channelType: talk.activeChannelType as ChannelType,
    reply: props.quote,
  }
  console.log('props.quote', props.quote)

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

const handleKeyDown = (e: KeyboardEvent) => {
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
  if (!validateTextMessage(chatInput.value)) return

  // 私聊会话和頻道群聊的加密方式不同
  let content = ''
  if (talk.activeChannel?.roomLimitAmount > 0) {
    checkSpaceBalance()
      .then(() => {
        spaceNotEnoughFlag.value = false
      })
      .catch(() => {
        isSending.value = false
        spaceNotEnoughFlag.value = true
      })
  }

  if (spaceNotEnoughFlag.value) {
    return
  }
  console.log('activeChannelType', talk.activeChannelType)

  // if (talk.activeChannelType === 'group') {

  // }
  if (talk.activeChannel?.groupId) {
    content = encrypt(chatInput.value, talk.activeChannel.id.substring(0, 16))
  } else {
    // const privateKey = toRaw(userStore?.wallet)!.getPathPrivateKey('0/0')!
    //
    // const privateKeyStr = privateKey.toHex()
    //const credential=credentialsStore.getByAddress(connectionStore.last.address)
    if (!talk.activeChannel?.publicKeyStr) {
      return ElMessage.error(`${i18n.t('get_ecdh_pubey_error')}`)
    }
    let ecdh = ecdhsStore.getEcdh(talk.activeChannel?.publicKeyStr)

    if (!ecdh) {
      ecdh = await getEcdhPublickey(talk.activeChannel.publicKeyStr)
      ecdhsStore.insert(ecdh, ecdh?.externalPubKey)
    }
    //const

    const sharedSecret = ecdh?.sharedSecret //atobToHex(credential!.signature)
    // credentialsStore.update(sigStr)
    //const otherPublicKeyStr =talk.activeChannel.publicKeyStr

    console.log(chatInput.value, sharedSecret)

    content = ecdhEncrypt(chatInput.value, sharedSecret)
    
    console.log('ecdhDecrypt', ecdhDecrypt(content, sharedSecret))
      
    
  }

  chatInput.value = ''
  console.log('talk.activeChannel.id', talk.activeChannel.id)

  const messageDto = {
    content,
    type: MessageType.Text,
    channelId: talk.activeChannel.id,
    userName: userStore.last?.name || '',
    channelType: talk.activeChannelType as ChannelType,
    reply: props.quote,
  }

  console.log('props.quote', props.quote)

  emit('update:quote', undefined)
  await sendMessage(messageDto)
  isSending.value = false
}
/** ------ */
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
</style>
