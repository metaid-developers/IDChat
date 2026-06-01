<template>
  <TransitionRoot :show="layout.isShowSearchModal">
    <Dialog @close="tryClose" class="relative z-[60] text-dark-800 dark:text-gray-100">
      <TransitionChild
        as="template"
        enter="duration-300 ease-out"
        enter-from="opacity-0"
        enter-to="opacity-100"
        leave="duration-200 ease-in"
        leave-from="opacity-100"
        leave-to="opacity-0"
      >
        <div class="fixed inset-0 bg-black/30 backdrop-blur-sm"></div>
      </TransitionChild>

      <div class="fixed inset-0 overflow-y-auto">
        <div class="h-full overflow-y-hidden lg:h-auto lg:min-h-full p-4 lg:p-[12vh]">
          <TransitionChild
            as="template"
            enter="duration-300 ease-out"
            enter-from="opacity-0 scale-75"
            enter-to="opacity-100 scale-100"
            leave="duration-200 ease-in"
            leave-from="opacity-100 scale-100"
            leave-to="opacity-0 scale-75"
          >
            <DialogPanel
              class="w-full max-w-[480PX] mx-auto rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all text-sm"
            >
              <div class="flex gap-x-2">
                <div class="relative grow">
                  <input
                    type="text"
                    class="main-border field-input still dark:!text-gray-100 placeholder:truncate !pr-8 placeholder:text-xs lg:placeholder:text-base"
                    :placeholder="$t('Talk.Search.placeholder')"
                    v-model="searchKeyword"
                    @keyup.enter="search"
                  />
                  <button
                    v-if="searchKeyword"
                    @click="searchKeyword = ''"
                    class="absolute right-0 h-full flex items-center top-0 mr-2 hover:rotate-90 transition duration-300"
                  >
                    <Icon name="x" class="w-5 h-5 text-dark-400 dark:text-gray-300" />
                  </button>
                </div>

                <button
                  :class="[isButtonDisabled && 'faded still', 'p-[12PX] main-border primary']"
                  @click="search"
                  :disabled="isButtonDisabled"
                >
                  <Icon name="search" class="w-5 h-5 text-dark-800" />
                </button>
              </div>

              <!-- 搜索内容 -->
              <div class="">
                <!-- 搜索中 -->
                <div class="flex flex-col items-center mt-6" v-if="isFetching">
                  <img :src="SearchImg" class="h-36 w-36 mx-auto" alt="" />
                  <div class="flex gap-x-2">
                    <Icon name="search" class="w-5 h-5 animate-bounce" />
                    <div class="font-bold">{{ $t('Talk.Search.searching') }}</div>
                  </div>
                </div>

                <!-- 错误 -->
                <div class="flex flex-col items-center mt-6" v-else-if="isError">
                  <img :src="ErrorImg" class="h-36 w-36 mx-auto" alt="" />
                  <div class="flex gap-x-2">
                    <div class="font-bold">{{ $t('Talk.Errors.default') }}</div>
                  </div>
                </div>

                <!-- 搜索结果 -->
                <div class="flex flex-col items-stretch mt-6" v-else-if="results.length">
                  <h4 class="text-sm font-medium my-2">{{ $t('Talk.Search.users') }}</h4>
                  <ResultItem
                    v-for="result in results"
                    :key="result.metaId"
                    :result="result"
                    :last-keyword="lastSearchKeyword"
                    @switching-follow="(isSwitching: boolean) => closeLock = isSwitching"
                  />
                </div>

                <!-- 搜索结果为空 -->
                <div
                  class="flex flex-col items-center mt-6"
                  v-else-if="results.length === 0 && lastSearchKeyword.length > 0"
                >
                  <img :src="EmptyImg" class="h-36 w-36 mx-auto" alt="" />
                  <div class="flex gap-x-2 mt-2">
                    <div class="">
                      <span class="text-dark-300 dark:text-gray-400">{{
                        $t('Talk.Search.no_results')
                      }}</span>
                      <span class="font-bold ml-1 break-all">{{ `"${lastSearchKeyword}"` }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </div>
    </Dialog>
  </TransitionRoot>
</template>

<script lang="ts" setup>
import { TransitionRoot, TransitionChild, Dialog, DialogPanel } from '@headlessui/vue'
import { ref, computed } from 'vue'
import { useQuery } from '@tanstack/vue-query'

import { useLayoutStore } from '@/stores/layout'
import { performSearch } from '@/queries/search'

import SearchImg from '@/assets/images/house_searching.svg?url'
import ErrorImg from '@/assets/images/server_down.svg?url'
import EmptyImg from '@/assets/images/empty.svg?url'

const layout = useLayoutStore()

const closeLock = ref(false)
const tryClose = () => {
  if (closeLock.value) return

  searchKeyword.value = ''
  lastSearchKeyword.value = ''
  results.value = []
  isSearching.value = false

  layout.isShowSearchModal = false
}

// 搜索
const isButtonDisabled = computed(() => {
  return !searchKeyword.value || isSearching.value || closeLock.value
})
const isSearching = ref(false)
const results: any = ref([])
const lastSearchKeyword = ref('')

const searchKeyword = ref('')
const search = async () => {
  if (searchKeyword.value) {
    isSearching.value = true
  }
}

const { isFetching, isError } = useQuery({
  queryKey: ['searchResults', searchKeyword],
  queryFn: () => performSearch(searchKeyword.value),
  enabled: isSearching,
  onSettled: () => (isSearching.value = false),
  onSuccess: data => {
    results.value = data
    lastSearchKeyword.value = searchKeyword.value
  },
  cacheTime: 0,
})

// 虚拟列表
// const resultsContainer = ref(null)
// let vir: any
// watch(
//   [results, resultsContainer],
//   ([results, resultsContainer]) => {
//     if (results.length && resultsContainer) {
//       console.log({ results: results })
//       const count = results.length
//       console.log({ count })
//       vir = useVirtualizer({
//         count: 10,
//         getScrollElement: () => resultsContainer,
//         estimateSize: () => 80,
//       })
//       console.log({ vir })
//       console.log(size:)
//     }
//   },
//   { immediate: true }
// )
</script>
