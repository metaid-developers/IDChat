<template>
  <div
    v-if="show"
    class="mention-dropdown bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 overflow-hidden"
    :style="{
      top: position.top !== undefined && position.top >= 0 ? `${position.top}px` : 'auto',
      bottom: position.bottom !== undefined ? `${position.bottom}px` : 'auto',
      left: `${position.left}px`,
    }"
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
    <div v-else-if="users.length > 0" class="max-h-60 overflow-y-auto">
      <div
        v-for="(user, index) in users"
        :key="user.metaId"
        :class="[
          'mention-item flex items-center px-4 py-2 cursor-pointer transition-colors',
          index === selectedIndex
            ? 'bg-primary bg-opacity-20'
            : 'hover:bg-gray-100 dark:hover:bg-gray-600',
        ]"
        @click="selectUser(user)"
        @mouseenter="selectedIndex = index"
      >
        <img
          v-if="user.userInfo?.avatarImage"
          :src="user.userInfo.avatarImage"
          alt=""
          class="w-8 h-8 rounded-full mr-3 object-cover"
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
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

export interface MentionUser {
  metaId: string
  address: string
  userInfo: {
    metaid: string
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
  position: { top?: number; bottom?: number; left: number }
  loading?: boolean
  query?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  query: '',
})

const emit = defineEmits(['select', 'update:selectedIndex'])

const selectedIndex = ref(0)

// 监听用户列表变化，重置选中索引
watch(
  () => props.users,
  () => {
    selectedIndex.value = 0
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
  if (selectedIndex.value < props.users.length - 1) {
    selectedIndex.value++
  }
}

const selectPrevious = () => {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

const selectCurrent = () => {
  if (props.users[selectedIndex.value]) {
    selectUser(props.users[selectedIndex.value])
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
  position: fixed;
  z-index: 1000;
  min-width: 260px;
  max-width: 320px;
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
