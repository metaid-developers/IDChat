import { useUserStore } from '@/stores/user'
import HttpRequest from '@/utils/request'
import { ApiResultTypes, BaseUserInfoParams } from '.'
import i18n from '@/utils/i18n'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

// @ts-ignore
const Core = createLazyApiClient(() => `${getRuntimeConfig().api.baseApi}/showpaycore`, {
  header: () => {
    const userStore = useUserStore()
    if (userStore.isAuthorized) {
      return {
        accessKey: userStore.user!.token,
        userName:
          userStore.user!.userType === 'email' || userStore.user?.registerType == 'email'
            ? userStore.user!.email!
            : userStore.user!.phone!,
        timestamp: () => new Date().getTime(),
      }
    } else {
      return {}
    }
  },
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response.data?.code === 'number') {
        if (response.data.code === 0 || response.data.code === 601) {
          resolve(response.data)
        } else {
          reject({
            code: response.data.code,
            message: response.data.msg,
          })
        }
      } else {
        resolve(response.data)
      }
    })
  },
})

export const UpdateUserInfo = (): Promise<apiResponse> => {
  const userStore = useUserStore()
  const params = {
    userType: userStore.user!.userType,
    phone: userStore.user!.phone ? userStore.user!.phone : undefined,
    email: userStore.user!.email ? userStore.user!.email : undefined,
  }

  return Core.post('/api/v1/user/setuserinfo', params)
}

// 获取注册验证码
export const RegisterGetCode = async (params: BaseUserInfoParams): Promise<ApiResultTypes> => {
  return Core.post('/api/v1/user/register/verification', params)
}

// 用户注册
export const RegisterCheck = async (params: {
  type: number
  userType: string
  phone?: string
  email?: string
  code: string
  name: string
  promotion?: string
}): Promise<{
  code: number
  result: {
    appToken: string
    name: string
    pk2: string
    registerType: string
    role: string
    tag: string
    token: string
  }
}> => {
  return Core.post('/api/v1/user/register/check', params)
}

// 获取图形验证码
export const GetImageCode = async (params: { characteristic: string }): Promise<ApiResultTypes> => {
  return Core.post('/api/v1/user/codeImage', params)
}

// 用户登录
export const LoginCheck = async (params: ObjTypes<any>): Promise<ApiResultTypes> => {
  return Core.post('/api/v1/user/new/login/check', params)
}

// 获取登录验证码
export const LoginGetCode = async (params: ObjTypes<any>): Promise<ApiResultTypes> => {
  return Core.post('/api/v1/user/login/verification', params)
}

export const SetUserInfo = (params: {
  userType: string
  metaid: string
  phone?: string
  email?: string
  accessKey: string
  userName?: string
}): Promise<ApiResultTypes> => {
  return Core.post('/api/v1/user/setuserinfo', params, {
    headers: {
      'Content-Type': 'application/json',
      accessKey: params.accessKey,
      timestamp: Date.now(),
      userName: params.userType ? (params.userType == 'email' ? params!.email : params!.phone) : '',
    },
  })
}

export interface BaseUserInfoParams {
  userType: string
  phone?: string
  email?: string
}

interface SetUserPasswordParams extends BaseUserInfoParams {
  address: string
  password: string
  affirmPassword: string
  enCryptedMnemonic: string
  remark: string
  type?: number
}

export const SetUserPassword = (
  params: SetUserPasswordParams,
  token: string,
  userName: string
): Promise<ApiResultTypes> => {
  return Core.post('/api/v1/user/setPassword', params, {
    headers: {
      'Content-Type': 'application/json',
      accessKey: token,
      timestamp: Date.now(),
      userName: userName,
    },
  })
}

interface SetUserWalletInfoParams extends BaseUserInfoParams {
  address: string
  pubkey: string
  xpub: string
  remark: string
  type?: number
  headers?: ObjTypes<string | number>
  path: number
}
// 提交用户钱包信息
export const SetUserWalletInfo = (params: SetUserWalletInfoParams): Promise<ApiResultTypes> => {
  return Core.post('/api/v1/wallet/setuserwalletinfo', params)
}

//绑定metaid或地址登录
export const loginByMetaidOrAddress = (params: { address?: string; metaId?: string }) => {
  return Core.post(`/api/v1/thirdparty/checkMetaidOrAddress`, params)
}

//上报hashData

export const setHashData = (params: {
  accessKey: string
  userName: string
  timestamp: number
  evmEnMnemonic: string
  chainId: string
  metaId: string
  address: string
}) => {
  return Core.post(
    `/api/v1/evm/wallet/mnemonic/info/bind`,
    {
      evmAddress: params.address,
      evmEnMnemonic: params.evmEnMnemonic,
      metaId: params.metaId,
      chainId: params.chainId,
    },
    {
      headers: {
        accessKey: params.accessKey,
        userName: params.userName,
        timestamp: params.timestamp,
      },
    }
  )
}

//获取随机word

export const GetRandomWord = (): Promise<{ code: number; data: { word: string } }> => {
  return Core.get(`/api/v1/mnemonic/getWord`)
}

//助记词登录

export const MnemoicLogin = (params: {
  xpub: string
  sign: string //publickey+word签名
  word: string
  type: number // 1.web 2.app
  path: number
}): Promise<{
  code: number
  data: BindUserInfo
  msg: string
}> => {
  return Core.post(`/api/v1/mnemonic/verification`, params)
}

//注册前获取Word

export const GetWordBeforeReg = (params: { evmAddress: string; chainId: string }) => {
  return Core.post(`/api/v1/evm/wallet/word/verify`, params)
}

//新用户登录
export const LoginByNewUser = (params: {
  word: string
  address: string
  xpub: string
  pubKey: string
  evmEnMnemonic: string
  evmAddress: string
  chainId: string
  userName: string
  path: number | string
}) => {
  return Core.post(`/api/v1/evm/wallet/mnemonic/info/add`, params)
}

//已绑定签名
// export const LoginByHashData = (params: {
//   hashData: string
// }): Promise<{
//   code: number
//   data: {
//     menmonic: string
//     metaId: string
//     registerSource: string
//   }
// }> => {
//   return Core.post(`/api/v1/thirdparty/checkHashData`, params)
// }

//通过ETH地址查询是否已绑定metaid

export const LoginByEthAddress = (params: {
  evmAddress: string
  chainId: string
}): Promise<{
  code: number
  data: {
    evmEnMnemonic: string
    metaId: string
    path: number
    registerSource: string
    registerTime: number
  }
}> => {
  return Core.post(`/api/v1/evm/wallet/mnemonic/check`, params)
}

//用户账户升级计划
export const evmLoginAccountUpdate = (params: {
  accessKey: string
  userName: string
  timestamp: number
  metaId: string
  address: string
  evmAddress: string
  evmEnMnemonic: string
  chainId: string
}): Promise<{
  code: number
  msg: string
}> => {
  return Core.post(
    `/api/v1/evm/wallet/mnemonic/info/upgrade`,
    {
      metaId: params.metaId,
      address: params.address,
      evmAddress: params.evmAddress,
      evmEnMnemonic: params.evmEnMnemonic,
      chainId: params.chainId,
    },
    {
      headers: {
        accessKey: params.accessKey,
        userName: params.userName,
        timestamp: params.timestamp,
      },
    }
  )
}

export const GetMetaIdByLoginName = (params: {
  userType: 'phone' | 'emial'
  phone?: string
  email?: string
  evmAddress?: string
  chainId?: string
}): Promise<{ code: number; result: { metaId: string; path: number; enMnemonic: string } }> => {
  return Core.post(`/api/v1/evm/wallet/user/info`, params)
}

export const Translate = (params: {
  query: string
  to: string
}): Promise<{ code: number; result: { transResult: string } }> => {
  return Core.post(`/api/v1/i18n/translate`, params)
}

export const BindPhoneOrEmail = (params: {
  code: string
  email: string
  phone: string
  userType: string
}) => {
  return Core.post(`/api/v1/user/bindPhoneOrEmail`, params)
}
