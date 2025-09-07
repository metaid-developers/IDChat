<template>
  <div class="image" :class="customClass">
    <ElSkeleton :loading="isSkeleton" animated>
      <template #template>
        <ElSkeletonItem variant="image" />
      </template>
      <template #default>
        <!-- <img ref="imgRef" :data-src="url" :class="imageClass" @error="fail" loading="lazy" /> -->
        <img
          ref="imgRef"
          :src="url"
          :class="[customClass, 'lazyload']"
          @error="fail"
          @load="handleLoad"
          loading="lazy"
        />
      </template>
    </ElSkeleton>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import DefaultAvatar from '@/assets/images/default_avatar.png'
import DefaultMetafile from '@/assets/images/release_add_img.svg?url'
// import 'lazysizes'
import { DB } from '@/utils/db'

interface Props {
  src: string
  customClass?: string
  width?: number
  type?: 'metafile' | 'metaId'
  defaultImage?: string
  isPrivateChat?:boolean
  chatPubkeyForDecrypt?:string
}
const props = withDefaults(defineProps<Props>(), {
  width: 235,
  type: 'metafile',
  isPrivateChat:false,
  chatPubkeyForDecrypt:''
})

const emit = defineEmits(['load', 'error'])

const Default = {
  metafile: props.defaultImage ? props.defaultImage : DefaultMetafile,
  metaId: props.defaultImage ? props.defaultImage : DefaultAvatar,
}

const imgRef = ref()

const isSkeleton = ref(true)
const url = ref('')

watch(
  () => props.src,
  () => {
    getImageUrl()
  },
  { immediate: true }
)

async function getImageUrl() {
  isSkeleton.value = true
  const src = props.src

  try {
    const res = await DB.getMetaFile(src, props.width, 'metafile',props.isPrivateChat,props.chatPubkeyForDecrypt)
    url.value = res
    isSkeleton.value = false
  } catch (error) {
    console.error('获取图片失败:', error)
    isSkeleton.value = false
  }
}

const handleLoad = (event: Event) => {
  emit('load', event)
}

function fail(event: Event) {
  const img = event.target as HTMLImageElement
  img.src = props.type === 'metafile' ? Default.metafile : Default.metaId
  img.onerror = null // 防止闪图
  emit('error', event)
}

defineExpose({
  imgRef,
})
</script>

<style lang="scss" scoped src="./Image.scss"></style>
