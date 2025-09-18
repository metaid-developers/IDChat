<template>
  <div
    class="h-full overflow-y-hidden"
    v-show="layout.isShowMessagesLoading || simpleTalk.isInitialized === false"
  >
    <LoadingList />
  </div>

  <div
    class="h-full overflow-y-auto"
    ref="messagesScroll"
    id="messagesScroll"
    v-show="!layout.isShowMessagesLoading"
  >
    <div v-if="_welComePage && layout.showWelcomeDescView">
      <div class="mt-20 px-1 flex text-center  items-center justify-center flex-col">
        <div class="text-3xl break-all font-black">MetaSo Chat</div>
        <div class="text-lg text-zinc-500 mt-3 break-all">
          A Messaging Service Built on Bitcoin and its Sidechains
        </div>
        <div class="text-xl mt-5 text-zinc-600 break-all ">
          Fully Decentralized,Immutable,Uncensorable,and Unhackable
        </div>
        <!-- <div class="flex flex-col mt-5">
          <div class="font-medium flex flex-row items-center text-lg">
            <span>{{ $t('link.metaid.group') }}</span
            ><el-icon><CaretBottom /></el-icon>
          </div>
          <a class="main-border mt-5 text-lg primary p-3" @click="toMetaIdGrop">{{
            $t('MetaID.official_group')
          }}</a>
        </div> -->
      </div>
    </div>

    <div class="app-container">
      <div class="list-container" ref="listContainer" @scroll.passive="handleScroll">
        <!-- 顶部加载指示器 -->
        <div class="loader" v-show="isLoadingTop">
          <div class="spinner"></div>
        </div>

        <!-- 列表项将被渲染到这里 -->
        <!-- ref 用于在代码中直接访问这个 DOM 元素 -->
        <div ref="listWrapper">
          <!-- 使用 v-for 循环渲染列表项 -->
          <template v-if="currentChannelType === 'group'">
            <MessageItem
              v-for="message in simpleTalk.activeChannelMessages"
              :key="message.txId || message.timestamp"
              :message="message"
              :id="message.timestamp"
              :data-message-index="message.index"
              :ref="el => setMessageRef(el, message)"
              v-bind="$attrs"
              @toBuzz="onToBuzz"
              @to-time-stamp="time => scrollToTimeStamp(time)"
            />
          </template>
          <template v-else>
            <MessageItemForSession
              v-for="message in simpleTalk.activeChannelMessages"
              :key="message.txId || message.timestamp"
              :message="message"
              :data-message-index="message.index"
              :ref="el => setMessageRef(el, message)"
              v-bind="$attrs"
              :id="message.timestamp"
              @toBuzz="onToBuzz"
              @to-time-stamp="time => scrollToTimeStamp(time)"
            />
          </template>
          <div
            v-show="showScrollToBottom || unReadCount > 0"
            class="scroll-to-bottom-button"
            @click="scrollToMessagesBottom()"
          >
            <el-badge
              :value="unReadCount"
              class="item"
              :max="9999"
              :show-zero="false"
              v-if="unReadCount > 0"
            >
              <el-button
                type="warning"
                class="w-8 h-8 min-h-8 min-w-8"
                :icon="ArrowDownBold"
                circle
              />
            </el-badge>
            <el-button
              v-else
              type="warning"
              class="w-8 h-8 min-h-8 min-w-8"
              :icon="ArrowDownBold"
              circle
            />
          </div>
        </div>

        <div class="message-list-bottom-spacer" ref="bottomSpacer"></div>

        <!-- 底部加载指示器 -->
        <div class="loader" v-show="isLoadingBottom">
          <div class="spinner"></div>
        </div>
      </div>
    </div>
  </div>

  <Publish v-model="isShowPublish" :repostTxId="repostBuzzTxId" ref="PublishRef" />
</template>

<script setup lang="ts">
import { getChannelMessages, getPrivateChatMessages } from '@/api/talk'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import VirtualList from 'vue3-virtual-scroll-list'
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
import { useRouter } from 'vue-router'
import { useChainStore } from '@/stores/chain'
import { isMobile } from '@/stores/root'
import { ArrowDownBold } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'

const isLoadingTop = ref(false) // 控制顶部加载器
const isLoadingBottom = ref(false) // 控制底部加载器
const listContainer = ref<HTMLElement | null>(null)
const bottomSpacer = ref<HTMLElement | null>(null)
const listWrapper = ref<HTMLElement | null>(null)
const user = useUserStore()
const simpleTalk = useSimpleTalkStore()
const layout = useLayoutStore()
const router = useRouter()
const isShowPublish = ref(false)
const chainStore = useChainStore()
const repostBuzzTxId = ref('')
const PublishRef = ref()
const buildTx = useBulidTx()
const messagesScroll = ref<HTMLElement>()
const route = useRoute()
const showScrollToBottom = ref(false)

const { activeChannel } = storeToRefs(useSimpleTalkStore())

// 消息元素引用和观察器
const messageRefs = ref<Map<number, HTMLElement>>(new Map())
const messageObserver = ref<IntersectionObserver | null>(null)
const _welComePage = computed(() => {
  // 检查 simple-talk 的状态
  if (simpleTalk.isInitialized) {
    const hasMessages = simpleTalk.activeChannelMessages.length > 0
    const hasActiveChannel = !!simpleTalk.activeChannel
    console.log('🏠 WelcomePage check (simple-talk):', {
      hasActiveChannel,
      hasMessages,
      shouldShowWelcome: !hasActiveChannel || !hasMessages,
    })
    return !hasActiveChannel || !hasMessages
  }

  return false
})

// 设置消息元素引用
const setMessageRef = (el: any, message: any) => {
  if (el && el.$el) {
    messageRefs.value.set(message.index || 0, el.$el)
  } else if (el) {
    messageRefs.value.set(message.index || 0, el)
  }
}

// 初始化消息观察器
const initMessageObserver = () => {
  if (messageObserver.value) {
    messageObserver.value.disconnect()
  }

  messageObserver.value = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const messageElement = entry.target as HTMLElement
          const messageIndex = parseInt(messageElement.getAttribute('data-message-index') || '0')

          // 更新最后已读索引
          if (simpleTalk.activeChannelId && messageIndex >= 0) {
            console.log(`📖 消息 ${messageIndex} 进入视图，更新已读索引`)
            simpleTalk.setLastReadIndex(simpleTalk.activeChannelId, messageIndex).catch(error => {
              console.warn('❌ 更新已读索引失败:', error)
            })
          }
        }
      })
    },
    {
      root: listContainer.value,
      rootMargin: '0px',
      threshold: 0, // 当消息50%进入视图时触发
    }
  )
}

// 观察消息元素
const observeMessages = () => {
  if (!messageObserver.value) return

  // 清除之前的观察
  messageObserver.value.disconnect()

  // 重新初始化观察器
  initMessageObserver()

  // 观察所有消息元素
  messageRefs.value.forEach((element, messageIndex) => {
    if (element && messageObserver.value) {
      element.setAttribute('data-message-index', messageIndex.toString())
      messageObserver.value.observe(element)
    }
  })
}

// 获取当前频道类型（群聊或私聊）
const currentChannelType = computed(() => {
  // 使用 simple-talk 的频道类型
  if (simpleTalk.isInitialized) {
    const channel = simpleTalk.activeChannel
    // simple-talk 的类型是 'group' | 'private'，需要转换为 'group' | 'session'
    return channel!.type === 'group' ? 'group' : 'session'
  }
  return 'group' // 默认值
})

const loadItems = async (isPrepending = false) => {
  // 防止重复加载
  if (isLoadingTop.value || isLoadingBottom.value) return

  if (!isPrepending) {
    isLoadingTop.value = true
  } else {
    isLoadingBottom.value = true
  }

  // ** 核心逻辑：保持下拉加载时的滚动位置 **
  let scrollHeightBefore = 0
  if (!isPrepending) {
    // 在添加新内容前，记录当前列表的总高度
    scrollHeightBefore = listWrapper.value.scrollHeight
  }

  await simpleTalk.loadMoreMessages(simpleTalk.activeChannelId)

  // 等待 DOM 更新
  await nextTick()

  if (isPrepending) {
    // 添加新内容后，列表总高度会增加
    const scrollHeightAfter = listWrapper.value.scrollHeight
    // 将滚动条位置设置为新内容的高度，这样旧内容就回到了原来的位置
    listContainer.value.scrollTop = scrollHeightAfter - scrollHeightBefore
  }

  // 更新加载状态
  isLoadingTop.value = false
  isLoadingBottom.value = false
}

const unReadCount = computed(() => {
  if (activeChannel.value) {
    return activeChannel.value.lastMessage.index - activeChannel.value.lastReadIndex
  }
  return 0
})

/**
 * 滚动事件处理
 */
const handleScroll = event => {
  const container = event.target
  // 检查是否滚动到顶部
  console.log('handleScroll', { scrollTop: container.scrollTop })
  if (container.scrollTop === 0) {
    console.log('滚动到顶部，准备加载新数据...')
    // loadItems(true) // true 表示下拉刷新
  }

  if (Math.abs(container.scrollTop) > 500) {
    showScrollToBottom.value = true
  } else {
    showScrollToBottom.value = false
  }

  // 检查是否滚动到底部
  const threshold = 100 // 预加载阈值
  if (container.scrollHeight - Math.abs(container.scrollTop) - container.clientHeight < threshold) {
    console.log('滚动到底部，准备加载更多数据...')
    loadItems(false)
  }
}

// 自动初始化 simple-talk
const autoInitSimpleTalk = async () => {
  if (user.isAuthorized) {
    if (!simpleTalk.isInitialized) {
      try {
        await simpleTalk.init()
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

// 全局点击监听器，用于隐藏消息菜单 - 已移除 talk store 依赖
const handleGlobalClick = (event: MouseEvent) => {
  // 功能已简化，不再处理消息菜单
  // 如果需要，可以通过 simpleTalk 或其他方式实现
}

// 添加和移除全局点击监听器
onMounted(async () => {
  // 自动初始化 simple-talk
  await autoInitSimpleTalk()

  // 初始化消息观察器
  initMessageObserver()

  // 监听路由变化，激活对应频道
  const { channelId } = route.params as { channelId: string }
  if (channelId && simpleTalk.isInitialized) {
    await simpleTalk.setActiveChannel(channelId)

    // 添加详细的频道和消息调试信息
  }
  // await nextTick()
  // scrollToMessagesBottom()

  if (isMobile) {
    document.addEventListener('click', handleGlobalClick)
  }
})

// 监听路由参数变化，处理频道切换
watch(
  () => route.params.channelId,
  async (newChannelId, oldChannelId) => {
    if (newChannelId && newChannelId !== oldChannelId) {
      console.log('🔄 频道切换:', { from: oldChannelId, to: newChannelId })

      // 确保 simple-talk 已初始化
      if (!simpleTalk.isInitialized) {
        console.log('📋 频道切换时初始化 simple-talk')
        await simpleTalk.init()
      }

      // 激活新频道
      await simpleTalk.setActiveChannel(newChannelId as string)
      console.log('✅ 频道切换完成:', newChannelId)
      await nextTick()
      // scrollToMessagesBottom()
    }
  },
  { immediate: false }
)

// 监听消息变化，确保在有消息时滚动到底部
watch(
  [() => simpleTalk.activeChannelMessages],
  ([simpleMessages]) => {
    // 如果有消息显示，重新观察消息元素
    const hasMessages = simpleMessages && simpleMessages.length > 0

    if (hasMessages) {
      console.log('📝 检测到消息变化，重新设置观察器')
      nextTick(() => {
        // 延迟执行，确保DOM已更新
        setTimeout(() => {
          observeMessages()
        }, 100)
      })
    }
  },
  { immediate: true, deep: true }
)

onUnmounted(() => {
  if (isMobile) {
    document.removeEventListener('click', handleGlobalClick)
  }

  // 清理 Intersection Observer
  if (messageObserver.value) {
    messageObserver.value.disconnect()
  }

  // 清理消息引用
  messageRefs.value.clear()
})

const popInvite = () => {
  layout.inviteLink = `${location.origin}/talk/channels/public/${simpleTalk.activeChannelId}`
  layout.isShowInviteModal = true
}

const hasTooFewMessages = computed(() => {
  // 检查 simple-talk 数据
  if (simpleTalk.isInitialized && simpleTalk.activeChannelMessages.length > 0) {
    return simpleTalk.activeChannelMessages.length < 10
  }

  return false
})

const scrollToMessagesBottom = async () => {
  if (unReadCount.value > 0) {
    await simpleTalk.loadNewestMessages(simpleTalk.activeChannelId)
    await nextTick()
    await sleep(100)
    listContainer.value.scrollTop = 0
  } else {
    listContainer.value.scrollTop = 0
  }
}

// 监听消息变化，确保在有消息时滚动到底部

function scrollToTimeStamp(time: number) {
  const target = document.getElementById(time.toString())
  if (target) {
    const top = target.offsetTop - target.clientHeight
    messagesScroll.value?.scrollTo({ top })
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
    operation: 'create' as any,
    contentType: 'application/json',
    encryption: '0' as any,
    encoding: 'utf-8' as any,
  }

  const res = await buildTx.createPin(metaidData, true).catch(error => {
    loading.close()
    ElMessage.error(error.message)
  })

  if (res) {
    loading.close()
    // 移除对 talk.shareToBuzzTxId 的赋值，直接显示成功
    layout.isShowShareSuccessModal = true
  } else if (res === null) {
    loading.close()
  }
}

// 移除了对 talk.newMessages 的监听

defineExpose({
  scrollToTimeStamp,
})

// onUnmounted(() => {
//   if (messagesScroll.value) {
//     messagesScroll.value?.removeEventListener('scroll', handleScroll)
//   }
// })

// onBeforeUnmount(() => {
//
//   messagesScroll.value?.removeEventListener('scroll', handleScroll)
// })
</script>

<style lang="scss" scoped>
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

/* 改进滚动行为 */
#messagesScroll {
  /* 使用 auto 而不是 smooth，避免分页加载时的滚动干扰 */
  // scroll-behavior: auto;
  /* 确保在iOS上滚动流畅 */
  -webkit-overflow-scrolling: touch;
  overflow: hidden;
}

/* 确保消息容器正常渲染 */
#messagesScroll > div {
  min-height: 100%;
  height: calc(100vh - 128px);
  overflow: hidden;
}

/* 加载指示器样式 */
// .loading-indicator {
//   transition: opacity 0.3s ease;
// }
.app-container {
  width: 100%;
  height: calc(100vh - 128px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.list-container {
  flex-grow: 1;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  padding: 20px 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column-reverse;
}
.loader {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 15px;
  font-size: 14px;
  color: #888;
  height: 50px;
  box-sizing: border-box;
}
.loader .spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--el-color-primary);
  border-radius: 50%;
  width: 24px;
  height: 24px;
  animation: spin 1s linear infinite;
  margin-right: 10px;
}
@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
.message-list-bottom-spacer {
  height: 20px;
  background-color: transparent;
}
.scroll-to-bottom-button {
  position: absolute;
  right: 80px;
  bottom: 80px;
  z-index: 100000;
}
</style>
