import { VITE_CHAT_API } from '@/config/app-config'
import { getUserInfoByGlobalMetaId, type UserInfo } from '@/api/man'
import { resolveCurrentUserAvatarSource, resolveUserAvatarFromInfo } from '@/utils/avatar'

export const ONLINE_BOT_PAGE_SIZE = 100

const LLM_BIO_PREFIX = 'LLM：'
const BIO_LOOKUP_CONCURRENCY = 8
const BOT_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000

export interface OnlineBot {
  globalMetaId: string
  name: string
  avatar: string
  bio: string
  chatPublicKey: string
  lastSeenAt: number
  lastSeenAgoSeconds: number
  deviceCount: number
}

export interface OnlineBotsResult {
  total: number
  cursor: number
  size: number
  onlineWindowSeconds: number
  bots: OnlineBot[]
}

export interface OnlineBotsQuery {
  cursor?: number
  size?: number
}

interface OnlineUserInfo {
  globalMetaId?: string
  metaid?: string
  address?: string
  name?: string
  avatar?: string
  avatarImage?: string
  bio?: unknown
  chatPublicKey?: string
  chatPublicKeyId?: string
}

interface OnlineUserItem {
  globalMetaId?: string
  lastSeenAt?: number
  lastSeenAgoSeconds?: number
  deviceCount?: number
  userInfo?: OnlineUserInfo
}

interface OnlineUsersData {
  total?: number
  cursor?: number
  size?: number
  onlineWindowSeconds?: number
  list?: OnlineUserItem[]
}

interface OnlineUsersResponse {
  code: number
  data?: OnlineUsersData
  message?: string
  processingTime?: number
}

interface BotProfileSnapshot {
  avatar: string
  llmBio: string
}

interface BotProfileCacheEntry {
  value: BotProfileSnapshot
  expiresAt: number
}

const botProfileCache = new Map<string, BotProfileCacheEntry>()
const botProfileInFlight = new Map<string, Promise<BotProfileSnapshot>>()

const compactGlobalMetaId = (globalMetaId: string) => {
  if (globalMetaId.length <= 12) return globalMetaId
  return `${globalMetaId.slice(0, 8)}...${globalMetaId.slice(-4)}`
}

const normalizeGlobalMetaId = (globalMetaId: string): string => String(globalMetaId || '').trim()

const findRecordValue = (record: Record<string, unknown>, key: string): unknown => {
  if (Object.prototype.hasOwnProperty.call(record, key)) return record[key]

  const normalizedKey = key.toLowerCase()
  const matchedKey = Object.keys(record).find(item => item.toLowerCase() === normalizedKey)
  return matchedKey ? record[matchedKey] : undefined
}

const findProviderText = (record: Record<string, unknown>, keys: string[]): string => {
  for (const key of keys) {
    const provider = toProviderText(findRecordValue(record, key))
    if (provider) return provider
  }

  return ''
}

const toProviderText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (typeof value !== 'object' || Array.isArray(value)) return ''

  const record = value as Record<string, unknown>
  return (
    findProviderText(record, ['primaryProvider', 'fallbackProvider', 'LLM', 'llm']) ||
    findProviderText(record, ['provider', 'model', 'name'])
  )
}

const extractBioProvider = (value: unknown): string => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return ''

  const record = value as Record<string, unknown>
  return findProviderText(record, ['primaryProvider', 'fallbackProvider', 'LLM', 'llm'])
}

const tryParseJsonObject = (value: string): Record<string, unknown> | null => {
  try {
    const parsed = JSON.parse(value)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
  } catch {
    return null
  }

  return null
}

const normalizeBio = (bio: unknown): string => {
  if (!bio) return ''

  if (typeof bio === 'string') {
    const trimmedBio = bio.trim()
    if (!trimmedBio) return ''

    if (trimmedBio.startsWith('{') && trimmedBio.endsWith('}')) {
      const provider = extractBioProvider(tryParseJsonObject(trimmedBio))
      return provider ? `${LLM_BIO_PREFIX}${provider}` : ''
    }

    return trimmedBio
  }

  const provider = extractBioProvider(bio)
  return provider ? `${LLM_BIO_PREFIX}${provider}` : ''
}

const normalizeLlmBio = (bio: unknown): string => {
  const provider = typeof bio === 'string' ? extractBioProvider(tryParseJsonObject(bio.trim())) : extractBioProvider(bio)
  return provider ? `${LLM_BIO_PREFIX}${provider}` : ''
}

const normalizeBotProfileSnapshot = (userInfo?: UserInfo | null): BotProfileSnapshot => {
  return {
    avatar: resolveUserAvatarFromInfo(userInfo),
    llmBio: normalizeLlmBio(userInfo?.bio),
  }
}

const getCachedBotProfile = (globalMetaId: string): BotProfileSnapshot | null => {
  const entry = botProfileCache.get(globalMetaId)
  if (!entry) return null
  if (entry.expiresAt <= Date.now()) {
    botProfileCache.delete(globalMetaId)
    return null
  }

  return entry.value
}

const setCachedBotProfile = (globalMetaId: string, value: BotProfileSnapshot): void => {
  botProfileCache.set(globalMetaId, {
    value,
    expiresAt: Date.now() + BOT_PROFILE_CACHE_TTL_MS,
  })
}

const getBotProfileByGlobalMetaId = async (globalMetaId: string): Promise<BotProfileSnapshot> => {
  const key = normalizeGlobalMetaId(globalMetaId)
  if (!key) return normalizeBotProfileSnapshot()

  const cachedValue = getCachedBotProfile(key)
  if (cachedValue !== null) return cachedValue

  const inFlight = botProfileInFlight.get(key)
  if (inFlight) return inFlight

  const promise = getUserInfoByGlobalMetaId(key)
    .then(userInfo => normalizeBotProfileSnapshot(userInfo))
    .catch(() => normalizeBotProfileSnapshot())
    .then(value => {
      setCachedBotProfile(key, value)
      return value
    })
    .finally(() => {
      botProfileInFlight.delete(key)
    })

  botProfileInFlight.set(key, promise)
  return promise
}

const isBotEligible = (
  globalMetaId: string,
  userInfo?: OnlineUserInfo
): userInfo is OnlineUserInfo & { chatPublicKey: string } => {
  if (!globalMetaId) return false
  if (!userInfo?.chatPublicKey) return false
  // Apply precise backend Bot identity filtering here when a Bot marker is available.
  return true
}

const normalizeOnlineBot = (item: OnlineUserItem): OnlineBot | null => {
  const userInfo = item.userInfo
  const globalMetaId = userInfo?.globalMetaId || item.globalMetaId || ''

  if (!isBotEligible(globalMetaId, userInfo)) return null

  return {
    globalMetaId,
    name: userInfo.name || compactGlobalMetaId(globalMetaId),
    avatar: resolveUserAvatarFromInfo(userInfo),
    bio: normalizeBio(userInfo.bio),
    chatPublicKey: userInfo.chatPublicKey,
    lastSeenAt: item.lastSeenAt || 0,
    lastSeenAgoSeconds: item.lastSeenAgoSeconds || 0,
    deviceCount: item.deviceCount || 0,
  }
}

const enrichOnlineBotProfile = async (bot: OnlineBot): Promise<OnlineBot> => {
  const profile = await getBotProfileByGlobalMetaId(bot.globalMetaId)

  return {
    ...bot,
    avatar: resolveCurrentUserAvatarSource({ avatar: profile.avatar }, { avatar: bot.avatar }),
    bio: bot.bio.startsWith(LLM_BIO_PREFIX) ? bot.bio : profile.llmBio || bot.bio,
  }
}

const enrichOnlineBotsProfile = async (bots: OnlineBot[]): Promise<OnlineBot[]> => {
  if (!bots.length) return bots

  const enrichedBots = [...bots]
  let nextIndex = 0
  const workerCount = Math.min(BIO_LOOKUP_CONCURRENCY, enrichedBots.length)

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < enrichedBots.length) {
        const currentIndex = nextIndex
        nextIndex += 1
        enrichedBots[currentIndex] = await enrichOnlineBotProfile(enrichedBots[currentIndex])
      }
    })
  )

  return enrichedBots
}

export const getOnlineBots = async (query: OnlineBotsQuery = {}): Promise<OnlineBotsResult> => {
  const baseUrl = (VITE_CHAT_API() || import.meta.env.VITE_CHAT_API || '').replace(/\/$/, '')
  if (!baseUrl) {
    throw new Error('Chat API base URL is not configured')
  }

  const requestedCursor =
    typeof query.cursor === 'number' && Number.isFinite(query.cursor) ? query.cursor : 0
  const requestedSize =
    typeof query.size === 'number' && Number.isFinite(query.size)
      ? query.size
      : ONLINE_BOT_PAGE_SIZE
  const cursor = Math.max(0, requestedCursor)
  const size = Math.min(Math.max(1, requestedSize), ONLINE_BOT_PAGE_SIZE)
  const params = new URLSearchParams({
    cursor: String(cursor),
    size: String(size),
    withUserInfo: 'true',
  })
  const url = `${baseUrl}/group-chat/socket/online-users?${params.toString()}`
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to load online bots: ${response.status} ${response.statusText}`)
  }

  const result = (await response.json()) as OnlineUsersResponse

  if (result.code !== 0) {
    throw new Error(result.message || 'Failed to load online bots')
  }

  const data = result.data || {}
  const list = Array.isArray(data.list) ? data.list : []
  const botsByGlobalMetaId = new Map<string, OnlineBot>()

  list.forEach(item => {
    const bot = normalizeOnlineBot(item)
    if (bot && !botsByGlobalMetaId.has(bot.globalMetaId)) {
      botsByGlobalMetaId.set(bot.globalMetaId, bot)
    }
  })

  return {
    total: data.total || 0,
    cursor: data.cursor ?? cursor,
    size: data.size ?? size,
    onlineWindowSeconds: data.onlineWindowSeconds || 0,
    bots: await enrichOnlineBotsProfile(Array.from(botsByGlobalMetaId.values())),
  }
}
