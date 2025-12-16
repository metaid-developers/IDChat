import HttpRequest from '@/utils/request'
import { Channel, Community, CommunityAuth,SubChannel,MemberListRes } from '@/@types/talk'

import type { GroupChannel, GroupChannelListResponse,GroupUserRoleInfo, SearchGroupsAndUsersResponse, SearchUserItem } from '@/@types/simple-chat.d'
import { containsString, sleep } from '@/utils/util'
import { getUserInfoByAddress,getUserInfoByMetaId } from "@/api/man";
import axios from 'axios';
import {ChannelMsg_Size} from '@/data/constants'
import {  NodeName,MemberRule } from '@/enum'
import type { PriviteChatMessageItem } from '@/@types/common'
import { useEcdhsStore } from '@/stores/ecdh'
import {getEcdhPublickey} from '@/wallet-adapters/metalet'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

export const TESTGROUPID='525b620f60330de2a6943e49d98dc12a4f56444219335c8e9278e8905cd3a094i0'

// 使用工厂函数创建延迟初始化的 API 客户端
const TalkApi = createLazyApiClient(
  () => {
    const config = getRuntimeConfig()
    return `${config.api.chatApi}/group-chat`
  },
  {
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
  }
)



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
    async (res) => {
      
     if(res.data.list){
      const list=[]
      for(let channel of res.data.list){
         channel.id = channel.groupId
        channel.name = channel.roomName
        channel.uuid = channel.id // 用于key,不修改
        //channel.lastChatUser=
        if(Number(channel.type) == 2 ){
          if(channel?.userInfo&& channel.userInfo.chatPublicKey){
               if(!ecdhsStore.getEcdh(channel.userInfo.chatPublicKey)){
                console.log(`🔑 获取私聊用户 ${channel.userInfo.chatPublicKey} 的 ECDH 公钥中...`)
                try{
                  const ecdh = await getEcdhPublickey(channel.userInfo.chatPublicKey)
                console.log(`✅ 获取到私聊用户 ${channel.userInfo.chatPublicKey} 的 ECDH 公钥`, ecdh)
                 if(ecdh){
                      ecdhsStore.insert(ecdh,ecdh?.externalPubKey)
                } 
                }catch(e){
                  console.error(`❌ 获取私聊用户 ${channel.userInfo.chatPublicKey} 的 ECDH 公钥失败`, e)
                  
                }
               
                             
              
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
  const query = new URLSearchParams({
    groupId,
    metaId,
    cursor,
    size,
    timestamp,
  }).toString()
  const data: {
    data: {
      total: number
      nextTimestamp: number
      list: ChatMessageItem[] | null
    }
  } = await TalkApi.get(`/group-chat-list-v2?${query}`)
  return data.data
}

export const getChannelNewestMessages = async ({
  groupId,
  size = String(ChannelMsg_Size),
  startIndex = '0',
}: {
  groupId: string
  size?: string
  startIndex?: string
}): Promise<any> => {
  const query = new URLSearchParams({
    groupId,
    startIndex,
    size,
  }).toString()
  const data: {
    data: {
      total: number
      nextTimestamp: number
      list: ChatMessageItem[] | null
    }
  } = await TalkApi.get(`/group-chat-list-by-index?${query}`)
  return data.data
}

export const getSubChannelNewestMessages = async ({
  channelId,
  size = String(ChannelMsg_Size),
  startIndex = '0',
}: {
  channelId: string
  size?: string
  startIndex?: string
}): Promise<any> => {
  const query = new URLSearchParams({
    channelId,
    startIndex,
    size,
  }).toString()
  const data: {
    data: {
      total: number
      nextTimestamp: number
      list: ChatMessageItem[] | null
    }
  } = await TalkApi.get(`/channel-chat-list-by-index?${query}`)
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


  const data: {
    data: {
      total: number
      nextTimestamp: number
      list: ChatMessageItem[] | null
    }
  } = await TalkApi.get(`/channel-chat-list-v3?${query}`)
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
}

export const getNewstPrivateChatMessages = async (
 {
  metaId='',
  otherMetaId='',
  startIndex='0',
  size=String(ChannelMsg_Size),
 }:{
  metaId:string,
  otherMetaId:string,
  startIndex?:string,
  size?:string
 }
): Promise<any> => {
  const query = new URLSearchParams({
  otherMetaId,
  metaId,
  startIndex,
  size,
  }).toString()
  

const data:{
  data:{
    total:number
    nextTimestamp:number,
    list: PriviteChatMessageItem[] | null
  }
} = await TalkApi.get(`/private-chat-list-by-index?${query}`)
  return data.data ?? {
    list:[],
    nextTimestamp:0,
    total:0
  }
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

export const getPrivateChatPaths = (metaId: string): Promise<any> => {
  const params = {
    metaId
  }
  const query = new URLSearchParams(params).toString()
  return TalkApi.get(`/private-group-paths?${query}`).then(res => {
    const data = res.data.list??[]
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
    
    // 如果返回的 domain 与当前 TalkApi 的 domain 不同，使用返回的 domain 重新请求
    if (res.data?.domain) {
      const config = getRuntimeConfig()
      const currentDomain = config.api.chatApi
      if (res.data.domain !== currentDomain) {
        // 使用返回的 domain 重新请求
        const newDomainRes = await axios.get(`${res.data.domain}/group-chat${path}?${query}`, {
          headers: {
            'Content-Type': 'application/json',
          },
        })
        if (newDomainRes.data?.code === 0) {
          return newDomainRes.data.data
        }
        throw new Error(newDomainRes.data?.message || 'Request failed')
      }
    }
    
    return res.data
  })
}

export const getRedPacketRemains = async (params: {
  groupId: string
  pinId: string
  domain?: string
}): Promise<any> => {
  const { domain, ...queryParams } = params
  const path = params.groupId===TESTGROUPID?'/lucky-bag-unused-info-v2':'/lucky-bag-unused-info'
  const query = new URLSearchParams(queryParams as any).toString()
  
  // 如果提供了 domain，使用自定义 domain 请求
  if (domain) {
    const config = getRuntimeConfig()
    return axios.get(`${domain}/group-chat${path}?${query}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => {
      if (res.data?.code === 0) {
        return res.data.data
      }
      throw new Error(res.data?.message || 'Request failed')
    })
  }
  
  // 使用默认 API
  return TalkApi.get(`${path}?${query}`).then(res => {
    return res.data
  })
}

export const grabRedPacket = async (params: {
  groupId: string
  pinId: string
  metaId: string
  address: string
  domain?: string
}): Promise<any> => {
  params = params || {}
  const { domain, ...requestParams } = params
  const path = params.groupId===TESTGROUPID?'/grab-lucky-bag-v2':'/grab-lucky-bag'
  
  // 如果提供了 domain，使用自定义 domain 请求
  if (domain) {
    const config = getRuntimeConfig()
    return axios.post(`${domain}/group-chat${path}`, requestParams, {
      headers: {
        'Content-Type': 'application/json',
      },
    }).then(res => {
      if (res.data?.code === 0) {
        return res.data.data
      } else {
        throw new Error(res.data?.message || res.data)
      }
    }).catch(e => {
      throw new Error(e.message)
    })
  }
  
  // 使用默认 API
  return TalkApi.post(`${path}`, requestParams)
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

// 获取群组加入控制列表（白名单和黑名单）
export const getGroupJoinControlList = async (params: {
  groupId: string
}): Promise<{
  code: number
  data: {
    groupId: string
    joinBlockMetaIds: string[] | null
    joinWhitelistMetaIds: string[] | null
  }
  message: string
  processingTime: number
}> => {
  const query = new URLSearchParams(params).toString()
  return TalkApi.get(`/group-join-control-list?${query}`)
}

// 搜索群组和用户
export const searchGroupsAndUsers = async ({
  query,
  size = '20',
}: {
  query: string
  size?: string
}): Promise<{ users: SearchUserItem[], groups: any[] }> => {
  const _query = new URLSearchParams({
    query,
  }).toString()
  return TalkApi.get(`/search-users?${_query}`).then(async (res: any) => {
    if (res.code === 0 && res.data && res.data.list) {
      // 新接口直接返回用户列表，每个用户已包含 chatPublicKey
      const users = res.data.list as SearchUserItem[]
      
      return { users, groups: [] }
    }
    return { users: [], groups: [] }
  })
}

// 获取用户的群聊加入列表（用于私密群聊获取 passcode）
export const getGroupMetaidJoinList = async ({
  metaId,
  groupId,
}: {
  metaId: string
  groupId: string
}): Promise<{
  code: number
  data: {
    metaId: string
    items: Array<{
      joinPinId: string
      joinType: string
      joinTimestamp: number
      groupState: number
      address: string
      referrer: string
      k: string  // encrypted passcode
      blockHeight: number
      chain: string
      byMetaId: string
      byAddress: string
    }>
  }
  message: string
  processingTime: number
}> => {
  const _query = new URLSearchParams({
    metaId,
    groupId,
  }).toString()
  return TalkApi.get(`/group-metaid-join-list?${_query}`)
}

