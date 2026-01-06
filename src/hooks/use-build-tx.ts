import { createGlobalState } from '@vueuse/core'
import { computed, type Ref, ref } from 'vue'
import { API_NET, API_TARGET, Wallet,TxComposer,mvc, } from 'meta-contract'
import { useUserStore } from "@/stores/user";
import {createScriptForMvc} from '@/lib/pin'
import { useNetworkStore } from '@/stores/network';
import {broadcast} from '@/api/metalet'
import { ElMessage } from 'element-plus'
import { useConnectionStore } from '@/stores/connection';
import { AttachmentItem } from '@/@types/hd-wallet'
import { NodeName,IsEncrypt } from '@/enum'
import {hexToUint8Array,hexToBase64} from '@/utils/util'
import { getInitUtxo } from "@/api/metaso";
import {useUtxosStore} from '@/stores/useable-utxo'
import {createPinWithAsset} from '@/utils/userInfo'
import { createPinWithBtc, createPinWithDoge, InscribeResultForIfBroadcasting, InscribeResultForNoBroadcast } from "@/utils/pin";
import { useChainStore } from '@/stores/chain';
 import *  as bitcoin from 'bitcoinjs-lib'
 import * as ecc from 'tiny-secp256k1'
import { initEccLib } from 'bitcoinjs-lib'
import i18n from '@/utils/i18n'
import { useLayoutStore } from '@/stores/layout';
import { VITE_ADDRESS_HOST } from '@/config/app-config';
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
  outputs?:{
    address:string,
    value:number
  }[]
}

export const useBulidTx = createGlobalState(() => {
    const userStore=useUserStore()
    const networkStore=useNetworkStore()
    const connectionStore=useConnectionStore()
    const utxoStore=useUtxosStore()
    const address = computed(()=>{
        return new mvc.Address(userStore.last?.address)
    })
    const rootAddress=computed((()=>{
        return userStore.last?.address
    }))
  // actions
  const createPin = async(metaidData:MetaIdData,isBroadcast=true,needSmallpay:boolean=true,payTo:any[]=[],SerialTransactions:any[]=[]) => {
 const layoutStore=useLayoutStore()
    const chainStore=useChainStore()



    try {
      

      if(chainStore.state.currentChain === 'btc'){
        if(payTo.length){
           metaidData.outputs=[];
          for(let item of payTo){
            metaidData.outputs.push({
              address:item.address,
              value:item.amount,
            })
          }
        }
        const inscribeDataArray=[]
        
        if(SerialTransactions.length){
          
          inscribeDataArray.push(...SerialTransactions)
        }
        inscribeDataArray.push(metaidData)
       const options={
         noBroadcast:isBroadcast?'no':'yes',
         feeRate:1,
         network:'mainnet',
         outputs:[]
       }


       const txIDs= await createPinWithBtc({
          inscribeDataArray,
          options,
        })
        
        if(txIDs.status == "canceled"){
          return null
        }
        // console.log("txIDs",txIDs)
        
        // return {
        //   status:'ready_to_broadcast',
        //   commitCost:txIDs.commitCost,
        //   revealCost:txIDs.revealCost,
        //   commitTxHex: txIDs.commitTxHex,
        //   revealTxsHex: txIDs.revealTxsHex,
        // }
         return txIDs
      }else if(chainStore.state.currentChain === 'doge'){
        // Doge 链处理逻辑，与 BTC 类似
        if(payTo.length){
           metaidData.outputs=[];
          for(let item of payTo){
            metaidData.outputs.push({
              address:item.address,
              value:item.amount,
            })
          }
        }
        const inscribeDataArray=[]
        
        if(SerialTransactions.length){
          inscribeDataArray.push(...SerialTransactions)
        }
        inscribeDataArray.push(metaidData)
        
        const dogeChainData = chainStore.state.doge
        const dogeFeeRate = dogeChainData[dogeChainData.selectedFeeType]
        
        const options={
          noBroadcast:isBroadcast?'no':'yes',
          feeRate: dogeFeeRate,
          network:'mainnet',
          outputs:[]
        }

        const txIDs= await createPinWithDoge({
          inscribeDataArray,
          options,
        })
        
        if(txIDs.status == "canceled"){
          return null
        }
        
        return txIDs
      }else{
         const transactions=[] 
       const pinTxComposer = new TxComposer()
        pinTxComposer.appendP2PKHOutput({
        address: address.value,
        satoshis: 1,
        })
        const pinScript = createScriptForMvc(metaidData)
        
        pinTxComposer.appendOpReturnOutput(pinScript)
        
        if(payTo.length){
          for(let item of payTo){
                pinTxComposer.appendP2PKHOutput({
                address:new mvc.Address(item.address,'mainnet'),
                satoshis: layoutStore.selectedRedPacketType === 'token' ? Number(item.gasAmount) : item.amount,
                })
          }
        }


        // if(needService){
        // pinTxComposer.appendP2PKHOutput({
        // address: new mvc.Address(SERVICE_ADDRESS,import.meta.env.VITE_NET_WORK),
        // satoshis: SERVICE_FEE,
        // })
        // }
        
        if(SerialTransactions.length){
          transactions.push(...SerialTransactions)
        }

        transactions.push({
        txComposer: pinTxComposer.serialize(),
        message: 'Create Pin',
        })

        if(!isBroadcast){
         return{
            txid:pinTxComposer.getTxId(),
            transactions:transactions
         }
        }
        

       let payedTransactions
       if(needSmallpay){
          const {payedTransactions:payTx}= await connectionStore.adapter.smallPay({
          transactions:transactions,
          hasMetaid:true,
          feeb:1
          
        })
        payedTransactions=payTx

       }else{
          const {payedTransactions:payTx}= await connectionStore.adapter.pay({
          transactions:transactions,
          hasMetaid:true,
          feeb:1
          
        })

         payedTransactions=payTx
       }
        
      

        
        
        if(!payedTransactions){
          return null
        }
        
        const txIDs=await txBroadcast(payedTransactions,isBroadcast)
        console.log("txIDs",txIDs)
        
        
        return txIDs

      }



      

    } catch (error) {
      console.log("error",error)
      // ElMessage.error((error as any).message)
      throw new Error(typeof error === "string" ? error : (error as any).message)
    }
  }

  const createRedPacketPin = async(metaidData:MetaIdData,isBroadcast=true,needSmallpay:boolean=true,payTo:any[]=[],SerialTransactions:any[]=[]) => {

    const layoutStore=useLayoutStore()



    try {
      

      if(layoutStore.selectedRedPacketType === 'btc'){
        if(payTo.length){
           metaidData.outputs=[];
          for(let item of payTo){
            metaidData.outputs.push({
              address:item.address,
              value:item.amount,
            })
          }
        }
        const inscribeDataArray=[]
        
        if(SerialTransactions.length){
          
          inscribeDataArray.push(...SerialTransactions)
        }
        inscribeDataArray.push(metaidData)
       const options={
         noBroadcast:'yes',
         feeRate:1,
         network:'mainnet',
         outputs:[]
       }


       const txIDs :InscribeResultForNoBroadcast= await createPinWithBtc({
          inscribeDataArray,
          options,
        })
        
        if(txIDs.status == "canceled"){
          return null
        }
        console.log("txIDs",txIDs)
        
        return {
          status:'ready_to_broadcast',
          commitCost:txIDs.commitCost,
          revealCost:txIDs.revealCost,
          commitTxHex: txIDs.commitTxHex,
          revealTxsHex: txIDs.revealTxsHex,
        }
        //  return txIDs
      }else{
          
         const transactions=[] 
       const pinTxComposer = new TxComposer()
        pinTxComposer.appendP2PKHOutput({
        address: address.value,
        satoshis: 1,
        })
        const pinScript = createScriptForMvc(metaidData)
        
        pinTxComposer.appendOpReturnOutput(pinScript)
        
        if(payTo.length){
          
          for(let item of payTo){
                pinTxComposer.appendP2PKHOutput({
                address:new mvc.Address(item.address,'mainnet'),
                satoshis: layoutStore.selectedRedPacketType === 'token' ? Number(item.gasAmount) : item.amount,
                })
          }
        }


        // if(needService){
        // pinTxComposer.appendP2PKHOutput({
        // address: new mvc.Address(SERVICE_ADDRESS,import.meta.env.VITE_NET_WORK),
        // satoshis: SERVICE_FEE,
        // })
        // }
        
        if(SerialTransactions.length){
          transactions.push(...SerialTransactions)
        }

        transactions.push({
        txComposer: pinTxComposer.serialize(),
        message: 'Create Pin',
        })

        if(!isBroadcast){
         return{
            txid:pinTxComposer.getTxId(),
            transactions:transactions
         }
        }
        

       let payedTransactions
       if(needSmallpay){

          const ret= await connectionStore.adapter.smallPay({
          transactions:transactions,
          hasMetaid:true,
          feeb:1
          
        })
        if(ret.status === 'error'){
          throw new Error(ret.message || i18n.global.t('unknown_error'))
        }
        payedTransactions=ret.payedTransactions

       }else{
          const ret= await connectionStore.adapter.pay({
          transactions:transactions,
          hasMetaid:true,
          feeb:1
          
        })
        if(ret.status === 'error'){
          throw new Error(ret.message || i18n.global.t('unknown_error'))
        }

         payedTransactions=ret.payedTransactions
       }
        
      

        
        
        if(!payedTransactions){
          return null
        }
        
        const txIDs=await txBroadcast(payedTransactions,isBroadcast)
        console.log("txIDs",txIDs)
        
        
        return txIDs

      }



      

    } catch (error) {
      console.log("error",error)
      // ElMessage.error((error as any).message)
      throw new Error(typeof error === "string" ? error : (error as any).message)
    }
  }



  const transfer=async(receviers:Array<{
      amount: number,
      address:string,
  }>,isBroadcast=true)=>{
       try {
       const transactions=[] 
       const pinTxComposer = new TxComposer()
        
       for(let item of receviers){
          pinTxComposer.appendP2PKHOutput({
          address:new mvc.Address(item.address),
          satoshis: item.amount,
          })
       }

        transactions.push({
        txComposer: pinTxComposer.serialize(),
        message: 'Send Money',
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
    isBroadcast:boolean,
    externalEncryption?:'0' | '1' | '2'
    fileEncryption?:'0' | '1' | '2',
    attachments?:AttachmentItem[]
    
  })=>{
    const {body,protocol,isBroadcast,attachments,externalEncryption,fileEncryption}=params
    
     const chainStore=useChainStore()
    let SerialTransactions=[]
    try {
    
      if(attachments && attachments.length){
       
             
       const fileRes= await createMvcFile({
          body:chainStore.state.currentChain !== 'mvc' ? hexToBase64(attachments[0].data) : hexToUint8Array(attachments[0].data),
          mime:attachments[0].fileType,
          encryption:fileEncryption,
          isBroadcast:chainStore.state.currentChain !== 'mvc' ? true :false
       })

       

      //  if(chainStore.state.currentChain === 'btc'){
      //   SerialTransactions=fileRes
      //  }

       if(fileRes == null){
       
        return null
       }
       
       if(fileRes?.pinRes?.revealTxIds?.length){
        
        body.attachment=`metafile://${fileRes.pinRes.revealTxIds[0]}i0`
        SerialTransactions=[fileRes.metaidData]
       }else if(fileRes?.txid){
        body.attachment=`metafile://${fileRes.txid}i0`
        SerialTransactions=fileRes?.transactions
        
       }else if(fileRes){
         body.attachment=`metafile://${fileRes}i0`
         
       }else{
        ElMessage.error(i18n.global.t('upload_attachment_fail'))
        return null
       }

       

      }

      
      const metaidData={
        body:JSON.stringify(body),
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation: Operation.create,
        contentType:protocol == NodeName.SimpleGroupChat || protocol == NodeName.SimpleMsg  ? 'application/json' : body.contentType || 'application/json',
        encryption:externalEncryption, //body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast,true,[],SerialTransactions)
      
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
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation: Operation.create,
        contentType: 'application/json',
        encryption:'0', //body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      return pinRes

    } catch (error) {
     
      throw new Error(error as any)
    }
  }

  // const createBroadcastChannel=async(params:{
  //   body:any,
  //   protocol:string,
  //   isBroadcast:boolean
  // })=>{
  //   const {body,protocol,isBroadcast}=params
    
  //   try {
  //     const metaidData={
  //       body:JSON.stringify(body),
  //       path: `${import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
  //       flag: MetaFlag.metaid,
  //       version: '1.0.0',
  //       operation:body.channelId ? Operation.modify : Operation.create,
  //       contentType: 'application/json',
  //       encryption:'0', //body.encryption || body.encrypt,
  //       encoding: 'utf-8',
  //     }
      
  //     const pinRes= await createPin(metaidData,isBroadcast)
  //     return pinRes

  //   } catch (error) {
     
  //     throw new Error(error as any)
  //   }
  // }

  const setChannelAdmin=async(params:{
    body:any,
    protocol:string,
    //op:Operation,
    isBroadcast:boolean
  })=>{
    const {body,protocol,isBroadcast}=params
    
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation:Operation.create,//op == Operation.modify ? Operation.modify : Operation.create,
        contentType: 'application/json',
        encryption:'0', //body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      return pinRes

    } catch (error) {
     
      throw new Error(error as any)
    }
  }

   const setChannelWhiteList=async(params:{
    body:any,
    protocol:string,
    //op:Operation,
    isBroadcast:boolean
  })=>{
    const {body,protocol,isBroadcast}=params
    
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation:Operation.create,//op == Operation.modify ? Operation.modify : Operation.create,
        contentType: 'application/json',
        encryption:'0', //body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      return pinRes

    } catch (error) {
     
      throw new Error(error as any)
    }
  }


   const setChannelBlockList=async(params:{
    body:any,
    protocol:string,
    //op:Operation,
    isBroadcast:boolean
  })=>{
    const {body,protocol,isBroadcast}=params
    
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation:Operation.create,//op == Operation.modify ? Operation.modify : Operation.create,
        contentType: 'application/json',
        encryption:'0', //body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      return pinRes

    } catch (error) {
     
      throw new Error(error as any)
    }
  }


    const createRedPacket=async(params:{
    body:any,
    protocol:string,
    payTo:Array<{
      amount: number,
      address:string,
      index: number,
    }>
    isBroadcast:boolean
  },type:any)=>{
    const {body,protocol,payTo,isBroadcast}=params
    
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation: Operation.create,
        contentType: 'application/json',
        encryption: '0',
        encoding: 'utf-8',
      }

      if(!payTo.length){
         
         throw new Error(``)
      }
      
      const pinRes= await createRedPacketPin(metaidData,isBroadcast,false,payTo)
      
      return pinRes

    } catch (error) {
      console.log("error",error)

      throw new Error(typeof error === "string" ? error : (error as any).message)
    }
  }

  const createMvcFile=async(params:{
    body:any,
    mime:string,
    encryption:any,
    isBroadcast:boolean
  })=>{
    const {body,mime,encryption,isBroadcast,}=params
    const chainStore=useChainStore()
    
    try {
      const metaidData={
        body:body,
        path:`${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/${NodeName.File}` ,
        flag: MetaFlag.metaid,
        operation: Operation.create,
        contentType:`${mime};binary`, //`image/${mime};binary`,
        encryption: encryption,
        encoding:chainStore.state.currentChain !== 'mvc' ? 'base64' : 'binary',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      
      if(!isBroadcast){
        if(chainStore.state.currentChain !== 'mvc'){
          
          initEccLib(ecc)
          if(pinRes?.revealTxsHex?.length){
            const rawTx=pinRes.revealTxsHex[0]
            const transaction = bitcoin.Transaction.fromHex(rawTx);
            const txid = transaction.getId();
            
          //pinRes?.revealTxIds?.push()
            pinRes.revealTxIds=[txid]
            
          }
           return {
            pinRes,
            metaidData
           }
        }else{
          return pinRes
        }
        
      }
      if(pinRes?.txids?.length){
        return pinRes?.txids[0]
      }else if(pinRes?.revealTxIds?.length){
        return pinRes?.revealTxIds[0]
      } else{
        return null
      }
   

    } catch (error) {
     
      throw new Error(error as any)
    }
  }

  const joinGrop=async(params:{
    body:any,
    protocol:string,
    encrypt:string,
    isBroadcast:boolean,
  })=>{
    const {body,protocol,isBroadcast,encrypt}=params
       let pinRes
       let metaidData
    try {
        
          metaidData={
        body:JSON.stringify(body),
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation: Operation.create,
        contentType: 'application/json',
        encryption: encrypt,
        encoding: 'utf-8',
      }

      const utxo=utxoStore.getUtxo(rootAddress.value)
   
      
      if(utxo){
        const _options: any = {
        network: 'mainnet',
        signMessage: 'Join Group',
        serialAction: 'finish',
        assistDomain: 'https://www.metaso.network/assist-open-api',
        utxo:utxo
      }
      pinRes= await createPinWithAsset(metaidData,_options)
      
      if(pinRes){
       // const {utxo} = pinRes
        utxoStore.remove(rootAddress.value)
        //utxoStore.insert(utxo, utxo.address)
        //utxoStore.remove(rootAddress.value)
      }
      
      return pinRes
      }else{
        
         pinRes= await createPin(metaidData,isBroadcast)
        utxoStore.remove(rootAddress.value)
         return pinRes
      }

    } catch (error) {
      // 
      // if(error as string)
      pinRes= await createPin(metaidData,isBroadcast)
      return pinRes
      //  throw new Error(error as any)
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

    const createBroadcastChannel=async(params:{
    body:any,
    protocol:string,
    isBroadcast:boolean
  })=>{
    const {body,protocol,isBroadcast}=params
    
    try {
      const metaidData={
        body:JSON.stringify(body),
        path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${protocol}`,
        flag: MetaFlag.metaid,
        version: '1.0.0',
        operation:body.channelId ? Operation.modify : Operation.create,
        contentType: 'application/json',
        encryption:'0', //body.encryption || body.encrypt,
        encoding: 'utf-8',
      }
      
      const pinRes= await createPin(metaidData,isBroadcast)
      return pinRes

    } catch (error) {
     
      throw new Error(error as any)
    }
  }



  return {
    createPin,
    createShowMsg,
    createChannel,
    //createBroadcastChannel,
    setChannelAdmin,
    setChannelWhiteList,
    setChannelBlockList,
    createMvcFile,
    joinGrop,
    transfer,
    createRedPacket,
    txBroadcast,
    createBroadcastChannel
   
  }
})