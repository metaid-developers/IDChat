<template>
  <div class="quote mb-2 pr-8 lg:pr-12">
    <Icon name="quote_line" class="line-warp"></Icon>
    <div class="quote-warp">
      <ElPopover :width="'auto'">
        <template #reference>
          <div class="quote-content flex flex-align-center">
            <UserAvatar
              :image="quote.avatarImage"
              :meta-name="''"
              :meta-id="quote.metaId"
            />
            <UserName
              :name="quote.nickName"
              :meta-name="''"
              :no-tag="true"
            />:&nbsp;&nbsp;
            <template
              v-if="
              containsString(quote.protocol,NodeName.SimpleFileGroupChat)
                || containsString(quote.protocol,NodeName.SimpleFileMsg)
              "
            >
              <a class="attachment" @click="previewImage(quote.content)"
                >[{{ $t('DAO.Prevew Attachment') }}]</a
              >
            </template>
            <div class="content">
              {{
              isSubChannelMsg ? decryptedMessageForSubChannel(
               quote?.content,
                  quote?.encryption,
                  quote?.protocol,
                  quote?.isMock,
                  quote?.channelId?.substring(0, 16)
            ) : decryptedMessage(
                  quote?.content,
                  quote?.encryption,
                  quote?.protocol,
                  quote?.isMock,
                  isSession
                )
              }}
            </div>
          </div>
        </template>
        <div
          class="whitespace-nowrap cursor-pointer select-none"
          @click="emit('toTimeStamp', quote!.timestamp)"
        >
          {{ $t('Talk.Go to the original position') }}
        </div>
      </ElPopover>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useImagePreview } from '@/stores/imagePreview'
import { decryptedMessage,decryptedMessageForSubChannel } from '@/utils/talk'
import { NodeName } from '@/enum'
import {UserInfo as newUserInfo} from '@/api/man'
import { containsString } from '@/utils/util'
interface Props {
  quote: {
    avatarImage: string
    metaName: string
    metaId: string
    nickName: string
    protocol: string
    content: string
    encryption: string
    timestamp: number
    userInfo:newUserInfo
  
    isMock?: boolean
  
  }
  isSession?: boolean // 是否私聊
  isSubChannelMsg?:boolean
}
const props = withDefaults(defineProps<Props>(), {
  isSubChannelMsg:false
})


const emit = defineEmits<{
  (e: 'toTimeStamp', timestamp: number): void
}>()

const imagePreview = useImagePreview()

const previewImage = (image: string) => {
  imagePreview.images = [image]
  imagePreview.index = 0
  imagePreview.visibale = true
}
</script>

<style lang="scss" scoped src="./MessageItemQuote.scss"></style>
