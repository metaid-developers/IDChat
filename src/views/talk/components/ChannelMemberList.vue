<template>
  <div
    class="hidden fixed inset-0 pt-20 w-full bg-dark-100 dark:bg-gray-800 h-screen z-10 pb-4 overflow-y-auto lg:static lg:w-60 lg:shrink-0 lg:flex lg:flex-col"
  >
    <div class="flex items-baseline justify-between mb-2 px-4">
      <div class="text-sm text-dark-800 dark:text-gray-100 uppercase font-medium">
        {{ $t('Talk.Channel.team_members') }}
      </div>
      <div class="text-sm text-dark-300 dark:text-gray-400">
        {{ currentChannelInfo?.userCount || 0 }}
      </div>
    </div>

    <div class="w-full overflow-y-auto grow" ref="membersContainer" @scroll="handleScroll">
      <div
        class="w-full relative"
        :style="{ height: vir.getTotalSize() + 'PX' }"
        v-if="talkStore.members.length"
      >
        <ChannelMemberItem
          v-for="item in vir.getVirtualItems()"
          class="absolute top-0 left-0 w-full z-0"
          :id="item.index"
          :style="{ transform: `translateY(${item.start}px)` }"
          :member="talkStore.members.at(item.index)"
          :key="item.index"
        />
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, watch,computed } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'

import { useTalkStore } from '@/stores/talk'
import { debounce } from '@/utils/util'
import ChannelMemberItem from './ChannelMemberItem.vue'
import { useRoute } from 'vue-router'
import {
  getChannelMembers
} from '@/api/talk'

const talkStore = useTalkStore()
const isLoading = ref(false)
const hasMore = ref(true)
const cursor = ref(20)
const pageSize = 20
const route = useRoute()
// 虚拟列表
const membersContainer = ref(null)

let vir: any


const currentChannelInfo=computed(()=>{
  return talkStore?.activeCommunity?.channels?.find((item)=>item.pinId == route.params.channelId)
})



// 处理滚动事件
const handleScroll = () => {
  if (!membersContainer.value || isLoading.value || !hasMore.value) return
  
  const { scrollTop, scrollHeight, clientHeight } = membersContainer.value
  
  // 检测是否滚动到顶部 (添加5px的容差)
  const isAtTop = scrollTop <= 5
  if (isAtTop) {
    console.log('滚动到顶部')
    // 这里可以添加加载更多数据的逻辑
  }
  
  // 检测是否滚动到底部 (添加5px的容差)
  const isAtBottom = scrollHeight - (scrollTop + clientHeight) <= 5
  if (isAtBottom) {
    console.log('滚动到底部')
    debounce(getMoreMember(),2000)
    // 这里可以添加加载更多数据的逻辑
  }
}


// 获取更多成员
async function getMoreMember() {
  isLoading.value = true
  
  try {
    const members = await getChannelMembers({
      groupId: talkStore.activeChannelId,
      cursor: String(cursor.value),
    
    })
    
    if (members.length) {
      talkStore.members.push(...members)
      cursor.value += pageSize
      
      // 更新虚拟列表尺寸
      vir.value?.measure()
      
      // 检查是否还有更多数据
      if (members.length < pageSize) {
        hasMore.value = false
      }
    } else {
      hasMore.value = false
    }
  } catch (error) {
    ElMessage.error('获取群组成员失败')
  } finally {
    isLoading.value = false
  }
}


// async function getMoreMember(){
//       const lastTimeStamp=talkStore.members[0].timestamp
//       debugger
//     getChannelMembers({groupId:talkStore.activeChannelId,timestamp:lastTimeStamp})
//       .then((members: any) => {
//        if(members.length){
//         debugger
//          talkStore.members.push(...members)
//        }
//       })
//       .catch(() => {
//         ElMessage.error('获取群组成员失败')
//       })
// } 


watch(
  () => talkStore.members.length,
  count => {
    if (count) {
      vir = useVirtualizer({
        count,
        getScrollElement: () => membersContainer.value,
        estimateSize: () => 52,
        overscan: 6,
  
      })
      console.log('wir',vir)
    }
  },
  { immediate: true }
)
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
</style>
