<template>
  <div  class="bg-white flex  items-center justify-center dark:bg-gray-700 w-full  py-[20px]">
    <span class="font-lg text-[#FC4F60]">
         {{ $t('Mute') }}
    </span>
  </div>
</template>
<script setup lang='ts'>
import { useI18n } from 'vue-i18n';

const i18n=useI18n()
</script>
<style lang='scss' scoped>

</style>