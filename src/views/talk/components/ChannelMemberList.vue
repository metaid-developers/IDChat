<template>
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
    <p v-if="noMore" class="text-center mt-5 text-gray-400">No more</p>
  </div>
</template>
<script lang="ts" setup>
import { ref, watch, computed, nextTick } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { ElMessage } from 'element-plus'

import { useTalkStore } from '@/stores/talk'
import { debounce } from '@/utils/util'
import ChannelMemberItem from './ChannelMemberItem.vue'
import { useRoute } from 'vue-router'
import { getChannelMembers } from '@/api/talk'

const talkStore = useTalkStore()
const cursor = ref(0)
const pageSize = 20
const route = useRoute()
const list = ref<any[]>([])
const scrollContainer = ref<HTMLElement | null>(null)

// 滚动到顶部的方法
const scrollToTop = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

const currentChannelInfo = computed(() => {
  return talkStore?.activeCommunity?.channels?.find(item => item.groupId === route.params.channelId)
})

// 监听currentChannelInfo变化，重新拉取成员数据
watch(
  currentChannelInfo,
  (newChannelInfo, oldChannelInfo) => {
    if (newChannelInfo && newChannelInfo !== oldChannelInfo) {
      console.log('currentChannelInfo', newChannelInfo)
      // 重置分页状态
      cursor.value = 0
      noMore.value = false
      // 立即滚动到顶部
      scrollToTop()
      load()
    }
  },
  { immediate: true }
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
</style>
