<template>
  <div class="h-full  pb-17.5 lg:pb-20">
    <MessageList @quote="val => (quote.val = val)" ref="MessageListRef" />
  </div>

  <div class="fixed bottom-0 left-0 right-0 px-4 lg:absolute">
    <TheInput v-if="mute" v-model:quote="quote.val" @to-quote="toQuote" />
    <TheErrorBox />
  </div>

  <div v-if="!mute" class="fixed bottom-0 left-0 right-0 lg:absolute">
    <MuteInput></MuteInput>
  </div>
</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, reactive, ref, computed } from 'vue'
import TheInput from './TheInput.vue'
import MuteInput from './subChannel/MuteInput.vue'
import TheErrorBox from './TheErrorBox.vue'
import { useSimpleTalkStore } from '@/stores/simple-talk'
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

const mute = computed(() => {
  if (simpleTalk.activeChannel?.type === 'sub-group') {
    const role = simpleTalk.getCurrentUserRoleInGroup(simpleTalk.activeChannel!.parentGroupId!)
    return role.isAdmin || role.isCreator || role.isWhitelist
  } else {
    return true
  }
})

provide('Reply', quote)
</script>
