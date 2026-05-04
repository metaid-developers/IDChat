<template>
  <el-popover
    placement="bottom-start"
    trigger="click"
    :width="260"
    :teleported="true"
  >
    <template #reference>
      <slot name="reference"></slot>
    </template>

    <div class="flex flex-col gap-3">
      <div class="flex items-center gap-3">
        <UserAvatar
          :image="userAvatar"
          :meta-id="metaId"
          :name="displayName"
          :meta-name="''"
          class="w-10 h-10 shrink-0 select-none"
          :disabled="true"
        />
        <div class="min-w-0">
          <UserName
            :name="displayName"
            :meta-name="''"
            :text-class="'text-sm font-medium max-w-[140px]'"
          />
          <div class="flex items-center gap-1 text-xs text-dark-300 dark:text-gray-400 mt-1">
            <span class="truncate max-w-[140px]" :title="metaId">MetaID: {{ metaId }}</span>
            <el-tooltip content="复制" placement="top">
              <button
                class="p-1 rounded hover:bg-dark-200 dark:hover:bg-gray-700"
                @click="copyMetaId"
              >
                <el-icon><CopyDocument /></el-icon>
              </button>
            </el-tooltip>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          class="main-border primary py-2 text-xs"
          @click="toPrivateChat"
        >
          {{ $t('Talk.Channel.SendMessage') }}
        </button>
        <button
          class="main-border py-2 text-xs"
          @click="openShowNowHome"
        >
          查看 shownow 主页
        </button>
      </div>

      <div class="flex items-center gap-3" v-if="canManageMember">
        <el-tooltip content="拉黑并移除" placement="top">
          <button
            class="p-2 rounded hover:bg-dark-200 dark:hover:bg-gray-700 text-[#f56c6c]"
            @click="handleBlockRemove"
          >
            <Icon name="block_list" class="w-4 h-4" />
          </button>
        </el-tooltip>
        <el-tooltip content="禁言" placement="top">
          <button
            class="p-2 rounded hover:bg-dark-200 dark:hover:bg-gray-700 text-[#e6a23c]"
            @click="handleMute"
          >
            <Icon name="speaker" class="w-4 h-4" />
          </button>
        </el-tooltip>
        <el-tooltip content="移除" placement="top">
          <button
            class="p-2 rounded hover:bg-dark-200 dark:hover:bg-gray-700 text-red-500"
            @click="handleRemove"
          >
            <el-icon><Remove /></el-icon>
          </button>
        </el-tooltip>
      </div>
    </div>
  </el-popover>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage } from 'element-plus'
import { CopyDocument, Remove } from '@element-plus/icons-vue'
import { ChatChain } from '@/enum'
import { useChainStore } from '@/stores/chain'
import { useUserStore } from '@/stores/user'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { createPinWithBtc } from '@/utils/pin'
import { createPin } from '@/utils/userInfo'
import { VITE_ADDRESS_HOST, VITE_SHOW_NOW_HOST } from '@/config/app-config'
import { getUserInfoByAddress, getUserInfoByMetaId } from '@/api/man'
import { copy } from '@/utils/util'
import type { UnifiedChatMessage } from '@/@types/simple-chat'

interface Props {
  message: UnifiedChatMessage
  groupId: string
}

const props = defineProps<Props>()

const router = useRouter()
const i18n = useI18n()
const chainStore = useChainStore()
const userStore = useUserStore()
const simpleTalk = useSimpleTalkStore()

const userInfo = computed(() => props.message.userInfo || {})
const metaId = computed(() => userInfo.value?.metaid || props.message.metaId || '')
const globalMetaId = computed(
  () => props.message.globalMetaId || userInfo.value?.globalMetaId || ''
)
const address = computed(() => userInfo.value?.address || props.message.address || '')
const displayName = computed(
  () => userInfo.value?.name || (metaId.value ? metaId.value.slice(0, 6) : '')
)
const userAvatar = computed(() => userInfo.value?.avatar || '')

const currentUserIds = computed(() => {
  return new Set(
    [simpleTalk.selfMetaId, userStore.last?.metaid, userStore.last?.globalMetaId]
      .filter(Boolean)
      .map(id => String(id))
  )
})
const currentUserAddress = computed(() => userStore.last?.address || simpleTalk.selfAddress)

const isCurrentUser = computed(() => {
  const memberIds = [metaId.value, globalMetaId.value]
    .filter(Boolean)
    .map(id => String(id))

  if (memberIds.some(id => currentUserIds.value.has(id))) {
    return true
  }

  const memberAddress = address.value
  if (currentUserAddress.value && memberAddress) {
    return currentUserAddress.value === memberAddress
  }

  return false
})

const selfPermission = computed(() => {
  if (!props.groupId) {
    return { isCreator: false, isAdmin: false }
  }
  return simpleTalk.getCurrentUserRoleInGroup(props.groupId)
})

const canManageMember = computed(() => {
  return !isCurrentUser.value && (selfPermission.value.isCreator || selfPermission.value.isAdmin)
})

const copyMetaId = async () => {
  if (!metaId.value) return
  await copy(metaId.value)
}

const openShowNowHome = () => {
  if (!metaId.value) return
  const base = VITE_SHOW_NOW_HOST() || import.meta.env.VITE_SHOW_NOW_HOST || ''
  if (!base) return
  const url = `${base.replace(/\/$/, '')}/u/${encodeURIComponent(metaId.value)}`
  window.open(url, '_blank')
}

const toPrivateChat = async () => {
  if (!userStore.last?.chatpubkey) {
    return ElMessage.error(`${i18n.t('self_private_chat_unsupport')}`)
  }

  let targetGlobalMetaId = globalMetaId.value

  if (!targetGlobalMetaId) {
    try {
      if (address.value) {
        const info = await getUserInfoByAddress(address.value)
        targetGlobalMetaId = info?.globalMetaId
      } else if (metaId.value) {
        const info = await getUserInfoByMetaId(metaId.value)
        targetGlobalMetaId = info?.globalMetaId
      }
    } catch (e) {
      console.warn('获取 globalMetaId 失败:', e)
    }
  }

  if (!targetGlobalMetaId) return
  router.push({
    name: 'talkAtMe',
    params: {
      channelId: targetGlobalMetaId,
    },
  })
  simpleTalk.setActiveChannel(targetGlobalMetaId)
}

const createProtocolPin = async (protocolPath: string, body: Record<string, unknown>) => {
  const metaidData = {
    body: JSON.stringify(body),
    path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocolPath}`,
    flag: 'metaid',
    version: '1.0.0',
    operation: 'create',
    contentType: 'application/json',
    encryption: '0',
    encoding: 'utf-8',
  }

  const currentChain = chainStore.state.currentChain
  const chainData = chainStore.state[currentChain]
  const selectedFeeType = chainData.selectedFeeType
  const feeRate = chainData[selectedFeeType]

  if (currentChain === ChatChain.btc) {
    await createPinWithBtc({
      inscribeDataArray: [metaidData],
      options: {
        network: 'mainnet',
        noBroadcast: 'no',
        feeRate: feeRate,
      },
    })
    return
  }

  await createPin(metaidData, {
    network: 'mainnet',
    signMessage: 'update Group Info',
    serialAction: 'finish',
    feeRate: feeRate,
  })
}

const refreshPermissions = async () => {
  if (!props.groupId) return
  await simpleTalk.getGroupMemberPermissions(props.groupId, true)
}

const handleRemove = async () => {
  if (!metaId.value || !props.groupId) {
    return ElMessage.error('remove failed')
  }

  try {
    const data = {
      removeMetaid: metaId.value,
      groupId: props.groupId,
      reason: '',
      timestamp: Math.floor(Date.now() / 1000),
    }
    await createProtocolPin('simplegroupremoveuser', data)
    ElMessage.success('delete success')
    await refreshPermissions()
  } catch (error) {
    ElMessage.error((error as any).message || 'delete failed')
  }
}

const handleBlockRemove = async () => {
  const hasPermission = selfPermission.value.isCreator || selfPermission.value.isAdmin
  if (!hasPermission) {
    return ElMessage.error(`${i18n.t('Non_permission_set Blocklist')}`)
  }

  if (!metaId.value || !props.groupId) {
    return ElMessage.error('block failed')
  }

  try {
    const removeData = {
      removeMetaid: metaId.value,
      groupId: props.groupId,
      reason: '',
      timestamp: Math.floor(Date.now() / 1000),
    }
    await createProtocolPin('simplegroupremoveuser', removeData)

    const blockData = {
      groupId: props.groupId,
      users: [metaId.value],
    }
    await createProtocolPin('simplegroupjoinblock', blockData)

    ElMessage.success('block success')
    await refreshPermissions()
  } catch (error) {
    ElMessage.error((error as any).message || 'block failed')
  }
}

const handleMute = async () => {
  const hasPermission = selfPermission.value.isCreator || selfPermission.value.isAdmin
  if (!hasPermission) {
    return ElMessage.error(`${i18n.t('Non_permission_set Blocklist')}`)
  }

  if (!metaId.value || !props.groupId) {
    return ElMessage.error('mute failed')
  }

  try {
    const muteData = {
      groupId: props.groupId,
      users: [metaId.value],
    }
    await createProtocolPin('simplegroupblock', muteData)

    ElMessage.success('mute success')
    await refreshPermissions()
  } catch (error) {
    ElMessage.error((error as any).message || 'mute failed')
  }
}
</script>
