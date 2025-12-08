<template>
  <div class="chat-image-container relative " :class="wrapperClass">
    <!-- 占位符 - 在非第一次加载时显示（重试时或失败后） -->
    <div
      v-show="(hasError && hasStartedLoading) || (!isFirstLoad && hasStartedLoading && !isLoaded)"
      class="flex items-center justify-center rounded-xl overflow-hidden"
      :class="customClass || 'min-h-[120px]'"
    >
      <!-- 默认背景图片 -->
      <img
        :src="defaultMetafileImage"
        :alt="alt"
        class="rounded-xl object-cover w-full h-full"
        :class="customClass"
      />

      <!-- 重试按钮 -->
      <button
        class="absolute w-8 h-8 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-md"
        @click.stop="retryLoad"
        :disabled="isRetrying"
        title="重新加载图片"
        style="top: 50%; left: 50%; transform: translate(-50%, -50%);"
      >
        <img
          :src="refreshIcon"
          alt="refresh"
          class="w-4 h-4"
          :class="{ 'animate-spin': isRetrying }"
        />
      </button>
    </div>

    <!-- 真实图片 - 只有加载成功后才显示 -->
    <img
      v-show="isLoaded && !hasError"
      :src="currentSrc"
      :alt="alt"
      class="rounded-xl object-cover"
      :class="customClass"
      @load="handleLoad"
      @error="handleError"
      @loadstart="handleLoadStart"
    />

    <!-- 隐藏的图片预加载 - 用于检测加载状态 -->
    <img
      v-if="currentSrc && !isLoaded"
      :src="currentSrc"
      style="display: none;"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 无图片源的情况 -->
    <div
      v-if="!props.src"
      class="flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-xl p-4"
      :class="customClass || 'min-h-[120px]'"
    >
      <p class="text-sm text-gray-500">无图片源</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineProps, withDefaults } from 'vue'
import { metafile } from '@/utils/filters'
import defaultMetafileImage from '@/assets/images/default_metafile.svg?url'
import refreshIcon from '@/assets/icons/refresh.svg?url'

interface Props {
  src: string
  alt?: string
  customClass?: string
  wrapperClass?: string
  maxRetries?: number
  useThumbnail?: boolean // 是否使用缩略图
  isPublicGroupChat?: boolean // 是否是公开群聊图片
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'Chat Image',
  customClass: '',
  maxRetries: 3,
  wrapperClass: '',
  useThumbnail: false,
  isPublicGroupChat: false,
})

// 状态管理
const hasError = ref(false)
const isRetrying = ref(false)
const retryCount = ref(0)
const isLoaded = ref(false)
const hasStartedLoading = ref(false)
const isFirstLoad = ref(true) // 标记是否是第一次加载

// 当前图片源，直接转换metafile://为HTTP URL
const currentSrc = computed(() => {
  if (!props.src) return ''

  let httpUrl = ''

  // 公开群聊使用特定的 URL 路径
  if (props.isPublicGroupChat) {
    // 移除 metafile:// 前缀
    const cleanSrc = props.src.replace('metafile://', '')
    httpUrl = `https://file.metaid.io/metafile-indexer/api/v1/files/accelerate/content/${cleanSrc}`

    // 如果启用缩略图，添加缩略图参数
    if (props.useThumbnail) {
      httpUrl += '?process=thumbnail'
    } else {
      httpUrl += '?process='
    }
  } else {
    // 其他情况使用默认的 metafile 函数
    httpUrl = metafile(props.src, 235, 'metafile').replace(/\.(png|jpg|jpeg|gif|webp|bmp|svg)/, '')
  }

  // 为了防止缓存问题，在重试时添加时间戳
  if (retryCount.value > 0) {
    const separator = httpUrl.includes('?') ? '&' : '?'
    httpUrl = `${httpUrl}${separator}retry=${retryCount.value}&t=${Date.now()}`
  }

  return httpUrl
})

// 图片开始加载
const handleLoadStart = () => {
  // 标记已开始加载
  hasStartedLoading.value = true
  hasError.value = false
  isLoaded.value = false
  // 第一次加载后就不再是第一次了
  if (isFirstLoad.value) {
    isFirstLoad.value = false
  }
}

// 图片加载成功
const handleLoad = () => {
  hasError.value = false
  isRetrying.value = false
  isLoaded.value = true
  hasStartedLoading.value = true
}

// 图片加载失败
const handleError = () => {
  hasStartedLoading.value = true
  isLoaded.value = false

  // 如果还没达到最大重试次数，自动重试
  if (retryCount.value < props.maxRetries) {
    setTimeout(() => {
      if (retryCount.value < props.maxRetries) {
        autoRetry()
      } else {
        hasError.value = true
      }
    }, 1000 * (retryCount.value + 1)) // 递增延迟: 1s, 2s, 3s
  } else {
    hasError.value = true
  }
}

// 自动重试
const autoRetry = () => {
  retryCount.value++
  hasError.value = false
  isLoaded.value = false
  hasStartedLoading.value = true
  isFirstLoad.value = false // 重试不是第一次加载
}

// 手动重试
const retryLoad = () => {
  if (isRetrying.value) return

  isRetrying.value = true
  retryCount.value++

  // 重置状态
  setTimeout(() => {
    hasError.value = false
    isRetrying.value = false
    isLoaded.value = false
    hasStartedLoading.value = true
    isFirstLoad.value = false // 重试不是第一次加载
  }, 100)
}

// 监听 src 变化，重置状态
watch(
  () => props.src,
  (newSrc, oldSrc) => {
    if (newSrc !== oldSrc) {
      retryCount.value = 0
      hasError.value = false
      isRetrying.value = false
      isLoaded.value = false
      hasStartedLoading.value = false
      isFirstLoad.value = true // 新的 src 重新开始第一次加载
    }
  }
)
</script>

<style scoped>
.chat-image-container {
  display: inline-block;
}
</style>
