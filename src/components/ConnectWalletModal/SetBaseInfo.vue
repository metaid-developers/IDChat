<template>
  <ModalVue
    :model-value="modelValue"
    v-model:showSecondControl="isShowAvatasList"
    :is-hide-close="true"
    :mobileSize="95"
    :width="'456px'"
  >
    <template #body>
      <div
        class="set-base-user-info flex"
        v-loading="loading"
        :element-loading-svg="LoadingTEXT"
        :element-loading-text="$t('Loading')"
      >
        <div class="flex1 set-base-user-info-item set-warp">
          <div class="title">
            {{ $t('Login.setBaseInfo.title') }}
          </div>
          <div class="info">
            <div class="info-item flex flex-align-center">
              <div class="key">{{ $t('Login.setBaseInfo.setNFTAvatar') }}</div>
              <div class="cont flex1 flex flex-align-center flex-pack-end">
                <div class="flex flex-align-center avatar-warp" @click="openAvatarList">
                  <UserAvatar
                    :metaId="userStore.user!.metaId"
                    :disabled="true"
                    :image="currentAvatar.val.avatarImage"
                    :name="userStore.user!.name"
                    class="main-border"
                    :meta-name="userStore.user!.metaName"
                  />
                  <Icon name="down" />
                </div>
              </div>
            </div>

            <div class="info-item flex flex-align-center">
              <div class="key">{{ $t('Login.setBaseInfo.setUserName') }}</div>
              <div class="cont flex1 flex flex-align-center flex-pack-end">
                <ElForm :model="form" :rules="rules" ref="FormRef">
                  <ElFormItem prop="name">
                    <ElInput
                      v-model="form.name"
                      type="text"
                      :placeholder="$t('Login.setBaseInfo.setUserNamePlac')"
                    />
                  </ElFormItem>
                </ElForm>
              </div>
            </div>
          </div>
          <div class="operate">
            <a class="main-border" :class="{ faded: form.name === '' }" @click="submitForm">
              <Icon name="right" />
            </a>
          </div>
        </div>
      </div>
    </template>

    <template #secondBody>
      <div
        class="set-base-user-info flex"
        v-loading="loading"
        :element-loading-svg="LoadingTEXT"
        :element-loading-text="$t('Loading')"
      >
        <div class="flex1 set-base-user-info-item">
          <div class="choose-nft flex flex-v">
            <div class="title">{{ $t('Login.setBaseInfo.chooseNFTTitle') }}</div>
            <NFTAvatarListVue
              :activeTx="currentAvatar.val.avatarImage"
              @change="item => (currentAvatar.val = item)"
            />
          </div>
        </div>
      </div>
    </template>
    <template #secondTitle>
      {{ $t('Login.setBaseInfo.Choose NFT Profile Picture') }}
    </template>
  </ModalVue>

  <!-- <ElDialog
    :model-value="modelValue"
    :show-close="false"
    class="none-bg-color none-header"
    :close-on-click-modal="false"
  >
    
  </ElDialog> -->
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { reactive, ref, watch } from 'vue'
import ModalVue from '../Modal/Modal.vue'
import NFTAvatarListVue from '@/components/NFTAvatarList/NFTAvatarList.vue'
import { LoadingTEXT } from '@/utils/LoadingSVGText'

interface Props {
  modelValue: boolean
  loading: boolean
}

const props = withDefaults(defineProps<Props>(), {})
const emit = defineEmits(['success'])
const userStore = useUserStore()

// @ts-ignore
const currentAvatar: { val: NFTAvatarItem } = reactive({
  val: {
    avatarImage: userStore.last?.avatar,
  },
})
console.log('currentAvatar', currentAvatar.val)

watch(
  () => userStore.isAuthorized,
  () => {
    if (userStore.isAuthorized ) {
      currentAvatar.val.avatarImage = userStore.last!.avatar
    }
  }
)

const FormRef = ref()
const form = reactive({
  name: '',
  avatarTx: '',
})
const rules = {
  name: [
    {
      required: true,
      message: '',
      trigger: 'blur',
    },
  ],
}
const isShowAvatasList = ref(false)

function submitForm() {
  console.log('zxczxc', currentAvatar.val)

  FormRef.value.validate(async (valid: boolean) => {
    if (valid) {
      emit('success', {
        name: form.name,
        nft: currentAvatar.val,
      })
    }
  })
}

function openAvatarList() {
  isShowAvatasList.value = !isShowAvatasList.value
}

defineExpose({
  FormRef,
})
</script>

<style lang="scss" scoped src="./SetBaseInfo.scss"></style>
