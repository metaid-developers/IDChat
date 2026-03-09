<template>
  <div class="h-full" :style="{ paddingBottom: `${messageListBottomPadding}px` }">
    <MessageList @quote="val => (quote.val = val)" ref="MessageListRef" />
  </div>

  <div
    v-if="type === 'allowed'"
    ref="bottomAreaRef"
    class="fixed bottom-0 left-0 right-0 px-4 pt-4 lg:absolute bg-[#FFFFFF] dark:bg-gray-900"
  >
    <TheInput
      v-model:quote="quote.val"
      @to-quote="toQuote"
      @scroll-to-bottom="scrollToBottom"
    />
    <TheErrorBox />
  </div>

  <div
    v-if="type === 'forbidden'"
    ref="bottomAreaRef"
    class="fixed bottom-0 left-0 right-0 lg:absolute"
  >
    <MuteInput></MuteInput>
  </div>
  <div v-if="type === 'join'" ref="bottomAreaRef" class="fixed bottom-0 left-0 right-0 lg:absolute">
    <JoinInput></JoinInput>
  </div>
</template>

<script lang="ts" setup>
import {
  defineAsyncComponent,
  provide,
  reactive,
  ref,
  computed,
  nextTick,
  onMounted,
  onBeforeUnmount,
  watch,
} from 'vue'
import TheInput from './TheInput.vue'
import MuteInput from './subChannel/MuteInput.vue'
import TheErrorBox from './TheErrorBox.vue'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import JoinInput from './JoinInput.vue'
// import { useTalkStore } from '@/stores/talk'
// const talk = useTalkStore()
const quote: { val: any } = reactive({ val: undefined })
const MessageList = defineAsyncComponent({
  loader: () => import('./MessageList.vue'),
})
const MessageListRef = ref()
const bottomAreaRef = ref<HTMLElement | null>(null)
const simpleTalk = useSimpleTalkStore()
const DEFAULT_BOTTOM_PADDING = 80
const messageListBottomPadding = ref(DEFAULT_BOTTOM_PADDING)
let bottomAreaResizeObserver: ResizeObserver | null = null

function toQuote() {
  MessageListRef.value.scrollToTimeStamp(quote.val!.timestamp)
}

function scrollToBottom() {
  console.log('scrollToBottom')
  MessageListRef.value?.scrollToMessagesBottom()
}

type InputType = 'allowed' | 'join' | 'forbidden'

const type = computed(() => {
  if (simpleTalk.activeChannel?.type === 'sub-group') {
    const role = simpleTalk.getCurrentUserRoleInGroup(simpleTalk.activeChannel!.parentGroupId!)
    return role.isAdmin || role.isCreator || role.isWhitelist ? 'allowed' : 'forbidden'
  } else if (simpleTalk.activeChannel?.type === 'group') {
    // 仅当显式标记为临时频道时展示 Join。
    // 历史数据里 isTemporary 可能缺失，默认应视为可发言。
    const channel = simpleTalk.activeChannel
    const isMember = channel.isTemporary !== true
    return isMember ? 'allowed' : 'join'
  } else {
    return simpleTalk.activeChannel?.publicKeyStr ? 'allowed' : 'forbidden'
  }
})

const keepLatestVisibleOnInputResize = () => {
  MessageListRef.value?.keepLatestVisibleOnInputResize?.()
}

const updateBottomPadding = () => {
  const nextPadding = bottomAreaRef.value?.offsetHeight || DEFAULT_BOTTOM_PADDING
  messageListBottomPadding.value = nextPadding
  nextTick(() => keepLatestVisibleOnInputResize())
}

const bindBottomAreaObserver = async () => {
  await nextTick()

  if (bottomAreaResizeObserver) {
    bottomAreaResizeObserver.disconnect()
    bottomAreaResizeObserver = null
  }

  const target = bottomAreaRef.value
  if (!target) {
    messageListBottomPadding.value = DEFAULT_BOTTOM_PADDING
    return
  }

  updateBottomPadding()

  bottomAreaResizeObserver = new ResizeObserver(() => {
    updateBottomPadding()
  })
  bottomAreaResizeObserver.observe(target)
}

watch(type, () => {
  bindBottomAreaObserver()
})

onMounted(() => {
  bindBottomAreaObserver()
})

onBeforeUnmount(() => {
  if (bottomAreaResizeObserver) {
    bottomAreaResizeObserver.disconnect()
    bottomAreaResizeObserver = null
  }
})

provide('Reply', quote)
</script>
