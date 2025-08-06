import { createGlobalState } from '@vueuse/core'
import { computed, type Ref, ref } from 'vue'
import { API_NET, API_TARGET, Wallet,TxComposer,mvc, } from 'meta-contract'
import { useUserStore } from "@/stores/user";
import {createScriptForMvc} from '@/lib/pin'
import { useNetworkStore } from '@/stores/network';
import {broadcast} from '@/api/metalet'
import { ElMessage } from 'element-plus'
import { useConnectionStore } from '@/stores/connection';
import {SERVICE_ADDRESS,SERVICE_FEE} from '@/data/constants'
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
  nonEncrypt="0",
  Encrypt="1"
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
    const connectionStore=useConnectionStore()
    const address = computed(()=>{
        return new mvc.Address(userStore.last?.address)
    })
    const rootAddress=computed((()=>{
        return userStore.last?.address
    }))
  // actions
  const createPin = async(metaidData:MetaIdData,isBroadcast=true,needService:boolean=true) => {
    
    try {
       const transactions=[] 
       const pinTxComposer = new TxComposer()
        pinTxComposer.appendP2PKHOutput({
        address: address.value,
        satoshis: 1,
        })
        const pinScript = createScriptForMvc(metaidData)
        
        pinTxComposer.appendOpReturnOutput(pinScript)

        if(needService){
        pinTxComposer.appendP2PKHOutput({
        address: new mvc.Address(SERVICE_ADDRESS,import.meta.env.VITE_NET_WORK),
        satoshis: SERVICE_FEE,
        })
        }
        
        transactions.push({
        txComposer: pinTxComposer.serialize(),
        message: 'Create Pin',
        })
       
        
        const {payedTransactions}= await connectionStore.adapter.pay({
          transactions:transactions,
          hasMetaid:true
        })

        if(!payedTransactions){
          return null
        }
        
        const txIDs=await txBroadcast(payedTransactions,isBroadcast)
        console.log("txIDs",txIDs)
        
        
        return txIDs


    } catch (error) {
      
         throw new Error((error as any).message)
    }
  }

  const createShowMsg=async(params:{
    body:any,
    protocol:string,
    isBroadcast:boolean
  })=>{
    const {body,protocol,isBroadcast}=params
    
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation: Operation.create,
        contentType: 'text/plain',
        encryption: body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      return pinRes

    } catch (error) {
     
      throw new Error(error as any)
    }
  }

   const createChannel=async(params:{
    body:any,
    protocol:string,
    isBroadcast:boolean
  })=>{
    const {body,protocol,isBroadcast}=params
    
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation: Operation.create,
        contentType: 'text/plain',
        encryption: body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      return pinRes

    } catch (error) {
     
      throw new Error(error as any)
    }
  }

  const txBroadcast = async( txComposers:string[], isBroadcast:boolean=false)=>{
      try {
          const network=networkStore.isTestnet ? API_NET.TEST : API_NET.MAIN
         let txids=[]
         let hexS=[]
        for(let txComposer of txComposers){
             const txComposerObj=TxComposer.deserialize(txComposer)
  
            const txHex = txComposerObj.getTx().toString()
               if(isBroadcast){
              let res=await broadcast(txHex,'mvc',network)
              txids.push(res)
      }else{
          let txid=txComposerObj.getTxId()
          let hex=txComposerObj.getRawHex()
          txids.push(txid)
          hexS.push(hex)
      }
        }
   
      return {
          txids,
          hexS
      }

      } catch (error) {
        throw new Error(error as any)
      }

  }



  return {
    createPin,
    createShowMsg,
    createChannel,
    txBroadcast
   
  }
})