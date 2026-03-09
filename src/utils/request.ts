import * as RequestSDK from 'request-sdk'
import i18n from './i18n'
import { nowMs, recordApiPerfMetric } from '@/utils/perf-monitor'

function resolveRequestCtor(mod: any): any {
  const globalRequest = (globalThis as any)?.HttpRequest
  const candidates = [mod?.default, mod?.HttpRequest, mod, globalRequest]

  for (const candidate of candidates) {
    if (typeof candidate === 'function') return candidate
  }

  throw new Error('request-sdk constructor not found')
}

const RequestCtor: any = resolveRequestCtor(RequestSDK)

// 默认超时时间：60秒
const DEFAULT_TIMEOUT = 120000

export default class HttpRequest {
  request
  baseUrl
  constructor(
    baseUrl: string,
    params?: {
      header?: { [key: string]: any } // 自定义 header
      errorHandel?: (error: any) => Promise<any> // 自定义 错误处理
      responseHandel?: (response: any) => Promise<any> // 自定义 错误处理
      timeout?: number
      timeoutErrorMessage?: string
    }
  ) {
    this.baseUrl = baseUrl
    this.request = new RequestCtor(baseUrl, {
      timeout: DEFAULT_TIMEOUT,
      // @ts-ignore
      timeoutErrorMessage: i18n.global.t('Request Timeout'),
      ...params,
    }).request

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
