/**
 * 配置验证工具
 * 用于验证 app-config.json 文件的格式是否正确
 */

import type { AppRuntimeConfig } from './runtime-config'

/**
 * 验证配置对象
 */
export function validateConfig(config: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // 验证必需的顶层字段
  const requiredTopLevel = ['app', 'api', 'blockchain', 'features', 'whiteListCreateBroadcast', 'chat', 'security']
  for (const field of requiredTopLevel) {
    if (!config[field]) {
      errors.push(`缺少必需字段: ${field}`)
    }
  }

  // 验证 app 配置
  if (config.app) {
    const requiredAppFields = ['name', 'description', 'keywords', 'key']
    for (const field of requiredAppFields) {
      if (!config.app[field]) {
        errors.push(`app.${field} 不能为空`)
      }
    }
    if (config.app.designSize && typeof config.app.designSize !== 'number') {
      errors.push(`app.designSize 必须是数字`)
    }
  }

  // 验证 API 配置
  if (config.api) {
    const requiredApiFields = ['baseApi', 'metaSvApi']
    for (const field of requiredApiFields) {
      if (!config.api[field]) {
        errors.push(`api.${field} 不能为空`)
      }
    }
    // 验证 URL 格式
    const urlFields = [
      'baseApi', 'adminBaseApi', 'wxcoreApi', 'appImgApi', 
      'metaSvApi', 'bsvMetaSvApi', 'mvcBaseApi', 'cyber3Api',
      'manApi', 'daoApi', 'dashbroadApi', 'chatApi', 'chatNotify'
    ]
    for (const field of urlFields) {
      if (config.api[field] && !isValidUrl(config.api[field])) {
        errors.push(`api.${field} 不是有效的 URL: ${config.api[field]}`)
      }
    }
  }

  // 验证 blockchain 配置
  if (config.blockchain) {
    if (!['mainnet', 'testnet'].includes(config.blockchain.network)) {
      errors.push(`blockchain.network 必须是 'mainnet' 或 'testnet'`)
    }
    if (typeof config.blockchain.serviceFee !== 'number') {
      errors.push(`blockchain.serviceFee 必须是数字`)
    }
    if (typeof config.blockchain.ethChainId !== 'number') {
      errors.push(`blockchain.ethChainId 必须是数字`)
    }
    if (typeof config.blockchain.polygonChainId !== 'number') {
      errors.push(`blockchain.polygonChainId 必须是数字`)
    }
  }

  // 验证 features 配置
  if (config.features) {
    if (typeof config.features.enableChat !== 'boolean') {
      errors.push(`features.enableChat 必须是布尔值`)
    }
    if (typeof config.features.enablePayment !== 'boolean') {
      errors.push(`features.enablePayment 必须是布尔值`)
    }
  }

  // 验证白名单
  if (config.whiteListCreateBroadcast) {
    if (!Array.isArray(config.whiteListCreateBroadcast)) {
      errors.push(`whiteListCreateBroadcast 必须是数组`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 验证 URL 格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

/**
 * 在控制台打印配置验证结果
 */
export function printValidationResult(config: any) {
  console.log('🔍 验证应用配置...')
  const result = validateConfig(config)
  
  if (result.valid) {
    console.log('✅ 配置验证通过')
    console.log('配置概览:')
    console.log(`  应用名称: ${config.app?.name}`)
    console.log(`  API 地址: ${config.api?.baseApi}`)
    console.log(`  区块链网络: ${config.blockchain?.network}`)
    console.log(`  功能开关: 聊天=${config.features?.enableChat}, 支付=${config.features?.enablePayment}`)
  } else {
    console.error('❌ 配置验证失败:')
    result.errors.forEach(error => {
      console.error(`  - ${error}`)
    })
  }
  
  return result
}

/**
 * 加载并验证配置文件
 */
export async function loadAndValidateConfig(url: string = '/app-config.json'): Promise<{
  config: AppRuntimeConfig | null
  valid: boolean
  errors: string[]
}> {
  try {
    const response = await fetch(url + '?t=' + Date.now())
    if (!response.ok) {
      return {
        config: null,
        valid: false,
        errors: [`HTTP 错误: ${response.status}`],
      }
    }
    
    const config = await response.json()
    const result = validateConfig(config)
    
    return {
      config: result.valid ? config : null,
      valid: result.valid,
      errors: result.errors,
    }
  } catch (error) {
    return {
      config: null,
      valid: false,
      errors: [`加载配置失败: ${error}`],
    }
  }
}
