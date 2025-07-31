// import { getToken, getUserName } from '@/stores/user'
import HttpRequest from '@/utils/request'

// const Pay = new HttpRequest(`${import.meta.env.VITE_WXCOREAPI}/showpaycore`, {
// @ts-ignore
const Pay = new HttpRequest(import.meta.env.VITE_Cloud_Pay_Api, {
  header: {
    // accessKey: () => getToken(),
    // userName: () => getUserName(),
    timestamp: () => new Date().getTime(),
  },
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if (!response.data.success && response.data.message) {
        let message = response.data.message
        if (typeof message === 'string') {
          try {
            const res = JSON.parse(message)
            if (res && res.responseMsg) {
              message = res.responseMsg
            }
          } catch (error) {}
        }
        // eslint-disable-next-line prefer-promise-reject-errors
        reject({
          message: message,
          data: response.data.data,
        })
      } else {
        resolve(response.data)
      }
    })
  },
}).request

export const CreateAccount = (params: {
  address: string
  bizUserNo: string
  nickName: string
  name: string
  idType: string
  idNo: string
  mobile: string
  frontUrl: string
  bankInfo: {
    cardNo: string
  }
}): Promise<CreateAccountRes> => {
  const { address, ..._params } = params
  return Pay.post(`/v1/api/ceas/${address}/bindCardAndOpenAccount`, _params)
}

export const BindCard = (params: {
  bizUserNo: string // 杉德系统中该商户下用户唯一编号
  cardNo: string // 卡号
  bankMobile: string // 银行预留手机号
  relatedCardType: string // 绑卡类型  01：提现卡（默认）  02:快捷充值+提现卡
}): Promise<BindCardRes> => {
  return Pay.post(`/v1/api/ceas/${params.bizUserNo}/bindCard`, params)
}

export const BindCardConfirm = (params: {
  oriCustomerOrderNo: string // 原绑卡订单号
  smsCode: string // 短信验证码
  address: string
}): Promise<PayApi> => {
  const { address, ..._params } = params
  return Pay.post(`/v1/api/ceas/${address}/bindCardConfirm`, _params)
}

export const UnBindCard = (params: { relatedCardNo: string; address: string }): Promise<PayApi> => {
  return Pay.post(`/v1/api/ceas/${params.address}/unBindCard`, {
    relatedCardNo: params.relatedCardNo,
  })
}

export const GetWalletStatus = (address: string): Promise<GetWalletStatusRes> => {
  return Pay.get(`/v1/api/ceas/${address}/memberStatus`)
}

export const Inactivation = (params: {
  address: string
  frontUrl: string
}): Promise<CreateAccountRes> => {
  return Pay.post(`/v1/api/ceas/${params.address}/reActivationAccount`, {
    frontUrl: params.frontUrl,
  })
}

export const GetWalletBalance = (params: {
  bizUserNo: string
  accountType: string
}): Promise<GetWalletBalanceRes> => {
  return Pay.post(`/v1/api/ceas/${params.bizUserNo}/accountBalanceQuery`, params)
}

export const GetBankCards = (params: {
  address: string
  relatedCardNo?: string
}): Promise<GetBankCardsRes> => {
  return Pay.post(
    `/v1/api/ceas/${params.address}/bindCardQuery`,
    params.relatedCardNo ? { relatedCardNo: params.relatedCardNo } : {}
  )
}

export const Recharge = (params: {
  walletAmt: string // 充值金额
  bizUserNo: string
  frontUrl: string // 前台跳转地址,充值完成后前台页面跳转的地址
  marketingId: string
  remark: string // 业务备注信息
}): Promise<RechargeRes> => {
  return Pay.post(`/v1/api/ceas/${params.bizUserNo}/quickDepositApply`, params)
}

export const GetWalletOrderStatus = (params: {
  bizUserNo: string // address
  oriCustomerOrderNo: string // 订单号码
}): Promise<GetWalletOrderStatusRes> => {
  return Pay.post(`/v1/api/ceas/${params.bizUserNo}/orderQuery`, params)
}

export const GetWalletRecords = (params: {
  accountType: '01' // 01：支付电子户 02：权益账户 03：奖励金户
  beginDate: string // 起始日期至结束日期最大不超过7日
  endDate: string // 起始日期至结束日期最大不超过7日
  IoFlag: '00' // 00：全部（默认）  01: 出金  02：入金
  pageNo: string //  必须从1开始
  pageSize: string
  address: string
}): Promise<GetWalletRecordsRes> => {
  return Pay.post(`/v1/api/ceas/${params.address}/accountChangeDetails`, params)
}

export const PayOrderConfirm = (params: {
  oriCustomerOrderNo: string
  oriTotalAmount: string
  smsCode: string
  address: string
}): Promise<GetWalletRecordsRes> => {
  const { address, ..._params } = params
  return Pay.post(`/v1/api/pay/${address}/payOrderConfirm`, _params)
}

export const GetOrderAmout = (params: {
  address: string
  oriCustomerOrderNo: string
}): Promise<GetOrderAmoutRes> => {
  const { address, ..._params } = params
  return Pay.post(`/v1/api/ceas/${address}/orderAmontQuery`, _params)
}

export const Withdraw = (params: {
  accountType: '01' | '02' // 01：支付电子户         02：宝易付权益电子户
  orderAmt: string // 订单金额 单位元
  relatedCardNo: string // 收款关联卡编号
  frontUrl: string // 前台跳转地址 当鉴权方式为02：支付密码        04：支付密码+短信时     请通过该地址返回商户页面
  postscript: string // 附言
  remark: string // 业务备注信息
  address: string
}): Promise<WithdrawRes> => {
  const { address, ..._params } = params
  return Pay.post(`/v1/api/ceas/${address}/accountWithdrawApply`, _params)
}

export const TransOrderConfirm = (params: {
  oriOrderAmt: string
  oriCustomerOrderNo: string
  smsCode: string
  address: string
}): Promise<TransOrderConfirmRes> => {
  const { address, ..._params } = params
  return Pay.post(`/v1/api/ceas/${address}/transOrderConfirm`, _params)
}
