<template>
  <div
    class="mask bg-gray-200 dark:bg-gray-900"
    v-show="
      user.isAuthorized &&
        (layout.isShowMessagesLoading ||
          simpleTalk.isInitialized === false ||
          simpleTalk.isSetActiveChannelIdInProgress ||
          (simpleTalk.activeChannelMessages.length === 0 &&
            simpleTalk.activeChannel?.lastMessage?.index > 0))
    "
  >
    <LoadingList />
  </div>

  <div class="h-full  relative overflow-y-auto" ref="messagesScroll" id="messagesScroll">
    <el-alert
      :title="$t('user_private_chat_unsupport')"
      type="error"
      show-icon
      :closable="false"
      v-if="activeChannel?.type === 'private' && !activeChannel.publicKeyStr"
    />

    <!-- 私密群聊缺少 passwordKey 提示 -->
    <el-alert type="warning" show-icon :closable="false" v-if="isPrivateGroupWithoutPasswordKey">
      <template #title>
        <div class="flex flex-col gap-2">
          <span>{{ $t('Talk.Channel.private_group_password_missing') }}</span>
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('Talk.Channel.private_group_password_missing_hint') }}
          </span>
        </div>
      </template>
    </el-alert>

    <div class="app-container">
      <BroadcastChatHeader />
      <BroadcastChatHeaderBack />
      <div
        class="list-container"
        ref="listContainer"
        @scroll.passive="handleScroll"
        @wheel.passive="handleWheel"
        @touchstart.passive="handleTouchStart"
        @touchmove.passive="handleTouchMove"
      >
        <!-- 顶部加载指示器 -->
        <div class="loader" v-show="isLoadingTop">
          <div class="spinner"></div>
        </div>

        <!-- 列表项将被渲染到这里 -->
        <!-- ref 用于在代码中直接访问这个 DOM 元素 -->
        <div ref="listWrapper" v-if="!isPrivateGroupWithoutPasswordKey">
          <!-- 使用 v-for 循环渲染列表项 -->
          <template v-if="currentChannelType === 'group' || currentChannelType === 'sub-group'">
            <MessageItem
              v-for="item in simpleTalk.activeChannelMessages"
              :key="item.txId"
              :message="item"
              :id="item.txId"
              :data-message-index="item.index"
              :data-message-mockId="item.mockId || ''"
              :data-message-txid="item.txId || ''"
              :ref="el => setMessageRef(el, item)"
              @quote="message => emit('quote', message)"
              @toBuzz="onToBuzz"
              @to-time-stamp="scrollToIndex"
              :lastReadIndex="lastReadIndex"
            />
          </template>
          <template v-else>
            <MessageItemForSession
              v-for="item in simpleTalk.activeChannelMessages"
              :key="item.txId"
              :message="item"
              :data-message-mockId="item.mockId || ''"
              :data-message-index="item.index"
              :ref="el => setMessageRef(el, item)"
              @quote="message => emit('quote', message)"
              :id="item.txId"
              @toBuzz="onToBuzz"
              @to-time-stamp="scrollToIndex"
              :lastReadIndex="lastReadIndex"
            />
          </template>

          <!-- @ 提及跳转按钮 -->
          <Transition name="fade-scroll-button" mode="out-in">
            <div
              v-show="unreadMentionCount > 0"
              class="scroll-to-mention-button cursor-pointer"
              @click="jumpToNextUnreadMention()"
            >
              <el-badge :value="unreadMentionCount" class="item" :max="99" :show-zero="false">
                <div
                  class="w-10 h-10 min-h-10 min-w-10 bg-pink-500 shadow-md rounded-full flex items-center justify-center"
                >
                  <span class="text-white font-bold text-lg">@</span>
                </div>
              </el-badge>
            </div>
          </Transition>

          <!-- 滚动到底部按钮 -->
          <Transition name="fade-scroll-button" mode="out-in">
            <div
              v-show="showScrollToBottom || unReadCount > 0 || notLoadAll"
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

import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import {
  computed,
  nextTick,
  ref,
  watch,
  onMounted,
  onUnmounted,
} from 'vue'
import LoadingList from './LoadingList.vue'
import MessageItem from './MessageItem.vue'
import MessageItemForSession from './MessageItemForSession.vue'
import BroadcastChatHeader from '@/components/BroadcastChatHeader.vue'
import BroadcastChatHeaderBack from '@/components/BroadcastChatHeaderBack.vue'
import { openLoading, sleep } from '@/utils/util'
import { useUserStore } from '@/stores/user'
import Publish from '@/views/buzz/components/Publish.vue'
import { IsEncrypt, NodeName, ChatChain } from '@/enum'
import { decrypt } from '@/utils/crypto'
import { ShareChatMessageData } from '@/@types/common'
import { useBulidTx } from '@/hooks/use-build-tx'
import { isMobile } from '@/stores/root'
import { Bottom } from '@element-plus/icons-vue'
import { storeToRefs } from 'pinia'
import { VITE_ADDRESS_HOST } from '@/config/app-config'

const isLoadingTop = ref(false) // 控制顶部加载器
const isNoMoreTop = ref(false) // 控制顶部没有更多数据
const isLoadingBottom = ref(false) // 控制底部加载器
const isNoMoreBottom = ref(false) // 控制底部没有更多数据
const listContainer = ref<HTMLElement | null>(null)
const bottomSpacer = ref<HTMLElement | null>(null)
const listWrapper = ref<HTMLElement | null>(null)
const lastScrollTop = ref(0) // 记录上一次滚动位置
const touchStartY = ref(0) // 记录触摸开始位置
const user = useUserStore()
const simpleTalk = useSimpleTalkStore()
const layout = useLayoutStore()
const isShowPublish = ref(false)
const repostBuzzTxId = ref('')
const PublishRef = ref()
const buildTx = useBulidTx()
const messagesScroll = ref<HTMLElement>()
const showScrollToBottom = ref(false)

const lastReadIndex = ref(-1)

// 自动滚动相关状态
const isNearBottom = ref(true) // 用户是否在查看最新消息区域
const previousMessageCount = ref(0) // 之前的消息数量，用于检测新消息
const AUTO_SCROLL_THRESHOLD = 150 // 距离底部多少像素以内视为"在底部"
const UNREAD_AUTO_SCROLL_THRESHOLD = 5 // 未读消息数量在此范围内时自动滚动到最新

// 未读@提及相关
const unreadMentions = ref<any[]>([])
const currentMentionIndex = ref(0)

const { activeChannel } = storeToRefs(useSimpleTalkStore())
const props = defineProps({
  isSendRedPacketinProgress: Boolean,
})

// 检查是否为私密群聊且缺少 passwordKey
const isPrivateGroupWithoutPasswordKey = computed(() => {
  const channel = simpleTalk.activeChannel
  if (!channel || channel.type !== 'group') {
    return false
  }

  // 是私密群聊
  const isPrivateGroup = channel.roomJoinType === '100'
  if (!isPrivateGroup) {
    return false
  }

  // 不是创建者
  const isCreator = channel.createdBy === simpleTalk.selfMetaId
  if (isCreator) {
    return false
  }

  // 缺少 passwordKey
  return !channel.passwordKey
})

// 计算未读@提及数量
const unreadMentionCount = computed(() => {
  return simpleTalk.getChannelUnreadMentionCount(simpleTalk.activeChannelId)
})

// 加载未读@提及列表
const loadUnreadMentions = async () => {
  if (!simpleTalk.activeChannelId) return

  try {
    unreadMentions.value = await simpleTalk.getChannelUnreadMentions(simpleTalk.activeChannelId)
    currentMentionIndex.value = 0
    console.log(`📌 加载了 ${unreadMentions.value.length} 条未读@提及`)
  } catch (error) {
    console.error('加载未读@提及失败:', error)
  }
}

// 跳转到下一个未读@提及
const jumpToNextUnreadMention = async () => {
  if (unreadMentions.value.length === 0) {
    await loadUnreadMentions()
  }

  if (unreadMentions.value.length === 0) {
    console.warn('⚠️ 没有未读@提及')
    return
  }

  const mention = unreadMentions.value[currentMentionIndex.value]
  if (!mention) return

  console.log(`📍 跳转到@提及: index=${mention.messageIndex}, id=${mention.id}`)

  // 使用 scrollToIndex 跳转
  scrollToIndex(mention.messageIndex)

  // 标记该提及为已读
  try {
    await simpleTalk.markMentionRead(mention.messageIndex)
    console.log(`✅ @提及 index=${mention.messageIndex} 已标记为已读`)

    // 从本地列表中移除已读的提及
    unreadMentions.value = unreadMentions.value.filter(m => m.id !== mention.id)

    // 重置索引（如果已经是最后一个，回到第一个）
    if (currentMentionIndex.value >= unreadMentions.value.length) {
      currentMentionIndex.value = 0
    }
  } catch (error) {
    console.error('标记@提及已读失败:', error)
    // 即使标记失败，也移动到下一个提及
    currentMentionIndex.value = (currentMentionIndex.value + 1) % unreadMentions.value.length
  }
}

// 消息元素引用和观察器
const messageRefs = ref<Map<number, HTMLElement>>(new Map())
const messageObserver = ref<IntersectionObserver | null>(null)
let observeMessagesTimer: ReturnType<typeof setTimeout> | null = null
let scrollRafId: number | null = null

const scheduleObserveMessages = (delay = 80) => {
  if (observeMessagesTimer) {
    clearTimeout(observeMessagesTimer)
  }
  observeMessagesTimer = setTimeout(() => {
    observeMessages()
    observeMessagesTimer = null
  }, delay)
}
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

const notLoadAll = computed(() => {
  const maxIndex =
    simpleTalk.activeChannelMessages[simpleTalk.activeChannelMessages.length - 1]?.index
  if (
    simpleTalk.activeChannel &&
    simpleTalk.activeChannel.lastMessage &&
    simpleTalk.activeChannel.lastMessage.index &&
    simpleTalk.activeChannel.lastMessage.index - maxIndex > 2
  ) {
    return true
  }
  return false
})

const scrollToMessagesBottom = async () => {
  if (unReadCount.value > 0 || notLoadAll.value) {
    await simpleTalk.loadNewestMessages(simpleTalk.activeChannelId)
    await nextTick()
    await sleep(100)
    if (listContainer.value) {
      listContainer.value.scrollTop = 0
    }
  } else {
    if (listContainer.value) {
      listContainer.value.scrollTop = 0
    }
  }
}

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
          if (
            simpleTalk.activeChannelId &&
            messageIndex >= 0 &&
            !simpleTalk.isSetActiveChannelIdInProgress
          ) {
            // 查找对应的消息对象来获取时间戳
            const message = simpleTalk.activeChannelMessages.find(msg => msg.index === messageIndex)
            const messageTimestamp = message?.timestamp

            // 检查是否是 @ 提及消息，如果是则标记已读
            if (message?.mention && message.mention.includes(simpleTalk.selfMetaId)) {
              simpleTalk
                .markMentionRead(message.index)
                .then(() => {
                  // 从本地未读列表中移除
                  unreadMentions.value = unreadMentions.value.filter(
                    m => m.messageIndex !== messageIndex
                  )
                })
                .catch(err => {
                  console.error('标记@提及已读失败:', err)
                })
            }

            simpleTalk
              .setLastReadIndex(simpleTalk.activeChannelId, messageIndex, messageTimestamp)
              .catch(error => {
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
      // console.log('观察消息元素', element, messageIndex)
      if (element.setAttribute) {
        element.setAttribute('data-message-index', messageIndex.toString())
        messageObserver.value.observe(element)
      } else {
        console.warn('元素不支持 setAttribute 方法:', element, messageIndex)
      }
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
  if (activeChannel.value?.isTemporary) {
    return
  }
  // 防止重复加载
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
  } else {
    if (isPrepending && listWrapper.value && listContainer.value) {
      // 添加新内容后，列表总高度会增加
      const scrollHeightAfter = listWrapper.value.scrollHeight
      // 将滚动条位置设置为新内容的高度，这样旧内容就回到了原来的位置
      listContainer.value.scrollTop = scrollHeightBefore - scrollHeightAfter
    }
  }

  // 更新加载状态

  setTimeout(() => {
    isLoadingTop.value = false
    isLoadingBottom.value = false
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
    const count = activeChannel.value.lastMessage.index - activeChannel.value.lastReadIndex
    // 如果未读消息数量在阈值范围内（<=5条），不显示未读数Badge，直接滚动到底部
    if (count >= 0 && count <= UNREAD_AUTO_SCROLL_THRESHOLD) {
      return 0
    }
    return count
  }
  return 0
})

/**
 * 滚动事件处理
 */
const handleScroll = (event: Event) => {
  const container = event.target as HTMLElement
  if (!container) return

  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId)
  }
  scrollRafId = requestAnimationFrame(() => {
    try {
      // 检查是否滚动到顶部
      if (Math.abs(container.scrollTop) < 50) {
        if (!isNoMoreBottom.value && !isLoadingBottom.value) {
          loadItems(true) // true 表示上滑加载
          scrollRafId = null
          return
        }
      }

      // 更新是否在底部的状态（用于自动滚动判断）
      // 由于使用 flex-direction: column-reverse，scrollTop=0 表示在底部
      isNearBottom.value = Math.abs(container.scrollTop) < AUTO_SCROLL_THRESHOLD
      showScrollToBottom.value = Math.abs(container.scrollTop) > 500

      // 检查是否滚动到底部
      const threshold = 200 // 预加载阈值
      if (
        container.scrollHeight - Math.abs(container.scrollTop) - container.clientHeight <
        threshold
      ) {
        loadItems(false).catch(error => {
          console.error('加载更多数据失败:', error)
        })
      }
    } catch (error) {
      console.error('滚动事件处理失败:', error)
    } finally {
      scrollRafId = null
    }
  })
}

/**
 * 鼠标滚轮事件处理
 */
const handleWheel = (event: WheelEvent) => {
  const container = listContainer.value
  if (!container) return

  // deltaY > 0 表示向下滚动（显示更旧消息），deltaY < 0 表示向上滚动（显示更新消息）
  if (event.deltaY > 0 && Math.abs(container.scrollTop) < 10) {
    if (!isNoMoreBottom.value && !isLoadingBottom.value) {
      loadItems(true) // 加载最新消息
    }
  }
}

/**
 * 触摸开始事件处理
 */
const handleTouchStart = (event: TouchEvent) => {
  if (event.touches.length > 0) {
    touchStartY.value = event.touches[0].clientY
  }
}

/**
 * 触摸移动事件处理
 */
const handleTouchMove = (event: TouchEvent) => {
  const container = listContainer.value
  if (!container || event.touches.length === 0) return

  const currentY = event.touches[0].clientY
  const deltaY = currentY - touchStartY.value

  // deltaY > 0 表示向下滑动（下拉），在顶部附近时触发加载最新消息
  if (deltaY < 0 && Math.abs(container.scrollTop) < 10) {
    if (!isNoMoreBottom.value && !isLoadingBottom.value) {
      loadItems(true) // 加载最新消息
    }
  }
}

// 自动初始化 simple-talk
const autoInitSimpleTalk = async () => {
  if (!user.isAuthorized) {
    return
  }
  try {
    await simpleTalk.ensureInitialized()
  } catch (error) {
    console.error('❌ MessageList simple-talk 初始化失败:', error)
  }
}

// 全局点击监听器，用于隐藏消息菜单 - 已移除 talk store 依赖
const handleGlobalClick = (event: MouseEvent) => {
  // 功能已简化，不再处理消息菜单
  // 如果需要，可以通过 simpleTalk 或其他方式实现
}

// 超时保护：防止 isSetActiveChannelIdInProgress 卡住
let progressTimeoutId: ReturnType<typeof setTimeout> | null = null
const setupProgressTimeout = () => {
  // 清除之前的超时
  if (progressTimeoutId) {
    clearTimeout(progressTimeoutId)
  }
  // 设置新的超时保护（10秒后强制重置状态）
  if (simpleTalk.isSetActiveChannelIdInProgress) {
    progressTimeoutId = setTimeout(() => {
      if (simpleTalk.isSetActiveChannelIdInProgress) {
        console.warn('⚠️ isSetActiveChannelIdInProgress 超时，强制重置状态')
        simpleTalk.setActiveChannelIdInProgress(false)
      }
    }, 10000)
  }
}

// 监听状态变化，设置超时保护
watch(
  () => simpleTalk.isSetActiveChannelIdInProgress,
  isInProgress => {
    if (isInProgress) {
      setupProgressTimeout()
    } else if (progressTimeoutId) {
      clearTimeout(progressTimeoutId)
      progressTimeoutId = null
    }
  },
  { immediate: true }
)

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

watch(
  () => simpleTalk.isSendRedPacketinProgress,
  async (newVal, oldVal) => {
    if (!newVal && oldVal !== undefined) {
      try {
        scrollToMessagesBottom()
      } catch (error) {
        console.error(error)
      }
    }
  },
  { immediate: true, flush: 'post' }
)

// 监听 isSetActiveChannelIdInProgress 状态变化，当有消息时滚动到最后已读位置
watch(
  [() => simpleTalk.isSetActiveChannelIdInProgress, () => simpleTalk.activeChannelMessages.length],
  async ([isInProgress, messagesLength]) => {
    // 如果不在切换中，直接返回
    if (!isInProgress) {
      return
    }

    // 重置 isNearBottom 状态，因为切换了频道
    isNearBottom.value = true
    previousMessageCount.value = messagesLength

    // 有消息且有 lastReadIndex，执行滚动逻辑
    if (messagesLength > 0 && simpleTalk.activeChannel?.lastReadIndex !== undefined) {
      const lastMsgIndex = simpleTalk.activeChannel.lastMessage?.index ?? 0
      const lastRead = simpleTalk.activeChannel.lastReadIndex ?? 0
      const unreadCount = lastMsgIndex - lastRead

      // 如果未读消息数量在阈值范围内（1-5条），直接滚动到最新
      if (unreadCount >= 0 && unreadCount <= UNREAD_AUTO_SCROLL_THRESHOLD) {
        lastReadIndex.value = -1 // 不显示未读分隔线

        await nextTick()
        setTimeout(() => {
          if (listContainer.value) {
            listContainer.value.scrollTop = 0
          }
          simpleTalk.setActiveChannelIdInProgress(false)
          scheduleObserveMessages()
        }, 200)
        return
      }

      // 未读消息超过阈值，滚动到最后已读位置
      try {
        lastReadIndex.value = lastRead
      } catch (e) {
        console.error('设置 lastReadIndex 失败:', e)
        lastReadIndex.value = 0
      }

      await nextTick()

      // 等待一小段时间确保DOM完全渲染
      setTimeout(() => {
        // 查找最后已读消息对应的元素
        const targetElement = messageRefs.value.get(lastReadIndex.value + 1)
        if (lastReadIndex.value !== 0 && targetElement && listContainer.value) {
          // 计算目标元素相对于容器的位置
          const containerRect = listContainer.value.getBoundingClientRect()
          const targetRect = targetElement.getBoundingClientRect()

          // 计算需要滚动的距离
          const scrollOffset = targetRect.top - containerRect.top + listContainer.value.scrollTop

          listContainer.value.scrollTop = scrollOffset - 100 // 预留100px的偏移量，确保消息可见
        } else {
          if (listContainer.value) {
            listContainer.value.scrollTop = 0
          }
        }
        // 设置切换完成状态
        simpleTalk.setActiveChannelIdInProgress(false)
        scheduleObserveMessages()
      }, 200) // 等待200ms确保DOM渲染完成
    } else if (messagesLength > 0) {
      // 有消息但 lastReadIndex 未定义，滚动到底部并重置状态
      lastReadIndex.value = -1
      await nextTick()
      setTimeout(() => {
        if (listContainer.value) {
          listContainer.value.scrollTop = 0
        }
        simpleTalk.setActiveChannelIdInProgress(false)
        scheduleObserveMessages()
      }, 200)
    }
  },
  { immediate: true }
)

const messageListWatchKey = computed(() => {
  const messages = simpleTalk.activeChannelMessages
  const first = messages[0]
  const last = messages[messages.length - 1]
  return `${simpleTalk.activeChannelId}:${messages.length}:${first?.txId || first?.mockId || ''}:${last?.txId || last?.mockId || ''}`
})

// 监听消息变化，确保在有消息时滚动到底部
watch(
  () => messageListWatchKey.value,
  () => {
    const simpleMessages = simpleTalk.activeChannelMessages
    const hasMessages = simpleMessages.length > 0
    const currentMessageCount = simpleMessages.length
    const isNewMessageAdded = currentMessageCount > previousMessageCount.value

    // 更新之前的消息数量
    previousMessageCount.value = currentMessageCount

    if (!hasMessages) {
      return
    }

    nextTick(() => {
      // 延迟执行，确保DOM已更新
      setTimeout(() => {
        scheduleObserveMessages(0)

        // 如果有新消息且用户在查看最新区域，自动滚动到最新
        if (isNewMessageAdded && isNearBottom.value && listContainer.value) {
          listContainer.value.scrollTop = 0
        }
      }, 80)
    })
  },
  { immediate: true }
)

// 监听活动频道变化，重新加载未读@提及
watch(
  () => simpleTalk.activeChannelId,
  async newChannelId => {
    if (newChannelId) {
      await loadUnreadMentions()
    }
  },
  { immediate: true }
)

// 监听 lastReadIndex 变化，用户阅读消息后隐藏未读分

onUnmounted(() => {
  if (isMobile) {
    document.removeEventListener('click', handleGlobalClick)
  }

  if (scrollRafId !== null) {
    cancelAnimationFrame(scrollRafId)
    scrollRafId = null
  }

  if (observeMessagesTimer) {
    clearTimeout(observeMessagesTimer)
    observeMessagesTimer = null
  }

  // 清理超时保护
  if (progressTimeoutId) {
    clearTimeout(progressTimeoutId)
    progressTimeoutId = null
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

// watchEffect(async () => {
//   if (!simpleTalk.isSendRedPacketinProgress) {
//     try {
//       scrollToMessagesBottom()
//     } catch (error) {
//       console.log(error)
//     }
//   }
// })

// 监听消息变化，确保在有消息时滚动到底部

function scrollToIndex(index: number) {
  // 根据消息索引滚动到对应位置
  const targetElement = messageRefs.value.get(index)
  if (targetElement && listContainer.value) {
    console.log('targetElement', targetElement, index)
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

    simpleTalk
      .loadMessageByIndex(index)
      .then(() => {
        loadItems(true)
      })
      .catch(error => {
        console.error('加载指定索引消息失败:', error)
      })
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
    path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${
      NodeName.ShareChatMessage
    }`,
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
.mask {
  position: absolute;
  top: 50px;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 29;
}

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
  right: 16px;
  bottom: 16px;
  z-index: 50;
}

/* 滚动到@提及按钮 */
.scroll-to-mention-button {
  position: absolute;
  right: 16px;
  bottom: 76px; /* 在滚动到底部按钮上方 60px（按钮高度）+ 16px（间距） */
  z-index: 50;
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
