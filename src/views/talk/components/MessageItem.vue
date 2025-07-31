<template>
  <div
    class="relative py-1 px-4 lg:hover:bg-gray-200 dark:lg:hover:bg-gray-950 transition-all duration-150  group"
    :class="{ replying: reply.val?.timestamp === message.timestamp }"
  >
    <!-- 消息菜单 -->
    <template v-if="!isShare">
      <MessageMenu
        :message="props.message"
        :parsed="
          parseTextMessage(
            decryptedMessage(message.content, message.encryption, message.protocol, message.isMock)
          )
        "
        v-model:translateStatus="translateStatus"
        v-model:translatedContent="translatedContent"
        v-bind="$attrs"
        v-if="isText"
      />
      <MessageMenu :message="props.message" v-bind="$attrs" v-else />
    </template>

    <!-- quote -->
    <MessageItemQuote
      v-if="message.replyInfo"
      :quote="{ avatarImage: message.replyInfo.userInfo.avatarImage,
    metaName: message.replyInfo.userInfo.metaName,
    metaId: message.replyInfo.metaId,
    nickName: message.replyInfo.nickName,
    protocol: message.replyInfo.protocol,
    content: message.replyInfo.content,
    encryption: message.replyInfo.encryption,
    timestamp: message.replyInfo!.timestamp}"
      v-bind="$attrs"
    />

    <!-- 消息主体 -->
    <div class="flex">
      <UserAvatar
        :image="props.message.avatarImage"
        :name="props.message.nickName"
        :meta-id="props.message.metaId"
        :meta-name="props.message?.userInfo?.metaName"
        class="w-10 h-10 lg:w-13.5 lg:h-13.5 shrink-0 select-none cursor-pointer"
      />
      <div class="ml-2 lg:ml-4 grow pr-8 lg:pr-12">
        <div class="flex items-baseline space-x-2">
          <!--message?.userInfo?.metaName-->
          <UserName
            :name="message.nickName"
            :meta-name="''"
            :text-class="'text-sm font-medium dark:text-gray-100 max-w-[120PX]'"
          />
          <div class="text-dark-300 dark:text-gray-400 text-xs shrink-0 whitespace-nowrap">
            {{ formatTimestamp(message.timestamp, i18n) }}
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

        <div class="w-full" v-else-if="isNftEmoji">
          <Image
            :src="
              decryptedMessage(
                message.content,
                message.encryption,
                message.protocol,
                message.isMock
              )
            "
            customClass="max-w-[80%] md:max-w-[50%] lg:max-w-[320px] py-0.5 object-scale-down"
          />

          <NftLabel class="w-8 mt-1" />
        </div>

        <div class="w-full py-0.5 flex items-center" v-else-if="isImage">
          <div
            class="w-fit max-w-[90%] md:max-w-[50%] lg:max-w-[235PX] max-h-[600PX] overflow-y-hidden rounded bg-transparent cursor-pointer transition-all duration-200"
            :class="[message.error && 'opacity-50']"
            @click="previewImage(message.content)"
          >
            <Image
              :src="
                decryptedMessage(
                  message.content,
                  message.encryption,
                  message.protocol,
                  message.isMock
                )
              "
              customClass="rounded-xl py-0.5 object-scale-down"
            />
          </div>
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

        <div class="w-full py-0.5" v-else-if="isGiveawayRedPacket">
          <div
            class="max-w-full sm:max-w-[300PX] shadow rounded-xl cursor-pointer origin-center hover:shadow-md transition-all duration-200 bg-white dark:bg-gray-700 group"
            :class="[hasRedPacketReceived ? 'opacity-50' : 'hover:animate-wiggle-subtle']"
            @click="handleOpenRedPacket"
          >
            <div
              class="rounded-xl p-4 flex space-x-2 bg-gradient-to-br from-[#FFE8D2] via-[#FFF1B9] to-[#FEFFE3] items-center"
              :class="[
                hasRedPacketReceived ? 'origin-top -skew-x-12 dark:-skew-x-6 shadow-md' : 'shadow',
              ]"
            >
              <img :src="giftImage" class="h-12 w-12" loading="lazy" />
              <div class="">
                <div class="text-dark-800 text-base font-medium">
                  {{ $t('Talk.Channel.come_get_red_envelope') }}
                </div>
                <div class="text-dark-300 text-sm mt-1 truncate max-w-[150PX] lg:max-w-[180PX]">
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

        <div class="my-1.5 max-w-full flex" v-else>
          <div
            class="text-sm text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl rounded-tl transition-all duration-200"
            :class="[
              isMyMessage ? 'bg-primary dark:text-gray-800' : 'bg-white dark:bg-gray-700',
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
            class="text-sm text-dark-800 dark:text-gray-100 font-normal break-all p-3 rounded-xl rounded-tl transition-all duration-200"
            :class="[
              isMyMessage ? 'bg-primary dark:text-gray-800' : 'bg-white dark:bg-gray-700',
              message.error && 'bg-red-200 dark:bg-red-700 opacity-50',
            ]"
            v-else
            v-html="
              parseTextMessage(
                decryptedMessage(
                  message.content,
                  message.encryption,
                  message.protocol,
                  message.isMock
                )
              )
            "
          ></div>
          <button v-if="message.error" class="ml-3" :title="resendTitle" @click="tryResend">
            <Icon
              name="arrow_path"
              class="w-4 h-4 text-dark-400 dark:text-gray-200 hover:animate-spin-once"
            />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import NftLabel from './NftLabel.vue'
import MessageMenu from './MessageMenu.vue'
import { computed, inject, ref, Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatTimestamp, decryptedMessage } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useTalkStore } from '@/stores/talk'
import giftImage from '@/assets/images/gift.svg?url'
import { useLayoutStore } from '@/stores/layout'
import { useModalsStore } from '@/stores/modals'
import { useJobsStore } from '@/stores/jobs'
import { getOneRedPacket } from '@/api/talk'
import { useImagePreview } from '@/stores/imagePreview'
import MessageItemQuote from './MessageItemQuote.vue'

const i18n = useI18n()

const modals = useModalsStore()
const userStore = useUserStore()
const talk = useTalkStore()
const layout = useLayoutStore()
const jobs = useJobsStore()
const reply: any = inject('Reply')

const imagePreview = useImagePreview()

interface Props {
  message: ChatMessageItem
  isShare?: boolean
}
const props = withDefaults(defineProps<Props>(), {})

const emit = defineEmits<{}>()

/** 翻译 */
type TranslateStatus = 'hidden' | 'showing' | 'processing'
const translateStatus: Ref<TranslateStatus> = ref('hidden')
const translatedContent = ref('')
/** 翻译 end */

const previewImage = (image: string) => {
  imagePreview.images = [image]
  imagePreview.index = 0
  imagePreview.visibale = true
}

const resendTitle = computed(() => {
  return i18n.t('Talk.Messages.resend')
})

const parseTextMessage = (text: string) => {
  if (typeof text == 'undefined') {
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
      return `<a href=${url} target="_blank" style="text-decoration: underline;cursor: pointer;" class="url"> ${url} </a>`
    }
    return `<a onClick="window.open('http://${text}','_blank')" style="text-decoration: underline;cursor: pointer;" target="_blank">${text}</a>`
  })
  text = text.replace(/\\n/g, '\n')
  return text.replace(/\n/g, '<br />')
}

const redPacketReceiveInfo = computed(() => {
  const content: string = props.message.content

  if (props.message.metaId === props.message.data?.redEnvelopeMetaId) {
    return i18n.t('Talk.Channel.receive_own_red_envelope')
  }

  const [_receiver, sender] = content.split('|-|')

  return i18n.t('Talk.Channel.receive_red_envelope', {
    sender,
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
  return userStore.user?.metaId && userStore.user.metaId === props.message.metaId
})

const handleOpenRedPacket = async () => {
  // 如果用户已经领取过红包，则显示红包领取信息
  const params: any = {
    channelId: talk.activeChannelId,
    redPacketId: props.message?.txId,
  }
  const redPacketType = props.message?.data?.requireType
  console.log({ redPacketType })
  if (redPacketType === '2') {
    params.address = talk.selfAddress
  } else if (redPacketType === '2001' || redPacketType === '2002') {
    params.address = userStore.user?.evmAddress
  }
  const redPacketInfo = await getOneRedPacket(params)
  const hasReceived = redPacketInfo.payList.some((item: any) => item.metaid === talk.selfMetaId)

  if (hasReceived) {
    modals.redPacketResult = redPacketInfo
    layout.isShowRedPacketResultModal = true

    // 保存已领取红包的id
    talk.addReceivedRedPacketId(props.message?.txId)

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
  return talk.receivedRedPacketIds.includes(props.message?.txId)
})

const tryResend = async () => {
  props.message.error = false
  await jobs.resend(props.message.timestamp)
}

const isGroupJoinAction = computed(() => props.message.protocol === 'SimpleGroupJoin')
const isGroupLeaveAction = computed(() => props.message.protocol === 'SimpleGroupLeave')
const isNftEmoji = computed(() => props.message.protocol === 'SimpleEmojiGroupChat')
const isImage = computed(() => props.message.protocol === 'SimpleFileGroupChat')
const isGiveawayRedPacket = computed(() => props.message.protocol === 'SimpleRedEnvelope')
const isReceiveRedPacket = computed(() => props.message.protocol === 'OpenRedEnvelope')
const isText = computed(() => props.message.protocol === 'simpleGroupChat')
</script>

<style lang="scss" scoped src="./MessageItem.scss"></style>
