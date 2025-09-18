<template>
 
     
    <div class="h-full  pb-17.5 lg:pb-20">
    <MessageList @quote="val => (quote.val = val)" ref="MessageListRef" />
  </div>

  <div class="fixed bottom-0 left-0 right-0 px-4 lg:absolute" v-if="!talk.isShowWelcome">
    <SubTheInput v-model:quote="quote.val" @to-quote="toQuote" />
    <TheErrorBox />
  </div>
   


</template>

<script lang="ts" setup>
import { defineAsyncComponent, provide, reactive, ref } from 'vue'
import SubTheInput from './SubTheInput.vue'
import TheErrorBox from '../TheErrorBox.vue'

import { useTalkStore } from '@/stores/talk'
const talk = useTalkStore()
const quote: { val: any } = reactive({ val: undefined })
const MessageList = defineAsyncComponent({
   loader: () => import('./SubMessageList.vue'),
  //loader: () => import('../MessageList.vue'),
})
const MessageListRef = ref()

function toQuote() {
  MessageListRef.value.scrollToTimeStamp(quote.val!.timestamp)
}

provide('Reply', quote)
</script>
