<template>
  <div class="attachment-box">
    <div class="attachement-list">
      <div
        class="attachment-item"
        v-for="(item, index) in attachments"
        :key="typeof item === 'string' ? item : item.sha256"
        :class="[
          getAttachmentType(item),
          attachments?.length === 1 && getAttachmentType(item) === 'image' && !isEdit
            ? 'single-image'
            : '',
        ]"
        @click="preview($event, index)"
      >
        <!-- 图片 -->
        <template v-if="getAttachmentType(item) === 'image'">
          <Image :src="typeof item === 'string' ? item : item.url" />
          <!-- remove -->
          <a
            class="remove flex flex-align-center flex-pack-center"
            @click.stop="emit('remove', index)"
            v-if="isEdit"
          >
            <Icon name="x_mark" />
          </a>
        </template>

        <!-- 音频 -->
        <template v-if="getAttachmentType(item) === 'audio'">
          <!-- <video :src="typeof item === 'string' ? item : item.url" controls preload="auto"></video> -->
          <div
            class="audio-warp flex flex-align-center"
            v-loading="loading"
            :element-loading-svg="LoadingTEXT"
            :element-loading-text="$t('Loading')"
          >
            <div class="audio-icon flex flex-align-center flex-pack-center">
              <img :src="MusicIcon" />
            </div>
            <div class="cont flex1 flex flex-v">
              <div class="flex1">
                <div
                  class="name"
                  :title="typeof item === 'string' ? metafileInfo.val?.fileName : item.fileName"
                >
                  {{ typeof item === 'string' ? metafileInfo.val?.fileName : item.fileName }}
                </div>
              </div>
              <div class="size">
                {{
                  typeof item === 'string'
                    ? ((metafileInfo.val?.fileSize || 0) / 1048576).toFixed(2)
                    : (item.size / 1048576).toFixed(2)
                }}
                M
              </div>
            </div>
            <div class="control flex flex-align-center">
              <a
                class="icon-warp play flex flex-align-center flex-pack-center"
                :class="{
                  active: typeof item === 'string' ? playFile === item : playFile === item.url,
                }"
                @click.stop="
                  emit('play', {
                    file: typeof item === 'string' ? item : item.url,
                    type: 'audio',
                  })
                "
              >
                <Icon
                  name="stop"
                  v-if="typeof item === 'string' ? playFile === item : playFile === item.url"
                />
                <Icon name="play" v-else />
              </a>
              <Icon
                name="download"
                class="icon-warp"
                @click.stop="
                  downloadImage($filters.metafile(typeof item === 'string' ? item : item.url))
                "
              ></Icon>

              <Icon
                class="icon-warp"
                name="remove"
                @click.stop="emit('remove', index)"
                v-if="isEdit"
              />
            </div>
          </div>
        </template>

        <!-- NFT -->
        <template v-else-if="getAttachmentType(item) === 'nft'">
          <CardVue class="nft-card" color="#5BA1FF">
            <div class="nft-warp" @click.stop="toNFT">
              <ElSkeleton :loading="loading" animated>
                <template #template>
                  <div class="msg flex">
                    <div class="cover-warp">
                      <ElSkeletonItem variant="rect" />
                    </div>
                    <div class="cont flex1">
                      <div class="name">
                        <ElSkeletonItem variant="p" />
                        <ElSkeletonItem variant="p" />
                      </div>
                      <div class="token-index">
                        <ElSkeletonItem variant="p" />
                      </div>
                    </div>
                  </div>
                </template>
                <template #default>
                  <div class="msg flex">
                    <div class="cover-warp">
                      <NFTCoverVue :cover="[item as string]" />
                    </div>
                    <div class="cont flex1">
                      <div class="name">
                        {{nft.val!.nftName}}
                      </div>
                      <div class="token-index">#{{parseInt(nft.val!.nftTokenIndex) + 1}}</div>
                    </div>
                  </div>
                  <a
                    class="remove flex flex-align-center flex-pack-center"
                    @click.stop="emit('remove', index)"
                    v-if="isEdit"
                  >
                    <Icon name="remove" />
                  </a>
                </template>
              </ElSkeleton>
            </div>
          </CardVue>
          <div class="msg-error" v-if="isFail">{{ $t('NFT.Get Msg Error') }}</div>
        </template>

        <template v-else-if="getAttachmentType(item) === 'video'">
          <video
            controls
            :src="$filters.metafile(typeof item === 'string' ? item : item.url)"
          ></video>
        </template>
      </div>
    </div>
    <!-- 图片 -->
    <!-- <div class="image-list" v-if="images && images.length">
      <template v-for="(img, index) in images" :key="index">
        <div
          :class="[images.length === 1 ? 'single' : '', 'item']"
          @click.stop.prevent="handlePreviewImage(index, images)"
        >
          <img :src="img" />
        </div>
      </template>
    </div> -->
    <!-- 视频 -->
    <!-- <div class="video-list" v-if="videos && videos.length">
      <template v-for="(video, index) in videos" :key="index">
        <video :src="video" controls preload="auto"></video>
      </template>
    </div> -->
    <!-- 音乐 -->
    <!-- <div class="audio-list" v-if="audios && audios.length">
      <template v-for="(audio, index) in audios" :key="index">
        <audio :src="audio" controls preload="auto"></audio>
      </template>
    </div> -->
    <!-- NFT -->
    <!-- <div class="image-list" v-if="nfts && nfts.length">
      <template v-for="(nft, index) in nfts" :key="index">
        <div :class="['item', 'nft']" @click.stop.prevent="toNFT">
          <i>NFT</i>
          <img :src="nft" />
        </div>
      </template>
    </div> -->
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { router } from '@/router'
import { AttachmentItem } from '@/@types/hd-wallet'
import MusicIcon from '@/assets/icons/music.svg?url'
import { downloadFile ,downloadImage} from '@/utils/util'
import { GetMetaFile, GetNFT } from '@/api/aggregation'
import CardVue from '@/components/Card/Card.vue'
import NFTCoverVue from '@/components/NFTCover/NFTCover.vue'
import { LoadingTEXT } from '@/utils/LoadingSVGText'
import { useImagePreview } from '@/stores/imagePreview'

interface Props {
  attachments: (AttachmentItem | string)[]
  playFile?: string
  isEdit?: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const loading = ref(true)

const emit = defineEmits(['remove', 'play'])

const metafileInfo: { val: null | MetaFileInfo } = reactive({ val: null })
const nft: { val: null | GenesisNFTItem } = reactive({ val: null })
const imagePreview = useImagePreview()
const isFail = ref(false)

const previewImages = computed(() => {
  let result: string[] = []
  for (let item of props.attachments) {
    if (typeof item === 'string') {
      result.push(item)
    } else {
      result.push(item.url)
    }
  }
  return result
})

watch(
  () => props.attachments,
  () => {
    getAttachmentInfo()
  }
)

// const images = computed(() => {
//   if (!props.attachments || !props.attachments.length) {
//     return []
//   }
//   return props.attachments
//     .filter(v => {
//       if (v.indexOf('metafile://') > -1) {
//         const mch = String(v).match(/\.[\w\d]{3}$/gi)
//         if (!mch || !mch.length) {
//           return true
//         }
//         const suffix = mch[0].toLowerCase()
//         return ['.jpg', '.png', '.jpeg'].includes(suffix)
//       }
//       return false
//     })
//     .map((v, i, arr) => {
//       return arr.length === 1 ? metafile(v, 680) : metafile(v, 240)
//     })
// })
// const videos = computed(() => {
//   if (!props.attachments || !props.attachments.length) {
//     return []
//   }
//   return props.attachments
//     .filter(v => {
//       if (v.indexOf('metafile://') > -1) {
//         const mch = String(v).match(/\.[\w\d]{3}$/gi)
//         if (!mch || !mch.length) {
//           return false
//         }
//         const suffix = mch[0].toLowerCase()
//         return ['.mp4'].includes(suffix)
//       }
//       return false
//     })
//     .map(v => metafile(v, -1))
// })
// const audios = computed(() => {
//   if (!props.attachments || !props.attachments.length) {
//     return []
//   }
//   return props.attachments
//     .filter(v => {
//       if (v.indexOf('metafile://') > -1) {
//         const mch = String(v).match(/\.[\w\d]{3}$/gi)
//         if (!mch || !mch.length) {
//           return false
//         }
//         const suffix = mch[0].toLowerCase()
//         return ['.mp3'].includes(suffix)
//       }
//       return false
//     })
//     .map(v => metafile(v, -1))
// })
// const nfts = computed(() => {
//   if (!props.attachments || !props.attachments.length) {
//     return []
//   }
//   return props.attachments
//     .filter(v => {
//       return v.indexOf('sensible://') > -1
//     })
//     .map(v => {
//       return metafile(v.replace('sensible://', 'sensible/'), 680)
//     })
// })

function toNFT() {
  if (props.isEdit) return
  router.push({
    name: 'nftDetail',
    params: {
      genesis: nft.val!.nftGenesis,
      codehash: nft.val!.nftCodehash ? nft.val!.nftCodehash : nft.val?.nftChain,
      tokenIndex: nft.val!.nftTokenIndex,
      chain: nft.val!.nftChain,
    },
  })
}

function getAttachmentType(attachment: string | AttachmentItem) {
  if (typeof attachment === 'string') {
    const fileSuffix = attachment.split('.')[attachment.split('.').length - 1].toLowerCase()
    const videoSuffixs = ['mov', 'mp4']
    if (
      attachment.indexOf('metacontract://') !== -1 ||
      attachment.indexOf('evm/') !== -1 ||
      attachment.indexOf('sensible://') !== -1
    ) {
      return 'nft'
    } else if (
      fileSuffix === 'png' ||
      fileSuffix === 'jpg' ||
      fileSuffix === 'jpeg' ||
      fileSuffix === 'svg'
    ) {
      return 'image'
    } else if (fileSuffix === 'mp3') {
      return 'audio'
    } else if (videoSuffixs.includes(fileSuffix)) {
      return 'video'
    } else {
      return 'image'
    }
  } else {
    if (attachment.fileType.indexOf('audio/') !== -1) {
      return 'audio'
    } else {
      return 'image'
    }
  }
  // let isImage = false
  // for (let i = 0; i < imageType.length; i++) {
  //   if (attachment.indexOf(imageType[i]) !== -1) {
  //     isImage = true
  //     break
  //   }
  // }
  // if (isImage) return 'image'
}

function getMetaFileInfo() {
  return new Promise<void>(async (resolve, reject) => {
    const res = await GetMetaFile([
      typeof props.attachments[0] === 'string'
        ? props.attachments[0].replace('metafile://', '').split('.')[0]
        : '',
    ]).catch(eror => {
      ElMessage.error(eror.message)
    })
    if (res?.code === 0) {
      metafileInfo.val = res.data.results.items[0]
      resolve()
    }
  })
}

function preview(e: Event, index: number) {
  if (getAttachmentType(props.attachments[index]) !== 'image') return
  imagePreview.images = previewImages.value
  imagePreview.index = index
  imagePreview.visibale = true
  e.stopPropagation()
}

function getAttachmentInfo() {
  if (props.attachments && props.attachments.length) {
    if (getAttachmentType(props.attachments[0]) === 'audio') {
      loading.value = true
      getMetaFileInfo().then(() => {
        loading.value = false
      })
    } else if (getAttachmentType(props.attachments[0]) === 'nft') {
      loading.value = true
      const array = (props.attachments[0] as string).split(
        `${
          (props.attachments[0] as string).indexOf('metacontract') !== -1 ||
          (props.attachments[0] as string).indexOf('sensible') !== -1
            ? '://'
            : 'evm/'
        }`
      )
      GetNFT({
        chain:
          array[0] === 'metacontract'
            ? 'mvc'
            : array[0] === 'sensible'
            ? 'bsv'
            : array[1].split('/')[0],
        genesis: array[1].split('/')[1],
        codehash: array[0] === 'metacontract' ? array[1].split('/')[0] : array[1].split('/')[0],
        tokenIndex: array[1].split('/')[2].split('.')[0], // 兼容 安卓show 发buzz 带文件格式后缀： sensible://codeshash/genesis/tokenIndex.gif
      })
        .then(res => {
          if (res.code === 0) {
            nft.val = res.data.results.items[0]
            loading.value = false
          }
        })
        .catch(error => {
          isFail.value = true
        })
    }
  }
}

getAttachmentInfo()
</script>
<style scoped lang="scss" src="./Attachment.scss"></style>
