import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import {
  ChannelType,
  CommunityJoinAction,
  GroupChannelType,
  IsEncrypt,
  MessageType,
  NodeName,
  RedPacketDistributeType,
  SdkPayType,
  ChatType,
  ChatChain,
  ChannelMode,
} from '@/enum'
import { useUserStore } from '@/stores/user'
import { useTalkStore } from '@/stores/talk'
import { SDK } from './sdk'
import {
  FileToAttachmentItem,
  getTimestampInSeconds,
  realRandomString,
  sleep,
  atobToHex,
  containsString,
} from './util'
import { Message, MessageDto } from '@/@types/talk'
import { buildCryptoInfo, decrypt, ecdhDecrypt, encrypt, MD5Hash } from './crypto'
import Decimal from 'decimal.js-light'
import { TxComposer } from 'meta-contract/dist/tx-composer'
import { Address } from 'meta-contract/dist/mvc'
import { DEFAULTS } from './wallet/hd-wallet'
import { useJobsStore } from '@/stores/jobs'
import { ElMessage } from 'element-plus'
import { GetOneAnnouncement } from '@/api/aggregation'
import { SHA256 } from 'crypto-js'
import { toRaw } from 'vue'
import { useCredentialsStore } from '@/stores/credentials'
import { useConnectionStore } from '@/stores/connection'
import { MetaFlag, useBulidTx, Operation } from '@/hooks/use-build-tx'
import { AttachmentItem } from '@/@types/hd-wallet'

import { useChainStore } from '@/stores/chain'
import { Red_Packet_Min, Red_Packet_Max } from '@/data/constants'
import { useEcdhsStore } from '@/stores/ecdh'
import { buildOpReturnV2, createPin } from './userInfo'
import { createPinWithBtc } from './pin'
import { generateLuckyBagCode, getPrivateChatPaths } from '@/api/talk'
import { BTC_MIN_PER_PACKET_SATS } from '@/stores/forms'
import { useLayoutStore } from '@/stores/layout'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { SimpleChannel } from '@/@types/simple-chat'
import i18n from './i18n'
import { de } from 'element-plus/es/locale'
import { VITE_ADDRESS_HOST, VITE_CHAT_API } from '@/config/app-config'
dayjs.extend(advancedFormat)
type CommunityData = {
  communityId: string
  name: string
  metaName: string
  metaNameNft?: string
  icon: string | null
  admins: string[]
  description: string
  cover: string | null
  reserved?: string
  disabled?: 0 | 1
}

export const createCommunity = async (form: any, userStore: any, sdk: SDK) => {
  // communityId, name, description, cover, metaName, mateNameNft, admins, reserved, icon
  const { icon, metaName, description, cover, name } = form
  try {
    const attachments = []
    attachments.push(await FileToAttachmentItem(icon))
    const iconPlaceholder = 'metafile://$[0]'

    let coverPlaceholder = null

    if (cover) {
      coverPlaceholder = 'metafile://$[1]'
      attachments.push(await FileToAttachmentItem(cover))
    }

    const admins = [userStore.user?.metaId]

    // metaname改为非必填
    // if (!metaName) metaName = {}

    // 没有metaname的情况下，communityId生成方式为随机64位字符串，然后sha256一次
    // const communityId = metaName.communityId || SHA256(realRandomString(64)).toString()
    const communityId = SHA256(realRandomString(64)).toString()

    const metaNameNft = metaName?.genesis
      ? `${metaName.solution}://${metaName.codeHash}/${metaName.genesis}/${metaName.tokenIndex}`
      : ''

    const dataCarrier: CommunityData = {
      communityId,
      name,
      metaName: metaName?.name || '',
      metaNameNft,
      icon: iconPlaceholder,
      admins,
      description,
      cover: coverPlaceholder || '',
      reserved: metaName?.signature || '',
      disabled: 0,
    }
    console.log('dataCarrier', dataCarrier, attachments)

    // 2. 构建节点参数
    const node = {
      nodeName: NodeName.SimpleCommunity,
      data: JSON.stringify(dataCarrier),
      attachments,
    }

    // 3. 发送节点
    await sdk.createBrfcChildNode(node)

    return { communityId }
  } catch (error) {
    throw new Error((error as any).toString())
  }
}

export const updateCommunity = async (form: any, sdk: SDK) => {
  // communityId, name, description, cover, metaName, mateNameNft, admins, reserved, icon
  const { icon, description, cover, original, metaName, replacingMetaName, name } = form

  const attachments = []
  let replaceIndex = 0
  let iconPlaceholder = original.icon
  if (icon) {
    iconPlaceholder = `metafile://$[${replaceIndex}]`
    attachments.push(await FileToAttachmentItem(icon))
    replaceIndex++
  }

  let coverPlaceholder = original.cover
  if (cover) {
    coverPlaceholder = `metafile://$[${replaceIndex}]`
    attachments.push(await FileToAttachmentItem(cover))
    replaceIndex++
  }

  const admins = original.admins

  let metaNameNft: string
  if (replacingMetaName) {
    metaNameNft = replacingMetaName.genesis
      ? `${replacingMetaName.solution}://${replacingMetaName.codeHash}/${replacingMetaName.genesis}/${replacingMetaName.tokenIndex}`
      : ''
  } else {
    metaNameNft = original.metaNameNft
  }

  const dataCarrier: CommunityData = {
    communityId: original.communityId,
    name,
    metaName: replacingMetaName ? replacingMetaName.name : original.metaName,
    metaNameNft,
    icon: iconPlaceholder,
    admins,
    description,
    cover: coverPlaceholder || '',
    reserved: replacingMetaName ? '' : original.reserved,
    disabled: 0,
  }

  if (metaName.signature && !replacingMetaName) {
    dataCarrier.reserved = metaName.signature
  }
  console.log({ dataCarrier, form, original })

  // 2. 构建节点参数
  const node = {
    nodeName: NodeName.SimpleCommunity,
    data: JSON.stringify(dataCarrier),
    attachments,
  }

  // 3. 发送节点
  await sdk.createBrfcChildNode(node)

  // return { communityId }
}

export const switchFollowUser = async (form: any, sdk: SDK) => {
  const { metaId, address, isFollowed } = form
  const payAmount = parseInt(import.meta.env.VITE_PAY_AMOUNT)
  const dataCarrier = {
    createTime: new Date().getTime(),
    MetaID: metaId,
    pay: payAmount,
    payTo: address,
    status: isFollowed ? -1 : 1,
  }
  console.log({ dataCarrier, isFollowed })

  // 2. 构建节点参数
  const node = {
    nodeName: NodeName.PayFollow,
    data: JSON.stringify(dataCarrier),
    payTo: [
      {
        amount: payAmount,
        address,
      },
    ],
  }

  // 3. 发送节点
  await sdk.createBrfcChildNode(node)
}

export const sendInviteBuzz = async (form: any, sdk: SDK) => {
  // shareProtocol, shareId, shareIdType, shareFromMetaID, shareContent, shareContentType, mention
  const shareProtocol = NodeName.SimpleGroupCreate
  let shareId, shareIdType
  if (!form.channel) {
    shareId = `${form.community.communityId}`
    shareIdType = 'communityId'
  } else {
    shareId = `${form.community.communityId}/${form.channel.id}`
    shareIdType = 'communityId/channelId'
  }

  const shareFromMetaID = form.community.metaId
  const shareContent = form.text
  const shareContentType = 'text/plain'
  const dataCarrier = {
    shareProtocol,
    shareId,
    shareIdType,
    shareFromMetaID,
    shareContent,
    shareContentType,
  }

  // 2. 构建节点参数
  const node = {
    nodeName: NodeName.SimplePublicShare,
    data: JSON.stringify(dataCarrier),
  }

  // 3. 发送节点
  const res = await sdk.createBrfcChildNode(node)
  const txId = res?.currentNode?.txId
  return { txId }
}

// const _putIntoRedPackets = (form: any, address: string): any[] => {
//   const { amount, quantity, each, type } = form
//
//   // NFT🧧：将NFT分成指定数量个红包，平均分配
//   if (type === RedPacketDistributeType.Nft) {
//     const redPackets = []
//     for (let i = 0; i < quantity; i++) {
//       redPackets.push({
//         address,
//         amount: each,
//         index: i,
//       })
//     }
//     return redPackets
//   }

//   // 构建🧧数量：随机将红包金额分成指定数量个小红包；指定最小系数为平均值的0.2倍，最大系数为平均值的1.8倍
//   const minFactor = 0.2
//   const maxFactor = 1.8
//   const minSats = 1000 // 最小红包金额为1000sats
//   const redPackets = []
//   let remainsAmount = amount
//   let remainsCount = quantity
//   let initIndex=2
//   for (let i = 0; i < quantity - 1; i++) {
//     let avgAmount = Math.round(remainsAmount / remainsCount)
//     const randomFactor = Math.random() * (maxFactor - minFactor) + minFactor
//     const randomAmount = Math.max(Math.round(avgAmount * randomFactor), minSats)
//     redPackets.push({
//       amount: randomAmount,
//       address,
//       index: i + initIndex,
//     })
//     remainsAmount -= randomAmount
//     remainsCount -= 1
//   }
//   redPackets.push({
//     amount: Math.max(Math.floor(remainsAmount), minSats),
//     address,
//     index: quantity + initIndex - 1,
//   }) // 最后一个红包，使用剩餘金额
//   console.log("redPackets",redPackets)
//
//   return redPackets
// }

const nicerAmount = (amount: number, unit: string, decimals: number = 1) => {
  if (unit == 'Space' || unit == 'BTC') {
    return new Decimal(amount).mul(10 ** 8).toNumber()
  } else {
    return new Decimal(amount).mul(10 ** decimals).toNumber()
  }
}

// const _putIntoRedPackets = (form: any, address: string): any[] => {
//   const { amount, quantity, each, type,unit } = form

//   // NFT🧧：将NFT分成指定数量个红包，平均分配
//   if (type === RedPacketDistributeType.Nft) {
//     const redPackets = []
//     for (let i = 0; i < quantity; i++) {
//       redPackets.push({
//         address,
//         amount: each,
//         index: i,
//       })
//     }
//     return redPackets
//   }

//   // 构建🧧数量：随机将红包金额分成指定数量个小红包；指定最小系数为平均值的0.2倍，最大系数为平均值的1.8倍
//   // const minFactor = 0.2
//   // const maxFactor = 1.8
//   const minSats = Red_Packet_Min // 最小红包金额为1000sats
//   const redPackets = []
//   let remainsAmount =nicerAmount(amount,unit)
//   //let remainsCount = quantity
//   let initIndex=2

//   const currentAmountSats=nicerAmount(amount,unit)
//   const currentMinSats=unit == 'Space' ? new Decimal(minSats).div(10 ** 8).toNumber() : minSats

//     // 确保最小金额合理
//   if (currentAmountSats < minSats * quantity) {
//     throw new Error(`总金额 ${amount} 不足以分配 ${quantity} 个红包（每个至少 ${currentMinSats} ${unit}）`);
//   }

//   for (let i = 0; i < quantity - 1; i++) {
//     // 计算当前红包的最大可能金额（确保后面每个红包至少有minSats）
//     const maxPossible = remainsAmount - minSats * (quantity - i - 1);
//     const minPossible = minSats;

//     // 在合理范围内随机分配
//     const randomAmount = Math.floor(Math.random() * (maxPossible - minPossible)) + minPossible;

//     redPackets.push({
//       amount: randomAmount,
//       address,
//       index: i + initIndex,
//     });

//     remainsAmount -= randomAmount;
//   }

//   redPackets.push({
//     amount: Math.max(remainsAmount, minSats),
//     address,
//     index: quantity + initIndex - 1,
//   });

//   return redPackets;

//   // for (let i = 0; i < quantity - 1; i++) {
//   //   let avgAmount = Math.round(remainsAmount / remainsCount)
//   //   const randomFactor = Math.random() * (maxFactor - minFactor) + minFactor
//   //   const randomAmount = Math.max(Math.round(avgAmount * randomFactor), minSats)
//   //   redPackets.push({
//   //     amount: randomAmount,
//   //     address,
//   //     index: i + initIndex,
//   //   })
//   //   remainsAmount -= randomAmount
//   //   remainsCount -= 1
//   // }
//   // redPackets.push({
//   //   amount: Math.max(Math.floor(remainsAmount), minSats),
//   //   address,
//   //   index: quantity + initIndex - 1,
//   // }) // 最后一个红包，使用剩餘金额
//   // console.log("redPackets",redPackets)
//   //
//   // return redPackets
// }

const _putIntoRedPackets = (form: any, address: string): any[] => {
  const { amount, quantity, each, type, unit, token } = form

  // // NFT🧧：将NFT分成指定数量个红包，平均分配
  // if (type === RedPacketDistributeType.Nft) {
  //   const redPackets = [];
  //   for (let i = 0; i < quantity; i++) {
  //     redPackets.push({
  //       address,
  //       amount: each,
  //       index: i,
  //     });
  //   }
  //   return redPackets;
  // }

  // 货币🧧：使用正态分布算法分配
  const layoutStore = useLayoutStore()
  const isBtcChain = layoutStore.selectedRedPacketType === 'btc'
  const isToken = layoutStore.selectedRedPacketType === 'token'

  // 根据链设置不同的最小红包金额
  const minSats = isBtcChain ? BTC_MIN_PER_PACKET_SATS : Red_Packet_Min // BTC最小546聪，其他链0.0001 Space = 10000聪
  const totalAmount = nicerAmount(amount, unit, token?.decimal) + 210 * quantity * 1

  // 确保最小金额合理
  if (totalAmount < minSats * quantity) {
    let currentMinSats
    if (unit === 'Space') {
      currentMinSats = new Decimal(minSats).div(10 ** 8).toNumber()
    } else if (unit === 'BTC') {
      currentMinSats = new Decimal(minSats).div(10 ** 8).toNumber()
    } else if (unit === 'Sats') {
      currentMinSats = minSats
    } else if (unit === 'Token') {
      currentMinSats = new Decimal(minSats).div(10 ** token.decimal).toNumber()
    } else {
      currentMinSats = minSats
    }

    throw new Error(
      `总金额 ${amount} 不足以分配 ${quantity} 个红包（每个至少 ${currentMinSats} ${unit}）`
    )
  }

  const redPackets = []
  const initIndex = isBtcChain ? 1 : 2

  // 正态分布算法参数
  const mean = totalAmount / quantity // 平均值
  const stdDev = mean * 0.3 // 标准差，控制分布的集中程度（0.3表示相对集中）

  // 生成符合正态分布的红包金额
  let remainingAmount = totalAmount
  const amounts = []

  // 首先生成 quantity-1 个红包金额
  for (let i = 0; i < quantity - 1; i++) {
    let randomAmount
    let attempts = 0
    const maxAttempts = 100 // 防止无限循环

    do {
      // 使用Box-Muller变换生成正态分布随机数
      const u1 = Math.random()
      const u2 = Math.random()
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)

      // 转换为指定均值和标准差的正态分布
      randomAmount = Math.round(z0 * stdDev + mean)

      // 确保金额在合理范围内
      randomAmount = Math.max(minSats, randomAmount)
      randomAmount = Math.min(randomAmount, remainingAmount - minSats * (quantity - i - 1))

      attempts++
    } while (
      (randomAmount > remainingAmount - minSats * (quantity - i - 1) || randomAmount < minSats) &&
      attempts < maxAttempts
    )

    // 如果尝试多次仍然无法生成有效金额，使用安全值
    if (attempts >= maxAttempts) {
      randomAmount = Math.max(
        minSats,
        Math.min(Math.round(mean), remainingAmount - minSats * (quantity - i - 1))
      )
    }

    amounts.push(randomAmount)

    remainingAmount -= randomAmount
  }

  // 最后一个红包使用剩余金额，但要确保不小于最小值
  amounts.push(Math.max(remainingAmount, minSats))

  // 如果最后一个红包过大，重新调整分配（可选的安全检查）
  if (amounts[amounts.length - 1] > mean * 2) {
    return _redistributeEvenly(amounts, totalAmount, minSats).map((item, index) => {
      return {
        amount: item,
        address,
        index: index + initIndex,
      }
    })
  }

  // 构建红包对象
  for (let i = 0; i < amounts.length; i++) {
    redPackets.push({
      amount: amounts[i],
      address,
      index: i + initIndex,
    })
  }
  console.log('redPackets', redPackets)
  return redPackets
}

// 辅助函数：如果分配不均，进行重新分配
const _redistributeEvenly = (amounts: number[], totalAmount: number, minSats: number): any[] => {
  const quantity = amounts.length
  const mean = Math.round(totalAmount / quantity)
  const adjustedAmounts = []

  let remainingAmount = totalAmount

  for (let i = 0; i < quantity - 1; i++) {
    // 在平均值附近小范围波动 (±20%)
    const variation = Math.random() * 0.4 - 0.2 // -20% 到 +20%
    let amount = Math.round(mean * (1 + variation))

    amount = Math.max(minSats, amount)
    amount = Math.min(amount, remainingAmount - minSats * (quantity - i - 1))

    adjustedAmounts.push(amount)
    remainingAmount -= amount
  }

  adjustedAmounts.push(Math.max(remainingAmount, minSats))

  return adjustedAmounts
}

export const giveRedPacket = async (form: any, channel: SimpleChannel, selfMetaId: string) => {
  // 1.1 构建红包地址
  const luckyBagCode = await generateLuckyBagCode()
  if (luckyBagCode.code !== 0) {
    ElMessage.error(luckyBagCode.message || 'Generate lucky bag code failed')
    return
  }

  const { code, luckyBagAddress: address, timestamp: createTime } = luckyBagCode.data
  const buildTx = useBulidTx()

  // const code = realRandomString(6)
  const subId = channel.id.substring(0, 12)
  // const createTime = Date.now()
  // const key = `${subId.toLocaleLowerCase()}${code.toLocaleLowerCase()}${createTime}`
  const net = import.meta.env.VITE_NET_WORK || 'mainnet'
  // const { addressStr: address } = buildCryptoInfo(key, net);
  // const address = luckyBagAddress
  const layoutStore = useLayoutStore()
  const isBtcChain = layoutStore.selectedRedPacketType === 'btc'
  // 1.2 构建红包数据
  // const amountInSat = amount * 100_000_000
  const amountInSat =
    layoutStore.selectedRedPacketType === 'token'
      ? nicerAmount(form.amount, form.unit, form.token?.decimal)
      : nicerAmount(form.amount, form.unit, form.token?.decimal) + 210 * form.quantity

  const redPackets = _putIntoRedPackets(form, address)

  console.table(redPackets)
  console.log({ form })

  // 2. 构建数据载体
  const dataCarrier: any = {
    domain: VITE_CHAT_API() || import.meta.env.VITE_CHAT_API, //'https://www.show.now/chat-api-test',
    luckyBagAddress: address,
    createTime,
    groupId: channel.parentGroupId ? channel.parentGroupId : channel.id,
    img: '',
    imgType: '',
    subId,
    content: form.message,
    code,
    amount: amountInSat,
    count: form.quantity,
    metaid: selfMetaId,
    payList:
      layoutStore.selectedRedPacketType === 'token'
        ? redPackets.map((item, index) => {
            return {
              ...item,
              index,
              gasAmount: '40000',
              gasAddress: address,
              gasIndex: index + 2,
            }
          })
        : redPackets,
    type:
      layoutStore.selectedRedPacketType === 'token'
        ? 'metacontract-ft'
        : isBtcChain
        ? 'btc'
        : 'space',
    feeRate: 1,
    requireType: '',
    requireTickId: '',
    requireCollectionId: '',
    limitAmount: 0,
    channelId: channel.parentGroupId ? channel.id : '', //channel.id,
  }
  if (layoutStore.selectedRedPacketType === 'token') {
    const simpleGroupLuckyBagExtraData = {
      subId,
      groupId: channel.parentGroupId ? channel.parentGroupId : channel.id,
      // channelId: '',
      code,
      createTime,
      luckyBagAddress: address,
      domain: VITE_CHAT_API() || import.meta.env.VITE_CHAT_API, //'https://www.show.now/chat-api-test',
    }
    const simpleGroupLuckyBagExtraMetaidData = {
      operation: 'hide',
      body: JSON.stringify(simpleGroupLuckyBagExtraData),
      path: `${VITE_ADDRESS_HOST() ||
        import.meta.env.VITE_ADDRESS_HOST}:/protocols/simplegroupluckybagextra`,
      contentType: 'application/json',
      encryption: '0',
      version: '1.0.0',
      encoding: 'utf-8',
      flag: 'metaid',
    }
    const opReturnData = buildOpReturnV2(simpleGroupLuckyBagExtraMetaidData, 'mainnet')
    const opreturnDataHex = Buffer.from(JSON.stringify(opReturnData)).toString('hex')
    const res = await window.metaidwallet
      .transfer({
        broadcast: true,
        tasks: [
          {
            type: 'token',
            codehash: form.token.codeHash,
            genesis: form.token.genesis,
            metaidData: simpleGroupLuckyBagExtraMetaidData,
            receivers: redPackets.map(item => {
              return {
                address: item.address,
                amount: item.amount,
                decimal: form.token.decimal,
              }
            }),
          },
        ],
      })
      .catch(e => {
        throw new Error(e as any)
      })
    if (res.status) throw new Error(res.status)
    if (!res.res[0] || !res.res[0].routeCheckTxHex) throw new Error('send token failed')
    console.log('res', res)
    dataCarrier.luckyBagGasAddress = address
    dataCarrier.tickTxId = res.res[0].txid
    ;(dataCarrier.tickPinId = res.res[0].txid + 'i' + (redPackets.length + 1)),
      (dataCarrier.tickId = form.token.codeHash + '/' + form.token.genesis)
    dataCarrier.collectionId = ''
  }

  console.log({ dataCarrier })

  // 2.1 nft红包处理
  if (form.nft && form.chain) {
    if (form.chain === 'eth' || form.chain === 'goerli') {
      dataCarrier.requireType = '2001'
    } else if (form.chain === 'polygon' || form.chain === 'mumbai') {
      dataCarrier.requireType = '2002'
    } else {
      dataCarrier.requireType = '2'
    }
    dataCarrier.requireCodehash = form.nft.nftCodehash
    dataCarrier.requireGenesis = form.nft.nftGenesis
  }

  // 3. 构建节点参数
  const node = {
    protocol: NodeName.SimpleGroupLuckyBag,
    body: dataCarrier,
    payTo:
      layoutStore.selectedRedPacketType === 'token'
        ? redPackets.map((item, index) => {
            return {
              ...item,
              index,
              gasAmount: '40000',
              gasAddress: address,
              gasIndex: index + 2,
            }
          })
        : redPackets,
    isBroadcast: true,
  }

  // 3. 发送节点
  try {
    const res = await buildTx.createRedPacket(node, layoutStore.selectedRedPacketType)

    console.log({ res })
    return res
  } catch (err) {
    console.log(err)
    ElMessage.error(typeof err === 'string' ? err : err.message || 'Failed')
  }
}

export const createChannel = async (
  form: any,
  communityId: string,
  subscribeId: string,
  selfMetaId?: string
) => {
  const buildTx = useBulidTx()
  const chainStore = useChainStore()
  // communityId, groupName, groupNote, timestamp, groupType, status, type, codehash, genesis, limitAmount
  const { name: groupName } = form

  const { groupType, status, type, limitAmount } = _getChannelTypeInfo(form, selfMetaId!)

  // 发言设置，0：所有人，1：管理员
  const chatSettingType = form.adminOnly ? 1 : 0

  // 随机生成groupId，用于解耦与用户的关系
  const groupId = form.groupId || SHA256(realRandomString(64)).toString()

  const dataCarrier = {
    communityId,
    groupId,
    groupName,
    groupNote: '',
    groupType,
    status,
    type,
    path: '',
    tickId: '',
    collectionId: '',
    // codehash,
    // genesis,
    limitAmount,
    chatSettingType,
    deleteStatus: 0,
    timestamp: getTimestampInSeconds(),
  }

  if (form.type === GroupChannelType.Password) {
    const simpleTalk = useSimpleTalkStore()
    const paths = await getPrivateChatPaths(simpleTalk.selfMetaId)

    // paths 格式示例: [{ path: '100/0', groupId: '...', pinId: '...' }, ...]
    // 我们需要找到 '100/xxxx' 中 xxxx 的最大值，然后设置 dataCarrier.path = `100/${max+1}`
    let newPath = '100/0'

    if (Array.isArray(paths) && paths.length > 0) {
      try {
        const numbers = paths
          .map((p: any) => {
            if (!p || !p.path) return null
            const parts = String(p.path).split('/')
            if (parts.length < 2) return null
            const prefix = parts[0]
            const idx = parseInt(parts[1], 10)
            if (isNaN(idx)) return null
            return { prefix, idx }
          })
          .filter((x: any) => x && x.prefix === '100')

        if (numbers.length > 0) {
          const max = numbers.reduce((m: number, cur: any) => Math.max(m, cur.idx), -1)
          newPath = `100/${max + 1}`
        }
      } catch (err) {
        console.error('parse private chat paths failed', err)
      }
    }

    dataCarrier.path = newPath

    // 私密群聊：使用 getPKHByPath 获取 passwordKey 并加密群名称
    try {
      // 检查是否支持 getPKHByPath 方法
      if (!window.metaidwallet || typeof (window.metaidwallet as any).getPKHByPath !== 'function') {
        ElMessage.error('钱包版本过低，请升级钱包以支持私密群聊功能')
        throw new Error('钱包不支持 getPKHByPath 方法，请升级钱包')
      }

      // 使用 path 获取 passwordKey（getPKHByPath 直接返回字符串）
      const pkh = await (window.metaidwallet as any).getPKHByPath({ path: newPath })

      if (!pkh) {
        throw new Error('获取 passwordKey 失败')
      }

      // 使用 pkh 的前16位作为 passwordKey（与消息加密保持一致）
      const passwordKey = pkh.substring(0, 16)
      console.log('🔐 私密群聊 passwordKey 已生成:', passwordKey.substring(0, 8) + '...')

      // 使用 passwordKey 加密群名称
      const CryptoJS = await import('crypto-js')
      const encryptedGroupName = CryptoJS.AES.encrypt(groupName, passwordKey).toString()

      // 替换为加密后的群名称
      dataCarrier.groupName = encryptedGroupName

      console.log('🔐 群名称已加密:', {
        original: groupName,
        encrypted: encryptedGroupName.substring(0, 20) + '...',
        path: newPath,
      })
    } catch (error) {
      console.error('❌ 私密群聊加密失败:', error)
      throw error // 抛出错误，中断创建流程
    }
  }

  if (!communityId) {
    delete dataCarrier.groupId
  }
  console.log({ dataCarrier })

  // 2. 构建节点参数
  const node = {
    protocol: NodeName.SimpleGroupCreate,
    body: dataCarrier,
    // publickey: form.publicKey,
    // txId: form.txId,
  }

  // 3. 发送节点
  try {
    const { protocol, body } = node
    // const res = await sdk.createBrfcChildNode(node, { useQueue: true, subscribeId })
    const res = await buildTx.createChannel({
      protocol,
      body,
      isBroadcast: true,
    })
    console.log('res', res)

    console.log({ res })

    if (res === null) {
      return { status: 'canceled' }
    }

    if (chainStore.state.currentChain == ChatChain.btc) {
      return { status: 'success', subscribeId, channelId: res?.revealTxIds[0] }
    } else {
      return { status: 'success', subscribeId, channelId: res?.txids[0] }
    }
  } catch (err) {
    console.log(err)
    ElMessage.error('创建群组失败')
    return { status: 'failed' }
  }
}

// export const createBroadcastChannel = async (
//   groupId: string,
//   channelId: string = '',
//   channelName: string = '',
//   channelIcon: string = '',
//   channelNote:string = '',
// ) => {
//   const buildTx = useBulidTx()
//   const chainStore = useChainStore()

//   const dataCarrier = {
//     groupId,
//     channelId:channelId ? channelId : '',
//     channelName,
//     channelIcon,
//     channelNote,
//     channelType:ChannelMode.broadcast,
//   }

//   console.log({ dataCarrier })

//   // 2. 构建节点参数
//   const node = {
//     protocol: NodeName.SimpleGroupChannel,
//     body: dataCarrier,

//   }

//   // 3. 发送节点
//   try {
//     const { protocol, body } = node
//     // const res = await sdk.createBrfcChildNode(node, { useQueue: true, subscribeId })
//     const res = await buildTx.createBroadcastChannel({
//       protocol,
//       body,
//       isBroadcast: true,
//     })
//     console.log('res', res)

//     console.log({ res })

//     if (res === null) {
//       return { status: 'canceled' }
//     }

//     if (chainStore.state.currentChain == ChatChain.btc) {
//       return { status: 'success',channelId:channelId ? channelId : res?.revealTxIds[0] }
//     } else {
//       return { status: 'success',channelId:channelId ? channelId : res?.txids[0] }
//     }
//   } catch (err) {
//     console.log(err)
//     ElMessage.error(`${i18n.global.t('create_broadcast_fail')}`)
//     return { status: 'failed' }
//   }
// }

export const setChannelAdmins = async (groupId: string, admins: string[]) => {
  const buildTx = useBulidTx()
  const chainStore = useChainStore()

  const dataCarrier = {
    groupId,
    admins,
  }

  console.log({ dataCarrier })

  // 2. 构建节点参数
  const node = {
    protocol: NodeName.SimpleGroupAdmin,
    body: dataCarrier,
  }

  // 3. 发送节点
  try {
    const { protocol, body } = node
    // const res = await sdk.createBrfcChildNode(node, { useQueue: true, subscribeId })
    const res = await buildTx.setChannelAdmin({
      protocol,
      body,
      isBroadcast: true,
    })
    console.log('res', res)

    console.log({ res })

    if (res === null) {
      return { status: 'canceled' }
    }

    if (chainStore.state.currentChain == ChatChain.btc) {
      return { status: 'success', txid: res?.revealTxIds[0] }
    } else {
      return { status: 'success', txid: res?.txids[0] }
    }
  } catch (err) {
    console.log(err)
    ElMessage.error(`${i18n.global.t('set_admin_fail')}`)
    return { status: 'failed' }
  }
}

export const setChannelWhiteList = async (groupId: string, users: string[]) => {
  const buildTx = useBulidTx()
  const chainStore = useChainStore()

  const dataCarrier = {
    groupId,
    users,
  }

  console.log({ dataCarrier })

  // 2. 构建节点参数
  const node = {
    protocol: NodeName.SimpleGroupWhitelist,
    body: dataCarrier,
  }

  // 3. 发送节点
  try {
    const { protocol, body } = node
    // const res = await sdk.createBrfcChildNode(node, { useQueue: true, subscribeId })
    const res = await buildTx.setChannelWhiteList({
      protocol,
      body,
      isBroadcast: true,
    })
    console.log('res', res)

    console.log({ res })

    if (res === null) {
      return { status: 'canceled' }
    }

    if (chainStore.state.currentChain == ChatChain.btc) {
      return { status: 'success', txid: res?.revealTxIds[0] }
    } else {
      return { status: 'success', txid: res?.txids[0] }
    }
  } catch (err) {
    console.log(err)
    ElMessage.error(`${i18n.global.t('set_whitelist_fail')}`)
    return { status: 'failed' }
  }
}

export const setChannelBlockList = async (groupId: string, users: string[]) => {
  const buildTx = useBulidTx()
  const chainStore = useChainStore()

  const dataCarrier = {
    groupId,
    users,
  }

  console.log({ dataCarrier })

  // 2. 构建节点参数
  const node = {
    protocol: NodeName.SimpleGroupBlock,
    body: dataCarrier,
  }

  // 3. 发送节点
  try {
    const { protocol, body } = node
    // const res = await sdk.createBrfcChildNode(node, { useQueue: true, subscribeId })
    const res = await buildTx.setChannelBlockList({
      protocol,
      body,
      isBroadcast: true,
    })
    console.log('res', res)

    console.log({ res })

    if (res === null) {
      return { status: 'canceled' }
    }

    if (chainStore.state.currentChain == ChatChain.btc) {
      return { status: 'success', txid: res?.revealTxIds[0] }
    } else {
      return { status: 'success', txid: res?.txids[0] }
    }
  } catch (err) {
    console.log(err)
    ElMessage.error(`${i18n.global.t('set_blacklist_fail')}`)
    return { status: 'failed' }
  }
}

export type SimpleGroup = {
  communityId: string
  groupId: string
  groupName: string
  groupNote: string
  groupType: string
  status: string
  type: string
  tickId: string
  collectionId: string
  codehash: string
  genesis: string
  limitAmount: string
  chatSettingType: string
  deleteStatus: string
  timestamp: string
  groupIcon: string
}

export const updateGroupChannel = async (
  groupInfo: SimpleGroup,
  changeItem: Partial<SimpleGroup>
) => {
  const data = {
    ...groupInfo,
    ...changeItem,
    timestamp: getTimestampInSeconds(),
  }

  const metaidData = {
    body: JSON.stringify(data),
    path: `${VITE_ADDRESS_HOST() || import.meta.env.VITE_ADDRESS_HOST}:/protocols/${
      NodeName.SimpleGroupCreate
    }`,
    flag: MetaFlag.metaid,
    version: '1.0.0',
    operation: 'modify',
    contentType: 'application/json',
    encryption: '0',
    encoding: 'utf-8',
  }
  const chainStore = useChainStore()
  const currentChain = chainStore.state.currentChain
  const chainData = chainStore.state[currentChain]
  const selectedFeeType = chainData.selectedFeeType
  const feeRate = chainData[selectedFeeType]
  if (currentChain === ChatChain.btc) {
    const txIDs = await createPinWithBtc({
      inscribeDataArray: [metaidData],
      options: {
        network: 'mainnet',
        noBroadcast: 'no',
        feeRate: feeRate,
      },
    })
    return {
      status: 'success',
      txIDs,
    }
  } else {
    const { txids } = await createPin(metaidData, {
      network: 'mainnet',
      signMessage: 'update Group Info',
      serialAction: 'finish',
      feeRate: feeRate,
    })
    return {
      status: 'success',
      txIDs: txids,
    }
  }
}

export const verifyPassword = (key: string, hashedPassword: string, creatorMetaId: string) => {
  const decrypted = decrypt(key, hashedPassword)

  return decrypted === creatorMetaId.substring(0, 16)

  // if (decrypted && decrypted === creatorMetaId.substring(0, 16)) {
  //   talk.hasActiveChannelConsent = true
  //   layout.isShowPasswordModal = false
  // }
}

const _getChannelTypeInfo = (form: any, selfMetaId: string) => {
  let groupType = null
  let status = null
  let type = null
  let codehash = null
  let genesis = null
  let limitAmount = null

  switch (form.type) {
    case GroupChannelType.PublicText:
      groupType = '1'
      status = '1'
      type = '0'
      break

    case GroupChannelType.Password:
      groupType = '1'
      status = '1'
      type = '100'
      break

    case GroupChannelType.NFT:
      groupType = '2'
      codehash = form.nft.nftCodehash
      genesis = form.nft.nftGenesis

      status = encrypt(selfMetaId.substring(0, 16), MD5Hash(genesis).substring(0, 16))

      if (form.chain === 'eth' || form.chain === 'goerli') {
        type = '2001'
      } else if (form.chain === 'polygon' || form.chain === 'mumbai') {
        type = '2002'
      } else if (form.chain === 'bsv') {
        type = '2003'
      } else {
        type = '2000'
      }
      break

    case GroupChannelType.FT:
      groupType = '2'
      status = encrypt(selfMetaId.substring(0, 16), MD5Hash(form.ft.genesis).substring(0, 16))
      codehash = form.ft.codehash
      genesis = form.ft.genesis

      if (form.chain === 'eth' || form.chain === 'goerli') {
        type = '3001'
      } else if (form.chain === 'polygon' || form.chain === 'mumbai') {
        type = '3002'
      } else if (form.chain === 'bsv') {
        type = '3003'
      } else {
        type = '3000'
      }

      limitAmount = form.amount.toString()
      break

    // 原生币
    case GroupChannelType.Native:
      groupType = '2'
      if (form.chain === 'bsv') {
        type = '4001'
      } else {
        type = '4000'
      }
      limitAmount = form.amount.toString()
      break

    default:
      break
  }

  return { groupType, status, type, codehash, genesis, limitAmount }
}

export const joinChannel = async (groupId: string, referrer?: string, passcode?: string) => {
  try {
    const buildTx = useBulidTx()
    const dataCarrier = {
      groupId: groupId || '',
      state: CommunityJoinAction.Join,
      referrer: referrer || '',
      k: passcode || '',
    }

    // 2. 构建节点参数
    const node = {
      protocol: NodeName.SimpleGroupJoin, // NodeName.SimpleCommunityJoin,
      encrypt: String(IsEncrypt.No),
      // dataType: 'application/json',
      isBroadcast: true,
      body: dataCarrier,
    }

    // 3. 发送节点
    const nodeRes = await buildTx.joinGrop(node)

    if (nodeRes === null) {
      return {
        status: 'failed',
      }
    }

    return { groupId }
  } catch (error) {
    throw new Error(error as any)
  }
}

export const joinCommunity = async (groupId: string, referrer?: string) => {
  try {
    const buildTx = useBulidTx()
    const dataCarrier = {
      groupId: groupId || '',
      state: CommunityJoinAction.Join,
      referrer: referrer || '',
    }

    // 2. 构建节点参数
    const node = {
      protocol: NodeName.SimpleGroupJoin, // NodeName.SimpleCommunityJoin,
      encrypt: IsEncrypt.No,
      // dataType: 'application/json',
      isBroadcast: true,
      body: dataCarrier,
    }

    // 3. 发送节点
    const nodeRes = await buildTx.joinGrop(node)

    if (nodeRes === null) {
      return {
        status: 'failed',
      }
    }

    return { groupId }
  } catch (error) {}
}

export const leaveCommunity = async (communityId: string) => {
  try {
    const buildTx = useBulidTx()
    const dataCarrier = {
      groupId: communityId || '',
      state: CommunityJoinAction.Leave,
      referrer: '',
    }

    // 2. 构建节点参数
    const node = {
      protocol: NodeName.SimpleCommunityJoin,
      body: dataCarrier,
      encrypt: IsEncrypt.No,
      isBroadcast: true,
    }

    // 3. 发送节点
    const nodeRes = await buildTx.joinGrop(node) // await sdk.createBrfcChildNode(node)

    if (nodeRes === null) {
      return {
        status: 'failed',
      }
    }

    return { communityId }
  } catch (error) {}
}

export const sendMessage = async (messageDto: MessageDto) => {
  try {
    return _sendImageMessage(messageDto)
  } catch (error) {
    console.error(error)
  }
}

// export const reSendMessage = async (messageDto: MessageDto) => {
//   try {

//     switch (messageDto.type) {
//       case MessageType.Text:
//         if (messageDto.channelType === ChannelType.Session) {
//           //return _sendTextMessageForSession(messageDto)
//         }
//         //return _sendTextMessage(messageDto)
//       case MessageType.Image:
//         if (messageDto.channelType === ChannelType.Session) {
//           // return _sendImageMessageForSession(messageDto)
//         }
//        // return _sendImageMessage(messageDto)
//     }
//   } catch (error) {
//     console.error(error)
//   }
// }

export const validateTextMessage = (message: string) => {
  message = message.trim()

  return message.length > 0 && message.length <= 5000
}

export const tryCreateNode = async (
  node: {
    protocol: string
    body: any
    timestamp: number
    externalEncryption?: '0' | '1' | '2'
    fileEncryption?: '0' | '2' | '2'
    attachments?: AttachmentItem[]
  },
  mockId?: string
) => {
  const jobs = useJobsStore()
  const simpleTalk = useSimpleTalkStore()
  const buildTx = useBulidTx()
  console.log('tryCreateNode node:', node)
  const {
    protocol,
    body,
    timestamp: timeStamp,
    attachments,
    externalEncryption,
    fileEncryption,
  } = node
  try {
    // const nodeRes = await sdk.createBrfcChildNode(node)
    const nodeRes = await buildTx.createShowMsg({
      protocol,
      body,
      attachments,
      externalEncryption,
      fileEncryption,
      isBroadcast: true,
    })

    // 取消支付的情况下，删除mock消息
    console.log({ nodeRes })
    const txId = nodeRes?.txids ? nodeRes.txids[0] : nodeRes?.revealTxIds[0]
    if (nodeRes === null && mockId) {
      simpleTalk.removeMessage(mockId)
    }
    if (txId && mockId) {
      simpleTalk.updateMessageMockId(mockId, txId)
    }
  } catch (error) {
    const timestamp = timeStamp
    jobs?.node && jobs?.nodes.push({ node, timestamp })
    if (mockId) {
      simpleTalk.setMessageError(mockId, (error as any).message || 'Send failed')
    }
  }
}

const _sendTextMessage = async (messageDto: MessageDto) => {
  const userStore = useUserStore()
  const talkStore = useTalkStore()
  const chainStore = useChainStore()
  const { content, channelId: groupId, userName: nickName, reply } = messageDto

  // 1. 构建协议数据
  const timestamp = getTimestampInSeconds()
  const contentType = 'text/plain'
  const encryption = 'aes'
  const externalEncryption = '0'
  const dataCarrier = {
    groupId,
    timestamp,
    nickName,
    content,
    contentType,
    encryption,
    replyPin: reply ? `${reply.txId}i0` : '',
  }

  // 2. 构建节点参数
  const node = {
    protocol: NodeName.SimpleGroupChat,
    body: dataCarrier,
    timestamp: Date.now(), // 服务端返回的是毫秒，所以模拟需要乘以1000
    externalEncryption,
  }

  // 2.5. mock发送
  const mockId = realRandomString(12)
  // const mockMessage = {
  //   mockId,
  //   protocol: 'simpleGroupChat',
  //   contentType: 'text/plain',
  //   content,
  //   avatarType: userStore.user?.avatarType || 'undefined',
  //   avatarTxId: userStore.user?.avatarTxId || 'undefined',
  //   avatarImage: userStore.user?.avatarImage || '',
  //   metaId: userStore.user?.metaId || 'undefined',
  //   nickName: userStore.user?.name || '',
  //   userInfo: userStore.user?.metaName ? { metaName: userStore.user?.metaName } : {},
  //   timestamp: Date.now(), // 服务端返回的是毫秒，所以模拟需要乘以1000
  //   txId: '',
  //   encryption,
  //   isMock: true,
  //   replyInfo: reply
  //     ? {
  //         chatType: reply.chatType,
  //         content: reply.content,
  //         contentType: reply.contentType,
  //         encryption: reply.encryption,
  //         metaId: reply.metaId,
  //         nickName: reply.nickName,
  //         protocol: reply.protocol,
  //         timestamp: reply.timestamp,
  //         txId: reply.txId,
  //         userInfo: reply.userInfo,
  //       }
  //     : undefined,
  // }
  const mockMessage = {
    mockId,
    protocol: NodeName.SimpleGroupChat,
    contentType: 'text/plain',
    content,
    chatType: ChatType.msg,
    groupId: groupId,

    chain: chainStore.state.currentChain == 'btc' ? 'btc' : 'mvc',
    avatarType: 'undefined',
    avatarTxId: userStore.last?.avatarId || 'undefined',
    avatarImage: userStore.last?.avatar || '',
    metaId: userStore.last?.metaid || 'undefined',
    nickName: userStore.last?.name || '',
    userInfo: userStore.last,
    timestamp: Date.now(), // 服务端返回的是毫秒，所以模拟需要乘以1000
    txId: '',
    encryption,
    externalEncryption,
    isMock: true,
    replyInfo: reply
      ? {
          chatType: reply.chatType,
          content: reply.content,
          contentType: reply.contentType,
          encryption: reply.encryption,
          metaId: reply.metaId,
          nickName: reply.userInfo.name,
          protocol: reply.protocol,
          timestamp: reply.timestamp,
          txId: reply.txId,
          userInfo: reply.userInfo,
        }
      : undefined,
    type: 1,
  }
  talkStore.addMessage(mockMessage)

  // 3. 发送节点
  // const sdk = userStore.showWallet
  try {
    const tryRes = await tryCreateNode(node, mockId)

    if (tryRes === false) {
      talkStore.addRetryList({ ...messageDto, mockId })
    } else {
      talkStore.removeRetryList(mockId)
      return '1'
    }
  } catch (error) {
    talkStore.addRetryList({ ...messageDto, mockId })
  }
}

const _sendTextMessageForSession = async (messageDto: MessageDto) => {
  const userStore = useUserStore()
  const simpleTalkStore = useSimpleTalkStore()
  const chainStore = useChainStore()

  const { content, channelId: to, reply } = messageDto

  // 1. 构建协议数据
  // 1.1 to: done
  // 1.2 timestamp
  const timestamp = Date.now()
  // 1.3 content: done
  // 1.4 contentType
  const contentType = 'text/plain'
  // 1.5 encrypt
  const encrypt = 'ecdh'
  const externalEncryption = '0'
  const dataCarrier = {
    to,
    timestamp,
    content,
    contentType,
    encrypt,
    replyPin: reply ? `${reply.txId}i0` : '',
  }

  // 2. 构建节点参数
  const node = {
    protocol: NodeName.SimpleMsg,
    body: dataCarrier,
    timestamp, // 服务端返回的是毫秒，所以模拟需要乘以1000
    externalEncryption,
  }

  // 2.5. mock发送
  const mockId = realRandomString(12)
  // const mockMessage = {
  //   content,
  //   mockId,
  //   nodeName: NodeName.ShowMsg,
  //   dataType: 'application/json',
  //   data: dataCarrier,
  //   avatarType: userStore.user?.avatarType || 'undefined',
  //   avatarTxId: userStore.last?.avatarId || 'undefined',
  //   avatarImage: userStore.last?.avatarImage || '',
  //   fromAvatarImage: userStore.user?.avatarImage || '',
  //   metaId: userStore.user?.metaId || 'undefined',
  //   from: userStore.user?.metaId,
  //   nickName: userStore.user?.name || '',
  //   fromName: userStore.user?.name || '',
  //   userInfo: userStore.user?.metaName ? { metaName: userStore.user?.metaName } : {},
  //   fromUserInfo: userStore.user?.metaName ? { metaName: userStore.user?.metaName } : {},
  //   timestamp, // 服务端返回的是毫秒，所以模拟需要乘以1000
  //   txId: '',
  //   encryption: encrypt,
  //   isMock: true,
  //   to,
  //   replyInfo: reply,
  //   protocol: NodeName.ShowMsg,
  // }

  // 查找store中的位置
  const mockMessage = {
    content,
    mockId,
    nodeName: NodeName.SimpleMsg,
    chatType: ChatType.msg,
    dataType: 'text/plain',
    data: dataCarrier,
    chain: chainStore.state.currentChain == 'btc' ? 'btc' : 'mvc',
    avatarType: 'undefined',
    avatarTxId: userStore.last?.avatarId || 'undefined',
    avatarImage: userStore.last?.avatar || '',
    fromAvatarImage: userStore.last?.avatar || '',
    metaId: userStore.last?.metaid || 'undefined',
    address: userStore.last?.address,
    from: userStore.last?.metaid,
    nickName: userStore.last?.name || '',
    fromName: userStore.last?.name || '',
    userInfo: userStore.last || {},
    fromUserInfo: userStore.last || {},
    timestamp, // 服务端返回的是毫秒，所以模拟需要乘以1000
    txId: '',

    encryption: encrypt,
    externalEncryption,
    isMock: true,
    to,
    replyInfo: reply,
    protocol: NodeName.SimpleMsg,
    type: 2,
  }
  simpleTalkStore.addMessage(mockMessage)

  // 3. 发送节点
  // const sdk = userStore.showWallet
  // await tryCreateNode(node, mockId)

  // return '1'
  try {
    const tryRes = await tryCreateNode(node, mockId)

    if (tryRes === false) {
      talkStore.addRetryList({ ...messageDto, mockId })
    } else {
      if (tryRes?.txids?.length || tryRes?.revealTxIds?.length) {
        if (to === userStore.last.metaid) {
          const txId =
            (tryRes?.txids && tryRes?.txids[0]) || (tryRes?.revealTxIds && tryRes?.revealTxIds[0])
          talkStore.updateMessage(mockMessage, txId)
        }
      }
      talkStore.removeRetryList(mockId)
      return '1'
    }
  } catch (error) {
    talkStore.addRetryList({ ...messageDto, mockId })
  }
}

const _uploadImage = async (file: File, sdk: SDK) => {
  const fileType = file.type.split('/')[1]
  const hexedFiles = await FileToAttachmentItem(file)
  const dataCarrier = {
    nodeName: 'icon',
    data: hexedFiles,
    dataType: fileType,
    encrypt: IsEncrypt.No,
    encoding: 'binary',
  }

  const node = {
    nodeName: NodeName.MetaFile,
    dataType: 'application/json',
    attachments: [hexedFiles],
  }

  const newNode = await sdk.createBrfcChildNode(node)
  if (!newNode) return { metafileUri: null }

  const txId = newNode.txId
  const metafileUri = 'metafile://' + txId + '.' + fileType

  return { metafileUri }
}

const _sendImageMessage = async (messageDto: MessageDto) => {
  const userStore = useUserStore()
  const simpleTalkStore = useSimpleTalkStore()
  const chainStore = useChainStore()

  const {
    channelId,
    groupId,
    userName: nickName,
    attachments,
    originalFileUrl,
    reply,
    channelType,
  } = messageDto

  // 1. 构建协议数据
  // 1.1 groupId: done
  // 1.2 timestamp
  const timestamp = getTimestampInSeconds()
  // 1.3 nickName: done
  // 1.4 fileType
  const file = attachments![0]
  const fileType = file.fileType.split('/')[1]
  // 1.5 encrypt
  const encrypt = 'aes'
  const externalEncryption = '0' //channelType == ChannelType.Group ?  '0' : '1'

  // const attachment =attachments//'metafile://$[0]'

  const dataCarrier: any =
    messageDto.channelType === 'group' || messageDto.channelType === 'sub-group'
      ? {
          timestamp,
          encrypt,
          fileType,
          groupId:
            simpleTalkStore.activeChannel!.parentGroupId || simpleTalkStore.activeChannel!.id,
          nickName,
          attachment: '',
          replyPin: reply ? `${reply.txId}i0` : '',
          channelId:
            messageDto.channelType === 'sub-group' ? simpleTalkStore.activeChannel!.id : '',
        }
      : {
          timestamp,
          encrypt,
          fileType,
          to: channelId,
          nickName,
          attachment: '',
          replyPin: reply ? `${reply.txId}i0` : '',
        }

  // if (messageDto.channelType !== ChannelType.Group) {
  //   dataCarrier.to = channelId
  // }

  const nodeName =
    messageDto.channelType === 'group' || messageDto.channelType === 'sub-group'
      ? NodeName.SimpleFileGroupChat
      : NodeName.SimpleFileMsg
  const fileEncryption =
    messageDto.channelType === 'group' || messageDto.channelType === 'sub-group' ? '0' : '1'
  // 2. 构建节点参数
  const node = {
    protocol: nodeName,
    // dataType: 'application/json',
    body: dataCarrier,
    attachments,
    timestamp: timestamp * 1000, // 服务端返回的是毫秒，所以模拟需要乘以1000
    externalEncryption,
    fileEncryption,
  }

  // 2.5. mock发送
  const mockId = realRandomString(12)
  // const mockMessage = {
  //   mockId,
  //   protocol: nodeName,
  //   nodeName,
  //   groupId: channelId,
  //   chatType: ChatType.img,
  //   contentType: fileType,
  //   content: originalFileUrl,
  //   chain: chainStore.state.currentChain == 'btc' ? 'btc' : 'mvc',
  //   avatarType: userStore.last?.avatar || 'undefined',
  //   avatarTxId: userStore.last?.avatarId || 'undefined',
  //   avatarImage: userStore.last?.avatar || '',
  //   fromAvatarImage: userStore.last?.avatar || '',
  //   metaId: userStore.last?.metaid || 'undefined',
  //   from: userStore.last?.metaid,
  //   nickName: userStore.last?.name || '',
  //   userInfo: userStore.last, // userStore.last?.metaName ? { metaName: userStore.last?.metaName } : {},
  //   timestamp: timestamp * 1000, // 服务端返回的是毫秒，所以模拟需要乘以1000
  //   txId: '',
  //   encryption: encrypt,
  //   externalEncryption,
  //   isMock: true,
  //   replyInfo: reply,
  //   type: messageDto.channelType === ChannelType.Group ? 1 : 2,
  // }
  // talkStore.addMessage(mockMessage)

  // 3. 发送节点
  // const sdk = userStore.showWallet
  try {
    const tryRes = await tryCreateNode(node, mockId)
    // if (!tryRes) {
    //   talkStore.addRetryList({ ...messageDto, mockId })
    // } else {
    //   talkStore.removeRetryList(mockId)
    //   return
    // }
  } catch (error) {
    // talkStore.addRetryList({ ...messageDto, mockId })
  }

  // await tryCreateNode(node,mockId)

  // return
}

export const formatTimestamp = (timestamp: number, i18n: any, showMinutesWhenOld = true) => {
  if (String(timestamp).length < 13) {
    timestamp = timestamp * 1000
  }

  if (String(timestamp).length >= 16) {
    timestamp = timestamp / 1000
  }

  const day = dayjs(timestamp)

  // 如果是今天，则显示为“今天 hour:minute”
  if (day.isSame(dayjs(), 'day')) {
    return `${day.format('HH:mm')}`
  }

  // 如果是昨天，则显示为“昨天 hour:minute”
  if (day.isSame(dayjs().subtract(1, 'day'), 'day')) {
    return `${i18n.t('Talk.Datetime.yesterday')}${day.format('HH:mm')}`
  }

  // 如果是今年，则显示为“month day hour:minute”
  if (showMinutesWhenOld) {
    if (day.isSame(dayjs(), 'year')) {
      return day.format('MM/DD HH:mm')
    }

    // 如果不是今年，则显示为“year month day hour:minute”
    return day.format('YYYY/MM/DD HH:mm')
  } else {
    if (day.isSame(dayjs(), 'year')) {
      return day.format('MM/DD')
    }

    return day.format('YYYY/MM/DD')
  }
}

export const isFileTooLarge = (file: File) => {
  return file.size > 10 * 1024 * 1024 // 10MB
}

export const isImage = (file: File) => {
  const type = file.type

  return (
    type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || type === 'image/jpg'
  )
}

export const openRedPacket = async (redPacket: any, sdk: SDK) => {
  const talkStore = useTalkStore()
  const userStore = useUserStore()
  const userAddressStr = userStore.user!.address as any
  const userAddress = new Address(userAddressStr, 'mainnet')
  const { subId, code, createTime } = redPacket
  const dataCarrier = {
    createTime,
    subId,
    code,
    type: redPacket.type,
    used: redPacket.iTake,
  }

  // 使用红包的钱构建交易本身
  const key = `${subId.toLocaleLowerCase()}${code.toLocaleLowerCase()}${createTime}`
  const net = 'mainnet'
  const redPacketCrypto = buildCryptoInfo(key, net)

  // const
  const satoshis = new Decimal(redPacket.iTake.amount)
  const amount = satoshis.dividedBy(100000000).toNumber()

  const iTakeUtxo = {
    address: redPacketCrypto.addressStr as any,
    satoshis: satoshis.toNumber(),
    txId: redPacket.id,
    outputIndex: redPacket.iTake.index,
  }
  console.log('iTakeUtxo', iTakeUtxo)
  const txComposer = new TxComposer()

  txComposer.appendP2PKHInput(iTakeUtxo)
  // const opReturn = _buildOpReturn()
  // txComposer.appendOpReturnOutput(opReturn)
  txComposer.appendChangeOutput(userAddress, DEFAULTS.feeb)
  txComposer.unlockP2PKHInput(redPacketCrypto.privateKey, 0)
  const verify = txComposer.tx.verify()
  console.log('verify', verify)

  // const txHex = txComposer.getRawHex()
  // await sdk.wallet?.provider.broadcast(txHex)
}

const _buildOpReturn = () => {
  //   'mvc',
  // nodeAddress.publicKey.toString(),
  // parentTxId,
  // metaIdTag.toLowerCase(),
  // nodeName,
  // data,
  // encrypt.toString(),
  // version,
  // dataType,
  // encoding,
  return [
    'mvc',
    '',
    '',
    'testmetaid',
    'OpenRedenvelope',
    JSON.stringify({}),
    '0',
    '1.0.1',
    'application/json',
    'UTF-8',
  ]
}

export async function createAnnouncement(
  form: {
    title: string
    content: string
    communityId: string
  },
  sdk: SDK
) {
  const createTime = new Date().getTime()
  const dataCarrier = {
    title: form.title,
    content: form.content,
    contentType: 'text/plain',
    createTime,
  }

  // 2. 构建节点参数
  const node = {
    nodeName: NodeName.SimpleCreateAnnouncement,
    data: JSON.stringify(dataCarrier),
  }
  console.log('node', node)

  const res = await sdk.createBrfcChildNode(node)
  const announcementTxId = res?.currentNode.txId
  if (!announcementTxId) {
    throw new Error('announcementId is null') // TODO
  }

  // 使用txId获取metanetId
  console.log('announcementTxId', announcementTxId)
  const { data: announcement } = await GetOneAnnouncement({ txId: announcementTxId })

  // 构建公告引用
  const quoteDateCarrier = {
    announcementId: announcement.metanetId,
    createTime,
    quoteId: form.communityId,
    disable: 0, // 0: 未禁用，1：禁用
  }
  console.log('quoteDateCarrier', quoteDateCarrier)

  const quoteNode = {
    nodeName: NodeName.SimpleAnnouncementQuote,
    data: JSON.stringify(quoteDateCarrier),
  }

  await sdk.createBrfcChildNode(quoteNode)

  return 'success'
}

export async function editAnnouncement(
  form: {
    title: string
    content: string
    communityId: string
    txId: string
    publickey: string
  },
  sdk: SDK
) {
  const createTime = new Date().getTime()
  const dataCarrier = {
    title: form.title,
    content: form.content,
    contentType: 'text/plain',
    createTime,
  }

  // 2. 构建节点参数
  const node = {
    nodeName: NodeName.SimpleCreateAnnouncement,
    data: JSON.stringify(dataCarrier),
    publickey: form.publickey,
    txId: form.txId,
  }
  console.log('node', node)

  const res = await sdk.createBrfcChildNode(node)

  return 'success'
}

export async function deleteAnnouncement(
  form: {
    announcementId: string
    communityId: string
  },
  sdk: SDK
) {
  const createTime = new Date().getTime()

  // 构建公告的禁用引用
  const quoteDateCarrier = {
    announcementId: form.announcementId,
    createTime,
    quoteId: form.communityId,
    disable: 1, // 0: 未禁用，1：禁用
  }
  console.log('quoteDateCarrier', quoteDateCarrier)

  const quoteNode = {
    nodeName: NodeName.SimpleAnnouncementQuote,
    data: JSON.stringify(quoteDateCarrier),
  }

  await sdk.createBrfcChildNode(quoteNode)

  return 'success'
}

export function decryptedMessage(
  content: string,
  encryption: string,
  protocol: string,
  isMock = false,
  isSession = false, // 是否私聊
  secretKeyStr = '',
  publicKeyStr = '' //私聊获取协商密钥使用
) {
  if (!content) return
  const simpleTalk = useSimpleTalkStore()

  if (encryption === '0') {
    // return decrypt(content,secretKeyStr ? secretKeyStr : talk.activeChannelId.substring(0, 16))
    return content
  }

  if (
    containsString(protocol, NodeName.SimpleFileGroupChat) ||
    containsString(protocol, NodeName.SimpleFileMsg)
  ) {
    return content
  }

  if (isSession) {
    if (!simpleTalk.activeChannel) return ''
    // const credentialsStore = useCredentialsStore()
    // const connectionStore = useConnectionStore()
    const ecdhsStore = useEcdhsStore()
    // console.log("talk.activeChannel.publicKeyStr",talk.activeChannel.publicKeyStr)
    const ecdhPubkey = publicKeyStr ? publicKeyStr : simpleTalk.activeChannel!.publicKeyStr
    let ecdh = ecdhsStore.getEcdh(ecdhPubkey)

    try {
      const sharedSecret = ecdh?.sharedSecret

      return ecdhDecrypt(content, sharedSecret)
    } catch (error) {
      throw new Error((error as any).toString())
    }
  } else {
    // 群聊解密：优先使用 passwordKey，否则使用 channelId
    if (!secretKeyStr && simpleTalk.activeChannel?.passwordKey) {
      secretKeyStr = simpleTalk.activeChannel.passwordKey
    }
    console.log('decryptedMessage secretKeyStr', secretKeyStr)
    return decrypt(content, secretKeyStr || simpleTalk.activeChannelId.substring(0, 16))
  }
}

export const createBroadcastChannel = async (
  groupId: string,
  channelId: string = '',
  channelName: string = '',
  channelIcon: string = '',
  channelNote: string = ''
) => {
  const buildTx = useBulidTx()
  const chainStore = useChainStore()

  const dataCarrier = {
    groupId,
    channelId: channelId ? channelId : '',
    channelName,
    channelIcon,
    channelNote,
    channelType: 1,
  }

  console.log({ dataCarrier })

  // 2. 构建节点参数
  const node = {
    protocol: 'simplegroupchannel',
    body: dataCarrier,
  }

  // 3. 发送节点
  try {
    const { protocol, body } = node
    // const res = await sdk.createBrfcChildNode(node, { useQueue: true, subscribeId })
    const res = await buildTx.createBroadcastChannel({
      protocol,
      body,
      isBroadcast: true,
    })
    console.log('res', res)

    console.log({ res })

    if (res === null) {
      return { status: 'canceled' }
    }

    if (chainStore.state.currentChain == ChatChain.btc) {
      return { status: 'success', channelId: channelId ? channelId : res?.revealTxIds[0] }
    } else {
      return { status: 'success', channelId: channelId ? channelId : res?.txids[0] }
    }
  } catch (err) {
    console.log(err)
    ElMessage.error(`${i18n.global.t('create_broadcast_fail')}`)
    return { status: 'failed' }
  }
}

/**
 * 发送邀请链接私聊消息给用户
 * @param toMetaId 接收方 MetaId
 * @param inviteUrl 邀请链接
 * @param sharedSecret ECDH 协商的共享密钥（用于加密邀请链接）
 */
const sendInviteMessage = async (toMetaId: string, inviteUrl: string, sharedSecret?: string) => {
  const userStore = useUserStore()
  const simpleTalkStore = useSimpleTalkStore()
  const chainStore = useChainStore()

  // 1. 构建消息内容
  const timestamp = Date.now()
  let content = inviteUrl

  // 如果有共享密钥，则加密邀请链接
  if (sharedSecret) {
    const CryptoJS = await import('crypto-js')
    content = CryptoJS.AES.encrypt(inviteUrl, sharedSecret).toString()
    console.log('🔒 邀请链接已加密, 密文长度:', content.length)
  }

  const contentType = 'text/plain'
  const encrypt = 'ecdh'
  const externalEncryption = '0' as const

  const dataCarrier = {
    to: toMetaId,
    timestamp,
    content,
    contentType,
    encrypt,
    replyPin: '',
  }

  const node = {
    protocol: NodeName.SimpleMsg,
    body: dataCarrier,
    timestamp,
    externalEncryption,
  }

  // 2. 创建 mock 消息
  const mockId = realRandomString(12)
  const mockMessage: any = {
    mockId,
    txId: '',
    pinId: '',
    metaId: userStore.last?.metaid || '',
    address: userStore.last?.address || '',
    userInfo: userStore.last || {},
    nickName: userStore.last?.name || '',
    protocol: NodeName.SimpleMsg,
    content,
    contentType,
    encryption: encrypt,
    version: '1.0.0',
    chatType: ChatType.msg,
    data: dataCarrier,
    replyPin: '',
    replyInfo: null,
    replyMetaId: '',
    timestamp,
    params: '',
    chain: chainStore.state.currentChain == 'btc' ? 'btc' : 'mvc',
    blockHeight: 0,
    index: 0,
    mention: [],
    // 私聊特有字段
    from: userStore.last?.metaid,
    fromUserInfo: userStore.last || {},
    to: toMetaId,
    toUserInfo: {},
  }

  simpleTalkStore.addMessage(mockMessage)

  // 3. 发送消息
  console.log(`🚀 发送私聊消息到: ${toMetaId}`)
  await tryCreateNode(node, mockId)
}

/**
 * 批量邀请用户到私密群聊
 * @param groupId 群组ID
 * @param userList 用户列表，需包含 metaId 和 chatPublicKey
 * @param passwordKey 群组密码密钥（仅私密群聊需要）
 * @returns 邀请结果，包含每个用户的邀请链接和状态
 */
export const batchInviteUsersToGroup = async (params: {
  groupId: string
  groupName?: string
  userList: Array<{ metaId: string; chatPublicKey: string; userName?: string }>
  passwordKey?: string
}): Promise<{
  status: 'success' | 'failed' | 'partial'
  results: Array<{
    metaId: string
    userName?: string
    status: 'success' | 'failed'
    inviteUrl?: string
    error?: string
  }>
}> => {
  const { groupId, groupName, userList, passwordKey } = params
  const buildTx = useBulidTx()
  const chainStore = useChainStore()
  const userStore = useUserStore()

  // 导入 API 函数
  const { getGroupJoinControlList } = await import('@/api/talk')
  const CryptoJS = await import('crypto-js')

  console.log(
    '🚀 开始批量邀请:',
    {
      groupId,
      userCount: userList.length,
      hasPasswordKey: !!passwordKey,
    },
    userList
  )

  try {
    // 1. 查询群组白名单列表
    console.log('📋 查询群组白名单列表...')
    const controlListRes = await getGroupJoinControlList({ groupId })

    if (controlListRes.code !== 0) {
      throw new Error('获取群组白名单列表失败')
    }

    const existingWhitelist = controlListRes.data.joinWhitelistMetaIds || []
    console.log('✅ 当前白名单用户数:', existingWhitelist.length)

    // 2. 筛选出不在白名单中的用户
    const usersToAdd = userList.filter(user => !existingWhitelist.includes(user.metaId))
    console.log('➕ 需要添加到白名单的用户数:', usersToAdd.length)

    // 3. 如果有用户需要添加到白名单，发送 pin
    if (usersToAdd.length > 0) {
      console.log('📤 添加用户到白名单...')

      const newWhitelist = [...existingWhitelist, ...usersToAdd.map(u => u.metaId)]

      const dataCarrier = {
        groupId,
        users: newWhitelist,
      }

      const node = {
        protocol: NodeName.SimpleGroupJoinWhitelist,
        body: dataCarrier,
      }

      try {
        const { protocol, body } = node
        const res = await buildTx.setChannelWhiteList({
          protocol,
          body,
          isBroadcast: true,
        })

        if (res === null) {
          throw new Error('用户取消了添加白名单操作')
        }

        const txid =
          chainStore.state.currentChain == ChatChain.btc ? res?.revealTxIds[0] : res?.txids[0]

        console.log('✅ 白名单更新成功, txid:', txid)
      } catch (err) {
        console.error('❌ 添加白名单失败:', err)
        throw new Error('添加白名单失败: ' + (err as Error).message)
      }
    }

    // 4. 为每个用户生成邀请链接并发送消息
    console.log('🔗 生成邀请链接并发送消息...')
    const results = []
    const isPrivateGroup = !!passwordKey

    // 按顺序处理每个用户，避免并发发送消息导致的问题
    for (const user of userList) {
      try {
        let inviteUrl = ''
        let sharedSecret: string | undefined = undefined

        if (isPrivateGroup && user.chatPublicKey) {
          // 私密群聊：使用 ECDH 协商密钥加密 passwordKey
          console.log(`🔐 为用户 ${user.metaId.slice(0, 8)}... 生成加密邀请链接`)

          try {
            // 使用 ECDH 协商密钥
            const ecdhResult = await window.metaidwallet.common.ecdh({
              externalPubKey: user.chatPublicKey,
            })
            sharedSecret = ecdhResult.sharedSecret

            console.log('🔑 ECDH 协商密钥成功:', sharedSecret.slice(0, 16) + '...')

            // 使用 AES 加密 passwordKey
            const encryptedPasscode = CryptoJS.AES.encrypt(passwordKey, sharedSecret).toString()

            console.log('🔒 AES 加密成功, passcode 长度:', encryptedPasscode.length)

            // URL 编码
            const encodedPasscode = encodeURIComponent(encryptedPasscode)

            // 添加发送者的 metaId,以便接收者可以获取发送者的公钥来解密 passcode
            const senderMetaId = userStore.last?.metaid
            inviteUrl = `${window.location.origin}/chat/channels/private/${groupId}?passcode=${encodedPasscode}&from=${senderMetaId}`
            // 如果有群名，添加到 URL 中
            if (groupName) {
              inviteUrl += `&groupName=${encodeURIComponent(groupName)}`
            }

            console.log(`✅ 用户 ${user.metaId.slice(0, 8)}... 邀请链接生成成功`)
          } catch (ecdhError) {
            console.error(`❌ ECDH 加密失败:`, ecdhError)
            throw new Error('ECDH 协商密钥失败: ' + (ecdhError as Error).message)
          }
        } else {
          // 公开群聊：生成普通邀请链接
          inviteUrl = `${window.location.origin}/channels/public/${groupId}`
          // 如果有群名，添加到 URL 中
          if (groupName) {
            inviteUrl += `?groupName=${encodeURIComponent(groupName)}`
          }
          console.log(`✅ 用户 ${user.metaId.slice(0, 8)}... 公开群聊邀请链接生成成功`)
        }

        // 发送邀请链接给用户（等待发送完成后再处理下一个用户）
        try {
          console.log(`📨 开始发送邀请消息给用户 ${user.metaId.slice(0, 8)}...`)
          await sendInviteMessage(user.metaId, inviteUrl, sharedSecret)
          console.log(`✅ 邀请消息已发送给用户 ${user.metaId.slice(0, 8)}...`)

          results.push({
            metaId: user.metaId,
            userName: user.userName,
            status: 'success' as const,
            inviteUrl,
          })
        } catch (sendError) {
          console.error(`❌ 发送邀请消息失败:`, sendError)
          // 发送失败，标记为失败
          results.push({
            metaId: user.metaId,
            userName: user.userName,
            status: 'failed' as const,
            error: '发送邀请消息失败: ' + (sendError as Error).message,
          })
        }
      } catch (err) {
        console.error(`❌ 为用户 ${user.metaId} 生成邀请链接失败:`, err)
        results.push({
          metaId: user.metaId,
          userName: user.userName,
          status: 'failed' as const,
          error: (err as Error).message,
        })
      }
    }

    // 5. 统计结果
    const successCount = results.filter(r => r.status === 'success').length
    const failedCount = results.filter(r => r.status === 'failed').length

    console.log('📊 批量邀请完成:', {
      total: results.length,
      success: successCount,
      failed: failedCount,
    })

    const overallStatus = failedCount === 0 ? 'success' : successCount === 0 ? 'failed' : 'partial'

    return {
      status: overallStatus,
      results,
    }
  } catch (err) {
    console.error('❌ 批量邀请失败:', err)

    // 返回所有用户都失败的结果
    return {
      status: 'failed',
      results: userList.map(user => ({
        metaId: user.metaId,
        userName: user.userName,
        status: 'failed' as const,
        error: (err as Error).message,
      })),
    }
  }
}
