<template>
  <div
    class="message-menu absolute bg-white dark:bg-gray-700 right-0 -top-[5PX] -translate-x-4 px-1.5 py-0.5 rounded-xl shadow hidden lg:group-hover:flex hover:shadow-md transition-all duration-200 z-10"
    :class="{ '!flex': showMenu }"
    v-if="actions.length > 0"
  >
    <button
      v-for="action in actions"
      :key="action.name"
      class="p-1.5 flex items-center"
      @click="handleButtonClick($event, action)"
      @touchstart.stop
      @touchend.stop
    >
      <Icon
        :name="action.icon"
        class="w-5 h-5 text-dark-800 dark:text-gray-100 hover:text-primary dark:hover:text-primary transition-all duration-200"
      />
      <img class="w-3 h-3" v-if="action?.suffixIcon" :src="action.suffixIcon" alt="" />
    </button>
  </div>
</template>

<script lang="ts" setup>
import { Translate } from '@/api/core'
import { EnvMode, NodeName, ChatChain } from '@/enum'
import { useTalkStore } from '@/stores/talk'
import copy from 'copy-to-clipboard'
import { decryptedMessage } from '@/utils/talk'
import { computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { containsString, fetchTranlateResult } from '@/utils/util'
import { ShareChatMessageData } from '@/@types/common'
import { isMobile } from '@/stores/root'
import { ElMessage } from 'element-plus'
import BTC from '@/assets/images/btc.png'
import MVC from '@/assets/images/icon_mvc.png'
const i18n = useI18n()

const props = defineProps([
  'message',
  'parsed',
  'translateStatus',
  'translatedContent',
  'messageId',
])

const emit = defineEmits<{
  (e: 'update:translateStatus', status: string): void
  (e: 'update:translatedContent', content: string): void
  (e: 'quote', message: any): void
  (e: 'toBuzz', data: ShareChatMessageData): void
}>()

const talk = useTalkStore()

// 使用全局状态管理菜单显示
const showMenu = computed(() => {
  return isMobile ? talk.activeMessageMenuId === props.messageId : false
})

const isText = computed(
  () =>
    containsString(props.message.protocol, NodeName.ShowMsg) ||
    containsString(props.message.protocol, NodeName.SimpleGroupChat)
)

// 在组件挂载时添加点击外部隐藏菜单的监听器
onMounted(() => {
  // 移除全局点击监听器，改为在MessageItem中处理
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
      action: async () => {
        // 复制该消息内容到剪贴板
        const content = props.parsed

        try {
          copy(content)
          ElMessage.success(i18n.t('Copy_success'))
        } catch (error) {
          console.error('复制失败:', error)
          // ElMessage.error('复制失败')
        }
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
              chain:message.chain || 'mvc',
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
                chain:message.chain || 'mvc',
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
                chain:message.chain || 'mvc',
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
        suffixIcon: props.message.chain == ChatChain.btc ? BTC : MVC,
        action: () => {
          // 跳转到该消息对应的交易
          if (props.message.chain == ChatChain.btc) {
            window.open(`https://mempool.space/tx/${props.message.txId}`, '_blank')
          } else {
            window.open(`https://mvcscan.com/tx/${props.message.txId}`, '_blank')
          }
        },
      })
    } else {
      if (props.message.txId.length === 64) {
        actions.push({
          name: 'Talk.MessageMenu.tx',
          icon: 'tx',
          suffixIcon: props.message.chain == ChatChain.btc ? BTC : MVC,
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

// 处理按钮点击
const handleButtonClick = (event: MouseEvent, action: any) => {
  // 阻止事件冒泡
  event.preventDefault()
  event.stopPropagation()

  console.log('执行菜单动作:', action.name)

  // 立即执行动作
  try {
    action.action()
  } catch (error) {
    console.error('执行菜单动作失败:', error)
  }

  // 立即关闭菜单
  talk.clearActiveMessageMenu()
}

// 处理动作点击（保留，但不再使用）
const handleAction = (action: any) => {
  console.log('执行菜单动作:', action.name)

  // 立即执行动作
  try {
    action.action()
  } catch (error) {
    console.error('执行菜单动作失败:', error)
  }

  // 立即关闭菜单
  talk.clearActiveMessageMenu()
}

// 移除事件监听器
onUnmounted(() => {
  // 不再需要移除全局点击监听器
})
</script>
