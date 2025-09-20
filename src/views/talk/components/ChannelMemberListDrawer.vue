<template>
  <ElDrawer
    :model-value="modelValue"
    :show-close="false"
    :with-header="false"
    :size="'360px'"
    :append-to-body="true"
    :lock-scroll="false"
    :close-on-click-modal="false"
    custom-class="none-padding"
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
          <!-- <ChatImage
            :src="currentChannelInfo?.roomIcon"
            v-if="currentChannelInfo?.roomIcon"
            customClass="w-[88px] h-[88px] rounded-full"
          />
          <UserAvatar
            :image="''"
            :meta-id="currentChannelInfo?.groupId || currentChannelInfo?.createUserMetaId"
            :name="currentChannelInfo?.roomName"
            :meta-name="''"
            :is-custom="currentChannelInfo?.roomIcon ? false : true"
            :disabled="true"
            :size="88"
            type="metafile"
            v-else
          /> -->
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
            <el-button v-if="isCurrentUserCreator" color="#ffffff" size="default" :icon="CirclePlus" @click="openBroadcastMode"
              >{{ $t('Talk.Channel.broadcast') }}</el-button
            >
            <el-button color="#ffffff" size="default" :icon="Search" @click="showSearch = true"
              >{{ $t('Talk.Channel.search') }}</el-button
            >
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

        <div class="mt-3 bg-white dark:bg-black px-4 py-5" @click="copyLink">
          <div class="flex items-center justify-between text-md font-medium">
            {{ $t('Talk.Channel.ShareLink') }}
          </div>
          <div class="mt-2 text-dark-300 dark:text-gray-400 flex items-center justify-between">
            <div class="word-break break-all">
              {{ currentLink }}
            </div>
            <el-icon
              class="cursor-pointer min-w-[24px] min-h-[24px] text-dark-300 dark:text-gray-400"
              ><Link
            /></el-icon>
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

          <!--管理员-->
          <li class="px-4 py-2 text-sm text-dark-300 dark:text-gray-400" v-if="currentAdminList.length">
            <span>
              {{ $t('channle_memeber_admin') }}
            </span>
            <span>
             ({{ currentAdminList.length }})
            </span>
          </li>

          <li
          v-for="member in currentAdminList"
          :key="member?.index"
          class="w-full relative list-item"
          >
           <ChannelMemberItem
              class="absolute top-0 left-0 w-full z-0"
              :id="member?.index"

              :style="{ transform: `translateY(${member?.start}px)` }"
              :member="member"
             
              :key="member?.index"
              :createUserMetaId="currentChannelInfo?.createUserMetaId"
              :groupId="currentChannelInfo?.groupId"
              @updated="handleDeleteSuccess"
              @updateUserAdmin="handleAdmin"
              @updateUserWhiteList="handleWhiteList"
            />

          </li>

          <!--白名单-->

          <li class="px-4 py-2 text-sm text-dark-300 dark:text-gray-400" v-if="currentSpeakerList.length">
              <span>
               {{ $t('channle_memeber_whitelist') }}
            </span>
            <span>
             ({{ currentSpeakerList.length }})
            </span>
          
          </li>

          <li
          v-for="member in currentSpeakerList"
          :key="member?.index"
          class="w-full relative list-item"
          >
           <ChannelMemberItem
              class="absolute top-0 left-0 w-full z-0"
              :id="member?.index"

              :style="{ transform: `translateY(${member?.start}px)` }"
              :member="member"
             
              :key="member?.index"
              :createUserMetaId="currentChannelInfo?.createUserMetaId"
              :groupId="currentChannelInfo?.groupId"
              @updated="handleDeleteSuccess"
              @updateUserAdmin="handleAdmin"
              @updateUserWhiteList="handleWhiteList"
            />

          </li>

          <!--普通成员-->

          <li class="px-4 py-2 text-sm text-dark-300 dark:text-gray-400" v-if="currentDisplayList.length">
            {{ $t('channle_memeber_noraml') }}
          </li>
          <li
            v-for="member in currentDisplayList"
            :key="member.id"
            class="w-full relative list-item"
          >
            <ChannelMemberItem
              class="absolute top-0 left-0 w-full z-0"
              :id="member.index"
               
              :style="{ transform: `translateY(${member.start}px)` }"
              :member="member"
               
              :key="member.index"
              :createUserMetaId="currentChannelInfo?.createdBy"
              :groupId="currentChannelInfo?.id"
              @updated="handleDeleteSuccess"
               @updateUserAdmin="handleAdmin"
              @updateUserWhiteList="handleWhiteList"
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
        <!-- IntersectionObserver 触发元素 - 只在非搜索状态下显示 -->
        <div ref="loadTrigger" class="load-trigger" v-if="!noMore && !searchKey.trim()"></div>
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
</template>

<script lang="ts" setup>
import {
  ref,
  watch,
  computed,
  defineProps,
  defineEmits,
  withDefaults,
  onMounted,
  onUnmounted,
  nextTick,
  toRaw,
  reactive,
  onUpdated,
} from 'vue'

import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import ChannelMemberItem from './ChannelMemberItem.vue'
import EditAnnouncementDrawer from './EditAnnouncementDrawer.vue'
import EditChannelInfoDrawer from './EditChannelInfoDrawer.vue'
import { useRoute } from 'vue-router'
import { getChannelMembers, searchChannelMembers,getUserGroupRole } from '@/api/talk'
import { ElMessage } from 'element-plus'
import copy from 'copy-to-clipboard'
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
import Item from './direct-contact/Item.vue'
import { useI18n } from 'vue-i18n'



 
interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue'])
const i18n=useI18n()
const showSearch = ref(false)
const simpleTalkStore = useSimpleTalkStore()
const userStore = useUserStore()
const layout=useLayoutStore()
const cursor = ref(0)
const pageSize = 20
const route = useRoute()
const permissionMemberList=reactive<string[]>([])
const curentMemberList=computed(()=>{
  return simpleTalkStore.activeChannelMemeberList
})
// const memberList =ref<MemberListRes>({
//   admins:[],
//   blockList:[],
//   creator:null,
//   list:[],
//   normalList:[],
//   whiteList:[]
// })
// const adminList=ref<MemberItem[]>([])
// const speakerWhiteList=ref<MemberItem[]>([])   
// const normalList=ref<MemberItem[]>([])  
const scrollContainer = ref<HTMLElement | null>(null)
const loadTrigger = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | null = null

const searchKey = ref('')
// 用于防止网络竞态的请求序列号
let requestSequence = 0
// 搜索请求序列号，与默认加载分开
let searchRequestSequence = 0
// 防抖定时器
let searchDebounceTimer: NodeJS.Timeout | null = null
// 搜索结果列表
const searchList = ref<MemberItem[]>([])
// 搜索状态
const isSearching = ref(false)

const closeSearch = () => {
  showSearch.value = false
  searchKey.value = ''
  searchList.value = []
  isSearching.value = false
  // 清除防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
  // 关闭搜索后重新设置 IntersectionObserver 以确保能继续加载
  // 使用 nextTick 确保 Vue 的响应式更新完成
  nextTick(() => {
    setupIntersectionObserver()
  })
}

const openBroadcastMode=()=>{
  layout.isShowCreateBroadcastChannelModal = true
  layout.isShowMemberListDrawer =false
}



// 控制编辑公告抽屉的显示
const showEditAnnouncementDrawer = ref(false)

// 控制编辑群信息抽屉的显示
const showEditChannelInfoDrawer = ref(false)

// 滚动到顶部的方法
const scrollToTop = () => {
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = 0
  }
}

const currentChannelInfo = computed(() => {
  return simpleTalkStore.activeChannel?.type === 'sub-group'
    ? simpleTalkStore.getParentGroupChannel(simpleTalkStore.activeChannel.id) || null
    : simpleTalkStore.activeChannel || null
})

 watch(()=>currentChannelInfo.value?.id,(newVal,oldVal)=>{
  if(newVal && newVal !== oldVal){
    
     resetAndLoad()
 }
 })

// 判断当前用户是否是频道创建者
const isCurrentUserCreator = computed(() => {
  return currentChannelInfo.value?.createdBy === userStore.last?.metaid
})

const currentLink = computed(() => {
  return window.location.href
})


const getPermission = (rule:MemberRule) =>{
  switch(rule){
    case MemberRule.Owner:
      return [RuleOp.CanSpeak,RuleOp.SetAdmin,RuleOp.RemoveAdmin,RuleOp.SetSpeaker,RuleOp.RemoveSpeaker,RuleOp.DeleteMember,RuleOp.Normal]
    case MemberRule.Admin:
      return [RuleOp.CanSpeak,RuleOp.SetSpeaker,RuleOp.RemoveSpeaker,RuleOp.DeleteMember,RuleOp.Normal]
    case MemberRule.Speaker:
      return [RuleOp.CanSpeak,RuleOp.Normal]
    case MemberRule.Normal:
      return [RuleOp.Normal]
    default:
      return [RuleOp.Normal]
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
  // 使用 store 专门的更新方法，确保全局数据一致性
  // if (currentChannelInfo.value) {
  //   talkStore.updateChannelAnnouncement(currentChannelInfo.value.groupId, newAnnouncement)
  // }
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

  // 如果需要通知其他组件更新，可以在这里发送事件
  // 例如：发送自定义事件或更新其他 store 状态
}

const handleDeleteSuccess = (metaid: string) => {
  console.log(metaid)
  // cursor.value = 0
  // noMore.value = false
  // memberList.value = {
  //   admins:[],
  //   blockList:[],
  //   creator:null,
  //   list:[],
  //   normalList:[],
  //   whiteList:[]
  // }
    // memberList.value.admins= memberList.value.admins.filter((item)=>item.metaId !== metaid)
    // memberList.value.whiteList= memberList.value.whiteList.filter((item)=>item.metaId !== metaid)
    // memberList.value.normalList= memberList.value.normalList.filter((item)=>item.metaId !== metaid)
    // memberList.value.list= memberList.value.list.filter((item)=>item.metaId !== metaid)


  // 如果当前在搜索状态，重新执行搜索
  if (searchKey.value.trim()) {
    performSearch(searchKey.value.trim())
  } else {
    const groupId=currentChannelInfo.value?.groupId || route.params.channelId as string
     setTimeout(() => {
      getUserGroupRole({
      groupId:groupId,
      metaId:metaid
    }).then((res)=>{

      
      simpleTalkStore.handleWsUserRole(res)
    }).catch((e)=>ElMessage.error(`${i18n.t('Talk.Channel.getRoleError')}`))
    
   }, 500);


    // 立即滚动到顶部
    // scrollToTop()
    // load()
  }
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

const handleAdmin=async(member:MemberItem)=>{
  try {
  let admins:string[]=[]
  curentMemberList.value.admins.forEach((item)=>{
    if(item.rule != MemberRule.Owner){
      admins.push(item?.metaId) 
    }
  })
  //已经是管理员，要移除
  if(admins.includes(member?.metaId)){
    
    admins=admins.filter((admin)=>admin !== member.metaId)
  }else{
    
    admins.push(member?.metaId)
  }
  const groupId=currentChannelInfo.value?.groupId || route.params.channelId as string
  
  const updateRes=await setChannelAdmins(groupId,admins) 
  if(updateRes.status == 'success' && updateRes.txid){
   setTimeout(() => {
      getUserGroupRole({
      groupId:groupId,
      metaId:member.metaId!
    }).then((res)=>{

      
      simpleTalkStore.handleWsUserRole(res)
    }).catch((e)=>ElMessage.error(`${i18n.t('Talk.Channel.getRoleError')}`))
    
   }, 500);
  // if(admins.includes(member?.metaId)){
    
  //   memberList.value.admins=memberList.value.admins.filter((admin)=>admin.metaId !== member.metaId)
  // }else{
    
  //    memberList.value.admins.push(member)
  // }

  // cursor.value = 0
  // noMore.value = false
  // memberList.value = {
  //   admins:[],
  //   blockList:[],
  //   creator:null,
  //   list:[],
  //   normalList:[],
  //   whiteList:[]
  // }

  // 如果当前在搜索状态，重新执行搜索
  if (searchKey.value.trim()) {
    performSearch(searchKey.value.trim())
  } else {
    // 立即滚动到顶部
    // scrollToTop()
    // load()
    // nextTick(()=>{
      
    //   const observeInterval= setInterval(() => {
      
    //   if (loadTrigger.value && observer && !searchKey.value.trim()) {
      
    //   observer.observe(loadTrigger.value)

    //   console.log("进来清除定时器",1111)
    //   clearInterval(observeInterval)
    //   }

      
    //   }, 3000)

     
    //   })
   

  }
  }else{
    
  }
  } catch (error) {
    ElMessage.error((error as any).message)
  }

}

const handleWhiteList=async(member:MemberItem)=>{

  try {
  
  
  let whiteList:string[]=[]
  curentMemberList.value.whiteList.forEach((item)=>{
    if((item.rule != MemberRule.Admin  ) ){
      whiteList.push(item?.metaId) 
    }
  })
  //已经是白名单，要移除
  if(whiteList.includes(member?.metaId)){
    
    whiteList=whiteList.filter((admin)=>admin !== member.metaId)
  }else{
    
    whiteList.push(member?.metaId)
  }
  const groupId=currentChannelInfo.value?.groupId || route.params.channelId as string
  
  const updateRes=await setChannelWhiteList(groupId,whiteList) 
  if(updateRes.status == 'success' && updateRes.txid){

     setTimeout(() => {
      getUserGroupRole({
      groupId:groupId,
      metaId:member.metaId!
    }).then((res)=>{

      
      simpleTalkStore.handleWsUserRole(res)
    }).catch((e)=>ElMessage.error(`${i18n.t('Talk.Channel.getRoleError')}`))
    
   }, 500);

  // cursor.value = 0
  // noMore.value = false
  // memberList.value = {
  //   admins:[],
  //   blockList:[],
  //   creator:null,
  //   list:[],
  //   normalList:[],
  //   whiteList:[]
  // }

  // 如果当前在搜索状态，重新执行搜索
  if (searchKey.value.trim()) {
    performSearch(searchKey.value.trim())
  } else {
    // 立即滚动到顶部
    // scrollToTop()
    // load()
    // nextTick(()=>{
      
    //   const observeInterval= setInterval(() => {
      
    //   if (loadTrigger.value && observer && !searchKey.value.trim()) {
      
    //   observer.observe(loadTrigger.value)
    //   console.log("进来清除定时器",1111)
    //   clearInterval(observeInterval)
    //   }
    //   }, 3000)

     
    //   })
  }
  }else{
    
  }
  } catch (error) {
    ElMessage.error((error as any).message)
  }
}



// 监听currentChannelInfo变化，重新拉取成员数据
// watch(
//   () => currentChannelInfo.value?.id, // 直接监听 channelId 变化
//   (newChannelId, oldChannelId) => {
//     
//     // 只有在抽屉打开状态下且频道ID确实发生变化时才执行
//     if (props.modelValue && newChannelId && newChannelId !== oldChannelId) {
//       console.log('频道切换，重新加载成员列表:', oldChannelId, '->', newChannelId)
//       //resetAndLoad()
//     }
//   },
//   { immediate: false }
// )

// 监听抽屉开关状态
watch(
  () => currentChannelInfo.value?.id, // 直接监听 channelId 变化
  (newChannelId, oldChannelId) => {
    // 只有在抽屉打开状态下且频道ID确实发生变化时才执行
    if (props.modelValue && newChannelId && newChannelId !== oldChannelId) {
      console.log('频道切换，重新加载成员列表:', oldChannelId, '->', newChannelId)
      resetAndLoad()
    }
  },
  // { immediate: true }
)

// 监听抽屉开关状态
watch(
  () => props.modelValue,
  isOpen => {
    if (isOpen) {
      console.log('抽屉打开，初始化成员列表')
      // 抽屉打开时，如果有频道信息就加载数据
      if (currentChannelInfo.value?.id) {
        resetAndLoad()
      } else {
        // 没有频道信息时，至少要设置 observer
        setupIntersectionObserver()
      }
    } else {
      cleanupIntersectionObserver()
      // 关闭时可以选择是否清理数据（这里保留数据以提高用户体验）
      // resetData()
    }
  },
  { immediate: true }
)

// 重置数据并加载的统一方法
const resetAndLoad = async () => {
  // 重置分页状态
  cursor.value = 0
  noMore.value = false
  simpleTalkStore.$patch({channelMemeberList:{
      admins:[],
      blockList:[],
      creator:null,
      list:[],
      normalList:[],
      whiteList:[]
}})
  searchList.value = []
  isSearching.value = false

  // 清除搜索相关状态
  searchKey.value = ''
  showSearch.value = false

  // 清除搜索防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }

  // 立即滚动到顶部
  scrollToTop()

  // 开始加载数据
  try {
    await getMoreMember()
  } catch (error) {
    console.error('重置并加载数据失败:', error)
  }

  // 数据加载完成后，确保 IntersectionObserver 正确设置
  nextTick(() => {
    setupIntersectionObserver()
  })
}

// 监听搜索关键词变化，添加防抖处理
watch(searchKey, newSearchKey => {
  // 清除之前的防抖定时器
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  // 如果搜索关键词为空，清空搜索结果，不影响默认列表
  if (!newSearchKey.trim()) {
    searchList.value = []
    isSearching.value = false
    // 重新设置 IntersectionObserver 以确保能继续加载
    nextTick(() => {
      setupIntersectionObserver()
    })
    return
  }

  // 设置防抖定时器
  searchDebounceTimer = setTimeout(() => {
    performSearch(newSearchKey.trim())
  }, 300) // 300ms 防抖延迟
})

// 执行搜索的函数
const performSearch = async (keyword: string) => {
  if (!currentChannelInfo.value || !keyword) return

  isSearching.value = true
  const currentSearchSequence = ++searchRequestSequence

  try {
    const members = await searchChannelMembers({
      groupId: currentChannelInfo.value.id,
      query: keyword,
    })

    // 检查竞态条件
    if (currentSearchSequence !== searchRequestSequence) {
      return
    }

    searchList.value = members.map((member: any, index: number) => ({
      ...member,
      index,
      start: index * 60, // 60px = 50px height + 10px margin-top，与默认列表保持一致
    }))
  } catch (error) {
    if (currentSearchSequence === searchRequestSequence) {
      ElMessage.error('搜索群组成员失败')
    }
  } finally {
    if (currentSearchSequence === searchRequestSequence) {
      isSearching.value = false
    }
  }
}

// 虚拟列表
const loading = ref(false)
const noMore = ref(false)
const disabled = computed(() => loading.value || noMore.value || searchKey.value.trim() !== '')

// 计算当前显示的列表（搜索结果或默认列表）
const currentDisplayList = computed(() => {
  return searchKey.value.trim() ? searchList.value : curentMemberList.value.normalList//list.value.filter((member)=>member.rule!==MemberRule.Owner && member.rule!==MemberRule.Admin)
})


const currentSpeakerList = computed(() => {
  return curentMemberList.value.whiteList//list.value.filter((member)=>member.rule===MemberRule.Admin || member.rule===MemberRule.Owner)
})

const currentAdminList = computed(() => {
  return curentMemberList.value.admins//list.value.filter((member)=>member.rule===MemberRule.Admin || member.rule===MemberRule.Owner)
})

// 设置 IntersectionObserver
const setupIntersectionObserver = () => {
  console.log('🔧 设置 IntersectionObserver')

  if (observer) {
    console.log('🔄 断开之前的 observer')
    observer.disconnect()
  }

  observer = new IntersectionObserver(
    entries => {
      const [entry] = entries
      console.log('👁️ IntersectionObserver 触发:', {
        isIntersecting: entry.isIntersecting,
        disabled: disabled.value,
        loading: loading.value,
        noMore: noMore.value,
        searchKey: searchKey.value,
        listLength: curentMemberList.value.list?.length,
        cursor: cursor.value,
      })

      if (entry.isIntersecting && !disabled.value) {
        console.log('📥 触发加载更多')
        load()
      } else if (entry.isIntersecting && disabled.value) {
        console.log('⏸️ IntersectionObserver 触发但被禁用:', {
          loading: loading.value,
          noMore: noMore.value,
          searchKey: searchKey.value.trim(),
        })
      }
    },
    {
      root: scrollContainer.value,
      rootMargin: '200px', // 增加预加载区域到 200px
      threshold: 0.1,
    }
  )

  // 延迟一点时间确保 DOM 已经渲染
  nextTick(() => {
    setTimeout(() => {
      if (loadTrigger.value && observer && !searchKey.value.trim()) {
        console.log('✅ 开始观察 loadTrigger 元素')
        observer.observe(loadTrigger.value)

        // 检查元素是否已经在视口内，如果是且没有数据，立即触发加载
        if (list.value.length === 0 && !loading.value && !noMore.value) {
          console.log('🚀 loadTrigger 已在视口内且无数据，立即触发加载')
          load()
        }
      } else {
        console.warn('⚠️ 无法观察 loadTrigger 元素:', {
          loadTrigger: !!loadTrigger.value,
          observer: !!observer,
          searchKey: searchKey.value,
        })
      }
    }, 200) // 增加延迟时间
  })
}

// 清理 IntersectionObserver
const cleanupIntersectionObserver = () => {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

const load = () => {
  getMoreMember()
}

// 组件挂载时的初始化已由 watch 监听器处理
onMounted(() => {
  // 初始化逻辑已移至 watch 监听器中
  const groupId=simpleTalkStore.activeChannel?.id || route.params.channelId as string
  getUserGroupRole({
    groupId,
    metaId:simpleTalkStore.selfMetaId
  }).then((res)=>{
    const {isCreator,isAdmin,isBlocked,isWhitelist,isRemoved,userInfo,metaId,address,groupId}=res
    let role=MemberRule.Normal
    
    if(isBlocked){
      role=MemberRule.Block
    }
    if(isWhitelist){
      role=MemberRule.Speaker
    }
    //预防两个身份的时候优先级应该是管理员
    if(isAdmin){
       role=MemberRule.Admin
    }
    if(isCreator){
      role=MemberRule.Owner
    }
    if(!isWhitelist && !isAdmin && !isCreator){
      role=MemberRule.Normal
    }


    simpleTalkStore.updateMyChannelRule(groupId,role)
  })

  


})



// 组件卸载时清理 observer 和防抖定时器
onUnmounted(() => {
  cleanupIntersectionObserver()
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})

async function getMoreMember() {
  console.log('📋 getMoreMember 调用:', {
    hasChannelInfo: !!currentChannelInfo.value,
    loading: loading.value,
    searchKey: searchKey.value.trim(),
    cursor: cursor.value,
    noMore: noMore.value,
  })

  if (!currentChannelInfo.value || loading.value || searchKey.value.trim()) {
    console.log('❌ getMoreMember 中断:', {
      hasChannelInfo: !!currentChannelInfo.value,
      loading: loading.value,
      hasSearchKey: !!searchKey.value.trim(),
    })
    return
  }

  const isSession = currentChannelInfo.value?.type === 'private'
  if (isSession) {
    console.log('⏹️ 私聊会话，跳过成员加载')
    return
  }

  console.log('🔄 开始加载群组成员:', {
    groupId: currentChannelInfo.value.id,
    cursor: cursor.value,
  })

  loading.value = true

  try {
    const members = await getChannelMembers({
      groupId: currentChannelInfo.value.id,
      cursor: String(cursor.value),
    })
    
    
   
    if (members.list.length) {
      if (cursor.value === 0) {
        const memberList:MemberListRes={
              admins:[],
              blockList:[],
              creator:{},
              list:[],
              normalList:[],
              whiteList:[]
        }
        

        memberList.creator={
          ...members.creator,
          index: 0,
          rule:MemberRule.Owner,
          permission:getPermission(MemberRule.Owner),
          start: 0, // 60px = 50px height + 10px margin-top
        }

        // if(members.creator.metaId == simpleTalkStore.selfMetaId){
        //   const groupId=currentChannelInfo.value?.groupId || route.params.channelId as string
        //   simpleTalkStore.updateMyChannelRule(groupId,MemberRule.Owner)
        
        // }

        permissionMemberList.push(members.creator.metaId)
        // memberList.value.admins.push({
        //   ...members.creator,
        //   index: 0,
        //   rule:MemberRule.Owner,
        //   permission:getPermission(MemberRule.Owner),
        //   start: 0, // 60px = 50px height + 10px margin-top
        // })

        

        if(members.admins){


          members.admins.forEach((admin,index)=>{
             permissionMemberList.push(admin.metaId)
            //  if(admin.metaId == simpleTalkStore.selfMetaId){
            //    const groupId=currentChannelInfo.value?.groupId || route.params.channelId as string
            //    simpleTalkStore.updateMyChannelRule(groupId,MemberRule.Admin)
            //     //selfRule.value=MemberRule.Admin
            //     }
             memberList.admins.push({
              ...admin,
              index: (index + 1),
              rule:MemberRule.Admin,
              permission:getPermission(MemberRule.Admin),
              start: (index + 1) * 60, // 60px = 50px height + 10px margin-top
            })
            
          })
        }

           memberList.admins.unshift({
          ...members.creator,
          index: 0,
          rule:MemberRule.Owner,
          permission:getPermission(MemberRule.Owner),
          start: 0, // 60px = 50px height + 10px margin-top
        })

        

        if(members.whiteList){
            const groupId=currentChannelInfo.value?.groupId || route.params.channelId as string
          members.whiteList.forEach((speaker,index)=>{
            //  if(speaker.metaId == simpleTalkStore.selfMetaId){
            //   const existRule= simpleTalkStore.getMychannelRule(groupId)
            //   if(existRule != MemberRule.Admin){
               
            //     simpleTalkStore.updateMyChannelRule(groupId,MemberRule.Speaker)
            //   }
              
              
            //     //selfRule.value=MemberRule.Speaker
            //   }
             permissionMemberList.push(speaker.metaId)
             memberList.whiteList.push({
              ...speaker,
              index: (index + 1 + memberList.admins.length),
              rule:MemberRule.Speaker,
              permission:getPermission(MemberRule.Speaker),
              start: (index + 1 + memberList.admins.length) * 60, // 60px = 50px height + 10px margin-top
            })
            
          })
        }

        if(members.list){
          let tempIndex=0
          members.list.forEach((normal,index)=>{
              if(!permissionMemberList.includes(normal.metaId)){
                  memberList.normalList.push({
                  ...normal,
                  index: (tempIndex + 1 + memberList.admins.length + memberList.whiteList.length),
                  rule:MemberRule.Normal,
                  permission:getPermission(MemberRule.Normal),
                  start: (tempIndex + 1 + memberList.admins.length + memberList.whiteList.length) * 60, // 60px = 50px height + 10px margin-top
                  })
                  tempIndex++
              }

              memberList.list.push({
              ...normal,
              index: index,
              rule:MemberRule.Normal,
              permission:getPermission(MemberRule.Normal),
              start: index * 60, // 60px = 50px height + 10px margin-top
            })
            
          })
        }
        console.log("memberList",memberList)
        simpleTalkStore.$patch({channelMemeberList:memberList})

        //  list.value=members.map((member: any,index:number) => {
        //   return {
        //   ...member,
        //   index: index ,
        //   start: index * 60, // 60px = 50px height + 10px margin-top
        // }
        // })

        cursor.value = members.list.length // 修复：使用实际接收到的成员数量
      } else {
        const startIndex = curentMemberList.value.list.length
        const newMembers = members.list.map((member: any, index: number) => ({
          ...member,
          rule:MemberRule.Normal,
          permission:getPermission(MemberRule.Normal),
          index: startIndex + index,
          start: (startIndex + index) * 60, // 60px = 50px height + 10px margin-top
        }))
        let tempIndex=0
        newMembers.forEach((member)=>{
          if(!permissionMemberList.includes(member.metaId)){
              curentMemberList.value.normalList.push({
              ...member,
              rule:MemberRule.Normal,
              permission:getPermission(MemberRule.Normal),
              index: startIndex + tempIndex,
              start: (startIndex + tempIndex) * 60, // 60px = 50px height + 10px margin-top
            })
            tempIndex++
          }
        })

        //memberList.value.normalList = [...memberList.value.normalList, ...newMembers]
        const memberList = [...curentMemberList.value.list, ...newMembers]
        simpleTalkStore.$patch({channelMemeberList:memberList})
        cursor.value += members.list.length // 修复：使用实际接收到的成员数量，而不是固定的 pageSize
      }

      if (members.list.length < pageSize) {
        
        noMore.value = true
        console.log('🏁 已加载所有成员')
      } else {
        console.log('📋 还有更多成员可以加载')
      }
    } else {
      noMore.value = true
    }
    
    // 确保在数据更新后重新设置 observer
    if (!noMore.value && loadTrigger.value && observer && !searchKey.value.trim()) {
      
      // 确保 trigger 元素在 DOM 中可见
      setTimeout(() => {
        if (loadTrigger.value && observer && !searchKey.value.trim()) {
          observer.observe(loadTrigger.value)
        }
      }, 100)
    }
  } catch (error) {
    console.error('❌ 加载成员失败:', error)
    ElMessage.error('获取群组成员失败')
  } finally {
    loading.value = false
    console.log('🔓 成员加载完成，loading = false')

    // 确保在加载完成后 IntersectionObserver 仍在正常工作
    if (!noMore.value && !searchKey.value.trim()) {
      nextTick(() => {
        if (loadTrigger.value && observer) {
          console.log('🔄 重新确保 observer 正在监听')
          // 先断开再重新连接，确保监听状态正确
          observer.disconnect()
          observer.observe(loadTrigger.value)
        }
      })
    }
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

.load-trigger {
  height: 20px;
  width: 100%;
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

.group-info-btn{
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
  //padding-top: 60px;
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
