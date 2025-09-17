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
      class="absolute inset-0 bg-white dark:bg-gray-800 z-50 flex flex-col max-w-[100vw]"
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
        <div v-if="isVisible" class="flex flex-col w-full h-full max-h-[100vh]" @click.stop>
          <!-- 搜索框区域 -->
          <div class="p-3 ">
            <div class="flex items-center gap-3">
              <div
                class="flex-1 relative bg-white dark:bg-gray-950 grow p-2 rounded-full  flex items-center h-9"
              >
                <span class="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Icon name="search" class="w-3.5 h-3.5 text-dark-250" />
                </span>
                <input
                  ref="searchInput"
                  v-model="searchKeyword"
                  type="text"
                  :placeholder="$t('searchPlaceholder')"
                  class="dark:bg-gray-950 text-dark-800 dark:text-gray-100 text-sm leading-tight font-normal placeholder-dark-250 outline-0 m-0 w-full pl-6"
                  @input="handleSearch"
                />
                <div v-if="isSearching" class="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              </div>
              <button
                class="px-4 py-2 text-primary hover:text-primary-dark font-medium text-sm"
                @click="closeModal"
              >
                {{ $t('cancel') }}
              </button>
            </div>
          </div>

          <!-- 搜索结果区域 -->
          <div class="flex-1 overflow-y-scroll">
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
                {{ $t('searching') }}
              </div>

              <!-- 本地联系人搜索结果 -->
              <div v-if="filteredContacts.length > 0" class="space-y-2">
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                  {{ $t('localContacts') }}
                </h3>
                <div
                  v-for="contact in filteredContacts"
                  :key="'local-' + contact.id"
                  class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer rounded-lg transition-colors"
                  @click="selectContact(contact)"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      class="rounded-3xl w-12 h-12 shrink-0 relative bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                    >
                      <ChatIcon
                        :src="contact?.avatar || ''"
                        :alt="contact?.name"
                        :customClass="'w-12 h-12 rounded-full'"
                      />
                    </div>
                    <div class="flex flex-col grow overflow-hidden">
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {{ contact.name }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {{ contact.type === 'group' ? 'GroupId' : 'MetaID' }}:{{
                          contact.id.replace(/(\w{5})\w+(\w{3})/, '$1...$2')
                        }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 远程群组搜索结果 -->
              <div v-if="remoteGroups.length > 0" class="space-y-2">
                <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 px-2">
                  {{ $t('remoteGroups') }}
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
                        :src="group?.groupIcon || group?.avatar || ''"
                        :alt="group?.groupName || group?.userName"
                        :customClass="'w-12 h-12 rounded-full'"
                      />
                    </div>
                    <div class="flex  flex-col grow overflow-hidden">
                      <div class="text-sm font-medium text-gray-900 dark:text-gray-100  truncate">
                        <Icon
                          name="group_chat"
                          class="w-4 h-4 inline-block mr-1 text-gray-500 dark:text-gray-400 "
                          v-if="group.type === 'group'"
                        ></Icon
                        ><span class="truncate w-[95%]">
                          {{ group.groupName || group.userName }}
                        </span>
                      </div>
                      <div
                        class="text-xs text-gray-500 dark:text-gray-400 truncate"
                        v-if="group.type === 'group'"
                      >
                        GroupId:{{ group.groupId.replace(/(\w{5})\w+(\w{3})/, '$1...$2') }},
                        {{ group.memberCount || 0 }} members
                      </div>
                      <div
                        class="text-xs text-gray-500 dark:text-gray-400 truncate"
                        v-if="group.type === 'user'"
                      >
                        MetaID:{{ group?.metaId.replace(/(\w{5})\w+(\w{3})/, '$1...$2') }},
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
                <p class="text-center">{{ $t('noSearchResults') }}</p>
              </div>
            </div>

            <!-- 默认状态 - 显示最近联系人 -->
            <div v-else class="py-2">
              <div
                class="sticky top-0 bg-white dark:bg-gray-800 px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700"
              >
                {{ $t('recentContacts') }}
              </div>
              <div class="space-y-1">
                <div
                  v-for="contact in recentContacts"
                  :key="contact.id"
                  class="flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                  @click="selectContact(contact)"
                >
                  <div
                    class="rounded-3xl w-12 h-12 shrink-0 relative bg-gray-200 dark:bg-gray-600 flex items-center justify-center"
                  >
                    <ChatIcon
                      :src="contact?.avatar || ''"
                      :alt="contact?.name"
                      :customClass="'w-12 h-12 rounded-full'"
                    />
                  </div>
                  <div class="flex flex-col grow overflow-hidden">
                    <div class="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {{ contact.name }}
                    </div>
                    <div class="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {{ $t('groupId') }}:{{ contact.id.replace(/(\w{5})\w+(\w{3})/, '$1...$2') }}
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
import { useI18n } from 'vue-i18n'
import ChatIcon from '@/components/ChatIcon/ChatIcon.vue'
import { router } from '@/router'
import { useLayoutStore } from '@/stores/layout'
import { GetUserEcdhPubkeyForPrivateChat } from '@/api/talk'
import { useEcdhsStore } from '@/stores/ecdh'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { useSimpleTalkStore } from '@/stores/simple-talk'
const layout = useLayoutStore()

interface RemoteSearchGroup {
  groupId: string
  groupName: string
  memberCount: number
  groupIcon?: string
  pinId: string
  address?: string
  avatar?: string
  avatarId?: string
  metaId?: string
  timestamp?: string
  type: 'user' | 'group'
  userName?: string
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
  props: {
    modelValue: {
      type: Boolean,
      required: true,
    },
  },
  emits: ['update:modelValue', 'select'],
  setup(props, { emit }) {
    const { channels } = storeToRefs(useSimpleTalkStore())
    const simpleTalkStore = useSimpleTalkStore()
    const { t } = useI18n()

    const searchInput = ref<HTMLInputElement>()
    const searchKeyword = ref('')
    const remoteGroups = ref<RemoteSearchGroup[]>([])
    const isSearching = ref(false)
    const searchError = ref('')
    const i18n = useI18n()
    const ecdhsStore = useEcdhsStore()
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
          `${
            import.meta.env.VITE_CHAT_API
          }/group-chat/search-groups-and-users?query=${encodeURIComponent(searchValue)}`
        )
        const data = await response.json()

        if (data.code === 0 && data.data) {
          remoteGroups.value = data.data.list || []
        } else {
          remoteGroups.value = []
          searchError.value = data.message || t('searchError')
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('searchError')
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
      if (!channels.value) return []
      return channels.value?.slice(0, 5) || []
    })

    // 本地联系人过滤
    const filteredContacts = computed(() => {
      if (!searchKeyword.value.trim()) return []
      if (!channels.value) return []

      const keyword = searchKeyword.value.toLowerCase()
      return (
        channels.value?.filter(
          contact =>
            contact.name?.toLowerCase().includes(keyword) ||
            contact.id?.toLowerCase().includes(keyword)
        ) || []
      )
    })

    // 选择联系人
    const selectContact = (contact: any) => {
      emit('select', contact)
      layout.$patch({
        isShowLeftNav: false,
      })
      if (contact.type === 'private') {
        router.push(`/talk/@me/${contact.id}`)
      } else {
        router.push(`/talk/channels/public/${contact.id}`)
      }
      closeModal()
    }

    // 选择远程群组
    const selectRemoteGroup = (group: RemoteSearchGroup) => {
      // 转换远程群组数据格式以匹配本地联系人格式
      const remoteContact = {
        roomId: group.groupId,
        roomName: group.groupName,
        memberCount: group.memberCount || 0,
        isRemote: true, // 标记这是远程群组
        metaId: group.metaId,
        type: group.type,
      }
      layout.$patch({
        isShowLeftNav: false,
      })
      if (group.type === 'user') {
        router.push(`/talk/@me/${group.metaId}`)
      } else {
        router.push(`/talk/channels/public/${group?.groupId}`)
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
      i18n,
      ecdhsStore,
    }
  },
})
</script>
