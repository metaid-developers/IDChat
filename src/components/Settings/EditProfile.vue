<template>
  <ModalVue
    :model-value="modelValue"
    :show-second-control="isShowSecondModal"
    @update:model-value="val => emit('update:modelValue', val)"
    @update:show-second-control="val => (isShowSecondModal = val)"
    :loading="loading"
  >
    <template #title>
      {{ $t('Setting.Edit Profile') }}
    </template>
    <template #body>
      <div class="intro">
        {{ $t('EditProfile.intro') }}
      </div>
      <div class="avatar">
        <div class="avatar-warp" @click="choose(EditType.Avatar)">
          <UserAvatar
            :meta-id="userStore.user!.metaId"
            :image="currentAvatar.val.avatarImage"
            :name="userStore.user!.name"
            :meta-name="userStore.user!.metaName"
            :type="'metafile'"
            :disabled="true"
          />
          <a class="edit flex flex-align-center flex-pack-center">
            <Icon name="edit" />
          </a>
        </div>
      </div>

      <ElForm :model="form" :rules="rule" label-width="0">
        <!-- <ElFormItem prop="metaName" label="">
          <div class="form-item" @click="choose(EditType.MetaName)">
            <div class="label flex flex-align-center ">
              <span class="meta-name">MetaName</span><MetaName />
            </div>
            <ElInput
              type="text"
              v-model="currentMetaName.val.name"
              :readonly="true"
              :placeholder="$t('EditProfile.Select MetaName')"
            >
              <template #suffix>
                <Icon name="down" class="right-icon" />
              </template>
            </ElInput>
            <div class="drsc">
              {{ $t('EditProfile.MetaName.drsc') }}
            </div>
          </div>
        </ElFormItem> -->
        <ElFormItem prop="name">
          <div class="form-item">
            <div class="label">{{ $t('EditProfile.User Name') }}</div>
            <ElInput type="text" v-model="form.name" />
          </div>
        </ElFormItem>

        <ElFormItem prop="name">
          <div class="operate flex flex-pack-end">
            <a class="main-border primary" @click="confirm">
              <Icon name="check" />
            </a>
          </div>
        </ElFormItem>
      </ElForm>
    </template>

    <template #secondTitle>
      {{
        editType === EditType.MetaName
          ? $t('EditProfile.Select MetaName')
          : $t('EditProfile.Choose NFT Avatar')
      }}
    </template>

    <!-- secondBody -->
    <template #secondBody>
      <template v-if="editType === EditType.Avatar">
        <NFTAvatarListVue
          :active-tx="currentAvatar.val.avatarImage"
          @change="item => (currentAvatar.val = item)"
        />
      </template>
      <!-- <template v-else>
        <div class="choose-meta-name-warp flex flex-col h-full">
          <div class="tips mb-2">
            {{ $t('EditProfile.MetaNameTips') }}
          </div>
          <ChooseMetaNameVue
            @change="onChangeMetaName"
            :use-case="'profile'"
            :selected="currentMetaName.val"
          />
        </div>
      </template> -->
    </template>
  </ModalVue>
</template>
<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { reactive, ref, watch } from 'vue'
import ModalVue from '@/components/Modal/Modal.vue'
import MetaName from '@/assets/svg/tag_nft.svg'
import NFTAvatarListVue from '@/components/NFTAvatarList/NFTAvatarList.vue'
import { NodeName } from '@/enum'
import { createBrfcChildNodeParams } from '@/@types/sdk'
import { useI18n } from 'vue-i18n'
import ChooseMetaNameVue from '@/components/ChooseMetaName/ChooseMetaName.vue'
import { useLayoutStore } from '@/stores/layout'

interface Props {
  modelValue: boolean
}
const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['update:modelValue'])
const i18n = useI18n()

const userStore = useUserStore()
const layout = useLayoutStore()
const isShowSecondModal = ref(false)
const loading = ref(false)
enum EditType {
  Avatar = 'avatar',
  MetaName = 'MetaName',
}
const editType = ref(EditType.Avatar)

// @ts-ignore
const currentAvatar: { val: NFTAvatarItem } = reactive({
  val: {
    avatarImage: userStore.user?.avatarImage,
  },
})
// @ts-ignore
// const currentMetaName: { val: MetaNameItem } = reactive({
//   val: {
//     name: userStore.user?.metaName || '',
//   },
// })

watch(
  () => userStore.isAuthorized,
  () => {
    if (userStore.isAuthorized) {
      currentAvatar.val.avatarImage = userStore.user!.avatarImage
    }
  }
)

const form = reactive({
  name: userStore.user!.name,
})

const rule = {
  name: [
    {
      required: true,
      message: () => i18n.t('Enter User Name'),
      trigger: 'blur',
    },
  ],
}

async function confirm() {
  // if (userStore.metaletLogin) {
  //   return ElMessage.error(i18n.t(`Editor not allow from metalet`))
  // }
  //
  if (
    form.name === '' ||
    (form.name === userStore.user!.name &&
      currentAvatar.val.avatarImage === userStore.user?.avatarImage)
  )
    return
  loading.value = true

  try {
    const paramsList: createBrfcChildNodeParams[] = []
    if (currentAvatar.val!.avatarImage !== userStore.user?.avatarImage) {
      paramsList.push({
        nodeName: NodeName.NFTAvatar,
        data: JSON.stringify({
          type: `nft`,
          codehash: currentAvatar.val!.codehash,
          genesis: currentAvatar.val!.genesis,
          tokenIndex: currentAvatar.val!.tokenIndex,
          updateTime: new Date().getTime(),
          memo: currentAvatar.val.desc,
          image: currentAvatar.val.avatarImage,
          chain:
            currentAvatar.val.avatarImage.split('://')[0] === 'metacontract'
              ? 'mvc'
              : currentAvatar.val.avatarImage.split('://')[0],
        }),
      })
    }

    if (form.name !== userStore.user!.name) {
      paramsList.push({
        nodeName: NodeName.Name,
        data: form.name,
      })
    }

    // if (currentMetaName.val.name !== userStore.user!.metaName) {
    //   console.log({ currentMetaName })
    //   paramsList.push({
    //     nodeName: NodeName.NftName,
    //     data: JSON.stringify({
    //       type: currentMetaName.val.name === '' ? 'name' : 'nft', //string type 取值⻅下⽅
    //       chain: currentMetaName.val.chain, //string type 链类型
    //       name: currentMetaName.val.name, //string type, 图片路由
    //       codehash: currentMetaName.val.codeHash, //string type nft的codehash
    //       genesis: currentMetaName.val.genesis, //string type nft的genesis 或 nft的tokenAddress
    //       tokenIndex: currentMetaName.val.tokenIndex, //string type nft的tokenIndex 或 nft的tokenId
    //       updateTime: new Date().getTime(), //long type 更新时间
    //       memo: '', //string type 备注 预留字段
    //     }),
    //   })
    // }

    const res = await userStore.showWallet.batchCreateBrfcChildNode(paramsList)
    if (res) {
      emit('update:modelValue', false)

      // @ts-ignore
      userStore.updateUserInfo({
        ...userStore.user,
        name: form.name,
        avatarImage: currentAvatar.val.avatarImage,
        //metaName: currentMetaName.val.name,
      })
      ElMessage.success(i18n.t('Setting.Edit Profile') + ' ' + i18n.t('Success'))
      loading.value = false
    }
  } catch (error) {
    ElMessage.error((error as any).message)
    loading.value = false
  }
}

function choose(type: EditType) {
  editType.value = type
  isShowSecondModal.value = true
}

// function onChangeMetaName(metaName: MetaNameItem) {
//   if (metaName.name === currentMetaName.val.name) {
//     // @ts-ignore
//     currentMetaName.val = {
//       name: '',
//     }
//   } else {
//     currentMetaName.val = metaName
//   }

//   isShowSecondModal.value = false
// }
</script>

<style lang="scss" scoped src="./EditProfile.scss"></style>
