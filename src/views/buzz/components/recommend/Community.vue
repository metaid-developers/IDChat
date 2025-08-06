<template>
  <!-- 推荐社区 communitys.length-->
  <div class="recommend-section" v-if="false">
    <div class="title flex">
      <span>{{ $t('Buzz.Referral Community') }}</span>
      <!-- <div class="switch-wrap">
        <span>{{ $t('Buzz.showDiffLang') }}</span>
        <el-switch v-model="showDifferentLang" @change="changeDifflang" />
      </div> -->
    </div>

    <div class="cont">
      <div class="communitys">
        <div class="follow-list">
          <CardVue class="follow-item" v-for="(item, index) in communitys" :key="item.communityId">
            <div class="follow-item-warp card flex">
              <div class="community-cover">
                <span class="radius"></span>
                <Image :src="item.cover ? item.cover : item.icon" :default-image="DefaultImage" />
                <Icon name="emb" />
              </div>
              <div class="flex1">
                <div class="name flex flex-align-center">
                  <span>{{ item.name }} </span>
                  <Icon name="down" />
                </div>

                <div class="people flex flex-align-center">
                  <Icon name="people" /> {{ item.memberTotal }}
                </div>

                <div class="operate flex flex-align-center flex-pack-end">
                  <a
                    class="main-border primary"
                    :class="{ disabled: loading.includes(true), faded: item.isMyJoin }"
                    @click="join(item, index)"
                  >
                    <template v-if="loading[index]">
                      <ElIcon class="is-loading">
                        <Loading />
                      </ElIcon>
                    </template>
                    <template v-else>{{ item.isMyJoin ? $t('Joined') : $t('Join') }}</template>
                  </a>
                </div>
              </div>
            </div>
          </CardVue>
        </div>
        <div class="refresh flex flex-pack-center">
          <a class="flex flex-align-center" @click="exchange">
            <Icon name="exchange" />
            {{ $t('Buzz.RecommendContent.Change batch') }}
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { GetRecommendCommunitys } from '@/api/aggregation'
import { initPagination } from '@/config'
import { useUserStore } from '@/stores/user'
import { reactive, ref, watch, computed, watchEffect } from 'vue'
import CardVue from '@/components/Card/Card.vue'
import { Loading } from '@element-plus/icons-vue'
import { NodeName } from '@/enum'
import { useI18n } from 'vue-i18n'
import { useTalkStore } from '@/stores/talk'
import { sleep } from '@/utils/util'
import DefaultImage from '@/assets/icons/photo_3.svg?url'
import { ElMessage } from 'element-plus'
import { useRootStore } from '@/stores/root'

const pagination = reactive({ ...initPagination, pageSize: 10, totalPages: 1 })
const userStore = useUserStore()
const talkStore = useTalkStore()
const rootStore = useRootStore()
const i18n = useI18n()
const showDifferentLang = ref(Boolean(Number(localStorage.getItem('showDiffLang'))))
// function changeDifflang(val: boolean | string | number) {
//   if (val) {
//     showDifferentLang.value = Boolean(1)
//     rootStore.updateShowDiffLang(1)
//   } else {
//     showDifferentLang.value = Boolean(0)
//     rootStore.updateShowDiffLang(0)
//   }
// }
watch(
  () => userStore.isAuthorized,
  val => {
    if (val) {
      //getRecommendCommunitys()
    }
  }
)

const communitys: recommnedCommunity[] = reactive([])

const loading: boolean[] = reactive([])

function getRecommendCommunitys() {
  return new Promise<void>(async (resolve, reject) => {
    const res = await GetRecommendCommunitys({
      metaId: userStore.last?.metaid,
      ...pagination,
    })
    if (res.code === 0) {
      console.log('res', res)
      // const tempItem = [
      //   {
      //     communityId: `5325a20b05f135ed4e945387538506d04b15799c6f72672b37551d36df69ac1a`,
      //     cover: '',
      //     description: 'Test_mvc',
      //     icon: '',
      //     memberTotal: 10,
      //     name: 'Test_mvc',
      //     isMyJoin: false,
      //   },
      // ]
      pagination.totalPages = Math.ceil(res.data.total / pagination.pageSize)
      communitys.length = 0
      communitys.push(...res.data.results.items)
      resolve()
    }
  })
}

async function join(item: recommnedCommunity, index: number) {
  // if (userStore.metaletLogin) {
  //   return ElMessage.error(`${i18n.t('not allow_join_commutity')}`)
  // }
  if (loading.includes(true) || item.isMyJoin) return
  loading[index] = true
  const res = await userStore.showWallet
    .createBrfcChildNode({
      nodeName: NodeName.SimpleCommunityJoin,
      data: JSON.stringify({
        communityId: item.communityId, //string
        state: 1, //加入状态, number: 1 or -1. 1:in; -1:out
      }),
    })
    .catch(error => {
      ElMessage.error(error.message)
      loading[index] = false
    })

  if (res) {
    sleep(2000).then(() => {
      talkStore.fetchCommunities()
    })
    item.isMyJoin = true
    item.memberTotal = item.memberTotal + 1
    ElMessage.success(i18n.t('Join Success'))
    loading[index] = false
  } else {
    loading[index] = false
  }
}

function exchange() {
  if (pagination.totalPages === 1) return ElMessage.error(i18n.t('None More'))
  if (pagination.page < pagination.totalPages) pagination.page++
  else pagination.page = 1
  getRecommendCommunitys()
}

function refreshDatas() {
  return new Promise<void>(async resolve => {
    pagination.page = 1
    pagination.loading = false
    pagination.nothing = false
    //await getRecommendCommunitys()
    resolve()
  })
}

defineExpose({
  refreshDatas,
})

getRecommendCommunitys()
</script>

<style lang="scss" scoped src="./Community.scss"></style>
