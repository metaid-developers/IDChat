<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="mention-dropdown bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
      :style="dropdownStyle"
    >
      <!-- Loading 状态 -->
      <div
        v-if="loading"
        class="flex items-center justify-center py-8 text-sm text-dark-300 dark:text-gray-400"
      >
        <Icon name="loading" class="w-5 h-5 animate-spin mr-2" />
        {{ $t('loading') }}...
      </div>

      <!-- 用户列表 -->
      <div v-else-if="validUsers.length > 0" class="max-h-60 overflow-y-auto">
        <div
          v-for="(user, index) in validUsers"
          :key="user.metaId || user.userInfo?.metaid || index"
          :class="[
            'mention-item flex items-center px-4 py-2 cursor-pointer transition-colors',
            index === selectedIndex
              ? 'bg-primary bg-opacity-20'
              : 'hover:bg-gray-100 dark:hover:bg-gray-600',
          ]"
          @click="selectUser(user)"
          @mouseenter="selectedIndex = index"
        >
          <!-- 头像：优先显示图片，加载失败或无头像时显示默认头像 -->
          <img
            v-if="
              user.userInfo?.avatarImage && !avatarErrorMap[user.metaId || user.userInfo?.metaid]
            "
            :src="user.userInfo.avatarImage"
            alt=""
            class="w-8 h-8 rounded-full mr-3 object-cover"
            @error="handleAvatarError(user.metaId || user.userInfo?.metaid)"
          />
          <div
            v-else
            class="w-8 h-8 rounded-full mr-3 bg-primary flex items-center justify-center text-dark-800 font-semibold"
          >
            {{ user.userInfo?.name?.charAt(0).toUpperCase() || 'U' }}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-dark-800 dark:text-gray-100 truncate">
              {{ user.userInfo?.name || 'Unknown' }}
            </div>
            <div class="text-xs text-dark-300 dark:text-gray-400 truncate">
              {{ formatAddress(user.address) }}
            </div>
          </div>
        </div>
      </div>

      <!-- 无结果 -->
      <div
        v-else-if="!loading && query"
        class="flex items-center justify-center py-6 text-sm text-dark-300 dark:text-gray-400"
      >
        {{ $t('no_results') }}
      </div>

      <!-- 空状态提示 -->
      <div
        v-else-if="!loading && !query"
        class="flex items-center justify-center py-6 text-sm text-dark-300 dark:text-gray-400"
      >
        输入名称搜索成员
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'

export interface MentionUser {
  metaId: string
  globalMetaId?: string // 新增：全局 MetaId
  address: string
  userInfo: {
    metaid: string
    globalMetaId?: string // 新增：全局 MetaId
    address: string
    name: string
    avatar?: string
    avatarImage?: string
    chatPublicKey: string
    chatPublicKeyId?: string
  }
  timestamp: number
}

interface Props {
  show: boolean
  users: MentionUser[]
  position: { top?: number; bottom?: number; left: number; width?: number }
  loading?: boolean
  query?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  query: '',
})

const emit = defineEmits(['select', 'update:selectedIndex'])

const selectedIndex = ref(0)

// 过滤掉 null/undefined 值的用户列表
const validUsers = computed(() => {
  return (props.users || []).filter(user => user && user.userInfo)
})

// 计算下拉框样式
const dropdownStyle = computed(() => {
  const style: Record<string, string> = {
    position: 'fixed',
    left: `${props.position.left}px`,
    maxHeight: '280px',
  }

  // 使用 bottom 定位（推荐，更适合 iOS）
  if (props.position.bottom !== undefined) {
    style.bottom = `${props.position.bottom}px`
    style.top = 'auto'
  } else if (props.position.top !== undefined && props.position.top >= 0) {
    style.top = `${props.position.top}px`
    style.bottom = 'auto'
  }

  // 设置宽度
  if (props.position.width) {
    style.width = `${props.position.width}px`
  } else {
    style.minWidth = '200px'
    style.maxWidth = '320px'
  }

  return style
})

// 头像加载错误记录
const avatarErrorMap = ref<Record<string, boolean>>({})

// 处理头像加载错误
const handleAvatarError = (metaId: string) => {
  avatarErrorMap.value[metaId] = true
}

// 监听用户列表变化，重置选中索引和头像错误记录
watch(
  () => props.users,
  () => {
    selectedIndex.value = 0
    // 清空头像错误记录，因为用户列表已更新
    avatarErrorMap.value = {}
  }
)

// 监听 show 变化，重置选中索引
watch(
  () => props.show,
  newShow => {
    if (newShow) {
      selectedIndex.value = 0
    }
  }
)

const selectUser = (user: MentionUser) => {
  emit('select', user)
}

const formatAddress = (address: string) => {
  if (!address) return ''
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}...${address.slice(-6)}`
}

// 暴露方法供父组件调用
const selectNext = () => {
  if (selectedIndex.value < validUsers.value.length - 1) {
    selectedIndex.value++
  }
}

const selectPrevious = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

const selectCurrent = () => {
  if (validUsers.value[selectedIndex.value]) {
    selectUser(validUsers.value[selectedIndex.value])
  }
}

defineExpose({
  selectNext,
  selectPrevious,
  selectCurrent,
  selectedIndex,
})
</script>

<style lang="scss" scoped>
.mention-dropdown {
  z-index: 10000; /* 提高 z-index 确保在 iOS 键盘上方 */
  overflow-y: auto;
}

.mention-item {
  &:active {
    transform: scale(0.98);
  }
}

/* 滚动条样式 */
.max-h-60 {
  scrollbar-width: thin;
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent;
}

.max-h-60::-webkit-scrollbar {
  width: 6px;
}

.max-h-60::-webkit-scrollbar-track {
  background: transparent;
}

.max-h-60::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 3px;
}

.max-h-60::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>
