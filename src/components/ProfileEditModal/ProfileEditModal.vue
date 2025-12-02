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
      <div class="title">{{ $t('ProfileEditModal.title') }}</div>

      <div class="profile-edit-modal">
        <p class="description text-center text-gray-500 mb-6">
          {{ $t('ProfileEditModal.subtitle') }}
        </p>

        <div class="avatar-section mb-6">
          <div class="rounded-full flex items-center justify-center space-x-4">
            <el-upload
              class="avatar-uploader"
              :show-file-list="false"
              :before-upload="beforeAvatarUpload"
            >
              <img class="avatar-preview" :src="currentAvatar" v-if="!imageUrl" />
              <img v-if="imageUrl" :src="imageUrl" class="avatar-preview " alt="Avatar Preview" />
              <el-button class="upload-button" :icon="Camera" circle />
            </el-upload>
          </div>
        </div>

        <!-- 图片裁切对话框 -->
        <ElDialog
          v-model="cropperDialogVisible"
          :title="$t('ProfileEditModal.cropTitle') || '裁切头像'"
          width="400px"
          :close-on-click-modal="false"
          :append-to-body="true"
          class="cropper-dialog"
        >
          <div class="cropper-container">
            <VueCropper
              ref="cropperRef"
              :img="cropperImage"
              :output-size="1"
              :output-type="'png'"
              :info="true"
              :full="false"
              :can-move="true"
              :can-move-box="true"
              :fixed="true"
              :fixed-number="[1, 1]"
              :can-scale="true"
              :auto-crop="true"
              :auto-crop-width="200"
              :auto-crop-height="200"
              :center-box="true"
              :high="true"
              :max-img-size="2000"
            />
          </div>
          <template #footer>
            <div class="dialog-footer">
              <el-button @click="cropperDialogVisible = false">{{
                $t('common.cancel') || '取消'
              }}</el-button>
              <el-button type="primary" @click="confirmCrop">{{
                $t('common.confirm') || '确认'
              }}</el-button>
            </div>
          </template>
        </ElDialog>

        <div class="username-section mb-6 mt-6">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ $t('ProfileEditModal.username') }}
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
            {{ $t('ProfileEditModal.profile') }}
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
            @click="save"
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
import { ref, computed, watch, defineProps, defineEmits } from 'vue'
import { ElDialog, ElMessage, UploadProps } from 'element-plus'
import { useUserStore } from '@/stores/user'
import DefaultAvatar from '@/assets/images/default_user.png'
import { DB } from '@/utils/db'
import { image2Attach, compressImage } from '@/lib/file'
import { createOrUpdateUserInfo, getMVCRewards } from '@/utils/userInfo'
import { useRoute, useRouter } from 'vue-router'
import { Camera } from '@element-plus/icons-vue'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { useEcdhsStore } from '@/stores/ecdh'
import { useLayoutStore } from '@/stores/layout'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { VueCropper } from 'vue-cropper'
const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits(['update:modelValue'])
const router = useRouter()
const route = useRoute()
const ecdhsStore = useEcdhsStore()
const userStore = useUserStore()
const avatarPreview = ref<string>('')
const username = ref<string>('')
const profile = ref<string>('')
const imageUrl = ref('')
const currentAvatar = ref<string>(DefaultAvatar)
const imgRaw = ref<File | null>(null)
const loading = ref(false)
const layoutStore = useLayoutStore()
const simpleTalk = useSimpleTalkStore()

// 裁切相关状态
const cropperDialogVisible = ref(false)
const cropperImage = ref('')
const cropperRef = ref<any>(null)
const originalFile = ref<File | null>(null)

watch(
  () => userStore.last?.avatar,
  () => {
    getImageUrl()
  },
  { immediate: true }
)

// eslint-disable-next-line no-undef
const getBase64 = (img: File, callback: (url: string) => void) => {
  const reader = new FileReader()
  // eslint-disable-next-line node/no-callback-literal
  reader.addEventListener('load', () => callback(reader.result as string))
  reader.readAsDataURL(img)
}

async function getImageUrl() {
  const src = userStore.last?.avatar
  DB.getMetaFile(src, 235, 'metafile').then(res => {
    currentAvatar.value = res || DefaultAvatar
  })
}

// 初始化表单数据（只在modal第一次打开时初始化）
let hasInitialized = false
watch(
  () => props.modelValue,
  newVal => {
    if (newVal && !hasInitialized) {
      // 只在modal第一次打开时初始化，避免死循环
      avatarPreview.value = userStore.last?.avatar || ''
      username.value = userStore.last?.name || ''
      profile.value = userStore.last?.bio || ''
      hasInitialized = true
    } else if (!newVal) {
      // modal关闭时重置表单
      avatarPreview.value = ''
      username.value = ''
      profile.value = ''
      hasInitialized = false
    }
  }
)

const hasChanges = computed(() => {
  return (
    imageUrl.value ||
    username.value !== (userStore.last?.name || '') ||
    profile.value !== (userStore.last?.bio || '')
  )
})

const beforeAvatarUpload: UploadProps['beforeUpload'] = async rawFile => {
  if (rawFile.type !== 'image/jpeg' && rawFile.type !== 'image/png') {
    ElMessage.error('Avatar picture must be JPG or PNG format!')
    return false
  }

  try {
    // 保存原始文件并打开裁切对话框
    originalFile.value = rawFile as File
    getBase64(rawFile, url => {
      cropperImage.value = url
      cropperDialogVisible.value = true
    })
    return false
  } catch (error) {
    ElMessage.error('Failed to load image. Please try another image.')
    return false
  }
}

// 确认裁切
const confirmCrop = () => {
  if (!cropperRef.value) return

  cropperRef.value.getCropBlob(async (blob: Blob) => {
    try {
      // 压缩图片
      const compressedBlob = await compressImageBlob(blob, 0.8, 500)

      // 转换为 File 对象
      const fileName = originalFile.value?.name || 'avatar.png'
      const file = new File([compressedBlob], fileName, { type: 'image/png' })

      // 设置预览
      const reader = new FileReader()
      reader.onload = e => {
        imageUrl.value = e.target?.result as string
      }
      reader.readAsDataURL(compressedBlob)

      // 保存裁切后的文件
      imgRaw.value = file
      cropperDialogVisible.value = false

      ElMessage.success('图片裁切成功')
    } catch (error) {
      console.error('Crop failed:', error)
      ElMessage.error('裁切失败，请重试')
    }
  })
}

// 压缩图片 Blob
const compressImageBlob = (
  blob: Blob,
  quality: number = 0.8,
  maxSize: number = 500
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const canvas = document.createElement('canvas')
      let width = img.width
      let height = img.height

      // 限制最大尺寸
      if (width > maxSize || height > maxSize) {
        if (width > height) {
          height = (height / width) * maxSize
          width = maxSize
        } else {
          width = (width / height) * maxSize
          height = maxSize
        }
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Failed to get canvas context'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)

      canvas.toBlob(
        result => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Failed to compress image'))
          }
        },
        'image/png',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}

const save = async () => {
  if (!hasChanges.value || loading.value) {
    ElMessage.info('No changes to save.')
    return
  }

  loading.value = true
  try {
    const values: any = {}
    if (imgRaw.value) {
      const [image] = await image2Attach(([imgRaw.value] as unknown) as FileList)
      values.avatar = Buffer.from(image.data, 'hex').toString('base64')
    }
    if (username.value !== userStore.last?.name) {
      values.name = username.value
    }
    if (profile.value !== userStore.last?.bio) {
      values.bio = profile.value
    }
    if (!userStore.last?.chatpubkey) {
      const ecdh = await getEcdhPublickey()
      if (ecdh) {
        values.chatpubkey = ecdh?.ecdhPubKey
        //  ecdhsStore.insert(ecdh,ecdh?.externalPubKey)
      }
    }
    //   export const ASSIST_ENDPOINT =
    // curNetwork === "testnet"
    //   ? "https://www.metaso.network/assist-open-api-testnet"
    //   : "https://www.metaso.network/assist-open-api";
    await createOrUpdateUserInfo({
      userData: values,
      oldUserData: {
        nameId: userStore.last?.nameId || '',
        bioId: userStore.last?.bioId || '',
        avatarId: userStore.last?.avatarId || '',
        chatpubkey: userStore.last?.chatpubkey || '',
      },
      options: {
        feeRate: 1,
        network: 'mainnet',
        assistDomain: 'https://www.metaso.network/assist-open-api',
      },
    })
    if (!userStore.last.nameId) {
      const publicKey = await window.metaidwallet.btc.getPublicKey()
      const signature: any = await window.metaidwallet.btc.signMessage('metaso.network')
      await getMVCRewards(
        {
          address: userStore.last!.address,
          gasChain: 'mvc',
        },
        {
          'X-Public-Key': publicKey,
          'X-Signature': signature,
        }
      )
    }

    await userStore.setUserInfo(userStore.last!.address)
    console.log('Saving profile changes:', values)
    ElMessage.success('Profile updated successfully!')
    emit('update:modelValue', false)
    setTimeout(async () => {
      await simpleTalk.init()
      if (route.params.channelId && route.params.channelId !== 'welcome') {
        window.location.reload()
      }
      //layoutStore.$patch({showJoinView:true})

      // if(route.name !== 'talkAtMe'){
      //   //const channelId=route.params?.channelId

      // //  if(channelId && channelId !=='welcome'){
      // //   window.location.reload()
      // //  }else{
      // // //   router.push({
      // // //   name: 'talkChannel',
      // // //   params: {
      // // //     communityId: 'public',
      // // //     channelId:'welcome' //'396809572f936c66979755477b15ae9adfe9fae119bdabb8f3ffb9a362a176d0i0',
      // // //   },
      // // // })
      // //  }

      // }
    }, 1000)
  } catch (error) {
    console.error('Failed to save profile changes:', error)
    ElMessage.error('Failed to save profile changes.')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.profile-edit-modal {
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
  .username-section {
    display: flex;
    align-items: center;
    label {
      min-width: 100px;
    }
  }
  .avatar-section {
    width: 110px;
    height: 110px;
    margin: 0 auto;
    .avatar-wrap {
      img {
        width: 110px;
        height: 110px;
        border-radius: 33%;
        object-fit: cover;
        box-shadow: 2px 5px 0px 1px rgba(0, 0, 0, 1);
      }
    }
    .avatar-preview {
      width: 110px;
      height: 110px;
      border-radius: 33%;
      object-fit: cover;
      // box-shadow: 2px 5px 0px 1px rgba(0, 0, 0, 1);
      border: 2px solid rgba(0, 0, 0, 1);
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
        &::after {
          content: 'Optional';
          position: absolute;
          top: 5px;
          left: 40px;
          width: 100%;
          height: 100%;
          border-radius: 50%;
        }
      }
    }
  }

  .loading-spinner {
    display: flex;
    align-items: center;
    justify-content: center;

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #f3f3f3;
      border-top: 2px solid var(--themeTextColor);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
  }

  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
}

// 裁切对话框样式
.cropper-dialog {
  .cropper-container {
    width: 100%;
    height: 300px;
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }
}
</style>

<style>
@import 'vue-cropper/dist/index.css';
</style>
