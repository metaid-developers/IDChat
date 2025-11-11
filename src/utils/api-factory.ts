/**
 * API 工厂函数
 * 用于创建延迟初始化的 API 客户端，避免在配置加载前访问运行时配置
 */

import { getRuntimeConfig } from '@/config/runtime-config'
import HttpRequest from '@/utils/request'

/**
 * 创建延迟初始化的 API 客户端
 * @param getBaseUrl - 获取 API base URL 的函数
 * @param options - HttpRequest 选项
 * @returns 返回一个 Proxy 对象，延迟初始化 API 客户端
 */
export function createLazyApiClient(getBaseUrl: () => string, options?: any) {
  let instance: any = null

  function getInstance() {
    if (!instance) {
      const baseUrl = getBaseUrl()
      console.log('初始化 API 客户端:', baseUrl)
      instance = new HttpRequest(baseUrl, options || {}).request
    }
    return instance
  }

  // 返回一个 Proxy，所有方法调用都会通过 getInstance() 获取实例
  return new Proxy({} as any, {
    get(target, prop) {
      const api = getInstance()
      return api[prop]
    },
  })
}

/**
 * 使用示例：
 *
 * // 旧方式（会在模块加载时立即执行，可能导致配置未加载错误）
 * const TalkApi = new HttpRequest(`${VITE_CHAT_API()}/group-chat`, options).request
 *
 * // 新方式（延迟初始化，只在第一次使用时创建）
 * const TalkApi = createLazyApiClient(
 *   () => {
 *     const config = getRuntimeConfig()
 *     return `${config.api.chatApi}/group-chat`
 *   },
 *   options
 * )
 */
