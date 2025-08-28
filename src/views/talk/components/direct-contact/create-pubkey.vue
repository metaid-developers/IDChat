<template>
    <div
    class="p-3 flex w-full items-center space-x-3 overflow-x-hidden lg:hover:bg-gray-200 lg:hover:dark:bg-gray-900 cursor-pointer"
    :class="{ 'bg-gray-200 dark:bg-gray-900': '' }"
            @click="createPubkeyNode"
  >
    <div class="text-sm font-medium max-w-[230PX] flex items-center">
        <el-icon color="#EBA51A" :size="30" class="mr-2"><WarningFilled /></el-icon>
        <span>点击此菜单马上开通私聊功能，私聊未开通会导致无法接收他人发送给你的私聊信息</span>
    </div>
  
  </div>
</template>
<script setup lang='ts'>
import { useCredentialsStore } from '@/stores/credentials'
import { useUserStore } from '@/stores/user'
import {createUserPubkey} from '@/utils/userInfo'
import { WarningFilled } from '@element-plus/icons-vue'
import { useI18n } from 'vue-i18n'
import {getEcdhPublickey} from '@/wallet-adapters/metalet'

const credentialsStore=useCredentialsStore()
const userStore=useUserStore()
const i18n=useI18n()
async function createPubkeyNode() {
    debugger
  try {
    const credential=credentialsStore.get
    const ecdh=await getEcdhPublickey(credential.publicKey)
    debugger
    const txid= await createUserPubkey({
        pubkey:ecdh.ecdhPubKey,
        options: {
        feeRate: 1,
        network: 'mainnet',
        assistDomain: 'https://www.metaso.network/assist-open-api',
      },
  })
  if(txid){
       userStore.updateUserInfo({
        pubkey:credential.publicKey
    })
    ElMessage.success(`${i18n.t('privite_chat_success')}`)
  }
 
  } catch (error) {
    debugger
  }
}

</script>
<style lang='scss' scoped>



</style>