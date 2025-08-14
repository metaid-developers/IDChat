import HttpRequest from '@/utils/request'

const manApi = new HttpRequest(`${import.meta.env.VITE_MAN_API}/api`, {

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
}).request

export interface UserInfo{
address:string
avatar:string
avatarId:string
background:string
bio:string
bioId:string
blocked:boolean
chainName:string
fdv:number
followCount:number
isInit:boolean
metaid:string
name:string
nameId:string
nftAvatar:string
nftAvatarId:string
number:number
pdv:number
pinId:string
soulbondToken:string
unconfirmed:string
}


export const getUserInfoByAddress = (address:string): Promise<UserInfo> => {
  return manApi.get(`/info/address/${address}`)
}

export const getUserInfoByMetaId = (metaid:string): Promise<UserInfo> => {
  return manApi.get(`/info/metaid/${metaid}`)
}