// @ts-ignore
import dayjs from 'dayjs'
import Decimal from 'decimal.js-light'
import { useRootStore } from '@/stores/root'
import { router } from '@/router'
import utc from 'dayjs/plugin/utc'
import { Chains } from '@/enum'
import { VITE_FILE_API, VITE_AVATAR_CONTENT_API } from '@/config/app-config'
dayjs.extend(utc)

export const ellipsisMiddle = (str: string, frontKeep = 20, backKeep = 5) => {
  if (str.length <= frontKeep + backKeep) return str
  return str.substring(0, frontKeep) + '...' + str.substring(str.length - backKeep)
}

export function truncateText(text: string, maxChars = 32) {
  if (typeof text !== 'string') return ''

  let charCount = 0
  let result = ''

  for (let i = 0; i < text.length; i++) {
    // 判断是否为中文字符（Unicode范围）

    const isChinese = /[\u4e00-\u9fa5]/.test(text[i])

    // 中文字符算2个字符单位，其他算1个
    charCount += isChinese ? 2 : 1

    // 如果超出限制，添加省略号并返回
    if (charCount > maxChars) {
      return result + '...'
    }

    result += text[i]

    // 如果正好达到限制，直接返回
    if (charCount === maxChars) {
      return result
    }
  }

  // 如果没有超出限制，返回原文本
  return result
}

export function handleWhiteSpace(str: string, genesis: string) {
  if (!str) return
  if (genesis !== 'af265d1a1bb482daf8189861b31b166a6848e499') {
    return str
  }
  const matchReg = ' '
  const whiteSpaceCount = str.split(matchReg).length - 1
  let repalceContent: string = ''
  for (let i = 0; i <= whiteSpaceCount; i++) {
    repalceContent += '%20'
  }
  return str.replaceAll(/\s+/g, repalceContent)
}

export function dateTimeFormat(
  timestamp: Date | number | string,
  type: string = 'local',
  format: string = 'YYYY-MM-DD HH:mm:ss'
) {
  if (!timestamp) {
    return null
  }
  if (type === 'UTC') {
    console.log(
      'utc',
      dayjs(timestamp)
        .utc()
        .format(format)
    )
    return dayjs(timestamp)
      .utc()
      .format(format)
  } else {
    return dayjs(timestamp).format(format)
  }
}

export function legalNftConverterCNY(amount: number | string) {
  if (amount) {
    let cnyPrice = new Decimal(amount)
      .div(100)
      .toNumber()
      .toFixed(2)
    return +cnyPrice < 0.01 ? 0.01 : cnyPrice
  } else {
    return '--'
  }
}

export function converterBSV(amount: number | string) {
  if (amount) {
    return new Decimal(amount).div(10 ** 8).toNumber()
  } else {
    return '--'
  }
}

export function converterCNY(amount: number | string) {
  const RootStore = useRootStore()
  if (amount) {
    let cnyPrice = (
      new Decimal(amount).div(10 ** 8).toNumber() * RootStore.exchangeRate.cnyRate
    ).toFixed(2)
    return +cnyPrice < 0.01 ? 0.01 : cnyPrice
  } else {
    return '--'
  }
}

export function legalNftConverterBSV(amount: number | string) {
  const RootStore = useRootStore()
  if (amount) {
    return parseFloat(
      new Decimal(amount)
        .div(100)
        .div(RootStore.exchangeRate.cnyRate)
        .toNumber()
        .toFixed(8)
    )
  } else {
    return '--'
  }
}

export function bsv(stas: number | string) {
  if (typeof stas === 'undefined') return 0

  return new Decimal(stas).div(Math.pow(10, 8)).toNumber()
}

export function satoshi(amount: number | string) {
  return new Decimal(amount)
    .div(Math.pow(10, 8))
    .toInteger()
    .toNumber()
}

export function space(stas: number | string) {
  return bsv(stas)
}

export function handlerFileService(url: string) {
  if (typeof url !== 'string') return ''
  if (url === '') return ''
  return `${import.meta.env.VITE_MVC_BASEAPI}${url}`
}

export function metafile(metafile: string, width = 235, type: 'metafile' | 'metaId' = 'metafile') {
  if (typeof metafile !== 'string') return ''
  if (metafile.indexOf('http://') !== -1 || metafile.indexOf('https://') !== -1) return metafile
  metafile = metafile.replace('metafile://', '')
  metafile = metafile.replace('metacontract://', 'metacontract/')
  if (metafile === '') return ''
  let path = ''
  if (metafile.indexOf('ipfs://') !== -1) {
    // ETH 图片地址
    path = '/metafile/eth/ipfs/'
  } else if (type === 'metaId') {
    // 用户头像使用 avatarContentApi
    // 处理 /content/xxx 格式，提取 pinId
    let pinId = metafile
    if (metafile.startsWith('/content/')) {
      pinId = metafile.replace('/content/', '')
    }
    const avatarUrl = `${VITE_AVATAR_CONTENT_API()}/${pinId}`
    return width === -1
      ? avatarUrl
      : `${avatarUrl}?x-oss-process=image/auto-orient,1/quality,q_80/resize,m_lfit,w_${width}`
  } else if (metafile.indexOf('sensible://') !== -1) {
    metafile = metafile.replace('sensible://', 'sensible/')
    path = '/metafile/'
  } else if (metafile.indexOf('eth://') !== -1) {
    metafile = metafile.replace('eth://', 'evm/eth/')
    path = '/metafile/'
  } else if (metafile.indexOf('goerli://') !== -1) {
    metafile = metafile.replace('goerli://', 'evm/goerli/')
    path = '/metafile/'
  } else if (metafile.indexOf('polygon://') !== -1) {
    metafile = metafile.replace('polygon://', 'evm/polygon/')
    path = '/metafile/'
  } else if (metafile.indexOf('mumbai://') !== -1) {
    metafile = metafile.replace('mumbai://', 'evm/mumbai/')
    path = '/metafile/'
  } else {
    if (metafile.indexOf('/content/') < 0) {
      path = '/content/'
    }

    //  普通txId
    //path = '/metafile/'
    //path='content'
  }
  //const fileUrl = `${import.meta.env.VITE_AppImgApi}${path}${metafile.replace('ipfs://', '')}`
  const fileUrl = `${VITE_FILE_API() || import.meta.env.VITE_FILE_API}${path}${metafile}`

  // 文件后缀
  const fileSuffix = metafile.split('.')[metafile.split('.').length - 1]
  // 非图片格式返回源文件
  const imageType = ['jpg', 'jpeg', 'png', 'gif']
  if (fileSuffix !== '' && !imageType.includes(fileSuffix)) {
    return fileUrl
  }
  // 原图 格式 直接返回
  if (width === -1) {
    return fileUrl
  }

  let query = 'x-oss-process=image/auto-orient,1/quality,q_80'
  if (width) {
    query += `/resize,m_lfit,w_${width}`
  }

  return `${fileUrl}?${query}`
}

export function toUserHome(metaId: string) {
  router.push({
    name: 'user',
    params: {
      metaId,
    },
  })
}

export function buzzTextContent(content: string) {
  const result = content
    // 替换换行
    .replace(/\\n/g, '\n')
    // 话题处理
    .replace(
      /#.*?[\s\n\r#]{1}|#.*?$/g,
      val =>
        `<a href='/buzz/topic/${val
          .replace('#', '')
          .replace(/(^\s*)|(\s*$)/g, '')}' style='color:#fc6d5e' >${val}</a>&nbsp;`
    )
  // 超链接处理
  return repalceHref(result)
}

// 超链接处理
export function repalceHref(content: string, color: string = '#fc6d5e') {
  return content.replace(
    /(http:\/\/|https:\/\/)((\w|=|\?|\.|\/|&|-|%|~|@|:)+)/g,
    val => `<a href='${val}' target="_blank" style='color:${color}'>${val}</a>&nbsp;`
  )
}

export function strapiImage(url: string) {
  return `${import.meta.env.VITE_AdminBaseApi}${url}`
}

export function Currency(amount: number, unit: string) {
  if (!amount) {
    return '--'
  }
  switch (unit) {
    case 'SPACE':
      return new Decimal(amount).div(Math.pow(10, 8)).toString()
    case Chains.ETH:
      return new Decimal(amount).div(Math.pow(10, 18)).toString()
    case Chains.POLYGON:
      return new Decimal(amount).div(Math.pow(10, 18)).toString()
  }
}

export function omitMiddle(str: string, maxLength: number = 20) {
  if (str.length <= maxLength) {
    return str
  }

  const ellipsis = '...'
  const ellipsisLength = ellipsis.length

  const startLength = Math.ceil((maxLength - ellipsisLength) / 4)
  const endLength = Math.floor((maxLength - ellipsisLength) / 4)

  const start = str.substring(0, startLength)
  const end = str.substring(str.length - endLength)

  return start + ellipsis + end
}
