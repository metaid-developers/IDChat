<template>
  <div class="h-full  pb-17.5 lg:pb-20">
    <MessageList @quote="val => (quote.val = val)" ref="MessageListRef" />
  </div>

  <div class="fixed bottom-0 left-0 right-0 px-4 lg:absolute">
    <TheInput
      v-if="type === 'allowed'"
      v-model:quote="quote.val"
      @to-quote="toQuote"
      @scroll-to-bottom="scrollToBottom"
    />
    <TheErrorBox />
  </div>

  <div v-if="type === 'forbidden'" class="fixed bottom-0 left-0 right-0 lg:absolute">
    <MuteInput></MuteInput>
  </div>
  <div v-if="type === 'join'" class="fixed bottom-0 left-0 right-0 lg:absolute">
    <JoinInput></JoinInput>
  </div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, reactive, ref, computed } from 'vue'
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
const simpleTalk = useSimpleTalkStore()
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
    return simpleTalk.activeChannel.isTemporary ? 'join' : 'allowed'
  } else {
    return simpleTalk.activeChannel?.publicKeyStr ? 'allowed' : 'forbidden'
  }
})

provide('Reply', quote)
</script>
