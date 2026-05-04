import axios from 'axios'
import { nowMs, recordApiPerfMetric } from '@/utils/perf-monitor'

const getWindowRef = (): any => {
  if (typeof window === 'undefined') return null
  return window as any
}

const normalizeAxiosUrl = (config: any): string => {
  const url = config?.url || ''
  if (!url) return ''
  const baseURL = config?.baseURL || ''
  try {
    if (typeof window !== 'undefined') {
      return new URL(url, baseURL || window.location.origin).toString()
    }
    return new URL(url, baseURL || 'http://localhost').toString()
  } catch {
    return baseURL ? `${baseURL}${url}` : String(url)
  }
}

export const installAxiosPerfMonitor = (): void => {
  const win = getWindowRef()
  if (win?.__idchatAxiosPerfInstalled) return
  if (win) {
    win.__idchatAxiosPerfInstalled = true
  }

  axios.interceptors.request.use(config => {
    ;(config as any).__perfStartAt = nowMs()
    return config
  })

  axios.interceptors.response.use(
    response => {
      const startAt = (response.config as any).__perfStartAt
      const duration = typeof startAt === 'number' ? nowMs() - startAt : 0
      recordApiPerfMetric({
        method: (response.config?.method || 'GET').toUpperCase(),
        url: normalizeAxiosUrl(response.config),
        duration,
        ok: true,
        status: response.status,
      })
      return response
    },
    error => {
      const config = error?.config || {}
      const startAt = (config as any).__perfStartAt
      const duration = typeof startAt === 'number' ? nowMs() - startAt : 0
      recordApiPerfMetric({
        method: (config?.method || 'GET').toUpperCase(),
        url: normalizeAxiosUrl(config),
        duration,
        ok: false,
        status: error?.response?.status || error?.status || error?.code,
        error: error?.message || String(error),
      })
      return Promise.reject(error)
    }
  )
}

installAxiosPerfMonitor()
