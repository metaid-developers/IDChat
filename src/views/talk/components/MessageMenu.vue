<template>
  <div
    class="absolute bg-white dark:bg-gray-700 right-0 -top-[5PX] -translate-x-4 px-1.5 py-0.5 rounded-xl shadow hidden lg:group-hover:flex hover:shadow-md transition-all duration-200 z-10"
    :class="{ '!flex': showMenu }"
    v-if="actions.length > 0"
    @click.stop
  >
    <button
      v-for="action in actions"
      :key="action.name"
      class="p-1.5"
      @click="handleAction(action)"
    >
      <Icon
        :name="action.icon"
        class="w-5 h-5 text-dark-800 dark:text-gray-100 hover:text-primary dark:hover:text-primary transition-all duration-200"
      />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { Translate } from '@/api/core'
import { EnvMode, NodeName } from '@/enum'
import { useTalkStore } from '@/stores/talk'
import { decryptedMessage } from '@/utils/talk'
import { computed, ref, onMounted, onUnmounted, inject } from 'vue'
import { useI18n } from 'vue-i18n'
import { containsString, fetchTranlateResult } from '@/utils/util'
import { ShareChatMessageData } from '@/@types/common'
import { isMobile } from '@/stores/root'
import { ElMessage } from 'element-plus'

const i18n = useI18n()

const props = defineProps(['message', 'parsed', 'translateStatus', 'translatedContent'])

const emit = defineEmits<{
  (e: 'update:translateStatus', status: string): void
  (e: 'update:translatedContent', content: string): void
  (e: 'quote', message: any): void
  (e: 'toBuzz', data: ShareChatMessageData): void
}>()

const isText = computed(
  () =>
    containsString(props.message.protocol, NodeName.ShowMsg) ||
    containsString(props.message.protocol, NodeName.SimpleGroupChat)
)
const talk = useTalkStore()

const showMenu = ref(false)
const longPressTimer = ref<number | null>(null)
const LONG_PRESS_DURATION = 500 // 长按持续时间（毫秒）

// 从父组件获取设置长按处理函数的接口
const setLongPressHandlers = inject('setLongPressHandlers') as (handlers: {
  start: () => void
  end: () => void
}) => void

// 在组件挂载时注册长按处理函数
onMounted(() => {
  if (isMobile && setLongPressHandlers) {
    setLongPressHandlers({
      start: handleLongPressStart,
      end: handleLongPressEnd,
    })
  }

  if (isMobile) {
    document.addEventListener('click', handleClickOutside)
  }
})

const actions = computed(() => {
  const actions = []

  // actions.push({
  //   name: 'Talk.MessageMenu.love',
  //   icon: 'heart',
  //   action: () => {
  //     console.log('edit')
  //   },
  // })
  // actions.push({
  //   name: 'Talk.MessageMenu.share',
  //   icon: 'share_arrow',
  //   action: () => {
  //     console.log('edit')
  //   },
  // })
  if (isText.value) {
    actions.push({
      name: 'Talk.MessageMenu.translate',
      icon: 'translate',
      action: async () => {
        // 翻译该消息内容
        if (props.translateStatus === 'hidden') {
          if (props.translatedContent === '') {
            emit('update:translateStatus', 'processing')
            // 如果未请求过翻译，请求翻译
            const content = props.parsed
            const params = {
              sourceText: content,
              from: 'zh' as const,
              to: 'en' as const,
            }

            const translateRes = await fetchTranlateResult(params)

            // const translateRes = await Translate(params)

            if (translateRes?.trans_result.length) {
              emit('update:translatedContent', translateRes.trans_result[0].dst)
            }
            emit('update:translateStatus', 'showing')
          } else {
            emit('update:translateStatus', 'showing')
          }
        } else if (props.translateStatus === 'showing') {
          emit('update:translateStatus', 'hidden')
        }
      },
    })

    actions.push({
      name: 'Talk.MessageMenu.copy',
      icon: 'copy',
      action: () => {
        // 复制该消息内容到剪贴板
        const content = props.parsed
        navigator.clipboard.writeText(content)
        ElMessage.success(i18n.t('Copy_success'))
      },
    })
  }

  const ShareProtocols = [
    NodeName.SimpleFileGroupChat,
    NodeName.SimpleGroupChat,
    NodeName.ShowMsg,
    NodeName.SimpleFileMsg,
  ]

  const hasShareProtocols = ShareProtocols.findIndex(item => {
    return containsString(props.message.protocol, item)
  })

  // publish buzz
  if (hasShareProtocols > -1) {
    actions.push({
      name: 'Talk.MessageMenu.toBuzz',
      icon: 'share_arrow',
      action: () => {
        let data: ShareChatMessageData
        const message = props.message

        const decryptedMessageContent = decryptedMessage(
          message.content,
          message.encryption,
          message.protocol
        )

        if (containsString(props.message.protocol, NodeName.ShowMsg)) {
          data = {
            communityId: '', // talk.activeCommunityId,
            groupId: talk.activeChannelId,
            userMetaId: message.userInfo.metaid,
            comment: '',
            message: {
              content: decryptedMessageContent,
              contentType: message.contentType,
              protocol: message.protocol,
              txId: message.txId,
              pinId: message.pinId,
              timestamp: message.timestamp,
              metanetId: message.metanetId,
            },
          }
        } else if (containsString(props.message.protocol, NodeName.SimpleFileGroupChat)) {
          data = {
            communityId: '', // talk.activeCommunityId,
            groupId: talk.activeChannelId,
            userMetaId: message.userInfo.metaid,
            comment: '',
            message: {
              content: decryptedMessageContent,
              contentType: message.contentType,
              protocol: message.protocol,
              txId: message.txId,
              pinId: message.pinId,
              timestamp: message.timestamp,
              metanetId: message.metanetId,
            },
          }
        } else {
          data = {
            communityId: '', // talk.activeCommunityId,
            groupId: talk.activeChannelId,
            userMetaId: message.userInfo.metaid,
            comment: '',
            message: {
              content: decryptedMessageContent,
              contentType: message.contentType,
              protocol: message.protocol,
              txId: message.txId,
              pinId: message.pinId,
              timestamp: message.timestamp,
              metanetId: message.metanetId,
            },
          }
        }
        // 复制该消息内容到剪贴板
        emit('toBuzz', data)
      },
    })
  }

  // 回復
  const quoteProtocols = [
    NodeName.SimpleFileGroupChat,
    NodeName.SimpleGroupChat,
    NodeName.ShowMsg,
    NodeName.SimpleFileMsg,
  ]

  const hasQuoteProtocols = quoteProtocols.findIndex(item => {
    return containsString(props.message.protocol, item)
  })
  // quoteProtocols.includes(props.message.protocol)
  if (hasQuoteProtocols > -1) {
    actions.push({
      name: 'Talk.MessageMenu.quote',
      icon: 'quote',
      action: () => {
        emit('quote', props.message)
      },
    })
  }

  if (props.message.txId) {
    if (!containsString(props.message?.protocol, NodeName.SimpleGroupOpenLuckybag)) {
      actions.push({
        name: 'Talk.MessageMenu.tx',
        icon: 'tx',
        action: () => {
          // 跳转到该消息对应的交易
          window.open(`https://mvcscan.com/tx/${props.message.txId}`, '_blank')
        },
      })
    } else {
      if (props.message.txId.length === 64) {
        actions.push({
          name: 'Talk.MessageMenu.tx',
          icon: 'tx',
          action: () => {
            // 跳转到该消息对应的交易
            window.open(`https://mvcscan.com/tx/${props.message.txId}`, '_blank')
          },
        })
      }
    }
  }

  return actions
})

// 处理动作点击
const handleAction = (action: any) => {
  action.action()
  showMenu.value = false // 点击后隐藏菜单
}

// 长按开始
const handleLongPressStart = () => {
  if (!isMobile) return

  longPressTimer.value = window.setTimeout(() => {
    showMenu.value = true
  }, LONG_PRESS_DURATION)
}

// 长按结束或取消
const handleLongPressEnd = () => {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

// 点击其他地方隐藏菜单
const handleClickOutside = (event: MouseEvent) => {
  if (showMenu.value) {
    showMenu.value = false
  }
}

// 移除事件监听器
onUnmounted(() => {
  if (isMobile) {
    document.removeEventListener('click', handleClickOutside)
    handleLongPressEnd()
  }
})
</script>
