<!-- <template>
  <div class="chat-image-container relative">
   
    <div
      v-show="
        currentSrc &&
          ((hasError && hasStartedLoading) || (!isFirstLoad && hasStartedLoading && !isLoaded))
      "
      class="flex items-center justify-center overflow-hidden"
      :class="customClass || 'min-h-[120px]'"
    >
    
      <img
        :src="defaultMetafileImage"
        :alt="alt"
        class=" object-cover w-full h-full"
        :class="customClass"
      />

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

    
    <img
      v-if="shouldShowRealImage && currentSrc && isLoaded && !hasError"
      :src="currentSrc"
      :alt="alt"
      class=" object-cover"
      :class="customClass"
      @load="handleLoad"
      @error="handleError"
      @loadstart="handleLoadStart"
    />

    
    <UserAvatar
      v-else-if="shouldShowUserAvatar && currentSrc"
      :image="currentSrc"
      :name="alt"
      :meta-name="''"
      :is-custom="isCustom"
      :class="customClass"
      :disabled="true"
      :size="props.size || 48"
    />

 
    <img
      v-if="currentSrc && !isLoaded"
      :src="currentSrc"
      style="display: none;"
      @load="handleLoad"
      @error="handleError"
    />


    <div
      v-if="!props.src && props.alt"
      class="flex items-center justify-center  dark:bg-gray-800 rounded-xl p-4"
      :class="customClass || 'min-h-[120px]'"
    >
      <UserAvatar
        :image="currentSrc"
        :name="alt"
        :meta-name="''"
        :is-custom="isCustom"
        :class="customClass"
        :disabled="true"
        :size="props.size || 48"
      />
    </div>
  </div>
</template> -->

<!-- <script setup lang="ts">
import { ref, computed, watch, defineProps, withDefaults } from 'vue'
import { metafile } from '@/utils/filters'
import defaultMetafileImage from '@/assets/images/default_metafile.svg?url'
import refreshIcon from '@/assets/icons/refresh.svg?url'
import UserAvatar from '../UserAvatar/UserAvatar.vue'
import { ChannelType } from '@/enum'

interface Props {
  src: string
  alt?: string
  avatarType: ChannelType
  customClass?: string
  maxRetries?: number
  isCustom?: boolean
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'Chat Icon',
  customClass: '',
  maxRetries: 3,
})

// 状态管理
const hasError = ref(false)
const isRetrying = ref(false)
const retryCount = ref(0)
const isLoaded = ref(false)
const hasStartedLoading = ref(false)
const isFirstLoad = ref(true) // 标记是否是第一次加载

// 计算属性：是否应该显示真实图片
const shouldShowRealImage = computed(() => {
  // 只有当 avatarType 为 Group 且不是自定义头像时才显示真实图片
  return props.avatarType === ChannelType.Group && !props.isCustom
})

// 计算属性：是否应该显示 UserAvatar 组件
const shouldShowUserAvatar = computed(() => {
  // 当 avatarType 为 Session 或有自定义头像时显示 UserAvatar
  return props.avatarType === ChannelType.Session || props.isCustom
})

// 当前图片源，直接转换metafile://为HTTP URL
const currentSrc = computed(() => {
  if (!props.src) return ''

  // 使用metafile函数直接转换URL
  let httpUrl = metafile(props.src, 235, 'metafile')

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
  console.log('🔴 ChatImage 加载失败，重试次数:', retryCount.value)
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
</script> -->

<!-- <style scoped>
.chat-image-container {
  display: inline-block;
}
</style> -->

<template>
  <div class="chat-image-container relative">
    <!-- 占位符 - 在非第一次加载时显示（重试时或失败后） -->
    <div
      v-show="
        currentSrc &&
          !shouldShowInitialsFallback &&
          ((hasError && hasStartedLoading) || (!isFirstLoad && hasStartedLoading && !isLoaded))
      "
      class="flex items-center justify-center overflow-hidden"
      :class="customClass || 'min-h-[120px]'"
    >
      <!-- 默认背景图片 -->
      <img
        :src="defaultMetafileImage"
        :alt="alt"
        class=" object-cover w-full h-full"
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
      v-show="currentSrc && isLoaded && !hasError"
      :src="currentSrc"
      :alt="alt"
      class=" object-cover"
      :class="customClass"
      @load="handleLoad"
      @error="handleError"
      @loadstart="handleLoadStart"
    />

    <!-- 隐藏的图片预加载 - 用于检测加载状态 -->
    <img
      v-if="currentSrc && !isLoaded && !hasError"
      :src="currentSrc"
      style="display: none;"
      @load="handleLoad"
      @error="handleError"
    />

    <!-- 无图片源或最终加载失败时，复用用户名首两位兜底头像 -->
    <UserAvatar
      v-if="shouldShowInitialsFallback"
      :image="''"
      :name="fallbackName"
      :meta-name="''"
      is-custom
      :class="customClass || 'min-h-[120px]'"
      :disabled="true"
      :size="props.size || 48"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineProps, withDefaults } from 'vue'
import { metafile } from '@/utils/filters'
import defaultMetafileImage from '@/assets/images/default_metafile.svg?url'
import refreshIcon from '@/assets/icons/refresh.svg?url'
import UserAvatar from '../UserAvatar/UserAvatar.vue'

interface Props {
  src: string
  alt?: string
  customClass?: string
  maxRetries?: number
  size?: number
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  customClass: '',
  maxRetries: 3,
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

  // 使用metafile函数直接转换URL
  let httpUrl = metafile(props.src, 235, 'metafile')

  // 为了防止缓存问题，在重试时添加时间戳
  if (retryCount.value > 0) {
    const separator = httpUrl.includes('?') ? '&' : '?'
    httpUrl = `${httpUrl}${separator}retry=${retryCount.value}&t=${Date.now()}`
  }

  return httpUrl
})

const fallbackName = computed(() => props.alt?.trim() || 'Bot')

const shouldShowInitialsFallback = computed(() => {
  return !props.src || hasError.value
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
