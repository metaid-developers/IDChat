<template>
  <div
    :class="[
      layout.isShowUserInfo ? 'fixed inset-0 z-[999] lg:static flex flex-col' : 'hidden',
      'bg-white lg:bg-dark-100 dark:bg-gray-800 text-sm p-8 lg:p-4.5 lg:mt-15 lg:block',
    ]"
    v-if="activeChannel"
  >
    <!-- 头像名字等基本信息 -->
    <div
      class="flex items-center border-b border-solid border-dark-200 dark:border-gray-600 pb-8 mb-8 lg:pb-4.5 lg:mb-4.5"
    >
      <UserAvatar
        :image="activeChannel.avatarImage"
        :meta-id="activeChannel.id"
        :meta-name="activeChannel.metaName"
        class="w-12 h-12 lg:w-10 lg:h-10 shrink-0 select-none mr-2 lg:mr-0"
        :disabled="true"
      />

      <div class="ml-2">
        <!-- <div class="text-xl lg:text-sm font-bold lg:font-normal">{{ activeChannel.name }}</div> -->
        <UserName
          :name="activeChannel.name"
          :meta-name="activeChannel.metaName"
          :text-class="'!text-xl lg:!text-sm font-bold lg:font-normal max-w-[120PX]'"
        />
        <div class="text-xs text-dark-300 dark:text-gray-400 whitespace-nowrap mt-1 lg:mt-0.5">
          <span>MetaID: </span>
          <span
            class="px-1 py-0.5 rounded lg:hover:bg-dark-200 dark:lg:hover:bg-black lg:hover:underline cursor-pointer"
            @click="copyMetaId"
          >
            {{ shortId }}
          </span>
        </div>
      </div>

      <div class="ml-4 grow flex items-center justify-end">
        <button
          class="main-border primary !rounded-full w-20 lg:w-16 py-2 lg:py-1 text-xs cursor-pointer flex items-center justify-center"
          :class="[isFollowed ? 'faded' : 'primary']"
          @click="trySwitchFollow"
          v-if="gotFollowStatus"
        >
          <Icon
            v-if="isSwitchingFollow"
            name="arrow_path"
            class=" w-4 h-4 animate-spin px-3 box-content"
          ></Icon>
          <span v-else>{{
            isFollowed ? $t('Talk.Channel.followed') : $t('Talk.Channel.follow')
          }}</span>
        </button>

        <!-- 占位 -->
        <div class="w-16 h-1" v-else></div>
      </div>
    </div>

    <!-- 游戏化 -->
    <UserPersona />

    <!-- 返回按钮 -->
    <div class="grow flex lg:!hidden items-end justify-end">
      <button
        class="main-border py-3 px-12 text-base font-medium"
        @click="layout.isShowUserInfo = false"
      >
        Back
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import { GetUserAllInfo, GetUserFollow } from '@/api/aggregation'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import { useLayoutStore } from '@/stores/layout'
import { switchFollowUser } from '@/utils/talk'
import { showLoading, sleep } from '@/utils/util'
import { useRootStore } from '@/stores/root'
import UserPersona from '@/components/UserPersona/UserPersona.vue'

const talk = useTalkStore()
const user = useUserStore()
const layout = useLayoutStore()
const i18n = useI18n()
const activeChannel =ref(false) //computed(() => talk.activeChannel)
const rootStore = useRootStore()
const shortId = computed(() => {
  if (!activeChannel.value) return ''
  return activeChannel.value.id.slice(0, 6)
})

const gotFollowStatus = ref(false)
const isFollowed = ref(false)
const isSwitchingFollow = ref(false)

watch(
  () => activeChannel.value?.id,
  async id => {
    if (!id) return

    gotFollowStatus.value = false
    isFollowed.value = false

    const res = await GetUserFollow(talk.selfMetaId)
    if (res.code === 0) {
      const followings: string[] = res.data?.followingList
      isFollowed.value = followings?.includes(activeChannel.value?.id)
      rootStore.$patch(state => {
        state.myBlackList = res.data.blackList
      })
      gotFollowStatus.value = true
    }
  },
  { immediate: true }
)

const copyMetaId = () => {
  if (!activeChannel.value?.id) return
  navigator.clipboard.writeText(activeChannel.value.id)

  ElMessage.success(i18n.t('Talk.Modals.copied'))
}

const trySwitchFollow = async () => {
  if (isSwitchingFollow.value) return

  const process = async () => {
    if (!activeChannel.value?.id) return

    // 获取地址
    const res = await GetUserAllInfo(activeChannel.value.id)
    if (res.code !== 0) return
    const address = res.data?.address
    if (!address) return

    const params = {
      metaId: activeChannel.value.id,
      address,
      isFollowed: isFollowed.value,
    }
    await switchFollowUser(params, user.showWallet)

    // 等待1秒后重新获取关注状态
    await sleep(1000)
    const res2 = await GetUserFollow(talk.selfMetaId)
    if (res2.code === 0) {
      const followings: string[] = res2.data?.followingList
      isFollowed.value = followings?.includes(activeChannel.value?.id)
    }
  }

  await showLoading(process, isSwitchingFollow)
}
</script>
