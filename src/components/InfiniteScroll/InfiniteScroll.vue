<template>
  <div ref="scrollRef" :id="id" :style="{ height: '20px' }" />
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'

interface Props {
  id: string
  onMore: () => void
}

const props = defineProps<Props>()

const scrollRef = ref<HTMLDivElement | null>(null)
const isLoadingRef = ref(false)
let observer: IntersectionObserver | null = null

const setupObserver = () => {
  // 清理之前的观察器
  if (observer) {
    observer.disconnect()
  }

  observer = new IntersectionObserver(
    ([entry]) => {
      // 只有当元素进入视口且当前没有在加载时才触发
      if (entry.isIntersecting && !isLoadingRef.value) {
        isLoadingRef.value = true
        props.onMore()

        // 设置一个短暂的延迟来防止重复触发
        setTimeout(() => {
          isLoadingRef.value = false
        }, 500)
      }
    },
    {
      threshold: 0.1, // 增加阈值，确保元素真正进入视口
      rootMargin: '100px', // 提前100px开始加载
    }
  )

  if (scrollRef.value) {
    observer.observe(scrollRef.value)
  }
}

// 监听 onMore 函数的变化，重新设置观察器
watch(
  () => props.onMore,
  () => {
    nextTick(() => {
      setupObserver()
    })
  },
  { flush: 'post' }
)

onMounted(() => {
  nextTick(() => {
    setupObserver()
  })
})

onUnmounted(() => {
  if (observer) {
    observer.disconnect()
  }
})

// 暴露重置加载状态的方法
const resetLoading = () => {
  isLoadingRef.value = false
}

// 暴露给父组件使用
defineExpose({
  resetLoading,
})
</script>

<script lang="ts">
export default {
  name: 'InfiniteScroll',
}
</script>
