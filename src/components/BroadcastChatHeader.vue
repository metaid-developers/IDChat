<template>
  <div
    class="broadcast-chat-header bg-white dark:bg-gray-700 text-dark-800 dark:text-white"
    v-show="visibleSubchannels.length > 0"
  >
    <div
      class="broadcast-chat-container"
      v-for="channel in visibleSubchannels"
      :key="channel.id"
      @click="goToSubChannel(channel.id)"
    >
      <div class="broadcast-icon">
        <img :src="subChannel" alt="" />
      </div>

      <div class="broadcast-content">
        <div class="broadcast-title text-base">
          {{ channel.name || '# Broadcast Chat' }}
        </div>
        <div
          class="broadcast-description text-xs flex items-center "
          v-if="channel.lastMessage?.sender"
        >
          <span class="text-dark-300 dark:text-gray-400"
            >{{
              channel.lastMessage?.senderName || channel.lastMessage?.sender?.slice(0, 6) || ''
            }}:</span
          >
          <span class="text-dark-300 dark:text-gray-400 ">{{
            lastMsgContentType(channel.lastMessage?.type, channel.lastMessage?.content, channel.id)
          }}</span>
        </div>
      </div>
      <div class="flex flex-row items-center gap-7">
        <el-badge
          :value="getUnreadCount(channel)"
          class="item"
          :max="9999"
          :show-zero="false"
          v-if="getUnreadCount(channel) > 0"
        >
          <div :class="['main-border', 'primary']">
            <Icon name="arrow_right" class="cursor-pointer hover:text-gray-700  w-8 h-8" />
          </div>
        </el-badge>

        <div v-else :class="['main-border', 'primary']">
          <Icon name="arrow_right" class="cursor-pointer hover:text-gray-700 w-8 h-8" />
        </div>

        <div
          @click.stop="closeSubChannelHeader($event, channel)"
          class="flex z-[999] w-7 h-7 cursor-pointer hover:scale-105 items-center justify-center"
        >
          <el-icon :size="28"><CircleClose /></el-icon>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed,ref,watch } from 'vue'
import subChannel from '@/assets/images/sub-channel.svg?url'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import type { SimpleChannel } from '@/@types/simple-chat.d'
import {MessageType} from '@/@types/simple-chat.d'
import { useI18n } from 'vue-i18n'
import { decrypt, ecdhDecrypt } from '@/utils/crypto'
import { useRouter } from 'vue-router'
import { CircleClose } from '@element-plus/icons-vue'

const simpleTalkStore = useSimpleTalkStore()
const router=useRouter()
const i18n=useI18n()
const hasUnreadAmount=ref(false)
// 计算属性：获取所有子频道
const subchannels = computed(() => {
  return simpleTalkStore.currSubChannels
})

// 计算属性：过滤出未被隐藏的子频道
const visibleSubchannels = computed(() => {
  return subchannels.value.filter(channel => {
    // 检查该子频道是否被隐藏
    return simpleTalkStore.getOneChannelSubHeaderShowStatus(channel.id)
  })
})

function closeSubChannelHeader(e: Event, channel: SimpleChannel){
  e.stopPropagation()
  e.preventDefault()

  // 使用子频道自己的 ID 来保存隐藏状态
  const subChannelId = channel.id

  console.log('🔴 关闭子频道头部, subChannelId:', subChannelId, 'channel name:', channel.name)

  if (subChannelId) {
    simpleTalkStore.updateShowSubChannelHeader({
      groupId: subChannelId,
      status: false
    })
  }
}

const lastMsgContentType = (type: MessageType, content: string, channelId: string) => {
  let secretKeyStr = channelId?.substring(0, 16) || ''
      switch (type) {
        case MessageType.msg:
          return decrypt(content, secretKeyStr)
        case MessageType.red:
          return content
        case MessageType.img:
          return `[${i18n.t('new_msg_img')}]`
        default:
          return ''
      }
}



const goToSubChannel = (channelId: string) => {
  // 跳转到子频道的逻辑

  router.push({
     name: 'talkChannel',
    params:{
      communityId:'public',
      channelId:simpleTalkStore.activeChannel!.id!,
      subId:channelId
    }
  })
  //simpleTalkStore.enterSubGroupChat(channelId)
}

// 获取子频道的未读消息数
const getUnreadCount = (channel: SimpleChannel) => {
  if (!channel.lastMessage || typeof channel.lastMessage.index !== 'number') {
    console.log('No lastMessage or invalid index for channel:', channel.id)
    return 0
  }
simpleTalkStore.getLastReadIndex(channel.id).then((lastReadIndex)=>{

    const unreadCount = +channel.lastMessage.index - (+lastReadIndex)
    if(unreadCount > 0 && channel.lastMessage?.sender == channel.createdBy){
      hasUnreadAmount.value=true
    }else{
      hasUnreadAmount.value=false
    }
  return Math.max(0, unreadCount)
  }).catch(()=>{
    return 0
  })

}


watch(()=>hasUnreadAmount.value,(newVal:boolean)=>{
if(newVal){
  if(simpleTalkStore.activeChannel?.type !== 'sub-group'){

    simpleTalkStore.updateShowSubChannelHeader({
    groupId:simpleTalkStore.activeChannel?.id!,
    status:true
  })
  }

}
})
</script>

<style scoped>
.broadcast-chat-header {
  position: sticky;
  top: 0px;
  z-index: 28;
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
