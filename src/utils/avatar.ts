const PIN_ID_RE = /^[a-f0-9]{64}i\d+$/i

const stripQueryAndHash = (value: string): string => value.split(/[?#]/)[0]

const isEmptyAvatarPlaceholder = (value: string): boolean => {
  const withoutQuery = stripQueryAndHash(value).replace(/\/+$/, '')
  return (
    withoutQuery === '/content' ||
    withoutQuery === '/thumbnail' ||
    withoutQuery.endsWith('/content') ||
    withoutQuery.endsWith('/thumbnail') ||
    withoutQuery === 'metafile://'
  )
}

const isDefaultAvatarPlaceholder = (value: string): boolean => {
  const withoutQuery = stripQueryAndHash(value).replace(/\/+$/, '')
  return /(?:^|\/)default_(?:user|avatar)(?:\.[a-f0-9]+)?\.png$/i.test(withoutQuery)
}

export const normalizeImageSource = (source: unknown): string => {
  return typeof source === 'string' ? source.trim() : ''
}

export const getUserAvatarPinId = (value: string): string => {
  const source = value.trim()
  if (!source) return ''

  const withoutQuery = stripQueryAndHash(source)
  const contentMatch = withoutQuery.match(/\/(?:content|thumbnail)\/([^/]+)$/i)
  if (contentMatch?.[1]) return contentMatch[1]

  if (withoutQuery.startsWith('metafile://')) {
    return withoutQuery.replace('metafile://', '')
  }

  if (PIN_ID_RE.test(withoutQuery)) return withoutQuery
  return ''
}

interface UserAvatarInfo {
  avatar?: string | null
  avatarImage?: string | null
}

interface UserAvatarLookupInfo {
  globalMetaId?: string | null
  metaid?: string | null
  metaId?: string | null
  address?: string | null
}

export type UserAvatarLookupCandidate = {
  type: 'globalMetaId' | 'metaId' | 'address'
  value: string
}

export const resolveUserAvatarSource = (...sources: Array<string | null | undefined>): string => {
  for (const source of sources) {
    if (typeof source !== 'string') continue

    const trimmed = normalizeImageSource(source)
    if (!trimmed) continue
    if (isEmptyAvatarPlaceholder(trimmed)) continue
    if (isDefaultAvatarPlaceholder(trimmed)) continue

    if (trimmed.startsWith('data:image/')) return trimmed

    const pinId = getUserAvatarPinId(trimmed)
    if (pinId) return `/content/${pinId}`

    return trimmed
  }

  return ''
}

export const normalizeAvatarContentApi = (avatarContentApi: string): string =>
  normalizeImageSource(avatarContentApi)
    .replace(/\/thumbnail\/?$/i, '/content')
    .replace(/\/+$/, '')

export const buildUserAvatarContentUrl = (
  avatarContentApi: string,
  source: string,
  width = 235
): string => {
  const baseUrl = normalizeAvatarContentApi(avatarContentApi)
  const pinId = getUserAvatarPinId(source)

  if (!baseUrl || !pinId) return ''

  const avatarUrl = `${baseUrl}/${pinId}`
  return width === -1
    ? avatarUrl
    : `${avatarUrl}?x-oss-process=image/auto-orient,1/quality,q_80/resize,m_lfit,w_${width}`
}

export const resolveUserAvatarLookupCandidates = (
  ...infos: Array<UserAvatarLookupInfo | null | undefined>
): UserAvatarLookupCandidate[] => {
  const candidates: UserAvatarLookupCandidate[] = []
  const seen = new Set<string>()

  const pushCandidate = (type: UserAvatarLookupCandidate['type'], source?: string | null): void => {
    const value = normalizeImageSource(source)
    if (!value) return

    const key = `${type}:${value}`
    if (seen.has(key)) return

    seen.add(key)
    candidates.push({ type, value })
  }

  for (const info of infos) {
    if (!info) continue

    pushCandidate('globalMetaId', info.globalMetaId)
    pushCandidate('metaId', info.metaid || info.metaId)
    pushCandidate('address', info.address)
  }

  return candidates
}

export const shouldHydrateUserAvatarSource = (
  localSource: string,
  candidates: UserAvatarLookupCandidate[],
  hasLoadError = false
): boolean => {
  if (!candidates.length) return false
  return !localSource || hasLoadError
}

export const resolveUserAvatarFromInfo = (userInfo?: UserAvatarInfo | null): string => {
  return resolveUserAvatarSource(userInfo?.avatar, userInfo?.avatarImage)
}

export const resolveCurrentUserAvatarSource = (
  currentUserInfo?: UserAvatarInfo | null,
  fallbackUserInfo?: UserAvatarInfo | null
): string => {
  return resolveUserAvatarSource(
    currentUserInfo?.avatar,
    currentUserInfo?.avatarImage,
    fallbackUserInfo?.avatar,
    fallbackUserInfo?.avatarImage
  )
}
