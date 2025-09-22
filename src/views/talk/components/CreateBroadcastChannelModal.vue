<template>
  <ElDialog
    :modelValue="modelValue"
    @close="emit('update:modelValue', false)"
    :closeOnClickModal="false"
    class="profile-edit-dialog none-header"
    :width="'500px'"
  >
    <div class="profile-edit-modal py-8">
      <a
        class="close flex flex-align-center flex-pack-center"
        @click="emit('update:modelValue', false)"
      >
        <Icon name="x_mark" />
      </a>
      <div class="title">{{ $t('Talk.Community.create_broadcast_channel') }}</div>

      <div class="profile-edit-modal">
        <p class="description text-center text-gray-500 mb-6">
          {{ $t('Talk.Community.create_broadcast_channel_tip') }}
        </p>

        <div class="username-section mb-6 mt-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Channel Name
          </label>
          <input
            v-model="username"
            type="text"
            :placeholder="$t('ProfileEditModal.usernamePlaceholder')"
            class=" main-border w-full text-base px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div class="username-section mb-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <input
            v-model="profile"
            type="text"
            :placeholder="$t('ProfileEditModal.profilePlaceholder')"
            class="main-border  w-full text-base  px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div class="flex justify-end">
          <div
            :class="['main-border', hasChanges && !loading ? 'primary' : '']"
            @click="tryCreateBroadcastChannel"
            :disabled="loading"
          >
            <Icon
              v-if="!loading"
              name="arrow_right"
              class="cursor-pointer hover:text-gray-700 w-8 h-8"
            />
            <div v-else class="loading-spinner w-8 h-8">
              <div class="spinner"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, nextTick, watch } from 'vue'

import { useLayoutStore } from '@/stores/layout'
import { createBroadcastChannel } from '@/utils/talk'
import { realRandomString } from '@/utils/util'

import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElForm, ElFormItem, ElInput } from 'element-plus'
import { useSimpleTalkStore } from '@/stores/simple-talk'
const username = ref<string>('#Broadcast Chat')
const profile = ref<string>('')
interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])
const loading = ref(false)

const hasChanges = computed(() => {
  return username.value.trim().length > 0 || profile.value.trim().length > 0
})

// 验证是否可以创建
const canCreate = computed(() => {
  return username.value.trim().length > 0
})

const router = useRouter()
const route = useRoute()
const i18n = useI18n()
const layout = useLayoutStore()
const simpleTalk = useSimpleTalkStore()

const tryCreateBroadcastChannel = async () => {
  if (!canCreate.value) return

  layout.isShowLoading = true
  const subscribeId = realRandomString(32)
  const groupId = route.params.channelId as string
  const res = await createBroadcastChannel(
    groupId,
    '', // channelId 为空，让系统自动生成
    username.value.trim(),
    '', // channelIcon 暂时为空
    profile.value.trim()
  )
  console.log('res', res)

  // 添加占位頻道
  if (res.status === 'success') {
    await simpleTalk.loadGroupChannels(simpleTalk.activeChannelId)
    ElMessage.success(`${i18n.t('create_broadcast_success')}`)
    // 重置表单
    username.value = '#Broadcast Chat'
    profile.value = ''
    // 关闭弹窗
    emit('update:modelValue', false)
  }

  layout.isShowLoading = false
}
</script>

<style lang="scss" scoped>
.close {
  position: absolute;
  left: 50%;
  bottom: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--themeBgSecondColor);
  cursor: pointer;
  margin-left: -17px;
  margin-bottom: -70px;

  .icon {
    width: 12px;
    height: 12px;
    transition: all 0.5s;
  }

  &:hover {
    .icon {
      transform: rotate(180deg);
    }
  }
}
.title {
  font-size: 24px;
  font-weight: 600;
  color: var(--themeTextColor);
  margin-bottom: 16px;
  text-align: center;
}

.description {
  font-size: 16px;
  line-height: 1.5;
  color: var(--themeTextSecondColor);
  margin-bottom: 24px;
  text-align: left;
}
</style>
