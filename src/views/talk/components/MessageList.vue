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
              :key="item.timestamp"
              :message="item"
              :id="item.timestamp"
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
              :key="item.timestamp"
              :message="item"
              :data-message-mockId="item.mockId || ''"
              :data-message-index="item.index"
              :ref="el => setMessageRef(el, item)"
              @quote="message => emit('quote', message)"
              :id="item.timestamp"
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
  watchEffect,
} from 'vue'
import { useRoute } from 'vue-router'
import LoadingList from './LoadingList.vue'
import MessageItem from './MessageItem.vue'
import MessageItemForSession from './MessageItemForSession.vue'
import UnreadMessagesDivider from './UnreadMessagesDivider.vue'
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
const router = useRouter()
const isShowPublish = ref(false)
const chainStore = useChainStore()
const repostBuzzTxId = ref('')
const PublishRef = ref()
const buildTx = useBulidTx()
const messagesScroll = ref<HTMLElement>()
const route = useRoute()
const showScrollToBottom = ref(false)

const lastReadIndex = ref(-1)

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

  console.log(`📍 跳转到@提及: index=${mention.messageIndex}`)

  // 使用 scrollToIndex 跳转
  scrollToIndex(mention.messageIndex)

  // 移动到下一个提及（循环）
  currentMentionIndex.value = (currentMentionIndex.value + 1) % unreadMentions.value.length
}

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

const notLoadAll = computed(() => {
  const maxIndex =
    simpleTalk.activeChannelMessages[simpleTalk.activeChannelMessages.length - 1]?.index
  console.log('maxIndex', maxIndex, simpleTalk.activeChannel?.lastMessage?.index)
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
    console.log('滚动到底部并加载最新消息', unReadCount.value > 0, notLoadAll.value)
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
            if (message?.mention && message.mention.includes(simpleTalk.selfMetaId)) {
              console.log('包含提及，跳过已读更新', messageIndex)
              simpleTalk.markMentionRead(message.index)
            }

            console.log(
              `📖 消息 ${messageIndex} 进入视图，更新已读索引${
                messageTimestamp ? ` (时间戳: ${new Date(messageTimestamp).toLocaleString()})` : ''
              }`
            )
            simpleTalk
              .setLastReadIndex(simpleTalk.activeChannelId, messageIndex, messageTimestamp)
              .catch(error => {
                console.warn('❌ 更新已读索引失败:', error)
              })
          } else {
            console.log('🎯 频道切换中但无消息，或 lastReadIndex 未定义，跳过更新已读索引')
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
    console.log('临时频道不加载消息')
    return
  }
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
  } else {
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
        return
      }
    }
    console.log('container.scrollTop', container.scrollTop)

    if (Math.abs(container.scrollTop) > 500) {
      showScrollToBottom.value = true
    } else {
      showScrollToBottom.value = false
    }

    // 检查是否滚动到底部
    const threshold = 200 // 预加载阈值
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

/**
 * 鼠标滚轮事件处理
 */
const handleWheel = (event: WheelEvent) => {
  const container = listContainer.value
  if (!container) return

  // deltaY > 0 表示向下滚动（显示更旧消息），deltaY < 0 表示向上滚动（显示更新消息）
  if (event.deltaY > 0 && Math.abs(container.scrollTop) < 10) {
    console.log('检测到向下滚动（鼠标滚轮），准备加载最新消息...')
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
    console.log('检测到向下滑动（触摸），准备加载最新消息...')
    if (!isNoMoreBottom.value && !isLoadingBottom.value) {
      loadItems(true) // 加载最新消息
    }
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

watch(
  () => simpleTalk.isSendRedPacketinProgress,
  async (newVal, oldVal) => {
    if (!newVal && oldVal !== undefined) {
      try {
        scrollToMessagesBottom()
      } catch (error) {
        console.log(error)
      }
    }
  },
  { immediate: true, flush: 'post' }
)

// 监听 isSetActiveChannelIdInProgress 状态变化，当有消息时滚动到最后已读位置
watch(
  [() => simpleTalk.isSetActiveChannelIdInProgress, () => simpleTalk.activeChannelMessages.length],
  async ([isInProgress, messagesLength]) => {
    if (
      isInProgress &&
      messagesLength > 0 &&
      simpleTalk.activeChannel?.lastReadIndex !== undefined
    ) {
      console.log(
        '🎯 频道切换中且有消息，准备滚动到最后已读位置:',
        simpleTalk.activeChannel.lastReadIndex
      )
      try {
        lastReadIndex.value =
          simpleTalk.activeChannel.lastMessage?.index - simpleTalk.activeChannel.lastReadIndex <= 5
            ? -1
            : simpleTalk.activeChannel.lastReadIndex
      } catch (e) {
        console.error('设置 lastReadIndex 失败:', e)
        lastReadIndex.value = 0
      }

      // 检查是否有未读消息
      // observeMessages()

      await nextTick()

      // 等待一小段时间确保DOM完全渲染
      setTimeout(() => {
        // 查找最后已读消息对应的元素
        const targetElement = messageRefs.value.get(lastReadIndex.value + 1)
        console.log('targetElement for lastReadIndex', targetElement, lastReadIndex.value)
        if (lastReadIndex.value !== 0 && targetElement && listContainer.value) {
          console.log('📍 找到最后已读消息元素，滚动到位置:', lastReadIndex)

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
        observeMessages()
      }, 200) // 等待200ms确保DOM渲染完成
    } else {
      console.log('🎯 频道切换中但无消息，或 lastReadIndex 未定义，跳过滚动')
    }
  },
  { immediate: true }
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
