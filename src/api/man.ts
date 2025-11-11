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

export interface ChatUserInfo {
  address: string
  avatar: string
  avatarImage: string
  chatPublicKey: string
  chatPublicKeyId: string
  metaid: string
  name: string
}

export interface UserInfo {
  address: string
  avatar: string
  avatarId: string
  background: string
  bio: string
  bioId: string
  blocked: boolean
  chainName: string
  fdv: number
  followCount: number
  isInit: boolean
  metaid: string
  name: string
  nameId: string
  nftAvatar: string
  nftAvatarId: string
  number: number
  pdv: number
  pinId: string
  soulbondToken: string
  unconfirmed: string
  chatpubkey?: string
}

export const getUserInfoByAddress = async (address: string): Promise<UserInfo> => {
  // const res=await manApi.get(`/info/address/${address}`)

  // if(res && !res?.name){
  //   res.name = res.metaid.slice(0,6)
  // }

  // return res

  return manApi.get(`/info/address/${address}`).then(res => {
    if (res && !res?.name) {
      // res.name = res.metaid.slice(0,6)
    }

    return res
  })
}

export const getUserInfoByMetaId = async (metaid: string): Promise<UserInfo> => {
  const res = await manApi.get(`/info/metaid/${metaid}`)

  if (res && !res?.name) {
    // res.name = res.metaid.slice(0, 6)
  }

  return res
}
