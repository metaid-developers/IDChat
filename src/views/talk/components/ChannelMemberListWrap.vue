<template>
  <div
    class="hidden fixed inset-0 pt-20 w-full bg-dark-100 dark:bg-gray-800 h-screen z-10 pb-4 overflow-y-auto lg:static lg:w-60 lg:shrink-0 lg:flex lg:flex-col"
  >
    <ChannelMemberList />
  </div>
</template>
<script lang="ts" setup>
import ChannelMemberList from './ChannelMemberList.vue'
</script>

<style lang="scss" scoped></style>
