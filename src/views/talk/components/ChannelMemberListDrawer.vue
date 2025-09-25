<template>
  <ElDrawer
    :model-value="modelValue"
    :show-close="false"
    :with-header="false"
    :size="'360px'"
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
          <span class="title truncate max-w-6xl">{{ currentChannelInfo?.name || '' }}</span>
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
        <div class="mt-5 bg-white dark:bg-black px-4 py-5">
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
            {{ currentChannelInfo?.roomNote || '-' }}
          </div>
        </div>

        <div class="mt-3  bg-white dark:bg-black px-4 py-5" @click="copyLink">
          <div class="flex items-center justify-between text-md font-medium">
            {{ $t('Talk.Channel.ShareLink') }}
          </div>
          <div
            class="mt-2  text-dark-700 dark:text-gray-800 px-[12px] py-[10px] rounded-lg  bg-gray-100 dark:bg-gray-200  flex items-center justify-between"
          >
            <div class="word-break break-all">
              {{ currentLink }}
            </div>
            <el-icon
              class="cursor-pointer min-w-[24px] min-h-[24px] text-dark-300 dark:text-gray-400"
              ><Link
            /></el-icon>
          </div>
        </div>

        <div class="mt-3 mb-3 bg-white dark:bg-black px-4 py-5">
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
import ChannelMemberItem from './ChannelMemberItem.vue'
import EditAnnouncementDrawer from './EditAnnouncementDrawer.vue'
import EditChannelInfoDrawer from './EditChannelInfoDrawer.vue'
import CreateBroadcastChannelModal from './CreateBroadcastChannelModal.vue'
import InfiniteScroll from '@/components/InfiniteScroll/InfiniteScroll.vue'
import { useRoute, useRouter } from 'vue-router'
import { getChannelMembers, searchChannelMembers,getUserGroupRole } from '@/api/talk'
import { ElMessage } from 'element-plus'
import copy from 'copy-to-clipboard'
import {addMyBlockChatList,removeMyBlockChat} from '@/api/chat-notify'
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
} from '@element-plus/icons-vue'
import { metafile } from '@/utils/filters'
import { NodeName,MemberRule,RuleOp } from '@/enum'
import { createSinglePin } from '@/utils/pin'

import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useLayoutStore } from '@/stores/layout'
import { setChannelAdmins,setChannelWhiteList } from '@/utils/talk'
import type {MemberListRes,MemberItem } from '@/@types/simple-chat.d'
import { useI18n } from 'vue-i18n'
import { signMvcMessage,getMvcPublickey } from "@/wallet-adapters/metalet";





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


const triggleMuteNotify=computed(()=>{
  return simpleTalkStore.activeChannel?.type === 'sub-group' ? simpleTalkStore.getOneChannelMuteStatus(simpleTalkStore.activeChannel?.parentGroupId) :
  simpleTalkStore.getOneChannelMuteStatus(simpleTalkStore.activeChannel?.id)

})


// 判断当前用户是否是频道创建者
const isCurrentUserCreator = computed(() => {
  return currentChannelInfo.value?.createdBy === userStore.last?.metaid
})

const currentLink = computed(() => {
  return window.location.href
})

// 管理员列表（包含 owner 和 admins）
const currentAdminList = computed(() => {
  if (!memberPermissions.value) return []
  const creatorWithOwnerRole = {
        ...memberPermissions.value.creator,
        rule: MemberRule.Owner // 使用枚举值
      }
  const adminList = [creatorWithOwnerRole,...(memberPermissions.value.admins || []).filter(admin=>{
    return admin.metaId !== memberPermissions.value?.creator?.metaId
  }).map(admin => ({
    ...admin,
    rule: MemberRule.Admin // 确保管理员的 rule 字段被正确设置为 Admin
  }))]




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

const openBroadcastDialog=()=>{
  if(hasSubChannelList.value.length){
     ElMessage.warning(`${i18n.t('sub_channel_created')}`)
  }else{
    showCreateBroadcastModal.value = true
  }


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

  router.push({
    name: 'talkAtMe',
    params: {
      channelId: member.userInfo!.metaid,
      // metaid:message.userInfo.metaid
    },
  })
  simpleTalkStore.setActiveChannel(member.userInfo!.metaid)
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
      path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${NodeName.SimpleGroupJoin}`,
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
</style>
