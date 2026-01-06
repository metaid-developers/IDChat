<template>
  <Teleport to="body">
    <div
      v-show="showMoreCommandsBox"
      class="fixed z-50 inset-0 fullscreen w-screen bg-transparent"
      @click="showMoreCommandsBox = false"
    >
      <div class="relative h-full w-full">
        <input
          type="file"
          id="imageUploader"
          ref="imageUploader"
          accept="image/*"
          @change="handleImageChange"
          class="hidden"
        />
        <div
          class="absolute bottom-[68PX] left-[16PX] lg:bottom-[78PX] lg:left-[346PX] bg-white py-1.5 px-2 rounded text-xs flex flex-col text-dark-400 font-medium space-y-0.5 shadow-lg"
        >
          <div
            class="p-2 flex items-center space-x-2 text-dark-800 rounded-sm lg:cursor-pointer lg:hover:text-white lg:hover:bg-primary"
            @click="openImageUploader"
          >
            <div class="">
              <Icon name="photo" class="w-5 h-5" />
            </div>
            <div class="">
              {{ $t('Talk.Channel.upload_image') }}
            </div>
          </div>
          <div
            class="p-2 flex items-center space-x-2 text-dark-800 rounded-sm lg:cursor-pointer lg:hover:text-white lg:hover:bg-primary"
          >
            <div class="">
              <Icon name="link" class="w-5 h-5" />
            </div>
            <div class="">
              {{ $t('Talk.Channel.use_onchain_image') }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'

import { isFileTooLarge, isImage, MessageType, sendMessage } from '@/utils/talk'
import { FileToAttachmentItem } from '@/utils/util'
import { useUserStore } from '@/stores/user'
import { useChainStore } from '@/stores/chain'
import { ElMessage } from 'element-plus'
import { useI18n } from 'vue-i18n'

const props = defineProps(['currentChannel'])
const userStore = useUserStore()
const chainStore = useChainStore()
const { t } = useI18n()

const showMoreCommandsBox = ref(false)

const imageUploader = ref<HTMLInputElement | null>(null)
const imageFile = ref<File | null>(null)
const showImagePreview = ref(false)

const hasImage = computed(() => imageFile.value !== null)

const openImageUploader = () => {
  imageUploader.value?.click()
}

const handleImageChange = (e: Event) => {
  // 暂时禁用 DOGE 链发送图片功能
  if (chainStore.state.currentChain === 'doge') {
    ElMessage.warning(t('doge_image_not_supported') || 'DOGE 链暂不支持发送图片')
    return
  }

  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    if (!isImage(file)) {
      console.log('not image')
      return
    }

    if (isFileTooLarge(file)) {
      console.log('too large')
      return
    }

    imageFile.value = file
  }
}

const deleteImage = () => {
  imageFile.value = null
  imageUploader.value!.value = ''
}

const imagePreviewUrl = computed(() => {
  if (imageFile.value) {
    return URL.createObjectURL(imageFile.value)
  }

  return ''
})

const trySendImage = async () => {
  const hexedFiles = await FileToAttachmentItem(imageFile.value!)
  const attachments = [hexedFiles]

  deleteImage()

  const messageDto = {
    type: MessageType.Image,
    channelId: props.currentChannel.id,
    userName: userStore.user?.name,
    attachments,
  }
  await sendMessage(messageDto)

  return
}
</script>

<style lang="scss" scoped></style>
