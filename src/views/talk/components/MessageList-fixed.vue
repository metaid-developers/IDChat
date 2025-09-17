<template>
  <div class="h-full overflow-y-hidden" v-show="layout.isShowMessagesLoading">
    <LoadingList />
  </div>

  <div
    class="h-full"
    v-show="!layout.isShowMessagesLoading"
  >
    <div v-if="_welComePage && layout.showWelcomeDescView">
      <div class="mt-20 px-1 flex text-center  items-center justify-center flex-col">
        <div class="text-3xl">MetaSo Chat</div>
        await new Promise(resolve => {
          requestAnimatioconst handleScroll = async () => {
  if (!user.isAuthorized || loadingMore.value || layout.isShowMessagesLoading) return
  
  const scrollContainer = messagesScroll.value
  if (!scrollContainer) return
  
  // 检测是否滚动到顶部（距离顶部小于100px时开始加载）
  if (scrollContainer.scrollTop < 100) {
    console.log('📄 滚动到顶部，开始加载更多历史消息...')
    
    // 记录当前滚动位置和参考点
    const beforeScrollHeight = scrollContainer.scrollHeight
    const beforeScrollTop = scrollContainer.scrollTop
    
    loadingMore.value = true
    
    try {
      // 使用 simple-talk store 加载更多消息
      const hasMore = await simpleTalk.loadMoreMessages(
        simpleTalk.activeChannelId,
        preTime.value || undefined
      )
      
      if (hasMore) {
        // 更新最早消息时间戳
        const currentMessages = simpleTalk.activeChannelMessages
        if (currentMessages.length > 0) {
          const earliestMessage = currentMessages[currentMessages.length - 1]
          preTime.value = earliestMessage.timestamp
        }
        
        // 等待DOM更新完成
        await nextTick()
        
        // 计算新的滚动位置以保持用户看到的内容
        requestAnimationFrame(() => {
          const afterScrollHeight = scrollContainer.scrollHeight
          const heightDiff = afterScrollHeight - beforeScrollHeight
          
          if (heightDiff > 0) {
            // 调整滚动位置，保持相对位置不变
            scrollContainer.scrollTop = beforeScrollTop + heightDiff
            console.log(`📐 调整滚动位置: ${beforeScrollTop} -> ${scrollContainer.scrollTop}`)
          }
        })
      } else {
        console.log('📭 没有更多历史消息')
      }
    } catch (error) {
      console.error('❌ 加载消息失败:', error)
    } finally {
      loadingMore.value = false
    }
  }
}       requestAnimationFrame(() => {
              const newRect = anchorElement!.getBoundingClientRect()
              const scrollAdjustment = newRect.top - anchorOffsetTop
              
              console.log(`📍 锚点位置变化: ${anchorOffsetTop} -> ${newRect.top}, 调整: ${scrollAdjustment}`)
              
              if (Math.abs(scrollAdjustment) > 5) {
                scrollContainer.scrollTop += scrollAdjustment
                console.log(`📍 已调整滚动位置: +${scrollAdjustment}`)
              }
              resolve(undefined)
            })
          })
        })
      } else {
        console.log(`⚠️ 未找到合适的锚点消息，使用备用方案`)
        // 备用方案：简单地尝试保持在顶部附近
        setTimeout(() => {
          scrollContainer.scrollTop = 200
        }, 100)
      }
      
      loadingMore.value = false
    }
  }
}k">MetaSo Chat</div>
        <div class="text-lg text-zinc-500 mt-3 break-all">
          A Messaging Service Built on Bitcoin and its Sidechains
        </div>
        <div class="text-xl mt-5 text-zinc-600 break-all ">
          Fully Decentralized,Immutable,Uncensorable,and Unhackable
        </div>
        <!-- <div class="flex flex-col mt-5">
          <div class="font-medium flex flex-row items-center text-lg">
            <span>{{ $t('link.metaid.group') }}</span
            ><el-icon><CaretBottom /></el-icon>
          </div>
          <a class="main-border mt-5 text-lg primary p-3" @click="toMetaIdGrop">{{
            $t('MetaID.official_group')
          }}</a>
        </div> -->
      </div>
    </div>

    <!-- 使用虚拟滚动列表 -->
    <div v-else class="h-full">
      <!-- 欢迎消息 -->
      <div
        v-if="hasTooFewMessages && simpleTalk.activeChannel?.type === 'group'"
        class="border-b border-solid border-gray-300 dark:border-gray-600 mb-6 pb-6 pt-2 mx-4"
      >
        <h3 class="text-2xl font-medium text-dark-400 dark:text-gray-200">
          {{
            '😊 ' + $t('Talk.Channel.welcome_message', { channel: simpleTalk.activeChannel?.name })
          }}
        </h3>
        <div class="flex space-x-2 items-center mt-4">
          <p class="text-sm font-thin text-dark-400 dark:text-gray-200 italic">
            {{ $t('Talk.Channel.welcome_start', { channel: simpleTalk.activeChannel?.name }) }}
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

      <!-- 虚拟滚动列表 -->
      <VirtualScrollList
        ref="virtualListRef"
        class="h-full"
        :data-sources="reversedMessages"
        :estimate-size="80"
        :item-class="'message-item'"
        :wrap-class="'messages-container'"
        :is-sticky="true"
        :direction="'vertical'"
        @scroll="handleVirtualScroll"
        @top-reached="handleTopReached"
      >
        <template #default="{ item, index }">
          <!-- 加载更多指示器 -->
          <div v-if="item.isLoadingItem" class="py-4 text-center">
            <LoadingItem />
          </div>
          
          <!-- 群聊消息 -->
          <MessageItem
            v-else-if="simpleTalk.activeChannel?.type === 'group'"
            :message="convertSimpleMessageToMessageItem(item)"
            :key="item.id || item.timestamp"
            v-bind="$attrs"
            @toBuzz="onToBuzz"
            @to-time-stamp="scrollToTimeStamp"
          />
          
          <!-- 私聊消息 -->
          <MessageItemForSession
            v-else
            :message="convertSimpleMessageToSessionItem(item)"
            :key="item.id || item.timestamp"
            v-bind="$attrs"
            @toBuzz="onToBuzz"
            @to-time-stamp="scrollToTimeStamp"
          />
        </template>
      </VirtualScrollList>
    </div>
  </div>

  <Publish v-model="isShowPublish" :repostTxId="repostBuzzTxId" ref="PublishRef" />
</template>

<script setup lang="ts">
import { getChannelMessages,getPrivateChatMessages } from '@/api/talk'
import { useTalkStore } from '@/stores/talk'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import { MessageType } from '@/@types/simple-chat.d'
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
import LoadingItem from './LoadingItem.vue'
import LoadingList from './LoadingList.vue'
import MessageItem from './MessageItem.vue'
import MessageItemForSession from './MessageItemForSession.vue'
import { openLoading, sleep, debounce } from '@/utils/util'
import { useUserStore } from '@/stores/user'
import Publish from '@/views/buzz/components/Publish.vue'
import { IsEncrypt, NodeName, ChatChain } from '@/enum'
import { decrypt } from '@/utils/crypto'
import { ShareChatMessageData } from '@/@types/common'
import { useBulidTx } from '@/hooks/use-build-tx'
import { GroupMessagePollingQueue } from '@/utils/taskQueue'
import { getUserInfoByAddress } from '@/api/man'
import { CaretBottom } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { useConnectionModal } from '@/hooks/use-connection-modal'
import { useChainStore } from '@/stores/chain'
import { isMobile } from '@/stores/root'
const user = useUserStore()
const talk = useTalkStore()
const simpleTalk = useSimpleTalkStore()
const layout = useLayoutStore()
const route = useRoute()

// 将 SimpleMessage 转换为 MessageItem 组件需要的格式
const convertSimpleMessageToMessageItem = (message: any) => {
  return {
    address: message.sender,
    avatarImage: message.senderAvatar || '',
    avatarTxId: '',
    avatarType: '',
    chatType: message.type, // 直接使用服务器返回的 chatType
    content: message.content,
    contentType: message.contentType || 'text/plain',
    data: message.content,
    chain: 'mvc' as 'mvc' | 'btc',
    encryption: message.encryption || '',
    groupId: message.channelId,
    metaId: message.sender,
    metanetId: '',
    nickName: message.senderName,
    params: '',
    protocol: message.protocol || 'SimpleMsg',
    redMetaId: '',
    timestamp: message.timestamp,
    txId: message.id,
    pinId: message.id,
    replyTx: message.replyTo || '', // 回复消息ID
    replyInfo: message.replyInfo, // 完整的回复信息
    userInfo: {
      metaid: message.sender,
      address: message.sender,
      name: message.senderName,
      avatar: message.senderAvatar || '',
      avatarImage: message.senderAvatar || '',
      chatPublicKey: message.senderChatPublicKey || '',
      chatPublicKeyId: ''
    },
    isMock: message.isMock || false
  }
}

// 将 SimpleMessage 转换为 PriviteChatMessageItem 组件需要的格式
const convertSimpleMessageToSessionItem = (message: any) => {
  return {
    from: message.sender,
    fromUserInfo: {
      metaid: message.sender,
      address: message.sender,
      name: message.senderName,
      avatar: message.senderAvatar || '',
      avatarImage: message.senderAvatar || '',
      chatPublicKey: message.senderChatPublicKey || '',
      chatPublicKeyId: ''
    },
    to: simpleTalk.selfMetaId,
    toUserInfo: {
      metaid: simpleTalk.selfMetaId,
      address: simpleTalk.selfMetaId,
      name: user.last?.name || '',
      avatar: user.last?.avatar || '',
      avatarImage: user.last?.avatar || '',
      chatPublicKey: user.last?.chatpubkey || '',
      chatPublicKeyId: ''
    },
    txId: message.id,
    pinId: message.id,
    metaId: message.sender,
    address: message.sender,
    nickName: message.senderName,
    protocol: 'SimpleMsg',
    contentType: 'text/plain',
    content: message.content,
    timestamp: message.timestamp,
    encryption: '',
    chatType: message.type === MessageType.msg ? '0' : '3',
    data: message.content,
    avatarImage: message.senderAvatar || '',
    avatarTxId: '',
    avatarType: '',
    replyPin: '',
    redMetaId: '',
    params: '',
    chain: 'mvc' as 'mvc' | 'btc',
    metanetId: '',
    blockHeight: 0,
    index: 0,
    userInfo: {
      metaid: message.sender,
      address: message.sender,  
      name: message.senderName,
      avatar: message.senderAvatar || '',
      avatarImage: message.senderAvatar || '',
      chatPublicKey: message.senderChatPublicKey || '',
      chatPublicKeyId: ''
    },
    isMock: message.isMock || false
  }
}
const MetaIdUrl = `${location.origin}/talk/channels/public/396809572f936c66979755477b15ae9adfe9fae119bdabb8f3ffb9a362a176d0i0`
const loadingMore = ref(false)
const isAtTop = ref(false)
const router = useRouter()
const isShowPublish = ref(false)
const chainStore = useChainStore()
const repostBuzzTxId = ref('')
const PublishRef = ref()
const buildTx = useBulidTx()
const messagesScroll = ref<HTMLElement>()
const preTime = ref(0)
const { openConnectionModal } = useConnectionModal()
const _welComePage = computed(() => {
  return !simpleTalk.activeChannel || simpleTalk.activeChannelMessages.length === 0
})

// 全局点击监听器，用于隐藏消息菜单
const handleGlobalClick = (event: MouseEvent) => {
  if (!isMobile || !talk.activeMessageMenuId) return

  const target = event.target as Element

  // 检查是否点击了菜单
  const messageMenu = target.closest('.message-menu')

  // 如果点击的是菜单内部，不关闭菜单
  if (messageMenu) {
    console.log('点击了菜单内部，不关闭菜单')
    return
  }

  // 否则关闭菜单
  console.log('点击了菜单外部，关闭菜单')
  talk.clearActiveMessageMenu()
}

// 自动初始化 simple-talk
const autoInitSimpleTalk = async () => {
  console.log('🔍 AutoInit check - User authorized:', user.isAuthorized)
  console.log('🔍 AutoInit check - SimpleTalk initialized:', simpleTalk.isInitialized)
  console.log('🔍 AutoInit check - Current user:', user.last?.metaid)
  console.log('🔍 AutoInit check - Channels count:', simpleTalk.channels.length)
  
  if (user.isAuthorized) {
    if (!simpleTalk.isInitialized) {
      try {
        console.log('� MessageList 正在初始化 simple-talk...')
        await simpleTalk.init()
        console.log('✅ MessageList simple-talk 初始化成功')
        console.log('📊 初始化后频道数量:', simpleTalk.channels.length)
      } catch (error) {
        console.error('❌ MessageList simple-talk 初始化失败:', error)
      }
    } else if (simpleTalk.channels.length === 0) {
      // 如果已初始化但没有频道，强制同步
      console.log('🔄 SimpleTalk已初始化但无频道，强制同步...')
      try {
        await simpleTalk.syncFromServer()
        console.log('✅ 强制同步完成，频道数量:', simpleTalk.channels.length)
      } catch (error) {
        console.error('❌ 强制同步失败:', error)
      }
    } else {
      console.log('✅ SimpleTalk已正常初始化，频道数量:', simpleTalk.channels.length)
    }
  }
}

// 添加和移除全局点击监听器
onMounted(() => {
  // 自动初始化 simple-talk
  autoInitSimpleTalk()
  
  // 监听路由变化，激活对应频道
  const { channelId } = route.params as { channelId: string }
  if (channelId && simpleTalk.isInitialized) {
    console.log('🎯 初始化时激活频道:', channelId)
    simpleTalk.setActiveChannel(channelId)
    
    // 添加详细的频道和消息调试信息
    setTimeout(() => {
      console.log('📊 初始激活频道后的状态:', {
        activeChannelId: simpleTalk.activeChannelId,
        activeChannel: simpleTalk.activeChannel,
        messageCount: simpleTalk.activeChannelMessages.length,
        allChannelsCount: simpleTalk.allChannels.length
      })
    }, 200)
  }
  
  if (isMobile) {
    document.addEventListener('click', handleGlobalClick)
  }
})

// 监听路由参数变化
watch(
  () => route.params.channelId,
  (newChannelId) => {
    if (newChannelId && typeof newChannelId === 'string') {
      console.log('🎯 路由变化，激活频道:', newChannelId)
      if (simpleTalk.isInitialized) {
        simpleTalk.setActiveChannel(newChannelId)
        
        // 添加详细的频道和消息调试信息
        setTimeout(() => {
          console.log('📊 激活频道后的状态:', {
            activeChannelId: simpleTalk.activeChannelId,
            activeChannel: simpleTalk.activeChannel,
            channelExists: !!simpleTalk.activeChannel,
            messageCount: simpleTalk.activeChannelMessages.length,
            messages: simpleTalk.activeChannelMessages.slice(0, 3), // 显示前3条消息
            messageCache: Array.from(simpleTalk.messageCache.entries()).map(([id, msgs]) => ({
              channelId: id,
              messageCount: msgs.length
            }))
          })
        }, 100)
      }
    }
  }
)

onUnmounted(() => {
  
  if (isMobile) {
    document.removeEventListener('click', handleGlobalClick)
  }
})
// const pollingQueue = new GroupMessagePollingQueue(5000);
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

function toMetaIdGrop() {
  if (user.isAuthorized) {
    router.push({
      name: 'talkChannel',
      params: {
        communityId: 'public',
        channelId: '396809572f936c66979755477b15ae9adfe9fae119bdabb8f3ffb9a362a176d0i0',
      },
    })
    // setTimeout(() => {
    //   window.location.reload()
    // }, 2000);
  } else {
    openConnectionModal()
  }
}

const handleScroll = async () => {
  if (!user.isAuthorized) return
  const topAnchor = document.getElementById('topAnchor')
  const scrollContainer = messagesScroll.value
  
  if (topAnchor && scrollContainer) {
    const topAnchorRect = topAnchor.getBoundingClientRect()
    if (topAnchorRect.bottom > -100 && !loadingMore.value && !layout.isShowMessagesLoading) {
      
      console.log(`� 触发分页加载...`)
      
      loadingMore.value = true
      const getMoreRes = await loadMore(preTime.value)
      preTime.value = getMoreRes || preTime.value
      loadingMore.value = false
      
      console.log(`✅ 分页加载完成`)
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
  if (!simpleTalk.activeChannel) return
  
  talk.inviteLink = `${location.origin}/talk/channels/${simpleTalk.activeChannel.type === 'group' ? '#' : '@'}/${simpleTalk.activeChannel.id}`
  talk.invitingChannel = {
    community: talk.activeCommunity,
    channel: {
      id: simpleTalk.activeChannel.id,
      name: simpleTalk.activeChannel.name,
      groupId: simpleTalk.activeChannel.type === 'group' ? simpleTalk.activeChannel.id : '',
    },
  }
  layout.isShowInviteModal = true
}

const loadMore = async (preTimestamp = 0) => {
  if (!simpleTalk.activeChannel || !simpleTalk.selfMetaId) return
  
  console.log('🔄 触发 loadMore，preTimestamp:', preTimestamp)
  
  // 使用 simple-talk store 的分页加载方法
  const hasMore = await simpleTalk.loadMoreMessages(
    simpleTalk.activeChannelId, 
    preTimestamp || undefined
  )
  
  if (hasMore) {
    // 返回新的最早消息时间戳，用于下次分页
    const currentMessages = simpleTalk.activeChannelMessages
    if (currentMessages.length > 0) {
      const earliestMessage = currentMessages[currentMessages.length - 1]
      console.log(`📄 返回最早消息时间戳: ${new Date(earliestMessage.timestamp).toLocaleString()}`)
      return earliestMessage.timestamp
    }
  }
  
  console.log(`📭 没有更多消息，返回原时间戳: ${preTimestamp}`)
  return preTimestamp
}

const hasTooFewMessages = computed(() => {
  if (!simpleTalk.activeChannel) {
    return false
  }
  return simpleTalk.activeChannelMessages.length < 10
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

  console.log('data12313', data)

  const metaidData = {
    body: JSON.stringify(data),
    path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${NodeName.ShareChatMessage}`,
    flag: 'metaid',
    version: '1.0.0',
    operation: 'create',
    contentType: 'application/json',
    encryption: '0',
    encoding: 'utf-8',
  }

  const res = await buildTx.createPin(metaidData, true).catch(error => {
    loading.close()
    ElMessage.error(error.message)
  })

  if (res) {
    loading.close()
    talk.shareToBuzzTxId =
      chainStore.state.currentChain == ChatChain.btc ? res?.revealTxIds[0] : res?.txids[0]
    layout.isShowShareSuccessModal = true
  } else if (res === null) {
    loading.close()
  }
}

function decryptedMessage(message: ChatMessageItem) {
  if(!message) return
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

onUnmounted(() => {
  
  if(messagesScroll.value){
    
     messagesScroll.value?.removeEventListener('scroll', handleScroll)
  }
 
})

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

/* 确保分页加载时滚动平滑 */
#messagesScroll {
  scroll-behavior: auto;
}
</style>
