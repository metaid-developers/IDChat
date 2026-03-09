type PerfKind = 'api' | 'span'

interface PerfBaseMetric {
  kind: PerfKind
  ts: number
  duration: number
}

interface ApiPerfMetric extends PerfBaseMetric {
  kind: 'api'
  method: string
  url: string
  ok: boolean
  status?: number | string
  error?: string
}

interface SpanPerfMetric extends PerfBaseMetric {
  kind: 'span'
  name: string
  meta?: Record<string, unknown>
}

export type PerfMetric = ApiPerfMetric | SpanPerfMetric

const PERF_ENABLE_KEY = 'idchat_perf'
const PERF_VERBOSE_KEY = 'idchat_perf_verbose'
const MAX_METRICS = 400

export const nowMs = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

const getWindowRef = (): any => {
  if (typeof window === 'undefined') return null
  return window as any
}

const getStorageValue = (key: string): string | null => {
  try {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const isPerfEnabled = (): boolean => {
  const value = getStorageValue(PERF_ENABLE_KEY)
  if (value === '0') return false
  if (value === '1') return true
  return !!import.meta.env.DEV
}

const isVerboseEnabled = (): boolean => getStorageValue(PERF_VERBOSE_KEY) === '1'

const getMetricsStore = (): PerfMetric[] => {
  const win = getWindowRef()
  if (!win) return []
  if (!Array.isArray(win.__idchatPerfMetrics)) {
    win.__idchatPerfMetrics = []
  }
  return win.__idchatPerfMetrics as PerfMetric[]
}

const pushMetric = (metric: PerfMetric): void => {
  if (!isPerfEnabled()) return

  const store = getMetricsStore()
  store.push(metric)
  if (store.length > MAX_METRICS) {
    store.splice(0, store.length - MAX_METRICS)
  }

  if (isVerboseEnabled()) {
    if (metric.kind === 'api') {
      // eslint-disable-next-line no-console
      console.debug(
        `[PERF][API] ${metric.method} ${metric.status ?? '-'} ${metric.duration.toFixed(1)}ms ${metric.url}`
      )
    } else {
      // eslint-disable-next-line no-console
      console.debug(`[PERF][SPAN] ${metric.name} ${metric.duration.toFixed(1)}ms`, metric.meta || {})
    }
  }
}

export const recordApiPerfMetric = (metric: Omit<ApiPerfMetric, 'kind' | 'ts'>): void => {
  pushMetric({
    kind: 'api',
    ts: Date.now(),
    ...metric,
  })
}

export const recordSpanPerfMetric = (metric: Omit<SpanPerfMetric, 'kind' | 'ts'>): void => {
  pushMetric({
    kind: 'span',
    ts: Date.now(),
    ...metric,
  })
}

export const createPerfSpan = (
  name: string,
  baseMeta?: Record<string, unknown>
): ((extraMeta?: Record<string, unknown>) => void) => {
  const startedAt = nowMs()
  return (extraMeta?: Record<string, unknown>) => {
    recordSpanPerfMetric({
      name,
      duration: nowMs() - startedAt,
      meta: {
        ...(baseMeta || {}),
        ...(extraMeta || {}),
      },
    })
  }
}

const percentile = (sortedValues: number[], p: number): number => {
  if (sortedValues.length === 0) return 0
  const idx = Math.min(sortedValues.length - 1, Math.max(0, Math.floor((p / 100) * sortedValues.length)))
  return sortedValues[idx]
}

const summarizeByKey = (metrics: PerfMetric[], keyGetter: (metric: PerfMetric) => string) => {
  const group = new Map<string, number[]>()
  metrics.forEach(metric => {
    const key = keyGetter(metric)
    if (!group.has(key)) group.set(key, [])
    group.get(key)!.push(metric.duration)
  })

  return Array.from(group.entries())
    .map(([key, values]) => {
      const sorted = [...values].sort((a, b) => a - b)
      const sum = sorted.reduce((acc, cur) => acc + cur, 0)
      return {
        key,
        count: sorted.length,
        avg: sorted.length ? sum / sorted.length : 0,
        p95: percentile(sorted, 95),
        max: sorted.length ? sorted[sorted.length - 1] : 0,
      }
    })
    .sort((a, b) => b.p95 - a.p95)
}

export const getPerfMetrics = (): PerfMetric[] => [...getMetricsStore()]

export const clearPerfMetrics = (): void => {
  const store = getMetricsStore()
  store.splice(0, store.length)
}

export const summarizePerfMetrics = () => {
  const metrics = getPerfMetrics()
  const apiMetrics = metrics.filter(item => item.kind === 'api')
  const spanMetrics = metrics.filter(item => item.kind === 'span')

  return {
    total: metrics.length,
    apiTotal: apiMetrics.length,
    spanTotal: spanMetrics.length,
    apis: summarizeByKey(apiMetrics, item => {
      const api = item as ApiPerfMetric
      return `${api.method} ${api.url}`
    }).slice(0, 20),
    spans: summarizeByKey(spanMetrics, item => (item as SpanPerfMetric).name).slice(0, 20),
  }
}

const setupPerfConsoleHelpers = (): void => {
  const win = getWindowRef()
  if (!win || win.__idchatPerfInstalled) return

  win.__idchatPerfInstalled = true
  win.__idchatPerf = {
    isEnabled: () => isPerfEnabled(),
    isVerbose: () => isVerboseEnabled(),
    enable: () => {
      try {
        localStorage.setItem(PERF_ENABLE_KEY, '1')
      } catch {}
      return isPerfEnabled()
    },
    disable: () => {
      try {
        localStorage.setItem(PERF_ENABLE_KEY, '0')
      } catch {}
      return isPerfEnabled()
    },
    verbose: (enabled?: boolean) => {
      if (typeof enabled === 'undefined') {
        return isVerboseEnabled()
      }
      try {
        localStorage.setItem(PERF_VERBOSE_KEY, enabled ? '1' : '0')
      } catch {}
      return isVerboseEnabled()
    },
    mark: (name = 'manual') => {
      recordSpanPerfMetric({
        name: `manual.${name}`,
        duration: 0,
        meta: { source: 'console' },
      })
      return true
    },
    clear: () => clearPerfMetrics(),
    get: () => getPerfMetrics(),
    summary: () => summarizePerfMetrics(),
  }
}

setupPerfConsoleHelpers()
