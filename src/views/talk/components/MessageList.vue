<template>
  <div
    class="h-full overflow-y-hidden"
    v-if="
      user.isAuthorized &&
        (layout.isShowMessagesLoading ||
          simpleTalk.isInitialized === false ||
          (simpleTalk.activeChannelMessages.length === 0 &&
            simpleTalk.activeChannel?.lastMessage?.index > 0))
    "
  >
    <LoadingList />
  </div>

  <div class="h-full relative overflow-y-auto" ref="messagesScroll" id="messagesScroll" v-else>
    <el-alert
      :title="$t('user_private_chat_unsupport')"
      type="error"
      show-icon
      :closable="false"
      v-if="activeChannel?.type === 'private' && !activeChannel.publicKeyStr"
    />
    <!-- 广播聊天头部 - 在消息列表最上方（简化版提示） -->

    <!-- <div v-if="_welComePage && layout.showWelcomeDescView">
      <div class="mt-20 px-1 flex text-center  items-center justify-center flex-col">
        <div class="">
          <Icon name="welcome_icon" class="w-[140px] h-[38px]"></Icon>
        </div>
        <div class="text-2xl welcome-desc text-zinc-800 mt-3 break-all flex items-center justify-center max-w-[326px]">
         <span>
          A Decentralized Messaging App Built on Bitcoin
         </span>
        </div>
        <div class="text-xl mt-5 text-zinc-600 break-all ">
          Fully Decentralized,Immutable,Uncensorable,and Unhackable
        </div>
        <div class="flex flex-col mt-5">
          <div class="font-medium flex flex-row items-center text-lg">
            <span>{{ $t('link.metaid.group') }}</span
            ><el-icon><CaretBottom /></el-icon>
          </div>
          <a class="main-border mt-5 text-lg primary p-3" @click="toMetaIdGrop">{{
            $t('MetaID.official_group')
          }}</a>
        </div>
      </div>
    </div> -->

    <div class="app-container">
      <BroadcastChatHeader />
      <BroadcastChatHeaderBack />
      <div class="list-container" ref="listContainer" @scroll.passive="handleScroll">
        <!-- 顶部加载指示器 -->
        <div class="loader" v-show="isLoadingTop">
          <div class="spinner"></div>
        </div>

        <!-- 列表项将被渲染到这里 -->
        <!-- ref 用于在代码中直接访问这个 DOM 元素 -->
        <div ref="listWrapper">
          <!-- 使用 v-for 循环渲染列表项 -->
          <template v-if="currentChannelType === 'group' || currentChannelType === 'sub-group'">
            <MessageItem
              v-for="message in simpleTalk.activeChannelMessages"
              :key="message.txId || message.timestamp"
              :message="message"
              :id="message.timestamp"
              :data-message-index="message.index"
              :data-message-mockId="message.mockId || ''"
              :ref="el => setMessageRef(el, message)"
              @quote="message => emit('quote', message)"
              @toBuzz="onToBuzz"
              @to-time-stamp="scrollToIndex"
            />
          </template>
          <template v-else>
            <MessageItemForSession
              v-for="message in simpleTalk.activeChannelMessages"
              :key="message.txId || message.timestamp"
              :message="message"
              :data-message-mockId="message.mockId || ''"
              :data-message-index="message.index"
              :ref="el => setMessageRef(el, message)"
              @quote="message => emit('quote', message)"
              :id="message.timestamp"
              @toBuzz="onToBuzz"
              @to-time-stamp="scrollToIndex"
            />
          </template>
          <Transition name="fade-scroll-button" mode="out-in">
            <div
              v-show="showScrollToBottom || unReadCount > 0"
              class="scroll-to-bottom-button cursor-pointer"
              @click="scrollToMessagesBottom()"
            >
              <el-badge
                :value="unReadCount"
                class="item"
                :max="9999"
                :show-zero="false"
                v-if="unReadCount > 0"
              >
                <div
                  class="w-10 h-10 min-h-10 min-w-10 bg-white dark:bg-gray-700 shadow-md rounded-full flex items-center justify-center "
                >
                  <el-icon class="text-dark-800 dark:text-white"><Bottom /></el-icon>
                </div>
              </el-badge>

              <div
                v-else
                class="w-10 h-10 min-h-10 min-w-10 bg-white dark:bg-gray-700 shadow-md rounded-full flex items-center justify-center "
              >
                <el-icon class="text-dark-800 dark:text-white"><Bottom /></el-icon>
              </div>
            </div>
          </Transition>
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
// 定义组件的自定义事件
const emit = defineEmits<{
  (e: 'quote', message: any): void
}>()

import { getChannelMessages, getPrivateChatMessages } from '@/api/talk'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
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
import BroadcastChatHeader from '@/components/BroadcastChatHeader.vue'
import BroadcastChatHeaderBack from '@/components/BroadcastChatHeaderBack.vue'
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
import { ArrowDownBold, Bottom } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'

const isLoadingTop = ref(false) // 控制顶部加载器
const isNoMoreTop = ref(false) // 控制顶部没有更多数据
const isLoadingBottom = ref(false) // 控制底部加载器
const isNoMoreBottom = ref(false) // 控制底部没有更多数据
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
// const _welComePage = computed(() => {
//   if (user.isAuthorized === false) {
//     return true
//   }
//   // 检查 simple-talk 的状态
//   if (simpleTalk.isInitialized) {
//     const hasMessages = simpleTalk.activeChannelMessages.length > 0
//     const hasActiveChannel = !!simpleTalk.activeChannel
//     return !hasActiveChannel || !hasMessages
//   }

//   return false
// })

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
    return channel?.type === 'private' ? 'session' : channel?.type
  }
  return 'group' // 默认值
})

const loadItems = async (isPrepending = false) => {
  // 防止重复加载
  console.log('loadItems', { isPrepending }, isLoadingTop.value || isLoadingBottom.value)
  if (isLoadingTop.value || isLoadingBottom.value) return

  if (!isPrepending) {
    if (isNoMoreTop.value) {
      return
    }
    isLoadingTop.value = true
  } else {
    if (isNoMoreBottom.value) {
      return
    }
    isLoadingBottom.value = true
  }

  // ** 核心逻辑：保持下拉加载时的滚动位置 **
  let scrollHeightBefore = 0
  if (isPrepending && listWrapper.value) {
    // 在添加新内容前，记录当前列表的总高度
    scrollHeightBefore = listWrapper.value.scrollHeight
  }
  const beforeLength = simpleTalk.activeChannelMessages.length

  try {
    if (!isPrepending) {
      await simpleTalk.loadMoreMessages(simpleTalk.activeChannelId)
    } else {
      await simpleTalk.loadMoreNewestMessages(simpleTalk.activeChannelId)
    }
  } catch (error) {
    console.error('加载消息失败:', error)
  }

  // 等待 DOM 更新
  await nextTick()

  const afterLength = simpleTalk.activeChannelMessages.length

  if (beforeLength === afterLength) {
    isPrepending ? (isNoMoreBottom.value = true) : (isNoMoreTop.value = true)
  }

  if (isPrepending && listWrapper.value && listContainer.value) {
    // 添加新内容后，列表总高度会增加
    const scrollHeightAfter = listWrapper.value.scrollHeight
    // 将滚动条位置设置为新内容的高度，这样旧内容就回到了原来的位置
    console.log('保持滚动位置:', {
      scrollHeightBefore,
      scrollHeightAfter,
      addedHeight: scrollHeightAfter - scrollHeightBefore,
    })
    listContainer.value.scrollTop = scrollHeightBefore - scrollHeightAfter
  }

  // 更新加载状态
  isLoadingTop.value = false
  isLoadingBottom.value = false

  setTimeout(() => {
    isNoMoreBottom.value = false
  }, 1000)
}

const unReadCount = computed(() => {
  if (
    activeChannel.value &&
    activeChannel.value.lastMessage &&
    typeof activeChannel.value.lastMessage.index === 'number' &&
    typeof activeChannel.value.lastReadIndex === 'number'
  ) {
    return activeChannel.value.lastMessage.index - activeChannel.value.lastReadIndex
  }
  return 0
})

/**
 * 滚动事件处理
 */
const handleScroll = (event: Event) => {
  const container = event.target as HTMLElement
  if (!container) return

  try {
    // 检查是否滚动到顶部
    if (Math.abs(container.scrollTop) < 50) {
      console.log(
        '滚动到底部，准备加载新数据...',
        Math.abs(container.scrollTop) < 50,
        isNoMoreBottom.value,
        isLoadingBottom.value
      )
      if (!isNoMoreBottom.value && !isLoadingBottom.value) {
        loadItems(true) // true 表示上滑加载
      }
    }
    console.log('container.scrollTop', container.scrollTop)

    if (Math.abs(container.scrollTop) > 500) {
      showScrollToBottom.value = true
    } else {
      showScrollToBottom.value = false
    }

    // 检查是否滚动到底部
    const threshold = 100 // 预加载阈值
    if (
      container.scrollHeight - Math.abs(container.scrollTop) - container.clientHeight <
      threshold
    ) {
      console.log('滚动到顶部，准备加载更多数据...')
      loadItems(false).catch(error => {
        console.error('加载更多数据失败:', error)
      })
    }
  } catch (error) {
    console.error('滚动事件处理失败:', error)
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
        // await simpleTalk.syncFromServer()
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

  // 等待 DOM 更新后自动加载最新消息
  await nextTick()

  if (isMobile) {
    document.addEventListener('click', handleGlobalClick)
  }
})

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

const notLoadAll = computed(() => {
  const maxIndex =
    simpleTalk.activeChannelMessages[simpleTalk.activeChannelMessages.length - 1].index
  console.log('maxIndex', maxIndex, simpleTalk.activeChannel?.lastMessage?.index)
  if (maxIndex !== simpleTalk.activeChannel?.lastMessage?.index) {
    return true
  }
  return false
})

const scrollToMessagesBottom = async () => {
  if (unReadCount.value > 0) {
    console.log('滚动到底部并加载最新消息', unReadCount.value > 0, notLoadAll.value)
    await simpleTalk.loadNewestMessages(simpleTalk.activeChannelId)
    await nextTick()
    await sleep(100)
    if (listContainer.value) {
      listContainer.value.scrollTop = 0
    }
  } else {
    console.log('滚动到底部')
    if (listContainer.value) {
      listContainer.value.scrollTop = 0
    }
  }
}

// 监听消息变化，确保在有消息时滚动到底部

function scrollToIndex(index: number) {
  // 根据消息索引滚动到对应位置
  const targetElement = messageRefs.value.get(index)
  if (targetElement && listContainer.value) {
    // 计算目标元素相对于容器的位置
    const containerRect = listContainer.value.getBoundingClientRect()
    const targetRect = targetElement.getBoundingClientRect()

    // 计算需要滚动的距离
    const scrollOffset = targetRect.top - containerRect.top + listContainer.value.scrollTop

    // 平滑滚动到目标位置
    listContainer.value.scrollTo({
      top: scrollOffset - 100, // 预留100px的偏移量，确保消息可见
      behavior: 'smooth',
    })

    // 滚动完成后添加摇晃效果
    setTimeout(() => {
      if (targetElement) {
        // 添加摇晃动画类
        targetElement.classList.add('message-highlight-flash')

        // 动画完成后移除类
        setTimeout(() => {
          targetElement.classList.remove('message-highlight-flash')
        }, 800) // 0.8秒后移除摇晃效果
      }
    }, 500) // 等待滚动动画完成

    console.log(`📍 滚动到消息索引: ${index}`)
  } else {
    console.warn(`⚠️ 无法找到索引为 ${index} 的消息元素`)
  }
}

function scrollToTimeStamp(timestamp: number) {
  // 根据时间戳滚动到对应消息
  const target = document.getElementById(timestamp.toString())
  if (target && messagesScroll.value) {
    const top = target.offsetTop - target.clientHeight
    messagesScroll.value.scrollTo({
      top,
      behavior: 'smooth',
    })

    // 滚动完成后添加摇晃效果
    setTimeout(() => {
      if (target) {
        // 添加摇晃动画类
        target.classList.add('message-highlight-flash')

        // 动画完成后移除类
        setTimeout(() => {
          target.classList.remove('message-highlight-flash')
        }, 800) // 0.8秒后移除摇晃效果
      }
    }, 500) // 等待滚动动画完成

    console.log(`📍 滚动到时间戳: ${timestamp}`)
  } else {
    console.warn(`⚠️ 无法找到时间戳为 ${timestamp} 的消息元素`)
  }
}

// 注：子频道选择功能已简化，现在子群聊作为独立频道显示在频道列表中

async function onToBuzz(data: ShareChatMessageData) {
  const loading = openLoading()

  console.log('data12313', data)

  const metaidData = {
    body: JSON.stringify(data),
    path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${NodeName.ShareChatMessage}`,
    flag: 'metaid',
    version: '1.0.1',
    operation: 'create',
    contentType: 'application/json',
    encryption: '0' as any,
    encoding: 'utf-8' as any,
  }

  const res = await buildTx.createPin(metaidData, true, false).catch(error => {
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
  scrollToIndex,
  scrollToTimeStamp,
  scrollToMessagesBottom,
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
  -webkit-overflow-scrolling: touch;
  overflow: hidden;
}

/* 确保消息容器正常渲染 */
//#messagesScroll > div {
//  min-height: 100%;
//  height: calc(100vh - 128px);
//   overflow: hidden;
// }

/* 加载指示器样式 */
// .loading-indicator {
//   transition: opacity 0.3s ease;
// }

.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.list-container {
  flex-grow: 1;
  overflow-y: scroll;
  -webkit-overflow-scrolling: touch;
  padding: 20px 0 !important;
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
  right: 50px;
  bottom: 100px;
  z-index: 100000;
}

/* 滚动到底部按钮的渐隐渐显动画 */
.fade-scroll-button-enter-active,
.fade-scroll-button-leave-active {
  transition: all 0.3s ease-in-out;
  transform-origin: center;
}

.fade-scroll-button-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

.fade-scroll-button-leave-to {
  opacity: 0;
  transform: scale(0.8) translateY(10px);
}

.fade-scroll-button-enter-to,
.fade-scroll-button-leave-from {
  opacity: 1;
  transform: scale(1) translateY(0);
}

/* 消息高亮摇晃动画 */
.message-highlight-flash {
  animation: messageShake 0.8s ease-in-out;
}

@keyframes messageShake {
  0%,
  100% {
    transform: translateX(0);
    background-color: transparent;
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-3px);
    background-color: rgba(59, 130, 246, 0.1);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(3px);
    background-color: rgba(59, 130, 246, 0.15);
  }
}
</style>
