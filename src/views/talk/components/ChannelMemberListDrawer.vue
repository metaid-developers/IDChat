<template>
  <ElDrawer
    :model-value="modelValue"
    :show-close="false"
    :with-header="false"
    :size="drawerSize"
    :append-to-body="true"
    :lock-scroll="false"
    :close-on-click-modal="false"
    class="none-padding"
  >
    <div class="wrap relative">
      <header class="flex items-center justify-between header">
        <div class="flex items-center gap-2">
          <a class="back" @click="emit('update:modelValue', false)">
            <el-icon :size="16"><CloseBold /></el-icon>
          </a>
          <span class="title truncate max-w-6xl">{{
            currentChannelInfo?.name.substring(0, 10) || ''
          }}</span>
        </div>

        <el-icon
          class="cursor-pointer"
          :size="16"
          v-if="isCurrentUserCreator"
          @click="openEditChannelInfoDrawer"
          ><Edit
        /></el-icon>
        <transition name="search-slide">
          <div class="search-wrap bg-white dark:bg-black" v-show="showSearch">
            <el-input
              v-model="searchKey"
              size="default"
              placeholder="Please Input"
              :prefix-icon="Search"
              input-style="background-color: transparent !important;"
            />
            <el-button :icon="Close" circle @click="closeSearch"></el-button>
          </div>
        </transition>
      </header>

      <div class="flex flex-col  bg-dark-100 dark:bg-gray-800  info">
        <div class="flex flex-col items-center justify-center mt-4 mb-2">
          <ChatIcon
            :src="currentChannelInfo?.avatar || ''"
            :alt="currentChannelInfo?.name"
            customClass="w-[88px] h-[88px] rounded-full"
            :size="88"
          />
          <div class=" text-xl font-medium text-dark-800 dark:text-gray-100 mt-5">
            {{ currentChannelInfo?.name || '' }}
          </div>
          <div
            class="flex gap-2 items-center cursor-pointer text-sm font-medium text-dark-600 dark:text-gray-400 mt-2"
            @click="copyGroupId"
          >
            GroupId: {{ currentChannelInfo?.id.replace(/(\w{5})\w+(\w{3})/, '$1...$2') || ''
            }}<el-icon><CopyDocument /></el-icon>
          </div>
          <div class="mt-4">
            <el-button
              v-if="isCurrentUserCreator"
              color="#fff"
              size="default"
              :icon="CirclePlus"
              :class="[hasSubChannelList.length ? 'cursor-not-allowed' : 'cursor-pointer']"
              @click="openBroadcastDialog"
              >{{ $t('broadcast_channel_create') }}</el-button
            >
            <el-button color="#ffffff" size="default" :icon="Search" @click="showSearch = true">{{
              $t('Talk.Channel.search')
            }}</el-button>
            <el-button
              v-if="!isCurrentUserCreator"
              color="#ffffff"
              size="default"
              :icon="Remove"
              @click="handleLeave"
              >{{ $t('Talk.Channel.leave') }}</el-button
            >
          </div>
        </div>
        <!--SubChannelEnter-->
        <div
          class="mt-5  bg-white dark:bg-gray-800 px-4 py-7"
          v-if="subchannels.length > 0"
          @click="goToSubChannel(subchannels[0]?.id)"
        >
          <div class="flex items-center text-md font-medium">
            <span class="mr-2">#</span>
            <span>
              {{ $t('Talk.Channel.SubChannel') }}
            </span>
          </div>
          <div
            class="mt-4 cursor-pointer text-dark-700 dark:text-white px-[12px] py-[10px] rounded-lg  bg-gray-100 dark:bg-gray-700 hover:bg-dark-200 hover:dark:bg-gray-900  flex items-center justify-between overflow-hidden"
          >
            <div class="flex-1 min-w-0 flex items-center justify-between overflow-hidden">
              <div
                class="broadcast-chat-container flex-1 min-w-0 overflow-hidden"
                v-for="channel in subchannels"
                :key="channel.id"
              >
                <div class="broadcast-icon">
                  <img :src="subChannel" alt="" />
                </div>

                <div class="broadcast-content">
                  <div class="broadcast-title text-xs">
                    {{ channel.name || '# Broadcast Chat' }}
                  </div>
                  <div
                    class="broadcast-description flex items-center "
                    v-if="channel.lastMessage?.sender"
                  >
                    <span class="text-dark-300 dark:text-gray-400 flex-shrink-0"
                      >{{
                        channel.lastMessage?.senderName ||
                          channel.lastMessage?.sender?.slice(0, 6) ||
                          ''
                      }}:</span
                    >
                    <span class="text-dark-300 dark:text-gray-400 truncate min-w-0">{{
                      lastMsgContentType(
                        channel.lastMessage?.type,
                        channel.lastMessage?.content,
                        channel.id
                      )
                    }}</span>
                  </div>
                </div>
              </div>
              <div class="flex items-center justify-between flex-shrink-0">
                <el-icon
                  class="cursor-pointer min-w-[24px] min-h-[24px] text-dark-300 dark:text-white"
                  ><ArrowRight
                /></el-icon>
              </div>
            </div>
          </div>
        </div>

        <div
          class=" bg-white dark:bg-gray-800 px-4 py-5"
          :class="[simpleTalkStore.activeChannel?.type === 'sub-group' ? 'mt-5' : 'mt-3']"
        >
          <div class="flex items-center justify-between text-md font-medium">
            {{ $t('Talk.Channel.announcement') }}
            <el-icon
              class="cursor-pointer"
              v-if="isCurrentUserCreator"
              @click="openEditAnnouncementDrawer"
              ><ArrowRight
            /></el-icon>
          </div>
          <div class="mt-2 text-dark-300 dark:text-gray-400">
            {{ displayRoomNote }}
          </div>
        </div>

        <div
          v-if="isCurrentUserCreator"
          class="mt-3  bg-white dark:bg-gray-800 px-4 py-5"
          @click="isPrivateGroup ? (showInviteModal = true) : copyLink()"
        >
          <div class="flex items-center justify-between text-md font-medium">
            {{ isPrivateGroup ? $t('Talk.Channel.invite_members') : $t('Talk.Channel.ShareLink') }}
          </div>
          <div
            class="mt-2 cursor-pointer text-dark-700 dark:text-white px-[12px] py-[10px] rounded-lg  bg-gray-100 dark:bg-gray-700 hover:bg-dark-200 hover:dark:bg-gray-900  flex items-center justify-between"
          >
            <div class="word-break break-all" v-if="!isPrivateGroup">
              {{ $filters.ellipsisMiddle(currentLink) }}
            </div>
            <div class="text-dark-300 dark:text-gray-400" v-else>
              {{ $t('Talk.Channel.invite_members') }}
            </div>
            <el-icon
              class="cursor-pointer min-w-[24px] min-h-[24px] text-dark-300 dark:text-gray-400"
              ><component :is="isPrivateGroup ? UserPlus : Link"
            /></el-icon>
          </div>
        </div>

        <div class="mt-3 mb-3 bg-white dark:bg-gray-800 px-4 py-5">
          <div class="flex items-center justify-between">
            <div>{{ $t('mute_notifiy') }}</div>
            <ElSwitch
              v-model="triggleMuteNotify"
              @change="trggleMuteMode"
              :loading="muteNotifyLoading"
            ></ElSwitch>
          </div>
        </div>
      </div>

      <div class="flex items-baseline justify-between mb-2 px-4 py-2 affix members-header">
        <div class="text-sm text-dark-800 dark:text-gray-100 uppercase font-medium">
          {{ $t('Talk.Channel.team_members') }}
        </div>
        <div class="text-sm text-dark-300 dark:text-gray-400">
          {{ currentChannelInfo?.userCount || 0 }}
        </div>
      </div>
      <div class="infinite-list-wrapper" style="overflow: auto" ref="scrollContainer">
        <ul class="list">
          <!--管理员和群主-->
          <li
            class="px-4 py-2 text-sm text-dark-300 dark:text-gray-400"
            v-if="currentAdminList.length"
          >
            <span>
              {{ $t('channle_memeber_admin') }}
            </span>
            <span> ({{ currentAdminList.length }}) </span>
          </li>

          <li
            v-for="member in currentAdminList"
            :key="member?.index"
            class="w-full relative list-item"
          >
            <ChannelMemberItem
              class="absolute top-0 left-0 w-full z-0"
              :id="member?.metaId"
              :style="{ transform: `translateY(${member?.start}px)` }"
              :member="member"
              :role="member.rule"
              :key="member?.metaId"
              :createUserMetaId="currentChannelInfo?.createdBy"
              :groupId="currentChannelInfo?.parentGroupId || currentChannelInfo?.id"
              @updated="handleDeleteSuccess"
              @updateUserAdmin="handleAdmin"
              @updateUserWhiteList="handleWhiteList"
              @updateUserBlockList="handleBlockList"
              @toPrivateChat="handlePrivateChat"
            />
          </li>

          <!--白名单-->

          <li
            class="px-4 py-2 text-sm text-dark-300 dark:text-gray-400"
            v-if="currentSpeakerList.length"
          >
            <span>
              {{ $t('channle_memeber_whitelist') }}
            </span>
            <span> ({{ currentSpeakerList.length }}) </span>
          </li>

          <li
            v-for="member in currentSpeakerList"
            :key="member?.metaId"
            class="w-full relative list-item"
          >
            <ChannelMemberItem
              class="absolute top-0 left-0 w-full z-0"
              :id="member?.metaId"
              :style="{ transform: `translateY(${member?.start}px)` }"
              :member="member"
              :role="MemberRule.Speaker"
              :key="member?.metaId"
              :createUserMetaId="currentChannelInfo?.createdBy"
              :groupId="currentChannelInfo?.parentGroupId || currentChannelInfo?.id"
              @updated="handleDeleteSuccess"
              @updateUserAdmin="handleAdmin"
              @updateUserWhiteList="handleWhiteList"
              @toPrivateChat="handlePrivateChat"
            />
          </li>

          <!--普通成员-->

          <li
            class="px-4 py-2 text-sm text-dark-300 dark:text-gray-400"
            v-if="currentDisplayList.length"
          >
            {{ $t('channle_memeber_noraml') }}
          </li>
          <li
            v-for="member in currentDisplayList"
            :key="member.metaId"
            class="w-full relative list-item"
          >
            <ChannelMemberItem
              class="absolute top-0 left-0 w-full z-0"
              :id="member.metaId"
              :style="{ transform: `translateY(${member.start}px)` }"
              :member="member"
              :role="member?.rule || MemberRule.Normal"
              :key="member.metaId"
              :createUserMetaId="currentChannelInfo?.createdBy"
              :groupId="currentChannelInfo?.id"
              @updated="handleDeleteSuccess"
              @updateUserAdmin="handleAdmin"
              @updateUserWhiteList="handleWhiteList"
              @toPrivateChat="handlePrivateChat"
            />
          </li>
        </ul>
        <div
          style="
            display: flex;
            align-items: center;
            justify-items: space-between;
          "
          v-if="(loading || isSearching) && !currentDisplayList.length"
        >
          <el-skeleton-item variant="text" style="margin-right: 16px" />
          <el-skeleton-item variant="text" style="width: 30%" />
        </div>
        <p v-if="loading && !searchKey.trim()" class="text-center">Loading...</p>
        <p v-if="isSearching && searchKey.trim()" class="text-center">Searching...</p>
        <p v-if="noMore && !searchKey.trim()" class="text-center mt-3">No more</p>
        <p v-if="!isSearching && searchKey.trim() && !searchList.length" class="text-center">
          No results found
        </p>
        <!-- 使用新的 InfiniteScroll 组件 -->
        <InfiniteScroll
          v-if="!noMore && !searchKey.trim() && memberList.length > 0 && !loading"
          id="member-load-trigger"
          :on-more="handleLoadMore"
          ref="infiniteScrollRef"
        />
      </div>
    </div>
  </ElDrawer>

  <!-- 编辑公告抽屉 -->
  <EditAnnouncementDrawer
    v-model="showEditAnnouncementDrawer"
    :channel-info="currentChannelInfo"
    @updated="handleAnnouncementUpdated"
  />

  <!-- 编辑群信息抽屉 -->
  <EditChannelInfoDrawer
    v-model="showEditChannelInfoDrawer"
    :channel-info="currentChannelInfo"
    @updated="handleChannelInfoUpdated"
  />

  <!-- 创建子频道弹窗 -->
  <CreateBroadcastChannelModal v-model="showCreateBroadcastModal" />

  <!-- 邀请成员弹窗 -->
  <ElDialog
    v-model="showInviteModal"
    :title="$t('Talk.Channel.invite_members')"
    width="500px"
    :append-to-body="true"
  >
    <div class="invite-modal-content">
      <!-- 搜索框 -->
      <ElInput
        v-model="inviteSearchQuery"
        :placeholder="$t('Talk.Channel.search_users')"
        :prefix-icon="Search"
        clearable
        @input="handleInviteSearch"
      />

      <!-- 已选用户列表 -->
      <div v-if="selectedUsers.length > 0" class="selected-users mt-4 mb-2">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-600 dark:text-gray-400">
            {{ $t('Talk.Channel.selected_users') }}: {{ selectedUsers.length }}
          </span>
          <ElButton size="small" text @click="clearSelectedUsers">
            {{ $t('Talk.Channel.clear_all') }}
          </ElButton>
        </div>
        <div class="flex flex-wrap gap-2">
          <el-tag
            v-for="user in selectedUsers"
            :key="user.metaId"
            closable
            @close="removeSelectedUser(user.metaId)"
          >
            {{ user.userName || user.metaId.slice(0, 8) }}
          </el-tag>
        </div>
      </div>

      <!-- 批量操作按钮 -->
      <div v-if="selectedUsers.length > 0" class="batch-actions mt-3 mb-3">
        <ElButton type="primary" :loading="batchInviting" @click="handleBatchInvite">
          {{ $t('Talk.Channel.batch_invite') }} ({{ selectedUsers.length }})
        </ElButton>
      </div>

      <!-- 搜索结果列表 -->
      <div class="search-results mt-4">
        <div v-if="inviteSearching" class="text-center py-4">
          <el-icon class="is-loading"><Loading /></el-icon>
          <span class="ml-2">{{ $t('searching') }}</span>
        </div>

        <div
          v-else-if="inviteSearchQuery && inviteUserList.length === 0"
          class="text-center py-4 text-gray-400"
        >
          {{ $t('no_results') }}
        </div>

        <div v-else-if="inviteUserList.length > 0" class="user-list">
          <div
            v-for="user in inviteUserList"
            :key="user.metaId"
            class="user-item flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <div class="flex items-center gap-3 flex-1">
              <el-checkbox
                :model-value="isUserSelected(user.metaId)"
                :disabled="!canInviteUser(user)"
                @change="checked => toggleUserSelection(user, checked)"
              />
              <UserAvatar
                :image="user.avatar || ''"
                :name="user.userName || user.metaId.slice(0, 8)"
                :meta-id="user.metaId"
                :meta-name="''"
                class="w-10 h-10"
              />
              <div class="flex-1">
                <div class="font-medium text-dark-800 dark:text-gray-100">
                  {{ user.userName || user.metaId.slice(0, 8) }}
                </div>
                <div class="text-xs text-dark-300 dark:text-gray-400">
                  {{ user.metaId.slice(0, 12) }}...
                </div>
                <div v-if="!canInviteUser(user)" class="text-xs text-red-500 mt-1">
                  {{ $t('Talk.Channel.user_chat_not_enabled') }}
                </div>
              </div>
            </div>
            <el-tooltip
              :content="getInviteButtonTooltip(user)"
              placement="top"
              :disabled="canInviteUser(user)"
            >
              <ElButton
                type="primary"
                size="small"
                :disabled="!canInviteUser(user)"
                @click="handleInviteUser(user)"
              >
                {{ $t('Talk.Channel.invite') }}
              </ElButton>
            </el-tooltip>
          </div>
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<script lang="ts" setup>
import {
  ref,
  watch,
  computed,
  defineProps,
  defineEmits,
  withDefaults,
  nextTick,
} from 'vue'
import { ElSwitch } from 'element-plus'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import {whiteListCreateBroadcast} from '@/config'
import ChannelMemberItem from './ChannelMemberItem.vue'
import EditAnnouncementDrawer from './EditAnnouncementDrawer.vue'
import EditChannelInfoDrawer from './EditChannelInfoDrawer.vue'
import CreateBroadcastChannelModal from './CreateBroadcastChannelModal.vue'
import InfiniteScroll from '@/components/InfiniteScroll/InfiniteScroll.vue'
import UserAvatar from '@/components/UserAvatar/UserAvatar.vue'
import ChatIcon from '@/components/ChatIcon/ChatIcon.vue'
import { useRoute, useRouter } from 'vue-router'
import { getChannelMembers, searchChannelMembers, getUserGroupRole, searchGroupsAndUsers } from '@/api/talk'
import { ElMessage, ElDialog } from 'element-plus'
import copy from 'copy-to-clipboard'
import { addMyBlockChatList, removeMyBlockChat } from '@/api/chat-notify'
import {
  ArrowRight,
  CircleClose,
  Close,
  CloseBold,
  CopyDocument,
  Edit,
  Link,
  Remove,
  CirclePlus,
  Search,
  Loading,
  User as UserPlus,
} from '@element-plus/icons-vue'
import { metafile } from '@/utils/filters'
import { NodeName,MemberRule,RuleOp } from '@/enum'
import { createSinglePin } from '@/utils/pin'

import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import { setChannelAdmins,setChannelWhiteList,setChannelBlockList } from '@/utils/talk'
import type {MemberListRes,MemberItem } from '@/@types/simple-chat.d'
import type { SearchUserItem } from '@/@types/simple-chat.d'
import {MessageType} from '@/@types/simple-chat.d'
import { useI18n } from 'vue-i18n'
import { signMvcMessage,getMvcPublickey } from "@/wallet-adapters/metalet";
import { getRuntimeConfig } from '@/config/runtime-config'
import subChannel from '@/assets/images/sub-channel.svg?url'
import { decrypt } from '@/utils/crypto'
import { VITE_ADDRESS_HOST } from '@/config/app-config'


interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue'])
const route = useRoute()
const showSearch = ref(false)
const showCreateBroadcastModal = ref(false)
const simpleTalkStore = useSimpleTalkStore()
const userStore = useUserStore()
const muteNotifyLoading=ref(false)
const router = useRouter()

// 响应式抽屉宽度，手机上最大 95vw
const drawerSize = computed(() => {
  if (typeof window !== 'undefined' && window.innerWidth < 400) {
    return '95vw'
  }
  return '360px'
})

const scrollContainer = ref<HTMLElement | null>(null)
const infiniteScrollRef = ref<{ resetLoading: () => void } | null>(null)

const searchKey = ref('')
// 搜索结果列表
const searchList = ref<MemberItem[]>([])
// 搜索状态
const isSearching = ref(false)
// 加载状态
const loading = ref(false)
// 是否没有更多数据
const noMore = ref(false)
// 成员权限信息
const memberPermissions = ref<MemberListRes | null>(null)
// 普通成员列表（分页加载）
const memberList = ref<MemberItem[]>([])
// 当前页码（从0开始）
const currentPage = ref(0)
// 每页大小
const pageSize = 20

// 邀请功能相关状态
const showInviteModal = ref(false)
const inviteSearchQuery = ref('')
const inviteUserList = ref<SearchUserItem[]>([])
const inviteSearching = ref(false)
const userChatPublicKeys = ref<Map<string, string>>(new Map()) // 存储用户的 chatPublicKey
const selectedUsers = ref<SearchUserItem[]>([]) // 选中的用户列表
const batchInviting = ref(false) // 批量邀请中

const i18n=useI18n()



// 控制编辑公告抽屉的显示
const showEditAnnouncementDrawer = ref(false)

// 控制编辑群信息抽屉的显示
const showEditChannelInfoDrawer = ref(false)



const hasSubChannelList=computed(()=>{
  return simpleTalkStore.activeChannel?.type === 'sub-group' ? simpleTalkStore.activeChannel?.parentGroupId || [] :
  simpleTalkStore.getSubChannelsByParent(simpleTalkStore.activeChannel?.id) || []
})

const currentChannelInfo = computed(() => {
  return simpleTalkStore.activeChannel?.type === 'sub-group'
    ? simpleTalkStore.getParentGroupChannel(simpleTalkStore.activeChannel.id) || null
    : simpleTalkStore.activeChannel || null
})

// 显示的群公告（确保是解密后的）
const displayRoomNote = computed(() => {
  if (!currentChannelInfo.value) return '-'

  const note = currentChannelInfo.value.roomNote
  if (!note) return '-'

  // 如果是私密群聊且公告看起来是加密的，显示占位符
  // 正常情况下 store 已经解密，但如果还是加密状态，显示提示
  if (currentChannelInfo.value.roomJoinType === '100') {
    // 检查是否看起来还是加密的
    if (/^[A-Za-z0-9+/=]+$/.test(note) && note.length > 20) {
      // 还是加密状态，可能解密失败或正在加载
      return '🔒 [Encrypted]'
    }
  }

  return note
})


const triggleMuteNotify=computed(()=>{
  return simpleTalkStore.activeChannel?.type === 'sub-group' ? simpleTalkStore.getOneChannelMuteStatus(simpleTalkStore.activeChannel?.parentGroupId) :
  simpleTalkStore.getOneChannelMuteStatus(simpleTalkStore.activeChannel?.id)

})


// 判断当前用户是否是频道创建者（使用 globalMetaId 判断）
const isCurrentUserCreator = computed(() => {
  const selfGlobalMetaId = userStore.last?.globalMetaId
  return currentChannelInfo.value?.createdBy === selfGlobalMetaId
})

// 判断是否为私密群聊
const isPrivateGroup = computed(() => {
  return currentChannelInfo.value?.roomJoinType === '100'
})

// 检查用户是否可以被邀请（私密群聊需要 chatPublicKey）
const canInviteUser = (user: SearchUserItem): boolean => {
  if (!isPrivateGroup.value) {
    // 公开群聊都可以邀请
    return true
  }
  // 私密群聊需要检查是否有 chatPublicKey
  return userChatPublicKeys.value.has(user.metaId)
}

// 获取邀请按钮的提示文本
const getInviteButtonTooltip = (user: SearchUserItem): string => {
  if (!isPrivateGroup.value) {
    return i18n.t('talk.invite')
  }
  if (userChatPublicKeys.value.has(user.metaId)) {
    return i18n.t('talk.invite')
  }
  return i18n.t('talk.user_chat_not_enabled')
}

const isWhiteListCreatBroadcast=computed(()=>{
  // const config = getRuntimeConfig()
  // return config.whiteListCreateBroadcast.includes(userStore.last?.address)
  return true
})

const currentLink = computed(() => {
  console.log("route",route.fullPath)

  return window.location.href
})

// 管理员列表（包含 owner 和 admins）
const currentAdminList = computed(() => {
  if (!memberPermissions.value) return []

  const adminList: any[] = []

  // 只有当 creator 存在时才添加
  if (memberPermissions.value.creator) {
    const creatorWithOwnerRole = {
      ...memberPermissions.value.creator,
      rule: MemberRule.Owner // 使用枚举值
    }
    adminList.push(creatorWithOwnerRole)
  }

  // 添加其他管理员（排除 creator）
  const admins = (memberPermissions.value.admins || []).filter(admin => {
    return admin.metaId !== memberPermissions.value?.creator?.metaId
  }).map(admin => ({
    ...admin,
    rule: MemberRule.Admin // 确保管理员的 rule 字段被正确设置为 Admin
  }))

  adminList.push(...admins)

  return adminList
})

// 白名单/发言人列表
const currentSpeakerList = computed(() => {
  if (!memberPermissions.value) return []
  return memberPermissions.value.whiteList || []
})

// 普通成员列表
const currentDisplayList = computed(() => {
  // 搜索状态下显示搜索结果
  if (searchKey.value.trim() && searchList.value.length > 0) {
    return searchList.value
  }
  // 使用分页加载的普通成员列表
  return memberList.value || []
})


// 计算属性：是否显示广播聊天区域（只在群聊且有子群聊时显示提示）
const subchannels = computed(() => {
  return simpleTalkStore.currSubChannels
})




const openBroadcastDialog=()=>{
  if(hasSubChannelList.value.length){
     ElMessage.warning(`${i18n.t('sub_channel_created')}`)
  }else{
    showCreateBroadcastModal.value = true
  }


}

const lastMsgContentType = (type: MessageType, content: string, channelId: string) => {
  let secretKeyStr = channelId?.substring(0, 16) || ''
      switch (type) {
        case MessageType.msg:
          return decrypt(content, secretKeyStr)
        case MessageType.red:
          return content
        case MessageType.img:
          return `[${i18n.t('new_msg_img')}]`
        default:
          return ''
      }
}



const goToSubChannel = (channelId: string) => {
  // 跳转到子频道的逻辑

  router.push({
     name: 'talkChannel',
    params:{
      communityId:'public',
      channelId:simpleTalkStore.activeChannel!.id!,
      subId:channelId
    }
  })

  emit('update:modelValue', false)
  //simpleTalkStore.enterSubGroupChat(channelId)
}


const trggleMuteMode=async(e:boolean)=>{

  if(e){
      addMyBlockChatList({
    chatId:currentChannelInfo.value.id,
    chatType:'group',
    metaId:simpleTalkStore.selfMetaId
   }).then((res)=>{
    console.log("res",res)

      simpleTalkStore.updateMuteNotify({
    groupId:currentChannelInfo.value.id,
    groupType:'group',
    status:e
  })
   }).catch((e)=>{
    ElMessage.error(e)
   })
  }else{
    removeMyBlockChat({
    chatId:currentChannelInfo.value.id,
    metaId:simpleTalkStore.selfMetaId
   }).then((res)=>{
    console.log("res",res)

      simpleTalkStore.updateMuteNotify({
    groupId:currentChannelInfo.value.id,
    groupType:'group',
    status:e
  })
   }).catch((e)=>{
    ElMessage.error(e)
   })
  }





}


const copyLink = () => {
  copy(currentLink.value)
  ElMessage.success('Copied')
}

const copyGroupId = () => {
  copy(currentChannelInfo.value?.id || '')
  ElMessage.success('Copied')
}

// 打开编辑公告抽屉
const openEditAnnouncementDrawer = () => {
  showEditAnnouncementDrawer.value = true
}

// 打开编辑群信息抽屉
const openEditChannelInfoDrawer = () => {
  showEditChannelInfoDrawer.value = true
}

// 处理公告更新
const handleAnnouncementUpdated = (newAnnouncement: string) => {
  simpleTalkStore.updateChannelInfo(simpleTalkStore.activeChannelId, {
    roomNote: newAnnouncement,
  })
}

// 处理群信息更新
const handleChannelInfoUpdated = (updatedInfo: {
  name: string
  avatar: string
  avatarFile?: File | null
}) => {
  // 使用 store 专门的更新方法，确保全局数据一致性
  simpleTalkStore.updateChannelInfo(simpleTalkStore.activeChannelId, {
    name: updatedInfo.name,
    avatar: updatedInfo.avatar,
  })
}

const handleDeleteSuccess = (metaid: string) => {

}

const handlePrivateChat=async(member:MemberItem)=>{
  // 使用 globalMetaId 进行私聊跳转
  const targetGlobalMetaId = member.userInfo?.globalMetaId
  router.push({
    name: 'talkAtMe',
    params: {
      channelId: targetGlobalMetaId,
    },
  })
  simpleTalkStore.setActiveChannel(targetGlobalMetaId)
  emit('update:modelValue', false)

}

const handleLeave = async () => {
  if (!currentChannelInfo.value) return

  try {
    const data = {
      groupId: currentChannelInfo.value.id,
      state: -1,
      referrer: '',
    }
    const metaidData = {
      body: JSON.stringify(data),
      path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${NodeName.SimpleGroupJoin}`,
      flag: 'metaid',
      version: '1.0.0',
      operation: 'create',
      contentType: 'application/json',
      encryption: '0',
      encoding: 'utf-8',
    }
    await createSinglePin(metaidData)
    ElMessage.success('Left channel successfully')
    emit('update:modelValue', false)
    simpleTalkStore.syncFromServer()
    window.location.href = `/`
  } catch (error) {
    ElMessage.error(error.message || 'Failed to leave channel')
  }
}

const closeSearch = () => {
  showSearch.value = false
  searchKey.value = ''
  searchList.value = []
}

// 加载成员权限信息
const loadMemberPermissions = async () => {
  if (!currentChannelInfo.value || currentChannelInfo.value.type !== 'group') return

  loading.value = true
  try {
    // 从 simpleTalkStore 获取权限信息
    const permissions = await simpleTalkStore.getGroupMemberPermissions(
      currentChannelInfo.value.id,
      false // 不强制刷新，使用缓存
    )

    if (permissions) {
      memberPermissions.value = permissions
    } else {
      memberPermissions.value = null
    }
  } catch (error) {
    console.error('加载权限信息失败:', error)
    memberPermissions.value = null
  } finally {
    loading.value = false
  }
}

// 加载普通成员列表（分页）
const loadMemberList = async (reset: boolean = false) => {
  if (!currentChannelInfo.value || currentChannelInfo.value.type !== 'group') return

  // 如果是重置，重新开始分页
  if (reset) {
    currentPage.value = 0
    memberList.value = []
    noMore.value = false
  }

  // 如果已经没有更多数据，直接返回
  if (noMore.value && !reset) {
    return
  }

  loading.value = true
  try {
    // 计算 cursor：当前页码 * 页面大小
    const cursor = currentPage.value * pageSize

    const response = await getChannelMembers({
      groupId: currentChannelInfo.value.id,
      cursor: cursor.toString(),
      size: pageSize.toString()
    })

    if (response && response.list) {
      // 获取需要过滤的用户ID列表
      const excludeIds = new Set<string>()

      // 添加创建者ID
      if (memberPermissions.value?.creator?.metaId) {
        excludeIds.add(memberPermissions.value.creator.metaId)
      }

      // 添加管理员ID
      memberPermissions.value?.admins?.forEach(admin => {
        if (admin.metaId) excludeIds.add(admin.metaId)
      })

      // 添加白名单用户ID
      memberPermissions.value?.whiteList?.forEach(member => {
        if (member.metaId) excludeIds.add(member.metaId)
      })

       memberPermissions.value?.blockList?.forEach(block => {
        if (block.metaId) excludeIds.add(block.metaId)
      })

      // 过滤掉管理员、群主和白名单用户
      const filteredList = response.list.filter(member =>
        member.metaId && !excludeIds.has(member.metaId)
      )

      // 转换数据格式
      const formattedList: MemberItem[] = filteredList.map((item: any): MemberItem => ({
        id: item.metaId,
        metaId: item.metaId,
        address: item.address,
        timeStr: item.timeStr,
        timestamp: item.timestamp,
        rule: MemberRule.Normal, // 普通成员
        permission: [],
        userInfo: item.userInfo
      }))

      if (reset) {
        memberList.value = formattedList
      } else {
        memberList.value.push(...formattedList)
      }

      // 检查是否还有更多数据
      if (response.list.length < pageSize) {
        noMore.value = true
      } else {
        // 更新页码到下一页
        currentPage.value += 1
      }
    } else {
      noMore.value = true
    }
  } catch (error) {
    console.error('加载普通成员列表失败:', error)
    noMore.value = true
  } finally {
    loading.value = false
  }
}

// 监听 modelValue 变化，当抽屉打开时加载数据
watch(() => props.modelValue, async (newValue) => {
  if (newValue) {
    // 先加载权限信息，再加载普通成员列表
    await loadMemberPermissions()
    await loadMemberList(true) // 重置并加载第一页
  }
})

// 监听当前频道变化，重新加载权限信息和成员列表
// watch(() => currentChannelInfo.value?.id, async (newChannelId) => {
//   if (newChannelId && props.modelValue) {
//     await loadMemberPermissions()
//     await loadMemberList(true) // 重置并加载第一页
//   }
// })

// 搜索成员
const searchMembers = async () => {
  if (!searchKey.value.trim() || !currentChannelInfo.value) return

  isSearching.value = true
  searchList.value = []

  try {
    const results = await searchChannelMembers({
      groupId: currentChannelInfo.value.id,
      query: searchKey.value.trim(),
      size: '20'
    })

    // 转换搜索结果为 MemberItem 格式
    if (results && Array.isArray(results)) {
      searchList.value = results.map((item: any): MemberItem => ({
        id: item.metaId,
        metaId: item.metaId,
        address: item.address,
        timeStr: item.timeStr,
        timestamp: item.timestamp,
        rule: 0, // 默认规则
        permission: [], // 默认权限
        userInfo: item.userInfo
      }))
    }
  } catch (error) {
    console.error('搜索成员失败:', error)
    searchList.value = []
  } finally {
    isSearching.value = false
  }
}

// 处理无限滚动加载更多
const handleLoadMore = async () => {
  if (loading.value || noMore.value || searchKey.value.trim()) {
    return
  }

  try {
    await loadMemberList(false)
  } catch (error) {
    console.error('加载更多成员失败:', error)
    // 如果加载失败，重置 InfiniteScroll 的状态
    infiniteScrollRef.value?.resetLoading()
  }
}

// 监听搜索关键词变化
watch(() => searchKey.value, () => {
  if (searchKey.value.trim()) {
    searchMembers()
  } else {
    searchList.value = []
  }
})

// 处理管理员权限变更
const handleAdmin = async (member: MemberItem) => {
  if (!member.metaId || !currentChannelInfo.value) return

  try {
    let admins: string[] = []

    // 获取当前管理员列表（排除群主）
    if (memberPermissions.value?.admins) {
      memberPermissions.value.admins.forEach((item: MemberItem) => {
        if (item.metaId && item.metaId !== memberPermissions.value?.creator?.metaId) {
          admins.push(item.metaId)
        }
      })
    }

    // 判断当前用户是否已经是管理员
    const isCurrentlyAdmin = admins.includes(member.metaId)

    if (isCurrentlyAdmin) {
      // 已经是管理员，要移除
      admins = admins.filter((admin) => admin !== member.metaId)
      ElMessage.success('Admin privileges removed')
    } else {
      // 不是管理员，要添加为管理员
      admins.push(member.metaId)
      ElMessage.success('Set as admin')
    }

    const groupId = currentChannelInfo.value.id
    const updateRes = await setChannelAdmins(groupId, admins)

    if (updateRes.status === 'success' && updateRes.txid) {
      await simpleTalkStore.getGroupMemberPermissions(groupId, true)
      // 重新加载权限信息
      await loadMemberPermissions()

      if (searchKey.value.trim()) {
        // 如果正在搜索，重新搜索
        await searchMembers()
      } else {
        // 重新加载成员列表
        await loadMemberList(true)
      }
    }
  } catch (error) {
    ElMessage.error((error as any).message || 'Failed to update admin privileges')
  }
}

// 处理白名单权限变更
const handleWhiteList = async (member: MemberItem) => {
  if (!member.metaId || !currentChannelInfo.value) return

  try {
    let whiteList: string[] = []

    // 获取当前白名单列表
    if (memberPermissions.value?.whiteList) {
      memberPermissions.value.whiteList.forEach((item: MemberItem) => {
        if (item.metaId) {
          whiteList.push(item.metaId)
        }
      })
    }

    // 已经在白名单中，要移除
    if (whiteList.includes(member.metaId)) {
      whiteList = whiteList.filter((id) => id !== member.metaId)
      ElMessage.success('Removed from whitelist')
    } else {
      // 添加到白名单
      whiteList.push(member.metaId)
      ElMessage.success('Added to whitelist')
    }

    const groupId = currentChannelInfo.value.id
    const updateRes = await setChannelWhiteList(groupId, whiteList)

    if (updateRes.status === 'success' && updateRes.txid) {
      await simpleTalkStore.getGroupMemberPermissions(groupId, true)
      // 重新加载权限信息
      await loadMemberPermissions()

      if (searchKey.value.trim()) {
        // 如果正在搜索，重新搜索
        await searchMembers()
      } else {
        // 重新加载成员列表
        await loadMemberList(true)
      }
    }
  } catch (error) {
    ElMessage.error((error as any).message || 'Failed to update whitelist')
  }
}


// 处理黑名单权限变更
const handleBlockList = async (member: MemberItem) => {
  if (!member.metaId || !currentChannelInfo.value) return

  try {
    let blockList: string[] = []
    console.log("",memberPermissions)
    // 获取当前白名单列表
    if (memberPermissions.value?.blockList) {
      memberPermissions.value.blockList.forEach((item: MemberItem) => {
        if (item.metaId) {
          blockList.push(item.metaId)
        }
      })
    }

    // 已经在黑名单中，要移除
    if (blockList.includes(member.metaId)) {
      blockList = blockList.filter((id) => id !== member.metaId)
      ElMessage.success('Removed from Blocklist')
    } else {
      // 添加到黑名单
      blockList.push(member.metaId)
      ElMessage.success('Added to Blocklist')
    }

    const groupId = currentChannelInfo.value.id
    const updateRes = await setChannelBlockList(groupId, blockList)

    if (updateRes.status === 'success' && updateRes.txid) {

      await simpleTalkStore.getGroupMemberPermissions(groupId, true)
      // 重新加载权限信息
      await loadMemberPermissions()

      if (searchKey.value.trim()) {
        // 如果正在搜索，重新搜索
        await searchMembers()
      } else {
        // 重新加载成员列表
        await loadMemberList(true)
      }
    }
  } catch (error) {
    ElMessage.error((error as any).message || 'Failed to update blocklist')
  }
}

// 邀请功能相关方法

// 处理邀请搜索
const handleInviteSearch = async () => {
  const query = inviteSearchQuery.value.trim()

  if (!query) {
    inviteUserList.value = []
    // 不清空 userChatPublicKeys，保留已选中用户的 chatPublicKey
    return
  }

  inviteSearching.value = true
  try {
    const result = await searchGroupsAndUsers({ query, size: '20' })

    // 新接口直接返回用户列表，每个用户已包含 chatPublicKey
    if (result && result.users && result.users.length > 0) {
      // 过滤掉没有 chatPublicKey 的用户
      const usersWithChatPublicKey = result.users.filter(user => user.chatPublicKey)

      inviteUserList.value = usersWithChatPublicKey

      // 直接从搜索结果中提取 chatPublicKey（不清空，保留之前选中用户的数据）
      usersWithChatPublicKey.forEach(user => {
        if (user.chatPublicKey) {
          userChatPublicKeys.value.set(user.metaId, user.chatPublicKey)
        }
      })

      console.log('获取到的用户 chatPublicKey:', userChatPublicKeys.value)
    } else {
      inviteUserList.value = []
      // 不清空 userChatPublicKeys，保留已选中用户的数据
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
    inviteUserList.value = []
    // 不清空 userChatPublicKeys，保留已选中用户的数据
    ElMessage.error('搜索失败')
  } finally {
    inviteSearching.value = false
  }
}

// 处理邀请用户
const handleInviteUser = async (user: SearchUserItem) => {
  if (!currentChannelInfo.value) return

  try {
    const { batchInviteUsersToGroup } = await import('@/utils/talk')

    const groupId = currentChannelInfo.value.id
    const isPrivateGroup = currentChannelInfo.value.roomJoinType === '100'
    const passwordKey = isPrivateGroup ? currentChannelInfo.value.passwordKey : undefined

    // 检查私密群聊的必要条件
    if (isPrivateGroup) {
      if (!passwordKey) {
        ElMessage.error('私密群聊密钥未设置')
        return
      }

      const userChatPublicKey = userChatPublicKeys.value.get(user.metaId)
      if (!userChatPublicKey) {
        ElMessage.warning('该用户未开通私聊，无法邀请到私密群聊')
        return
      }
    }

    // 准备单个用户的列表
    const userList = [{
      metaId: user.metaId,
      chatPublicKey: userChatPublicKeys.value.get(user.metaId) || '',
      userName: user.userName || user.metaId.slice(0, 8),
    }]

    console.log('🚀 邀请单个用户:', {
      groupId,
      user: userList[0],
      isPrivateGroup,
    })

    const result = await batchInviteUsersToGroup({
      groupId,
      userList,
      passwordKey,
    })

    console.log('📊 邀请结果:', result)

    if (result.status === 'success') {
      ElMessage.success(`已成功邀请 ${user.userName || user.metaId.slice(0, 8)}`)
      // 关闭邀请弹窗
      showInviteModal.value = false
    } else {
      const errorMsg = result.results[0]?.error || '邀请失败'
      ElMessage.error(errorMsg)
    }

  } catch (error) {
    console.error('邀请用户失败:', error)
    ElMessage.error('邀请用户失败: ' + (error as Error).message)
  }
}

// 选中用户相关方法
const isUserSelected = (metaId: string): boolean => {
  return selectedUsers.value.some(u => u.metaId === metaId)
}

const toggleUserSelection = (user: SearchUserItem, checked: boolean | string | number) => {
  const isChecked = Boolean(checked)
  if (isChecked) {
    if (!isUserSelected(user.metaId)) {
      // 对于私密群聊，检查是否可以邀请该用户
      if (!canInviteUser(user)) {
        ElMessage.warning(i18n.t('talk.user_chat_not_enabled'))
        return
      }

      // 获取用户的 chatPublicKey
      const chatPublicKey = userChatPublicKeys.value.get(user.metaId) || ''
      selectedUsers.value.push({ ...user, chatPublicKey } as any)
    }
  } else {
    selectedUsers.value = selectedUsers.value.filter(u => u.metaId !== user.metaId)
  }
}

const removeSelectedUser = (metaId: string) => {
  selectedUsers.value = selectedUsers.value.filter(u => u.metaId !== metaId)
}

const clearSelectedUsers = () => {
  selectedUsers.value = []
}

// 监听邀请弹窗关闭，清理数据
watch(showInviteModal, (newVal) => {
  if (!newVal) {
    // 弹窗关闭时清理所有邀请相关数据
    inviteSearchQuery.value = ''
    inviteUserList.value = []
    selectedUsers.value = []
    userChatPublicKeys.value.clear()
  }
})

// 批量邀请用户
const handleBatchInvite = async () => {
  if (!currentChannelInfo.value || selectedUsers.value.length === 0) return

  batchInviting.value = true

  try {
    const { batchInviteUsersToGroup } = await import('@/utils/talk')

    const groupId = currentChannelInfo.value.id
    const isPrivateGroup = currentChannelInfo.value.roomJoinType === '100'
    const passwordKey = isPrivateGroup ? currentChannelInfo.value.passwordKey : undefined

    // 准备用户列表，对于私密群聊需要过滤掉没有 chatPublicKey 的用户
    let userList = selectedUsers.value.map(user => ({
      metaId: user.metaId,
      chatPublicKey: userChatPublicKeys.value.get(user.metaId) || '',
      userName: user.userName || user.metaId.slice(0, 8),
    }))

    // 私密群聊：过滤掉没有 chatPublicKey 的用户
    if (isPrivateGroup) {
      const usersWithoutKey = userList.filter(u => !u.chatPublicKey)
      if (usersWithoutKey.length > 0) {
        console.warn('以下用户没有 chatPublicKey，将被跳过:', usersWithoutKey.map(u => u.userName))
        userList = userList.filter(u => u.chatPublicKey)

        if (userList.length === 0) {
          ElMessage.error('所选用户均未开通私聊，无法邀请')
          batchInviting.value = false
          return
        }

        ElMessage.warning(`${usersWithoutKey.length} 位用户未开通私聊，已跳过`)
      }
    }

    console.log('🚀 开始批量邀请:', {
      groupId,
      userCount: userList.length,
      isPrivateGroup,
    })

    const result = await batchInviteUsersToGroup({
      groupId,
      groupName: currentChannelInfo.value.name,
      userList,
      passwordKey,
    })

    console.log('📊 批量邀请结果:', result)

    // 统计结果
    const successCount = result.results.filter(r => r.status === 'success').length
    const failedCount = result.results.filter(r => r.status === 'failed').length

    if (result.status === 'success') {
      ElMessage.success(`成功邀请 ${successCount} 位用户`)
    } else if (result.status === 'partial') {
      ElMessage.warning(`成功邀请 ${successCount} 位用户，${failedCount} 位失败`)
    } else {
      ElMessage.error(`邀请失败：${failedCount} 位用户`)
    }

    // 显示详细结果
    result.results.forEach(r => {
      if (r.status === 'success') {
        console.log(`✅ ${r.userName} - 邀请链接:`, r.inviteUrl)
        // TODO: 发送邀请链接给用户
      } else {
        console.error(`❌ ${r.userName} - 失败:`, r.error)
      }
    })

    // 清空选中的用户
    clearSelectedUsers()

    // 如果全部成功，关闭弹窗
    if (result.status === 'success') {
      showInviteModal.value = false
    }

  } catch (error) {
    console.error('批量邀请失败:', error)
    ElMessage.error('批量邀请失败: ' + (error as Error).message)
  } finally {
    batchInviting.value = false
  }
}

// 监听邀请弹窗关闭，清空搜索
watch(() => showInviteModal.value, (newValue) => {
  if (!newValue) {
    inviteSearchQuery.value = ''
    inviteUserList.value = []
    clearSelectedUsers()
  }
})
</script>

<style lang="scss" scoped>
*::-webkit-scrollbar {
  width: 8px;
}

*::-webkit-scrollbar-track {
  background: #edeff2;
}

.dark *::-webkit-scrollbar-track {
  background: #111827;
}

*::-webkit-scrollbar-thumb {
  background-color: #bfc2cc;
  border-radius: 20px;
}

.dark *::-webkit-scrollbar-thumb {
  background-color: #374151;
}
.wrap {
  position: relative;
}
.infinite-list-wrapper {
  flex-grow: 1;
}
.infinite-list-wrapper .list {
  padding: 0;
  margin: 0;
  list-style: none;
}

.infinite-list-wrapper .list-item {
  position: relative;
  height: 50px;
}
.infinite-list-wrapper .list-item + .list-item {
  margin-top: 10px;
}

.members-header {
  position: sticky;
  top: 60px;
  z-index: 5;
  background: var(--el-drawer-bg-color);
}
.search-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 0;
  z-index: 130;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 60px;
  .el-input {
    box-shadow: none;
    border: none;
    flex-grow: 1;
    background-color: transparent !important;

    .el-input__wrapper {
      background-color: transparent !important;
      box-shadow: none !important;
    }

    .el-input__inner {
      background-color: transparent !important;
    }
  }

  .el-input__wrapper {
    background-color: transparent !important;
    box-shadow: none !important;
  }

  // 使用深度选择器确保样式生效
  :deep(.el-input__wrapper) {
    background-color: transparent !important;
    box-shadow: none !important;
  }

  :deep(.el-input__inner) {
    background-color: transparent !important;
  }
}

.group-info-btn {
  padding: 0 !important;
}

header {
  height: 60px;
  padding: 0 18px;
  position: sticky;
  top: 0;
  left: 0;
  right: 0;
  border-bottom: 1px solid var(--divid-color);
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;
  background: var(--el-drawer-bg-color);
  z-index: 10;

  .back {
    cursor: pointer;
    display: flex;
    align-items: center;
    .icon {
      width: 12px;
      height: 12px;
      display: inline-block;
      transform: rotate(90deg);
    }

    &:hover {
      .icon {
        &:deep(use) {
          stroke: var(--themeBtnTextColor);
          stroke-width: 2px;
        }
      }
    }
  }

  .title {
    line-height: var(--header-height);
    color: var(--themeTextColor);
  }
}
.affix {
  background: var(--el-drawer-bg-color);
}
.info {
  padding-top: 0;
}

/* 搜索框滑动动画 */
.search-slide-enter-active {
  transition: all 0.3s ease-out;
}

.search-slide-leave-active {
  transition: all 0.3s ease-in;
}

.search-slide-enter-from {
  transform: translateY(-100%);
  opacity: 0;
}

.search-slide-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.search-slide-enter-to,
.search-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}

.broadcast-chat-container {
  display: flex;
  align-items: center;
  //padding: 12px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  overflow: hidden;
}

.broadcast-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 12px;

  margin-right: 12px;
}

.broadcast-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.broadcast-title {
  /* font-size: 16px; */
  font-weight: 500;

  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.broadcast-description {
  font-size: 10px;

  line-height: 1.4;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 邀请弹窗样式 */
.invite-modal-content {
  .search-results {
    max-height: 400px;
    overflow-y: auto;
  }

  .user-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .user-item {
    transition: all 0.2s ease;

    &:hover {
      transform: translateX(4px);
    }
  }
}
</style>
