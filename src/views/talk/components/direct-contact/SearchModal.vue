<template>
  <Transition
    enter-active-class="transition-all duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="isVisible"
      class="absolute inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col"
      @click="closeModal"
    >
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="transform -translate-y-4 opacity-0"
        enter-to-class="transform translate-y-0 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="transform translate-y-0 opacity-100"
        leave-to-class="transform -translate-y-4 opacity-0"
      >
        <div v-if="isVisible" class="w-full h-full" @click.stop>
          <!-- 搜索框区域 -->
          <div class="p-4 border-b border-gray-200 dark:border-gray-600">
            <div class="flex items-center gap-3">
              <div class="flex-1 relative">
                <input
                  ref="searchInput"
                  v-model="searchKeyword"
                  type="text"
                  placeholder="搜索群组..."
                  class="w-full h-10 px-4 pr-10 bg-gray-100 dark:bg-gray-700 rounded-full border-none outline-none text-sm placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500"
                  @input="handleSearch"
                />
                <div v-if="isSearching" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              </div>
              <button
                class="px-4 py-2 text-blue-500 hover:text-blue-600 font-medium text-sm"
                @click="closeModal"
              >
                取消
              </button>
            </div>
          </div>

          <!-- 搜索结果区域 -->
          <div class="flex-1 overflow-y-auto">
            <!-- 有搜索关键词时显示搜索结果 -->
            <div v-if="searchKeyword.trim()" class="space-y-4 p-4">
              <!-- 错误提示 -->
              <div
                v-if="searchError"
                class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
              >
                {{ searchError }}
              </div>

              <!-- 正在搜索提示 -->
              <div v-if="isSearching" class="flex items-center justify-center py-8 text-gray-500">
                <div
                  class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mr-3"
                ></div>
                正在搜索...
              </div>

              <!-- 本地联系人搜索结果 -->
              <div v-if="filteredContacts.length > 0" class="space-y-2">
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                  本地联系人
                </h3>
                <div
                  v-for="contact in filteredContacts"
                  :key="'local-' + contact.groupId"
                  class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition-colors"
                  @click="selectContact(contact)"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      class="rounded-3xl w-12 h-12 shrink-0 relative bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                    >
                      <ChatIcon
                        :src="contact?.roomIcon || ''"
                        :alt="contact?.roomName"
                        :customClass="'w-12 h-12 rounded-full'"
                      />
                    </div>
                    <div class="flex flex-col grow overflow-hidden">
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ contact.roomName }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                        群组ID:{{ contact.groupId.replace(/(\w{5})\w+(\w{3})/, '$1...$2') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 远程群组搜索结果 -->
              <div v-if="remoteGroups.length > 0" class="space-y-2">
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                  远程群组
                </h3>
                <div
                  v-for="group in remoteGroups"
                  :key="'remote-' + group.groupId"
                  class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition-colors"
                  @click="selectRemoteGroup(group)"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      class="rounded-3xl w-12 h-12 shrink-0 relative bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                    >
                      <ChatIcon
                        :src="group?.groupIcon || ''"
                        :alt="group?.groupName"
                        :customClass="'w-12 h-12 rounded-full'"
                      />
                    </div>
                    <div class="flex flex-col grow overflow-hidden">
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ group.groupName }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                        群组ID:{{ group.groupId.replace(/(\w{5})\w+(\w{3})/, '$1...$2') }},
                        {{ group.memberCount || 0 }} 成员
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 无搜索结果 -->
              <div
                v-if="
                  !isSearching &&
                    searchKeyword.trim() &&
                    filteredContacts.length === 0 &&
                    remoteGroups.length === 0
                "
                class="flex flex-col items-center justify-center py-12 text-gray-500"
              >
                <div
                  class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4"
                >
                  <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    ></path>
                  </svg>
                </div>
                <p class="text-center">没有找到相关结果</p>
              </div>
            </div>

            <!-- 默认状态 - 显示最近联系人 -->
            <div v-else class="py-2">
              <div
                class="sticky top-0 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700"
              >
                最近联系人
              </div>
              <div class="space-y-1">
                <div
                  v-for="contact in recentContacts"
                  :key="contact.groupId"
                  class="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  @click="selectContact(contact)"
                >
                  <div
                    class="rounded-3xl w-12 h-12 shrink-0 relative bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                  >
                    <ChatIcon
                      :src="contact?.roomIcon || ''"
                      :alt="contact?.roomName"
                      :customClass="'w-12 h-12 rounded-full'"
                    />
                  </div>
                  <div class="flex flex-col grow overflow-hidden">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ contact.roomName }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      群组ID:{{ contact.groupId.replace(/(\w{5})\w+(\w{3})/, '$1...$2') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, ref, computed, nextTick, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useTalkStore } from '@/stores/talk'
import ChatIcon from '@/components/ChatIcon/ChatIcon.vue'

interface RemoteSearchGroup {
  groupId: string
  groupName: string
  memberCount: number
  groupIcon?: string
  pinId: string
}

interface RemoteSearchResponse {
  code: number
  message: string
  data: {
    total: number
    list: RemoteSearchGroup[]
  }
  timestamp: number
}

export default defineComponent({
  name: 'SearchModal',
  components: {
    ChatIcon,
  },
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['update:modelValue', 'select'],
  setup(props, { emit }) {
    const { activeCommunity } = storeToRefs(useTalkStore())

    const searchInput = ref<HTMLInputElement>()
    const searchKeyword = ref('')
    const remoteGroups = ref<RemoteSearchGroup[]>([])
    const isSearching = ref(false)
    const searchError = ref('')

    const isVisible = computed({
      get: () => props.modelValue,
      set: value => emit('update:modelValue', value),
    })

    // 远程搜索群组
    const searchRemoteGroups = async (searchValue: string) => {
      if (!searchValue.trim()) {
        remoteGroups.value = []
        return
      }

      try {
        isSearching.value = true

        const response = await fetch(
          `${import.meta.env.VITE_CHAT_API}/group-chat/search-groups?query=${encodeURIComponent(
            searchValue
          )}`
        )
        const data = await response.json()

        if (data.code === 0 && data.data) {
          remoteGroups.value = data.data.list || []
        } else {
          remoteGroups.value = []
          searchError.value = data.message || '搜索失败'
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '搜索失败'
        searchError.value = errorMessage
        remoteGroups.value = []
      } finally {
        isSearching.value = false
      }
    }

    // 防抖搜索
    let searchTimeout: NodeJS.Timeout
    const debouncedSearch = (query: string) => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        searchRemoteGroups(query)
      }, 300) // 300ms 防抖
    }

    // 监听弹窗打开，自动聚焦搜索框
    watch(isVisible, async newVal => {
      if (newVal) {
        await nextTick()
        searchInput.value?.focus()
      } else {
        searchKeyword.value = ''
        remoteGroups.value = []
        searchError.value = ''
      }
    })

    // 处理搜索输入
    const handleSearch = (event: Event) => {
      const target = event.target as HTMLInputElement
      const query = target.value
      searchKeyword.value = query
      searchError.value = ''

      if (query.trim()) {
        debouncedSearch(query)
      } else {
        remoteGroups.value = []
      }
    }

    // 获取最近联系人 - 从当前社区的频道中获取
    const recentContacts = computed(() => {
      if (!activeCommunity.value) return []
      return activeCommunity.value.channels?.slice(0, 5) || []
    })

    // 本地联系人过滤
    const filteredContacts = computed(() => {
      if (!searchKeyword.value.trim()) return []
      if (!activeCommunity.value) return []

      const keyword = searchKeyword.value.toLowerCase()
      return (
        activeCommunity.value.channels?.filter(
          contact =>
            contact.roomName?.toLowerCase().includes(keyword) ||
            contact.groupId?.toLowerCase().includes(keyword)
        ) || []
      )
    })

    // 选择联系人
    const selectContact = (contact: any) => {
      emit('select', contact)
      closeModal()
    }

    // 选择远程群组
    const selectRemoteGroup = (group: RemoteSearchGroup) => {
      // 转换远程群组数据格式以匹配本地联系人格式
      const remoteContact = {
        roomId: group.roomId,
        roomName: group.roomName,
        roomDesc: group.roomDesc,
        memberCount: group.memberCount || 0,
        ownerUserId: group.ownerUserId,
        ownerUserInfo: group.ownerUserInfo,
        isRemote: true, // 标记这是远程群组
      }
      emit('select', remoteContact)
      closeModal()
    }

    // 关闭弹窗
    const closeModal = () => {
      isVisible.value = false
    }

    return {
      searchInput,
      searchKeyword,
      isVisible,
      isSearching,
      searchError,
      remoteGroups,
      recentContacts,
      filteredContacts,
      handleSearch,
      selectContact,
      selectRemoteGroup,
      closeModal,
    }
  },
})
</script>
