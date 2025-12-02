<template>
  <!-- 加载中状态 -->
  <div v-if="isLoading" class="protocol-card-loading">
    <div
      class="max-w-[300px] min-w-[280px] lg:max-w-[420px] shadow rounded-xl bg-white dark:bg-gray-700 overflow-hidden animate-pulse"
    >
      <div class="p-4 flex items-center gap-3">
        <!-- 图标占位 -->
        <div class="w-12 h-12 rounded-lg bg-gray-200 dark:bg-gray-600"></div>
        <!-- 文字占位 -->
        <div class="flex-1 space-y-2">
          <div class="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4"></div>
          <div class="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2"></div>
        </div>
      </div>
      <div class="px-4 pb-4 space-y-2">
        <div class="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
        <div class="h-3 bg-gray-200 dark:bg-gray-600 rounded w-2/3"></div>
      </div>
    </div>
  </div>

  <div v-else-if="cardInfo.shouldRender" class="protocol-card-wrapper">
    <!-- MetaApp 应用链接卡片 -->
    <div
      v-if="cardInfo.type === 'metaapp'"
      class="max-w-[300px] min-w-[280px] lg:max-w-[420px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md group overflow-hidden"
      @click="handleCardClick"
    >
      <!-- 顶部：icon | appName version | Made by creator -->
      <div class="p-4 pb-2 flex items-center gap-3 border-b border-gray-200 dark:border-gray-600">
        <!-- Icon -->
        <div class="w-12 h-12 shrink-0">
          <ChatImage
            v-if="cardInfo.icon"
            :src="cardInfo.icon"
            customClass="w-12 h-12 rounded-lg object-cover"
          />
          <div
            v-else
            class="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          >
            <Icon name="cube" class="w-6 h-6 text-gray-400" />
          </div>
        </div>

        <!-- AppName & Version -->
        <div class="flex-1 min-w-0">
          <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
            {{ cardInfo.appName || 'MetaApp' }}
          </div>
          <div class="text-dark-400 dark:text-gray-400 text-xs mt-0.5">
            {{ cardInfo.version }}
          </div>
        </div>

        <!-- Made by Creator -->
        <div class="flex flex-col">
          <div class="text-dark-400 dark:text-gray-400 font-medium text-sm">Made by</div>
          <div class="flex items-center gap-1.5 shrink-0">
            <UserAvatar
              :image="cardInfo.creatorInfo?.avatar || ''"
              :name="cardInfo.creatorInfo?.name || cardInfo.creator?.slice(0, 8) || ''"
              :meta-id="cardInfo.creatorInfo?.metaid || ''"
              :meta-name="''"
              class="w-6 h-6"
              :disabled="true"
            />
            <div class="text-dark-800 dark:text-gray-100 text-xs">
              {{ cardInfo.creatorInfo?.name || cardInfo.creator?.slice(0, 8) || '' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Title -->
      <div class="px-4 py-3">
        <div class="text-dark-800 dark:text-gray-100 font-medium text-base line-clamp-2">
          {{ cardInfo.title }}
        </div>
      </div>

      <!-- Cover Image -->
      <div v-if="cardInfo.coverImg" class="w-full h-40 p-4">
        <ChatImage
          :src="cardInfo.coverImg"
          customClass="w-full h-full object-cover rounded-none"
          wrapperClass="w-full h-full"
        />
      </div>

      <!-- OPEN APP 按钮 -->
      <div class="p-4 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div
          class="main-border bg-primary hover:bg-primary-dark text-black text-center py-2 px-4 rounded-lg transition-colors duration-200 font-medium text-sm"
        >
          OPEN APP
        </div>
      </div>
    </div>

    <!-- Buzz 卡片 -->
    <div
      v-else-if="cardInfo.type === 'buzz'"
      class="max-w-[300px] min-w-[300px] lg:max-w-[420px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md overflow-hidden"
      @click="handleCardClick"
    >
      <div class="p-4 space-y-3">
        <!-- 用户信息和时间 -->
        <div class="flex items-center space-x-2">
          <UserAvatar
            :image="cardInfo.creatorInfo?.avatar || ''"
            :name="cardInfo.creatorInfo?.name || cardInfo.creator?.slice(0, 8) || ''"
            :meta-id="cardInfo.creatorInfo?.metaid || ''"
            :meta-name="''"
            class="w-10 h-10 shrink-0"
            :disabled="true"
          />
          <div class="flex-1 min-w-0">
            <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
              {{ cardInfo.creatorInfo?.name || cardInfo.creator?.slice(0, 8) || '' }}
            </div>
            <div class="text-dark-400 dark:text-gray-400 text-xs">
              {{ formatTime(cardInfo.timestamp) }}
            </div>
          </div>
        </div>

        <!-- 内容布局：图片 + 文本 -->
        <div class="flex gap-3">
          <!-- 图片或视频图标 -->
          <div
            v-if="cardInfo.hasVideo || cardInfo.firstImage"
            class="w-20 h-20 shrink-0 overflow-hidden rounded relative"
          >
            <!-- 视频图标 -->
            <div
              v-if="cardInfo.hasVideo"
              class="w-20 h-20 bg-gray-100 dark:bg-gray-800 flex items-center justify-center rounded text-lg"
            >
              <el-icon><VideoPlay /></el-icon>
            </div>
            <!-- 图片 -->
            <ChatImage
              v-else-if="cardInfo.firstImage"
              :src="cardInfo.firstImage"
              customClass="w-20 h-20 object-cover rounded-none"
            />
          </div>

          <!-- 文本内容 -->
          <div class="flex-1 min-w-0">
            <div class="text-dark-800 dark:text-gray-100 text-sm line-clamp-4">
              {{ cardInfo.content }}
            </div>
          </div>
        </div>
      </div>

      <!-- 底部标识 -->
      <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-600">
        <div class="text-dark-400 dark:text-gray-400 text-xs flex items-center gap-1">
          <Icon name="buzz" class="w-4 h-4" />
          <span>Buzz</span>
        </div>
      </div>
    </div>

    <!-- SimpleNote 笔记卡片 -->
    <div
      v-else-if="cardInfo.type === 'note'"
      class="max-w-[300px] min-w-[300px] lg:max-w-[420px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md overflow-hidden"
      @click="handleCardClick"
    >
      <div class="p-4 space-y-3">
        <!-- 用户信息和时间 -->
        <div class="flex items-center space-x-2">
          <UserAvatar
            :image="cardInfo.creatorInfo?.avatar || ''"
            :name="cardInfo.creatorInfo?.name || cardInfo.creator?.slice(0, 8) || ''"
            :meta-id="cardInfo.creatorInfo?.metaid || ''"
            :meta-name="''"
            class="w-10 h-10 shrink-0"
            :disabled="true"
          />
          <div class="flex-1 min-w-0">
            <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
              {{ cardInfo.creatorInfo?.name || cardInfo.creator?.slice(0, 8) || '' }}
            </div>
            <div class="text-dark-400 dark:text-gray-400 text-xs">
              {{ formatTime(cardInfo.timestamp) }}
            </div>
          </div>
        </div>

        <!-- 标题和封面图 -->
        <div class="flex gap-3">
          <!-- 封面图 -->
          <div v-if="cardInfo.coverImg" class="w-20 h-20 shrink-0 overflow-hidden rounded">
            <ChatImage :src="cardInfo.coverImg" customClass="w-20 h-20 object-cover rounded-none" />
          </div>

          <!-- 标题和描述 -->
          <div class="flex-1 min-w-0">
            <div class="text-dark-800 dark:text-gray-100 font-medium text-sm line-clamp-2">
              {{ cardInfo.title || '无标题' }}
            </div>
            <div
              v-if="cardInfo.subtitle"
              class="text-dark-400 dark:text-gray-400 text-xs mt-1 line-clamp-2"
            >
              {{ cardInfo.subtitle }}
            </div>
          </div>
        </div>
      </div>

      <!-- 底部标识 -->
      <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-600">
        <div class="text-dark-400 dark:text-gray-400 text-xs flex items-center gap-1">
          <Icon name="note" class="w-4 h-4" />
          <span>Note</span>
        </div>
      </div>
    </div>

    <!-- MetaFile 文件卡片 -->
    <div
      v-else-if="cardInfo.type === 'metafile'"
      class="max-w-[300px] min-w-[280px] lg:max-w-[380px] shadow rounded-xl cursor-pointer transition-all duration-200 bg-white dark:bg-gray-700 hover:shadow-md overflow-hidden"
      @click="handleCardClick"
    >
      <div class="p-4">
        <div class="flex items-center gap-3">
          <!-- 文件图标 -->
          <div
            class="w-12 h-12 shrink-0 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
          >
            <Icon :name="getFileIcon(cardInfo.fileExtension)" class="w-6 h-6 text-gray-500" />
          </div>

          <!-- 文件信息 -->
          <div class="flex-1 min-w-0">
            <div class="text-dark-800 dark:text-gray-100 font-medium text-sm truncate">
              {{ cardInfo.fileName || 'Unknown File' }}
            </div>
            <div class="text-dark-400 dark:text-gray-400 text-xs mt-0.5 flex items-center gap-2">
              <span>{{ formatFileSize(cardInfo.fileSize) }}</span>
              <span v-if="cardInfo.fileType">• {{ cardInfo.fileType }}</span>
            </div>
          </div>

          <!-- 下载图标 -->
          <div class="shrink-0">
            <Icon name="download" class="w-5 h-5 text-primary" />
          </div>
        </div>
      </div>

      <!-- 底部标识 -->
      <div class="px-4 py-2 border-t border-gray-200 dark:border-gray-600">
        <div class="text-dark-400 dark:text-gray-400 text-xs flex items-center gap-1">
          <Icon name="file" class="w-4 h-4" />
          <span>MetaFile</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 无法识别的协议类型，显示为可点击链接 -->
  <div v-else class="protocol-card-fallback whitespace-pre-wrap break-all">
    <a 
      v-if="cardInfo.fullUrl"
      :href="cardInfo.fullUrl" 
      target="_blank" 
      rel="noopener noreferrer"
      class="url underline cursor-pointer"
      style="word-break: break-all;"
      @click.stop
    >{{ content }}</a>
    <span v-else>{{ content }}</span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { VideoPlay } from '@element-plus/icons-vue'
import ChatImage from '@/components/ChatImage/ChatImage.vue'
import UserAvatar from '@/components/UserAvatar/UserAvatar.vue'
import Icon from '@/components/Icon/Icon.vue'
import { formatTimestamp } from '@/utils/talk'
import { getUserInfoByAddress } from '@/api/man'
import { useRootStore } from '@/stores/root'
import { openAppBrowser } from '@/wallet-adapters/metalet'

// Props
const props = defineProps<{
  content: string // 消息内容（已解密）
  isMyMessage?: boolean
}>()

// Emits
const emit = defineEmits<{
  (e: 'click', info: CardInfo): void
}>()

const i18n = useI18n()
const rootStore = useRootStore()

// 卡片类型
type CardType = 'metaapp' | 'buzz' | 'note' | 'metafile' | 'none'

// 用户信息接口
interface UserInfo {
  name: string
  avatar: string
  metaid: string
}

// 卡片信息接口
interface CardInfo {
  shouldRender: boolean
  type: CardType
  pinId: string
  fullUrl: string
  clickUrl: string // 点击时打开的 URL
  // 通用字段
  title?: string
  content?: string
  creator?: string
  creatorInfo?: UserInfo
  timestamp?: number
  coverImg?: string
  // MetaApp 特有
  appName?: string
  version?: string
  icon?: string
  // Buzz/Note 特有
  firstImage?: string
  hasVideo?: boolean
  subtitle?: string
  // MetaFile 特有
  fileName?: string
  fileSize?: number
  fileType?: string
  fileExtension?: string
}

// 状态
const isLoading = ref(false)
const cardInfo = ref<CardInfo>({
  shouldRender: false,
  type: 'none',
  pinId: '',
  fullUrl: '',
  clickUrl: '',
})
const userInfoCache = ref<Record<string, UserInfo>>({})

// MetaWeb 基础 URL
const METAWEB_BASE_URL = 'https://www.metaweb.world/metaapp'
const METAFILE_API_BASE = 'https://file.metaid.io/metafile-indexer/api/v1/files'

// 协议正则
const URL_PATTERN = /(https?:\/\/[^\s]+)/gi
const METAFILE_PATTERN = /metafile:\/\/([a-f0-9]{64}i\d+)/gi
const METAAPP_PATTERN = /metaapp:\/\/([a-f0-9]{64}i\d+)/gi
const PIN_PATTERN = /([a-f0-9]{64}i\d+)/gi

// 检测是否有多个链接（不渲染）
const hasMultipleLinks = (content: string): boolean => {
  const urlMatches = content.match(URL_PATTERN) || []
  const metafileMatches = content.match(METAFILE_PATTERN) || []
  const metaappMatches = content.match(METAAPP_PATTERN) || []

  const totalLinks = urlMatches.length + metafileMatches.length + metaappMatches.length
  return totalLinks > 1
}

// 提取最后一个 PIN ID
const extractLastPinId = (content: string): string | null => {
  const matches = content.match(PIN_PATTERN)
  return matches && matches.length > 0 ? matches[matches.length - 1] : null
}

// 检测协议类型
const detectProtocolType = (
  content: string
): { type: 'url' | 'metafile' | 'metaapp' | 'none'; pinId: string | null; fullUrl: string } => {
  // 优先检测 metafile://
  const metafileMatch = content.match(/metafile:\/\/([a-f0-9]{64}i\d+)/i)
  if (metafileMatch) {
    return { type: 'metafile', pinId: metafileMatch[1], fullUrl: `metafile://${metafileMatch[1]}` }
  }

  // 检测 metaapp://
  const metaappMatch = content.match(/metaapp:\/\/([a-f0-9]{64}i\d+)/i)
  if (metaappMatch) {
    return {
      type: 'metaapp',
      pinId: metaappMatch[1],
      fullUrl: `${METAWEB_BASE_URL}/${metaappMatch[1]}/index.html`,
    }
  }

  // 检测 https:// URL
  const urlMatch = content.match(/(https?:\/\/[^\s]+)/i)
  if (urlMatch) {
    const pinId = extractLastPinId(urlMatch[1])
    return { type: 'url', pinId, fullUrl: urlMatch[1] }
  }

  return { type: 'none', pinId: null, fullUrl: '' }
}

// 获取 PIN 信息
const fetchPinInfo = async (pinId: string): Promise<any> => {
  try {
    const response = await fetch(`https://manapi.metaid.io/pin/${pinId}`)
    const result = await response.json()
    if (result.code === 1 && result.data) {
      return result.data
    }
  } catch (error) {
    console.error('Failed to fetch pin info:', error)
  }
  return null
}

// 获取 MetaFile 信息
const fetchMetaFileInfo = async (pinId: string): Promise<any> => {
  try {
    const response = await fetch(`${METAFILE_API_BASE}/${pinId}`)
    const result = await response.json()
    if (result.code === 0 && result.data) {
      return result.data
    }
  } catch (error) {
    console.error('Failed to fetch metafile info:', error)
  }
  return null
}

// 获取用户信息
const fetchUserInfo = async (address: string): Promise<UserInfo> => {
  if (userInfoCache.value[address]) {
    return userInfoCache.value[address]
  }

  try {
    const userInfo = await getUserInfoByAddress(address)
    const info: UserInfo = {
      name: userInfo.name || address.slice(0, 8),
      avatar: userInfo.avatar || '',
      metaid: userInfo.metaid || '',
    }
    userInfoCache.value[address] = info
    return info
  } catch (error) {
    const info: UserInfo = {
      name: address.slice(0, 8),
      avatar: '',
      metaid: '',
    }
    userInfoCache.value[address] = info
    return info
  }
}

// 判断附件是否为图片
const isImageAttachment = (attachment: string): boolean => {
  if (!attachment) return false
  const metafilePattern = /^metafile:\/\/[a-f0-9]+i0(\.(png|jpg|jpeg|gif|webp))?$/i
  return metafilePattern.test(attachment)
}

// 判断附件是否为视频
const isVideoAttachment = (attachment: string): boolean => {
  if (!attachment) return false
  const videoPattern = /^metafile:\/\/video\/[a-f0-9]+i0$/i
  return videoPattern.test(attachment)
}

// 解析卡片信息
const parseCardInfo = async () => {
  const content = props.content

  if (!content) {
    isLoading.value = false
    cardInfo.value = { shouldRender: false, type: 'none', pinId: '', fullUrl: '', clickUrl: '' }
    return
  }

  // 检查是否有多个链接
  if (hasMultipleLinks(content)) {
    isLoading.value = false
    cardInfo.value = { shouldRender: false, type: 'none', pinId: '', fullUrl: '', clickUrl: '' }
    return
  }

  // 检测协议类型
  const { type: protocolType, pinId, fullUrl } = detectProtocolType(content)

  if (!pinId) {
    isLoading.value = false
    cardInfo.value = { shouldRender: false, type: 'none', pinId: '', fullUrl: '', clickUrl: '' }
    return
  }

  // 开始加载
  isLoading.value = true

  // MetaFile 协议处理
  if (protocolType === 'metafile') {
    const fileInfo = await fetchMetaFileInfo(pinId)
    isLoading.value = false
    if (fileInfo) {
      const creatorInfo = fileInfo.creator_meta_id
        ? await fetchUserInfo(fileInfo.creator_address)
        : undefined
      cardInfo.value = {
        shouldRender: true,
        type: 'metafile',
        pinId,
        fullUrl,
        clickUrl: `${METAFILE_API_BASE}/content/${pinId}`,
        fileName: fileInfo.file_name,
        fileSize: fileInfo.file_size,
        fileType: fileInfo.file_type,
        fileExtension: fileInfo.file_extension,
        creator: fileInfo.creator_address,
        creatorInfo,
      }
    } else {
      // MetaFile fetch 失败，显示原始链接
      cardInfo.value = { shouldRender: false, type: 'none', pinId, fullUrl, clickUrl: fullUrl }
    }
    return
  }

  // MetaApp 协议处理（metaapp://）
  if (protocolType === 'metaapp') {
    const pinData = await fetchPinInfo(pinId)
    isLoading.value = false
    if (pinData) {
      let parsedSummary: any = null
      if (pinData.contentSummary) {
        try {
          parsedSummary = JSON.parse(pinData.contentSummary)
        } catch (e) {}
      }

      const creatorInfo = pinData.creator ? await fetchUserInfo(pinData.creator) : undefined

      cardInfo.value = {
        shouldRender: true,
        type: 'metaapp',
        pinId,
        fullUrl,
        clickUrl: fullUrl,
        title: parsedSummary?.title || 'MetaApp',
        appName: parsedSummary?.appName || '',
        version: parsedSummary?.version || '',
        icon: parsedSummary?.icon || '',
        coverImg: parsedSummary?.coverImg || '',
        creator: pinData.creator,
        creatorInfo,
      }
    } else {
      // MetaApp fetch 失败，显示原始链接
      cardInfo.value = { shouldRender: false, type: 'none', pinId, fullUrl, clickUrl: fullUrl }
    }
    return
  }

  // URL 协议处理（https://）
  if (protocolType === 'url') {
    const pinData = await fetchPinInfo(pinId)
    isLoading.value = false
    if (pinData) {
      let parsedSummary: any = null
      if (pinData.contentSummary) {
        try {
          parsedSummary = JSON.parse(pinData.contentSummary)
        } catch (e) {}
      }

      const creatorInfo = pinData.creator ? await fetchUserInfo(pinData.creator) : undefined
      const path = pinData.path || ''

      // 根据 path 判断类型
      if (path === '/protocols/metaapp') {
        cardInfo.value = {
          shouldRender: true,
          type: 'metaapp',
          pinId,
          fullUrl,
          clickUrl: fullUrl,
          title: parsedSummary?.title || 'MetaApp',
          appName: parsedSummary?.appName || '',
          version: parsedSummary?.version || '',
          icon: parsedSummary?.icon || '',
          coverImg: parsedSummary?.coverImg || '',
          creator: pinData.creator,
          creatorInfo,
        }
      } else if (path === '/protocols/simplebuzz') {
        const attachments = parsedSummary?.attachments || []
        const firstImage = attachments.find(isImageAttachment) || null
        const hasVideo = attachments.length > 0 && isVideoAttachment(attachments[0])

        cardInfo.value = {
          shouldRender: true,
          type: 'buzz',
          pinId,
          fullUrl,
          clickUrl: fullUrl,
          content: parsedSummary?.content || '',
          creator: pinData.creator,
          creatorInfo,
          timestamp: pinData.timestamp,
          firstImage,
          hasVideo,
        }
      } else if (path === '/protocols/simplenote') {
        let coverImg = parsedSummary?.coverImg || null
        if (!coverImg && parsedSummary?.attachments?.length > 0) {
          coverImg = parsedSummary.attachments.find(isImageAttachment) || null
        }

        cardInfo.value = {
          shouldRender: true,
          type: 'note',
          pinId,
          fullUrl,
          clickUrl: fullUrl,
          title: parsedSummary?.title || '',
          subtitle: parsedSummary?.subtitle || '',
          coverImg,
          creator: pinData.creator,
          creatorInfo,
          timestamp: pinData.timestamp,
        }
      } else {
        // 未知协议类型，保留 URL 以便 fallback 显示为链接
        cardInfo.value = { shouldRender: false, type: 'none', pinId, fullUrl, clickUrl: fullUrl }
      }
    } else {
      cardInfo.value = { shouldRender: false, type: 'none', pinId: '', fullUrl, clickUrl: '' }
    }
  }
}

// 格式化时间
const formatTime = (timestamp?: number): string => {
  if (!timestamp) return ''
  return formatTimestamp(timestamp * 1000, i18n)
}

// 格式化文件大小
const formatFileSize = (bytes?: number): string => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

// 获取文件图标
const getFileIcon = (extension?: string): string => {
  if (!extension) return 'file'
  const ext = extension.toLowerCase().replace('.', '')

  const iconMap: Record<string, string> = {
    pdf: 'file-pdf',
    doc: 'file-word',
    docx: 'file-word',
    xls: 'file-excel',
    xlsx: 'file-excel',
    ppt: 'file-ppt',
    pptx: 'file-ppt',
    zip: 'file-zip',
    rar: 'file-zip',
    '7z': 'file-zip',
    mp3: 'file-audio',
    wav: 'file-audio',
    mp4: 'file-video',
    avi: 'file-video',
    mov: 'file-video',
    png: 'file-image',
    jpg: 'file-image',
    jpeg: 'file-image',
    gif: 'file-image',
    webp: 'file-image',
    txt: 'file-text',
    md: 'file-text',
    json: 'file-code',
    js: 'file-code',
    ts: 'file-code',
    html: 'file-code',
    css: 'file-code',
  }

  return iconMap[ext] || 'file'
}

// 获取打开窗口的 target
const openWindowTarget = () => {
  if (rootStore.isWebView) {
    return '_self'
  } else if (window.innerWidth > 768) {
    return '_blank'
  }
  return '_self'
}

// 处理卡片点击
const handleCardClick = () => {
  const info = cardInfo.value
  if (!info.clickUrl) return

  emit('click', info)

  // MetaFile 类型直接触发下载
  if (info.type === 'metafile') {
    downloadFile(info.clickUrl, info.fileName || 'download')
    return
  }

  if (rootStore.isWebView) {
    openAppBrowser({ url: info.clickUrl })
    return
  }

  window.open(info.clickUrl, openWindowTarget())
}

// 下载文件
const downloadFile = (url: string, fileName: string) => {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// 监听内容变化
watch(
  () => props.content,
  () => {
    parseCardInfo()
  },
  { immediate: true }
)

onMounted(() => {
  parseCardInfo()
})

// 暴露给父组件
defineExpose({
  cardInfo,
  isLoading,
})
</script>

<style scoped>
/* 卡片样式 - 不设置 width，让卡片保持自然宽度以便父容器的 flex-row-reverse 能正确工作 */
</style>
