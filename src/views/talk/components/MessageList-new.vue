<template>
  <div class="h-full overflow-y-hidden" v-show="layout.isShowMessagesLoading">
    <LoadingList />
  </div>

  <div class="h-full" v-show="!layout.isShowMessagesLoading">
    <!-- 欢迎页面 -->
    <div v-if="_welComePage && layout.showWelcomeDescView">
      <div class="mt-20 px-1 flex text-center  items-center justify-center flex-col">
        <div class="text-3xl">MetaSo Chat</div>
        <div class="text-lg text-zinc-500 mt-3 break-all">
          A Messaging Service Built on Bitcoin and its Sidechains
        </div>
        <div class="text-xl mt-5 text-zinc-600 break-all ">
          Fully Decentralized,Immutable,Uncensorable,and Unhackable
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <div v-else class="h-full">
      <!-- 欢迎消息 -->
      <div
        v-if="hasTooFewMessages && simpleTalk.activeChannel?.type === 'group'"
        class="border-b border-solid border-gray-300 dark:border-gray-600 mb-6 pb-6 pt-2 mx-4"
      >
        <h3 class="text-2xl font-medium text-dark-400 dark:text-gray-200">
          {{
            '😊 ' + $t('Talk.Channel.welcome_message', { channel: simpleTalk.activeChannel?.name })
          }}
        </h3>
        <div class="flex space-x-2 items-center mt-4">
          <p class="text-sm font-thin text-dark-400 dark:text-gray-200 italic">
            {{ $t('Talk.Channel.welcome_start', { channel: simpleTalk.activeChannel?.name }) }}
          </p>
          <p>🎉</p>
        </div>

        <div class="flex mt-1 items-center space-x-2">
          <p class="text-sm font-thin text-dark-400 dark:text-gray-200 mt-1 italic">
            {{ $t('Talk.Channel.welcome_invite') }}
          </p>
          <Icon
            name="user_plus"
            class="box-content w-4 h-4 p-1.5 text-dark-400 dark:text-gray-200 mt-1 ml-1 border-2 border-dashed border-dark-250 dark:border-dark-400 rounded-lg cursor-pointer hover:border-solid hover:text-dark-800 hover:dark:text-primary transition-all duration-300"
            @click="popInvite"
          />
        </div>
      </div>

      <!-- 虚拟滚动列表 -->
      <VirtualScrollList
        ref="virtualListRef"
        class="h-full"
        :data-sources="reversedMessages"
        :estimate-size="80"
        :item-class="'message-item'"
        :wrap-class="'messages-container'"
        :direction="'vertical'"
        @scroll="handleVirtualScroll"
        @top-reached="handleTopReached"
      >
        <template #default="{ item, index }">
          <!-- 加载更多指示器 -->
          <div v-if="item.isLoadingItem" class="py-4 text-center" :key="`loading-${index}`">
            <LoadingItem />
          </div>

          <!-- 群聊消息 -->
          <MessageItem
            v-else-if="simpleTalk.activeChannel?.type === 'group'"
            :message="convertSimpleMessageToMessageItem(item)"
            :key="`group-${item.id || item.timestamp}-${index}`"
            v-bind="$attrs"
            @toBuzz="onToBuzz"
            @to-time-stamp="scrollToTimeStamp"
          />

          <!-- 私聊消息 -->
          <MessageItemForSession
            v-else
            :message="convertSimpleMessageToSessionItem(item)"
            :key="`session-${item.id || item.timestamp}-${index}`"
            v-bind="$attrs"
            @toBuzz="onToBuzz"
            @to-time-stamp="scrollToTimeStamp"
          />
        </template>
      </VirtualScrollList>
    </div>
  </div>

  <Publish v-model="isShowPublish" :repostTxId="repostBuzzTxId" ref="PublishRef" />
</template>

<script setup lang="ts">
import VirtualScrollList from 'vue3-virtual-scroll-list'
import { getChannelMessages, getPrivateChatMessages } from '@/api/talk'
import { useTalkStore } from '@/stores/talk'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import { MessageType } from '@/@types/simple-chat.d'
import {
  computed,
  nextTick,
  onBeforeUnmount,
  ref,
  watch,
  inject,
  onMounted,
  onUnmounted,
} from 'vue'
import { useRoute } from 'vue-router'
import LoadingItem from './LoadingItem.vue'
import LoadingList from './LoadingList.vue'
import MessageItem from './MessageItem.vue'
import MessageItemForSession from './MessageItemForSession.vue'
import { openLoading, sleep, debounce } from '@/utils/util'
import { useUserStore } from '@/stores/user'
import Publish from '@/views/buzz/components/Publish.vue'
import { IsEncrypt, NodeName, ChatChain } from '@/enum'
import { decrypt } from '@/utils/crypto'
import { ShareChatMessageData } from '@/@types/common'
import { useBulidTx } from '@/hooks/use-build-tx'
import { GroupMessagePollingQueue } from '@/utils/taskQueue'
import { getUserInfoByAddress } from '@/api/man'
import { CaretBottom } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { useChainStore } from '@/stores/chain'
import { isMobile } from '@/stores/root'

const user = useUserStore()
const talk = useTalkStore()
const simpleTalk = useSimpleTalkStore()
const layout = useLayoutStore()
const route = useRoute()

// 将 SimpleMessage 转换为 MessageItem 组件需要的格式
const convertSimpleMessageToMessageItem = (message: any) => {
  return {
    address: message.sender,
    avatarImage: message.senderAvatar || '',
    avatarTxId: '',
    avatarType: '',
    chatType: message.type, // 直接使用服务器返回的 chatType
    content: message.content,
    contentType: message.contentType || 'text/plain',
    data: message.content,
    chain: 'mvc' as 'mvc' | 'btc',
    encryption: message.encryption || '',
    groupId: message.channelId,
    metaId: message.sender,
    metanetId: '',
    nickName: message.senderName,
    params: '',
    protocol: message.protocol || 'SimpleMsg',
    redMetaId: '',
    timestamp: message.timestamp,
    txId: message.id,
    pinId: message.id,
    replyTx: message.replyTo || '', // 回复消息ID
    replyInfo: message.replyInfo, // 完整的回复信息
    userInfo: {
      metaid: message.sender,
      address: message.sender,
      name: message.senderName,
      avatar: message.senderAvatar || '',
      avatarImage: message.senderAvatar || '',
      chatPublicKey: message.senderChatPublicKey || '',
      chatPublicKeyId: '',
    },
    isMock: message.isMock || false,
  }
}

// 将 SimpleMessage 转换为 PriviteChatMessageItem 组件需要的格式
const convertSimpleMessageToSessionItem = (message: any) => {
  return {
    from: message.sender,
    fromUserInfo: {
      metaid: message.sender,
      address: message.sender,
      name: message.senderName,
      avatar: message.senderAvatar || '',
      avatarImage: message.senderAvatar || '',
      chatPublicKey: message.senderChatPublicKey || '',
      chatPublicKeyId: '',
    },
    to: simpleTalk.selfMetaId,
    toUserInfo: {
      metaid: simpleTalk.selfMetaId,
      address: simpleTalk.selfMetaId,
      name: user.last?.name || '',
      avatar: user.last?.avatar || '',
      avatarImage: user.last?.avatar || '',
      chatPublicKey: user.last?.chatpubkey || '',
      chatPublicKeyId: '',
    },
    txId: message.id,
    pinId: message.id,
    metaId: message.sender,
    address: message.sender,
    nickName: message.senderName,
    protocol: 'SimpleMsg',
    contentType: 'text/plain',
    content: message.content,
    timestamp: message.timestamp,
    encryption: '',
    chatType: message.type === MessageType.msg ? '0' : '3',
    data: message.content,
    avatarImage: message.senderAvatar || '',
    avatarTxId: '',
    avatarType: '',
    replyPin: '',
    redMetaId: '',
    params: '',
    chain: 'mvc' as 'mvc' | 'btc',
    metanetId: '',
    blockHeight: 0,
    index: 0,
    userInfo: {
      metaid: message.sender,
      address: message.sender,
      name: message.senderName,
      avatar: message.senderAvatar || '',
      avatarImage: message.senderAvatar || '',
      chatPublicKey: message.senderChatPublicKey || '',
      chatPublicKeyId: '',
    },
    isMock: message.isMock || false,
  }
}

const MetaIdUrl = `${location.origin}/talk/channels/public/396809572f936c66979755477b15ae9adfe9fae119bdabb8f3ffb9a362a176d0i0`
const loadingMore = ref(false)
const router = useRouter()
const isShowPublish = ref(false)
const chainStore = useChainStore()
const repostBuzzTxId = ref('')
const PublishRef = ref()
const buildTx = useBulidTx()
const virtualListRef = ref<InstanceType<typeof VirtualScrollList>>()
const preTime = ref(0)
const { openConnectionModal } = useConnectionModal()

const _welComePage = computed(() => {
  return !simpleTalk.activeChannel || simpleTalk.activeChannelMessages.length === 0
})

// 虚拟滚动数据源 - 倒序展示(最新消息在下方)
const reversedMessages = computed(() => {
  const messages = [...simpleTalk.activeChannelMessages].reverse()

  // 如果正在加载更多消息，在顶部添加加载指示器
  if (loadingMore.value) {
    return [{ isLoadingItem: true, id: 'loading' }, ...messages]
  }

  return messages
})

// 全局点击监听器，用于隐藏消息菜单
const handleGlobalClick = (event: MouseEvent) => {
  if (!isMobile || !talk.activeMessageMenuId) return

  const target = event.target as Element

  // 检查是否点击了菜单
  const messageMenu = target.closest('.message-menu')

  // 如果点击的是菜单内部，不关闭菜单
  if (messageMenu) {
    console.log('点击了菜单内部，不关闭菜单')
    return
  }

  // 否则关闭菜单
  console.log('点击了菜单外部，关闭菜单')
  talk.clearActiveMessageMenu()
}

// 自动初始化 simple-talk
const autoInitSimpleTalk = async () => {
  console.log('🔍 AutoInit check - User authorized:', user.isAuthorized)
  console.log('🔍 AutoInit check - SimpleTalk initialized:', simpleTalk.isInitialized)
  console.log('🔍 AutoInit check - Current user:', user.last?.metaid)
  console.log('🔍 AutoInit check - Channels count:', simpleTalk.channels.length)

  if (user.isAuthorized) {
    if (!simpleTalk.isInitialized) {
      try {
        console.log('🚀 MessageList 正在初始化 simple-talk...')
        await simpleTalk.init()
        console.log('✅ MessageList simple-talk 初始化成功')
        console.log('📊 初始化后频道数量:', simpleTalk.channels.length)
      } catch (error) {
        console.error('❌ MessageList simple-talk 初始化失败:', error)
      }
    } else if (simpleTalk.channels.length === 0) {
      // 如果已初始化但没有频道，强制同步
      console.log('🔄 SimpleTalk已初始化但无频道，强制同步...')
      try {
        await simpleTalk.syncFromServer()
        console.log('✅ 强制同步完成，频道数量:', simpleTalk.channels.length)
      } catch (error) {
        console.error('❌ 强制同步失败:', error)
      }
    } else {
      console.log('✅ SimpleTalk已正常初始化，频道数量:', simpleTalk.channels.length)
    }
  }
}

// 处理虚拟滚动事件
const handleVirtualScroll = (event: Event) => {
  // 可以在这里添加滚动相关的逻辑
}

// 处理到达顶部事件（加载更多历史消息）
const handleTopReached = async () => {
  if (!user.isAuthorized || loadingMore.value || layout.isShowMessagesLoading) return

  console.log('📄 到达顶部，加载更多历史消息...')

  loadingMore.value = true

  try {
    const hasMore = await simpleTalk.loadMoreMessages(
      simpleTalk.activeChannelId,
      preTime.value || undefined
    )

    if (hasMore) {
      // 更新最早消息时间戳，用于下次分页
      const currentMessages = simpleTalk.activeChannelMessages
      if (currentMessages.length > 0) {
        const earliestMessage = currentMessages[currentMessages.length - 1]
        preTime.value = earliestMessage.timestamp
        console.log(
          `📄 更新最早消息时间戳: ${new Date(earliestMessage.timestamp).toLocaleString()}`
        )
      }
    } else {
      console.log('📭 没有更多历史消息')
    }
  } catch (error) {
    console.error('❌ 加载更多消息失败:', error)
  } finally {
    loadingMore.value = false
  }
}

// 添加和移除全局点击监听器
onMounted(async () => {
  // 自动初始化 simple-talk
  await autoInitSimpleTalk()

  // 监听路由变化，激活对应频道
  const { channelId } = route.params as { channelId: string }
  if (channelId && simpleTalk.isInitialized) {
    console.log('🎯 初始化时激活频道:', channelId)
    simpleTalk.setActiveChannel(channelId)

    // 添加详细的频道和消息调试信息
    setTimeout(() => {
      console.log('📊 初始激活频道后的状态:', {
        activeChannelId: simpleTalk.activeChannelId,
        activeChannel: simpleTalk.activeChannel,
        messageCount: simpleTalk.activeChannelMessages.length,
        allChannelsCount: simpleTalk.allChannels.length,
      })
    }, 200)
  }

  if (isMobile) {
    document.addEventListener('click', handleGlobalClick)
  }

  // 滚动到底部显示最新消息
  await nextTick()
  setTimeout(() => {
    scrollToMessagesBottom()
  }, 500)
})

// 监听路由参数变化
watch(
  () => route.params.channelId,
  newChannelId => {
    if (newChannelId && typeof newChannelId === 'string') {
      console.log('🎯 路由变化，激活频道:', newChannelId)
      if (simpleTalk.isInitialized) {
        simpleTalk.setActiveChannel(newChannelId)

        // 重置分页时间戳
        preTime.value = 0

        // 添加详细的频道和消息调试信息
        setTimeout(() => {
          console.log('📊 激活频道后的状态:', {
            activeChannelId: simpleTalk.activeChannelId,
            activeChannel: simpleTalk.activeChannel,
            channelExists: !!simpleTalk.activeChannel,
            messageCount: simpleTalk.activeChannelMessages.length,
            messages: simpleTalk.activeChannelMessages.slice(0, 3), // 显示前3条消息
            messageCache: Array.from(simpleTalk.messageCache.entries()).map(([id, msgs]) => ({
              channelId: id,
              messageCount: msgs.length,
            })),
          })

          // 滚动到底部
          scrollToMessagesBottom()
        }, 100)
      }
    }
  }
)

onUnmounted(() => {
  if (isMobile) {
    document.removeEventListener('click', handleGlobalClick)
  }
})

function toMetaIdGrop() {
  if (user.isAuthorized) {
    router.push({
      name: 'talkChannel',
      params: {
        communityId: 'public',
        channelId: '396809572f936c66979755477b15ae9adfe9fae119bdabb8f3ffb9a362a176d0i0',
      },
    })
  } else {
    openConnectionModal()
  }
}

const popInvite = () => {
  if (!simpleTalk.activeChannel) return

  talk.inviteLink = `${location.origin}/talk/channels/${
    simpleTalk.activeChannel.type === 'group' ? '#' : '@'
  }/${simpleTalk.activeChannel.id}`
  talk.invitingChannel = {
    community: talk.activeCommunity,
    channel: {
      id: simpleTalk.activeChannel.id,
      name: simpleTalk.activeChannel.name,
      groupId: simpleTalk.activeChannel.type === 'group' ? simpleTalk.activeChannel.id : '',
    },
  }
  layout.isShowInviteModal = true
}

const hasTooFewMessages = computed(() => {
  if (!simpleTalk.activeChannel) {
    return false
  }
  return simpleTalk.activeChannelMessages.length < 10
})

const scrollToMessagesBottom = async (retryCount = 0) => {
  await nextTick()
  if (virtualListRef.value) {
    try {
      // 滚动到虚拟列表底部
      virtualListRef.value.scrollToBottom()
    } catch (error) {
      console.warn('滚动到底部失败:', error)
      if (retryCount < 3) {
        setTimeout(() => scrollToMessagesBottom(retryCount + 1), 200)
      }
    }
  }
}

function scrollToTimeStamp(time: number) {
  // 在虚拟滚动列表中查找特定时间戳的消息
  const messageIndex = simpleTalk.activeChannelMessages.findIndex(msg => msg.timestamp === time)
  if (messageIndex !== -1 && virtualListRef.value) {
    // 因为消息是倒序的，所以需要计算反向索引
    const reversedIndex = simpleTalk.activeChannelMessages.length - 1 - messageIndex
    virtualListRef.value.scrollToIndex(reversedIndex)
  }
}

async function onToBuzz(data: ShareChatMessageData) {
  const loading = openLoading()

  console.log('data12313', data)

  const metaidData = {
    body: JSON.stringify(data),
    path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${NodeName.ShareChatMessage}`,
    flag: 'metaid' as any,
    version: '1.0.0',
    operation: 'create' as 'create',
    contentType: 'application/json',
    encryption: '0',
    encoding: 'utf-8',
  }

  const res = await buildTx.createPin(metaidData, true).catch(error => {
    loading.close()
    ElMessage.error(error.message)
  })

  if (res) {
    loading.close()
    talk.shareToBuzzTxId =
      chainStore.state.currentChain == ChatChain.btc
        ? (res as any)?.revealTxIds?.[0]
        : (res as any)?.txids?.[0]
    layout.isShowShareSuccessModal = true
  } else if (res === null) {
    loading.close()
  }
}

function decryptedMessage(message: any) {
  if (!message) return
  if (message.encryption === '0') {
    return message.content
  }

  if (message.protocol !== 'simpleGroupChat' && message.protocol !== 'SimpleFileGroupChat') {
    return message.content
  }

  // 处理mock的图片消息
  if (message.isMock && message.protocol === 'SimpleFileGroupChat') {
    return message.content
  }

  return decrypt(message.content, talk.activeChannelId.substring(0, 16))
}

// 监听新消息，自动滚动到底部
watch(
  () => simpleTalk.activeChannelMessages.length,
  async (newLength, oldLength) => {
    // 如果有新消息添加，且用户在底部附近，则自动滚动到底部
    if (newLength > oldLength && virtualListRef.value) {
      await nextTick()
      setTimeout(() => {
        scrollToMessagesBottom()
      }, 100)
    }
  }
)

defineExpose({
  scrollToTimeStamp,
})
</script>

<style lang="scss" scoped>
// 虚拟滚动列表样式
:deep(.messages-container) {
  display: flex;
  flex-direction: column;
  padding: 0;
}

:deep(.message-item) {
  flex-shrink: 0;
}

*::-webkit-scrollbar {
  width: 8px;
}

*::-webkit-scrollbar-track {
  background: #edeff2;
}

.dark *::-webkit-scrollbar-track {
  background: #111827;
}

*::-webkit-scrollbar-thumb {
  background-color: #bfc2cc;
  border-radius: 20px;
}

.dark *::-webkit-scrollbar-thumb {
  background-color: #374151;
}
</style>
