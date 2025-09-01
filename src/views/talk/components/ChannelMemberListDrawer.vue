<template>
  <ElDrawer
    :model-value="modelValue"
    :show-close="false"
    :with-header="false"
    :size="'360px'"
    :append-to-body="true"
    :lock-scroll="true"
    :close-on-click-modal="false"
    custom-class="none-padding"
  >
    <div class="flex flex-col h-full">
      <header class="flex items-center justify-between">
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
      </header>

      <div class="flex flex-col flex-1 bg-dark-100 dark:bg-gray-800 overflow-hidden">
        <div class="flex flex-col items-center justify-center mt-4 mb-2">
          <ChatImage
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
          />
          <div class=" text-xl font-medium text-dark-800 dark:text-gray-100 mt-5">
            {{ currentChannelInfo?.roomName || '' }}
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
            {{ $t('Talk.Channel.link') }}
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

        <div class="flex items-baseline justify-between mb-2 px-4 py-4">
          <div class="text-sm text-dark-800 dark:text-gray-100 uppercase font-medium">
            {{ $t('Talk.Channel.team_members') }}
          </div>
          <div class="text-sm text-dark-300 dark:text-gray-400">
            {{ currentChannelInfo?.userCount || 0 }}
          </div>
        </div>
        <div class="infinite-list-wrapper" style="overflow: auto" ref="scrollContainer">
          <ul
            v-infinite-scroll="load"
            class="list"
            :infinite-scroll-disabled="disabled"
            infinite-scroll-distance="100"
          >
            <li v-for="member in list" :key="member.id" class="w-full relative list-item">
              <ChannelMemberItem
                class="absolute top-0 left-0 w-full z-0"
                :id="member.index"
                :style="{ transform: `translateY(${member.start}px)` }"
                :member="member"
                :key="member.index"
              />
            </li>
          </ul>
          <div
            style="
            display: flex;
            align-items: center;
            justify-items: space-between;
          "
            v-if="loading && !list.length"
          >
            <el-skeleton-item variant="text" style="margin-right: 16px" />
            <el-skeleton-item variant="text" style="width: 30%" />
          </div>
          <p v-if="loading" class="text-center">Loading...</p>
          <p v-if="noMore" class="text-center">No more</p>
        </div>
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

<script setup lang="ts">
import { ref, watch, computed, defineProps, defineEmits, withDefaults } from 'vue'

import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import ChannelMemberItem from './ChannelMemberItem.vue'
import EditAnnouncementDrawer from './EditAnnouncementDrawer.vue'
import EditChannelInfoDrawer from './EditChannelInfoDrawer.vue'
import { useRoute } from 'vue-router'
import { getChannelMembers } from '@/api/talk'
import { ElMessage } from 'element-plus'
import copy from 'copy-to-clipboard'
import { ArrowRight, Edit, Link } from '@element-plus/icons-vue'
import { metafile } from '@/utils/filters'
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

const talkStore = useTalkStore()
const userStore = useUserStore()
const cursor = ref(0)
const pageSize = 20
const route = useRoute()
const list = ref<MemberItem[]>([])
const scrollContainer = ref<HTMLElement | null>(null)

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
  return talkStore?.activeCommunity?.channels?.find(item => item?.groupId === route.params.channelId || item?.metaId == route.params.channelId)
})

// 判断当前用户是否是频道创建者
const isCurrentUserCreator = computed(() => {
  console.log('currentChannelInfo', { ...currentChannelInfo.value }, userStore.last?.metaid)
  return currentChannelInfo.value?.createUserMetaId === userStore.last?.metaid
})

const currentLink = computed(() => {
  return window.location.href
})

const copyLink = () => {
  copy(currentLink.value)
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
  roomAvatarUrl: string
  avatarFile?: File | null
}) => {
  // 使用 store 专门的更新方法，确保全局数据一致性
  if (currentChannelInfo.value) {
    talkStore.updateChannelInfo(currentChannelInfo.value.groupId, {
      roomName: updatedInfo.roomName,
      roomAvatarUrl: updatedInfo.roomAvatarUrl,
      roomIcon: updatedInfo.roomAvatarUrl, // 同时更新 roomIcon 字段
    })
    // talkStore.fetchChannels()
  }

  // 如果需要通知其他组件更新，可以在这里发送事件
  // 例如：发送自定义事件或更新其他 store 状态
}

// 监听currentChannelInfo变化，重新拉取成员数据
watch(
  currentChannelInfo,
  (newChannelInfo, oldChannelInfo) => {
    if (newChannelInfo && newChannelInfo !== oldChannelInfo) {
      // 重置分页状态
      cursor.value = 0
      noMore.value = false
      // 立即滚动到顶部
      scrollToTop()
      load()
    }
  },
  { immediate: false }
)

// 虚拟列表
const loading = ref(false)
const noMore = ref(false)
const disabled = computed(() => loading.value || noMore.value)
const load = () => {
  getMoreMember()
}

async function getMoreMember() {
  if (!currentChannelInfo.value) return
  const isSession=Number(currentChannelInfo.value?.type) === 2 ? true : false
  if(isSession) return
  loading.value = true
  try {
    const members = await getChannelMembers({
      groupId: currentChannelInfo.value.groupId,
      cursor: String(cursor.value),
    })

    if (members.length) {
      console.log('members', members)
      if (cursor.value === 0) {
        list.value = members
      } else {
        list.value = [...list.value, ...members]
      }

      cursor.value += pageSize
      if (members.length < pageSize) {
        noMore.value = true
      }
    } else {
      noMore.value = true
    }
  } catch (error) {
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

header {
  height: var(--header-height);
  padding: 0 18px;
  position: relative;
  border-bottom: 1px solid var(--divid-color);
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;

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
</style>
