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
          <span class="title truncate max-w-6xl">{{ $t('Cancel') }}</span>
        </div>
      </header>

      <div class="flex flex-col flex-1 bg-dark-100 dark:bg-gray-800 overflow-hidden p-4">
        <!-- 群头像编辑 -->

        <div class="avatar-section mb-6">
          <div class="rounded-full flex items-center justify-center space-x-4">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
            >
              <div v-if="!imageUrl">
                <ChatIcon
                  :src="channelAvatar || ''"
                  :alt="channelName"
                  customClass="w-[88px] h-[88px] rounded-full"
                  :size="88"
                />
              </div>

              <!-- <img class="avatar-preview" :src="currentAvatar" v-if="!imageUrl" /> -->
              <img
                v-if="imageUrl"
                :src="imageUrl"
                class="avatar-preview w-[80px] h-[80px] rounded-full"
                alt="Avatar Preview"
              />
              <el-button class="upload-button" :icon="Camera" circle />
            </el-upload>
          </div>
        </div>
        <div class="block text-sm font-medium text-dark-800 dark:text-gray-100 mb-2 text-center">
          {{ $t('Talk.Channel.SetNewPhoto') }}
        </div>
        <!-- 群名称编辑 -->
        <div class="mb-6">
          <el-input
            v-model="channelName"
            :placeholder="$t('Talk.Channel.channel_name_placeholder')"
            :maxlength="50"
            show-word-limit
            clearable
          />
        </div>
      </div>
      <div
        class="flex  justify-center items-center mt-auto py-4 mx-4 mb-4"
        :class="['main-border', hasChanges && !saving ? 'primary' : '']"
        @click="saveChannelInfo"
        :disabled="saving"
      >
        <div name="arrow_right" class="cursor-pointer hover:text-gray-700 ">
          {{ $t('Done') }}
        </div>
      </div>
    </div>
  </ElDrawer>
</template>

<script setup lang="ts">
import { ref, watch, defineProps, defineEmits, withDefaults, computed } from 'vue'
import { ElMessage, UploadProps } from 'element-plus'
import { Camera, Search } from '@element-plus/icons-vue'
import { image2Attach } from '@/lib/file'
import { useChainStore } from '@/stores/chain'
import { createPinWithBtc } from '@/utils/pin'
import { createPin } from '@/utils/userInfo'
import { SimpleGroup, updateGroupChannel } from '@/utils/talk'
import { SimpleChannel } from '@/@types/simple-chat.d'
import { getOneChannel } from '@/api/talk'

interface ChannelInfo {
  groupId: string
  roomName?: string
  roomAvatarUrl?: string
  [key: string]: unknown
}

interface Props {
  modelValue: boolean
  channelInfo?: SimpleChannel | null
}

const props = withDefaults(defineProps<Props>(), {
  channelInfo: null,
})

const emit = defineEmits(['update:modelValue', 'updated'])

const chainStore = useChainStore()

const channelName = ref('')
const channelAvatar = ref('')
const avatarFile = ref<File | null>(null)
const avatarPreview = ref('')
const saving = ref(false)
const avatarUploader = ref<HTMLInputElement | null>(null)

const imageUrl = ref('')
const currentAvatar = ref<string>()
const imgRaw = ref<File | null>(null)

const hasChanges = computed(() => {
  if (!props.channelInfo) return false
  return channelName.value.trim() !== (props.channelInfo.name || '') || !!imageUrl.value
})

// 监听 channelInfo 变化，初始化内容
watch(
  () => props.channelInfo,
  newChannelInfo => {
    if (newChannelInfo) {
      channelName.value = newChannelInfo.name || ''
      channelAvatar.value = newChannelInfo.avatar || ''
      avatarPreview.value = ''
      avatarFile.value = null
    }
  },
  { immediate: true }
)

// 监听 modelValue 变化，重置内容
watch(
  () => props.modelValue,
  newValue => {
    if (newValue && props.channelInfo) {
      channelName.value = props.channelInfo.name || ''
      channelAvatar.value = props.channelInfo.avatar || ''
      avatarPreview.value = ''
      avatarFile.value = null
    }
  }
)

const getBase64 = (img: File, callback: (url: string) => void) => {
  const reader = new FileReader()
  // eslint-disable-next-line node/no-callback-literal
  reader.addEventListener('load', () => callback(reader.result as string))
  reader.readAsDataURL(img)
}

const beforeAvatarUpload: UploadProps['beforeUpload'] = async rawFile => {
  if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png') {
    ElMessage.error('Avatar picture must be JPG or PNG format!')
    return false
  }

  try {
    // 压缩图片
    getBase64(rawFile, url => {
      imageUrl.value = url
    })
    imgRaw.value = rawFile as File
    return false
  } catch (error) {
    ElMessage.error('Failed to compress image. Please try another image.')
    return false
  }
}

// 保存频道信息
const saveChannelInfo = async () => {
  if (!props.channelInfo) return

  // 验证群名称
  if (!channelName.value.trim()) {
    ElMessage.error('请输入群名称')
    return
  }

  saving.value = true
  try {
    // 模拟 API 调用 - 实际项目中需要实现真正的 API
    const values: any = {}
    if (imgRaw.value) {
      const [image] = await image2Attach(([imgRaw.value] as unknown) as FileList)
      values.avatar = Buffer.from(image.data, 'hex').toString('base64')
    }
    if (channelName.value !== props.channelInfo.name) {
      values.name = channelName.value
    }
    let groupIcon = props.channelInfo.avatar
    const groupName = values.name || props.channelInfo.name

    if (values.avatar) {
      const fileOptions: any[] = []
      fileOptions.push({
        body: values.avatar,
        contentType: 'image/png;binary',
        encoding: 'base64',
        flag: 'metaid',
        path: '/file',
        operation: 'create',
      })
      const currentChain = chainStore.state.currentChain
      const chainData = chainStore.state[currentChain]
      const selectedFeeType = chainData.selectedFeeType
      const feeRate = chainData[selectedFeeType]
      if (currentChain === 'btc') {
        const { revealTxIds, status } = await createPinWithBtc({
          inscribeDataArray: fileOptions,
          options: {
            noBroadcast: 'no',
            feeRate: feeRate,
            network: 'mainnet',
          },
        })
        if (status) throw new Error(status)
        groupIcon = `metafile://${revealTxIds[0]}i0`
      } else {
        const ret = await createPin(fileOptions[0], {
          network: 'mainnet',
          signMessage: 'upload image file',
          serialAction: 'finish',
          transactions: [],
          feeRate: feeRate,
        })
        if (ret.txid) {
          groupIcon = `metafile://${ret.txid}i0`
        }
      }
    }
    const cur = await getOneChannel(props.channelInfo.id)
    if (!cur || !cur.txId) {
      throw new Error('Channel not exist')
    }

    const group: SimpleGroup = {
      groupId: cur.groupId,
      groupIcon: cur.roomIcon || '',
      communityId: cur.communityId,
      groupName: cur.roomName || '',
      groupNote: cur.roomNote || '',
      timestamp: Date.now(),
      groupType: cur.roomType,
      status: cur.roomStatus,
      type: cur.roomType,
      tickId: cur.tickId || '',
      collectionId: cur.collectionId || '',
      limitAmount: cur.limitAmount || 0,
      chatSettingType: cur.chatSettingType,
      deleteStatus: cur.deleteStatus,
    }

    if (groupIcon !== cur.roomIcon || groupName !== cur.roomName) {
      const ret = await updateGroupChannel(group, { groupIcon, groupName })
    }

    emit('updated', {
      name: groupName,
      avatar: groupIcon,
    })
    emit('update:modelValue', false)
  } catch (error) {
    ElMessage.error((error as any).message || 'update failed')
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

:deep(.el-input__inner) {
  background: var(--bg-color);
  border-color: var(--divid-color);
  color: var(--themeTextColor);
}

:deep(.el-input__inner:focus) {
  border-color: var(--themeBtnBgColor);
}

:deep(.el-input__count) {
  background: transparent;
  color: var(--text-color-secondary);
}
.avatar-uploader {
  position: relative;
  .upload-button {
    position: absolute;
    bottom: 0px;
    right: -10px;
    width: 30px;
    height: 30px;
    color: var(--themeTextColor);
    // &::after {
    //   content: 'Optional';
    //   position: absolute;
    //   top: 5px;
    //   left: 40px;
    //   width: 100%;
    //   height: 100%;
    //   border-radius: 50%;
    // }
  }
}
</style>
