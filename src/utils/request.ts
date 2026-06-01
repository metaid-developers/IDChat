import axios, { type AxiosResponse } from 'axios'
import i18n from './i18n'
import { nowMs, recordApiPerfMetric } from '@/utils/perf-monitor'

// 默认超时时间：60秒
const DEFAULT_TIMEOUT = 120000

export default class HttpRequest {
  request
  baseUrl
  constructor(
    baseUrl: string,
    params?: {
      header?: { [key: string]: any } | (() => { [key: string]: any }) // 自定义 header
      errorHandel?: (error: any) => Promise<any> // 自定义 错误处理
      responseHandel?: (response: AxiosResponse<any>) => Promise<any> // 自定义响应处理
      timeout?: number
      timeoutErrorMessage?: string
    }
  ) {
    this.baseUrl = baseUrl
    this.request = axios.create({
      baseURL: baseUrl,
      timeout: params?.timeout || DEFAULT_TIMEOUT,
      timeoutErrorMessage: params?.timeoutErrorMessage || i18n.global.t('Request Timeout'),
      ...params,
    })

    this.request.interceptors.request.use(
      async config => {
        if (!params?.header) return config

        const headers = typeof params.header === 'function' ? params.header() : params.header
        for (const key in headers) {
          if (!config.headers) config.headers = {}
          const value = headers[key]
          config.headers[key] = typeof value === 'function' ? value() : value
        }

        return config
      },
      error => Promise.reject(error)
    )

    this.request.interceptors.response.use(
      async response => {
        if (params?.responseHandel) {
          return await params.responseHandel(response)
        }
        return response.data
      },
      error => {
        if (params?.errorHandel) {
          return params.errorHandel(error)
        }
        return Promise.reject(error)
      }
    )

    this.setupPerfInstrumentation()
  }

  setupPerfInstrumentation() {
    const target = this.request
    if (!target || (typeof target !== 'object' && typeof target !== 'function')) return

    const methods = new Set(['get', 'post', 'put', 'patch', 'delete'])
    const wrapperCache = new Map<string, (...args: any[]) => Promise<any>>()

    this.request = new Proxy(target, {
      get: (proxyTarget: any, prop: string | symbol, receiver: any) => {
        const value = Reflect.get(proxyTarget, prop, receiver)
        if (typeof prop !== 'string' || !methods.has(prop.toLowerCase()) || typeof value !== 'function') {
          return value
        }

        if (wrapperCache.has(prop)) {
          return wrapperCache.get(prop)
        }

        const wrapped = async (...args: any[]) => {
          const startedAt = nowMs()
          const rawUrl = args?.[0]
          const resolvedUrl = this.resolveRequestUrl(rawUrl)

          try {
            const result = await value.apply(proxyTarget, args)
            recordApiPerfMetric({
              method: prop.toUpperCase(),
              url: resolvedUrl,
              duration: nowMs() - startedAt,
              ok: true,
              status: result?.status ?? result?.code ?? result?.data?.code,
            })
            return result
          } catch (error: any) {
            recordApiPerfMetric({
              method: prop.toUpperCase(),
              url: resolvedUrl,
              duration: nowMs() - startedAt,
              ok: false,
              status: error?.status ?? error?.response?.status ?? error?.code,
              error: error?.message || String(error),
            })
            throw error
          }
        }

        wrapperCache.set(prop, wrapped)
        return wrapped
      },
    })
  }

  resolveRequestUrl(input: unknown): string {
    if (typeof input !== 'string') return String(input || '')
    if (/^https?:\/\//i.test(input)) return input

    try {
      return new URL(input, this.baseUrl).toString()
    } catch {
      return `${this.baseUrl}${input}`
    }
  }
}
