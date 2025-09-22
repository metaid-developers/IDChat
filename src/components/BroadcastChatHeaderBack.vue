<template>
  <div class="broadcast-chat-header bg-white dark:bg-gray-700 text-dark-800 dark:text-white" v-if="simpleTalkStore.activeChannel?.type === 'sub-group'">
    <div class="broadcast-chat-container">
      <div class="broadcast-icon hover:scale-110" @click="goChannel">
        <el-icon><Back /></el-icon>
      </div>

      <div class="broadcast-content ">
        <div class="broadcast-title text-base">
          # Broadcast Chat
        </div>
        <div class="broadcast-description text-xs text-dark-300 dark:text-gray-400 ">
          An on-chain "Telegram" running on Bitcoin is here! IDChat, based on the...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import subChannel from '@/assets/images/sub-channel.svg?url'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { Back } from '@element-plus/icons-vue'

const simpleTalkStore = useSimpleTalkStore()

// 计算属性：是否显示广播聊天区域（只在群聊且有子群聊时显示提示）
const subchannels = computed(() => {
  console.log('simpleTalkStore.currSubChannels', simpleTalkStore.currSubChannels)
  return simpleTalkStore.currSubChannels
})
const goChannel = () => {
  // 这里可以使用路由跳转或其他方式实现导航
  simpleTalkStore.setActiveChannel(simpleTalkStore.activeChannel!.parentGroupId!)
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

.broadcast-chat-container:hover {

}

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

  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-note {

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
    font-size: 12px;
  }
}
</style>
