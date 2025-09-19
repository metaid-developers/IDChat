<template>
  <el-popover
    placement="bottom"
    title=""
    :width="200"
    trigger="click"
    content="this is content, this is content, this is content"
  >
    <template #reference>
      <div
        class="flex items-center py-1 lg:py-2 group cursor-pointer hover:bg-dark-200 hover:dark:bg-gray-900 px-4"
        @click="messageThisGuy"
      >
        <!--member.avatarType-->
        <UserAvatar
          :name="member.userInfo.name"
          :type="'metaId'"
          :meta-id="member.userInfo.metaid"
          :image="member.userInfo.avatar"
          :meta-name="''"
          :image-class="'w-9 h-9'"
          class="shrink-0"
        />
        <div class="ml-2 flex flex-col gap-y-px">
          <UserName :name="member.userInfo.name" :meta-name="''" class="max-w-[160PX] text-sm" />
          <div class="text-xxs text-dark-300 dark:text-gray-400" v-if="member.userInfo.metaid">
            MetaID: {{ member.userInfo.metaid.substring(0, 6) }}
          </div>
        </div>
      </div>
    </template>
    <div>
      <el-button :icon="Promotion" text type="info">
        {{ $t('Talk.Channel.SendMessage') }}
      </el-button>
      <div class="my-2" v-if="isCurrentUserCreator" />
      <el-popconfirm
        width="220"
        :icon="InfoFilled"
        icon-color="red"
        :title="`Are you sure to remove this user ${member.userInfo.name}?`"
        @cancel="onCancel"
        @confirm="onConfirm"
        v-if="isCurrentUserCreator"
      >
        <template #reference>
          <el-button :icon="Remove" text type="danger">
            {{ $t('Talk.Channel.RemoveUser') }}
          </el-button>
        </template>
        <template #actions="{ confirm, cancel }">
          <el-button size="small" @click="cancel">No!</el-button>
          <el-button type="danger" size="small" :disabled="!clicked" @click="confirm">
            Yes?
          </el-button>
        </template>
      </el-popconfirm>
    </div>
  </el-popover>
</template>
<script lang="ts" setup>
import { ChatChain } from '@/enum'
import { useChainStore } from '@/stores/chain'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import { createPinWithBtc } from '@/utils/pin'
import { createPin } from '@/utils/userInfo'
import { InfoFilled, Promotion, Remove } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const chainStore = useChainStore()
const clicked = ref(false)
function onCancel() {
  clicked.value = true
}

// import UserName from

const props = defineProps(['member', 'createUserMetaId', 'groupId'])
const emit = defineEmits(['updated'])
const simpleTalk = useSimpleTalkStore()
const router = useRouter()

const isYou = computed(() => {
  return props.member.userInfo.metaid === simpleTalk.selfMetaId
})

const popMemberMenu = () => {
  if (isYou.value) return
}

const isCurrentUserCreator = computed(() => {
  return (
    props.createUserMetaId === userStore.last?.metaid &&
    props.member.userInfo.metaid !== userStore.last?.metaid
  )
})

const onConfirm = async () => {
  clicked.value = false
  console.log('delete user', props.member.userInfo.metaid)
  // TODO: implement delete user logic
  console.log('confirm!')

  try {
    const data = {
      removeMetaid: props.member.userInfo.metaid,
      groupId: props.groupId,
      reason: '',
      timestamp: Math.floor(Date.now() / 1000),
    }

    const metaidData = {
      body: JSON.stringify(data),
      path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/simplegroupremoveuser`,
      flag: 'metaid',
      version: '1.0.0',
      operation: 'create',
      contentType: 'application/json',
      encryption: '0',
      encoding: 'utf-8',
    }

    const currentChain = chainStore.state.currentChain
    const chainData = chainStore.state[currentChain]
    const selectedFeeType = chainData.selectedFeeType
    const feeRate = chainData[selectedFeeType]
    if (currentChain === ChatChain.btc) {
      const txIDs = await createPinWithBtc({
        inscribeDataArray: [metaidData],
        options: {
          network: 'mainnet',
          noBroadcast: 'no',
          feeRate: feeRate,
        },
      })
    } else {
      const { txids } = await createPin(metaidData, {
        network: 'mainnet',
        signMessage: 'update Group Info',
        serialAction: 'finish',
        feeRate: feeRate,
      })
    }
    ElMessage.success('delete success')
    emit('updated', props.member.userInfo.metaid)
  } catch (error) {
    ElMessage.error((error as any).message || 'delete failed')
  }
}

const messageThisGuy = () => {
  return
  // 如果是自己，就不要发消息了
  if (isYou.value) return

  const memberMetaId = props.member.userInfo.metaid
  router.push('/talk/channels/@me/' + memberMetaId)
}
</script>
<style lang=""></style>
