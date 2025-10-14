<template>
  <div class="unread-divider-wrapper" id="unread-divider-wrapper">
    <div class="unread-divider">
      <div class="unread-divider-line"></div>
      <div class="unread-divider-text">
        {{ $t('unread_messages') || 'Unread messages' }}
      </div>
      <div class="unread-divider-line"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
// 未读消息分割线组件
defineProps<{
  id: string
}>()
</script>

<script lang="ts">
export default {
  name: 'UnreadMessagesDivider',
}
</script>

<style lang="scss" scoped>
.unread-divider-wrapper {
  margin: 16px 0;
  padding: 0 20px;
}

.unread-divider {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.unread-divider-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, #ff4757 50%, transparent 100%);
}

.unread-divider-text {
  font-size: 12px;
  font-weight: 500;
  color: #ff4757;
  background: #fff;
  padding: 4px 12px;
  border-radius: 12px;
  border: 1px solid #ff4757;
  white-space: nowrap;
  user-select: none;
}

.dark .unread-divider-text {
  background: #1f2937;
  color: #ff6b7a;
  border-color: #ff6b7a;
}

.dark .unread-divider-line {
  background: linear-gradient(90deg, transparent 0%, #ff6b7a 50%, transparent 100%);
}
</style>
