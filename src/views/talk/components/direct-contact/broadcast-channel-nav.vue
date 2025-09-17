<template>
  <div class="bg-white pt-[11PX] pb-[15PX] flex items-center justify-between dark:bg-gray-700 px-4">
    <div class="nav-left flex  ">
        <div class="nav-icon mr-2 flex items-center w-[42px] h-[42px] justify-center ">
            <Icon name="broadcast_icon" class=" text-dark-800 dark:text-gray-100"  />
        </div>
        <div class="nav-content">
            <div class="text-base font-medium">{{ $t('Talk.Channel.broadcast_title') }}</div>
            <div class="text-sm  text-dark-300 dark:text-gray-400">1321321321</div>
        </div>
    </div>
    <div class="nav-right">
          <div class="flex items-center justify-center  ">
          <button
            class="w-9 h-9 main-border primary flex items-center justify-center"
            :class="{
              'faded still text-dark-300  dark:text-gray-400 dark:!bg-gray-700': '',
            }"
            
            @click="linkToBroadcastChannel(talk.activeChannel?.subChannels?.[0])"
          >
            <Icon name="arrow_right" class="w-6 h-6" />
          </button>
        </div>
    </div>
  </div>
</template>
<script setup lang='ts'>
import { useLayoutStore } from '@/stores/layout';
import { useTalkStore } from '@/stores/talk';


const talk=useTalkStore()
const layout=useLayoutStore()

function linkToBroadcastChannel(groupId:string){
    layout.isShowSubChannelDrawer=true
}

</script>
<style lang='scss' scoped>

</style>