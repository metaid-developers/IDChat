<template>
  <div
    class="p-3 flex w-full max-w-[100vw] items-center space-x-3 overflow-x-hidden lg:hover:bg-gray-200 lg:hover:dark:bg-gray-900 cursor-pointer"
    :class="{ 'bg-gray-200 dark:bg-gray-900': isActive }"
    @click="switchChannel"
  >
    <div class="rounded-3xl w-12 h-12 shrink-0  relative">
   
      <ChatIcon
         v-if="session?.groupId"
        :src="session?.roomIcon"
        :alt="session?.name"
       
        :customClass="'w-12 h-12 rounded-full'"
      />
         <UserAvatar
      v-else
        :image="session?.avatarImage || session?.userInfo?.avatarImage"
        :meta-id="session?.metaId || session?.createUserMetaId"
        :name="session?.name"
        :meta-name="''"
        :is-custom="session?.groupId ? true : false"
        class="w-12 h-12 shrink-0 select-none"
        :disabled="true" />
      <div
        class="flex items-center justify-center absolute top-[-3px] right-0 rounded-full w-4 h-4 bg-red-500"
        v-if="talk.hasUnreadMessagesOfChannel(session?.groupId || session?.id)"
      ></div>
    </div>

    <div class="flex flex-col items-stretch grow space-y-1 overflow-x-hidden">
      <div class="flex relative items-baseline justify-between self-stretch">
        <div class="flex items-center justify-center">
        
            <Icon
        name="group_chat_1"
         v-show="!contact.isPrivateChat"
        class="w-[20PX] h-[15PX] mr-1 shrink-0 text-gray-500 dark:text-white"
         
      />
        <UserName
          :name="contact.name"
          :meta-name="contact?.metaName"
          :no-tag="true"
          class="mr-2"
          :text-class="'font-medium dark:text-gray-100 max-w-[200px] truncate'"
        />
        </div>

        <div class="shrink-0  text-dark-250 dark:text-gray-400 text-xs">
          {{
            lastMsgTimestamp
              ? formatTimestamp(lastMsgTimestamp, i18n, false)
              : session.timestamp
              ? formatTimestamp(session.timestamp, i18n, false)
              : ''
          }}
        </div>
      </div>
      <!-- <div class="text-xs truncate font-medium max-w-[50PX]">{{session?.newMessages ? session?.newMessages[session?.newMessages?.length -1]?.userInfo?.name : '' }}</div> -->
      <!-- <div class="text-xs truncate font-medium max-w-[50PX]">{{session?.newMessages ? session?.newMessages[session?.newMessages?.length -1]?.timestamp : '' }}</div> -->
      <div class="text-xs flex items-center truncate max-w-fit ">
        
        <div v-if="!contact.isPrivateChat && lastMessage" class="text-dark-800  dark:text-gray-500 font-medium"><UserName :name="lastMessageUsername" :meta-name="''" />&nbsp;:&nbsp;</div>
        
        <span v-if="!lastMessage">&nbsp;</span>
        <span v-else class="text-dark-300 dark:text-gray-400 truncate"> {{ lastMessage || '' }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'DirectContactItem',
})
</script>

<script lang="ts" setup>
import { formatTimestamp, decryptedMessage } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { computed, toRaw, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { ecdhDecrypt } from '@/utils/crypto'
import { useCredentialsStore } from '@/stores/credentials'
import { useConnectionStore } from '@/stores/connection'
import { atobToHex, containsString } from '@/utils/util'
import { NodeName, IsEncrypt, ChatType,ChannelType } from '@/enum'
import { nextTick } from 'process'
import { storeToRefs } from 'pinia'

const i18n = useI18n()
const userStore = useUserStore()
const layout = useLayoutStore()
const router = useRouter()
const talk = useTalkStore()
const credentialsStore = useCredentialsStore()
const connectionStore = useConnectionStore()
const imageType = ['jpg', 'jpeg', 'png', 'gif']
const props = defineProps(['session'])

console.log('props.session3333333', props.session)

// 添加防抖机制来减少闪烁
const debouncedLastMessage = ref('')
const debouncedLastMessageUserName=ref('')
const debouncedLastMsgTimestamp = ref(0)
//const debouncedChannelType=ref(true)
//const initBlank=ref(true)
// 使用防抖更新显示内容
watch(
  () => props.session,
  newSession => {
    if (newSession) {
       //initBlank.value=false
      // 延迟更新，避免频繁闪烁
   
        nextTick(()=>{
             //debouncedChannelType.value=computeChannelType(newSession)
             setTimeout(() => {
            
                    debouncedLastMessage.value = computeLastMessage(newSession)
       
        debouncedLastMsgTimestamp.value = computeLastMsgTimestamp(newSession)
       
          debouncedLastMessageUserName.value=computeLastMessageUserName(newSession)
             
      }, 200)
     
        })
    }
  },
  { immediate: true, deep: true }
)



const contact = computed<any>(() => {
  let contactSide = 'from'
  console.log("props.sessionprops.session1212121212121333",props.session)
  if (userStore.last) {
    const selfMetaId = userStore.last.metaid
    if (props.session.from === selfMetaId || props.session.userInfo?.metaid === selfMetaId) {
      contactSide = 'to'
    }
  }

  return {
    name: props.session.name || props.session.userInfo?.name || props.session[`${contactSide}Name`],
    metaName: props.session[`${contactSide}UserInfo`]?.metaName || '',
    metaId: props.session.id || props.session.userInfo?.metaid || props.session.createUserMetaId,
    lastMessage: props.session.lastMessage,
    lastMessageTimestamp: props.session.lastMessageTimestamp,
    isPrivateChat:Number(props.session.type) == 2 ? true : false
  }
})

const lastMessage = computed<string>(() => {
  return debouncedLastMessage.value || ''
})

const lastMessageUsername=computed<string>(() => {
  return debouncedLastMessageUserName.value
})

// const isPrivateChat = computed(() => {
//   return debouncedChannelType.value
// })

const lastMsgTimestamp = computed(() => {
  return debouncedLastMsgTimestamp.value
})

// 将计算逻辑提取为函数
const computeLastMessage = (session: any): string => {
  if (containsString(session.protocol, NodeName.SimpleMsg)) {
    return parseTextMessage(computeDecryptedMsg(session))
  }

  return parseTextMessage(computeDecryptedMsg(session))
}

const computeLastMessageUserName = (session: any): string => {
    if(session?.newMessages?.length){
     return session?.newMessages[session?.newMessages?.length -1]?.userInfo?.name
    }else{
     return session.userInfo?.name
    }
     
}

// const computeChannelType = (session: any): boolean => {
//  return Number(session?.type) !== 2 ? false : true
// }


const computeLastMsgTimestamp = (session: any): number => {
  if (session?.newMessages?.length) {
    return session.newMessages[session.newMessages.length - 1].timestamp
  } else return session.timestamp
}

const computeDecryptedMsg = (session: any) => {
  try {
    if (!session.content && !session?.newMessages?.length && !session?.newMessages[session?.newMessages?.length - 1]?.content) {
    return ''
  }
  let content
  let secretKeyStr = session.groupId?.substring(0, 16) || ''

  let publicKeyStr = session?.userInfo?.chatPublicKey

  if (session?.newMessages?.length) {
    content = session.newMessages[session.newMessages.length - 1].content
  } else {
    content = session.content
  }
  const isSession = Number(session.type) === 2 ? true : false

  const key = session?.newMessages?.length
    ? session?.newMessages[session?.newMessages?.length - 1]?.chatType
    : session?.chatType
  const isImg = session?.newMessages?.length
    ? imageType.includes(session?.newMessages[session?.newMessages?.length - 1]?.contentType)
    : session?.chatType == ChatType.img
    ? true
    : false

  if (isImg) {
    return `[${i18n.t('new_msg_img')}]`
  }
  switch (key) {
    case ChatType.msg:
      return decryptedMessage(
        content,
        String(IsEncrypt.Yes),
        '',
        session?.isMock,
        isSession,
        secretKeyStr,
        publicKeyStr
      )
    case ChatType.red:
      return `🧧 ${content.replace(':', '')}`
    case ChatType.img:
      console.log('有没有进来')

      //const protocol=isSession ? NodeName.SimpleFileMsg : NodeName.SimpleFileGroupChat
      return `[${i18n.t('new_msg_img')}]` //decryptedMessage(session.content,String(IsEncrypt.Yes),protocol,session?.isMock,isSession)
  }

  //return decryptedMessage(session.content,String(IsEncrypt.Yes),)
  // if (session.type !== '1') {
  //   return session.data.content
  // }

  // 处理mock的图片消息
  // if (session.isMock && containsString(session.protocol,NodeName.SimpleFileGroupChat )) {
  //   return session.content
  // }

  //    const credential=credentialsStore.getByAddress(connectionStore.last.address)
  //   const sigStr=atobToHex(credential!.signature)
  // // const privateKey = toRaw(userStore?.wallet)!.getPathPrivateKey('0/0')
  // // const privateKeyStr = privateKey.toHex()
  // const otherPublicKeyStr = session.publicKeyStr

  // return ecdhDecrypt(session.content, sigStr, otherPublicKeyStr)
  } catch (error) {
    return ''
  }
}

const decryptedMsg = computed(() => {
  return computeDecryptedMsg(props.session)
})

const parseTextMessage = (text: string) => {
  if (typeof text == 'undefined') {
    return ''
  }

  const HTML = /<\/?.+?>/gi
  const COOKIE = /document\.cookie/gi
  const HTTP = /(http|https):\/\//gi
  const re = /(f|ht){1}(tp|tps):\/\/([\w-]+\S)+[\w-]+([\w-?%#&=]*)?(\/[\w- ./?%#&=]*)?/g

  if (HTML.test(text)) {
    return '无效输入,别耍花样!'
  }
  if (COOKIE.test(text)) {
    return '无效输入,你想干嘛!'
  }
  text = text.replace(re, function(url) {
    if (HTTP.test(text)) {
      return `<a href=${url} target="_blank" style="text-decoration: underline;cursor: pointer;" class="url"> ${url} </a>`
    }
    return `<a onClick="window.open('http://${text}','_blank')" style="text-decoration: underline;cursor: pointer;" target="_blank">${text}</a>`
  })
  text = text.replace(/\\n/g, '\n')
  return text.replace(/\n/g, '<br />')
}

const isActive = computed<boolean>(() => {
  const currentChannelId = talk.activeChannelId || router.currentRoute.value.params.channelId

  return currentChannelId === contact.value.metaId
})

const switchChannel = () => {
  layout.$patch({
    isShowLeftNav: false,
  })

  console.log('props.session', props.session)

  if (isActive.value) return
  if (props.session?.groupId) {
    router.push(`/talk/channels/public/${props.session?.groupId}`)
  } else {
    router.push(`/talk/@me/${contact.value.metaId}`)
  }
}
</script>

<style lang="scss" scoped>
.transition-all {
  transition: all 0.2s ease-in-out;
}

* {
  backface-visibility: hidden;
  transform: translateZ(0);
}
</style>
