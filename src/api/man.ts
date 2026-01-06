import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'
import HttpRequest from '@/utils/request'

const manApi = createLazyApiClient(() => `${getRuntimeConfig().api.manApi}/api`, {
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response.data?.code === 'number') {
        if (response.data.code === 1) {
          resolve(response.data.data)
        } else {
          reject({
            code: response.data.code,
            message: response.data.message,
          })
        }
      } else {
        resolve(response.data.data)
      }
    })
  },
})

// 新的 metafile-indexer API 客户端
const metafileIndexerApi = createLazyApiClient(() => getRuntimeConfig().api.metafileIndexerApi, {
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response.data?.code === 'number') {
        if (response.data.code === 1) {
          resolve(response.data.data)
        } else {
          reject({
            code: response.data.code,
            message: response.data.message,
          })
        }
      } else {
        resolve(response.data.data)
      }
    })
  },
})

export interface ChatUserInfo {
  address: string
  avatar: string
  avatarImage: string
  chatPublicKey: string
  chatPublicKeyId: string
  metaid: string
  globalMetaId?: string // 新增：全局 MetaId，支持多链（MVC/BTC/DOGE）
  name: string
}

// 新版 metafile-indexer API 返回的用户信息接口
export interface MetafileUserInfo {
  metaid: string
  globalMetaId?: string // 新增：全局 MetaId，支持多链（MVC/BTC/DOGE）
  name: string
  address: string
  avatar: string
  avatarId: string
  chatpubkey: string
  chatpubkeyId: string
}

// 旧版 man API 返回的用户信息接口（保留兼容性）
export interface UserInfo {
  address: string
  avatar: string
  avatarId: string
  background?: string
  bio?: string
  bioId?: string
  blocked?: boolean
  chainName?: string
  fdv?: number
  followCount?: number
  isInit?: boolean
  metaid: string
  globalMetaId?: string // 新增：全局 MetaId，支持多链（MVC/BTC/DOGE）
  name: string
  nameId?: string
  nftAvatar?: string
  nftAvatarId?: string
  number?: number
  pdv?: number
  pinId?: string
  soulbondToken?: string
  unconfirmed?: string
  chatpubkey?: string
  chatpubkeyId?: string
}

export const getUserInfoByAddress = async (address: string): Promise<UserInfo> => {
  // 使用新的 metafile-indexer API
  return metafileIndexerApi.get(`/info/address/${address}`).then((res: MetafileUserInfo) => {
    // 将新 API 返回结构转换为兼容旧结构的 UserInfo
    const userInfo: UserInfo = {
      metaid: res.metaid,
      globalMetaId: res.globalMetaId, // 只使用 globalMetaId
      name: res.name,
      address: res.address,
      avatar: res.avatar,
      avatarId: res.avatarId,
      chatpubkey: res.chatpubkey,
      chatpubkeyId: res.chatpubkeyId,
    }
    return userInfo
  })
}

export const getUserInfoByMetaId = async (metaid: string): Promise<UserInfo> => {
  // 使用新的 metafile-indexer API
  const res: MetafileUserInfo = await metafileIndexerApi.get(`/info/metaid/${metaid}`)

  // 将新 API 返回结构转换为兼容旧结构的 UserInfo
  const userInfo: UserInfo = {
    metaid: res.metaid,
    globalMetaId: res.globalMetaId, // 只使用 globalMetaId
    name: res.name,
    address: res.address,
    avatar: res.avatar,
    avatarId: res.avatarId,
    chatpubkey: res.chatpubkey,
    chatpubkeyId: res.chatpubkeyId,
  }
  return userInfo
}

// 新增：通过 globalMetaId 获取用户信息（支持多链）
export const getUserInfoByGlobalMetaId = async (globalMetaId: string): Promise<UserInfo> => {
  // 使用新的 metafile-indexer API，通过 globalMetaId 查询
  const res: MetafileUserInfo = await metafileIndexerApi.get(`/info/globalmetaid/${globalMetaId}`)

  // 将新 API 返回结构转换为兼容旧结构的 UserInfo
  const userInfo: UserInfo = {
    metaid: res.metaid,
    globalMetaId: res.globalMetaId, // 只使用 globalMetaId
    name: res.name,
    address: res.address,
    avatar: res.avatar,
    avatarId: res.avatarId,
    chatpubkey: res.chatpubkey,
    chatpubkeyId: res.chatpubkeyId,
  }
  return userInfo
}
