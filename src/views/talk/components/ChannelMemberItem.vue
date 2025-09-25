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
        class="flex items-center justify-between py-1 lg:py-2 group cursor-pointer hover:bg-dark-200 hover:dark:bg-gray-900 px-4"
        @click="messageThisGuy"
      >
        <div class="flex items-center">
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
            <div class="flex flex-row items-center justify-between ">
              <UserName
                :name="member.userInfo.name"
                :meta-name="''"
                class="max-w-[160PX] mr-2 text-sm"
              />
              <Icon :name="getRuleName" class="w-[46px] h-[18px]" v-if="getRuleName"></Icon>
            </div>
            <div class="text-xxs text-dark-300 dark:text-gray-400" v-if="member.userInfo.metaid">
              MetaID: {{ member.userInfo.metaid.substring(0, 6) }}
            </div>
          </div>
        </div>
        <div class="flex items-center" v-if="getRuleIcon">
          <Icon :name="getRuleIcon" class="w-[24px] h-[24px] "></Icon>
        </div>
      </div>
    </template>
    <div>
      <el-button :icon="Promotion" text type="info" @click="toPrivateChat(member)">
        {{ $t('Talk.Channel.SendMessage') }}
      </el-button>

      <div class="my-2" v-if="!isYou && selfPermission.isCreator">
        <div class="flex items-center el-button el-button--info is-text" @click="manageAdmin">
          <Icon name="admin" class="w-[15px] h-[15px] text-dark-300 dark:text-gray-400"></Icon>
          <span class="ml-[5.4px]">
            {{ isAdmin ? $t('Talk.Channel.removeAdmin') : $t('Talk.Channel.SetAdmin') }}
          </span>
        </div>
      </div>

      <div
        class="my-2"
        v-if="
          !isYou && !isOwner && !isAdmin && (selfPermission.isCreator || selfPermission.isAdmin)
        "
      >
        <div class="flex items-center el-button el-button--info is-text" @click="manageWhitelist">
          <Icon name="white_list" class="w-[15px] h-[15px] text-dark-300 dark:text-gray-400"></Icon>
          <span class="ml-[5.4px]">
            {{
              isSpeaker ? $t('Talk.Channel.remove_WhiteList') : $t('Talk.Channel.WhiteList')
            }}</span
          >
        </div>
      </div>

      <div
        class="my-2"
        v-if="
          (!isYou && selfPermission.isCreator) ||
            (!isYou && !isOwner && !isAdmin && (selfPermission.isCreator || selfPermission.isAdmin))
        "
      >
        <el-popconfirm
          width="220"
          :icon="InfoFilled"
          icon-color="red"
          :title="`Are you sure to remove this user ${member.userInfo.name}?`"
          @cancel="onCancel"
          @confirm="onConfirm"
          v-if="!isYou"
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
    </div>
  </el-popover>
</template>
<script lang="ts" setup>
import { ChatChain } from '@/enum'
import { useChainStore } from '@/stores/chain'
import { useSimpleTalkStore } from '@/stores/simple-talk'
// import { useTalkStore } from '@/stores/talk'
import { useUserStore } from '@/stores/user'
import { createPinWithBtc } from '@/utils/pin'
import { createPin } from '@/utils/userInfo'
import { InfoFilled, Promotion, Remove } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { MemberRule, RuleOp } from '@/enum'
import { useI18n } from 'vue-i18n'

const userStore = useUserStore()
const chainStore = useChainStore()
const clicked = ref(false)
const i18n = useI18n()
function onCancel() {
  clicked.value = true
}

// import UserName from

const props = defineProps(['member', 'createUserMetaId', 'groupId', 'role'])
const simpleTalk = useSimpleTalkStore()
const emit = defineEmits(['updated', 'updateUserAdmin', 'updateUserWhiteList', 'toPrivateChat'])
// const talk = useTalkStore()
const router = useRouter()
const route = useRoute()
const isYou = computed(() => {
  return props.member.userInfo.metaid === simpleTalk.selfMetaId
})

// const currentChannelInfo = computed(() => {
//   return simpleTalk.activeChannel
// })

const selfPermission = computed(() => {
  return simpleTalk.getCurrentUserRoleInGroup(props.groupId)
  // return simpleTalk.getMychannelRule(currentChannelInfo.value?.groupId || route.params.groupId as string)
  //return props.selfRule
})

const getRuleName = computed(() => {
  // 优先使用传入的 role 参数，如果没有则使用 member.rule
  const memberRule = props.role !== undefined ? props.role : props.member?.rule

  switch (memberRule) {
    case MemberRule.Owner:
      return 'owner'
    case MemberRule.Admin:
      return 'adminer'
    case MemberRule.Speaker:
      return ''
    case MemberRule.Normal:
      return ''
    default:
      return ''
  }
})

const getRuleIcon = computed(() => {
  // 优先使用传入的 role 参数，如果没有则使用 member.rule
  const memberRule = props.role !== undefined ? props.role : props.member?.rule

  switch (memberRule) {
    case MemberRule.Owner:
      return 'gm'
    case MemberRule.Admin:
      return 'admintor'
    case MemberRule.Speaker:
      return 'speaker'
    case MemberRule.Normal:
      return ''
    default:
      return ''
  }
})

console.log('selfPermission', selfPermission.value)

const isOwner = computed(() => {
  const memberRule = props.role !== undefined ? props.role : props.member?.rule
  return memberRule == MemberRule.Owner
})

const isAdmin = computed(() => {
  const memberRule = props.role !== undefined ? props.role : props.member?.rule
  return memberRule === MemberRule.Admin
})

const isSpeaker = computed(() => {
  const memberRule = props.role !== undefined ? props.role : props.member?.rule
  return memberRule === MemberRule.Speaker
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

function toPrivateChat(message: any) {
  emit('toPrivateChat', props.member)
}

const manageAdmin = () => {
  //检查权限
  if (!selfPermission.value.isCreator) {
    return ElMessage.error(`${i18n.t('Non_permission_set_admin')}`)
  }
  emit('updateUserAdmin', props.member)
}

const manageWhitelist = () => {
  const hasPermission = selfPermission.value.isCreator || selfPermission.value.isAdmin
  if (!hasPermission) {
    return ElMessage.error(`${i18n.t('Non_permission_set_whitelist')}`)
  }
  emit('updateUserWhiteList', props.member)
}

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
