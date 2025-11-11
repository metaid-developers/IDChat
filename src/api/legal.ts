import { PayPlatform } from '@/enum'
import { getToken, getUserName, useUserStore } from '@/stores/user'
import HttpRequest from '@/utils/request'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

const Legal = createLazyApiClient(() => `${getRuntimeConfig().api.baseApi}/legal-currency`, {
  // @ts-ignore
  // const Legal = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/newlegal`, {
  // const Legal = new HttpRequest(`http://192.168.168.140:8126`, {
  // const Legal = new HttpRequest(`http://47.243.174.112:8126`, {
  header: () => {
    const userStore = useUserStore()
    if (userStore.isAuthorized) {
      return {
        accessKey: userStore.user?.token,
        userName: userStore.userName,
        timestamp: new Date().getTime(),
      }
    } else {
      return {}
    }
  },
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if (response.data.code !== 0) {
        // eslint-disable-next-line prefer-promise-reject-errors
        reject({
          message: response.data.error,
          code: response.data.code,
        })
      } else {
        resolve(response.data)
      }
    })
  },
})

// 购买法币NFT
export const GetLegalBuyNftInfo = (params: {
  uuid: string
  metaid: string
  type: number
  openid?: string
  goodName: string
  payType: PayPlatform
  quitUrl: string
  from: string
  couponId?: string
}): Promise<GetLegalBuyNft> => {
  return Legal.post('/api/v1/nos/legal/buy', params)
}

// 获取我的法币餘额(欧阳)
export const GetMyLegalAmount = (params: {
  currency: string
  metaid: string
}): Promise<GetMyLegalAmountRes> => {
  return Legal.post('/api/v1/nos/legal/balance', params)
}

export const LegalOffsale = (params: {
  uuid: string
  sig: string
}): Promise<LegalGetUserOnSaleRes> => {
  return Legal.post('/api/v1/nos/legal/off', params)
}

export const GetLegalNftDetail = (params: { uuid: string }): Promise<GetLegalNftDetail> => {
  return Legal.post('/api/v1/nos/legal/detail', params)
}

export const GetLegalRecevierAddress = (): Promise<GetLegalAddress> => {
  return Legal.get('/api/v1/nos/legal/address')
}

export const LegalSaleNft = (params: {
  price: string
  sellDesc: string
  txid: string
}): Promise<GetSaleLegalNftsRes> => {
  return Legal.post('/api/v1/nos/legal/sell', params)
}
