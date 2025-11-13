/**
 * 应用配置访问辅助函数
 * 提供便捷的方式访问 runtime-config 中的配置项
 * 用于替代之前的 import.meta.env.VITE_* 环境变量访问方式
 */

import { getRuntimeConfig } from './runtime-config'

/**
 * 获取应用配置
 */
export function getAppConfig() {
  const config = getRuntimeConfig()
  return {
    // 应用信息
    appName: config.app.name,
    appDescription: config.app.description,
    appKeywords: config.app.keywords,
    appKey: config.app.key,
    appLogo: config.app.logo,
    appFavicon: config.app.favicon,
    designSize: config.app.designSize,

    // API 端点
    baseApi: config.api.baseApi,
    adminBaseApi: config.api.adminBaseApi,
    wxcoreApi: config.api.wxcoreApi,
    appImgApi: config.api.appImgApi,
    metaSvApi: config.api.metaSvApi,
    bsvMetaSvApi: config.api.bsvMetaSvApi,
    mvcBaseApi: config.api.mvcBaseApi,
    cyber3Api: config.api.cyber3Api,
    manApi: config.api.manApi,
    fileApi: config.api.fileApi,
    daoApi: config.api.daoApi,
    dashbroadApi: config.api.dashbroadApi,
    chatApi: config.api.chatApi,
    chatNotify: config.api.chatNotify,
    metanoteUrl: config.api.metanoteUrl,
    metasoUrl: config.api.metasoUrl,
    showMoneyApp: config.api.showMoneyApp,
    showNowHost: config.api.showNowHost,
    showNowWs: config.api.showNowWs,
    idchatHost: config.api.idchatHost,
    idchatPathWs: config.api.idchatPathWs,

    // 区块链配置
    network: config.blockchain.network,
    networkNew: config.blockchain.networkNew,
    metaidTag: config.blockchain.metaidTag,
    walletPath: config.blockchain.walletPath,
    changeAddress: config.blockchain.changeAddress,
    serviceAddress: config.blockchain.serviceAddress,
    serviceFee: config.blockchain.serviceFee,
    addressHost: config.blockchain.addressHost,
    ethChain: config.blockchain.ethChain,
    ethChainId: config.blockchain.ethChainId,
    polygonChain: config.blockchain.polygonChain,
    polygonSymbol: config.blockchain.polygonSymbol,
    polygonChainId: config.blockchain.polygonChainId,
    payAmount: config.blockchain.payAmount,
    minAmount: config.blockchain.minAmount,

    // 功能开关
    enableChat: config.features.enableChat,
    enablePayment: config.features.enablePayment,
    stakeholderOnlyLimit: config.features.stakeholderOnlyLimit,

    // 白名单
    whiteListCreateBroadcast: config.whiteListCreateBroadcast,

    // 聊天配置
    chatDefaultChannel: config.chat.defaultChannel,

    // 安全配置
    secretKey: config.security.secretKey,
    signMsg: config.security.signMsg,

    // Sentry 配置
    sentryUrl: config.sentry.url,
    sentryProject: config.sentry.project,
    sentryAuthToken: config.sentry.authToken,
    sentryOrg: config.sentry.org,
    sentryDsn: config.sentry.dsn,

    // 其他配置
    siteConfigMetanetId: config.other.siteConfigMetanetId,
    myStakeSymbol: config.other.myStakeSymbol,
    bandProposalId: config.other.bandProposalId,
  }
}

/**
 * 直接导出配置访问器（用于兼容旧代码）
 * 可以像这样使用: import { VITE_BASEAPI } from '@/config/app-config'
 */
export const VITE_BASEAPI = () => getRuntimeConfig().api.baseApi
export const VITE_AppName = () => getRuntimeConfig().app.name
export const VITE_AppDescription = () => getRuntimeConfig().app.description
export const VITE_AppLogo = () => getRuntimeConfig().app.logo
export const VITE_AppKeywords = () => getRuntimeConfig().app.keywords
export const VITE_App_Key = () => getRuntimeConfig().app.key
export const VITE_Design_Size = () => getRuntimeConfig().app.designSize
export const VITE_WXCOREAPI = () => getRuntimeConfig().api.wxcoreApi
export const VITE_AppImgApi = () => getRuntimeConfig().api.appImgApi
export const VITE_META_SV_API = () => getRuntimeConfig().api.metaSvApi
export const VITE_BSV_META_SV_API = () => getRuntimeConfig().api.bsvMetaSvApi
export const VITE_MVC_BASEAPI = () => getRuntimeConfig().api.mvcBaseApi
export const VITE_CYBER3_API = () => getRuntimeConfig().api.cyber3Api
export const VITE_MAN_API = () => getRuntimeConfig().api.manApi
export const VITE_FILE_API = () => getRuntimeConfig().api.fileApi
export const VITE_DAO_API = () => getRuntimeConfig().api.daoApi
export const VITE_Dashbroad_API = () => getRuntimeConfig().api.dashbroadApi
export const VITE_CHAT_API = () => getRuntimeConfig().api.chatApi
export const VITE_CHAT_NOTIFY = () => getRuntimeConfig().api.chatNotify
export const VITE_METANOTE = () => getRuntimeConfig().api.metanoteUrl
export const VITE_METASO_URL = () => getRuntimeConfig().api.metasoUrl
export const VITE_SHOW_MONEY_APP = () => getRuntimeConfig().api.showMoneyApp
export const VITE_SHOW_NOW_HOST = () => getRuntimeConfig().api.showNowHost
export const VITE_SHOW_NOW_WS = () => getRuntimeConfig().api.showNowWs
export const VITE_IDCHAT_HOST = () => getRuntimeConfig().api.idchatHost
export const VITE_IDCHAT_PATH_WS = () => getRuntimeConfig().api.idchatPathWs

export const VITE_NET_WORK = () => getRuntimeConfig().blockchain.network
export const VITE_NET_WORK_NEW = () => getRuntimeConfig().blockchain.networkNew
export const VITE_METAID_TAG = () => getRuntimeConfig().blockchain.metaidTag
export const VITE_WALLET_PATH = () => getRuntimeConfig().blockchain.walletPath
export const VITE_CHANGE_ADDRESS = () => getRuntimeConfig().blockchain.changeAddress
export const VITE_SERVICE_ADDRESS = () => getRuntimeConfig().blockchain.serviceAddress
export const VITE_SERVICE_FEE = () => getRuntimeConfig().blockchain.serviceFee
export const VITE_ADDRESS_HOST = () => getRuntimeConfig().blockchain.addressHost
export const VITE_ETH_CHAIN = () => getRuntimeConfig().blockchain.ethChain
export const VITE_ETH_CHAINID = () => getRuntimeConfig().blockchain.ethChainId
export const VITE_POLYGON_CHAIN = () => getRuntimeConfig().blockchain.polygonChain
export const VITE_POLYGON_SYMBOL = () => getRuntimeConfig().blockchain.polygonSymbol
export const VITE_POLYGON_CHAINID = () => getRuntimeConfig().blockchain.polygonChainId
export const VITE_PAY_AMOUNT = () => getRuntimeConfig().blockchain.payAmount
export const VITE_MinAmount = () => getRuntimeConfig().blockchain.minAmount

export const VITE_CHAT_DEFAULT_CHANNEL = () => getRuntimeConfig().chat.defaultChannel

export const VITE_SECRECT_KEY = () => getRuntimeConfig().security.secretKey
export const VITE_SIGN_MSG = () => getRuntimeConfig().security.signMsg

export const VITE_SENTRY_URL = () => getRuntimeConfig().sentry.url
export const VITE_SENTRY_PROJECT = () => getRuntimeConfig().sentry.project
export const VITE_SENTRY_AUTH_TOKEN = () => getRuntimeConfig().sentry.authToken
export const VITE_SENTRY_ORG = () => getRuntimeConfig().sentry.org
export const VITE_SENTRY_DSN = () => getRuntimeConfig().sentry.dsn

export const VITE_SiteConfigMetanetId = () => getRuntimeConfig().other.siteConfigMetanetId
export const VITE_MY_STAKE_SYMBOL = () => getRuntimeConfig().other.myStakeSymbol
export const VITE_BAND_PROPOSAL_ID = () => getRuntimeConfig().other.bandProposalId

export const VITE_STAKEHOLDER_ONLY_LIMIT = () => getRuntimeConfig().features.stakeholderOnlyLimit
