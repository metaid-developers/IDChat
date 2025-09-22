<template>
  <div class="h-6">
    <div
      class="font-medium text-xs pt-0.5 transition-all duration-300 ease-out"
      :class="[hasNewError ? 'text-rose-500' : 'invisible']"
    >
      <!-- {{ $t('Talk.Errors.' + talkStore.error.type, $t('Talk.Errors.default')) }} -->
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useTalkStore } from '@/stores/talk'
import { ref, watch } from 'vue'
// const talkStore = useTalkStore()
const hasNewError = ref(false)

// watch(talkStore.error, async () => {
//   hasNewError.value = true
//   setTimeout(() => {
//     hasNewError.value = false
//   }, 5000)
// })
</script>

<style lang="scss" scoped></style>
