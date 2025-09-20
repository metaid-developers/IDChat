<template>
  <!-- Temporary: Use div with modal styling until Modal import issue is resolved -->
  <div
    v-if="isVisible"
    class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
    style="z-index: 3000;"
    @click.self="isVisible = false"
  >
    <div
      class="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-screen-sm lg:min-w-[456px] mx-4 shadow-lg dark:shadow-blue-100/30"
    >
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">
          {{ $t('Talk.Community.create_broadcast_channel') }}
        </h3>
        <button @click="isVisible = false" class="text-gray-500 hover:text-gray-700">
          <Icon name="close" class="w-5 h-5" />
        </button>
      </div>

      <div class="flex flex-col">
        <p class="mb-6 text-base text-dark-400 dark:text-gray-200 leading-relaxed text-center">
          {{ $t('Talk.Community.create_broadcast_channel_tip') }}
        </p>

        <ElForm :model="form" label-width="0">
          <!-- 频道名称输入框 -->
          <ElFormItem>
            <div class="form-item">
              <div class="label">{{ $t('Talk.Community.channel_name') }}</div>
              <ElInput
                v-model="form.channelName"
                type="text"
                :placeholder="$t('Talk.Community.channel_name')"
                maxlength="50"
              />
            </div>
          </ElFormItem>

          <!-- 频道描述文本框 -->
          <ElFormItem>
            <div class="form-item">
              <div class="label">{{ $t('Talk.Community.channel_description') }}</div>
              <ElInput
                v-model="form.channelNote"
                type="textarea"
                :rows="3"
                :placeholder="$t('Talk.Community.channel_description_placeholder')"
                maxlength="200"
                resize="none"
              />
            </div>
          </ElFormItem>

          <ElFormItem>
            <div class="operate flex flex-pack-end">
              <a
                class="main-border primary"
                :class="{ 'faded still': !canCreate }"
                @click="tryCreateBroadcastChannel"
              >
                <Icon name="arrow_right" />
              </a>
            </div>
          </ElFormItem>
        </ElForm>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, reactive } from 'vue'

import { useLayoutStore } from '@/stores/layout'
import { createBroadcastChannel } from '@/utils/talk'
import { realRandomString } from '@/utils/util'

import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { ElMessage, ElForm, ElFormItem, ElInput } from 'element-plus'
import { useSimpleTalkStore } from '@/stores/simple-talk'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['update:modelValue'])

// 表单数据
const form = reactive({
  channelName: '#Broadcast Chat',
  channelNote: '',
})

// 计算属性处理 v-model 双向绑定
const isVisible = computed({
  get() {
    return props.modelValue
  },
  set(value: boolean) {
    emit('update:modelValue', value)
  },
})

// 验证是否可以创建
const canCreate = computed(() => {
  return form.channelName.trim().length > 0
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
    form.channelName.trim(),
    '', // channelIcon 暂时为空
    form.channelNote.trim()
  )
  console.log('res', res)

  // 添加占位頻道
  if (res.status === 'success') {
    await simpleTalk.loadGroupChannels(simpleTalk.activeChannelId)
    ElMessage.success(`${i18n.t('create_broadcast_success')}`)
    // 重置表单
    form.channelName = '#Broadcast Chat'
    form.channelNote = ''
    // 关闭弹窗
    isVisible.value = false
  }

  layout.isShowLoading = false
}
</script>

<style lang="scss" scoped>
.el-form {
  margin-top: 20px;
}

.form-item {
  width: 100%;

  .label {
    font-size: 18px;
    margin-bottom: 8px;
  }
}

.operate {
  width: 100%;
  margin-top: 20px;

  a {
    padding: 20px;
    cursor: pointer;
    background: var(--el-color-primary);
    transition: all 0.2s ease;

    &.faded {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .icon {
      width: 24px;
      height: 24px;
      font-weight: bold;

      :deep(use) {
        stroke: #000;
        stroke-width: var(--standard-border-width);
      }
    }
  }
}
</style>
