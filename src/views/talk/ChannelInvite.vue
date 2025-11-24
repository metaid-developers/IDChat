<template>
  <div
    class="channel-invite-container flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900"
  >
    <div class="invite-card bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-md w-full">
      <div v-if="loading" class="text-center">
        <el-icon class="is-loading" :size="40"><Loading /></el-icon>
        <p class="mt-4 text-gray-600 dark:text-gray-300">
          {{ t('Talk.Channel.processing_invite') }}
        </p>
      </div>

      <div v-else-if="error" class="text-center">
        <el-icon :size="60" color="#f56c6c"><CircleClose /></el-icon>
        <h2 class="mt-4 text-xl font-bold text-red-500">{{ t('Talk.Channel.invite_error') }}</h2>
        <p class="mt-2 text-gray-600 dark:text-gray-300">{{ error }}</p>
        <el-button type="primary" class="mt-6" @click="goToHome">
          {{ t('Talk.Channel.back_to_home') }}
        </el-button>
      </div>

      <div v-else-if="success" class="text-center">
        <el-icon :size="60" color="#67c23a"><SuccessFilled /></el-icon>
        <h2 class="mt-4 text-xl font-bold text-green-500">
          {{ t('Talk.Channel.invite_success') }}
        </h2>
        <p class="mt-2 text-gray-600 dark:text-gray-300">{{ successMessage }}</p>
        <el-button type="primary" class="mt-6" @click="goToChannel">
          {{ t('Talk.Channel.enter_channel') }}
        </el-button>
      </div>

      <div v-else-if="groupInfo" class="text-center">
        <ChatIcon
          :src="groupInfo.avatar || ''"
          :alt="groupInfo.name"
          customClass="w-24 h-24 mx-auto rounded-full"
          :size="96"
        />
        <h2 class="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-100">
          {{ groupInfo.name }}
        </h2>
        <p class="mt-2 text-gray-600 dark:text-gray-300">
          {{ groupInfo.userCount }} {{ t('Talk.Channel.members') }}
        </p>
        <p v-if="groupInfo.roomNote" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {{ groupInfo.roomNote }}
        </p>

        <div v-if="isPrivateGroup" class="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p class="text-sm text-yellow-800 dark:text-yellow-300">
            {{ t('Talk.Channel.private_group_notice') }}
          </p>
        </div>

        <el-button
          type="primary"
          size="large"
          class="mt-6 w-full"
          @click="handleJoinGroup"
          :disabled="joining"
        >
          <el-icon v-if="joining" class="is-loading mr-2"><Loading /></el-icon>
          {{ isMember ? t('Talk.Channel.enter_channel') : t('Talk.Channel.join_group') }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Loading, CircleClose, SuccessFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useUserStore } from '@/stores/user'
import { joinChannel } from '@/utils/talk'
import { getGroupJoinControlList, getOneChannel } from '@/api/talk'
import { getUserInfoByMetaId } from '@/api/man'
import { ecdhDecrypt } from '@/utils/crypto'
import type { SimpleChannel } from '@/@types/simple-chat.d'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const simpleTalkStore = useSimpleTalkStore()
const userStore = useUserStore()

const loading = ref(true)
const joining = ref(false)
const error = ref('')
const success = ref(false)
const successMessage = ref('')
const groupInfo = ref<SimpleChannel | null>(null)
const isMember = ref(false)
const decryptedPasswordKey = ref('')

const groupType = computed(() => route.params.groupType as 'public' | 'private')
const groupId = computed(() => route.params.groupId as string)
const passcode = computed(() => route.query.passcode as string | undefined)
const fromMetaId = computed(() => route.query.from as string | undefined)
const isPrivateGroup = computed(() => groupType.value === 'private')

onMounted(async () => {
  try {
    // 检查用户是否登录
    if (!userStore.isAuthorized) {
      error.value = t('Talk.Channel.please_login_first')
      loading.value = false
      return
    }

    // 验证 groupId 格式
    if (!groupId.value || !groupId.value.match(/^[a-fA-F0-9]{64}i0$/)) {
      error.value = t('Talk.Channel.invalid_invite_link')
      loading.value = false
      return
    }

    // 私密群聊需要 passcode 和 fromMetaId
    if (isPrivateGroup.value && (!passcode.value || !fromMetaId.value)) {
      error.value = t('Talk.Channel.private_group_requires_passcode')
      loading.value = false
      return
    }

    // 确保 store 已初始化
    await simpleTalkStore.autoInit()

    // 获取群聊信息
    const channel = simpleTalkStore.channels.find(ch => ch.id === groupId.value)

    if (channel) {
      // 用户已经在群中
      groupInfo.value = channel
      isMember.value = true
      loading.value = false
    } else {
      // 用户不在群中，获取群聊信息
      try {
        const channelData = await getOneChannel(groupId.value)
        groupInfo.value = {
          id: groupId.value,
          type: 'group',
          name: channelData.roomName || t('Talk.Channel.unknown_group'),
          avatar: channelData.roomAvatarUrl,
          createdBy: channelData.createUserMetaId || '',
          createdAt: Date.now(),
          unreadCount: 0,
          roomJoinType: isPrivateGroup.value ? '100' : '1',
          userCount: channelData.userCount,
          roomNote: channelData.roomNote,
        }
      } catch (err) {
        console.error('获取群聊信息失败:', err)
        // 如果 API 失败，创建一个临时群聊信息对象
        groupInfo.value = {
          id: groupId.value,
          type: 'group',
          name: t('Talk.Channel.unknown_group'),
          createdBy: '',
          createdAt: Date.now(),
          unreadCount: 0,
          roomJoinType: isPrivateGroup.value ? '100' : '1',
        }
      }

      isMember.value = false
      loading.value = false
    }
  } catch (err) {
    console.error('处理邀请链接失败:', err)
    error.value = t('Talk.Channel.invite_processing_failed')
    loading.value = false
  }
})

// 处理加群
const handleJoinGroup = async () => {
  // 如果是公开群聊且已经是成员，直接跳转
  if (isMember.value && !isPrivateGroup.value) {
    goToChannel()
    return
  }

  // 私密群聊即使已经是成员也需要处理（可能需要更新 passwordKey）
  joining.value = true
  try {
    // 1. 检查白名单（私密群聊必须检查）
    if (isPrivateGroup.value) {
      console.log('🔍 检查白名单...')
      const controlListRes = await getGroupJoinControlList({ groupId: groupId.value })

      if (controlListRes.code !== 0) {
        throw new Error(t('Talk.Channel.whitelist_check_failed'))
      }

      const whitelist = controlListRes.data.joinWhitelistMetaIds || []
      const currentUserMetaId = userStore.last?.metaid

      if (!whitelist.includes(currentUserMetaId)) {
        // 不在白名单中，不允许加群
        error.value = t('Talk.Channel.not_in_whitelist')
        joining.value = false
        return
      }

      console.log('✅ 白名单检查通过')
    }

    // 2. 解密 passcode（私密群聊）
    if (isPrivateGroup.value && passcode.value && fromMetaId.value) {
      console.log('🔓 解密 passcode...')
      try {
        // 获取发送者的公钥
        const senderInfo = await getUserInfoByMetaId(fromMetaId.value)
        if (!senderInfo.chatpubkey) {
          throw new Error(t('Talk.Channel.sender_pubkey_not_found'))
        }

        console.log('🔑 发送者公钥:', senderInfo.chatpubkey.slice(0, 16) + '...')

        // 使用 ECDH 协商密钥
        const ecdhResult = await window.metaidwallet.common.ecdh({
          externalPubKey: senderInfo.chatpubkey,
        })
        const sharedSecret = ecdhResult.sharedSecret

        console.log('🔑 共享密钥生成成功:', sharedSecret.slice(0, 16) + '...')

        // URL 解码 passcode
        const decodedPasscode = decodeURIComponent(passcode.value)

        // 使用 AES 解密 passcode 得到 passwordKey
        decryptedPasswordKey.value = ecdhDecrypt(decodedPasscode, sharedSecret)

        if (!decryptedPasswordKey.value) {
          throw new Error(t('Talk.Channel.passcode_decrypt_failed'))
        }

        console.log('🔓 Passcode 解密成功',decryptedPasswordKey.value)
      } catch (decryptError) {
        console.error('❌ 解密失败:', decryptError)
        throw new Error(t('Talk.Channel.passcode_decrypt_failed') + ': ' + (decryptError as Error).message)
      }
    }

    // 3. 调用加群 API（私密群聊总是调用，公开群聊仅新成员调用）
    if (!isMember.value || isPrivateGroup.value) {
      console.log('📤 调用加群 API...')
      const joinResult = await joinChannel(groupId.value, '', passcode.value || '')

      if (joinResult.status === 'failed') {
        throw new Error(t('Talk.Channel.join_group_api_failed'))
      }

      console.log('✅ 加群 API 调用成功')
    }

    // 4. 更新或创建本地频道记录
    const passwordKey = decryptedPasswordKey.value || groupId.value.substring(0, 16)

    if (isMember.value && isPrivateGroup.value) {
      // 已是成员，更新 passwordKey
      const existingChannel = simpleTalkStore.channels.find(ch => ch.id === groupId.value)
      if (existingChannel) {
        existingChannel.passwordKey = passwordKey
        await simpleTalkStore.db.saveChannel(existingChannel)
        console.log('💾 私密群聊 passwordKey 已更新', passwordKey)
      } else {
        // 频道不在本地列表中,创建频道记录
        const newChannel: SimpleChannel = {
          id: groupId.value,
          type: 'group',
          name: groupInfo.value?.name || t('Talk.Channel.unknown_group'),
          avatar: groupInfo.value?.avatar,
          createdBy: groupInfo.value?.createdBy || '',
          createdAt: Date.now(),
          unreadCount: 0,
          roomJoinType: '100',
          passwordKey,
          userCount: groupInfo.value?.userCount,
          roomNote: groupInfo.value?.roomNote,
        }

        await simpleTalkStore.db.saveChannel(newChannel)
        simpleTalkStore.channels.push(newChannel)
        console.log('💾 已是成员但频道不在本地，已创建频道记录', passwordKey)
      }
    } else {
      // 新成员，创建频道记录
      const newChannel: SimpleChannel = {
        id: groupId.value,
        type: 'group',
        name: groupInfo.value?.name || t('talk.unknown_group'),
        avatar: groupInfo.value?.avatar,
        createdBy: groupInfo.value?.createdBy || '',
        createdAt: Date.now(),
        unreadCount: 0,
        roomJoinType: isPrivateGroup.value ? '100' : '1',
        passwordKey,
        userCount: groupInfo.value?.userCount,
        roomNote: groupInfo.value?.roomNote,
      }

      await simpleTalkStore.db.saveChannel(newChannel)
      simpleTalkStore.channels.push(newChannel)
      console.log('💾 本地频道记录已创建')
    }

    console.log('💾 本地数据保存成功')

    success.value = true
    successMessage.value = isMember.value
      ? t('Talk.Channel.password_key_updated')
      : t('Talk.Channel.join_group_success')

    // 2秒后自动跳转
    setTimeout(() => {
      goToChannel()
    }, 2000)
  } catch (err) {
    console.error('❌ 加群失败:', err)
    const errorMessage = (err as Error).message || t('Talk.Channel.join_group_failed')
    ElMessage.error(errorMessage)
    error.value = errorMessage
  } finally {
    joining.value = false
  }
}

// 跳转到群聊
const goToChannel = () => {
  router.push({
    name: 'talkChannel',
    params: {
      communityId: 'public',
      channelId: groupId.value,
    },
  })
}

// 返回首页
const goToHome = () => {
  router.push({
    name: 'talkChannel',
    params: {
      communityId: 'public',
      channelId: 'welcome',
    },
  })
}
</script>

<style scoped>
.channel-invite-container {
  padding: 20px;
}

.invite-card {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
