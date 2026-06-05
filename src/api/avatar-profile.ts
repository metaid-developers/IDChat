import { getUserInfoByGlobalMetaId, type UserBio, type UserInfo } from '@/api/man'
import { resolveCurrentUserAvatarSource, resolveUserAvatarFromInfo } from '@/utils/avatar'

const AVATAR_PROFILE_CACHE_TTL_MS = 5 * 60 * 1000
const AVATAR_PROFILE_MISS_CACHE_TTL_MS = 30 * 1000

export interface AvatarProfileSnapshot {
  address: string
  avatar: string
  avatarImage: string
  bio?: UserBio
  chatPublicKey: string
  chatPublicKeyId: string
  chatpubkey: string
  chatpubkeyId: string
  globalMetaId: string
  metaid: string
  name: string
}

export interface AvatarUserInfoLike {
  address?: string
  avatar?: string
  avatarImage?: string
  bio?: unknown
  chatPublicKey?: string
  chatPublicKeyId?: string
  chatpubkey?: string
  chatpubkeyId?: string
  globalMetaId?: string
  metaid?: string
  metaId?: string
  name?: string
  [key: string]: unknown
}

interface AvatarProfileCacheEntry {
  value: AvatarProfileSnapshot | null
  expiresAt: number
}

const profileCache = new Map<string, AvatarProfileCacheEntry>()
const profileInFlight = new Map<string, Promise<AvatarProfileSnapshot | null>>()

const normalizeGlobalMetaId = (globalMetaId: string): string => String(globalMetaId || '').trim()

const normalizeAvatarProfileSnapshot = (userInfo?: UserInfo | null): AvatarProfileSnapshot | null => {
  if (!userInfo) return null

  const avatar = resolveUserAvatarFromInfo(userInfo)

  return {
    address: userInfo.address || '',
    avatar,
    avatarImage: avatar,
    bio: userInfo.bio,
    chatPublicKey: userInfo.chatpubkey || '',
    chatPublicKeyId: userInfo.chatpubkeyId || '',
    chatpubkey: userInfo.chatpubkey || '',
    chatpubkeyId: userInfo.chatpubkeyId || '',
    globalMetaId: userInfo.globalMetaId || '',
    metaid: userInfo.metaid || '',
    name: userInfo.name || '',
  }
}

const getCachedProfile = (globalMetaId: string): AvatarProfileSnapshot | null | undefined => {
  const entry = profileCache.get(globalMetaId)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    profileCache.delete(globalMetaId)
    return undefined
  }

  return entry.value
}

const setCachedProfile = (globalMetaId: string, value: AvatarProfileSnapshot | null): void => {
  profileCache.set(globalMetaId, {
    value,
    expiresAt:
      Date.now() + (value ? AVATAR_PROFILE_CACHE_TTL_MS : AVATAR_PROFILE_MISS_CACHE_TTL_MS),
  })
}

export const getAvatarProfileByGlobalMetaId = async (
  globalMetaId: string
): Promise<AvatarProfileSnapshot | null> => {
  const key = normalizeGlobalMetaId(globalMetaId)
  if (!key) return null

  const cachedValue = getCachedProfile(key)
  if (cachedValue !== undefined) return cachedValue

  const inFlight = profileInFlight.get(key)
  if (inFlight) return inFlight

  const promise = getUserInfoByGlobalMetaId(key)
    .then(userInfo => normalizeAvatarProfileSnapshot(userInfo))
    .catch(() => null)
    .then(value => {
      setCachedProfile(key, value)
      return value
    })
    .finally(() => {
      profileInFlight.delete(key)
    })

  profileInFlight.set(key, promise)
  return promise
}

export const mergeAvatarProfileIntoUserInfo = (
  userInfo?: AvatarUserInfoLike | null,
  profile?: AvatarProfileSnapshot | null
): AvatarUserInfoLike => {
  const base = { ...(userInfo || {}) }
  if (!profile) return base

  const avatar = resolveCurrentUserAvatarSource(profile, base)

  return {
    ...base,
    address: base.address || profile.address,
    avatar: avatar || base.avatar || '',
    avatarImage: avatar || base.avatarImage || '',
    bio: base.bio || profile.bio,
    chatPublicKey: base.chatPublicKey || profile.chatPublicKey,
    chatPublicKeyId: base.chatPublicKeyId || profile.chatPublicKeyId,
    chatpubkey: base.chatpubkey || profile.chatpubkey,
    chatpubkeyId: base.chatpubkeyId || profile.chatpubkeyId,
    globalMetaId: base.globalMetaId || profile.globalMetaId,
    metaid: base.metaid || profile.metaid,
    name: base.name || profile.name,
  }
}
