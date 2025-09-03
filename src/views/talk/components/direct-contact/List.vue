<template>
  <div
    class="bg-white dark:bg-gray-700 fixed inset-0 fullscreen w-screen z-40 lg:static lg:shrink-0 lg:w-auto"
    :class="[layout.isShowLeftNav ? '' : 'hidden lg:block']"
  >
    <div class="w-full h-full flex">
      <!-- 占位 -->
      <!-- <div class="shrink-0 bg-white dark:bg-gray-700 w-22.5 lg:hidden"></div> -->

     


      <div
        class="h-full bg-dark-100 dark:bg-gray-800 grow lg:w-70 flex flex-col justify-between items-stretch"
      >
      

        <div class="flex lg:w-[364PX] flex-col overflow-y-hidden">
      

          <!-- 搜索栏 -->
          <DirectContactSearch />

          <Welcome v-if="!activeCommunity?.channels?.length"></Welcome>

          <!-- 联系人列表 -->
          <div class="overflow-y-auto" v-else>
            <DirectContactItem
              v-for="session in activeCommunity?.channels ?? []"
              :key="session.timestamp"
              :session="session"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useLayoutStore } from '@/stores/layout'
import DirectContactSearch from './Search.vue'
import DirectContactItem from './Item.vue'
import { useTalkStore } from '@/stores/talk'
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import Welcome from '@/components/Welcome/welcome.vue'
const layout = useLayoutStore()
const { activeCommunity } = storeToRefs(useTalkStore())
  console.log("layout.isShowLeftNav1111",layout.isShowLeftNav)
const aaa=computed(()=>{
  console.log("layout.isShowLeftNav1111",layout.isShowLeftNav)
  return layout.isShowLeftNav
})
// const test=computed(()=>{
//  return talkStore.activeCommunityChannels
// })
// console.log("test",test.value)
</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 0px !important;
}
</style>
