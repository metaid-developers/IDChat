<template>
  <Transition
    appear
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="-translate-y-2 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="translate-y-0 opacity-100"
    leave-to-class="-translate-y-2 opacity-0"
  >
    <div
      class="absolute left-3 right-3 top-[60px] z-[60] flex max-h-[calc(100vh-112px)] flex-col overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700"
      @click.stop
    >
      <div
        class="flex min-h-[52px] items-center justify-between gap-3 border-b border-gray-100 px-3 py-2 dark:border-gray-700"
      >
        <div class="min-w-0">
          <div class="truncate text-sm font-medium leading-[20px] text-dark-800 dark:text-gray-100">
            在线Bot
          </div>
          <div class="truncate text-[11px] leading-[14px] text-dark-250 dark:text-gray-400">
            {{ statusText }}
          </div>
        </div>
        <button
          class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-dark-300 transition-colors hover:bg-gray-100 hover:text-dark-800 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
          type="button"
          title="关闭"
          @click="emit('close')"
        >
          <Icon name="x" class="h-4 w-4" />
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto py-1">
        <div v-if="isLoading" class="flex items-center justify-center gap-2 px-3 py-8">
          <Icon name="loading" class="h-4 w-4 animate-spin text-dark-300 dark:text-gray-400" />
          <span class="text-xs text-dark-300 dark:text-gray-400">加载中</span>
        </div>

        <div v-else-if="errorMessage" class="px-3 py-4">
          <div class="text-xs leading-5 text-red-500 dark:text-red-300">
            {{ errorMessage }}
          </div>
          <button
            class="mt-2 h-8 rounded-md px-2.5 text-xs font-medium text-dark-500 transition-colors hover:bg-gray-100 hover:text-dark-800 dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100"
            type="button"
            @click="loadOnlineBots()"
          >
            重试
          </button>
        </div>

        <div
          v-else-if="!bots.length"
          class="px-3 py-8 text-center text-xs text-dark-300 dark:text-gray-400"
        >
          暂无在线Bot
        </div>

        <template v-else>
          <button
            v-for="bot in bots"
            :key="bot.globalMetaId"
            class="flex min-h-[76px] w-full items-center gap-3 px-3 py-2.5 text-left transition-colors lg:hover:bg-gray-200 lg:hover:dark:bg-gray-900"
            type="button"
            @click="emit('select', bot)"
          >
            <div class="h-12 w-12 shrink-0 rounded-full">
              <UserAvatar
                :image="bot.avatar"
                :name="bot.name"
                :meta-id="bot.globalMetaId"
                :global-meta-id="bot.globalMetaId"
                :meta-name="''"
                :disabled="true"
                :image-class="'w-12 h-12 rounded-full'"
                class="w-12 h-12"
              />
            </div>
            <div class="flex min-w-0 flex-1 flex-col justify-center">
              <div class="flex min-w-0 items-center gap-1.5">
                <div
                  class="truncate text-sm font-medium leading-[20px] text-dark-800 dark:text-gray-100"
                >
                  {{ bot.name }}
                </div>
                <span
                  class="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.12)]"
                  aria-label="在线"
                ></span>
              </div>
              <div class="online-bot-summary break-words text-xs text-dark-300 dark:text-gray-400">
                {{ bot.bio || formatOnlineStatus(bot.lastSeenAgoSeconds) }}
              </div>
            </div>
          </button>
        </template>
      </div>

      <div
        v-if="showPagination"
        class="flex h-11 shrink-0 items-center justify-between gap-2 border-t border-gray-100 px-3 dark:border-gray-700"
      >
        <button
          class="h-7 rounded-md px-2.5 text-xs font-medium text-dark-500 transition-colors hover:bg-gray-100 hover:text-dark-800 disabled:cursor-not-allowed disabled:text-dark-250 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100 dark:disabled:text-gray-600"
          type="button"
          :disabled="!hasPreviousPage || isLoading"
          @click="goToPreviousPage"
        >
          上一页
        </button>
        <div class="shrink-0 text-[11px] leading-[14px] text-dark-250 dark:text-gray-400">
          第 {{ currentPage }} 页
        </div>
        <button
          class="h-7 rounded-md px-2.5 text-xs font-medium text-dark-500 transition-colors hover:bg-gray-100 hover:text-dark-800 disabled:cursor-not-allowed disabled:text-dark-250 disabled:hover:bg-transparent dark:text-gray-300 dark:hover:bg-gray-900 dark:hover:text-gray-100 dark:disabled:text-gray-600"
          type="button"
          :disabled="!hasNextPage || isLoading"
          @click="goToNextPage"
        >
          下一页
        </button>
      </div>
    </div>
  </Transition>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { ONLINE_BOT_PAGE_SIZE, getOnlineBots, type OnlineBot } from '@/api/online-bots'

interface Emits {
  (e: 'close'): void
  (e: 'select', bot: OnlineBot): void
}

const emit = defineEmits<Emits>()

const bots = ref<OnlineBot[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const cursor = ref(0)
const total = ref(0)

const currentPage = computed(() => Math.floor(cursor.value / ONLINE_BOT_PAGE_SIZE) + 1)
const hasPreviousPage = computed(() => cursor.value > 0)
const hasNextPage = computed(() => cursor.value + ONLINE_BOT_PAGE_SIZE < total.value)
const showPagination = computed(() => {
  return !errorMessage.value && (total.value > ONLINE_BOT_PAGE_SIZE || cursor.value > 0)
})

const statusText = computed(() => {
  if (isLoading.value) return '正在获取在线列表'
  if (errorMessage.value) return '列表加载失败'
  if (bots.value.length && total.value > bots.value.length) {
    return `第 ${currentPage.value} 页 · ${bots.value.length}/${total.value} 在线`
  }
  if (bots.value.length) return `${bots.value.length} 个在线`
  return '在线列表'
})

const formatOnlineStatus = (lastSeenAgoSeconds: number) => {
  if (!Number.isFinite(lastSeenAgoSeconds) || lastSeenAgoSeconds <= 60) return '刚刚在线'
  if (lastSeenAgoSeconds < 3600) return `${Math.ceil(lastSeenAgoSeconds / 60)} 分钟内活跃`
  if (lastSeenAgoSeconds < 86400) return `${Math.ceil(lastSeenAgoSeconds / 3600)} 小时内活跃`
  return '最近在线'
}

const loadOnlineBots = async (nextCursor = cursor.value) => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    const result = await getOnlineBots({
      cursor: nextCursor,
      size: ONLINE_BOT_PAGE_SIZE,
    })
    cursor.value = result.cursor
    total.value = result.total
    bots.value = result.bots
  } catch (error) {
    bots.value = []
    errorMessage.value = error instanceof Error ? error.message : '在线列表加载失败'
  } finally {
    isLoading.value = false
  }
}

const goToPreviousPage = () => {
  if (!hasPreviousPage.value || isLoading.value) return
  loadOnlineBots(Math.max(0, cursor.value - ONLINE_BOT_PAGE_SIZE))
}

const goToNextPage = () => {
  if (!hasNextPage.value || isLoading.value) return
  loadOnlineBots(cursor.value + ONLINE_BOT_PAGE_SIZE)
}

onMounted(loadOnlineBots)
</script>

<style lang="scss" scoped>
.online-bot-summary {
  display: -webkit-box;
  line-height: 18px;
  max-height: 36px;
  overflow: hidden;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}
</style>
