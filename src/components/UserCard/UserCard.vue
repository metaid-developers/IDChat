<template>
  <div class="p-4.5 bg-white dark:bg-gray-700 rounded-xl relative">
    <div class="header flex flex-align-center pb-4.5">
      <div class="flex1 cont mr-2">
        <div class="text-base "><UserName :name="name" :meta-name="metaName" /></div>
        <div class="text-xs text-dark-300">MetaID:{{ metaId ? metaId.slice(0, 6) : '--' }}</div>
      </div>
      <div class="h-full flex gap-x-2">
        <button class="main-border primary !rounded-full py-1 px-3 text-xs" @click="toUser">
          {{ i18n.t('User.Home') }}
        </button>
        <button
          class="main-border primary !rounded-full py-1 px-3 text-xs"
          :class="[isMyFollowed ? 'faded' : '']"
          v-if="userStore.user?.metaId !== metaId"
          @click="follow"
        >
          <template v-if="loading">
            <ElIcon class="is-loading">
              <Loading />
            </ElIcon>
          </template>
          <template v-else>
            {{ isMyFollowed ? i18n.t('Cancel Follow') : i18n.t('Follow') }}
          </template>
        </button>
      </div>
    </div>

    <UserPersonaVue class="mt-4.5" :i18n="propsI18n" />

    <div class="close flex flex-align-center flex-pack-center" @click.stop="$emit('hide')">
      <Icon name="x_mark" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useUserStore } from '@/stores/user'
import { checkUserLogin, followUser } from '@/utils/util'
import { reactive, ref, watch } from 'vue'
import UserPersonaVue from '../UserPersona/UserPersona.vue'
import { Loading } from '@element-plus/icons-vue'
import { GetUserAllInfo, GetUserFollow } from '@/api/aggregation'
import { useI18n } from 'vue-i18n'
import { Mitt, MittEvent } from '@/utils/mitt'
import { router } from '@/router'

const props = defineProps<{
  modelValue: boolean
  metaId: string
  name: string
  metaName?: string
  i18n?: any
}>()

const userStore = useUserStore()
const isMyFollowed = ref(false)
const loading = ref(true)
const userInfo: { val: null | UserAllInfo } = reactive({ val: null })
const propsI18n = props.i18n
const i18n = props.i18n ? props.i18n.global : useI18n()
const emit = defineEmits(['hide'])

function toUser(e: Event) {
  router.push({
    name: 'user',
    params: {
      metaId: props.metaId,
    },
  })
  emit('hide')
}

async function toMessage() {
  await checkUserLogin()
  // 使用 globalMetaId 进行私聊跳转（如果可用）
  const targetId = userInfo.val?.globalMetaId || props.metaId
  router.push({
    name: 'talkAtMe',
    params: {
      channelId: targetId,
    },
  })
}

function getUserInfo() {
  return new Promise<void>(async (resolve, reject) => {
    const res = await GetUserAllInfo(props.metaId).catch(error => {
      ElMessage.error(error.message)
    })
    if (res?.code === 0) {
      userInfo.val = res.data
      resolve()
    }
  })
}

function checkUserIsFollowed() {
  return new Promise<void>(async resolve => {
    if (userStore.isAuthorized) {
      const res = await GetUserFollow(userStore.user!.metaId).catch(error => {
        ElMessage.error(error.message)
      })
      if (res?.code === 0) {
        if (res.data.followingList && res.data.followingList.includes(props.metaId)) {
          isMyFollowed.value = true
        }
      }
    } else {
      isMyFollowed.value = false
    }
    resolve()
  })
}

async function follow() {
  if (loading.value) return
  loading.value = true
  const res = await followUser({
    value: !isMyFollowed.value,
    name: userInfo.val!.name,
    metaId: userInfo.val!.metaId,
    address: userInfo.val!.address,
  })
  if (res) {
    isMyFollowed.value = !isMyFollowed.value
    const message = `${
      !isMyFollowed.value ? i18n.i18n.t('Cancel Follow') : i18n.i18n.t('Follow')
    } ${i18n.i18n.t('Success')}`
    ElMessage.success(message)
  } else {
    loading.value = false
  }
}

watch(
  () => props.modelValue,
  async result => {
    if (result) {
      loading.value = true
      await Promise.all([checkUserIsFollowed(), getUserInfo()])
      loading.value = false
    }
  },
  {
    immediate: true,
  }
)
</script>

<style lang="scss" scoped>
.relative {
  .close {
    width: 70px;
    height: 70px;
    border-radius: 50%;
    background: var(--color-primary);
    box-shadow: 3px 3px 0 rgba(var(--color-primaryRgb), 0.5);
    position: absolute;
    margin-left: -35px;
    left: 50%;
    bottom: 0;
    margin-bottom: 60px;
    display: none;

    .icon {
      width: 40px;
      height: 40px;
      color: var(--themeBtnTextColor);
      :deep(use) {
        fill: var(--themeBtnTextColor);
        stroke: var(--themeBtnTextColor);
        stroke-width: 2px;
      }
    }
  }
}
@media screen and (max-width: 750px) {
  .relative {
    .close {
      display: flex;
    }
  }
}
</style>
