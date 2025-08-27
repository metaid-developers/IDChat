import HttpRequest from '@/utils/request'
import { Channel, Community, CommunityAuth } from '@/@types/talk'
import { containsString, sleep } from '@/utils/util'
import { getUserInfoByAddress,getUserInfoByMetaId } from "@/api/man";
import axios from 'axios';
import {ChannelMsg_Size} from '@/data/constants'
import {  NodeName } from '@/enum'
const TalkApi = new HttpRequest(`${import.meta.env.VITE_CHAT_API}/group-chat`, {
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response.data?.code === 'number') {
        if (response.data.code === 0) {
          
          resolve(response.data)
        } else {
          reject({
            code: response.data.code,
            message: response.data.message,
          })
        }
      } else {
        resolve(response.data)
      }
    })
  },
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
  
  if(groupId == 'welcome'){
    return null
  }else{
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
  const query = new URLSearchParams({ metaId,groupId }).toString()
  return TalkApi.get(`/group-person?${query}`).then(res => {
    return res.data.isInGroup
  })
}

export const getChannelMembers = async ({
  groupId,
  cursor='0',
  size='20',
  timestamp='0',
  orderBy='timestamp',
  orderType='asc'
}:{
  groupId:string
  cursor?:string
  size?:string
  timestamp?:string
  orderBy?:string
  orderType?:'asc' | 'desc'

}): Promise<any> => {
  const query = new URLSearchParams({ 
      groupId,
      cursor,
      size,
      timestamp,
      orderBy,
      orderType
   }).toString()
  return TalkApi.get(`/group-member-list?${query}`).then(async(res) => {
    const members=res.data.list
    // if(members){
    //   for(let i of members){
    //     const userInfo= await getUserInfoByAddress(i.address)
    //     i.userInfo=userInfo
    //   }
    // }


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
  cursor="0",
  size="20",
  timestamp=''
}:{
  metaId:string
  cursor?:string
  size?:string
  timestamp?:string
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
  return TalkApi.get(`/user/latest-chat-info-list?${params}`).then(
    res => {
      debugger
     if(res.data.list){
       return res.data.list.map((channel: any) => {
        channel.id = channel.groupId
        channel.name = channel.roomName
        channel.uuid = channel.id // 用于key,不修改
        return channel
      })
     }else{
      return []
     }
    }
  )
}

export const getAllChannels = async ({
  metaId='',
  cursor="1",
  size="20"
}:{
  metaId?:string
  cursor?:string
  size?:string
  timestamp?:string
}): Promise<Channel[]> => {
  
  // const communityId = params.communityId
 ///community/${communityId}/rooms
 const params=new URLSearchParams({
  metaId,
  cursor,
  size
 })
  return TalkApi.get(`/group-list?${params}`).then(
    res => {
      return res.data.list.map((channel: any) => {
        channel.id = channel.groupId
        channel.name = channel.roomName
        channel.uuid = channel.txId // 用于key,不修改
        return channel
      })
    }
  )
}

export const getChannelMessages = async (
 {
   groupId,
  metaId='',
  cursor='0',
  size=String(ChannelMsg_Size),
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
    list: ChatMessageItem[] | null
  }
} = await TalkApi.get(`/group-chat-list-v2?${query}`)

  if(data.data.list?.length){
    for(let item of data.data.list){
      if(containsString(item.protocol,NodeName.SimpleGroupLuckyBag)){
       const redpackInfo=await getOneRedPacket({
           groupId: item.groupId,
          pinId: item.pinId,
        })
        
        if(Number(redpackInfo.count) == Number(redpackInfo.usedCount)){
          item.claimOver=true
        }
        
      } 
     
  }
  }


  return data.data.list ?? []
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
  const query=new URLSearchParams(params).toString()
  return TalkApi.get(`/lucky-bag-info?${query}`).then(async(res) => {
  
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

export const getRedPacketRemains = async (params:{
  groupId:string
  pinId:string
}): Promise<any> => {

 
  const query =new URLSearchParams(params).toString() 
  // return axios.get(`http://47.83.198.218:7568/group-chat/lucky-bag-unused-info?${query}`).then((res)=>{
  //   console.log("res",res)
  //   debugger
  //   return res.data.data
  // })
  return TalkApi.get(`/lucky-bag-unused-info?${query}`).then(res => {
    return res.data
  })
}

export const grabRedPacket = async (params: {
  groupId:string
  pinId:string
  metaId:string
  address:string
}): Promise<any> => {
  params = params || {}
 
  //const query = new URLSearchParams(params).toString()

  //   return axios.post(`http://47.83.198.218:7568/group-chat/grab-lucky-bag`,params).then((res)=>{
  //   console.log("res",res)
  //   debugger
  //   return res.data.data
  // })
  return TalkApi.post(`/grab-lucky-bag`,params).then(res => {
    
     if(res?.code == 0){
       return res.data
     }else if(res?.code == 1){
      throw new Error(res?.message)
     }
   
  }).catch((e)=>{
    
    throw new Error(e.message)
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
