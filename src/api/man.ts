import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

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

interface UserInfoCacheEntry {
  value: UserInfo
  expiresAt: number
}

const USER_INFO_CACHE_TTL_MS = 5 * 60 * 1000
const MAX_USER_INFO_CACHE_SIZE = 2000

const addressCache = new Map<string, UserInfoCacheEntry>()
const metaIdCache = new Map<string, UserInfoCacheEntry>()
const globalMetaIdCache = new Map<string, UserInfoCacheEntry>()

const addressInFlight = new Map<string, Promise<UserInfo>>()
const metaIdInFlight = new Map<string, Promise<UserInfo>>()
const globalMetaIdInFlight = new Map<string, Promise<UserInfo>>()

const nowTs = (): number => Date.now()

const normalizeKey = (value: string): string => String(value || '').trim()

const cloneUserInfo = (userInfo: UserInfo): UserInfo => ({ ...userInfo })

const getFromCache = (cache: Map<string, UserInfoCacheEntry>, key: string): UserInfo | null => {
  const entry = cache.get(key)
  if (!entry) return null
  if (entry.expiresAt <= nowTs()) {
    cache.delete(key)
    return null
  }
  return cloneUserInfo(entry.value)
}

const sweepCacheIfNeeded = (cache: Map<string, UserInfoCacheEntry>): void => {
  if (cache.size <= MAX_USER_INFO_CACHE_SIZE) return
  const removeCount = Math.ceil(cache.size * 0.2)
  const keys = cache.keys()
  for (let i = 0; i < removeCount; i += 1) {
    const key = keys.next().value
    if (!key) break
    cache.delete(key)
  }
}

const setCache = (cache: Map<string, UserInfoCacheEntry>, key: string, userInfo: UserInfo): void => {
  if (!key) return
  cache.set(key, {
    value: cloneUserInfo(userInfo),
    expiresAt: nowTs() + USER_INFO_CACHE_TTL_MS,
  })
  sweepCacheIfNeeded(cache)
}

const normalizeUserInfo = (res: MetafileUserInfo): UserInfo => {
  return {
    metaid: res.metaid,
    globalMetaId: res.globalMetaId, // 只使用 globalMetaId
    name: res.name,
    address: res.address,
    avatar: res.avatar,
    avatarId: res.avatarId,
    chatpubkey: res.chatpubkey,
    chatpubkeyId: res.chatpubkeyId,
  }
}

const warmAllCaches = (userInfo: UserInfo): void => {
  const addressKey = normalizeKey(userInfo.address || '')
  const metaIdKey = normalizeKey(userInfo.metaid || '')
  const globalMetaIdKey = normalizeKey(userInfo.globalMetaId || '')

  if (addressKey) setCache(addressCache, addressKey, userInfo)
  if (metaIdKey) setCache(metaIdCache, metaIdKey, userInfo)
  if (globalMetaIdKey) setCache(globalMetaIdCache, globalMetaIdKey, userInfo)
}

const resolveUserInfoWithCache = async (
  key: string,
  cache: Map<string, UserInfoCacheEntry>,
  inFlight: Map<string, Promise<UserInfo>>,
  fetcher: () => Promise<UserInfo>
): Promise<UserInfo> => {
  const normalizedKey = normalizeKey(key)
  if (!normalizedKey) return fetcher().then(result => cloneUserInfo(result))

  const cached = getFromCache(cache, normalizedKey)
  if (cached) return cached

  const existingPromise = inFlight.get(normalizedKey)
  if (existingPromise) {
    return existingPromise.then(result => cloneUserInfo(result))
  }

  const promise = fetcher()
    .then(result => {
      warmAllCaches(result)
      return result
    })
    .finally(() => {
      inFlight.delete(normalizedKey)
    })

  inFlight.set(normalizedKey, promise)
  return promise.then(result => cloneUserInfo(result))
}

export const getUserInfoByAddress = async (address: string): Promise<UserInfo> => {
  return resolveUserInfoWithCache(
    address,
    addressCache,
    addressInFlight,
    async () => {
      // 使用新的 metafile-indexer API
      const res: MetafileUserInfo = await metafileIndexerApi.get(`/info/address/${address}`)
      return normalizeUserInfo(res)
    }
  )
}

export const getUserInfoByMetaId = async (metaid: string): Promise<UserInfo> => {
  return resolveUserInfoWithCache(
    metaid,
    metaIdCache,
    metaIdInFlight,
    async () => {
      // 使用新的 metafile-indexer API
      const res: MetafileUserInfo = await metafileIndexerApi.get(`/info/metaid/${metaid}`)
      return normalizeUserInfo(res)
    }
  )
}

// 新增：通过 globalMetaId 获取用户信息（支持多链）
export const getUserInfoByGlobalMetaId = async (globalMetaId: string): Promise<UserInfo> => {
  return resolveUserInfoWithCache(
    globalMetaId,
    globalMetaIdCache,
    globalMetaIdInFlight,
    async () => {
      // 使用新的 metafile-indexer API，通过 globalMetaId 查询
      const res: MetafileUserInfo = await metafileIndexerApi.get(`/info/globalmetaid/${globalMetaId}`)
      return normalizeUserInfo(res)
    }
  )
}

export const clearUserInfoRequestCache = (): void => {
  addressCache.clear()
  metaIdCache.clear()
  globalMetaIdCache.clear()
  addressInFlight.clear()
  metaIdInFlight.clear()
  globalMetaIdInFlight.clear()
}

export const getUserInfoRequestCacheStats = () => {
  return {
    addressCacheSize: addressCache.size,
    metaIdCacheSize: metaIdCache.size,
    globalMetaIdCacheSize: globalMetaIdCache.size,
    addressInFlightSize: addressInFlight.size,
    metaIdInFlightSize: metaIdInFlight.size,
    globalMetaIdInFlightSize: globalMetaIdInFlight.size,
  }
}
