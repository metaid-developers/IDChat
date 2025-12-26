<template>
  <div class="card-msg-wrapper">
    <!-- 调试信息（开发时可查看控制台） -->
    {{ logCardData }}
    <div
      class="max-w-[320px] min-w-[280px] lg:max-w-[420px] shadow rounded-xl transition-all duration-200 bg-white dark:bg-gray-700 overflow-hidden"
    >
      <!-- 卡片头部：图标和标题 -->
      <div class="p-4 pb-3 border-b border-gray-200 dark:border-gray-600">
        <div class="flex items-center gap-3">
          <!-- Icon -->
          <div class="w-10 h-10 shrink-0">
            <ChatImage
              v-if="cardContent.icon"
              :src="cardContent.icon"
              customClass="w-10 h-10 rounded-lg object-cover"
            />
            <div v-else class="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Icon name="document" class="w-5 h-5 text-primary" />
            </div>
          </div>

          <!-- 标题 -->
          <div class="flex-1 min-w-0">
            <div class="text-dark-800 dark:text-gray-100 font-medium text-base truncate">
              {{ cardContent.title || '卡片消息' }}
            </div>
          </div>
        </div>
      </div>

      <!-- 预览内容 -->
      <div class="px-4 py-3">
        <div class="text-dark-600 dark:text-gray-300 text-sm line-clamp-3 whitespace-pre-wrap">
          {{ cardContent.preview }}
        </div>
        <div v-if="cardContent.previewType" class="text-dark-400 dark:text-gray-400 text-xs mt-2">
          {{ formatPreviewType(cardContent.previewType) }}
        </div>
      </div>

      <!-- 操作按钮区域 -->
      <div
        v-if="cardContent.signButton && cardContent.signButton.length > 0"
        class="p-4 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-2"
      >
        <button
          v-for="(btn, index) in cardContent.signButton"
          :key="index"
          :disabled="!canInteract || isLoading"
          :class="[
            'w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all duration-200',
            canInteract && !isLoading
              ? 'bg-primary hover:bg-primary-dark text-black cursor-pointer'
              : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed',
          ]"
          @click="handleButtonClick(btn)"
        >
          <span
            v-if="isLoading && currentLoadingBtn === index"
            class="flex items-center justify-center gap-2"
          >
            <span class="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></span>
            处理中...
          </span>
          <span v-else>{{ btn.label }}</span>
        </button>

        <!-- 非目标用户的提示 -->
        <div v-if="!canInteract" class="text-center text-xs text-dark-400 dark:text-gray-400 mt-1">
          仅被回复的用户可操作
        </div>
      </div>

      <!-- 时间戳 -->
      <div v-if="cardContent.timestamp" class="px-4 pb-3">
        <div class="text-dark-400 dark:text-gray-400 text-xs">
          {{ formatTime(cardContent.timestamp) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { TxComposer, mvc } from 'meta-contract'
import { ElMessage } from 'element-plus'
import ChatImage from '@/components/ChatImage/ChatImage.vue'
import Icon from '@/components/Icon/Icon.vue'
import { useUserStore } from '@/stores/user'
import { useChainStore } from '@/stores/chain'
import { broadcastToApi, type BtcNetwork } from '@/utils/userInfo'
import { getRuntimeConfig } from '@/config/runtime-config'

// 卡片消息内容接口
interface SignButton {
  label: string
  params: string[]
  method: string
}

interface CardMsgContent {
  to: string
  encrypt: string
  title: string
  icon: string
  preview: string
  previewType: string
  signButton: SignButton[]
  timestamp: number
  replyPin: string
  metadata: string
}

// Props
const props = defineProps<{
  content: string // JSON 字符串格式的卡片内容
  message: any // 完整的消息对象
  isMyMessage?: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'signed', result: { txid: string; button: SignButton }): void
  (e: 'error', error: Error): void
}>()

const userStore = useUserStore()
const chainStore = useChainStore()

// 状态
const isLoading = ref(false)
const currentLoadingBtn = ref<number | null>(null)

// 默认空卡片内容
const emptyCardContent: CardMsgContent = {
  to: '',
  encrypt: '',
  title: '',
  icon: '',
  preview: '',
  previewType: '',
  signButton: [],
  timestamp: 0,
  replyPin: '',
  metadata: '',
}

// 解析卡片内容
// 卡片消息的字段可能在以下位置：
// 1. props.content (JSON 字符串) - 来自 decryptedContentForProtocolCard
// 2. props.message.content (JSON 字符串) - 直接从消息获取
// 3. props.message.data (对象)
// 4. props.message 顶层字段
const cardContent = computed<CardMsgContent>(() => {
  // 首先尝试从 props.content 解析
  if (props.content) {
    try {
      if (typeof props.content === 'string' && props.content.trim().startsWith('{')) {
        const parsed = JSON.parse(props.content)
        // 检查解析结果是否有卡片字段
        if (parsed.title || parsed.preview || parsed.signButton) {
          console.log('CardMsgCard: parsed from props.content:', parsed)
          return { ...emptyCardContent, ...parsed }
        }
      }
    } catch (e) {
      console.warn('CardMsgCard: Failed to parse props.content as JSON:', e)
    }
  }

  // 尝试从 message.content 解析（这是消息的原始内容字段）
  if (props.message?.content) {
    try {
      const msgContent = props.message.content
      if (typeof msgContent === 'string' && msgContent.trim().startsWith('{')) {
        const parsed = JSON.parse(msgContent)
        // 检查解析结果是否有卡片字段
        if (parsed.title || parsed.preview || parsed.signButton) {
          console.log('CardMsgCard: parsed from message.content:', parsed)
          return { ...emptyCardContent, ...parsed }
        }
      }
    } catch (e) {
      console.warn('CardMsgCard: Failed to parse message.content as JSON:', e)
    }
  }

  // 尝试从 message.data 获取
  if (props.message?.data) {
    const data = props.message.data
    if (data.title || data.preview || data.signButton) {
      console.log('CardMsgCard: using message.data:', data)
      return { ...emptyCardContent, ...data }
    }
  }

  // 尝试从 message 顶层获取
  if (props.message) {
    const msg = props.message
    if (msg.title || msg.preview || msg.signButton) {
      console.log('CardMsgCard: using message top-level fields:', msg)
      return {
        ...emptyCardContent,
        to: msg.to || '',
        encrypt: msg.encrypt || msg.encryption || '',
        title: msg.title || '',
        icon: msg.icon || '',
        preview: msg.preview || '',
        previewType: msg.previewType || msg.contentType || '',
        signButton: msg.signButton || [],
        timestamp: msg.timestamp || 0,
        replyPin: msg.replyPin || '',
        metadata: msg.metadata || '',
      }
    }
  }

  // 如果 props.content 不是 JSON，可能直接作为 preview 使用
  if (props.content && typeof props.content === 'string') {
    console.log('CardMsgCard: using props.content as preview fallback')
    return {
      ...emptyCardContent,
      preview: props.content,
    }
  }

  console.warn('CardMsgCard: could not extract card content, returning empty')
  return emptyCardContent
})

// 调试日志（模板中使用，输出到控制台）
const logCardData = computed(() => {
  console.log('=== CardMsgCard Debug ===')
  console.log('props.content:', props.content)
  console.log('props.message:', props.message)
  console.log('parsed cardContent:', cardContent.value)
  console.log('=========================')
  return '' // 返回空字符串，不在页面上显示
})

// 判断当前用户是否可以操作（只有 replyInfo 中的用户可点击）
const canInteract = computed(() => {
  // 获取当前用户的 metaId
  const currentUserMetaId = userStore.last?.metaid
  if (!currentUserMetaId) {
    console.log('CardMsgCard canInteract: no current user metaid')
    return false
  }

  // 尝试从多个来源获取目标用户 metaId
  // 1. replyInfo.metaId
  // 2. replyInfo.userInfo.metaid
  // 3. message.replyMetaId
  // 4. cardContent.to (卡片消息中的目标用户)
  const replyMetaId =
    props.message?.replyInfo?.metaId ||
    props.message?.replyInfo?.userInfo?.metaid ||
    props.message?.replyMetaId ||
    cardContent.value.to

  console.log('CardMsgCard canInteract check:', {
    currentUserMetaId,
    replyMetaId,
    replyInfo: props.message?.replyInfo,
    cardTo: cardContent.value.to,
  })

  // 如果没有目标用户，则不能操作
  if (!replyMetaId) {
    console.log('CardMsgCard canInteract: no reply metaId found')
    return false
  }

  // 只有目标用户可以点击按钮
  const result = replyMetaId === currentUserMetaId
  console.log('CardMsgCard canInteract result:', result)
  return result
})

// 格式化预览类型
const formatPreviewType = (type: string): string => {
  const typeMap: Record<string, string> = {
    'text/plain': '文本',
    'application/json': 'JSON',
    'text/html': 'HTML',
  }
  return typeMap[type] || type
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 处理按钮点击
const handleButtonClick = async (btn: SignButton) => {
  if (!canInteract.value || isLoading.value) {
    return
  }

  // 找到按钮索引
  const btnIndex = cardContent.value.signButton.findIndex(b => b === btn)
  currentLoadingBtn.value = btnIndex
  isLoading.value = true

  try {
    if (btn.method === 'sign') {
      await handleSignMethod(btn)
    } else {
      console.warn('Unknown button method:', btn.method)
      ElMessage.warning(`未知的操作方法: ${btn.method}`)
    }
  } catch (error: any) {
    console.error('Button click error:', error)
    ElMessage.error(error.message || '操作失败')
    emit('error', error)
  } finally {
    isLoading.value = false
    currentLoadingBtn.value = null
  }
}

// 处理 sign 方法
const handleSignMethod = async (btn: SignButton) => {
  if (!btn.params || btn.params.length === 0) {
    throw new Error('缺少交易参数')
  }

  // params[0] 是交易的 hex 字符串
  const txHex = btn.params[0]
  if (!txHex) {
    throw new Error('交易数据为空')
  }

  // 使用 TxComposer 处理交易
  const tx = new mvc.Transaction(txHex)
  const txComposer = new TxComposer(tx)

  // 构造 pay 参数
  const payParams = {
    transactions: [
      {
        txComposer: txComposer.serialize(),
        message: cardContent.value.title || 'Sign Transaction',
      },
    ],
    hasMetaid: true,
    feeb: chainStore.mvcFeeRate(),
  }

  // 调用钱包的 pay 方法
  const ret = await window.metaidwallet.pay(payParams)

  const {
    payedTransactions,
    status,
    message,
  }: {
    payedTransactions: string[]
    status: string
    message: string
  } = ret

  if (status) {
    throw new Error(message || status)
  }

  if (!payedTransactions || payedTransactions.length === 0) {
    throw new Error('签名交易失败')
  }

  // 反序列化已签名的交易
  const signedTxComposers = payedTransactions.map((txComposerSerialized: string) => {
    return TxComposer.deserialize(txComposerSerialized)
  })

  // 获取网络配置
  const runtimeConfig = getRuntimeConfig()
  const network: BtcNetwork = (runtimeConfig.blockchain?.network as BtcNetwork) || 'mainnet'

  // 广播交易
  const results: string[] = []
  for (const signedTxComposer of signedTxComposers) {
    const txHex = signedTxComposer.getTx().toString()
    const { txid } = await broadcastToApi({ txHex, network, chain: 'mvc' })
    results.push(txid)
  }

  const finalTxid = results[results.length - 1]

  ElMessage.success('操作成功')

  emit('signed', {
    txid: finalTxid,
    button: btn,
  })
}
</script>

<style scoped>
.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
