<template>
  <BuzzWarpVue>
    <div class="top-warp">
      <div class="nav flex flex-align-center">
        <div class="flex1">
          <a class="back flex flex-align-center flex-pack-center" @click="$router.back()">
            <Icon name="down"></Icon>
          </a>
        </div>
        <a class="edit flex flex-align-center flex-pack-center" v-if="isSelf" @click="editBg">
          <Icon name="edit" />
        </a>
      </div>

      <ElSkeleton :loading="isSkeleton" animated>
        <template #template>
          <div class="cover">
            <ElSkeletonItem variant="image" />
          </div>

          <div class="user">
            <div class="user-top flex flex-align-end">
              <div class="flex1">
                <div class="avatar-warp flex flex-align-center flex-pack-center">
                  <ElSkeletonItem variant="circle" />
                </div>
              </div>
              <div class="opreate flex-self-end">
                <ElSkeletonItem variant="button" />
                <ElSkeletonItem variant="button" />
              </div>
            </div>
            <div class="name"><ElSkeletonItem variant="text" /></div>
            <div class="metaid flex flex-align-center">
              <ElSkeletonItem variant="text" />
            </div>
            <div class="follow-list flex flex-align-center">
              <ElSkeletonItem variant="text" />
            </div>
          </div>

          <div class="tab flex flex-align-center">
            <ElSkeletonItem variant="button" v-for="(tab, index) in tabs" :key="index" />
          </div>
        </template>
        <template #default>
          <div class="cover">
            <Image :src="userInfo.val!.coverUrl" v-if="userInfo.val!.coverUrl" />
          </div>

          <div class="user">
            <div class="user-top flex flex-align-end">
              <div class="flex1">
                <div class="avatar-warp flex flex-align-center flex-pack-center">
                  <UserAvatar
                    :meta-id="userInfo.val!.metaId"
                    :image="userInfo.val!.avatarImage"
                    :name="userInfo.val!.name"
                    :meta-name="userInfo.val!.metaName"
                    :disabled="true"
                  />
                </div>
              </div>
              <div class="opreate flex-self-end">
                <a class="main-border primary" v-if="!isSelf" @click="toChat">{{
                  $t('User.Chat')
                }}</a>
                <a
                  class="main-border primary"
                  :class="[isMyFollowed ? 'faded' : 'primary']"
                  @click="follow"
                  v-if="!isSelf"
                >
                  <template v-if="loading">
                    <ElIcon class="is-loading">
                      <Loading />
                    </ElIcon>
                  </template>
                  <template v-else>
                    {{ isMyFollowed ? $t('Cancel Follow') : $t('Follow') }}
                  </template>
                </a>
              </div>
            </div>
            <div class="name">
              <UserName
                :name="userInfo.val!.name"
                :meta-name="userInfo.val!.metaName"
                :text-class="'!text-lg font-bold'"
              />
            </div>
            <div class="metaid flex flex-align-center">
              <span class="id" @click="copy(userInfo.val!.metaId)"
                >MetaID: {{userInfo.val!.metaId.slice(0, 6)}}</span
              >
              <span class="tag" @click="tx($event,userInfo.val!.metaId)">TX</span>
            </div>
            <div class="follow-list flex flex-align-center">
              <span class="follow-item">
                <span class="count">{{ userFollow.following.length }}</span>
                {{ $t('Following') }}
              </span>
              <span class="follow-item">
                <span class="count">{{ userFollow.follers.length }}</span>
                {{ $t('Followers') }}
              </span>
            </div>
          </div>

          <div class="tab flex flex-align-center">
            <RouterLink :to="tab.params" v-for="(tab, index) in tabs" :key="index">
              {{ tab.name }}
            </RouterLink>
          </div>
        </template>
      </ElSkeleton>
    </div>

    <RouterView />
  </BuzzWarpVue>
</template>

<script setup lang="ts">
import BuzzWarpVue from '../buzz/components/BuzzWarp.vue'
import { useI18n } from 'vue-i18n'
import { computed, reactive, ref } from 'vue'
import { GetUserAllInfo, GetUserFollow } from '@/api/aggregation'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { checkUserLogin, copy, followUser, tx } from '@/utils/util'
import { Loading } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRootStore } from '@/stores/root'
import { NodeName } from '@/enum'
import { Mitt, MittEvent } from '@/utils/mitt'

const i18n = useI18n()
const route = useRoute()
const router = useRouter()
const userInfo: { val: null | UserAllInfo } = reactive({ val: null })
const isSkeleton = ref(true)
const userStore = useUserStore()
const isMyFollowed = ref(false)
const loading = ref(false)
const rootStore = useRootStore()
const userFollow: {
  following: string[]
  follers: string[]
} = reactive({
  following: [],
  follers: [],
})

const tabs = [
  {
    name: 'Buzz',
    params: {
      name: 'userBuzz',
      params: {
        metaId: route.params.metaId as string,
      },
    },
  },
  {
    name: i18n.t('Already on NFT'),
    params: {
      name: 'userNFT',
      params: {
        metaId: route.params.metaId as string,
      },
    },
  },
]

const isSelf = computed(() => {
  let result = false
  if (userStore.isAuthorized && userInfo.val && userStore.user!.metaId === userInfo.val!.metaId)
    result = true
  return result
})

function getUserInfo() {
  return new Promise<void>(async resolve => {
    const res = await GetUserAllInfo(route.params.metaId as string).catch(error => {
      ElMessage.error(error.message)
      resolve()
    })
    if (res?.code === 0) {
      userInfo.val = res.data
      resolve()
    }
  })
}

function getUserFoller() {
  return new Promise<void>(async resolve => {
    const res = await GetUserFollow(route.params.metaId as string).catch(error => {
      ElMessage.error(error.message)
      resolve()
    })
    if (res?.code === 0) {
      userFollow.following = res.data.followingList ? res.data.followingList : []
      userFollow.follers = res.data.followedList ? res.data.followedList : []
      rootStore.$patch(state => {
        state.myBlackList = res.data.blackList
      })
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
        if (
          res.data.followingList &&
          res.data.followingList.includes(route.params.metaId as string)
        ) {
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
  }).catch(error => {
    ElMessage.error(error.message)
    loading.value = false
  })
  if (res) {
    isMyFollowed.value = !isMyFollowed.value
    if (isMyFollowed.value) {
      userFollow.following.push(userStore.user!.metaId)
    } else {
      userFollow.following.splice(
        userFollow.following.findIndex(item => item === userStore.user!.metaId),
        1
      )
    }
    const message = `${!isMyFollowed.value ? i18n.t('Cancel Follow') : i18n.t('Follow')} ${i18n.t(
      'Success'
    )}`
    ElMessage.success(message)
    loading.value = false
  } else {
    loading.value = false
  }
}

async function toMessage() {
  await checkUserLogin()
  // 使用 globalMetaId 进行私聊跳转
  const targetId = userInfo.val!.globalMetaId
  router.push({
    name: 'talkAtMe',
    params: {
      channelId: targetId,
    },
  })
}

function editBg() {
  return ElMessage.info(i18n.t('Comming Soon'))
}

function toChat() {
  // 使用 globalMetaId 进行私聊跳转
  const targetId = userInfo.val?.globalMetaId
  router.push(`/talk/channels/@me/${targetId}`)
}

Promise.all([getUserInfo(), getUserFoller(), checkUserIsFollowed()]).then(() => {
  isSkeleton.value = false
})
</script>

<style lang="scss" scoped src="./User.scss"></style>
