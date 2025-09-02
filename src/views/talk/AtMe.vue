<template>
  <div class="relative fullscreen lg:flex text-base">
    <DirectContactList />

    <div class="lg:grow lg:h-screen lg:relative lg:flex">
      <AtMeHeader />

      <div
        class="pt-12 pb-17.5 fullscreen lg:relative w-full bg-dark-200 dark:bg-gray-900 lg:pt-15 lg:pb-20"
      >
        <div class="h-full">
          <MessageList @quote="val => (quote.val = val)" ref="MessageListRef" />
        </div>

        <div class="fixed bottom-0 left-0 right-0 px-4 lg:absolute">
          <TheInput v-model:quote="quote.val" @to-quote="toQuote" />
          <TheErrorBox />
        </div>
      </div>

      <DirectContactInfo />
    </div>
    <CreatePublicChannelModal v-if="layout.isShowCreatePublicChannelModal" />
    <InviteModal v-if="layout.isShowInviteModal" />
  </div>
</template>

<script setup lang="ts">
import { useTalkStore } from '@/stores/talk'
import { defineAsyncComponent, onBeforeUnmount, onMounted, onUnmounted, provide, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DirectContactList from './components/direct-contact/List.vue'
import DirectContactInfo from './components/direct-contact/Info.vue'
import AtMeHeader from './components/AtMeHeader.vue'
import TheInput from './components/TheInput.vue'
import TheErrorBox from './components/TheErrorBox.vue'
import { useLayoutStore } from '@/stores/layout'
import CreatePublicChannelModal from './components/modals/CreatePublicChannelModal.vue'
import InviteModal from './components/modals/invite/Invite.vue'
const MessageList = defineAsyncComponent({
  loader: () => import('./components/MessageList.vue'),
})

const route = useRoute()
const talk = useTalkStore()
const router = useRouter()
const layout = useLayoutStore()
const MessageListRef = ref()
debugger
const { channelId } = route.params

const quote: { val: any } = reactive({ val: undefined })

function toQuote() {
  MessageListRef.value.scrollToTimeStamp(quote.val!.timestamp)
}



provide('Reply', quote)
onMounted(async () => {
  layout.isShowUserInfo = false
  debugger
  await talk.initCommunity('@me')
  
  //await talk.initCommunity('c3085ccabe5f4320ccb638d40b16f11fea267fb051f360a994305108b16854cd')

  // 如果是私聊且没有会话，则跳转至虚空页
  // if (talk.activeCommunityChannels.length === 0) {
  //   router.push('/talk/channels/public/welcome')
  //   return
  // }

  await talk.initChannel('@me', channelId as string)
  console.log("有没有进来这个页面",111111)
  
  await talk.initChannelMessages(talk.selfMetaId)
})

onUnmounted(()=>{
    talk.resetCurrentChannel()
  talk.saveReadPointers()
  talk.closeReadPointerTimer()
})
// onBeforeUnmount(() => {
//   debugger
//   talk.resetCurrentChannel()
//   talk.saveReadPointers()
//   talk.closeReadPointerTimer()
// })
</script>
