<template>
  <div class="bg-white pt-[11PX] pb-[15PX] flex items-center justify-between dark:bg-gray-700 px-4">
    <div class="nav-left flex  ">
        <div class="nav-icon cursor-pointer mr-2 flex items-center w-[42px] h-[42px] justify-center ">
           
            <el-icon :size="17"  @click="layout.isShowSubChannelDrawer = false"><Back /></el-icon>
        </div>
        <div class="nav-content">
            <div class="text-base font-medium">{{ $t('Talk.Channel.broadcast_title') }}</div>
            <div class="text-sm  text-dark-300 dark:text-gray-400">1321321321</div>
        </div>
    </div>
   
  </div>
</template>
<script setup lang='ts'>
import { useLayoutStore } from '@/stores/layout';
import { useTalkStore } from '@/stores/talk';
import { Back } from '@element-plus/icons-vue'

const talk=useTalkStore()
const layout=useLayoutStore()



</script>
<style lang='scss' scoped>

</style>