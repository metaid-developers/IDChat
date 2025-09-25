<template>
  <Teleport to="body">
    <div
      v-show="layout.isShowLoading"
      class="fixed inset-0 fullscreen w-screen bg-black/50 z-70  flex items-center justify-center space-x-2"
    >
      <Icon name="loading" class="w-6 h-6 text-white animate-spin" />
      <div class="text-white text-sm font-bold">{{ $t('Talk.Community.processing') }}</div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { useLayoutStore } from '@/stores/layout'

const layout = useLayoutStore()
</script>
