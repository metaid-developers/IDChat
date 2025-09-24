import HttpRequest from '@/utils/request'
import { Channel, Community, CommunityAuth,SubChannel,MemberListRes } from '@/@types/talk'

import type { GroupChannel, GroupChannelListResponse,GroupUserRoleInfo } from '@/@types/simple-chat.d'
import { containsString, sleep } from '@/utils/util'
import { getUserInfoByAddress,getUserInfoByMetaId } from "@/api/man";
import axios from 'axios';
import {ChannelMsg_Size} from '@/data/constants'
import {  NodeName,MemberRule } from '@/enum'
import type { PriviteChatMessageItem } from '@/@types/common'
import { useEcdhsStore } from '@/stores/ecdh'
import {getEcdhPublickey} from '@/wallet-adapters/metalet'
import { useSimpleTalkStore } from '@/stores/simple-talk';




const ChatNotifyApi = new HttpRequest(`${import.meta.env.VITE_CHAT_NOTIFY}/push-base`, {
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if(response?.status && response?.status == 500){
        reject(response.data)
        return
      }

      if (response?.data && typeof response.data?.code === 'number') {
        
        
        if (response.data.code === 0) {
          resolve(response.data)
        } else {
         resolve(response.data)
        }
      } else {
        resolve(response.data)
      }
    })
  },
  errorHandel:((error)=>{
    return new Promise((resolve,reject)=>{
      reject(error)
    })
  })
}).request


export const getMyBlockChatList = async (): Promise<any> => {
    const simpleTalkStore=useSimpleTalkStore()
    const query = new URLSearchParams({
    metaId:simpleTalkStore.selfMetaId,
  }).toString()
  
  const data: {
    data: {
      userId: string
      blockedChats: []
      updatedAt:number
    }
  } = await ChatNotifyApi.get(`/v1/push/get_user_blocked_chats?${query}`)
  return data.data.blockedChats
}


export const addMyBlockChatList = async (params:{
    chatId:string,
    chatType:'group' | 'private',
    metaId:string,
    reason?:string
},signature: {
    'X-Signature': string
    'X-Public-Key': string
  },): Promise<any> => {
  params = params || {}

  const data = await ChatNotifyApi.post(`/v1/push/add_blocked_chat`,params,{
    headers:signature
  })
  console.log("data",data)
  
  if(data?.code == 0){
      return data.data
  }else{
    throw new Error(data?.data?.message)
  }

}

export const removeMyBlockChat = async (params:{
    chatId:string,
    metaId:string,
},signature: {
    'X-Signature': string
    'X-Public-Key': string
  },): Promise<any> => {
  params = params || {}

  const data = await ChatNotifyApi.post(`/v1/push/remove_blocked_chat`,params,{
    headers:signature
  })
  console.log("data",data)
  
  if(data?.code == 0){
    
      return data.data
  }else{
    throw new Error(data?.data?.message)
  }

}