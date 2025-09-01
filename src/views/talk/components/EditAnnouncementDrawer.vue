<template>
  <ElDrawer
    :model-value="modelValue"
    :show-close="false"
    :with-header="false"
    :size="'360px'"
    :append-to-body="true"
    :lock-scroll="true"
    :close-on-click-modal="false"
    custom-class="none-padding"
  >
    <div class="flex flex-col h-full">
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <a class="back" @click="emit('update:modelValue', false)">
            <Icon name="down" />
          </a>
          <span class="title truncate max-w-6xl">{{ $t('Talk.Channel.edit_announcement') }}</span>
        </div>
        <!-- <a class="save-btn" @click="saveAnnouncement" :disabled="saving">
          {{ saving ? $t('Common.saving') : $t('Common.save') }}
        </a> -->
      </header>

      <div class="flex flex-col flex-1 bg-dark-100 dark:bg-gray-800 overflow-hidden p-4">
        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-800 dark:text-gray-100 mb-2">
            {{ $t('Talk.Channel.announcement') }}
          </label>
          <el-input
            v-model="announcementText"
            type="textarea"
            :rows="6"
            :placeholder="$t('Talk.Channel.announcement_placeholder')"
            :maxlength="500"
            show-word-limit
            resize="none"
          />
        </div>

        <!-- <div class="text-xs text-dark-400 dark:text-gray-500">
          {{ $t('Talk.Channel.announcement_tip') }}
        </div> -->

        <div
          class="flex w-full justify-center items-center mt-auto py-4"
          :class="['main-border', hasChanges && !saving ? 'primary' : '']"
          @click="saveAnnouncement"
          :disabled="saving"
        >
          <div name="arrow_right" class="cursor-pointer hover:text-gray-700 ">
            {{ $t('Done') }}
          </div>
        </div>
      </div>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, withDefaults } from 'vue'
import { ElMessage } from 'element-plus'
import { SimpleGroup, updateGroupChannel } from '@/utils/talk'

interface ChannelInfo {
  groupId: string
  roomNote?: string
  [key: string]: unknown
}

interface Props {
  modelValue: boolean
  channelInfo?: ChannelInfo | null
}

const props = withDefaults(defineProps<Props>(), {
  channelInfo: null,
})

const emit = defineEmits(['update:modelValue', 'updated'])

const announcementText = ref('')
const saving = ref(false)

// 监听 channelInfo 变化，初始化公告内容
watch(
  () => props.channelInfo,
  newChannelInfo => {
    if (newChannelInfo) {
      announcementText.value = newChannelInfo.roomNote || ''
    }
  },
  { immediate: true }
)

// 监听 modelValue 变化，重置内容
watch(
  () => props.modelValue,
  newValue => {
    if (newValue && props.channelInfo) {
      announcementText.value = props.channelInfo.roomNote || ''
    }
  }
)
const hasChanges = ref(false)

watch(
  () => announcementText.value,
  newValue => {
    hasChanges.value = newValue !== (props.channelInfo?.roomNote || '')
  }
)

const saveAnnouncement = async () => {
  if (!props.channelInfo) return

  saving.value = true
  try {
    const group: SimpleGroup = {
      groupId: props.channelInfo.groupId,
      groupIcon: props.channelInfo.roomIcon || '',
      communityId: props.channelInfo.communityId || '',
      groupName: props.channelInfo.roomName || '',
      groupNote: announcementText.value.trim(),
      timestamp: Date.now(),
      groupType: props.channelInfo.roomType,
      status: props.channelInfo.roomStatus,
      type: props.channelInfo.roomType,
      tickId: props.channelInfo.tickId || '',
      collectionId: props.channelInfo.collectionId || '',
      limitAmount: props.channelInfo.limitAmount || 0,
      chatSettingType: props.channelInfo.chatSettingType,
      deleteStatus: props.channelInfo.deleteStatus,
    }
    // 模拟 API 调用 - 实际项目中需要实现真正的 API
    const ret = await updateGroupChannel(group, { groupNote: announcementText.value.trim() })

    ElMessage.success('Success')
    emit('updated', announcementText.value.trim())
    emit('update:modelValue', false)
  } catch (error) {
    console.error('更新公告失败:', error)
    ElMessage.error(error.message)
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
header {
  height: var(--header-height);
  padding: 0 18px;
  position: relative;
  border-bottom: 1px solid var(--divid-color);
  box-sizing: border-box;
  width: 100%;
  overflow: hidden;

  .back {
    width: 24px;
    height: 24px;
    text-align: center;
    line-height: 24px;
    position: relative;
    z-index: 2;
    cursor: pointer;

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

  .save-btn {
    padding: 8px 16px;
    background: var(--themeBtnBgColor);
    color: var(--themeBtnTextColor);
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    text-decoration: none;
    transition: all 0.2s;

    &:hover {
      background: var(--themeBtnBgHoverColor);
    }

    &:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  }
}

:deep(.el-textarea__inner) {
  background: var(--bg-color);
  border-color: var(--divid-color);
  color: var(--themeTextColor);
}

:deep(.el-textarea__inner:focus) {
  border-color: var(--themeBtnBgColor);
}
</style>
