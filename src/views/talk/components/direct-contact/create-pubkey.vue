<template>
  <div
    class="p-3 flex w-full items-center  overflow-x-hidden lg:hover:bg-gray-200 lg:hover:dark:bg-gray-900 cursor-pointer"
    :class="{ 'bg-gray-200 dark:bg-gray-900': '' }"
  >
    <div class="text-sm h-12  w-full font-medium  flex items-center ">
      <el-icon color="#EBA51A" :size="30" class="mr-2  "><WarningFilled /></el-icon>
      <div class="flex w-full items-center justify-between">
        <span class="mr-2 ">{{
          needModifyPubkey ? $t('modify_pubkey') : $t('approve_private')
        }}</span>
        <div
          @click="createPubkeyNode"
          class="px-1.5 py-1 text-center  text-white bg-[#EBA51A] text-sm rounded-2xl hover:opacity-90"
        >
          {{ $t('confirm') }}
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useCredentialsStore } from '@/stores/credentials'
import { useUserStore } from '@/stores/user'
import { createUserPubkey } from '@/utils/userInfo'
import { WarningFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import { getEcdhPublickey } from '@/wallet-adapters/metalet'
import { useEcdhsStore } from '@/stores/ecdh'
import { GetUserEcdhPubkeyForPrivateChat } from '@/api/talk'
import { useRootStore } from '@/stores/root'
// const credentialsStore=useCredentialsStore()
interface Props {
  needModifyPubkey: boolean
}

const props = withDefaults(defineProps<Props>(), {
  needModifyPubkey: false,
})

const emit = defineEmits(['update:needModifyPubkey'])
const userStore = useUserStore()
const rootStore = useRootStore()
const i18n = useI18n()
const ecdhsStore = useEcdhsStore()
async function createPubkeyNode() {
  try {
    // const credential=credentialsStore.get
    const ecdh = await getEcdhPublickey()
    if (!ecdh.ecdhPubKey) {
      return ElMessage.error(`${i18n.t('get_ecdhPubkey_fail')}`)
    }
    const getChatPublickey = await GetUserEcdhPubkeyForPrivateChat(userStore.last.globalMetaId)

    const txid = await createUserPubkey({
      pubkey: ecdh?.ecdhPubKey,
      pubkeyId: getChatPublickey?.chatPublicKeyId,
      options: {
        feeRate: 1,
        network: 'mainnet',
        assistDomain: 'https://www.metaso.network/assist-open-api',
      },
    })
    if (txid) {
      // const newEcdh=await getEcdhPublickey()
      //  ecdhsStore.insert(ecdh,ecdh?.externalPubKey)
      userStore.updateUserInfo({
        chatpubkey: ecdh?.ecdhPubKey, //credential.publicKey
      })
      rootStore.updateShowCreatePubkey(false)
      if (props.needModifyPubkey) {
        emit('update:needModifyPubkey', false)
      }
      ElMessage.success(`${i18n.t('privite_chat_success')}`)
    }
  } catch (error) {
    return ElMessage.error(error.toString())
  }
}
</script>
<style lang="scss" scoped></style>
