export interface AppRuntimeConfig {
  whiteListCreateBroadcast: string[]
  features: {
    enableChat: boolean
    enablePayment: boolean
  }
}

let runtimeConfig: AppRuntimeConfig | null = null

/**
 * 加载运行时配置
 */
export async function loadRuntimeConfig(): Promise<AppRuntimeConfig> {
  if (runtimeConfig) {
    return runtimeConfig
  }

  try {
    const response = await fetch('/app-config.json?t=' + Date.now())
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    runtimeConfig = await response.json()
    console.log('Runtime config loaded:', runtimeConfig)
    return runtimeConfig!
  } catch (error) {
    console.error('Failed to load runtime config, using defaults:', error)
    // 返回默认配置
    runtimeConfig = {
      whiteListCreateBroadcast: [
        '16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo',
        '1APkQsxmFLtVKT9Fng7Z6t7pSJ3q17km1F',
      ],
      features: {
        enableChat: true,
        enablePayment: true,
      },
    }
    return runtimeConfig
  }
}

/**
 * 获取运行时配置（同步）
 */
export function getRuntimeConfig(): AppRuntimeConfig {
  if (!runtimeConfig) {
    throw new Error('Runtime config not loaded. Call loadRuntimeConfig() first in main.ts')
  }
  return runtimeConfig
}

/**
 * 更新运行时配置（用于热更新）
 */
export function updateRuntimeConfig(newConfig: Partial<AppRuntimeConfig>) {
  if (runtimeConfig) {
    runtimeConfig = { ...runtimeConfig, ...newConfig }
  }
}
