<template>
  <div
    class="broadcast-chat-header bg-white dark:bg-gray-700 text-dark-800 dark:text-white"
    v-if="subchannels.length > 0"
  >
    <div class="broadcast-chat-container" v-for="channel in subchannels" :key="channel.id">
      <div class="broadcast-icon">
        <img :src="subChannel" alt="" />
      </div>

      <div class="broadcast-content">
        <div class="broadcast-title text-base">
          {{ channel.name || '# Broadcast Chat' }}
        </div>
        <!-- <div class="broadcast-description text-xs flex items-center " v-if="channel.lastMessage">
          <span class="font-medium text-dark-600 dark:text-gray-700  mr-1">{{ channel.lastMessage?.senderName || channel.lastMessage?.sender?.slice(0,6) ||  '' }}:</span>
          <span class="text-dark-300 dark:text-gray-400 ">{{ lastMsgContentType(channel.lastMessage?.type,channel.lastMessage?.content,channel.id.slice(0,6)) }}</span>
       
        </div> -->
      </div>

      <el-badge
        :value="getUnreadCount(channel)"
        class="item"
        :max="9999"
        :show-zero="false"
        v-if="getUnreadCount(channel) > 0"
      >
        <div :class="['main-border', 'primary']" @click="goToSubChannel(channel.id)">
          <Icon name="arrow_right" class="cursor-pointer hover:text-gray-700 w-8 h-8" />
        </div>
      </el-badge>

      <div v-else :class="['main-border', 'primary']" @click="goToSubChannel(channel.id)">
        <Icon name="arrow_right" class="cursor-pointer hover:text-gray-700 w-8 h-8" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import subChannel from '@/assets/images/sub-channel.svg?url'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import type { SimpleChannel } from '@/@types/simple-chat'
import {MessageType} from '@/@types/simple-chat'
import { useI18n } from 'vue-i18n'
import { decrypt, ecdhDecrypt } from '@/utils/crypto'
const simpleTalkStore = useSimpleTalkStore()
const i18n=useI18n()
// 计算属性：是否显示广播聊天区域（只在群聊且有子群聊时显示提示）
const subchannels = computed(() => {
  console.log('simpleTalkStore.currSubChannels', simpleTalkStore.currSubChannels)
  return simpleTalkStore.currSubChannels
})


// const subChannelsLastMsg=computed(()=>{
//   console.log("simpleTalkStore.currSubChannels[0]",subchannels.value[0])
//   debugger
//   return subchannels.value[0] || null
// })


// const lastMsgContentType=(type:number,content:string,secretKey:string)=>{
//   console.log("subChannelsLastMsg",subChannelsLastMsg.value)
//   debugger
//   //  switch (type) {
//   //       case MessageType.msg:
//   //         return decrypt(content, secretKey)
//   //       case MessageType.red:
//   //         return `🧧 ${content}`
//   //       case MessageType.img:
//   //         return `[${i18n.t('new_msg_img')}]`
//   //       default:
//   //         return ''
//   //     }
// }

const goToSubChannel = (channelId: string) => {
  // 跳转到子频道的逻辑
  console.log('Navigating to sub-channel with ID:', channelId)
  // 这里可以使用路由跳转或其他方式实现导航
  simpleTalkStore.setActiveChannel(channelId)
}

// 获取子频道的未读消息数
const getUnreadCount = (channel: SimpleChannel) => {
  if (!channel.lastMessage || typeof channel.lastMessage.index !== 'number') {
    console.log('No lastMessage or invalid index for channel:', channel.id)
    return 0
  }
  const lastReadIndex = simpleTalkStore.getLastReadIndex(channel.id)
  const unreadCount = channel.lastMessage.index - lastReadIndex
  return Math.max(0, unreadCount)
}
</script>

<style scoped>
.broadcast-chat-header {
  position: sticky;
  top: 0px;
  z-index: 40;
  /* background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px); */
}

.broadcast-chat-container {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

/* .broadcast-chat-container:hover {
  //background: rgba(255, 255, 255, 0.1);
} */

.broadcast-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 12px;

  margin-right: 12px;
}

.broadcast-content {
  flex: 1;
  min-width: 0;
}

.broadcast-title {
  /* font-size: 16px; */
  font-weight: 500;

  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.channel-count {
  font-size: 12px;
  font-weight: 500;

  padding: 2px 6px;
  border-radius: 10px;
}

.broadcast-description {
  font-size: 13px;

  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-note {
  font-size: 12px;

  font-style: italic;

  padding: 4px 8px;
  border-radius: 6px;
}

.broadcast-latest {
  font-size: 11px;

  display: flex;
  align-items: center;
  gap: 8px;
}

.latest-channel {
  font-weight: 500;
}

.latest-time {
  opacity: 0.8;
}

.broadcast-arrow {
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.6);
  margin-left: 8px;
  transition: transform 0.2s ease;
}

.broadcast-chat-container:hover .broadcast-arrow {
  transform: translateX(2px);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .broadcast-chat-container {
    padding: 10px 12px;
  }

  .broadcast-icon {
    width: 32px;
    height: 32px;
    margin-right: 10px;
  }

  .broadcast-title {
  }

  .broadcast-description {
  }
}
</style>
