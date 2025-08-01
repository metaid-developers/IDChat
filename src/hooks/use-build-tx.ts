import { createGlobalState } from '@vueuse/core'
import { computed, type Ref, ref } from 'vue'
import { API_NET, API_TARGET, Wallet,TxComposer,mvc, } from 'meta-contract'
import { useUserStore } from "@/stores/user";
import {createScriptForMvc} from '@/lib/pin'

export const useBulidTx = createGlobalState(() => {
    const userStore=useUserStore()
    
    const address = computed(()=>{
        return new mvc.Address(userStore.last?.address)
    })
    const rootAddress=computed((()=>{
        return userStore.last?.address
    }))
  // actions
  // const createPin = async(metaidData:any) => {
   
  //   try {
  //      const transactions=[] 
  //      const pinTxComposer = new TxComposer()
  //       pinTxComposer.appendP2PKHOutput({
  //       address: address.value,
  //       satoshis: 1,
  //       })
  //       const pinScript = createScriptForMvc(metaidData)
  //       pinTxComposer.appendOpReturnOutput(pinScript)
  //       transactions.push({
  //       txComposer: pinTxComposer,
  //       message: 'Create Pin',
  //       })

  //       await window.metaidwallet.pay({
  //         txComposer:
  //       })


  //   } catch (error) {
        
  //   }
  // }



  return {
    
   
  }
})