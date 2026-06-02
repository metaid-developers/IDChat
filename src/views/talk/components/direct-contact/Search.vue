<template>
  <div class="bg-inherit p-3 pr-3.5">
    <div class="flex max-w-full items-center gap-3">
      <button
        v-if="userStore.isAuthorized"
        class="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors"
        :class="[
          props.isOnlineBotPanelOpen
            ? 'bg-gray-200 text-dark-800 dark:bg-gray-900 dark:text-gray-100'
            : 'text-dark-400 hover:bg-gray-200 hover:text-dark-800 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100',
        ]"
        type="button"
        @click="openOnlineBotPanel"
      >
        <span
          class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.14)]"
          aria-hidden="true"
        ></span>
        在线Bot
      </button>
      <div
        class="relative flex h-9 min-w-0 grow items-center rounded-full bg-white p-2 dark:bg-gray-950"
      >
        <span class="absolute inset-y-0 left-0 flex items-center pl-3">
          <SearchIcon class="h-3.5 w-3.5 text-dark-250" />
        </span>
        <input
          type="text"
          class="dark:bg-gray-950 text-dark-800 dark:text-gray-100 text-sm leading-tight font-normal placeholder-dark-250 outline-0 m-0 w-full pl-6"
          :placeholder="$t('Talk.Channel.search')"
          :value="keyword"
          @input="handleSearch"
          @click="openSearchModal"
          readonly
        />
      </div>

      <div
        class="border-dashed border-2 border-gray-200 dark:border-gray-600 w-8 h-8 flex items-center justify-center rounded-3xl text-dark-400 cursor-pointer hover:text-dark-800 hover:border-solid hover:border-dark-300 hover:bg-primary transition-all duration-300"
        v-if="userStore.isAuthorized "
        @click="layout.isShowCreatePublicChannelModal = true"
      >
        <Icon name="plus" class="w-[20PX] h-[20PX]" />
      </div>

      <!-- <div class="">
         <Icon name="user_plus" class="w-6 h-6 p-0.5 cursor-pointer" />

      </div> -->
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
export default defineComponent({
  name: 'DirectContactSearch',
})
</script>

<script lang="ts" setup>
import { useUserStore } from '@/stores/user'
import { ref } from 'vue'
import { useLayoutStore } from '@/stores/layout'
import { Search as SearchIcon } from '@element-plus/icons-vue'

interface Props {
  isOnlineBotPanelOpen?: boolean
}

interface Emits {
  (e: 'open-search'): void
  (e: 'open-online-bots'): void
}

const props = withDefaults(defineProps<Props>(), {
  isOnlineBotPanelOpen: false,
})
const emit = defineEmits<Emits>()

// const groupWhiteList = [
//   '1Fw9tW2p6hossLoXXbsX8vjYrCBJyCFLCX',
//   '1JJSRmegmjgth5HLHHjjaCFVoUzSu5iLxP',
//   '16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo',
//   '12ghVWG1yAgNjzXj4mr3qK9DgyornMUikZ',
//   '195gtuVbW9DsKPnSZLrt9kdJrQmvrAt7e3',
// ]

const userStore = useUserStore()
const layout = useLayoutStore()

const keyword = ref('')

const handleSearch = () => {
  console.log(keyword.value)
  // 先进行名字搜索
}

const openSearchModal = () => {
  console.log('Search clicked, emitting open-search event')
  emit('open-search')
}

const openOnlineBotPanel = () => {
  emit('open-online-bots')
}

// const whiteList = computed(() => {
//   return groupWhiteList.includes(userStore.last?.address)
// })
</script>
