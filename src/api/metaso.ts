import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'
import HttpRequest from '@/utils/request'

const MetasoApi = createLazyApiClient(
  () => `${getRuntimeConfig().api.metasoUrl}/assist-open-api/v1/assist/gas`,
  {
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
  }
)

export const getInitUtxo = async ({
  address,
  gasChain = 'mvc',
}: {
  address: string
  gasChain: string
}): Promise<any[]> => {
  //   const query = new URLSearchParams({address,gasChain}).toString()

  return MetasoApi.post(`/mvc/address-init-v2`, { address, gasChain })
    .then(res => {
      return res.data?.utxoList || []
    })
    .catch(e => {
      throw new Error(e.message)
    })
}

export const commitOrder = async ({
  orderId,
  txHex,
}: {
  orderId: string
  txHex: string
}): Promise<any[]> => {
  return MetasoApi.post(`/mvc/commit`, { orderId, txHex })
    .then(res => {
      return res.data || null
    })
    .catch(e => {
      throw new Error(e.message)
    })
}

export const preOrder = async ({
  address,
  txHex,
}: {
  address: string
  txHex: string
}): Promise<any[]> => {
  return MetasoApi.post(`/mvc/pre`, { address, txHex })
    .then(res => {
      return res.data || null
    })
    .catch(e => {
      throw new Error(e.message)
    })
}
