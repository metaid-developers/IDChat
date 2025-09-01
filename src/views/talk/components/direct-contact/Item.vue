<template>
  <div
    class="p-3 flex w-full items-center space-x-3 overflow-x-hidden lg:hover:bg-gray-200 lg:hover:dark:bg-gray-900 cursor-pointer"
    :class="{ 'bg-gray-200 dark:bg-gray-900': isActive }"
    @click="switchChannel"
  >
    <div class="rounded-3xl w-12 h-12 shrink-0 relative">
      <UserAvatar
        :image="session?.avatarImage"
        :meta-id="session?.metaId || session?.createUserMetaId"
        :name="session?.name"
        :meta-name="''"
        :is-custom="session?.groupId ? true : false"
        class="w-12 h-12 shrink-0 select-none"
        :disabled="true"
      />
       <div
        class="flex items-center justify-center absolute top-[-3px] right-0 rounded-full w-4 h-4 bg-red-500"
        v-if="talk.hasUnreadMessagesOfChannel(session?.groupId || session?.id)"
      >
    
      
    </div>
      
    </div>

    <div class="flex flex-col items-stretch grow space-y-1 overflow-x-hidden">
      <div class="flex relative items-baseline justify-between self-stretch">
        <UserName
          :name="contact.name"
          :meta-name="contact?.metaName"
          :no-tag="true"
          class="mr-2"
          :text-class="'font-medium dark:text-gray-100 max-w-[96PX]'"
        />
       

        <div class="shrink-0  text-dark-250 dark:text-gray-400 text-xs">
          {{lastMsgTimestamp ? formatTimestamp(lastMsgTimestamp, i18n, false) :
            session.timestamp
              ? formatTimestamp(session.timestamp, i18n, false)
              : ''
          }}
        </div>
      </div>
      <!-- <div class="text-xs truncate font-medium max-w-[50PX]">{{session?.newMessages ? session?.newMessages[session?.newMessages?.length -1]?.userInfo?.name : '' }}</div> -->
        <!-- <div class="text-xs truncate font-medium max-w-[50PX]">{{session?.newMessages ? session?.newMessages[session?.newMessages?.length -1]?.timestamp : '' }}</div> -->
      <div class="text-xs text-dark-300 dark:text-gray-400 truncate max-w-[160PX]">
        {{ lastMessage }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { formatTimestamp, decryptedMessage } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { computed, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { ecdhDecrypt } from '@/utils/crypto'
import {useCredentialsStore} from '@/stores/credentials'
import {useConnectionStore } from '@/stores/connection'
import {atobToHex, containsString} from '@/utils/util'
import { NodeName,IsEncrypt,ChatType } from '@/enum'
import { nextTick } from 'process'
const i18n = useI18n()
const userStore = useUserStore()
const layout = useLayoutStore()
const router = useRouter()
const talk = useTalkStore()
const credentialsStore = useCredentialsStore()
const connectionStore=useConnectionStore()
const imageType = ['jpg', 'jpeg', 'png', 'gif']
const props = defineProps(['session'])

console.log('props.session',props.session)

const contact = computed<any>(() => {
  let contactSide = 'from'
    
  if (userStore.last) {
    const selfMetaId = userStore.last.metaid
    if (props.session.from === selfMetaId || props.session.userInfo?.metaid === selfMetaId) {
      contactSide = 'to'
    }

   
    
  }

  return {
    name: props.session.name || props.session.userInfo?.name ||  props.session[`${contactSide}Name`],
    metaName: props.session[`${contactSide}UserInfo`]?.metaName || '',
    metaId: props.session.id || props.session.userInfo?.metaid || props.session.createUserMetaId,
    lastMessage: props.session.lastMessage,
    lastMessageTimestamp: props.session.lastMessageTimestamp,
  }
})

const lastMessage = computed<string>(() => {
  if (containsString(props.session.protocol,NodeName.SimpleMsg)) {
    return parseTextMessage(decryptedMsg.value)
  }

  return parseTextMessage(decryptedMsg.value) //i18n.t(`Talk.Channel.you_received_a_new_message`)
})


const lastMsgTimestamp=computed(()=>{
  if(props.session?.newMessages?.length){
    return props.session.newMessages[props.session.newMessages.length - 1].timestamp
  }else return props.session.timestamp
})








const decryptedMsg = computed(() => {
  if(!props.session.content){
    return ''
  }
  let content
  let secretKeyStr=props.session.groupId.substring(0,16)
  if(props.session?.newMessages?.length){
    content=props.session.newMessages[props.session.newMessages.length -1].content
   
  }else{
    
    content=props.session.content
  }
  const isSession=Number(props.session.type) === 2 ? true : false
  
  const key=props.session?.newMessages?.length ?  props.session?.newMessages[props.session?.newMessages?.length - 1]?.chatType : props.session?.chatType
   const isImg=props.session?.newMessages?.length ? imageType.includes(props.session?.newMessages[props.session?.newMessages?.length - 1]?.contentType) : props.session?.chatType == ChatType.img ? true : false
    
   if(isImg){
     return `[${i18n.t('new_msg_img')}]`
  }
  switch (key) {
    
    case ChatType.msg:
      
      return decryptedMessage(content,String(IsEncrypt.Yes),'',props.session?.isMock,isSession,secretKeyStr)
    case ChatType.red:
      
      return `🧧 ${content.replace(':','')}`;
    case ChatType.img:
      console.log("有没有进来")
      
      //const protocol=isSession ? NodeName.SimpleFileMsg : NodeName.SimpleFileGroupChat
      return `[${i18n.t('new_msg_img')}]`//decryptedMessage(props.session.content,String(IsEncrypt.Yes),protocol,props.session?.isMock,isSession)
  
   
  }

  //return decryptedMessage(props.session.content,String(IsEncrypt.Yes),)
  // if (props.session.type !== '1') {
  //   return props.session.data.content
  // }

  // // 处理mock的图片消息
  // if (props.session.isMock && containsString(props.session.protocol,NodeName.SimpleFileGroupChat )) {
  //   return props.session.content
  // }

  //    const credential=credentialsStore.getByAddress(connectionStore.last.address)
  //   const sigStr=atobToHex(credential!.signature)
  // // const privateKey = toRaw(userStore?.wallet)!.getPathPrivateKey('0/0')
  // // const privateKeyStr = privateKey.toHex()
  // const otherPublicKeyStr = props.session.publicKeyStr

  // return ecdhDecrypt(props.session.content, sigStr, otherPublicKeyStr)
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
  
  console.log("props.session",props.session)

  if (isActive.value) return
  if(props.session?.groupId){
     router.push(`/talk/channels/public/${props.session?.groupId}`)
  }else{
     router.push(`/talk/@me/${contact.value.metaId}`)
  }
 
}
</script>

<style lang="scss" scoped></style>
