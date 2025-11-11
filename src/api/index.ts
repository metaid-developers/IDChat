import { HttpRequests, ApiRequestTypes } from '@/utils/wallet/request2'
import { ElMessage } from 'element-plus'
import { Reqswapargs } from '@/utils/wallet/hd-wallet'

export interface ApiResultTypes {
  code: number
  msg: string
  error?: string
  result?: unknown
  data?: unknown
}

interface BaseApiResultTypes<T> {
  code: number
  msg?: string
  message?: string
  data?: T
  result?: T
}

interface MetasvSigTypes {
  signEncoded: string
  publicKey: string
  nonce: string
  timestamp: string
}

export interface BaseUserInfoParams {
  userType: string
  phone?: string
  email?: string
}

interface SetUserWalletInfoParams extends BaseUserInfoParams {
  address: string
  pubkey: string
  xpub: string
  remark: string
  type?: number
  headers?: ObjTypes<string | number>
}

interface SetUserPasswordParams extends BaseUserInfoParams {
  address: string
  password: string
  affirmPassword: string
  enCryptedMnemonic: string
  remark: string
  type?: number
}

import { getRuntimeConfig } from '@/config/runtime-config'

const getApiConfig = () => {
  const config = getRuntimeConfig()
  return {
    baseApi: config.api.baseApi,
    metasvApi: config.api.metaSvApi,
    wxcoreApi: config.api.wxcoreApi,
    mvcBaseApi: config.api.mvcBaseApi,
    cyber3Api: config.api.cyber3Api,
  }
}

const callApi = async (config: ApiRequestTypes): Promise<ApiResultTypes> => {
  const Http = new HttpRequests()
  const { baseApi } = getApiConfig()
  const apiPrefix = config.apiPrefix || baseApi
  const url = apiPrefix + config.url
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await Http.postFetch<any>(url, config.params, config.options)
    return res
  } catch (error) {
    console.error(error)
    ElMessage.error('网络请求错误')
    return {
      code: 500,
      msg: '网络请求错误',
    }
  }
}

// 缓存签名
const _cachedSigs: ObjTypes<any> = {}
const getMetasvSig = async (path: string): Promise<MetasvSigTypes> => {
  const Http = new HttpRequests()
  // const url = baseApi + '/metasv-signature/signature'
  const url = 'https://api.showmoney.app' + '/metasv-signature/signature'

  return Http.postFetch<BaseApiResultTypes<MetasvSigTypes>>(url, {
    path: path,
  }).then(res => {
    if (res.code === 0) {
      const sigObj = res.data as MetasvSigTypes
      _cachedSigs[path] = sigObj
      return sigObj
    } else {
      throw new Error(res.message + ' (01-getMetasvSig)')
    }
  })
}

export const mvcApi = async (
  path: string,
  params: ObjTypes<string | number> = {},
  method = 'get'
): Promise<{
  code: number
  data: any
}> => {
  const url = mvcBaseApi + path
  const Http = new HttpRequests()
  if (method === 'post') {
    return Http.postFetch(url, params)
      .then(res => {
        return res
      })
      .catch(error => {
        throw new Error('Request Error -- ' + error.message)
      })
  } else {
    return Http.getFetch(url, params)
      .then(res => {
        return res
      })
      .catch(error => {
        throw new Error('Request Error -- ' + error.message)
      })
  }
}

export const cyber3Api = async (
  path: string,
  params: ObjTypes<string | number> = {},
  method = 'get'
): Promise<any> => {
  const url = cyber3api + path
  const Http = new HttpRequests()
  if (method === 'post') {
    return Http.postFetch(url, params)
      .then(res => {
        return res
      })
      .catch(error => {
        throw new Error('Request Error -- ' + error.message)
      })
  } else {
    return Http.getFetch(url, params)
      .then(res => {
        return res
      })
      .catch(error => {
        throw new Error('Request Error -- ' + error.message)
      })
  }
}

export const callMetasvApi = async (
  path: string,
  params: ObjTypes<string | number> = {},
  method = 'get'
): Promise<unknown> => {
  let signature = _cachedSigs[path]

  // 5 分钟内相同地址只请求一次签名，有效间隔时间待确认
  if (!signature || Date.now() - Number(signature.timestamp) > 5 * 60 * 1000) {
    signature = await getMetasvSig(path)
  }
  const url = metasvApi + path
  const Http = new HttpRequests()
  if (method === 'post') {
    return Http.postFetch(url, params, {
      headers: {
        'Content-Type': 'application/json',
        'MetaSV-Timestamp': signature.timestamp,
        'MetaSV-Client-Pubkey': signature.publicKey,
        'MetaSV-Nonce': signature.nonce,
        'MetaSV-Signature': signature.signEncoded,
      },
    })
      .then(res => {
        return res
      })
      .catch(error => {
        throw new Error('Request Error metasv -- ' + error.message)
      })
  } else {
    return Http.getFetch(url, params, {
      headers: {
        'MetaSV-Timestamp': signature.timestamp,
        'MetaSV-Client-Pubkey': signature.publicKey,
        'MetaSV-Nonce': signature.nonce,
        'MetaSV-Signature': signature.signEncoded,
      },
    })
      .then(res => {
        return res
      })
      .catch(error => {
        throw new Error('Request Error metasv -- ' + error.message)
      })
  }
}

export const getBlockHeight = (): Promise<any> => {
  return mvcApi('/v1/chain/block/info')
}

export const getFtUtxo = (params: {
  address: string
  codehash: string
  genesis: string
  flag?: string
}): Promise<any> => {
  const { address, ..._params } = params

  return cyber3Api(
    `/contract/ft/address/${address}/utxo`,
    {
      ..._params,
    },
    'get'
  )
}

export const getBlocks = (): Promise<{
  height: number
  blockHash: string
  timestamp: number
  medianTime: number
  reward: number
  miner: string
  txCount: number
  size: number
}[]> => {
  return callMetasvApi('/block') as any
}

// 从 metasv 订阅 xpub
export const registerXpub = async (params: ObjTypes<any>): Promise<any> => {
  const blockInfo = await getBlockHeight()
  const blockHeight = blockInfo.blocks
  return callMetasvApi(
    '/xpub',
    {
      ...params,
      skipHeight: Number(blockHeight) - 2,
    },
    'post'
  )
}

// 检查用户是否已经注册
export const userCheck = async (params: BaseUserInfoParams): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/register/usercheck',
    params: params,
  })
}

// 获取登录验证码
export const loginGetCode = async (params: ObjTypes<any>): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/login/verification',
    params: params,
  })
}

// 用户登录
export const loginCheck = async (params: ObjTypes<any>): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/new/login/check',
    params: params,
  })
}

// 获取注册验证码
export const registerGetCode = async (params: BaseUserInfoParams): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/register/verification',
    params: params,
  })
}

// 用户注册
export const registerCheck = async (params: {
  userType: string
  phone?: string
  email?: string
  code: string
  name: string
  promotion?: string
}): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/register/check',
    params: params,
  })
}

// 获取图形验证码
export const getImageCode = async (params: { characteristic: string }): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/codeImage',
    params: params,
  })
}

// 提交用户钱包信息
export const setUserWalletInfo = (params: SetUserWalletInfoParams): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/wallet/setuserwalletinfo',
    params: params,
  })
}

export const setUserPassword = (
  params: SetUserPasswordParams,
  token: string,
  userName: string
): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/setPassword',
    params: params,
    options: {
      headers: {
        'Content-Type': 'application/json',
        accessKey: token,
        timestamp: Date.now(),
        userName: userName,
      },
    },
  })
}

export const setUserInfo = (params: {
  userType: string
  metaid: string
  phone?: string
  email?: string
  accessKey: string
  userName?: string
}): Promise<ApiResultTypes> => {
  return callApi({
    url: '/showpaycore/api/v1/user/setuserinfo',
    params: params,
    options: {
      headers: {
        'Content-Type': 'application/json',
        accessKey: params.accessKey,
        timestamp: Date.now(),
        userName: params.userType === 'phone' ? params.phone : params.email,
      },
    },
  })
}

// 兑换 NFT
export const exchangeNft = (params: {
  authCode: string
  openid: string
}): Promise<ApiResultTypes> => {
  return callApi({
    url: '/winter-olympics/api/v1/winter-olympics/nft/blind-box',
    params: params,
  })
}

// 获取用户的 NFT
export const getOlympicsNft = (openid: string): Promise<ApiResultTypes> => {
  return callApi({
    url: '/winter-olympics/api/v1/winter-olympics/nft/list',
    params: {
      openid: openid,
    },
  })
}

// 拆盲盒
export const openBindBox = (params: {
  authCode: string
  tokenIndex: string
  genesis: string
}): Promise<ApiResultTypes> => {
  return callApi({
    url: '/winter-olympics/api/v1/winter-olympics/nft/blind-box/change',
    params: params,
  })
}

// 发送 NFT 到指定地址
export const sendNft = (params: {
  openid: string
  genesis: string
  genesisTxid: string
  codehash: string
  sensibleId: string
  tokenIndex: string
  receiverAddress: string
}): Promise<ApiResultTypes> => {
  return callApi({
    url: '/winter-olympics/api/v1/winter-olympics/nft/transfer',
    params: params,
  })
}

export const getWalletNft = (address: string): Promise<any> => {
  const Http = new HttpRequests()
  const url = baseApi + '/aggregation/v2/app/sensible/getMyNftSummaryList/' + address
  return Http.getFetch(url, {
    page: 1,
    pageSize: '99',
    isDetail: true,
    itemCount: 30,
  })
}

export const getFtGenesisInfo = (txId: string): Promise<any> => {
  const Http = new HttpRequests()
  const url = baseApi + '/aggregation/v2/app/sensible/getFtGenesisByTxId/' + txId
  return Http.getFetch(url, {})
}

export const getUserSimpleInfo = (metaId: string): Promise<any> => {
  const Http = new HttpRequests()
  const url = baseApi + '/aggregation/v2/app/user/getUserSimpleInfo/' + metaId
  return Http.getFetch(url, {})
}

export const getUserInfo = () => {
  const res = callApi({
    url: '/showpaycore/api/v1/user/getuserinfo',
  })
  return res
}

export const idCardVerification = (params: {
  name: string
  idCard: string
  token: string
  loginName: string
}) => {
  const res = callApi({
    url: '/showpaycore/api/v1/user/idCardOCRVerification',
    params: {
      name: params.name,
      idCard: params.idCard,
    },
    options: {
      headers: {
        'Content-Type': 'application/json',
        accessKey: params.token,
        timestamp: Date.now(),
        userName: params.loginName,
      },
    },
  })
  return res
}

export const getKycInfo = (params: { token: string; loginName: string }) => {
  const res = callApi({
    url: '/showpaycore/api/v1/user/realNameAuthInfo',
    params: {},
    options: {
      headers: {
        'Content-Type': 'application/json',
        accessKey: params.token,
        timestamp: Date.now(),
        userName: params.loginName,
      },
    },
  })
  return res
}

export const getAppointmentInfo = (metaId: string): Promise<any> => {
  const Http = new HttpRequests()
  const url = wxcoreApi + '/wxcore/advance/info/' + metaId
  return Http.getFetch(url, {})
}

export const getAppointmentTotal = (activityId: string): Promise<any> => {
  const Http = new HttpRequests()
  const url = wxcoreApi + '/wxcore/advance/total'
  return Http.getFetch(url, {
    activityId,
  })
}

export const shareCommit = (metaId: string): Promise<any> => {
  const Http = new HttpRequests()
  const url = wxcoreApi + '/wxcore/advance/share/commit'
  return Http.postFetch(url, {
    metaid: metaId,
    // timestamp: new Date().getTime(),
  })
}

export const doAppointment = (params: {
  address: string
  metaid: string
  // eslint-disable-next-line camelcase
  public_key: string
  sign: string
  tag: number
}): Promise<any> => {
  return callApi({
    apiPrefix: wxcoreApi,
    url: '/wxcore/advance/commit',
    params: {
      ...params,
      timestamp: Date.now() + '',
    },
  })
}

// 获取活动列表
export const getActivityList = (params: { page: number; pageSize: number }) => {
  const res = callApi({
    apiPrefix: 'https://api.showmoney.app',
    url: '/v3/api/user/activity/activityList',
    params: params,
  })
  return res
}

// 获取我推荐的人
export const getMyInvitations = (params: { activity_id: number; metaid: string }) => {
  const res = callApi({
    apiPrefix: 'https://api.showmoney.app',
    url: '/v3/api/user/activity/myInvite',
    params: params,
  })
  return res
}

// 获取我推荐的人统计
export const getMyInviteRank = (params: { activity_id: number; metaid: string }) => {
  const res = callApi({
    apiPrefix: 'https://api.showmoney.app',
    url: '/v3/api/user/activity/myInviteRank',
    params: params,
  })
  return res
}

// 获取我推荐的人列表
export const getMyInviteList = (params: {
  activity_id: number
  metaid: string
  page: number
  page_size: number
}) => {
  const res = callApi({
    apiPrefix: 'https://api.showmoney.app',
    url: '/v3/api/user/activity/myInviteList',
    params: params,
  })
  return res
}

// 获取推荐排行榜
export const getMyInvitationsRank = (params: { activity_id: string; metaid: string }) => {
  const res = callApi({
    apiPrefix: 'https://api.showmoney.app',
    url: '/v3/api/user/activity/myInviteRank',
    params: params,
  })
  return res
}

// 获取参与活动的人数
export const getInvitateCount = (params: { activity_id: string }) => {
  const res = callApi({
    apiPrefix: 'https://api.showmoney.app',
    url: '/v3/api/user/activity/inviteCount',
    params: params,
  })
  return res
}

// 提交活动记录
export const commitActivity = (params: {
  activity_id: string
  metaid: string
  address?: string
  new_metaid?: string
  public_key?: string
  token?: string // 用户登录使用的token 或者 apptoken
  tag: string // 1:分享微信 2:分享朋友圈 3：复制URL 4：分享图片 5：注册完成 6 kyc完成
}) => {
  const res = callApi({
    apiPrefix: 'https://api.showmoney.app',
    url: '/v3/api/user/activity/commit',
    params: params,
  })
  return res
}

export const getUnspents = async (address: string, wif: string, flag?: string) => {
  if (!flag) {
    flag = ''
  }
  const url = `${metasvApi}/address/${address}/utxo?flag=${flag}`

  const Http = new HttpRequests()

  return Http.getFetch(url, '', {
    headers: {
      'Content-Type': 'application/json',
      Authorization:
        'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJpbnRlcm5hbF90ZXN0X3Nob3dwYXkiLCJpc3MiOiJNZXRhU1YiLCJleHAiOjE2NTM4OTc0MTB9.genUip-PcA3tdQtOMKZUzwuc7XxC3zF7Vy5wdYAfKsM',
    },
  })
    .then((res: any) => {
      return (res = res.map((v: any) => {
        return {
          txId: v.txid,
          satoshis: v.value,
          outputIndex: v.outIndex,
          address,
          wif,
          flag: v.flag,
        }
      }))
    })
    .catch(error => {
      throw new Error('Request Error metasv -- ' + error.message)
    })
}

export const getDividendUserInfo = (activityTag: string, address: string): Promise<any> => {
  const Http = new HttpRequests()
  const url = wxcoreApi + `/wxcore/dividend/info/${activityTag}/user`
  return Http.getFetch(url, {
    address,
  })
}

export const GetCertUserInfo = (metaId?: string): Promise<GetCertUserInfoRes> => {
  const Http = new HttpRequests()
  const url = `https://api.showmoney.app/broad/v1/nos/certification/getNosCertificationUserInfo/${metaId}`
  return Http.getFetch(url)
}

export const MetaNameBeforeReqRes = (parmas: {
  address: string
  name: string
  op: number
}): Promise<{ code: number; data: Reqswapargs; msg: string }> => {
  const Http = new HttpRequests()
  const url = baseApi + '/wxcore/metaname/reqargs'
  return Http.postFetch(url, {
    ...parmas,
    source: 'Show',
  })
}

export const GetTx = (txId: string): Promise<any> => {
  return mvcApi(`/v1/chain/tx/${txId}`)
}
