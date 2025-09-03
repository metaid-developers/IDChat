<template>
  <ElDrawer
    :model-value="modelValue"
    :show-close="false"
    :with-header="false"
    :size="'360px'"
    :append-to-body="true"
    :lock-scroll="false"
    :close-on-click-modal="false"
    custom-class="none-padding"
  >
    <div class="wrap relative">
      <header class="flex items-center justify-between header">
        <div class="flex items-center gap-2">
          <a class="back" @click="emit('update:modelValue', false)">
            <Icon name="down" />
          </a>
          <span class="title truncate max-w-6xl">{{ currentChannelInfo?.roomName || '' }}</span>
        </div>

        <el-icon
          class="cursor-pointer"
          v-if="isCurrentUserCreator"
          @click="openEditChannelInfoDrawer"
          ><Edit
        /></el-icon>
        <transition name="search-slide">
          <div class="search-wrap bg-white dark:bg-black" v-show="showSearch">
            <el-input
              v-model="searchKey"
              size="default"
              placeholder="Please Input"
              :prefix-icon="Search"
              input-style="background-color: transparent !important;"
            />
            <el-button :icon="Close" circle @click="closeSearch"></el-button>
          </div>
        </transition>
      </header>

      <div class="flex flex-col  bg-dark-100 dark:bg-gray-800  info">
        <div class="flex flex-col items-center justify-center mt-4 mb-2">
          <ChatIcon
            :src="currentChannelInfo?.roomIcon || ''"
            :alt="currentChannelInfo?.roomName"
            customClass="w-[88px] h-[88px] rounded-full"
            :size="88"
          />
          <!-- <ChatImage
            :src="currentChannelInfo?.roomIcon"
            v-if="currentChannelInfo?.roomIcon"
            customClass="w-[88px] h-[88px] rounded-full"
          />
          <UserAvatar
            :image="''"
            :meta-id="currentChannelInfo?.groupId || currentChannelInfo?.createUserMetaId"
            :name="currentChannelInfo?.roomName"
            :meta-name="''"
            :is-custom="currentChannelInfo?.roomIcon ? false : true"
            :disabled="true"
            :size="88"
            type="metafile"
            v-else
          /> -->
          <div class=" text-xl font-medium text-dark-800 dark:text-gray-100 mt-5">
            {{ currentChannelInfo?.roomName || '' }}
          </div>
          <div
            class="flex gap-2 items-center cursor-pointer text-sm font-medium text-dark-600 dark:text-gray-400 mt-2"
            @click="copyGroupId"
          >
            GroupId: {{ currentChannelInfo?.groupId.replace(/(\w{5})\w+(\w{3})/, '$1...$2') || ''
            }}<el-icon><CopyDocument /></el-icon>
          </div>
          <div class="mt-4">
            <el-button color="#ffffff" size="default" :icon="Search" @click="showSearch = true"
              >Search</el-button
            >
            <el-button
              v-if="!isCurrentUserCreator"
              color="#ffffff"
              size="default"
              :icon="Remove"
              @click="handleLeave"
              >Leave</el-button
            >
          </div>
        </div>
        <div class="mt-5 bg-white dark:bg-black px-4 py-5">
          <div class="flex items-center justify-between text-md font-medium">
            {{ $t('Talk.Channel.announcement') }}
            <el-icon
              class="cursor-pointer"
              v-if="isCurrentUserCreator"
              @click="openEditAnnouncementDrawer"
              ><ArrowRight
            /></el-icon>
          </div>
          <div class="mt-2 text-dark-300 dark:text-gray-400">
            {{ currentChannelInfo?.roomNote || '-' }}
          </div>
        </div>

        <div class="mt-3 bg-white dark:bg-black px-4 py-5" @click="copyLink">
          <div class="flex items-center justify-between text-md font-medium">
            {{ $t('Talk.Channel.ShareLink') }}
          </div>
          <div class="mt-2 text-dark-300 dark:text-gray-400 flex items-center justify-between">
            <div class="word-break break-all">
              {{ currentLink }}
            </div>
            <el-icon
              class="cursor-pointer min-w-[24px] min-h-[24px] text-dark-300 dark:text-gray-400"
              ><Link
            /></el-icon>
          </div>
        </div>
      </div>

      <div class="flex items-baseline justify-between mb-2 px-4 py-4 affix members-header">
        <div class="text-sm text-dark-800 dark:text-gray-100 uppercase font-medium">
          {{ $t('Talk.Channel.team_members') }}
        </div>
        <div class="text-sm text-dark-300 dark:text-gray-400">
          {{ currentChannelInfo?.userCount || 0 }}
        </div>
      </div>
      <div class="infinite-list-wrapper" style="overflow: auto" ref="scrollContainer">
        <ul class="list">
          <li
            v-for="member in currentDisplayList"
            :key="member.id"
            class="w-full relative list-item"
          >
            <ChannelMemberItem
              class="absolute top-0 left-0 w-full z-0"
              :id="member.index"
              :style="{ transform: `translateY(${member.start}px)` }"
              :member="member"
              :key="member.index"
              :createUserMetaId="currentChannelInfo?.createUserMetaId"
              :groupId="currentChannelInfo?.groupId"
              @updated="handleDeleteSuccess"
            />
          </li>
        </ul>
        <div
          style="
            display: flex;
            align-items: center;
            justify-items: space-between;
          "
          v-if="(loading || isSearching) && !currentDisplayList.length"
        >
          <el-skeleton-item variant="text" style="margin-right: 16px" />
          <el-skeleton-item variant="text" style="width: 30%" />
        </div>
        <p v-if="loading && !searchKey.trim()" class="text-center">Loading...</p>
        <p v-if="isSearching && searchKey.trim()" class="text-center">Searching...</p>
        <p v-if="noMore && !searchKey.trim()" class="text-center">No more</p>
        <p v-if="!isSearching && searchKey.trim() && !searchList.length" class="text-center">
          No results found
        </p>
        <!-- IntersectionObserver 触发元素 - 只在非搜索状态下显示 -->
        <div
          ref="loadTrigger"
          class="load-trigger"
          v-if="!noMore && currentDisplayList.length > 0 && !searchKey.trim()"
        ></div>
      </div>
    </div>
  </ElDrawer>

  <!-- 编辑公告抽屉 -->
  <EditAnnouncementDrawer
    v-model="showEditAnnouncementDrawer"
    :channel-info="currentChannelInfo"
    @updated="handleAnnouncementUpdated"
  />

  <!-- 编辑群信息抽屉 -->
  <EditChannelInfoDrawer
    v-model="showEditChannelInfoDrawer"
    :channel-info="currentChannelInfo"
    @updated="handleChannelInfoUpdated"
  />
</template>

<script lang="ts" setup>
import {
  ref,
  watch,
  computed,
  defineProps,
  defineEmits,
  withDefaults,
  onMounted,
  onUnmounted,
  nextTick,
} from 'vue'

import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import ChannelMemberItem from './ChannelMemberItem.vue'
import EditAnnouncementDrawer from './EditAnnouncementDrawer.vue'
import EditChannelInfoDrawer from './EditChannelInfoDrawer.vue'
import { useRoute } from 'vue-router'
import { getChannelMembers, searchChannelMembers } from '@/api/talk'
import { ElMessage } from 'element-plus'
import copy from 'copy-to-clipboard'
import {
  ArrowRight,
  CircleClose,
  Close,
  CopyDocument,
  Edit,
  Link,
  Remove,
  Search,
} from '@element-plus/icons-vue'
import { metafile } from '@/utils/filters'
import { NodeName } from '@/enum'
import { createSinglePin } from '@/utils/pin'
import { fa } from 'element-plus/es/locale'
interface MemberItem {
  id: string
  index: number
  start: number
  [key: string]: unknown
}

interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue'])
const showSearch = ref(false)
const talkStore = useTalkStore()
const userStore = useUserStore()
const cursor = ref(0)
const pageSize = 20
const route = useRoute()
const list = ref<MemberItem[]>([])
const scrollContainer = ref<HTMLElement | null>(null)
const loadTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const searchKey = ref('')
// 用于防止网络竞态的请求序列号
let requestSequence = 0
// 搜索请求序列号，与默认加载分开
let searchRequestSequence = 0
// 防抖定时器
let searchDebounceTimer: NodeJS.Timeout | null = null
// 搜索结果列表
const searchList = ref<MemberItem[]>([])
// 搜索状态
const isSearching = ref(false)

const closeSearch = () => {
  showSearch.value = false
  searchKey.value = ''
  searchList.value = []
  isSearching.value = false
  // 清除防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  // 关闭搜索后重新设置 IntersectionObserver 以确保能继续加载
  // 使用 nextTick 确保 Vue 的响应式更新完成
  nextTick(() => {
    setupIntersectionObserver()
  })
}

// 控制编辑公告抽屉的显示
const showEditAnnouncementDrawer = ref(false)

// 控制编辑群信息抽屉的显示
const showEditChannelInfoDrawer = ref(false)

// 滚动到顶部的方法
const scrollToTop = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

const currentChannelInfo = computed(() => {
  // 添加强制更新触发器以确保响应式更新
  talkStore.channelUpdateTrigger // 这行会让 computed 在 trigger 变化时重新计算
  return talkStore?.activeCommunity?.channels?.find(item => item.groupId === route.params.channelId)
})

// 判断当前用户是否是频道创建者
const isCurrentUserCreator = computed(() => {
  return currentChannelInfo.value?.createUserMetaId === userStore.last?.metaid
})

const currentLink = computed(() => {
  return window.location.href
})

const copyLink = () => {
  copy(currentLink.value)
  ElMessage.success('Copied')
}

const copyGroupId = () => {
  copy(currentChannelInfo.value?.groupId || '')
  ElMessage.success('Copied')
}

// 打开编辑公告抽屉
const openEditAnnouncementDrawer = () => {
  showEditAnnouncementDrawer.value = true
}

// 打开编辑群信息抽屉
const openEditChannelInfoDrawer = () => {
  showEditChannelInfoDrawer.value = true
}

// 处理公告更新
const handleAnnouncementUpdated = (newAnnouncement: string) => {
  // 使用 store 专门的更新方法，确保全局数据一致性
  if (currentChannelInfo.value) {
    talkStore.updateChannelAnnouncement(currentChannelInfo.value.groupId, newAnnouncement)
  }
}

// 处理群信息更新
const handleChannelInfoUpdated = (updatedInfo: {
  roomName: string
  roomIcon: string
  avatarFile?: File | null
}) => {
  // 使用 store 专门的更新方法，确保全局数据一致性
  if (currentChannelInfo.value) {
    talkStore.updateChannelInfo(currentChannelInfo.value.groupId, {
      roomName: updatedInfo.roomName,
      roomAvatarUrl: updatedInfo.roomIcon,
      roomIcon: updatedInfo.roomIcon, // 同时更新 roomIcon 字段
    })
    // talkStore.fetchChannels()
  }

  // 如果需要通知其他组件更新，可以在这里发送事件
  // 例如：发送自定义事件或更新其他 store 状态
}

const handleDeleteSuccess = (metaid: string) => {
  console.log(metaid)
  cursor.value = 0
  noMore.value = false
  list.value = []

  // 如果当前在搜索状态，重新执行搜索
  if (searchKey.value.trim()) {
    performSearch(searchKey.value.trim())
  } else {
    // 立即滚动到顶部
    scrollToTop()
    load()
  }
}

const handleLeave = async () => {
  if (!currentChannelInfo.value) return

  try {
    const data = {
      groupId: currentChannelInfo.value.groupId,
      state: -1,
      referrer: '',
    }
    const metaidData = {
      body: JSON.stringify(data),
      path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${NodeName.SimpleGroupJoin}`,
      flag: 'metaid',
      version: '1.0.0',
      operation: 'create',
      contentType: 'application/json',
      encryption: '0',
      encoding: 'utf-8',
    }
    await createSinglePin(metaidData)
    ElMessage.success('Left channel successfully')
    emit('update:modelValue', false)
    talkStore.fetchChannels()
    window.location.reload()
  } catch (error) {
    ElMessage.error(error.message || 'Failed to leave channel')
  }
}

// 监听currentChannelInfo变化，重新拉取成员数据
watch(
  currentChannelInfo,
  (newChannelInfo, oldChannelInfo) => {
    if (newChannelInfo && newChannelInfo !== oldChannelInfo) {
      // 重置分页状态
      cursor.value = 0
      noMore.value = false
      list.value = []
      searchList.value = []
      isSearching.value = false
      // 清除搜索防抖定时器
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer)
        searchDebounceTimer = null
      }
      // 立即滚动到顶部
      scrollToTop()
      load()
    }
  },
  { immediate: true }
)

// 监听搜索关键词变化，添加防抖处理
watch(searchKey, newSearchKey => {
  // 清除之前的防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // 如果搜索关键词为空，清空搜索结果，不影响默认列表
  if (!newSearchKey.trim()) {
    searchList.value = []
    isSearching.value = false
    // 重新设置 IntersectionObserver 以确保能继续加载
    nextTick(() => {
      setupIntersectionObserver()
    })
    return
  }

  // 设置防抖定时器
  searchDebounceTimer = setTimeout(() => {
    performSearch(newSearchKey.trim())
  }, 300) // 300ms 防抖延迟
})

// 执行搜索的函数
const performSearch = async (keyword: string) => {
  if (!currentChannelInfo.value || !keyword) return

  isSearching.value = true
  const currentSearchSequence = ++searchRequestSequence

  try {
    const members = await searchChannelMembers({
      groupId: currentChannelInfo.value.groupId,
      query: keyword,
    })

    // 检查竞态条件
    if (currentSearchSequence !== searchRequestSequence) {
      return
    }

    searchList.value = members.map((member: any, index: number) => ({
      ...member,
      index,
      start: index * 60, // 60px = 50px height + 10px margin-top，与默认列表保持一致
    }))
  } catch (error) {
    if (currentSearchSequence === searchRequestSequence) {
      ElMessage.error('搜索群组成员失败')
    }
  } finally {
    if (currentSearchSequence === searchRequestSequence) {
      isSearching.value = false
    }
  }
}

// 监听抽屉打开状态，设置 IntersectionObserver
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      setupIntersectionObserver()
    } else {
      cleanupIntersectionObserver()
    }
  }
)

// 虚拟列表
const loading = ref(false)
const noMore = ref(false)
const disabled = computed(() => loading.value || noMore.value || searchKey.value.trim() !== '')

// 计算当前显示的列表（搜索结果或默认列表）
const currentDisplayList = computed(() => {
  return searchKey.value.trim() ? searchList.value : list.value
})

// 设置 IntersectionObserver
const setupIntersectionObserver = () => {
  if (observer) {
    console.log('Disconnecting previous observer')
    observer.disconnect()
  }

  observer = new IntersectionObserver(
    entries => {
      const [entry] = entries
      if (entry.isIntersecting && !disabled.value) {
        load()
      }
    },
    {
      root: scrollContainer.value,
      rootMargin: '50px',
      threshold: 0.1,
    }
  )

  // 延迟一点时间确保 DOM 已经渲染
  setTimeout(() => {
    if (loadTrigger.value && observer && !searchKey.value.trim()) {
      observer.observe(loadTrigger.value)
    }
  }, 100)
}

// 清理 IntersectionObserver
const cleanupIntersectionObserver = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

const load = () => {
  getMoreMember()
}

// 组件挂载时设置 observer
onMounted(() => {
  if (props.modelValue) {
    setupIntersectionObserver()
  }
})

// 组件卸载时清理 observer 和防抖定时器
onUnmounted(() => {
  cleanupIntersectionObserver()
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

async function getMoreMember() {
  if (!currentChannelInfo.value || loading.value || searchKey.value.trim()) {
    return
  }

  loading.value = true

  try {
    const members = await getChannelMembers({
      groupId: currentChannelInfo.value.groupId,
      cursor: String(cursor.value),
    })

    if (members.length) {
      if (cursor.value === 0) {
        list.value = members.map((member: any, index: number) => ({
          ...member,
          index,
          start: index * 60, // 60px = 50px height + 10px margin-top
        }))
        cursor.value = members.length // 修复：使用实际接收到的成员数量
      } else {
        const startIndex = list.value.length
        const newMembers = members.map((member: any, index: number) => ({
          ...member,
          index: startIndex + index,
          start: (startIndex + index) * 60, // 60px = 50px height + 10px margin-top
        }))
        list.value = [...list.value, ...newMembers]
        cursor.value += members.length // 修复：使用实际接收到的成员数量，而不是固定的 pageSize
      }

      if (members.length < pageSize) {
        noMore.value = true
      }
    } else {
      noMore.value = true
    }

    // 确保在数据更新后重新设置 observer
    if (!noMore.value && loadTrigger.value && observer && !searchKey.value.trim()) {
      // 确保 trigger 元素在 DOM 中可见
      setTimeout(() => {
        if (loadTrigger.value && observer && !searchKey.value.trim()) {
          observer.observe(loadTrigger.value)
        }
      }, 100)
    }
  } catch (error) {
    console.error('Error loading members:', error)
    ElMessage.error('获取群组成员失败')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 8px;
}

*::-webkit-scrollbar-track {
  background: #edeff2;
}

.dark *::-webkit-scrollbar-track {
  background: #111827;
}

*::-webkit-scrollbar-thumb {
  background-color: #bfc2cc;
  border-radius: 20px;
}

.dark *::-webkit-scrollbar-thumb {
  background-color: #374151;
}
.wrap {
  position: relative;
}
.infinite-list-wrapper {
  flex-grow: 1;
}
.infinite-list-wrapper .list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.infinite-list-wrapper .list-item {
  position: relative;
  height: 50px;
}
.infinite-list-wrapper .list-item + .list-item {
  margin-top: 10px;
}

.load-trigger {
  height: 20px;
  width: 100%;
}

.members-header {
  position: sticky;
  top: 60px;
  z-index: 5;
  background: var(--el-drawer-bg-color);
}
.search-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 60px;
  .el-input {
    box-shadow: none;
    border: none;
    flex-grow: 1;
    background-color: transparent !important;

    .el-input__wrapper {
      background-color: transparent !important;
      box-shadow: none !important;
    }

    .el-input__inner {
      background-color: transparent !important;
    }
  }

  .el-input__wrapper {
    background-color: transparent !important;
    box-shadow: none !important;
  }

  // 使用深度选择器确保样式生效
  :deep(.el-input__wrapper) {
    background-color: transparent !important;
    box-shadow: none !important;
  }

  :deep(.el-input__inner) {
    background-color: transparent !important;
  }
}

header {
  height: 60px;
  padding: 0 18px;
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  border-bottom: 1px solid var(--divid-color);
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  background: var(--el-drawer-bg-color);
  z-index: 10;

  .back {
    width: 24px;
    height: 24px;
    text-align: center;
    line-height: 24px;
    position: relative;
    z-index: 2;
    cursor: pointer;

    .icon {
      width: 12px;
      height: 12px;
      display: inline-block;
      transform: rotate(90deg);
    }

    &:hover {
      .icon {
        &:deep(use) {
          stroke: var(--themeBtnTextColor);
          stroke-width: 2px;
        }
      }
    }
  }

  .title {
    line-height: var(--header-height);
    color: var(--themeTextColor);
  }
}
.affix {
  background: var(--el-drawer-bg-color);
}
.info {
  padding-top: 60px;
}

/* 搜索框滑动动画 */
.search-slide-enter-active {
  transition: all 0.3s ease-out;
}

.search-slide-leave-active {
  transition: all 0.3s ease-in;
}

.search-slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.search-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.search-slide-enter-to,
.search-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>
