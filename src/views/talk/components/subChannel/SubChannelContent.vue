<template>
 
     
    <div class="h-full  pb-17.5 lg:pb-20">
    <MessageList @quote="val => (quote.val = val)" ref="MessageListRef" />
  </div>

  <div class="fixed bottom-0 left-0 right-0 px-4 lg:absolute">
    <SubTheInput v-if="mute" v-model:quote="quote.val" @to-quote="toQuote" />
    <TheErrorBox />
  </div>
   
  <div v-if="!mute" class="fixed bottom-0 left-0 right-0 lg:absolute">
    <MuteInput></MuteInput>
  </div>


</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, reactive, ref,computed } from 'vue'
import SubTheInput from './SubTheInput.vue'
import TheErrorBox from '../TheErrorBox.vue'

import MuteInput from './MuteInput.vue'
import { useSimpleTalkStore } from '@/stores/simple-talk'

const quote: { val: any } = reactive({ val: undefined })

const simpleTalk=useSimpleTalkStore()
const MessageList = defineAsyncComponent({
   loader: () => import('./SubMessageList.vue'),
  //loader: () => import('../MessageList.vue'),
})
const MessageListRef = ref()

function toQuote() {
  MessageListRef.value.scrollToTimeStamp(quote.val!.timestamp)
}

const mute=computed(()=>{
  return simpleTalk.getMySpeakingPermission
})
provide('Reply', quote)
</script>
