export interface AppRuntimeConfig {
  app: {
    name: string
    description: string
    keywords: string
    key: string
    logo: string
    favicon: string
    designSize: number
  }
  api: {
    baseApi: string
    adminBaseApi: string
    wxcoreApi: string
    appImgApi: string
    metaSvApi: string
    bsvMetaSvApi: string
    mvcBaseApi: string
    cyber3Api: string
    manApi: string
    fileApi: string
    daoApi: string
    dashbroadApi: string
    chatApi: string
    chatNotify: string
    metanoteUrl: string
    metasoUrl: string
    showMoneyApp: string
    showNowHost: string
    showNowWs: string
    idchatHost: string
    idchatPathWs: string
  }
  blockchain: {
    network: string
    networkNew: string
    metaidTag: string
    walletPath: string
    changeAddress: string
    serviceAddress: string
    serviceFee: number
    addressHost: string
    ethChain: string
    ethChainId: number
    polygonChain: string
    polygonSymbol: string
    polygonChainId: number
    payAmount: number
    minAmount: number
  }
  features: {
    enableChat: boolean
    enablePayment: boolean
    stakeholderOnlyLimit: number
  }
  whiteListCreateBroadcast: string[]
  chat: {
    defaultChannel: string
  }
  security: {
    secretKey: string
    signMsg: string
  }
  sentry: {
    url: string
    project: string
    authToken: string
    org: string
    dsn: string
  }
  other: {
    siteConfigMetanetId: string
    myStakeSymbol: string
    bandProposalId: string[]
  }
}

let runtimeConfig: AppRuntimeConfig | null = null

/**
 * 获取默认配置
 */
function getDefaultConfig(): AppRuntimeConfig {
  return {
    app: {
      name: 'IDChat | Decentralized Messenger Built on Bitcoin',
      description: 'IDChat | Decentralized Messenger Built on Bitcoin',
      keywords: 'IDChat | Decentralized Messenger Built on Bitcoin',
      key: 'IDChat | Decentralized Messenger Built on Bitcoin',
      logo: '/logo.png',
      favicon: '/favicon.ico',
      designSize: 1920,
    },
    api: {
      baseApi: 'https://api.show3.io',
      adminBaseApi: 'https://cmsapi.nos.art',
      wxcoreApi: 'https://www.showpay.top',
      appImgApi: 'https://api.show3.io',
      metaSvApi: 'https://mainnet.mvcapi.com',
      bsvMetaSvApi: 'https://apiv2.metasv.com',
      mvcBaseApi: 'https://api.mvcscan.com/browser',
      cyber3Api: 'https://api.microvisionchain.com/open-api',
      manApi: 'https://man.metaid.io',
      fileApi: 'https://man.metaid.io',
      daoApi: 'https://api.mvcswap.com/stake',
      dashbroadApi: 'https://api.show3.io/tool/api',
      chatApi: 'https://api.idchat.io/chat-api',
      chatNotify: 'https://api.idchat.io',
      metanoteUrl: 'https://gray.metanote.app',
      metasoUrl: 'https://www.metaso.network',
      showMoneyApp: 'https://www.visionmoney.space',
      showNowHost: 'https://api.idchat.io',
      showNowWs: 'https://www.show.now',
      idchatHost: 'https://idchat.io/chat',
      idchatPathWs: '/socket',
    },
    blockchain: {
      network: 'mainnet',
      networkNew: 'livenet',
      metaidTag: 'metaid',
      walletPath: '10001',
      changeAddress: '1By2LtxHQRwzhL2vYMNXuV2WQzkrXM4oS',
      serviceAddress: '115AxP3jECNa5XmnVHYtEJa2cqP6wYjSJV',
      serviceFee: 1999,
      addressHost: 'bc1p20k3x2c4mglfxr5wa5sgtgechwstpld80kru2cg4gmm4urvuaqqsvapxu0',
      ethChain: 'eth',
      ethChainId: 1,
      polygonChain: 'polygon',
      polygonSymbol: 'MATIC',
      polygonChainId: 80001,
      payAmount: 0,
      minAmount: 0,
    },
    features: {
      enableChat: true,
      enablePayment: true,
      stakeholderOnlyLimit: 1,
    },
    whiteListCreateBroadcast: [
      '16xN11wyQmUTS3qFwaJYbwHbjHaFkibxWo',
      '1APkQsxmFLtVKT9Fng7Z6t7pSJ3q17km1F',
      '12ghVWG1yAgNjzXj4mr3qK9DgyornMUikZ',
      '18fhajgmPcR6DVn5vQU2AqmkSzoGJBy9oV',
      '16cuqxU9RBJeTRvh7Ya6Bdk77acTNeeT7v',
    ],
    chat: {
      defaultChannel: 'e836d1b5d05a59c163b89dad69b15fe76cb76314e81b55bbb9e6526def4620b6i0',
    },
    security: {
      secretKey: 'fF3nMXzGPQMw10Kc',
      signMsg: 'metalet.space',
    },
    sentry: {
      url: 'https://sentry.show3.space',
      project: 'show3',
      authToken: '1cfea2e7240a4d5fb51256f33a253c0abd918771bb3841fc8e5478012ce3f5f1',
      org: 'frontend',
      dsn: 'https://93303d5ab3984aacac0e6e6382aaf3dd@sentry.show3.space/2',
    },
    other: {
      siteConfigMetanetId: '',
      myStakeSymbol: 'space_c96faa7fac17b68eab693bb2a4c43e921d169a21310d56ce6eefd51230e4e23d',
      bandProposalId: [
        'a6931c4487cf0728cb2a63357fe88a2f156d2225',
        'ae3063476b431ca43df8574b05095f9a3721b40f',
        'b6c2d447f308aa02225f2938d1551c3c6891f9ec',
      ],
    },
  }
}

/**
 * 加载运行时配置
 */
export async function loadRuntimeConfig(): Promise<AppRuntimeConfig> {
  if (runtimeConfig) {
    return runtimeConfig
  }
  console.log('⏳ Loading runtime config...', import.meta.env.MODE)

  try {
    const response = await fetch(
      window.location.pathname.startsWith('/chat')
        ? '/chat/app-config.json?t=' + Date.now()
        : '/app-config.json?t=' + Date.now()
    )
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const config = await response.json()

    // 可选：在开发环境进行配置验证
    // 注意：动态导入在生产构建时可能导致 Rollup 代码分割冲突，已禁用
    // if (import.meta.env.DEV) {
    //   const { printValidationResult } = await import('./config-validator')
    //   printValidationResult(config)
    // }

    runtimeConfig = config
    console.log('✅ Runtime config loaded successfully')
    return runtimeConfig!
  } catch (error) {
    console.error('❌ Failed to load runtime config, using defaults:', error)
    // 返回默认配置
    runtimeConfig = getDefaultConfig()
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
    console.log('✅ Runtime config updated:', newConfig)
  }
}

/**
 * 重新加载配置（用于热更新）
 */
export async function reloadRuntimeConfig(): Promise<AppRuntimeConfig> {
  runtimeConfig = null
  return loadRuntimeConfig()
}
