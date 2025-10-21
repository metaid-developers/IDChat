/**
 * Token 图标获取工具
 */

interface TokenIconData {
  genesis: string
  codehash: string
  symbol: string
  logo: string
}

interface TokenIconsResponse {
  success: boolean
  data: TokenIconData[]
}

// 缓存图标数据
let iconDataCache: TokenIconData[] | null = null
let cacheExpiry = 0
const CACHE_DURATION = 30 * 60 * 1000 // 30分钟缓存

/**
 * 获取 MVC Swap 图标数据
 */
async function fetchIconData(): Promise<TokenIconData[]> {
  const now = Date.now()

  // 检查缓存
  if (iconDataCache && now < cacheExpiry) {
    return iconDataCache
  }

  try {
    const response = await fetch('https://icons.mvcswap.com/resources/icons.json')
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const result: TokenIconsResponse = await response.json()
    if (result.success && Array.isArray(result.data)) {
      iconDataCache = result.data
      cacheExpiry = now + CACHE_DURATION
      return result.data
    }

    throw new Error('Invalid response format')
  } catch (error) {
    console.warn('Failed to fetch token icons from mvcswap:', error)
    return []
  }
}

/**
 * 根据 genesis 和 codehash 查找 token 图标
 */
export async function getTokenIcon(genesis: string, codehash?: string): Promise<string | null> {
  try {
    const iconData = await fetchIconData()

    // 优先使用 genesis + codehash 精确匹配
    if (codehash) {
      const exactMatch = iconData.find(
        item => item.genesis === genesis && item.codehash === codehash
      )
      if (exactMatch) {
        return `https://icons.mvcswap.com/resources/${exactMatch.logo}`
      }
    }

    // 如果没有精确匹配，仅使用 genesis 匹配
    const genesisMatch = iconData.find(item => item.genesis === genesis)
    if (genesisMatch) {
      return `https://icons.mvcswap.com/resources/${genesisMatch.logo}`
    }

    return null
  } catch (error) {
    console.warn('Error getting token icon:', error)
    return null
  }
}

/**
 * 根据 symbol 查找 token 图标 (作为备选方案)
 */
export async function getTokenIconBySymbol(symbol: string): Promise<string | null> {
  try {
    const iconData = await fetchIconData()
    const symbolMatch = iconData.find(item => item.symbol.toLowerCase() === symbol.toLowerCase())

    if (symbolMatch) {
      return `https://icons.mvcswap.com/resources/${symbolMatch.logo}`
    }

    return null
  } catch (error) {
    console.warn('Error getting token icon by symbol:', error)
    return null
  }
}

/**
 * 检查图片URL是否可用
 */
export function checkImageAvailable(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url

    // 5秒超时
    setTimeout(() => resolve(false), 5000)
  })
}

/**
 * 获取 token 图标URL，带降级策略
 */
export async function getTokenIconWithFallback(
  genesis: string,
  codehash?: string,
  symbol?: string
): Promise<string | null> {
  // 1. 优先尝试使用 genesis + codehash
  let iconUrl = await getTokenIcon(genesis, codehash)
  if (iconUrl && (await checkImageAvailable(iconUrl))) {
    return iconUrl
  }

  // 2. 如果有 symbol，尝试用 symbol 查找
  if (symbol) {
    iconUrl = await getTokenIconBySymbol(symbol)
    if (iconUrl && (await checkImageAvailable(iconUrl))) {
      return iconUrl
    }
  }

  // 3. 如果都失败，返回 null，使用默认的文字图标
  return null
}
