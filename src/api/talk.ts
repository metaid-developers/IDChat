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

export const TESTGROUPID='525b620f60330de2a6943e49d98dc12a4f56444219335c8e9278e8905cd3a094i0'


const TalkApi = new HttpRequest(`${import.meta.env.VITE_CHAT_API}/group-chat`, {
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



const seedFakeMetaName = (item: any) => {
  // 以50%的几率随机塞进metaName
  if (Math.random() > 0.5) {
    // 生成随机metaName，要么不带后缀，要么带.eth后缀
    const randomMetaName =
      Math.random() > 0.5
        ? `meta${(Math.random() * 100).toString().split('.')[0]}`
        : `meta${(Math.random() * 100).toString().split('.')[0]}.eth`
    if (item.fromUserInfo) {
      item.fromUserInfo.metaName = randomMetaName
    }
    if (item.toUserInfo) {
      item.toUserInfo.metaName = randomMetaName
    }
    if (item.userInfo) {
      item.userInfo.metaName = randomMetaName
    }
  }

  return item
}

export const getCommunities = async (params?: any): Promise<Community[]> => {
  params = params || {}
  params.page = params.page || 1
  params.pageSize = params.pageSize || 100
  const query = new URLSearchParams(params).toString()

  return TalkApi.get(`/community/list?${query}`).then(res => {
    const _communities = res.data.results.items.map((community: Community) => {
      community.id = community.communityId
      return community
    })

    return _communities
  })
}

export const getMetaNames = async (params?: any): Promise<any[]> => {
  const metaId = params.metaId
  delete params.metaId

  const query = new URLSearchParams(params).toString()

  return TalkApi.get(`/community/auths/${metaId}?${query}`).then(res => {
    return res.data.results.items
  })
}

export const getNewMetaNames = async (
  params?: any
): Promise<{
  code: number
  data: {
    total: number
    nextFlag: string
    results: {
      items: MetaNameItem[]
    }
  }
}> => {
  const { address, ..._params } = params
  delete params.metaId

  return TalkApi.get(`/community/metaname/${address}`, { params: _params })
}

export const getEnsNames = async (
  params?: any
): Promise<{
  code: number
  data: {
    total: number
    nextFlag: string
    results: {
      items: MetaNameItem[]
    }
  }
}> => {
  const { address, ..._params } = params
  delete params.metaId

  return TalkApi.get(`/community/ens/${address}`, { params: _params })
}

export const getOneCommunity = async (communityId: string): Promise<Community> => {
  return TalkApi.get(`/community/${communityId}`).then(res => {
    const community = res.data
    community.id = community.communityId
    return community
  })
}

export const getOneChannel = async (groupId: string): Promise<Channel> => {
  
  if(groupId == 'welcome' ){
    return null
  } else {
    return TalkApi.get(`group-info?groupId=${groupId}`).then(res => {
      const channel = res.data
      channel.id = channel.groupId
      channel.name = channel.roomName
      channel.uuid = channel.txId // 用于key,不修改
      return channel
    })
  }
}

export const getCommunityAuth = async (communityId: string): Promise<CommunityAuth> => {
  return TalkApi.get(`/community/${communityId}/auth/info`).then(res => res.data)
}

export const getCommunityMembership = async (communityId: string, metaId: string): Promise<any> => {
  const query = new URLSearchParams({ metaId }).toString()
  return TalkApi.get(`/community/${communityId}/person/info?${query}`).then(res => {
    return res.data.communityState !== -1
  })
}

export const getChannelMembership = async (groupId: string, metaId: string): Promise<any> => {
  const query = new URLSearchParams({ metaId, groupId }).toString()
  return TalkApi.get(`/group-person?${query}`).then(res => {
    return res.data.isInGroup
  })
}


export const getUserGroupRole= async({
  groupId,
  metaId,
}:{
  groupId:string,
  metaId:string,
}
):Promise<GroupUserRoleInfo>=>{
   const query = new URLSearchParams({
      groupId,
      metaId,
  }).toString()
    return TalkApi.get(`/group-user-role?${query}`).then(async res => {
    return res.data

    // const {isCreator,isAdmin,isBlocked,isWhitelist}=roleInfo

  //  if(isCreator){
  //   return MemberRule.Owner
  //  }else if(isAdmin){
  //   return MemberRule.Admin
  //  }else if(isWhitelist){
  //  return MemberRule.Speaker
  //  }else if(isBlocked){
  //  return MemberRule.Block
  //  }else{
  //   return MemberRule.Normal
  //  }
  })
}

export const getChannelMembers = async ({
  groupId,
  cursor = '0',
  size = '20',
  timestamp = '0',
  orderBy = 'timestamp',
  orderType = 'asc',
}: {
  groupId: string
  cursor?: string
  size?: string
  timestamp?: string
  orderBy?: string
  orderType?: 'asc' | 'desc'
}): Promise<MemberListRes> => {
  const query = new URLSearchParams({
    groupId,
    cursor,
    size,
    timestamp,
    orderBy,
    orderType,
  }).toString()
  return TalkApi.get(`/group-member-list?${query}`).then(async res => {
    const members = res.data

    const {admins,blockList,creator,list,whiteList}=members

    // if(members){
    //   for(let i of members){
    //     const userInfo= await getUserInfoByAddress(i.address)
    //     i.userInfo=userInfo
    //   }
    // }

    return {
        admins:admins ?? [],
        blockList:blockList ?? [],
        creator:creator ?? null,
        list: list ?? [],
        whiteList: whiteList ?? []
    } 
  })
}

export const searchChannelMembers = async ({
  groupId,
  size = '20',
  query,
}: {
  groupId: string
  size?: string
  query: string
}): Promise<any> => {
  const _query = new URLSearchParams({
    groupId,
    size,
    query,
  }).toString()
  return TalkApi.get(`/search-group-members?${_query}`).then(async res => {
    const members = res.data.list
    return members || []
  })
}

export const getAtMeChannels = async (params?: any): Promise<any> => {
  params = params || {}
  const metaId = params.metaId

  // return TalkApi.get(`/chat/sessions/${metaId}`, { data: JSON.stringify(params) }).then(res => {
  //   return res.data.data.map((channel: any) => {
  //     const channelSide = channel.from === metaId ? 'to' : 'from'

  //     channel.name = channel[`${channelSide}Name`]
  //     channel.id = channel[`${channelSide}`]
  //     channel.publicKeyStr = channel[`${channelSide}PublicKey`]
  //     channel.lastMessageTimestamp = channel.timestamp
  //     channel.lastMessage = '你收到了一条信息'
  //     channel.pastMessages = []
  //     channel.newMessages = []

  //     return channel
  //   })
  // })

  return TalkApi.get(`/chat/homes/${metaId}`, { data: JSON.stringify(params) }).then(res => {
    return res.data.data.map((channel: any) => {
      const channelSide = channel.from === metaId ? 'to' : 'from'

      channel.name = channel[`${channelSide}Name`]
      channel.metaName = channel[`${channelSide}UserInfo`]?.metaName
      channel.id = channel.metaId = channel[`${channelSide}`]
      channel.avatarImage = channel[`${channelSide}AvatarImage`]
      channel.publicKeyStr = channel[`${channelSide}PublicKey`]
      channel.lastMessageTimestamp = channel.timestamp
      channel.pastMessages = []
      channel.newMessages = []

      return channel
    })
  })
}

export const getChannels = async ({
  metaId,
  cursor = '0',
  size = '30',
  timestamp=''
}: {
  metaId: string
  cursor?: string
  size?: string
  timestamp?: string
}): Promise<Channel[]> => {
  // const communityId = params.communityId
 ///community/${communityId}/rooms
 const params=new URLSearchParams({
  metaId,
  cursor,
  size,
  timestamp
 })
 //latest-group-list
 const ecdhsStore=useEcdhsStore()
  return TalkApi.get(`/user/latest-chat-info-list?${params}`).then(
    (res) => {
      
     if(res.data.list){
      const list=[]
      
      for(let channel of res.data.list){
         channel.id = channel.groupId
        channel.name = channel.roomName
        channel.uuid = channel.id // 用于key,不修改
        
        //channel.lastChatUser=
        if(Number(channel.type) == 2){
          if(channel?.userInfo){
               if(!ecdhsStore.getEcdh(channel.userInfo.chatPublicKey)){
            
                getEcdhPublickey(channel.userInfo.chatPublicKey).then((ecdh)=>{
                  
                    ecdhsStore.insert(ecdh,ecdh?.externalPubKey)
                })
              
          }
          }else{
            
            continue
          }
       
          
        }
        list.push(channel) 
      }
      //  const list= res.data.list.map((channel: any) => {
       
      // })

      return list.sort((pre,next)=>next.timestamp - pre.timestamp)
     }else{
      return []
     }
    }
  )
}

// export const getAllChannels = async ({
//   metaId='',
//   cursor="1",
//   size="20"
// }:{
//   metaId?:string
//   cursor?:string
//   size?:string
//   timestamp?:string
// }): Promise<Channel[]> => {
  
//   // const communityId = params.communityId
//  ///community/${communityId}/rooms
//  const params=new URLSearchParams({
//   metaId,
//   cursor,
//   size
//  })
//   return TalkApi.get(`/group-list?${params}`).then(
//     res => {
//       return res.data.list.map((channel: any) => {
//         channel.id = channel.groupId
//         channel.name = channel.roomName
//         channel.uuid = channel.txId // 用于key,不修改
//         return channel
//       })
//     } else {
//       return []
//     }
//   })
// }

export const getAllChannels = async ({
  metaId = '',
  cursor = '1',
  size = '20',
}: {
  metaId?: string
  cursor?: string
  size?: string
  timestamp?: string
}): Promise<Channel[]> => {
  // const communityId = params.communityId
  ///community/${communityId}/rooms
  const params = new URLSearchParams({
    metaId,
    cursor,
    size,
  })
  return TalkApi.get(`/group-list?${params}`).then(res => {
   if(res.data.list?.length){
     return res.data.list.map((channel: any) => {
      channel.id = channel.groupId
      channel.name = channel.roomName
      channel.uuid = channel.txId // 用于key,不修改
      return channel
    })
   }else{
    return []
   }
  })
}

// export const getGroupChannelList=async({
//   groupId,
//   cursor='0',
//   size='20'
// }: {
//   groupId:string
//   cursor?:string
//   size?: string
// }):Promise<SubChannel[]>=>{
//   const params = new URLSearchParams({
//     groupId,
//     cursor,
//     size,
//   })
//     return TalkApi.get(`/group-channel-list?${params}`).then(res => {
//    if(res.data.list?.length){
//     return res.data.list
//     //  return res.data.list.map((channel: any) => {
//     //   channel.id = channel.groupId
//     //   channel.name = channel.roomName
//     //   channel.uuid = channel.txId // 用于key,不修改
//     //   return channel
//     // })
//    }else{
//     return []
//    }
//   })
// }

export const getChannelMessages = async ({
  groupId,
  metaId = '',
  cursor = '0',
  size = String(ChannelMsg_Size),
  timestamp = '0',
}: {
  groupId: string
  metaId: string
  cursor?: string
  size?: string
  timestamp?: string
}): Promise<any> => {
  const selfMetaId = metaId
  const query = new URLSearchParams({
    groupId,
    metaId,
    cursor,
    size,
    timestamp,
  }).toString()

  // if (type === 'session') {
  //   const {
  //     data: { data: messages },
  //   } = await TalkApi.get(`/chat/${selfMetaId}/${channelId}?${query}`)

  //   return messages
  // }

  const data: {
    data: {
      total: number
      nextTimestamp: number
      list: ChatMessageItem[] | null
    }
  } = await TalkApi.get(`/group-chat-list-v2?${query}`)

  // if (data.data.list?.length) {
  //   for (let item of data.data.list) {
  //     if (containsString(item.protocol, NodeName.SimpleGroupLuckyBag)) {
  //     getOneRedPacket({
  //         groupId: item.groupId,
  //         pinId: item.pinId,
  //       }).then((redpackInfo)=>{
  //           if (Number(redpackInfo.count) == Number(redpackInfo.usedCount)) {
  //         item.claimOver = true
  //       }
  //       }).catch((e)=>console.log('e',e))

  //     }
  //   }
  // }

  return data.data
}

export const getSubChannelMessages = async ({
  channelId,
  metaId = '',
  cursor = '0',
  size = String(ChannelMsg_Size),
  timestamp = '0',
}: {
  channelId: string
  metaId: string
  cursor?: string
  size?: string
  timestamp?: string
}): Promise<any> => {
  const selfMetaId = metaId
  const query = new URLSearchParams({
    channelId,
    metaId,
    cursor,
    size,
    timestamp,
  }).toString()

  // if (type === 'session') {
  //   const {
  //     data: { data: messages },
  //   } = await TalkApi.get(`/chat/${selfMetaId}/${channelId}?${query}`)

  //   return messages
  // }

  const data: {
    data: {
      total: number
      nextTimestamp: number
      list: ChatMessageItem[] | null
    }
  } = await TalkApi.get(`/channel-chat-list-v3?${query}`)

  // if (data.data.list?.length) {
  //   for (let item of data.data.list) {
  //     if (containsString(item.protocol, NodeName.SimpleGroupLuckyBag)) {
  //     getOneRedPacket({
  //         groupId: item.groupId,
  //         pinId: item.pinId,
  //       }).then((redpackInfo)=>{
  //           if (Number(redpackInfo.count) == Number(redpackInfo.usedCount)) {
  //         item.claimOver = true
  //       }
  //       }).catch((e)=>console.log('e',e))

  //     }
  //   }
  // }

  return data.data
}

export const getPrivateChatMessages = async (
 {
  metaId='',
  otherMetaId='',
  cursor='0',
  size=String(ChannelMsg_Size),
  timestamp='0'
 }:{
  metaId:string,
  otherMetaId:string,
  cursor?:string,
  size?:string
  timestamp?:string
 }
): Promise<any> => {
  const selfMetaId = metaId
  const query = new URLSearchParams({
  otherMetaId,
  metaId,
  cursor,
  size,
  timestamp
  }).toString()
  
  // if (type === 'session') {
  //   const {
  //     data: { data: messages },
  //   } = await TalkApi.get(`/chat/${selfMetaId}/${channelId}?${query}`)

  //   return messages
  // }

const data:{
  data:{
    total:number
    nextTimestamp:number,
    list: PriviteChatMessageItem[] | null
  }
} = await TalkApi.get(`/private-chat-list?${query}`)
  return data.data ?? {
    list:[],
    nextTimestamp:0,
    total:0
  }
  // if(data.data.list?.length){
  //   for(let item of data.data.list){
  //     if(containsString(item.protocol,NodeName.SimpleGroupLuckyBag)){
  //      const redpackInfo=await getOneRedPacket({
  //          groupId: item.groupId,
  //         pinId: item.pinId,
  //       })
        
  //       if(Number(redpackInfo.count) == Number(redpackInfo.usedCount)){
  //         item.claimOver=true
  //       }
        
  //     } 
     
  // }
  // }


  
}

export const getChannelMessagesForTask = async (
 {
   groupId,
  metaId='',
  cursor='1',
  size='30',
  timestamp='0'
 }:{
   groupId:string,
  metaId:string,
  cursor?:string,
  size?:string
  timestamp?:string
 }
): Promise<any> => {
  const selfMetaId = metaId
  const query = new URLSearchParams({
    groupId,
    metaId,
    cursor,
    size,
    timestamp,
  }).toString()

  // if (type === 'session') {
  //   const {
  //     data: { data: messages },
  //   } = await TalkApi.get(`/chat/${selfMetaId}/${channelId}?${query}`)

  //   return messages
  // }

  const data: {
    data: {
      total: number
      nextTimestamp: number
      list: ChatMessageItem[] | null
    }
  } = await TalkApi.get(`/group-chat-list?${query}`)

  return data.data ?? null
}

export const getCommunityMembers = (communityId: string): Promise<any> => {
  const params = {
    pageSize: '100',
    page: '1',
  }
  const query = new URLSearchParams(params).toString()
  return TalkApi.get(`/community/${communityId}/persons?${query}`).then(res => {
    const data = res.data.results.items

    return data
  })
}

// 红包相关

export const getOneRedPacket = async (params: any): Promise<any> => {
  params = params || {}
  // const groupId = params.groupId
  // const pinId = params.pinId
  //const query = params.address ? new URLSearchParams({ address: params.address }).toString() : ''
  const query = new URLSearchParams(params).toString()
  const path= params.groupId===TESTGROUPID?'/lucky-bag-info-v2':'/lucky-bag-info'
  return TalkApi.get(`${path}?${query}`).then(async res => {
    //   if(res.data.payList.length){
    //     for(let user of res.data.payList){

    //       if(user?.gradAddress){
    //          const userInfo=await getUserInfoByAddress(user?.gradAddress)
    //       user.userInfo=userInfo
    //       }

    //     }
    //   }
    //  const userInfo=await getUserInfoByAddress(res.data?.address)
    //   res.data.userInfo=userInfo
    return res.data
  })
}

export const getRedPacketRemains = async (params: {
  groupId: string
  pinId: string
}): Promise<any> => {
  const path = params.groupId===TESTGROUPID?'/lucky-bag-unused-info-v2':'/lucky-bag-unused-info'
  const query = new URLSearchParams(params).toString()
  // return axios.get(`http://47.83.198.218:7568/group-chat/lucky-bag-unused-info?${query}`).then((res)=>{
  //   console.log("res",res)
  //   
  //   return res.data.data
  // })
  return TalkApi.get(`${path}?${query}`).then(res => {
    return res.data
  })
}

export const grabRedPacket = async (params: {
  groupId: string
  pinId: string
  metaId: string
  address: string
}): Promise<any> => {
  params = params || {}

  //const query = new URLSearchParams(params).toString()

  //   return axios.post(`http://47.83.198.218:7568/group-chat/grab-lucky-bag`,params).then((res)=>{
  //   console.log("res",res)
  //   
  //   return res.data.data
  // })
  const path = params.groupId===TESTGROUPID?'/grab-lucky-bag-v2':'/grab-lucky-bag'
  return TalkApi.post(`${path}`, params)
    .then(res => {
      if (res?.code == 0) {
       
        return res.data
      } else {
        throw new Error(res.data)
        
      }
    })
    .catch(e => {
      
      throw new Error(e.message)
    })
}

export const GetUserEcdhPubkeyForPrivateChat=(metaId:string):Promise<{
    metaid:string,
    name:string,
    avatar:string,
    avatarImage:string,
    chatPublicKey:string,
    chatPublicKeyId:string,
    address:string
}>=>{
  const query =new URLSearchParams({metaId}).toString() 

  return TalkApi.get(`/user-info?${query}`).then(res => {
     if(res?.code == 0){
      
       return {...res.data.userInfo,address:res.data.address}
     }else if(res?.code == 1){
      throw new Error(res?.message)
     }
   
  }).catch((e)=>{
    
    throw new Error(e.message)
  })
}

export const BatchGetUsersEcdhPubkeyForPrivateChat=(params:{
  metaIds?:string[],
  addresses?:string[]
}):Promise<Array<{
    metaid:string,
    name:string,
    avatar:string,
    avatarImage:string,
    chatPublicKey:string,
    chatPublicKeyId:string,
    address:string
}>>=>{
  //const query =new URLSearchParams({metaId}).toString() 
  params=params || {}
  return TalkApi.post(`/batch-user-info`,params).then(res => {
     if(res?.code == 0){
      let list=[]
      if(res.data.list?.length){
        
        for(let user of res.data.list){
          list.push({
            ...user.userInfo,
            address:user.address
          })
        }
       
      }
      return list
       //return {...res.data.userInfo,address:res.data.address}
     }else if(res?.code == 1){
      return []
      //throw new Error(res?.message)
     }
   
  }).catch((e)=>{
    
   return []
  })
}

// 获取某个頻道的引用公告列表
export const GetCommunityAnnouncements = (params: {
  communityId: string
}): Promise<{
  code: number
  data: {
    total: number
    results: {
      items: AnnouncementItem[]
    }
  }
}> => {
  const { communityId, ..._params } = params
  return TalkApi.get('/community/' + communityId + '/announcements', { params: _params })
}

export const generateLuckyBagCode = async (): Promise<{
  code: number
  data: {
    code: string
    luckyBagAddress: string
    timestamp: number
  }
}> => {
  return TalkApi.get('/generate-lucky-bag-code')
}

// 获取群聊的子频道列表
export const getGroupChannelList = async (params: {
  groupId: string
}): Promise<GroupChannelListResponse> => {
  const query = new URLSearchParams(params).toString()
  return TalkApi.get(`/group-channel-list?${query}`)
}
