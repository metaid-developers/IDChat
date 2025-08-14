<template>
  <BaseModal
    v-model="layout[ShowControl.isShowCreateCommunityModal]"
    v-model:show-second-control="layout[ShowControl.isShowChooseMetaNameModal]"
  >
    <template #title>
      {{ $t('Talk.Community.create') }}
    </template>

    <template #body>
      <CreateCommunityModalContentP1 v-if="step === 1" @forward="step = 2" />
      <CreateCommunityModalContentP2
        v-else-if="step === 2"
        @back="step = 1"
        @try-create-community="tryCreateCommunity"
      />
    </template>

    <template #secondTitle>
      <div class="flex items-center space-x-3">
        <div class="text-left">{{ $t('Talk.Modals.choose_meta_name') }}</div>
      </div>
    </template>

    <template #secondBody>
      <CreateCommunityModalContentP3 />
    </template>
  </BaseModal>
</template>

<script lang="ts" setup>
import { getCommunities } from '@/api/talk'
import { ShowControl } from '@/enum'
import { useCommunityFormStore } from '@/stores/forms'
import { useJobsStore } from '@/stores/jobs'
import { useLayoutStore } from '@/stores/layout'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import { createCommunity } from '@/utils/talk'
import { sleep } from '@/utils/util'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import BaseModal from '../BaseModal.vue'
import CreateCommunityModalContentP1 from './CreateP1.vue'
import CreateCommunityModalContentP2 from './CreateP2.vue'
import CreateCommunityModalContentP3 from './CreateP3.vue'

const step = ref(1)
const form = useCommunityFormStore()
const jobs = useJobsStore()
const layout = useLayoutStore()

const userStore = useUserStore()
const router = useRouter()
const talk = useTalkStore()

const fetchCommunities = async () => {
  const selfMetaId = userStore.user?.metaId
  if (!selfMetaId) return
  const communities = await getCommunities({ metaId: selfMetaId })

  talk.$patch(state => {
    state.communities = [...communities, talk.atMeCommunity]
  })
}

const tryCreateCommunity = async () => {
  if (!form.isFinished) return

  // function* createCommunityJob() {
  //   const { communityId } = yield createCommunity(form, userStore, userStore.showWallet)
  //   console.log({ communityId })
  //   return router.push(`/talk/channels/${communityId}/index`)
  // }

  // const job = createCommunityJob()
  // jobs.push(job)

  layout.isShowCreateCommunityModal = false
  layout.isShowLoading = true
  try {
    const { communityId } = await createCommunity(form, userStore, userStore.showWallet)
    await sleep(2000)
    //await fetchCommunities()
    layout.isShowLoading = false
    form.reset()

    router.push(`/talk/channels/${communityId}/index`)

    return
  } catch (error) {
    ElMessage.error(error as any)
    layout.isShowCreateCommunityModal = true
    layout.isShowLoading = false
  }
}
</script>
