<template>
    <div
    class="p-3 flex w-full  overflow-x-hidden lg:hover:bg-gray-200 lg:hover:dark:bg-gray-900 cursor-pointer"
    :class="{ 'bg-gray-200 dark:bg-gray-900': '' }"
           
  >
    <div class="text-sm lg:max-w-[230PX]  font-medium  flex items-center justify-between">
        <el-icon  color="#EBA51A" :size="30" class="mr-2  "><WarningFilled /></el-icon>
       <div class="flex  items-center justify-between">
         <span class="mr-2 ">{{ $t('approve_private') }}</span>
        <div  @click="createPubkeyNode" class="px-1.5 py-1 text-center  text-white bg-[#EBA51A] text-sm rounded-2xl hover:opacity-90">{{ $t('confirm') }}</div>
       </div>
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

// const credentialsStore=useCredentialsStore()
const userStore=useUserStore()
const i18n=useI18n()
async function createPubkeyNode() {
    
  try {
   // const credential=credentialsStore.get
    const ecdh=await getEcdhPublickey()
    if(!ecdh.ecdhPubKey){
      return ElMessage.error(`${i18n.t('get_ecdhPubkey_fail')}`)
    }
    
    const txid= await createUserPubkey({
        pubkey:ecdh?.ecdhPubKey,
        options: {
        feeRate: 1,
        network: 'mainnet',
        assistDomain: 'https://www.metaso.network/assist-open-api',
      },
  })
  if(txid){
       userStore.updateUserInfo({
        chatpubkey:ecdh?.ecdhPubKey//credential.publicKey
    })
    ElMessage.success(`${i18n.t('privite_chat_success')}`)
  }
 
  } catch (error) {
    
  }
}

</script>
<style lang='scss' scoped>



</style>