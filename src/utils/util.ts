import {
  ElLoading,
  ElMessage,
  ElMessageBox,
  ElMessageBoxOptions,
  LoadingParentElement,
} from 'element-plus'
import { router } from '@/router'
import Decimal from 'decimal.js-light'
import axios from 'axios'
import { isAndroidApp, isApp, isIOS, useRootStore, isAndroid, isIosApp } from '@/stores/root'
import { GetBankCards, GetWalletBalance, Inactivation } from '@/api/pay'
import {
  BlindboxUUIDStatus,
  CloudWalletStatus,
  IsEncrypt,
  PayPlatform,
  PayStatus,
  ToCurrency,
  PayType,
  NodeName,
  MetaNameOperateType,
  ProductType,
  Chains,
  EnvMode,
  PayPlatformUnit,
  SdkPayType,
  NFTSellState,
} from '@/enum'
import { CheckBlindboxOrderStatus } from '@/api/v3'
import AllCardJson from '@/utils/card.json'
import { CheckMetaNameValid, GetOrderStatus, IsWtiteUser, MetaNameBeforeReqRes } from '@/api/wxcore'
import { classifyName } from '@/config'
import { v1 as uuidv1 } from 'uuid'
import { decode, encode } from 'js-base64'
// @ts-ignore
import CryptoJs from 'crypto-js'
// @ts-ignore
import encHex from 'crypto-js/enc-hex'
import { QueryFindMetaDataForPost } from '@/api/showman'
import { GetFeeInfo } from '@/api/broad'
import { GetMyLegalAmount, LegalOffsale } from '@/api/legal'
import { AttachmentItem } from '@/@types/hd-wallet'
import { useUserStore } from '@/stores/user'
import {
  createMnemonic,
  encryptMnemonic,
  hdWalletFromMnemonic,
  MetaNameReqCode,
} from './wallet/hd-wallet'
import { toClipboard } from '@soerenmartius/vue3-clipboard'
import i18n from './i18n'
import { Ref } from 'vue'
import ShowSVG from '@/assets/svg/show.svg?component'
import { CreatOrder } from '@/api/wxcore'
import { LoadingTEXT } from './LoadingSVGText'
import { Mitt, MittEvent } from './mitt'
import { ethers } from 'ethers'
import { getBlockHeight } from '@/api'
import { dateTimeFormat } from './filters'
import dayjs from 'dayjs'
import { SendMetaNameTransationResult } from '@/@types/sdk'
import { GetTxChainInfo } from '@/api/metaid-base'
import { useMetaNameStore } from '@/stores/metaname'
import { GetBalance, GetMetaIdByAddress, GetMetaNameInfo, GetUserAllInfo } from '@/api/aggregation'
//@ts-ignore
import namehash from 'eth-ens-namehash'
import Compressor from 'compressorjs'
//@ts-ignore
import { toUnicode } from 'idna-uts46-hx'
import { email } from './reg'
import zlib from 'zlib'
import { string } from 'yup'
import { MetaletWallet } from './wallet/Metalet-wallet'
import { enc, AES, mode, pad, MD5, SHA256 } from 'crypto-js'
import md5 from 'md5'
import mvc from 'mvc-lib'
const emojiReg = /[\u{1F601}-\u{1F64F}\u{2702}-\u{27B0}\u{1F680}-\u{1F6C0}\u{1F170}-\u{1F251}\u{1F600}-\u{1F636}\u{1F681}-\u{1F6C5}\u{1F30D}-\u{1F567}]/gu
const oricalUrl = [
  'https://api.mvcswap.com/blockinfo1',
  'https://api.mvcswap.com/blockinfo2',
  'https://api.metaid.io//oracle/',
  'https://api.metaid.io/block-oracle/',
  'https://witnessonchain.com/v1/chain-info/mvc',
]

export type ResultArray = {
  src: string
  dst: string
}[]

type TransResult = {
  from: string
  to: string
  trans_result: ResultArray
  error_code: number
}

type TransQuery = {
  q: string
  from: string
  to: string
  appid: string
  salt: string
  sign: string
}

function base64ToHex(base64: string) {
  // 将base64解码为二进制字符串
  const binary = atob(base64)
  let hex = ''

  // 将每个字符转换为十六进制
  for (let i = 0; i < binary.length; i++) {
    const charCode = binary.charCodeAt(i)
    // 将字符代码转换为两位十六进制，不足两位前面补零
    hex += charCode.toString(16).padStart(2, '0')
  }

  return hex
}

function uint8ArrayToBase64(uint8Array: Uint8Array) {
  let binary = ''
  const len = uint8Array.byteLength

  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(uint8Array[i])
  }

  return btoa(binary)
}

export async function getFileDataFromUrl(fileUrl: string): Promise<ArrayBuffer> {
  try {
    const response = await fetch(fileUrl)

    const arrayBuffer = await response.arrayBuffer()

    return arrayBuffer
  } catch (error) {}
}

function arrayBufferToHexString(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer)
  let hexString = ''

  for (let i = 0; i < uint8Array.length; i++) {
    const hex = uint8Array[i].toString(16).padStart(2, '0')
    hexString += hex

    // 可选：每2个字节添加空格，提高可读性
    if ((i + 1) % 2 === 0) {
      hexString += ' '
    }

    // 可选：每16个字节换行
    if ((i + 1) % 16 === 0) {
      hexString += '\n'
    }
  }

  return hexString
}

/**
 * ArrayBuffer转Base64字符串
 */
function arrayBufferToBase64String(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer)
  let binaryString = ''

  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i])
  }

  return btoa(binaryString)
}

function arrayBufferToBinaryString(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer)
  let binaryString = ''

  for (let i = 0; i < uint8Array.length; i++) {
    const binary = uint8Array[i].toString(2).padStart(8, '0')
    binaryString += binary
  }

  return binaryString
}

export async function getImageBufferAsString(
  imageUrl: string,
  encoding: 'hex' | 'base64' | 'binary' = 'base64'
): Promise<string> {
  try {
    // 获取图片的ArrayBuffer
    const response = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
    })

    const arrayBuffer = response.data

    // 根据编码格式转换为字符串
    switch (encoding) {
      case 'hex':
        return arrayBufferToHexString(arrayBuffer)

      case 'base64':
        return arrayBufferToBase64String(arrayBuffer)

      case 'binary':
        return arrayBufferToBinaryString(arrayBuffer)

      default:
        throw new Error(`不支持的编码格式: ${encoding}`)
    }
  } catch (error) {
    console.error('获取图片数据失败:', error)
    throw new Error(`无法获取图片: ${error.message}`)
  }
}

export async function getImgData(picPath: string) {
  try {
    const res = await fetch(picPath)
    const result = await res.arrayBuffer()
    const data = new Uint8Array(result)
    // 使用 reduce 方法提高性能
    return Array.from(data).reduce((hex, byte) => hex + byte.toString(16).padStart(2, '0'), '')

    //return data
  } catch (error) {
    throw new Error((error as any).messsage)
  }
}

// 从Blob中读取原始数据
export async function readRawData(blob: Blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('loadend', () => {
      // reader.result 包含ArrayBuffer形式的原始数据
      resolve(reader.result)
    })

    reader.addEventListener('error', reject)

    // 将Blob读取为ArrayBuffer
    reader.readAsArrayBuffer(blob)
  })
}

export function arrayBufferToString(arrayBuffer: any, encoding = 'hex') {
  try {
    const decoder = new TextDecoder(encoding)
    return decoder.decode(arrayBuffer)
  } catch (error) {
    console.error('解码失败:', error)
    throw new Error(`不支持的编码格式: ${encoding}`)
  }
}
// 将ArrayBuffer转换为十六进制字符串
export function arrayBufferToHex(buffer: any) {
  const view = new Uint8Array(buffer)
  let hex = ''

  for (let i = 0; i < view.length; i++) {
    const value = view[i].toString(16).padStart(2, '0')
    hex += value + ' '

    // 每16字节换行
    if ((i + 1) % 16 === 0) {
      hex += '\n'
    }
  }

  return hex
}

export function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
}

export async function blobToHex(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)
  let hexString = ''

  for (let i = 0; i < uint8Array.length; i++) {
    const hex = uint8Array[i].toString(16).padStart(2, '0')
    hexString += hex
  }

  return hexString
}

export function hexToBlob(hexString: string, mimeType: string = 'application/octet-stream'): Blob {
  // 将十六进制字符串转换为字节数组
  const byteArray = new Uint8Array(hexString.length / 2)

  for (let i = 0; i < hexString.length; i += 2) {
    byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16)
  }

  return new Blob([byteArray], { type: mimeType })
}

function isChinese(text: string) {
  return /^[\u4e00-\u9fa5]+$/.test(text)
}

function isEnglish(text: string) {
  return /^[a-zA-Z\s]+$/.test(text)
}

export async function fetchTranlateResult({
  sourceText,
  from,
  to,
}: {
  sourceText: string
  from: 'zh' | 'en'
  to: 'zh' | 'en'
}): Promise<TransResult | undefined> {
  const lang = i18n.global.locale.value

  if (lang == 'en') {
    from = 'zh'
    to = 'en'
  } else {
    from = 'en'
    to = 'zh'
  }

  const salt = new Date().getTime().toString()
  const queryParams: TransQuery = {
    q: sourceText,
    from,
    to,
    appid: '20191010000340428',
    salt,
    sign: md5('20191010000340428' + sourceText + salt + '08cmCzBLrp1l_fKQ9TL6'),
  }
  // const url = `https://fanyi-api.baidu.com/api/trans/vip/translate`;
  const url = `https://api.metaid.io/baidufanyi/api/trans/vip/translate`
  // const url = `/api/trans/vip/translate`;

  try {
    const data = await axios.get(url, { params: queryParams }).then(res => res.data)
    return data
  } catch (error) {
    console.error(error)
    return undefined
  }
}

export function randomString() {
  return Math.random()
    .toString()
    .replace('.', '')
}

export function containsString(protocol: string, searchProtocol: string) {
  // 创建一个正则表达式，匹配传入的字符串
  // 使用 'RegExp' 构造函数，并转义特殊字符
  const regex = new RegExp(searchProtocol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  return regex.test(protocol)
}

export function getTimestampInSeconds() {
  return Math.floor(Date.now() / 1000)
}

export const showLoading = async (fetch: Function, loading: Ref<boolean>) => {
  loading.value = true
  // 最少1秒，防止闪烁
  const currentTimestamp = new Date().getTime()
  await fetch()

  // 保证至少1秒
  const delay = Math.max(1000 - (new Date().getTime() - currentTimestamp), 0)
  if (delay) await sleep(delay)
  loading.value = false
}

export function realRandomString(length: number): string {
  let result = ''
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

export function checkSdkStatus(path: string, params?: ElMessageBoxOptions) {
  return new Promise<void>((resolve, reject) => {
    const userStore = useUserStore()
    if (!userStore.isAuthorized) {
      openLoginConfirm(path, params)
    } else {
      resolve()
    }
  })
}

export function checkUserLogin() {
  return new Promise<void>((resolve, reject) => {
    const userStore = useUserStore()
    const rootStore = useRootStore()
    if (!userStore.isAuthorized) {
      rootStore.$patch({ isShowLogin: true })
      // reject(new Error(i18n.global.t('Please Login First')))
    } else {
      resolve()
    }
  })
}

export function openLoginConfirm(path: string, params?: ElMessageBoxOptions) {
  return new Promise<void>((resolve, reject) => {
    const userStore = useUserStore()
    if (userStore.isAuthorized) {
      resolve()
    } else {
      ElMessageBox.confirm('请先登录再操作', '温馨提示', {
        confirmButtonText: '注册/登录',
        cancelButtonText: '取消',
        type: 'warning',
        ...params,
      })
        .then(result => {
          if (result === 'confirm') {
            userStore.showWallet?.toLogin(path)
          }
        })
        .catch(() => {
          // 取消
        })
    }
  })
}

export function getMetaFileUrl(metafile: string) {
  if (typeof metafile !== 'string') return ''
  metafile = metafile.replace('metafile://', '')
  if (metafile === '') return ''
  return `${import.meta.env.VITE_AppImgApi}/metafile/${metafile}`
}

export function setDataStrclassify(data: any) {
  const classify =
    data && data.classifyList instanceof Array
      ? data.classifyList
      : data && typeof data.classifyList === 'string' && data.classifyList !== ''
      ? JSON.parse(data.classifyList)
      : []
  return classify
}

export function sleep(timer = 2000) {
  return new Promise<void>(resolve => {
    setTimeout(() => {
      resolve()
    }, timer)
  })
}

export function getMetaCenterConfig(metaId: string | string[]) {
  return new Promise(async resolve => {
    const res = await QueryFindMetaDataForPost({
      find: {
        parentNodeName: 'MetaCenterConfig',
        rootTxId: `${metaId}`,
        isNew: true,
      },
      skip: 0,
      limit: 1,
      sort: { timestamp: -1 },
    })
    if (res.code === 200 && res.result.data[0]) {
      resolve(res.result.data[0])
    } else {
      resolve(null)
    }
  })
}

// 获取用户购买 需额外付费的金额
// 默认费率
const platform = 0.025
const royalty = 0.035
const firstPlatform = 0.06
const firstRoyalty = 0
export function getUserBuyExtraFee(params: {
  codehash: string
  genesis: string
  isFirstSell: boolean
  amount: number
  ignoreIndex?: number
  isNotCache?: boolean
}) {
  return new Promise<{
    platformFee: number
    royaltyFee: number
    total: number
    platformPercentage: number
    royaltyPercentage: number
    coin_service: number
  }>(async (resolve, reject) => {
    try {
      const userStore = useUserStore()
      let coin_service = 0
      let platformPercentage = params.isFirstSell ? firstPlatform : platform
      let royaltyPercentage = params.isFirstSell ? firstRoyalty : royalty
      if (params.codehash && params.genesis) {
        let feeInfo: GerFeeInfoResData | null = null
        const key = `${params.genesis}/${params.codehash}`
        if (!params.isNotCache) {
          const feeInfoString = window.sessionStorage.getItem(key)
          if (feeInfoString) feeInfo = JSON.parse(feeInfoString)
        }
        if (!feeInfo) {
          const res = await GetFeeInfo({
            codehash: params.codehash,
            genesis: params.genesis,
            address: userStore.user?.address,
            ignoreIndex: params.ignoreIndex,
          })
          if (res.code === 0 && res.data) {
            feeInfo = res.data
            if (!params.isNotCache) window.sessionStorage.setItem(key, JSON.stringify(res.data))
          }
        }
        if (feeInfo) {
          platformPercentage = params.isFirstSell
            ? feeInfo.first_platform / 100
            : feeInfo.other_platform / 100
          royaltyPercentage = params.isFirstSell
            ? feeInfo.first_royalty / 100
            : feeInfo.other_royalty / 100
          coin_service = feeInfo.coin_service / 100
        }
      }
      let platformFee = Math.ceil(new Decimal(params.amount).mul(platformPercentage).toNumber())
      let royaltyFee = Math.ceil(new Decimal(params.amount).mul(royaltyPercentage).toNumber())
      const minAmount = parseInt(import.meta.env.VITE_MinAmount)
      if (platformFee < minAmount && platformFee !== 0) platformFee = minAmount
      if (royaltyFee < minAmount && royaltyFee !== 0) royaltyFee = minAmount

      resolve({
        platformFee,
        royaltyFee,
        total:
          platformFee + royaltyFee >= minAmount || platformFee + royaltyFee === 0
            ? platformFee + royaltyFee
            : minAmount,
        platformPercentage,
        royaltyPercentage,
        coin_service,
      })
    } catch (error) {
      reject(error)
    }
  })
}

// 是否冬奥系列
export function isWinterOlympicSeries(genesis: string, codehash: string) {
  const series = [
    {
      genesis: '75a54625033c5b109df1667bfe53ea3a3cebc0c1',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: '071022161e00db31c6e8cf4dfc32b10acbee2039',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: '9c39bec1ed94867404cf7a9ccdb68f11acc8ce6c',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: 'bae198a3807febaaa34ba934a084051527c6b221',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: 'ccf0b9852afc82f976d39c9e2ec02a7b501dd245',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: '3c13169443de24533a3d81e5627ab60fe818f380',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: '0e22864ed5e96c7ff96dd6628889e0f5d2a0daf2',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: '0687f8eaaad0680ca6441579709094682d4a5dab',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: 'd32ce142d1dc4cb4581f9ec4b0839dd80c5725c2',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: 'c04f2af56088347cab32b73318647cd09c4136b6',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: '376e6a397a7aae84bc04f7492c74ba6d1c5c6b3d',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
    {
      genesis: '10ec817567a29ac0543666d4876433d7f087700c',
      codehash: '22519e29424dc4b94b9273b6500ebadad7b9ad02',
    },
  ]
  const index = series.findIndex(item => item.codehash === codehash && item.genesis === genesis)
  return index !== -1
}

export function calcCnyPrice(params: {
  amount: number
  genesis: string
  codehash: string
  isFirstSell?: boolean
  isLegal?: boolean
}) {
  return new Promise<number>(async resolve => {
    const rootStore = useRootStore()
    //  法币价格
    let cnyAmount = 0
    if (params.isLegal) {
      cnyAmount = new Decimal(params.amount).div(100).toNumber()
    } else {
      // bsv
      const res = await getUserBuyExtraFee({
        codehash: params.codehash,
        genesis: params.genesis,
        isFirstSell: !!params.isFirstSell,
        amount: params.amount,
      })
      if (res) {
        // cny 平台手续费
        let cnyPlatformFee = new Decimal(res.platformFee)
          .div(Math.pow(10, 8))
          .mul(rootStore.exchangeRate.cnyRate)
          .toNumber()
        if (cnyPlatformFee < 0.01) cnyPlatformFee = 0.01
        // cny 版税
        let cnyRoyaltyFee = new Decimal(res.royaltyFee)
          .div(Math.pow(10, 8))
          .mul(rootStore.exchangeRate.cnyRate)
          .toNumber()
        if (cnyRoyaltyFee < 0.01) cnyRoyaltyFee = 0.01
        cnyPlatformFee = new Decimal(new Decimal(cnyPlatformFee).toFixed(2)).toNumber()
        cnyRoyaltyFee = new Decimal(new Decimal(cnyRoyaltyFee).toFixed(2)).toNumber()

        // cny nft pirce
        let cnyNFTPrice = new Decimal(params.amount)
          .div(Math.pow(10, 8))
          .mul(rootStore.exchangeRate.cnyRate)
          .toNumber()
        if (cnyNFTPrice < 0.01) cnyNFTPrice = 0.01
        cnyNFTPrice = new Decimal(new Decimal(cnyNFTPrice).toFixed(2)).toNumber()

        // 跨币种 服务费
        let cnyConversionServiceFee = new Decimal(params.amount)
          .div(Math.pow(10, 8))
          .mul(res.coin_service)
          .mul(rootStore.exchangeRate.cnyRate)
          .toNumber()
        if (cnyConversionServiceFee < 0.01) cnyConversionServiceFee = 0.01
        cnyConversionServiceFee = new Decimal(
          new Decimal(cnyConversionServiceFee).toFixed(2)
        ).toNumber()

        // 总价 = cny nft  + cny 平台手续费 + cny 版税费 + 跨币种服务费
        cnyAmount = new Decimal(cnyNFTPrice)
          .plus(cnyPlatformFee)
          .plus(cnyRoyaltyFee)
          .plus(cnyConversionServiceFee)
          .toNumber()
      }
    }

    resolve(cnyAmount)
  })
}

export function setDocumentTitle(title: string) {
  document.title = `${title} - ${import.meta.env.VITE_AppName}`
}

export function openAppForH5(url: string) {
  const iframe = document.createElement('iframe')
  iframe.id = 'h5-app-iframe'
  iframe.style.display = 'none'
  iframe.name = 'openAppForH5'
  iframe.src = url
  window.document.body.append(iframe)
  setTimeout(() => {
    window.postMessage({ url }, '*')
  }, 2000)
}

export function camelToKebab(str: string): string {
  return str
    .replace(/\B([A-Z])(?=[a-z])/g, '-$1')
    .replace(/\B([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
}

export function alertCatchError(error: any) {
  return new Promise<void>(resolve => {
    if (error) {
      if (typeof error === 'string') {
        ElMessage.error(error)
      } else if (error.message) {
        ElMessage.error({
          message: error.message,
          duration: 50000,
        })
      }
    }
    resolve()
  })
}

export function checkAppHasMethod(methodName: string) {
  return new Promise<void>((resolve, reject) => {
    // @ts-ignore
    if (window.appMetaIdJsV2[methodName]) {
      resolve()
    } else {
      reject(Error('当前App版本不支持此功能，请先升级到最新版本使用'))
    }
  })
}

export function trim(str: string) {
  return str.replace(/(^\s*)|(\s*$)/g, '')
}

export function isTabarPage(routeName: any) {
  const tabbarPageNames = [
    'home',
    'homeCollcet',
    'homeBlindBox',
    'homeMarket',
    'homeActivity',
    'market',
    'marketClassify',
    'mine',
    'mineOffsale',
    'mineSale',
    'mineSaleNos',
    'mineSaleNFTonShow',
    'mineBlindbox',
    'mineRight',
    'mineLogin',
    'discovery',
    'discoveryCollect',
  ]
  return !!tabbarPageNames.find(item => item === routeName)
}

export function toUrl(url: string | undefined) {
  if (!url) return
  try {
    const Url = new URL(url!)
    let target
    if (isIOS) {
      target = '_selft'
    } else {
      target = '_blank'
    }
    window.open(url, target)
  } catch (error) {
    // 站内链接
    router.push(url)
  }
}

export async function downloadFile(url: string, name = 'file') {
  const userStore = useUserStore()
  if (isAndroidApp) {
    await checkAppHasMethod('saveShareImage')
    window.appMetaIdJsV2.saveShareImage(userStore.user?.token, url, name)
  } else {
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.download = name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

export function atobToHex(str: string) {
  const binaryString = atob(str)
  let hexString = ''
  for (let i = 0; i < binaryString.length; i++) {
    const hex = binaryString
      .charCodeAt(i)
      .toString(16)
      .padStart(2, '0')
    hexString += hex
  }

  return hexString
}

export function completeReload() {
  // dump search params then reload
  const url = new URL(window.location.href)

  url.searchParams.delete('clear')
  url.searchParams.delete('address')

  window.location.href = url.href

  return
}

export function openLoading(params?: {
  parent?: LoadingParentElement
  background?: string
  svg?: string
  svgViewBox?: string
  spinner?: string
  text?: string
  fullscreen?: boolean
  lock?: boolean
  customClass?: string
  visible?: boolean
  target?: HTMLElement
  beforeClose?: () => boolean
  closed?: () => void
}) {
  if (!params) params = {}
  if (!params.background) params.background = 'rgba(0,0,0,0.3)'
  return ElLoading.service({
    ...params,
    // svgViewBox: '0 0 156.99951171875 125.99756622314453',
    //svg: LoadingTEXT,
    lock: params?.lock || true,
    //svgViewBox: '0 0 20 20',
    // @ts-ignore
    text: params?.text || i18n.global.t('Loading') + '...',
  })
}

export function urlToBlob(url: string): Promise<Blob> {
  return axios.get(url, { responseType: 'blob' }).then(res => {
    return res.data
  })
}

export function urlToBase64(url: string): Promise<string> {
  return urlToBlob(url).then(b => {
    return new Promise((resolve, reject) => {
      const fileReader = new FileReader()
      fileReader.onload = (e: any) => {
        resolve(e.target.result)
      }
      fileReader.onerror = err => {
        reject(err)
      }
      fileReader.readAsDataURL(b)
    })
  })
}

export function getRuoxiWalletBalance() {
  return new Promise<number>(async resolve => {
    const userStore = useUserStore()
    let amount = 0
    const res = await GetMyLegalAmount({
      currency: 'CNY',
      metaid: userStore.user!.metaId,
    }).catch(() => resolve(amount))
    if (res?.code === 0) {
      if (res.data.amount < 0) res.data.amount = 0
      amount = new Decimal(res.data.amount).div(100).toNumber()
    }
    resolve(amount)
  })
}

export function getCloudWalletBalance() {
  return new Promise<number>(async resolve => {
    const userStore = useUserStore()
    let amount = 0
    const res = await GetWalletBalance({
      bizUserNo: userStore.user!.address!,
      accountType: '01',
    }).catch(() => resolve(amount))
    if (res?.success) {
      amount = new Decimal(res.data.accountList[0].availableBal).toNumber()
    }
    resolve(amount)
  })
}

export function getWalletBalance() {
  return new Promise<{
    total: number
    ruoxi: number
    cloud: number
  }>(async resolve => {
    const result = {
      total: 0,
      ruoxi: 0,
      cloud: 0,
    }
    const res = await Promise.all([getRuoxiWalletBalance(), getCloudWalletBalance()])
    if (res) {
      if (res[0]) result.ruoxi = res[0]
      if (res[1]) result.cloud = res[1]
      if (res[1] || res[0]) result.total = new Decimal(res[0]).plus(res[1]).toNumber()
    }
    resolve(result)
  })
}

export async function toCreateWallet(status: CloudWalletStatus, fullPath: string) {
  const userStore = useUserStore()
  // 控制是否有权限使用餘额支付
  const result = await IsWtiteUser(userStore.user!.metaId!)
  if (!result) {
    return ElMessage.error('抱歉，您暂无权限使用此功能')
  }
  if (status === CloudWalletStatus.UnCreated) {
    router.push({
      name: 'walletActivation',
      query: {
        form: encodeURIComponent(fullPath),
      },
    })
  } else {
    const loading = openLoading()
    const res = await Inactivation({
      address: userStore.user!.address!,
      frontUrl: window.origin + '/wallet/check?form' + encodeURIComponent(fullPath),
    }).catch(error => {
      loading.close()
      alertCatchError(error)
    })
    if (res?.success) {
      window.open(res.data.url, '_self')
    }
  }
}

export function checkOrderStatus(params: {
  orderId: string
  payPlatform?: PayPlatform
  isBilinbox?: boolean
}) {
  return new Promise<{
    amount: number
    status: PayStatus
  }>(async (resolve, reject) => {
    if (params.isBilinbox) {
      const res = await CheckBlindboxOrderStatus({
        uuid: params.orderId,
      }).catch(() => {
        resolve({
          status: PayStatus.Fail,
          amount: 0,
        })
      })
      if (res?.code === 0) {
        if (res.data.status === BlindboxUUIDStatus.PaySuccess) {
          resolve({
            status: PayStatus.Success,
            amount: 0,
          })
        } else {
          resolve({
            status: PayStatus.Fail,
            amount: 0,
          })
        }
      }
    } else {
      const res = await GetOrderStatus({
        orderId: params.orderId,
        payType: params.payPlatform!,
      }).catch(error => reject(error))
      if (res?.code === 0) {
        const amount = res.data.pay_amount
        let status
        if (res.data.status === 2 || res.data.status === 3 || res.data.status === 4) {
          status = PayStatus.Success
        } else {
          status = PayStatus.Fail
        }
        resolve({
          amount,
          status,
        })
      }
    }
  })
}

export function getUserBankCard() {
  return new Promise<BankCardItem[]>(async resolve => {
    const userStore = useUserStore()
    const cards: BankCardItem[] = []
    const res = await GetBankCards({
      address: userStore.user!.address,
    }).catch(error => {
      alertCatchError(error)
      resolve(cards)
    })
    if (res?.success) {
      cards.length = 0
      res.data.bankCardList.forEach(item => {
        for (const i in AllCardJson) {
          if (AllCardJson[i] === item.bankName) {
            item.bankCode = i
            break
          }
        }
      })
      cards.push(...res.data.bankCardList)
    }
    resolve(cards)
  })
}

export function getNFTClassify(classifyList: string[] | undefined) {
  let classify = ''
  if (classifyList && classifyList?.length > 0) {
    classify = classifyList[0]
    const name = classifyName[classify]
    if (name) classify = name
  }
  return classify
}

export function toWhatsonchain(txId: string) {
  toUrl(`https://whatsonchain.com/tx/${txId}`)
}

export function toMvcScan(txId: string) {
  let target
  if (isIOS) {
    target = '_selft'
  } else {
    target = '_blank'
  }
  window.open(`https://mvcscan.com/tx/${txId}`, target)
}

export function setPayQuitUrl(params: {
  fullPath: string
  payPlatform: PayPlatform
  isBlindbox?: boolean
}) {
  const uuidMsg = {
    isBlindbox: !!params.isBlindbox,
    form: params.fullPath,
    payPlatform: params.payPlatform,
  }
  const uuid = uuidv1()
  window.sessionStorage.setItem(uuid, JSON.stringify(uuidMsg))
  const quitUrl = `${location.origin}${
    router.resolve({
      name: 'payResult',
      query: {
        uuid,
      },
    }).href
  }&orderId=`
  return quitUrl
}

// 是否邮箱
export function isEmail(email = '') {
  const emailReg = new RegExp('^[A-Za-z0-9\u4e00-\u9fa5]+@[a-zA-Z0-9_-]+(.[a-zA-Z0-9_-]+)+$')
  return emailReg.test(email)
}

// 循环执行某方法
export function loopExecutionFunction(
  targetFunction: (params: any) => any,
  targetFunctionParams: any,
  callback: (params: any) => boolean,
  option?: {
    loop?: number
    timer?: number
  }
) {
  return new Promise<any>(async (resolve, reject) => {
    if (!option) option = {}
    if (!option.loop) option.loop = 10
    if (!option.timer) option.loop = 1000
    let isSuccess = false
    let resolveRes: any
    for (let i = 0; i < option!.loop; i++) {
      try {
        const res = await targetFunction(targetFunctionParams)
        if (res) {
          const result = callback(res)
          if (result) {
            isSuccess = true
            resolveRes = res
            break
          } else {
            await sleep(option.timer)
          }
        }
      } catch (error) {
        await sleep(option.timer)
      }
    }
    if (isSuccess) {
      resolve(resolveRes)
    } else {
      reject(new Error(`loop ${targetFunction.toString()} fail`))
    }
  })
}

// 随机数
export function randomNumber(minNum: number, maxNum: number) {
  switch (arguments.length) {
    case 1:
      // @ts-ignore
      return parseInt(Math.random() * minNum + 1, 10)
    case 2:
      // @ts-ignore
      return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10)
    default:
      return 0
  }
}

// 防抖
export function debounce(fn: any, delay = 1000) {
  let timer: any
  return function() {
    clearTimeout(timer)

    timer = setTimeout(() => {
      console.log('debounce')
      fn.apply(this, arguments)
    }, delay)
  }
}

// 节流
export function throttle(func, delay = 500) {
  let timer: any
  let throttled = false

  return function() {
    if (!throttled) {
      func.apply(this, arguments)
      throttled = true
      timer = setTimeout(() => {
        throttled = false
      }, delay)
    }
  }
}

// export async function compressImage(image: File): Promise<File> {
//   return new Promise((resolve, reject) => {
//     new Compressor(image, {
//       quality: 0.6,
//       convertSize: 100_000, // 100KB
//       success: resolve as () => File,
//       error: reject,
//     })
//   })
// }
export async function compressImage(image: File) {
  const compress = (quality: number): Promise<File> =>
    new Promise((resolve, reject) => {
      new Compressor(image, {
        quality,
        convertSize: 100_000, // 100KB
        success: resolve as () => File,
        error: reject,
      })
    })

  // Use 0.6 compression ratio first; If the result is still larger than 1MB, use half of the compression ratio; Repeat 5 times until the result is less than 1MB, otherwise raise an error
  let useQuality = 0.6
  for (let i = 0; i < 5; i++) {
    const compressed = await compress(useQuality)
    if (compressed.size < 1_000_000) {
      return compressed
    }
    useQuality /= 2
  }

  throw new Error('Image is too large')
}

// 降文件转为 AttachmentItem， 便于操作/上链
export function FileToAttachmentItem(file: File, encrypt: IsEncrypt = IsEncrypt.No) {
  return new Promise<AttachmentItem>(async (resolve, reject) => {
    function readResult(blob: Blob) {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          // @ts-ignore
          const wordArray = CryptoJs.lib.WordArray.create(reader.result)
          // @ts-ignore
          const buffer = Buffer.from(reader.result)
          hex += buffer.toString('hex') // 更新hex
          // 增量更新计算结果
          sha256Algo.update(wordArray) // 更新hash
          //  const chunkArray = new Uint8Array(reader.result as ArrayBuffer);
          // uint8Array.set(chunkArray, offset);
          resolve()
        }
        reader.readAsArrayBuffer(blob)
      })
    }
    // 分块读取，防止内存溢出，这里设置为20MB,可以根据实际情况进行配置
    const chunkSize = 20 * 1024 * 1024
    const uint8Array = new Uint8Array(file.size)
    let hex = '' // 二进制
    const sha256Algo = CryptoJs.algo.SHA256.create()

    for (let index = 0; index < file.size; index += chunkSize) {
      await readResult(file.slice(index, index + chunkSize))
    }

    resolve({
      data: hex,
      fileName: file.name,
      fileType: file.type,
      sha256: encHex.stringify(sha256Algo.finalize()),
      url: URL.createObjectURL(file),
      encrypt,
      size: file.size,
    })
  })
}

export function hexToUint8Array(hexString: string) {
  // 移除可能存在的空格或前缀（如0x）
  hexString = hexString.replace(/^0x|\s/g, '')

  // 确保长度为偶数
  if (hexString.length % 2 !== 0) {
    throw new Error('Hex string must have an even length')
  }

  const length = hexString.length / 2
  const array = new Uint8Array(length)

  for (let i = 0; i < length; i++) {
    const byteHex = hexString.substr(i * 2, 2)
    array[i] = parseInt(byteHex, 16)
  }

  return array
}

export function hexToBase64(hexString: string) {
  // 移除可能存在的空格和前缀
  const cleanHex = hexString.replace(/\s/g, '').replace(/^0x/, '')

  // 验证是否为有效的十六进制字符串
  if (!/^[0-9A-Fa-f]*$/.test(cleanHex)) {
    throw new Error('Invalid hexadecimal string')
  }

  // 确保十六进制字符串长度为偶数
  const paddedHex = cleanHex.length % 2 === 0 ? cleanHex : '0' + cleanHex

  // 将十六进制字符串转换为字节数组
  const byteArray = []
  for (let i = 0; i < paddedHex.length; i += 2) {
    byteArray.push(parseInt(paddedHex.substr(i, 2), 16))
  }

  // 将字节数组转换为二进制字符串
  const binaryString = byteArray.map(byte => String.fromCharCode(byte)).join('')

  // 使用btoa函数将二进制字符串转换为Base64
  return btoa(binaryString)
}

// 降 AttachmentItem， 转为具有占位符 的 数组
export function getAttachmentsMark(attachments: (AttachmentItem | string)[]) {
  let result = []
  for (let i = 0; i < attachments.length; i++) {
    if (typeof attachments[i] === 'string') {
      result.push(attachments[i])
    } else {
      result.push(`metafile://$[${i}]`)
    }
  }
  return result
}

export function copy(
  value: string | undefined,
  option?: {
    successText?: string
    errorText?: string
  }
) {
  return new Promise<void>((resolve, reject) => {
    if (value) {
      toClipboard(value)
        .then(() => {
          ElMessage.success(option?.successText || i18n.global.t('copysuccess'))
          resolve()
        })
        .catch(() => {
          ElMessage.success(option?.errorText || i18n.global.t('copyerror'))
        })
    }
  })
}

export async function tx(e: Event, txId: string | undefined) {
  if (!txId) return

  e.preventDefault()
  const chainInfoRes = await GetTxChainInfo(txId)
  const chain =
    chainInfoRes.code === 0 && chainInfoRes.data.chainFlag
      ? chainInfoRes.data.chainFlag
      : Chains.MVC

  const url =
    chain === Chains.MVC ? `https://mvcscan.com/tx/${txId}` : `https://whatsonchain.com/tx/${txId}`
  toUrl(url)
}

// 随机数
export function randomRange(min: number, max: number) {
  // min最小值，max最大值

  return Math.floor(Math.random() * (max - min)) + min
}

export function getCurrencyAmount(
  price: string | number, // 最小单位
  currency: ToCurrency,
  toCurrency?: ToCurrency
) {
  const rootStore = useRootStore()
  console.log('rootStore.exchangeRate', rootStore.exchangeRate)
  if (!price) return 0
  const ToCurrencyAmountFix = {
    [ToCurrency.BSV]: 8,
    [ToCurrency.CNY]: 2,
    [ToCurrency.ETH]: 9,
    [ToCurrency.MVC]: 8,
    [ToCurrency.POLYGON]: 9,
    [ToCurrency.USD]: 2,
  }
  const ToCurrencyAmounRate = {
    [ToCurrency.BSV]: Math.pow(10, 8),
    [ToCurrency.CNY]: 100,
    [ToCurrency.ETH]: Math.pow(10, 9),
    [ToCurrency.MVC]: Math.pow(10, 8),
    [ToCurrency.POLYGON]: Math.pow(10, 9),
    [ToCurrency.USD]: 100,
  }
  if (!toCurrency) {
    toCurrency = rootStore.currentPrice
  }
  let amount
  if (currency === toCurrency) {
    amount = new Decimal(
      new Decimal(price).div(ToCurrencyAmounRate[currency].toFixed(ToCurrencyAmountFix[currency]))
    ).toNumber()
  } else if (currency === ToCurrency.CNY || currency === ToCurrency.USD) {
    if (currency === ToCurrency.CNY && toCurrency === ToCurrency.USD) {
      //  cny -> usd
      amount = new Decimal(
        new Decimal(rootStore.exchangeRate[0].price.USD)
          .div(rootStore.exchangeRate[0].price.CNY)
          .mul(price)
          .div(ToCurrencyAmounRate[currency])
          .toFixed(ToCurrencyAmountFix[toCurrency])
      ).toNumber()
    } else if (currency === ToCurrency.USD && toCurrency === ToCurrency.CNY) {
      // usd -> cny

      amount = new Decimal(
        new Decimal(rootStore.exchangeRate[0].price.CNY)
          .div(rootStore.exchangeRate[0].price.USD)
          .mul(price)
          .div(ToCurrencyAmounRate[currency])
          .toFixed(ToCurrencyAmountFix[toCurrency])
      ).toNumber()
    } else {
      // * -> cny/ usd
      const rate = rootStore.exchangeRate.find(
        item => item.symbol.toUpperCase() === toCurrency!.toUpperCase()
      )
      amount = new Decimal(
        new Decimal(price)
          .div(ToCurrencyAmounRate[currency])
          .div(rate!.price[currency])
          .toFixed(ToCurrencyAmountFix[toCurrency])
      ).toNumber()
    }
  } else if (toCurrency === ToCurrency.CNY || toCurrency === ToCurrency.USD) {
    const currenyRate = rootStore.exchangeRate.find(
      item => item.symbol.toUpperCase() === currency!.toUpperCase()
    )
    amount = new Decimal(
      new Decimal(currenyRate!.price[toCurrency])
        .mul(price)
        .div(ToCurrencyAmounRate[currency])
        .toFixed(ToCurrencyAmountFix[toCurrency])
    ).toNumber()
  } else {
    const currenyRate = rootStore.exchangeRate.find(
      item => item.symbol.toUpperCase() === currency!.toUpperCase()
    )
    const toCurrencyRate = rootStore.exchangeRate.find(
      item => item.symbol.toUpperCase() === toCurrency!.toUpperCase()
    )

    amount = new Decimal(
      new Decimal(currenyRate!.price.CNY)
        .div(toCurrencyRate!.price.CNY)
        .mul(price)
        .div(ToCurrencyAmounRate[currency])
        .toFixed(ToCurrencyAmountFix[toCurrency])
    ).toNumber()
  }

  return amount

  // if (toCurrency === ToCurrency.CNY) {
  //   if (currency === ToCurrency.CNY) {
  //     //  cny -> cny
  //     return new Decimal(price).div(100).toNumber()
  //   } else if (currency === ToCurrency.USD) {
  //     // usd -> cny
  //     const rateUSD = new Decimal(rootStore.exchangeRate[1]!.price.CNY)
  //       .div(rate!.price.USD)
  //       .toNumber()
  //     return new Decimal(
  //       new Decimal(price)
  //         .div(100)
  //         .div(rateUSD)
  //         .toFixed(2)
  //     ).toNumber()
  //   } else {
  //     rate = rootStore.exchangeRate.find(
  //       item => item.symbol.toUpperCase() === currency.toUpperCase()
  //     )
  //     return new Decimal(new Decimal(price).mul(rate!.price.CNY).toFixed(2)).toNumber()
  //   }
  // } else if (toCurrency === ToCurrency.ETH) {
  //   if (currency === 'CNY') {
  //     // cny -> eth
  //     let result = new Decimal(
  //       new Decimal(price)
  //         .div(100)
  //         .div(rate!.price.CNY)
  //         .toFixed(5)
  //     ).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else if (currency === ToCurrency.USD) {
  //     // usd -> eth
  //     let result = new Decimal(new Decimal(price).div(rate!.price.USD).toFixed(5)).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else {
  //     // mvc -> eth
  //     return 0
  //   }
  // } else if (toCurrency === ToCurrency.BSV) {
  //   if (currency === 'CNY') {
  //     let result = new Decimal(
  //       new Decimal(price)
  //         .div(100)
  //         .div(rate!.price.CNY)
  //         .toFixed(5)
  //     ).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else if (currency === ToCurrency.USD) {
  //     // usd -> eth
  //     let result = new Decimal(new Decimal(price).div(rate!.price.USD).toFixed(5)).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else {
  //     // mvc -> eth
  //     return 0
  //   }
  // } else if (toCurrency === ToCurrency.POLYGON) {
  //   if (currency === 'CNY') {
  //     let result = new Decimal(
  //       new Decimal(price)
  //         .div(100)
  //         .div(rate!.price.CNY)
  //         .toFixed(5)
  //     ).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else if (currency === ToCurrency.USD) {
  //     // usd -> eth
  //     let result = new Decimal(new Decimal(price).div(rate!.price.USD).toFixed(5)).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else {
  //     // mvc -> eth
  //     return 0
  //   }
  // } else if (toCurrency === ToCurrency.MVC) {
  //   if (currency === 'CNY') {
  //     let result = new Decimal(
  //       new Decimal(price)
  //         .div(100)
  //         .div(rate!.price.CNY)
  //         .toFixed(5)
  //     ).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else if (currency === ToCurrency.USD) {
  //     // usd -> eth
  //     let result = new Decimal(new Decimal(price).div(rate!.price.USD).toFixed(5)).toNumber()
  //     if (result < 0.00001) result = 0.00001
  //     return result
  //   } else {
  //     // mvc -> eth
  //     return 0
  //   }
  // } else {
  //   //  USD

  //   if (currency === 'CNY') {
  //     // cny -> usd
  //     const rateUSD = new Decimal(rootStore.exchangeRate[1]!.price.CNY)
  //       .div(rootStore.exchangeRate[1]!.price.USD)
  //       .toNumber()
  //     return new Decimal(
  //       new Decimal(price)
  //         .div(100)
  //         .div(rateUSD)
  //         .toFixed(2)
  //     ).toNumber()
  //   } else {
  //     rate = rootStore.exchangeRate.find(
  //       item => item.symbol.toUpperCase() === currency.toUpperCase()
  //     )
  //     // mvc -> usd
  //     const result = new Decimal(new Decimal(price).mul(rate!.price.USD).toFixed(2)).toNumber()
  //     return result > 0.01 ? result : 0.01
  //   }
  // }
}

export function SetLang(lang: string) {
  if (i18n.global.locale.value === lang) return
  i18n.global.locale.value = lang
  window.localStorage.setItem('lang', lang)
  if (!window.localStorage.getItem('currentPrice')) {
    const rootStore = useRootStore()
    rootStore.$patch({ currentPrice: i18n.global.locale.value === 'en' ? 'USD' : 'CNY' })
  }
}

export function CreatePayOrder(params: {
  platform: PayPlatform
  fullPath: string
  goods_name: string
  count: number
  product_type: ProductType // 100-ME, 200-Legal_NFT,
  uuid?: string

  // 购买合约 NFT
  genesis?: string
  codehash?: string
  contract?: string
  tokenIndex?: string

  // metanem
  data?: string
  operate_type?: MetaNameOperateType
  mvc_to_address?: string
  nft_to_address?: string
  tx_fee?: number
  fee_per_year?: number
  meta_name_len?: number
  meta_name_uts_ascii?: string
}) {
  return new Promise<PayOrderStatus>(async (resolve, reject) => {
    try {
      const userStore = useUserStore()
      let from = !isApp ? 'web' : isAndroid ? 'android' : isIOS ? 'ios' : ''
      from += `:${import.meta.env.VITE_App_Key}`
      // 支付回调地址
      const quitUrl = setPayQuitUrl({
        payPlatform: params.platform,
        fullPath: params.fullPath,
        isBlindbox: false,
      })
      const type = isIosApp
        ? PayType.H5
        : isApp
        ? PayType.App
        : isAndroid && isIOS
        ? PayType.H5
        : PayType.H5
      const res = await CreatOrder({
        address: userStore.user!.address!,
        description: params.product_type === 100 ? 'Recharge ME' : 'Buy NFT',
        from,
        metaid: userStore.user!.metaId,
        pay_type: params.platform,
        quit_url: quitUrl,
        types: type,
        from_coin_address:
          params.platform === PayPlatform.ETH || params.platform === PayPlatform.POLYGON
            ? userStore.user?.evmAddress
            : userStore.user!.address,
        ...params,
        count:
          params.product_type === ProductType.ME
            ? new Decimal(params.count).mul(100).toNumber()
            : params.count,
      })
      if (res?.code === 0) {
        resolve(res.data)
      }
    } catch (error) {
      reject(error)
    }
  })
}

export function CheckMetaMaskAccount(params: { chainId: string }) {
  return new Promise<void>(async (resolve, reject) => {
    const result = await (window as any).ethereum.enable()
    if (result && result.length) {
      const root = useRootStore()
      const chain = (window as any).ethereum?.chainId
      const chainId = parseInt(chain).toString()

      if (params.chainId === chainId) {
        resolve()
      } else {
        ChangeMetaMaskChain(params)
          .then(() => {
            resolve()
          })
          .catch(error => reject(error))
      }
      // const request = await (window as any).ethereum.request({
      //   method: 'eth_requestAccounts',
      //   params: [address],
      // })
      // const res = await (window as any).ethereum.request({
      //   method: 'wallet_requestPermissions',
      //   params: [{ eth_accounts: address }],
      // })
    }
  })
}

export function ChangeMetaMaskChain(params: { chainId: string }) {
  return new Promise<void>(async (resolve, reject) => {
    // if ((window as any).ethereum?.chainId)
    const evmChanName = {
      [import.meta.env.VITE_ETH_CHAINID]: import.meta.env.VITE_ETH_CHAIN,
      [import.meta.env.VITE_POLYGON_CHAINID]: import.meta.env.VITE_POLYGON_CHAIN,
    }

    const res = await ElMessageBox.confirm(
      // @ts-ignore
      i18n.global.t('MetaMak.Chain Network Error Tips') + `${evmChanName[params.chainId]}`,
      i18n.global.t('MetaMak.Chain Network Error'),
      {
        customClass: 'primary',
        // @ts-ignore
        confirmButtonText: i18n.global.t('MetaMak.Change') + `${evmChanName[params.chainId]}`,
        cancelButtonText: i18n.global.t('Cancel'),
      }
    )
      .then(() => {
        ;(window as any).ethereum
          .request({
            method: 'wallet_switchEthereumChain',
            params: [
              {
                chainId: ethers.utils.hexValue(parseInt(params.chainId)),
                // chainId:
                //   import.meta.env.VITE_ETH_CHAIN == 'eth'
                //     ? currentSupportChain[0].chainId
                //     : currentSupportChain[1].chainId,
              },
            ],
          })
          .then((res: string[]) => {
            resolve()
          })
          .catch((error: any) => {
            reject(error)
          })
      })
      .catch(error => {
        reject(error)
      })
  })
}

export function followUser(params: {
  value: boolean
  name: string
  metaId: string
  address: string
}) {
  return new Promise<void | NodeTransactions | null>(async (resolve, reject) => {
    if (!params.value) {
      ElMessageBox.confirm(
        // @ts-ignore
        `${i18n.global.t('cancelFollowTips')}: ${params.name}`,
        i18n.global.t('Warning'),
        {
          confirmButtonText: i18n.global.t('Confirm'),
          cancelButtonText: i18n.global.t('Cancel'),
          confirmButtonClass: 'main-border primary',
          cancelButtonClass: 'main-border',
        }
      )
        .then(async () => {
          const res = await confirmFollow(params)
          resolve(res)
        })
        .catch(() => {
          resolve(null)
        })
    } else {
      const res = await confirmFollow(params)
      resolve(res)
    }
  })
}

export function createBrfcid(params: { title: string; author: string; versions: string }) {
  const content = `${params.title.trim()}${params.author.trim()}${params.versions.trim()}`
  const res = mvc.crypto.Hash.sha256(mvc.crypto.Hash.sha256(Buffer.from(content)))
    .reverse()
    .toString('hex')
    .substring(0, 12)

  return res
}

export async function confirmFollow(params: { address: string; metaId: string; value: boolean }) {
  return new Promise<void | NodeTransactions | null>(async (resolve, reject) => {
    const userStore = useUserStore()
    const payAmount = parseInt(import.meta.env.VITE_PAY_AMOUNT)
    const res = await userStore.showWallet
      .createBrfcChildNode({
        nodeName: NodeName.PayFollow,
        data: JSON.stringify({
          createTime: new Date().getTime(),
          MetaID: params.metaId,
          pay: payAmount,
          payTo: params.address,
          status: params.value ? 1 : -1,
        }),
        payTo: [{ amount: payAmount, address: params.address }],
      })
      .catch(error => reject(error))
    if (res) {
      Mitt.emit(MittEvent.FollowUser, { metaId: params.metaId, result: params.value })
    }
    resolve(res)
  })
}
function getBase64(url: string, callback: Function) {
  //通过构造函数来创建的 img 实例，在赋予 src 值后就会立刻下载图片，相比 createElement() 创建 <img> 省去了 append()，也就避免了文档冗餘和污染
  let Img = new Image()
  let dataURL = ''
  Img.src = url + '?v=' + Math.random() // 处理缓存,fix缓存bug,有缓存，浏览器会报错;
  Img.setAttribute('crossOrigin', 'Anonymous') // 解决控制台跨域报错的问题
  Img.onload = function() {
    //要先确保图片完整获取到，这是个异步事件
    let canvas = document.createElement('canvas'), //创建canvas元素
      context = canvas.getContext('2d'),
      width = Img.width, //确保canvas的尺寸和图片一样
      height = Img.height
    canvas.width = width
    canvas.height = height
    context!.drawImage(Img, 0, 0, width, height) //将图片绘制到canvas中
    dataURL = canvas.toDataURL('image/png') //转换图片为dataURL
    // canvas.toBlob(blob => {

    //   resolve(blob)
    // },'image/png')
    callback(dataURL)
  }
}

export function dataURLtoFile(dataurl: any, filename: string) {
  //将base64转换为文件，dataurl为base64字符串，filename为文件名（必须带后缀名，如.jpg,.png）
  let arr = dataurl.split(','),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n)
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n)
  }
  return new File([u8arr], filename, { type: mime })
}

export const setInitImg = (
  url: string,
  callback: Function
): Promise<{ file: File; base64Res: string | ArrayBuffer | null }> => {
  let img = url //这里是图片URL
  return new Promise(resolve => {
    getBase64(img, async dataURL => {
      let fileImgRes = dataURLtoFile(dataURL, img)
      const file = await callback(fileImgRes)
      let reader = new FileReader()
      reader.readAsDataURL(fileImgRes)
      reader.onload = function() {
        let base64Res = reader.result
        resolve({
          file,
          base64Res,
        })
      }
    })
  })
}

export const bytesLength = (str: string) => {
  return Buffer.from(toUnicode(str)).length
  // let intLength = 0
  // for (let i = 0; i < str.length; i++) {
  //   let a = str.charAt(i)
  //   if (a.match(/[^\x00-\xff]/gi) != null) {
  //     intLength += 2
  //   } else {
  //     intLength += 1
  //   }
  // }
  // return intLength
}

export const getMetaNamePrice = (metaName: string) => {
  const metaNameStore = useMetaNameStore()
  const result = bytesLength(metaName)
  if (result === 3) return metaNameStore.MetaNameFeePerYear.third
  else if (result === 4) return metaNameStore.MetaNameFeePerYear.four
  else return metaNameStore.MetaNameFeePerYear.five
}

//获取UTC到期时间
// export function GetExpiredUTC(expiredBlockHeight: number, blockHeight?: any) {
//   return new Promise<string | null>(async (resolve, reject) => {
//     try {
//       //获取当前块高信息：medianTime，blocks
//       if (!blockHeight) {
//         blockHeight = await getBlockHeight()
//       }
//       const distanceDay = new Decimal(expiredBlockHeight)
//         .sub(blockHeight.blocks)
//         .div(144)
//         .toNumber()
//       const date: any = dateTimeFormat(blockHeight.medianTime * 1000)
//       const res = dayjs(date).add(distanceDay, 'day')
//       const result = dateTimeFormat(res.valueOf(), 'UTC')
//       resolve(result)
//     } catch (error) {
//       reject(error)
//     }
//   })
// }

//获取UTC到期时间
export function GetExpiredUTC(expiredBlockTime: number) {
  if (new Decimal(expiredBlockTime).toString().length < 13) {
    return dateTimeFormat(new Decimal(expiredBlockTime).mul(1000).toNumber(), 'UTC')
  } else {
    return dateTimeFormat(expiredBlockTime, 'UTC')
  }
}

//到期时间提醒
export function remindExpired(expireTime: any) {
  const remindTime = 3 //单位:月
  return (
    dayjs(expireTime.split(' ')[0]).diff(
      dateTimeFormat(+Date.now(), 'UTC', 'YYYY-MM-DD'),
      'month'
    ) < remindTime
  )
}

export function getLocalAccount() {
  const localPassword = window.localStorage.getItem(encode('password'))
  const localUserInfo = window.localStorage.getItem(encode('user'))
  if (!localPassword || !localUserInfo) {
    throw new Error('用户登录失败')
  }
  const password = decode(localPassword)
  const userInfo: UserInfo = JSON.parse(decode(localUserInfo))
  // 如果缓存是老的（没有Path），则删除缓存重新登录
  if (!userInfo.path) {
    window.localStorage.removeItem(encode('password'))
    window.localStorage.removeItem(encode('user'))
    // reload
    window.location.reload()
  }
  return {
    password,
    userInfo,
  }
}

export function loopExecution(
  fun: (params: any) => Promise<any>,
  funParams: any,
  params?: {
    sleepTime?: number
    maxLoopCount?: number
  }
) {
  return new Promise(async (resolve, reject) => {
    const initParams = {
      maxLoopCount: 10,
      sleepTime: 1000,
    }
    params = {
      ...initParams,
      ...params,
    }
    // @ts-ignore
    const res = await loopExecutionRun({
      fun,
      funParams,
    }).catch(error => {
      reject(error)
    })
    if (res) {
      resolve(res)
    }
  })
}

// 循环执行 递归 Promise 函数
export function loopExecutionRun(params: {
  fun: (params?: any) => Promise<any> // 需要递归的方法
  funParams?: any // 方法的参数
  maxLoopCount?: number // 最大循环次数
  sleepTime?: number //
  currentCount?: number // 当前循环次数
}) {
  return new Promise<any>(async (resolve, reject) => {
    const initParams = {
      maxLoopCount: 10,
      sleepTime: 1000,
      currentCount: 1,
    }
    params = {
      ...initParams,
      ...params,
    }
    for (let i = 0; i < params.maxLoopCount!; i++) {
      const res = await params.fun(params.funParams).catch(error => {
        if (i == params.maxLoopCount! - 1) {
          reject(error)
        }
      })
      if (res || res === null) {
        resolve(res)
        break
      }
      await sleep(params.sleepTime)
    }
  })
}

export function currentConnectChain(chainId: string) {
  switch (chainId) {
    case '0x1':
    case '0xr':
      return 'eth'
    case '0x89':
    case '0x13881':
      return 'polygon'
  }
}

export function mappingChainName(chainName: string) {
  switch (chainName.toLocaleLowerCase()) {
    case 'eth':
      return '0x1'
    case 'goerli':
      return '0x5'
    case 'polygon':
      return '0x89'
    case 'mumbai':
      return '0x13881'
  }
}

export function mappingChainId(chainId: string) {
  switch (chainId) {
    case '0x1':
    case '0x5':
      return PayPlatform.ETH
    default:
      return PayPlatform.POLYGON
  }
}

export function getUserBsvBalance() {
  return new Promise<number>(async (resolve, reject) => {
    const userStore = useUserStore()
    const res = await GetBalance(userStore.showWallet!.wallet!.rootAddress).catch(error => {
      reject(error)
    })
    if (res) {
      resolve(res)
    }
  })
}

export const nativePayPlatforms = [
  PayPlatform.ETH,
  PayPlatform.POLYGON,
  PayPlatform.BSV,
  PayPlatform.SPACE,
]

export function getPlatformSymbol(platform: PayPlatform, defaultValue = '') {
  if (nativePayPlatforms.includes(platform)) {
    return PayPlatformUnit[platform]
  } else {
    if (defaultValue) return defaultValue
    else return '￥'
    // return rootStore.currentPriceSymbol
  }
}

export function getAccountUserInfo(account: string) {
  return new Promise<UserAllInfo>(async (resolve, reject) => {
    try {
      let metaId: string = ''
      let address: string = ''
      const userStore = useUserStore()
      if (email.test(account)) {
        const res = await userStore.showWallet.wallet?.provider.getPayMailAddress(account)
        if (res) {
          address = res
        }
      }

      let isAddress: any = false

      try {
        // @ts-ignore
        isAddress = mvc.Address._transformString(account)
        if (isAddress) {
          address = account
        }
      } catch (error) {
        isAddress = false
      }

      if (account.length === 64 && !email.test(account) && !isAddress) {
        // MetaId
        metaId = account
      }

      if (account.length !== 64 && !email.test(account) && !isAddress) {
        const res = await GetMetaNameInfo(account.replace('.metaid', ''))
        if (res.code === 0) {
          if (
            res.data.resolveAddress &&
            res.data.ownerAddress &&
            res.data.ownerAddress === res.data.resolveAddress
          ) {
            address = res.data.resolveAddress
          } else {
            throw new Error(i18n.global.t('NFT.TransferToMetaNameNotMatch'))
          }
        }
      }

      if (address) {
        const res = await GetMetaIdByAddress(address).catch(() => {
          metaId = ''
        })
        if (res?.code === 0) {
          metaId = res.data
        }
      }

      if (metaId === '') {
        resolve({
          metaId: '',
          address: address,
          name: email.test(account) ? account : '',
          avatarImage: '',
        } as UserAllInfo)
      } else {
        const res = await GetUserAllInfo(metaId!).catch(error => {
          ElMessage.error(error.message)
        })
        if (res?.code === 0) {
          resolve(res.data)
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}

export function getBalance(params: { chain: Chains }) {
  return new Promise<number>(async (resolve, reject) => {
    const userStore = useUserStore()
    const isBtLink = params.chain === Chains.BSV || params.chain === Chains.MVC
    const isETHChain = params.chain === Chains.ETH || params.chain === Chains.Goerli
    const isPOLYGONChain = params.chain === Chains.POLYGON || params.chain === Chains.MUMBAI
    const _params: any = {}
    _params.address = isBtLink ? userStore.user!.address : userStore.user!.evmAddress
    _params.chain = isBtLink
      ? params.chain
      : isETHChain
      ? import.meta.env.VITE_ETH_CHAIN
      : import.meta.env.VITE_POLYGON_CHAIN
    if (userStore.metaletLogin) {
      console.log(userStore)
      const metaWallet = userStore.showWallet.wallet as MetaletWallet
      _params.xpub = await metaWallet.metaIDJsWallet.getXPublicKey()
    }
    if (isBtLink && !userStore.metaletLogin) {
      //@ts-ignore
      _params.xpub = userStore.showWallet.wallet?.wallet.xpubkey.toString()
    }
    if (!isBtLink && !userStore.user?.evmAddress) {
      resolve(0)
    } else if (params.chain === Chains.BSV && import.meta.env.MODE === EnvMode.TestnetGray) {
      //  BSV 沒有測試網
      resolve(0)
    } else {
      const res = await GetBalance(_params.address).catch(error => reject(error))
      resolve(res!)
    }
  })
}

export function getUserInfoByAddress(address: string) {
  return new Promise<UserAllInfo>(async (resolve, reject) => {
    try {
      const res = await GetMetaIdByAddress(address)
      if (res.code === 0) {
        const response = await GetUserAllInfo(res.data)
        if (response.code === 0) {
          resolve(response.data)
        }
      }
    } catch (error) {
      reject(error)
    }
  })
}

export function replaceMarkdownTag(markdown: string) {
  return markdown
    .replace(/```+/g, '')
    .replace(/#+/g, '')
    .replace(/-+/g, '')
    .replace(/\n(&gt;|\\>)/g, '')
    .replace(/^>{1}/g, '')
}

export function Orical(select: number[]) {
  const seleted = oricalUrl.filter((item, index) => {
    return select.includes(index)
  })
  const requestList = []
  for (const request of seleted) {
    requestList.push(axios.get(request))
  }
  if (requestList.length) {
    return Promise.all([...requestList])
  }
}

export function changeSymbol(symbol: string) {
  if (symbol.indexOf('stake_dao_test') !== -1) {
    return `stake_dao_test`
  } else {
    return symbol
  }
}

/**
 * 将图片URL转换为base64字符串
 * @param imageUrl 图片URL
 * @returns Promise<string> base64字符串
 */
async function convertImageToBase64(imageUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        if (!ctx) {
          reject(new Error('Cannot get canvas context'))
          return
        }

        canvas.width = img.width
        canvas.height = img.height

        ctx.drawImage(img, 0, 0)

        // 转换为base64，包含data:image前缀
        const base64 = canvas.toDataURL('image/jpeg', 0.9)
        resolve(base64)
      } catch (error) {
        reject(error)
      }
    }

    img.onerror = () => {
      reject(new Error('Failed to load image for base64 conversion'))
    }

    img.src = imageUrl
  })
}

/**
 * 下载图片函数（支持移动端，解决CORS问题）
 * @param imageUrl 图片URL
 * @param filename 文件名（可选，默认为时间戳）
 * @returns Promise<void>
 */
export async function downloadImage(imageUrl: string, filename?: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    let loadingInstance: any = null

    try {
      // 显示loading状态
      loadingInstance = openLoading({
        text: i18n.global.t('download.downloading'),
        lock: true,
        background: 'rgba(0,0,0,0.3)',
      })

      // 检查是否在 IDChat 环境下
      const isIDChatEnvironment = navigator.userAgent.includes('IDChat')

      if (isIDChatEnvironment) {
        try {
          // 在 IDChat 环境下，先将图片转换为 base64，然后使用 app 注入的方法下载
          const base64String = await convertImageToBase64(imageUrl)

          // 动态导入 metalet 模块中的 saveBase64Image 方法
          const { saveBase64Image } = await import('@/wallet-adapters/metalet')
          const result = await saveBase64Image(base64String)

          if (result) {
            // 关闭loading
            if (loadingInstance) {
              loadingInstance.close()
            }

            ElMessage.success(i18n.global.t('download.success'))
            resolve()
            return
          }
        } catch (idchatError) {
          console.warn(
            'IDChat download method failed, falling back to standard method:',
            idchatError
          )
          // 如果 IDChat 方法失败，继续使用标准方法
        }
      }

      // 检测是否为移动端
      const isMobile =
        isIOS ||
        isAndroid ||
        /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)

      if (isMobile) {
        // 移动端优先使用 Image 对象加载，避免 CORS 问题
        try {
          // 方法1：尝试使用 Image 对象（不会有 CORS 问题）
          const img = new Image()
          img.crossOrigin = 'anonymous'

          await new Promise((imgResolve, imgReject) => {
            img.onload = () => {
              try {
                // 创建 Canvas 来转换图片
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')

                canvas.width = img.width
                canvas.height = img.height

                ctx?.drawImage(img, 0, 0)

                // 转换为 blob
                canvas.toBlob(
                  blob => {
                    if (blob) {
                      // 生成文件名
                      const timestamp = new Date().getTime()
                      const finalFilename = filename || `image_${timestamp}.jpg`

                      // 尝试使用 Web Share API
                      if (navigator.share && typeof navigator.canShare === 'function') {
                        const file = new File([blob], finalFilename, { type: blob.type })

                        if (navigator.canShare({ files: [file] })) {
                          navigator
                            .share({
                              files: [file],
                              title: '保存图片',
                            })
                            .then(() => {
                              imgResolve(void 0)
                            })
                            .catch(() => {
                              // Share API 失败，使用传统下载
                              downloadWithBlob(blob, finalFilename)
                              imgResolve(void 0)
                            })
                          return
                        }
                      }

                      // 使用传统下载方法
                      downloadWithBlob(blob, finalFilename)
                      imgResolve(void 0)
                    } else {
                      imgReject(new Error('Canvas to blob failed'))
                    }
                  },
                  'image/jpeg',
                  0.9
                )
              } catch (canvasError) {
                imgReject(canvasError)
              }
            }

            img.onerror = () => {
              imgReject(new Error('Image load failed'))
            }

            // 开始加载图片
            img.src = imageUrl
          })
        } catch (mobileError) {
          console.warn('Mobile canvas method failed:', mobileError)

          // 备用方案：直接在新窗口打开图片
          const newWindow = window.open(imageUrl, '_blank', 'noopener,noreferrer')
          if (!newWindow) {
            throw new Error('无法打开图片')
          }

          // 移动端提示用户手动保存
          ElMessage.success('请长按图片选择"保存到相册"')
        }
      } else {
        // 桌面端使用 fetch 方法
        try {
          const response = await fetch(imageUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'same-origin',
            headers: {
              Accept: 'image/*',
            },
          })

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
          }

          const blob = await response.blob()
          const timestamp = new Date().getTime()
          const fileExtension = blob.type.split('/')[1] || 'jpg'
          const finalFilename = filename || `image_${timestamp}.${fileExtension}`

          downloadWithBlob(blob, finalFilename)
        } catch (fetchError) {
          console.warn('Fetch method failed, trying fallback:', fetchError)

          // 桌面端备用方案：直接使用 URL
          const timestamp = new Date().getTime()
          const finalFilename = filename || `image_${timestamp}.jpg`

          const link = document.createElement('a')
          link.href = imageUrl
          link.download = finalFilename
          link.target = '_blank'
          link.rel = 'noopener noreferrer'
          link.style.display = 'none'

          document.body.appendChild(link)
          link.click()

          setTimeout(() => {
            try {
              document.body.removeChild(link)
            } catch (cleanupError) {
              console.warn('Link cleanup error:', cleanupError)
            }
          }, 100)
        }
      }

      // 关闭loading
      if (loadingInstance) {
        loadingInstance.close()
      }

      // 显示成功提示
      ElMessage.success(i18n.global.t('download.success'))
      resolve()
    } catch (error) {
      // 关闭loading
      if (loadingInstance) {
        loadingInstance.close()
      }

      // 显示错误提示
      console.error('Download image error:', error)
      ElMessage.error((error as Error)?.message || i18n.global.t('download.failed'))
      reject(error)
    }
  })
}

// 辅助函数：使用 blob 下载文件
function downloadWithBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()

  // 清理
  setTimeout(() => {
    try {
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (cleanupError) {
      console.warn('Cleanup error:', cleanupError)
    }
  }, 100)
}
