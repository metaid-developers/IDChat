import { createGlobalState } from '@vueuse/core'
import { computed, type Ref, ref } from 'vue'
import { API_NET, API_TARGET, Wallet,TxComposer,mvc, } from 'meta-contract'
import { useUserStore } from "@/stores/user";
import {createScriptForMvc} from '@/lib/pin'
import { useNetworkStore } from '@/stores/network';


export enum MetaFlag{
 metaid='metaid',
  testid='testid'
}

export enum Operation{
 create='create',
  init='init',
   modify='modify',
  revoke='revoke',
   hide='hide',
}



export enum Encryption{
  nonEncrypt=0,
  Encrypt=1
}

export type MetaIdData = {
  body?: any
  path?: string
  flag:MetaFlag
  version?: string
  operation: "create" | "init" | "modify" | "revoke" | "hide"
  contentType?: string
  encryption?:Encryption
  encoding: BufferEncoding
}

export const useBulidTx = createGlobalState(() => {
    const userStore=useUserStore()
    const networkStore=useNetworkStore()
    const address = computed(()=>{
        return new mvc.Address(userStore.last?.address)
    })
    const rootAddress=computed((()=>{
        return userStore.last?.address
    }))
  // actions
  const createPin = async(metaidData:MetaIdData) => {
   
    try {
       const transactions=[] 
       const pinTxComposer = new TxComposer()
        pinTxComposer.appendP2PKHOutput({
        address: address.value,
        satoshis: 1,
        })
        const pinScript = createScriptForMvc(metaidData)
        pinTxComposer.appendOpReturnOutput(pinScript)
        transactions.push({
        txComposer: pinTxComposer,
        message: 'Create Pin',
        })

        const payedTransactions= await window.metaidwallet.pay(transactions,true)



        debugger
        return payedTransactions


    } catch (error) {
        
    }
  }

  const createShowMsg=async(params:{
    body:any,
    protocol:string
  })=>{
    const {body,protocol}=params
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation: Operation.create,
        contentType: 'text/plain',
        encryption: Encryption.nonEncrypt,
        encoding: 'utf-8',
      }

       await createPin(metaidData)

    } catch (error) {
      
    }
  }

  // const txBroadcast = async( txComposer:string, isBroadcast:boolean=false)=>{
  //     const txComposerObj=TxComposer.deserialize(txComposer)
  //     const network=networkStore.isTestnet ? API_NET.TEST : API_NET.MAIN
  //     const txHex = txComposerObj.getTx().toString()
  //     let txid,hex
  //     if(isBroadcast){
  //       txid=await broadcast(txHex,'mvc',network)
  //     }else{
  //         txid=txComposerObj.getTxId()
  //         hex=txComposerObj.getRawHex()
  //     }

  //     return {
  //         txid,
  //         hex
  //     }


  // }



  return {
    createPin
   
  }
})