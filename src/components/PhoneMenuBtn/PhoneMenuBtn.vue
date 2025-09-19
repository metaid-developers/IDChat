<template>
  <div id="phone-content" class="phone-content flex flex-align-center">
    <Icon
      :name="layout.isShowLeftNav ? 'x_mark' : 'bars'"
      id="phone-menu-btn"
      @click="layout.$patch({ isShowLeftNav: !layout.isShowLeftNav,isShowContactList:!layout.isShowContactList })"
    />

    <div class="dived"></div>
    <slot></slot>
  </div>
</template>

<script setup lang="ts">
import { useLayoutStore } from '@/stores/layout'

const layout = useLayoutStore()
</script>

<style lang="scss" scoped src="./PhoneMenuBtn.scss"></style>
