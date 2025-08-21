<template>
  <div class="h-full overflow-y-hidden" v-show="layout.isShowMessagesLoading">
    <LoadingList />
  </div>

  <div
    class="h-full overflow-y-auto"
    ref="messagesScroll"
    id="messagesScroll"
    v-show="!layout.isShowMessagesLoading"
  >
  <div v-if="_welComePage">
       <div class="mt-20 flex text-center  items-center justify-center flex-col">
        <div class="text-3xl break-all font-black">MetaSo Chat</div>
        <div class="text-lg text-zinc-500 mt-3 break-all">A Messaging Service Built on Bitcoin and its Sidechains</div>
        <div class="text-xl mt-5 text-zinc-600 break-all ">Fully Decentralized,Immutable,Uncensorable,and Unhackable</div>
        <div class="flex flex-col mt-5"> 
          <div class="font-medium flex flex-row items-center text-lg" :href="MetaIdUrl"><span>{{ $t('link.metaid.group') }}</span><el-icon><CaretBottom /></el-icon></div>
            <a
      class="main-border mt-5 text-lg primary p-3"
      :href="MetaIdUrl"
      >{{ $t('MetaID.official_group') }}</a
    >

        </div>
      </div>
  </div>
    <div class="" v-else>
      <div class="flex flex-col-reverse space-y-2 space-y-reverse">
        <!-- 群聊 -->
        <template v-if="talk.activeChannelType === 'group'">
          <MessageItem
            v-for="message in talk.activeChannel?.pastMessages"
            :message="message"
            :id="message.timestamp"
            v-bind="$attrs"
           
            @toBuzz="onToBuzz"
            @to-time-stamp="time => scrollToTimeStamp(time)"
          
          />
          <div
            class="border-b border-solid border-gray-300 dark:border-gray-600 mb-6 pb-6 pt-2 mx-4"
            v-if="hasTooFewMessages"
          >
            <h3 class="text-2xl font-medium text-dark-400 dark:text-gray-200">
              {{
                '😊 ' + $t('Talk.Channel.welcome_message', { channel: talk.activeChannel?.name })
              }}
            </h3>
            <div class="flex space-x-2 items-center mt-4">
              <p class="text-sm font-thin text-dark-400 dark:text-gray-200 italic">
                {{ $t('Talk.Channel.welcome_start', { channel: talk.activeChannel?.name }) }}
              </p>
              <p>🎉</p>
            </div>

            <div class="flex mt-1 items-center space-x-2">
              <p class="text-sm font-thin text-dark-400 dark:text-gray-200 mt-1 italic">
                {{ $t('Talk.Channel.welcome_invite') }}
              </p>
              <Icon
                name="user_plus"
                class="box-content w-4 h-4 p-1.5 text-dark-400 dark:text-gray-200 mt-1 ml-1 border-2 border-dashed border-dark-250 dark:border-dark-400 rounded-lg cursor-pointer hover:border-solid hover:text-dark-800 hover:dark:text-primary transition-all duration-300"
                @click="popInvite"
              />
            </div>
          </div>
        </template>

        <!-- 私聊 -->
        <template v-else>
          <MessageItemForSession
            v-for="message in talk.activeChannel?.pastMessages"
            :message="message"
            v-bind="$attrs"
            :id="message.timestamp"
            @toBuzz="onToBuzz"
            @to-time-stamp="time => scrollToTimeStamp(time)"
          />
        </template>

        <LoadingItem v-show="loadingMore && !isAtTop" />
        <div class="w-full h-px bg-inherit" id="topAnchor"></div>
      </div>

      <div class="flex flex-col space-y-4 mt-2">
        <template v-if="talk.activeChannelType === 'group'">
          <MessageItem
            v-for="message in talk.activeChannel?.newMessages"
            :message="message"
            :id="message.timestamp"
            v-bind="$attrs"
            @toBuzz="onToBuzz"
            @to-time-stamp="time => scrollToTimeStamp(time)"
          />
        </template>
        <template v-else>
          <MessageItemForSession
            v-for="message in talk.activeChannel?.newMessages"
            :message="message"
            v-bind="$attrs"
            :id="message.timestamp"
            @toBuzz="onToBuzz"
            @to-time-stamp="time => scrollToTimeStamp(time)"
          />
        </template>
      </div>
    </div>
  </div>

  <Publish v-model="isShowPublish" :repostTxId="repostBuzzTxId" ref="PublishRef" />
</template>

<script setup lang="ts">
import { getChannelMessages } from '@/api/talk'
import { useTalkStore } from '@/stores/talk'
import { useLayoutStore } from '@/stores/layout'
import { computed, nextTick, onBeforeUnmount, ref, watch, inject, onMounted } from 'vue'
import LoadingItem from './LoadingItem.vue'
import LoadingList from './LoadingList.vue'
import MessageItem from './MessageItem.vue'
import MessageItemForSession from './MessageItemForSession.vue'
import { openLoading, sleep } from '@/utils/util'
import { useUserStore } from '@/stores/user'
import Publish from '@/views/buzz/components/Publish.vue'
import { IsEncrypt, NodeName } from '@/enum'
import { decrypt } from '@/utils/crypto'
import { ShareChatMessageData } from '@/@types/common'
import {useBulidTx} from '@/hooks/use-build-tx'
import {GroupMessagePollingQueue} from '@/utils/taskQueue'
import { getUserInfoByAddress } from "@/api/man";
import { debounce } from '@/utils/util'
import { CaretBottom } from '@element-plus/icons-vue'
const user = useUserStore()
const talk = useTalkStore()
const layout = useLayoutStore()
const MetaIdUrl=`${location.origin}/talk/channels/public/396809572f936c66979755477b15ae9adfe9fae119bdabb8f3ffb9a362a176d0i0`
const loadingMore = ref(false)
const isAtTop = ref(false)

const isShowPublish = ref(false)
const repostBuzzTxId = ref('')
const PublishRef = ref()
const buildTx=useBulidTx()
const messagesScroll = ref<HTMLElement>()
const preTime=ref(0)
const _welComePage=computed(()=>{
  return talk.showWelcome
})
//const pollingQueue = new GroupMessagePollingQueue(5000);
// const taskInterval=ref()

// onMounted(()=>{

// taskInterval.value= setInterval(()=>{
//    if(talk.activeChannel?.pastMessages.length){
    
//     // const nextTimeStamp= talk.activeChannel?.pastMessages[talk.activeChannel?.pastMessages.length-1].timestamp
//     // 

//     pollingQueue.enqueue(talk.activeChannelId,talk.selfMetaId).then((messages)=>{
//       console.log("messages",messages)
//       if(messages.length){
//            const currentTimeStamp=messages[0].timestamp
//       const talkLastTimeStamp=talk.activeChannel?.pastMessages[0].timestamp
//       if(currentTimeStamp == talkLastTimeStamp){
       
        
//       }else{
//          talk.updateChannelMessages(messages).then()
//         // talk.activeChannel?.pastMessages.unshift(...messages)
//       }
//       }
   
//     })
//   }
//  },5000)

// })

// onBeforeUnmount(()=>{
//   taskInterval.value=null
// })


const handleScroll = async () => {
  if (!user.isAuthorized) return
    // if(isLoadingMore.value === true){
    // return
    // }
  const topAnchor = document.getElementById('topAnchor')
  if (topAnchor) {
    const topAnchorRect = topAnchor.getBoundingClientRect()
    if (topAnchorRect.bottom > -100 && !loadingMore.value && !layout.isShowMessagesLoading) {
      //isLoadingMore.value=true
      loadingMore.value = true
      const getMoreRes= await loadMore(preTime.value)
      preTime.value=getMoreRes
      loadingMore.value = false
      // const preTimestamp=talk.activeChannel?.pastMessages[talk.activeChannel?.pastMessages.length - 1]
      //     console.log("getMoreRes",getMoreRes,preTimestamp)
      //     debugger
      // if(getMoreRes == preTimestamp.timestamp){
      //     isLoadingMore.value=false
      //     loadingMore.value = false
      //     debugger
      // }
    //debugger
      
     
     
    }
  }
}

watch(
  messagesScroll,
  async () => {
    if (messagesScroll.value) {
      await nextTick()
      messagesScroll.value?.addEventListener('scroll', handleScroll)
    }
  },
  { immediate: true }
)

const popInvite = () => {
  talk.inviteLink = `${location.origin}/talk/channels/${talk.activeCommunitySymbol}/${talk.activeChannelId}`
  talk.invitingChannel = {
    community: talk.activeCommunity,
    channel: talk.activeChannel,
  }
  layout.isShowInviteModal = true
}

const loadMore = async (preTimestamp:number=0) => {
  if (!talk.activeChannelId || !talk.selfMetaId) return
  
  const earliestMessage =
    talk.activeChannel?.pastMessages[talk.activeChannel?.pastMessages.length - 1]
  const earliestMessageTimestamp = earliestMessage?.timestamp
  const earliestMessageElement = document.getElementById(earliestMessageTimestamp?.toString() || '')
  
  const earliestMessagePosition = earliestMessageElement?.getBoundingClientRect().bottom
  
  let params
  
  if (earliestMessageTimestamp) {
    params = {
      timestamp: earliestMessageTimestamp,
      timestampType: 0,
      metaId: talk.selfMetaId,
    }
  } else {
    params = {
      metaId: talk.selfMetaId,
    }
  }
  console.log("earliestMessageTimestamp",earliestMessageTimestamp,preTimestamp)
  if(earliestMessageTimestamp == preTimestamp){
    return earliestMessageTimestamp
  }
  let items = await getChannelMessages(
    {
          groupId:talk.activeChannelId,
         metaId: talk.selfMetaId,
         timestamp:params.timestamp ?? '0',

    }
  )

  

  // 如果没有更多消息了，就不再加载
  if (items.length === 0) {
    isAtTop.value = true
    
    return earliestMessageTimestamp
  }




  for (const item of items) {
    console.log("talk.activeChannel.pastMessages",item.txId)
      // const isDuplicate= talk.activeChannel.pastMessages?.find((item: Message) => item.txId === item.txId)

      // debugger
      // if(isDuplicate){
      //   continue
      // }
        
    //  getUserInfoByAddress(item.address).then((userInfo)=>{
    //     item.userInfo=userInfo
    //        if(item.replyInfo){
    //       getUserInfoByAddress(item.replyInfo.address).then((replyUserInfo)=>{
    //         item.replyInfo.userInfo=replyUserInfo
          
    //         talk.activeChannel?.pastMessages.push(item)
    //   }) 
    // }else{
    //       talk.activeChannel?.pastMessages.push(item)
    // }
    // })
    


    
     talk.activeChannel?.pastMessages.push(item)
  }

  // 滚动到原来的位置
  if (earliestMessagePosition) {
    const newEarliestMessageElement = document.getElementById(
      earliestMessageTimestamp?.toString() || ''
    )
    const newEarliestMessagePosition = newEarliestMessageElement?.getBoundingClientRect().bottom
    if (newEarliestMessagePosition) {
      messagesScroll.value?.scrollBy(0, newEarliestMessagePosition - earliestMessagePosition)
    }
  }
  return earliestMessageTimestamp
}

const hasTooFewMessages = computed(() => {
  if (!talk.activeChannel) {
    return false
  }

  if (!talk.activeChannel.pastMessages) {
    return false
  }

  return talk.activeChannel?.pastMessages.length < 10
})

const scrollToMessagesBottom = async (retryCount = 0) => {
  await nextTick()
  const mse: HTMLElement = messagesScroll.value as HTMLElement
  if (mse) {
    mse.scrollTop = mse.scrollHeight
    await sleep(2000)
    mse.scrollTop = mse.scrollHeight
  } else {
    if (retryCount < 5) {
      await nextTick()
      await scrollToMessagesBottom(retryCount + 1)
    }
  }
}

function scrollToTimeStamp(time: number) {
  
  const target = document.getElementById(time.toString())
  if (target) {
    const top = target.offsetTop - target.clientHeight
    messagesScroll.value?.scrollTo({ top })
  }
}

async function onToBuzz(data: ShareChatMessageData) {
  const loading = openLoading()

  console.log("data12313",data)

    const metaidData={
    body:JSON.stringify(data),
    path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${NodeName.ShareChatMessage}`,
    flag: 'metaid',
    version: '1.0.0',
    operation: 'create',
    contentType:'application/json',
    encryption: '0',
    encoding: 'utf-8',
    }
      
      
 const res= await buildTx.createPin(metaidData,true).catch(error => {
      loading.close()
      ElMessage.error(error.message)
    })
 
   
  if (res) {
    loading.close()
    talk.shareToBuzzTxId = res.txids[0]
    layout.isShowShareSuccessModal = true
  } else if (res === null) {
    loading.close()
  }
}

function decryptedMessage(message: ChatMessageItem) {
  if (message.encryption === '0') {
    return message.content
  }

  if (message.protocol !== 'simpleGroupChat' && message.protocol !== 'SimpleFileGroupChat') {
    return message.content
  }

  // 处理mock的图片消息
  if (message.isMock && message.protocol === 'SimpleFileGroupChat') {
    return message.content
  }

  return decrypt(message.content, talk.activeChannelId.substring(0, 16))
}

watch(
  () => talk.newMessages,
  async () => {
    // 依据滚动状态，如果当前距离底部的距离超过一屏，则说明在阅读历史消息，不需要滚动到底部
    if (messagesScroll.value && talk.activeChannel?.newMessages) {
      const mse: HTMLElement = messagesScroll.value as HTMLElement
      const disFromBottom = mse.scrollHeight - mse.scrollTop - mse.clientHeight // 滚动元素的总高度 - 滚动元素的离顶部距离 - 滚动元素的可视高度

      // 还要判断是不是用户自己发的消息
      const lastMessage =
        talk.activeChannel?.newMessages[talk.activeChannel?.newMessages.length - 1]
      const isMyMessage = lastMessage?.metaId === talk.selfMetaId
      
      if (disFromBottom > mse.clientHeight && !isMyMessage) {
        return
      }
    }

    await scrollToMessagesBottom()
  },
  { deep: true, immediate: true }
)

defineExpose({
  scrollToTimeStamp,
})

onBeforeUnmount(() => {
  messagesScroll.value?.removeEventListener('scroll', handleScroll)
})
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
</style>
