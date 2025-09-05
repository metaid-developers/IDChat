<template>
  <div
    class="fixed left-0 right-0 top-0 flex items-center px-4 h-12 border-b-2 border-solid border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-700 z-30 lg:h-15 lg:absolute"
  >
    <div class="max-w-[60%] flex items-center">
      <!-- <Icon
        name="bars"
        class="w-6 h-6 text-dark-800 dark:text-gray-100 shrink-0 lg:hidden mr-2"
        @click="layout.isShowLeftNav = true"
      /> -->
      <a class="mt-1 text-center lg:hidden" @click="layout.isShowLeftNav = true">
     
      <el-icon class="w-3 h-3 cursor-pointer  mx-2 shrink-0"><Back /></el-icon>
      </a>

      <div class="flex shrink-0 items-center">
        <UserAvatar
          :image="activeChannel?.userInfo?.avatarImage"
          :meta-id="activeChannel?.id"
          :name="activeChannel?.userInfo?.name"
          :meta-name="''"
          class="w-8 h-8 shrink-0 select-none hidden lg:block mr-2"
          :disabled="true"
        />
        <div
          class="leading-tight no-wrap grow whitespace-nowrap truncate pr-2 max-w-[35vw] lg:max-w-[600PX]"
          @click="layout.isShowUserInfo = !layout.isShowUserInfo"
        >
          <UserName
            :name="activeChannel?.userInfo?.name"
            :meta-name="''"
            :text-class="'!text-base'"
          />
          <!-- {{ activeChannel?.name }} -->
        </div>
      </div>
    </div>
    <div class="flex items-center justify-between grow">
      <div class="flex items-center gap-x-2" v-if="activeChannel?.id">
        <div
          class="text-xs text-dark-300 dark:text-gray-400 bg-dark-100 dark:bg-gray-800 px-3 py-1 rounded hidden lg:block"
        >
          {{ shortenMetaId(activeChannel?.id) }}
        </div>
      </div>

      <!-- 占位 -->
      <div v-else class="w-1"></div>

      <div class="shrink-0 flex items-center">
        <LoginedUserOperate />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useLayoutStore } from '@/stores/layout'
import LoginedUserOperate from '@/components/LoginedUserOperate/LoginedUserOperate.vue'
import { useTalkStore } from '@/stores/talk'
import { computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { Back } from '@element-plus/icons-vue'
const talkStore = useTalkStore()
const userStore = useUserStore()
const layout = useLayoutStore()
const activeChannel = computed(() => talkStore.activeChannel)
const activeChannelId=computed(() => talkStore.activeChannel && talkStore.activeChannel.groupId)


const shortenMetaId = (id: string) => {
  return id.substring(0, 6) + '...' + id.substring(id.length - 6)
}

const doNothing = () => {}
</script>

<style lang=""></style>
