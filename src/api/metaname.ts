import HttpRequest from '@/utils/request'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

const metanameApi = createLazyApiClient(
  () => `${getRuntimeConfig().api.baseApi}/metaname-indexer`,
  {
    responseHandel: response => {
      return new Promise((resolve, reject) => {
        if (response?.data && typeof response.data?.code === 'number') {
          if (response.data.code === 0) {
            resolve(response.data)
          } else {
            reject({
              code: response.data.code,
              message: response.data.msg,
            })
          }
        } else {
          resolve(response.data)
        }
      })
    },
  }
)
