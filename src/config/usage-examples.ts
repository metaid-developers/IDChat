/**
 * 配置使用示例
 * 展示如何在项目中使用新的运行时配置系统
 */

// ========================================
// 示例 1: 基础使用
// ========================================

import { getAppConfig } from '@/config/app-config'

export function example1() {
  const config = getAppConfig()
  
  // 访问配置
  console.log('应用名称:', config.appName)
  console.log('API 地址:', config.baseApi)
  console.log('区块链网络:', config.network)
  
  // 根据配置执行逻辑
  if (config.enableChat) {
    console.log('聊天功能已启用')
    // 初始化聊天模块
  }
  
  if (config.enablePayment) {
    console.log('支付功能已启用')
    // 初始化支付模块
  }
}

// ========================================
// 示例 2: 在 API 服务中使用
// ========================================

import { getRuntimeConfig } from '@/config/runtime-config'
import axios from 'axios'

export function createApiClient() {
  const config = getRuntimeConfig()
  
  const client = axios.create({
    baseURL: config.api.baseApi,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  })
  
  return client
}

// ========================================
// 示例 3: 替换环境变量的使用
// ========================================

// ❌ 旧方式（使用环境变量）
function oldWay() {
  const baseApi = import.meta.env.VITE_BASEAPI
  const appName = import.meta.env.VITE_AppName
  const network = import.meta.env.VITE_NET_WORK
  
  return { baseApi, appName, network }
}

// ✅ 新方式（使用运行时配置）
function newWay() {
  const config = getAppConfig()
  
  return {
    baseApi: config.baseApi,
    appName: config.appName,
    network: config.network,
  }
}

// ========================================
// 示例 4: 使用导出的常量函数（兼容方式）
// ========================================

import { 
  VITE_BASEAPI, 
  VITE_AppName,
  VITE_NET_WORK 
} from '@/config/app-config'

export function example4() {
  // 注意：这些是函数，需要调用才能获取值
  const baseApi = VITE_BASEAPI()
  const appName = VITE_AppName()
  const network = VITE_NET_WORK()
  
  console.log({ baseApi, appName, network })
}

// ========================================
// 示例 5: 在 Vue 组件中使用
// ========================================

import { defineComponent, computed } from 'vue'

export default defineComponent({
  setup() {
    const config = getAppConfig()
    
    // 使用计算属性
    const apiUrl = computed(() => `${config.baseApi}/users`)
    const isProduction = computed(() => config.network === 'mainnet')
    
    // 在模板中使用
    return {
      appName: config.appName,
      apiUrl,
      isProduction,
    }
  },
})

// ========================================
// 示例 6: 条件渲染和功能开关
// ========================================

export function example6() {
  const config = getAppConfig()
  
  // 根据配置决定是否显示某些功能
  const shouldShowChat = config.enableChat
  const shouldShowPayment = config.enablePayment
  
  // 白名单检查
  const userAddress = '16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo'
  const canCreateBroadcast = config.whiteListCreateBroadcast.includes(userAddress)
  
  return {
    shouldShowChat,
    shouldShowPayment,
    canCreateBroadcast,
  }
}

// ========================================
// 示例 7: 动态更新配置（热更新）
// ========================================

import { updateRuntimeConfig, reloadRuntimeConfig } from '@/config/runtime-config'

export async function example7() {
  // 方式 1: 部分更新配置
  updateRuntimeConfig({
    features: {
      enableChat: false,
      enablePayment: true,
      stakeholderOnlyLimit: 2,
    },
  })
  
  // 方式 2: 重新加载配置文件
  const newConfig = await reloadRuntimeConfig()
  console.log('配置已重新加载:', newConfig)
}

// ========================================
// 示例 8: 在路由守卫中使用
// ========================================

import type { RouteLocationNormalized, NavigationGuardNext } from 'vue-router'

export function routerGuardExample(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) {
  const config = getAppConfig()
  
  // 如果聊天功能未启用，重定向到首页
  if (to.path.startsWith('/chat') && !config.enableChat) {
    console.warn('聊天功能未启用')
    next('/')
    return
  }
  
  // 检查白名单
  const userAddress = localStorage.getItem('userAddress')
  if (to.path === '/broadcast/create' && userAddress) {
    if (!config.whiteListCreateBroadcast.includes(userAddress)) {
      console.warn('用户不在白名单中')
      next('/broadcast')
      return
    }
  }
  
  next()
}

// ========================================
// 示例 9: 在 Pinia Store 中使用
// ========================================

import { defineStore } from 'pinia'

export const useConfigStore = defineStore('config', {
  state: () => ({
    runtimeConfig: null as ReturnType<typeof getAppConfig> | null,
  }),
  
  actions: {
    loadConfig() {
      this.runtimeConfig = getAppConfig()
    },
    
    async refreshConfig() {
      const newConfig = await reloadRuntimeConfig()
      this.runtimeConfig = getAppConfig()
      return newConfig
    },
  },
  
  getters: {
    apiEndpoints: (state) => ({
      base: state.runtimeConfig?.baseApi,
      chat: state.runtimeConfig?.chatApi,
      metasv: state.runtimeConfig?.metaSvApi,
    }),
    
    features: (state) => ({
      chat: state.runtimeConfig?.enableChat,
      payment: state.runtimeConfig?.enablePayment,
    }),
  },
})

// ========================================
// 示例 10: 在初始化时使用
// ========================================

export async function initializeApp() {
  // 配置已经在 main.ts 中加载，这里直接使用
  const config = getAppConfig()
  
  // 设置页面标题
  document.title = config.appName
  
  // 设置 favicon
  const favicon = document.querySelector<HTMLLinkElement>("link[rel*='icon']")
  if (favicon) {
    favicon.href = config.appFavicon
  }
  
  // 根据环境初始化不同的服务
  if (config.network === 'mainnet') {
    console.log('🟢 运行在主网环境')
    // 初始化主网服务
  } else {
    console.log('🟡 运行在测试网环境')
    // 初始化测试网服务
  }
  
  // 配置 Sentry（如果启用）
  if (config.sentryDsn) {
    console.log('初始化 Sentry 监控')
    // initSentry(config.sentryDsn)
  }
}
