<template>
  <div class="sub-channels-modal" v-if="visible" @click="handleBackdropClick">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h3 class="modal-title">选择子频道</h3>
        <button class="close-button" @click="handleClose">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M18 6L6 18M6 6l12 12"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="modal-body">
        <div class="sub-channels-list">
          <div
            v-for="channel in subChannels"
            :key="channel.id"
            class="sub-channel-item"
            @click="handleSelectChannel(channel.id)"
          >
            <div class="channel-avatar">
              <img
                v-if="channel.avatar"
                :src="channel.avatar"
                :alt="channel.name"
                class="avatar-image"
              />
              <div v-else class="avatar-placeholder">
                <span>{{ channel.name.charAt(0).toUpperCase() }}</span>
              </div>
            </div>

            <div class="channel-info">
              <div class="channel-name">{{ channel.name }}</div>
              <div class="channel-note" v-if="channel.roomNote">
                {{ channel.roomNote }}
              </div>
              <div class="channel-stats">
                <span class="member-count" v-if="channel.userCount">
                  {{ channel.userCount }} 成员
                </span>
                <span class="last-activity" v-if="channel.lastMessage">
                  {{ formatTime(channel.lastMessage.timestamp) }}
                </span>
              </div>
            </div>

            <div class="channel-status">
              <div class="unread-badge" v-if="channel.unreadCount > 0">
                {{ channel.unreadCount > 99 ? '99+' : channel.unreadCount }}
              </div>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="enter-arrow">
                <path
                  d="M6 12L10 8L6 4"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <div v-if="subChannels.length === 0" class="empty-state">
          <div class="empty-icon">📢</div>
          <div class="empty-text">暂无子频道</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { SimpleChannel } from '@/@types/simple-chat.d'

interface Props {
  visible: boolean
  subChannels: SimpleChannel[]
}

interface Emits {
  (e: 'close'): void
  (e: 'select', channelId: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 处理背景点击关闭
const handleBackdropClick = (event: MouseEvent) => {
  emit('close')
}

// 处理关闭按钮
const handleClose = () => {
  emit('close')
}

// 处理选择频道
const handleSelectChannel = (channelId: string) => {
  emit('select', channelId)
  emit('close')
}

// 格式化时间
const formatTime = (timestamp: number): string => {
  const now = Date.now()
  const diff = now - timestamp * 1000

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

// 监听visible变化，处理键盘事件
watch(() => props.visible, (visible) => {
  if (visible) {
    document.addEventListener('keydown', handleKeyDown)
  } else {
    document.removeEventListener('keydown', handleKeyDown)
  }
})

// 处理ESC键关闭
const handleKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    emit('close')
  }
}
</script>

<style scoped>
.sub-channels-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.modal-content {
  background: white;
  border-radius: 16px;
  width: 90vw;
  max-width: 480px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0;
}

.close-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  border-radius: 8px;
  cursor: pointer;
  color: #666;
  transition: all 0.2s ease;
}

.close-button:hover {
  background: #f5f5f5;
  color: #1a1a1a;
}

.modal-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.sub-channels-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.sub-channel-item {
  display: flex;
  align-items: center;
  padding: 12px 24px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.sub-channel-item:hover {
  background: #f8f9fa;
}

.channel-avatar {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  margin-right: 12px;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 12px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: 600;
  font-size: 18px;
}

.channel-info {
  flex: 1;
  min-width: 0;
}

.channel-name {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.channel-note {
  font-size: 14px;
  color: #666;
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #999;
}

.member-count {
  font-weight: 500;
}

.channel-status {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.unread-badge {
  background: #ff4757;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.enter-arrow {
  color: #ccc;
  transition: all 0.2s ease;
}

.sub-channel-item:hover .enter-arrow {
  color: #667eea;
  transform: translateX(2px);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 24px;
  color: #999;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
    max-height: 85vh;
    margin: 20px;
  }

  .modal-header {
    padding: 16px 20px 12px;
  }

  .modal-title {
    font-size: 16px;
  }

  .sub-channel-item {
    padding: 10px 20px;
  }

  .channel-avatar {
    width: 40px;
    height: 40px;
    margin-right: 10px;
  }

  .avatar-placeholder {
    font-size: 16px;
  }

  .channel-name {
    font-size: 15px;
  }

  .channel-note {
    font-size: 13px;
  }
}
</style>
