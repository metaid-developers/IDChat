<template>
  <div class="broadcast-chat-header" v-if="simpleTalkStore.activeChannel?.type === 'sub-group'">
    <div class="broadcast-chat-container">
      <div class="broadcast-icon" @click="goToChannel">
        <el-icon><Back /></el-icon>
      </div>

      <div class="broadcast-content">
        <div class="broadcast-title">
          # Broadcast Chat
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

const goToChannel = (channelId: string) => {
  // 跳转到子频道的逻辑
  console.log('Navigating to sub-channel with ID:', channelId)
  // 这里可以使用路由跳转或其他方式实现导航
  simpleTalkStore.setActiveChannel(simpleTalkStore.activeChannel!.parentGroupId!)
}
</script>

<style scoped>
.broadcast-chat-header {
  position: sticky;
  top: 0px;
  z-index: 100;
  background: transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
}

.broadcast-chat-container {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.broadcast-chat-container:hover {
  background: rgba(255, 255, 255, 0.1);
}

.broadcast-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  color: white;
  margin-right: 12px;
}

.broadcast-content {
  flex: 1;
  min-width: 0;
}

.broadcast-title {
  font-size: 16px;
  font-weight: 600;
  color: white;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.channel-count {
  font-size: 12px;
  font-weight: 500;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  padding: 2px 6px;
  border-radius: 10px;
}

.broadcast-description {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.8);
  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.broadcast-note {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
  background: rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 6px;
  border-left: 3px solid rgba(255, 255, 255, 0.3);
}

.broadcast-latest {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
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
  color: white;
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
    font-size: 14px;
  }

  .broadcast-description {
    font-size: 12px;
  }
}
</style>
