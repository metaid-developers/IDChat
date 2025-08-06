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
        :meta-name="session?.metaName"
        class="w-12 h-12 shrink-0 select-none"
        :disabled="true"
      />
      <div
        class="absolute top-0 right-0 rounded-full w-2.5 h-2.5 bg-red-500"
        v-if="talk.hasUnreadMessagesOfChannel(session?.metaId || session?.createUserMetaId)"
      ></div>
    </div>

    <div class="flex flex-col items-stretch grow space-y-1 overflow-x-hidden">
      <div class="flex items-baseline justify-between self-stretch">
        <UserName
          :name="contact.name"
          :meta-name="contact?.metaName"
          :no-tag="true"
          :text-class="'font-medium dark:text-gray-100 max-w-[96PX]'"
        />

        <div class="shrink-0 text-dark-250 dark:text-gray-400 text-xs">
          {{
            session.lastMessageTimestamp
              ? formatTimestamp(session.lastMessageTimestamp, i18n, false)
              : ''
          }}
        </div>
      </div>
      <div class="text-xs text-dark-300 dark:text-gray-400 truncate max-w-[160PX]">
        {{ lastMessage }}
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { formatTimestamp } from '@/utils/talk'
import { useUserStore } from '@/stores/user'
import { useI18n } from 'vue-i18n'
import { computed, toRaw } from 'vue'
import { useRouter } from 'vue-router'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { ecdhDecrypt } from '@/utils/crypto'
import {useCredentialsStore} from '@/stores/credentials'
import {useConnectionStore } from '@/stores/connection'
import {atobToHex} from '@/utils/util'
const i18n = useI18n()
const userStore = useUserStore()
const layout = useLayoutStore()
const router = useRouter()
const talk = useTalkStore()
const credentialsStore = useCredentialsStore()
const connectionStore=useConnectionStore()

const props = defineProps(['session'])

console.log('props.session',props.session)

const contact = computed<any>(() => {
  let contactSide = 'from'
  
  if (userStore.last) {
    const selfMetaId = userStore.last.metaid
    if (props.session.from === selfMetaId) {
      contactSide = 'to'
    }

   
    
  }

  return {
    name: props.session.name || props.session[`${contactSide}Name`],
    metaName: props.session[`${contactSide}UserInfo`]?.metaName || '',
    metaId: props.session.id || props.session.createUserMetaId,
    lastMessage: props.session.lastMessage,
    lastMessageTimestamp: props.session.lastMessageTimestamp,
  }
})

const lastMessage = computed<string>(() => {
  if (props.session.protocol === 'ShowMsg') {
    return parseTextMessage(decryptedMessage.value)
  }

  return i18n.t(`Talk.Channel.you_received_a_new_message`)
})

const decryptedMessage = computed(() => {
  if (props.session.data.encrypt !== '1') {
    return props.session.data.content
  }

  // 处理mock的图片消息
  if (props.session.isMock && props.session.protocol === 'SimpleFileGroupChat') {
    return props.session.data.content
  }

     const credential=credentialsStore.getByAddress(connectionStore.last.address)
    const sigStr=atobToHex(credential!.signature)
  // const privateKey = toRaw(userStore?.wallet)!.getPathPrivateKey('0/0')
  // const privateKeyStr = privateKey.toHex()
  const otherPublicKeyStr = props.session.publicKeyStr

  return ecdhDecrypt(props.session.data.content, sigStr, otherPublicKeyStr)
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

  if (isActive.value) return
  if(props.session?.groupId){
     router.push(`/talk/channels/public/${props.session?.groupId}`)
  }else{
     router.push(`/talk/channels/@me/${contact.value.metaId}`)
  }
 
}
</script>

<style lang="scss" scoped></style>
