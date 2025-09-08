<template>
  <div
    class="h-full flex flex-v proposal-index"
    v-infinite-scroll="getMore"
    :infinite-scroll-immediate="false"
    :infinite-scroll-distance="100"
    :infinite-scroll-disabled="!isMobile"
  >
    <ElSkeleton :loading="isSkeleton" animated>
      <div class="pool-msg">
        <div class="title">
          {{ $t('DAO.Stake Title1') }} ${{
            talk.activeCommunity?.dao?.governanceSymbol.toUpperCase()
          }}
          {{ $t('DAO.Stake Title2') }}
        </div>
        <div class="list flex flex-align-center">
          <div class="pool-msg-item-wrap flex1">
            <div class="pool-msg-item flex1">
              <div class="lable">
                {{ $t('DAO.Your staked SPACE') }}
                ${{ talk.activeCommunity?.dao?.governanceSymbol.toUpperCase() }}
              </div>
              <div class="value flex flex-align-center">
                {{ userStake.val!.lockedTokenAmount ?  $filters.space(userStake.val!.lockedTokenAmount) : '--' }}
                <a
                  class="main-border primary"
                  @click="
                    () => {
                      stakeType = StakeType.Unlock
                      isShowStake = true
                    }
                  "
                  v-if="userStake.val!.lockedTokenAmount && userStake.val!.lockedTokenAmount !== '0'"
                  >{{ $t('DAO.UnLock') }}</a
                >
              </div>
            </div>
            <div class="pool-msg-item flex1">
              <div class="lable ">
                {{ $t('DAO.Unlock Token') }}
                ${{ talk.activeCommunity?.dao?.governanceSymbol.toUpperCase() }}
              </div>
              <div class="value flex flex-align-center">
                {{ unlockTokenAmount ? $filters.space(unlockTokenAmount) : '--' }}
                <a
                  class="main-border primary"
                  @click="
                    () => {
                      isShowExtractModal = true
                    }
                  "
                  v-if="userStake.val!.unlockingTokens.length"
                  >{{ $t('DAO.Extract') }}</a
                >
              </div>
            </div>

            <div class="pool-msg-item flex1">
              <div class="lable">
                {{ $t('DAO.pool_total_amout SPACE') }}
                ${{ talk.activeCommunity?.dao?.governanceSymbol.toUpperCase() }}
              </div>
              <div class="value flex flex-align-center">
                {{ userStake.val!.poolTokenAmount ?  $filters.space(userStake.val!.poolTokenAmount) : '--' }}
              </div>
            </div>

            <div class="pool-msg-item flex1">
              <div class="lable">
                {{ $t('DAO.Selft_stake_rate SPACE') }}
              </div>
              <div class="value flex flex-align-center">{{ selfStakeRate }}&nbsp;%</div>
            </div>
          </div>

          <div class="main-border primary stake" @click="showStakeDialog">
            {{ $t('DAO.Stake') }}
          </div>
        </div>
      </div>

      <div class="header flex flex-align-center">
        <div class="flex1">
          <span class="title">{{ $t('DAO.Proposal') }}</span>
        </div>
        <a
          v-if="createProposalWhiteList"
          class="main-border primary"
          @click="toCreate"
          v-loading="loading"
          >{{ $t('DAO.New Proposal') }}</a
        >
      </div>

      <div
        class="proposal-list flex1"
        v-infinite-scroll="getMore"
        :infinite-scroll-immediate="false"
        :infinite-scroll-distance="100"
        :infinite-scroll-disabled="isMobile"
      >
        <RouterLink
          to=""
          class="proposal-item"
          v-for="item in proposals"
          :key="item._id"
          @click="checkPermissionToDetail(item)"
        >
          <!-- top -->
          <div class="top flex flex-align-center">
            <div class="flex1 flex flex-align-center">
              <ElSkeleton :loading="!users.some(_item => _item.address === item.creator)">
                <template #template>
                  <span class="user flex flex-align-center">
                    <ElSkeletonItem :variant="'image'" class="avatar" />
                    <span><ElSkeletonItem :variant="'text'" class="avatar"/></span>
                  </span>
                </template>
                <span class="user flex flex-align-center">
                  <UserAvatar
                    :meta-id="users.find(_item => _item.address === item.creator)!.metaId"
                    :image="users.find(_item => _item.address === item.creator)!.avatarImage"
                    :meta-name="users.find(_item => _item.address === item.creator)!.metaName"
                    :name="users.find(_item => _item.address === item.creator)!.name"
                  />
                  <span
                    ><UserName
                      :name="users.find(_item => _item.address === item.creator)!.name"
                      :meta-name="users.find(_item => _item.address === item.creator)!.metaName"
                      :no-tag="true"
                  /></span>
                </span>
              </ElSkeleton>
            </div>
            <span v-if="item?.infos?.stakeHolderOnly" class="visible-status">
              {{ $t('DAO.Vote stake_holder_only') }}
            </span>
            <span
              class="status"
              :class="getStatusClass(item.beginBlockTime, item.endBlockTime, blockTimeStamp)"
              >{{ getStatusText(item.beginBlockTime, item.endBlockTime, blockTimeStamp) }}</span
            >
          </div>

          <div class="title">{{ item.title }}</div>

          <div class="content">
            {{ replaceMarkdownTag(item.desc) }}
          </div>

          <div class="bottom flex flex-align-center">
            <span class="time flex1 flex flex-align-center"
              ><Icon name="calendar_days" />
              {{ $filters.dateTimeFormat(item.createTime * 1000) }}</span
            >
            <span class="txid flex flex-align-center" @click.stop="tx($event, item.txid)"
              ><Icon name="link" /> {{ item.txid?.slice(0, 6) }}</span
            >
          </div>
        </RouterLink>

        <LoadMore :pagination="pagination" v-if="proposals.length" />
        <IsNull v-else />
      </div>

      <StakeModal v-model="isShowStake" :type="stakeType" @success="getUserStakeInfo" />

      <ExtractModal v-model="isShowExtractModal" @success="getUserStakeInfo" />
    </ElSkeleton>
  </div>
</template>

<script setup lang="ts">
import { initPagination } from '@/config'
import { computed, reactive, ref, watch } from 'vue'
import LoadMore from '@/components/LoadMore/LoadMore.vue'
import IsNull from '@/components/IsNull/IsNull.vue'
import { checkUserLogin, getBalance, getUserInfoByAddress } from '@/utils/util'
import { useRouter } from 'vue-router'
import { GetBlockTime, GetUserStakeInfo, Proposals } from '@/api/dao'
import { useTalkStore } from '@/stores/talk'
import { ProposalItem } from '@/@types/api/dao'
import { useI18n } from 'vue-i18n'
import { checkUserCanCreateProposal, getStatusClass, getStatusText } from '@/utils/DAO'
import { useUserStore } from '@/stores/user'
import  type { DAOUserStakeInfo } from '@/@types/api/dao.d'
import Decimal from 'decimal.js-light'
import StakeModal from '../components/StakeModal.vue'
import { tx } from '@/utils/util'
import { Chains, StakeType } from '@/enum'
import ExtractModal from '../components/ExtractModal.vue'
import { isMobile } from '@/stores/root'
import { replaceMarkdownTag } from '@/utils/util'
import { space } from '@/utils/filters'
import { GetBandProposalList } from "@/api/strapi";
import {useRootStore} from '@/stores/root'
const pagination = reactive({ ...initPagination })
const proposals: ProposalItem[] = reactive([])
const isSkeleton = ref(true)
const router = useRouter()
const talk = useTalkStore()
const i18n = useI18n()
const now = new Date().getTime()
const userStore = useUserStore()
const root=useRootStore()
const stakeType = ref(StakeType.Pledge)
const users: UserAllInfo[] = reactive([])

const userStake: { val: DAOUserStakeInfo | null } = reactive({ val: null })
const isShowStake = ref(false)
const isShowExtractModal = ref(false)
const blockTimeStamp = ref(0)

const loading = ref(false)

const createProposalWhiteList=computed(()=>{
  return userStore.user?.metaId == `1f983cc536a5378952e7977c7dda26db52e1804c8d95efa4820144d6e823f5c9`
})

function showStakeDialog() {

  stakeType.value = StakeType.Pledge
  isShowStake.value = true
}

function checkPermissionToDetail(proposal: ProposalItem) {


  if (
     (proposal.infos.stakeHolderOnly &&
      new Decimal(userStake.val?.lockedTokenAmount ? userStake.val.lockedTokenAmount : 0).div(10 ** 8).toNumber() <
      +import.meta.env.VITE_STAKEHOLDER_ONLY_LIMIT )
      ) {
      return  ElMessage.error(i18n.t('DAO.NOt Have Voting Quota_more_than_1_spaces'))
      } else {
      router.push({
      name: 'talkDAOProposalDetail',
        params: { id: proposal._id},
      })
      }

}

function getDatas(isCover = false) {
  return new Promise<void>(async (resolve, reject) => {


    let res = await Proposals({
      symbol: `${talk.activeCommunity!.dao!.governanceSymbol}_${talk.activeCommunity!.dao!.daoId}`,
      limit: pagination.pageSize,
      offset: (pagination.page - 1) * pagination.pageSize
    }).catch(error => {
      ElMessage.error(error.message)
    })

    if (res) {
      if (isCover) proposals.length = 0
      if (res.length) {
         const bandList = await GetBandProposalList()
        res=res.filter((item)=> !bandList[0].vote_id.includes(item.voteID))
       // res = res.filter((item) => !root.bandProposalList.includes(item.voteID))

        proposals.push(...res)
        pagination.nothing = false
        setTimeout(() => {
          for (let i = 0; i < res!.length; i++) {
            if (typeof res[i].creator === 'string' && !users.some(item => item.address === res[i]!.creator)){
              getUserInfoByAddress(res[i]!.creator).then(user => {
                
                users.push(user)
              })
            }
          }
        }, 0)
      } else {
        pagination.nothing = true
      }
      resolve()
    }
  })
}

function getMore() {
  if (pagination.nothing || pagination.loading) return
  pagination.loading = true
  pagination.page++
  getDatas().then(() => {
    pagination.loading = false
  })
}

async function toCreate() {


  if (loading.value) return
  await checkUserLogin()
  loading.value = true

  const result = await checkUserCanCreateProposal().catch(() => {loading.value = false})
  if (result) {
    loading.value = false
    router.push({
      name: 'talkDAOProposalCreate',
    })
  }
}

function getUserStakeInfo() {
  return new Promise<void>(async (resolve, reject) => {

    const res = await GetUserStakeInfo({
      symbol: `${talk.activeCommunity!.dao!.governanceSymbol}_${talk.activeCommunity!.dao!.daoId}`,
      address:userStore.user!.address!,
    })
    if (res.code === 0) {
      userStake.val = res.data
      resolve()
    }
  })
}

const selfStakeRate = computed(() => {
  if (userStake.val!.lockedTokenAmount) {
    const rate=new Decimal(userStake.val!.lockedTokenAmount).div(userStake.val!.poolTokenAmount).mul(100).toNumber()
    if (rate < 0.01) {
      return `< 0.01`
    } else {
      rate.toFixed(2)
     }
  } else {
    return '0'
  }
})

const unlockTokenAmount = computed(() => {
  let amount = 0
  if (userStake.val) {
    for (let i = 0; i < userStake.val!.unlockingTokens.length; i++) {
      amount = new Decimal(amount).plus(userStake.val!.unlockingTokens[i].amount).toNumber()
    }
  }
  return amount
})

function getLeastBlockTimestamp() {
  return new Promise<void>(async (resolve, reject) => {
    const res = await GetBlockTime().catch(error => {
      ElMessage.error(error.message)
    })
    if (res?.code === 0) {
      blockTimeStamp.value = res.data * 1000
      resolve()
    }
  })
}

let watchFun: any
watchFun = watch(() => talk.activeCommunity, (result) => {
  if (result) {
    if (watchFun) watchFun()
    getLeastBlockTimestamp().then(() => {
      Promise.all([getDatas(true), getUserStakeInfo()]).then(() => {
        isSkeleton.value = false
      })
    })
  }
}, {
 immediate: true
})
</script>

<style lang="scss" scoped src="./Index.scss"></style>
