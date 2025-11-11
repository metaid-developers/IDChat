import { DAOStakeReqstakeArgs, DAOUserStakeInfo, ProposalItem, VoterItem } from '@/@types/api/dao'
import HttpRequest from '@/utils/request'
import { DAOStakeOperate } from '@/enum'
import pako from 'pako'
import { gzip } from 'node-gzip'
import { changeSymbol } from '@/utils/util'
import Decimal from 'decimal.js-light'
import { getRuntimeConfig } from '@/config/runtime-config'
import { createLazyApiClient } from '@/utils/api-factory'

const DAO = createLazyApiClient(() => getRuntimeConfig().api.daoApi, {
  responseHandel: response => {
    return new Promise((resolve, reject) => {
      if (response?.data && typeof response.data?.code === 'number') {
        if (response.data.code === 0) {
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

export function Proposals(params: { symbol: string; offset: number; limit: number }) {
  return new Promise<ProposalItem[]>(async (resolve, reject) => {
    params.symbol = changeSymbol(params.symbol)
    const res: any = await DAO.get(`/manyvoteinfo`, {
      params,
    }).catch(error => reject(error))
    if (res.code === 0) {
      resolve(res.data)
    }
  })
}

export function Proposal(params: { symbol: string; voteID: string }) {
  params.symbol = changeSymbol(params.symbol)
  return new Promise<ProposalItem>(async (resolve, reject) => {
    const res: any = await DAO.get(`/onevoteinfo`, {
      params,
    }).catch(error => reject(error))
    if (res.code === 0) {
      resolve(res.data)
    }
  })
}

export const Vote = async (params: {
  symbol: string
  requestIndex: string
  mvcRawTx: string
  mvcOutputIndex: number
  voteID: string
  voteOption: number
  confirmVote: boolean
}): Promise<{
  code: number
  data: {
    txHex: string
    scriptHex: string
    satoshis: string
    inputIndex: 0
  }
  msg: string
}> => {
  params.symbol = changeSymbol(params.symbol)
  const compressData = await gzip(JSON.stringify(params))
  return DAO.post('/vote', { data: compressData })
}

export const Vote2 = async (params: {
  symbol: string
  requestIndex: string
  pubKey: string
  sig: string
}): Promise<{
  code: number
  data: {
    txid: string
    blockTime: number
  }
  msg: string
}> => {
  params.symbol = changeSymbol(params.symbol)
  return DAO.post('/vote2', params)
}

export function Voters(params: { symbol: string; voteID: string; offset: number; limit: number }) {
  return new Promise<VoterItem[]>(async (resolve, reject) => {
    params.symbol = changeSymbol(params.symbol)
    const res: any = await DAO.get(`/voters`, {
      params,
    }).catch(error => reject(error))
    if (res.code === 0) {
      resolve(res.data)
    }
  })
}

export const GetStake = async (params: {
  symbol: string
  address: string
  op: DAOStakeOperate
}): Promise<{ code: number; data: DAOStakeReqstakeArgs; msg: string }> => {
  params.symbol = changeSymbol(params.symbol)

  return DAO.post('/reqstakeargs', params)
}

export const CreateVote = async (params: {
  symbol: string
  requestIndex: string
  mvcRawTx: string
  mvcOutputIndex: number
  title: string
  desc: string
  options: string[]
  minVoteAmount: string
  beginBlockTime: number
  endBlockTime: number
}): Promise<{ code: number; data: { txid: string; voteID: string }; msg: string }> => {
  // return DAO.post('/createvote', params)
  params.symbol = changeSymbol(params.symbol)
  const compressData = await gzip(JSON.stringify(params))
  return DAO.post(
    '/createvote',
    { data: compressData },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

export const GetUserStakeInfo = async (params: {
  symbol: string
  address: string
}): Promise<{ code: number; data: DAOUserStakeInfo; msg: string }> => {
  params.symbol = changeSymbol(params.symbol)
  return DAO.get('/userinfo', { params })
}

export const GetOwnerStakeInfo = async (params: {
  symbol: string
  address: string
}): Promise<number> => {
  params.symbol = changeSymbol(params.symbol)
  const res = await DAO.get('/userinfo', { params })
  if (res?.code == 0) {
    return new Decimal(res.data.lockedTokenAmount).toNumber()
  } else {
    return 0
  }
}

export const GetBlockTime = async (): Promise<{ code: number; data: number }> => {
  return DAO.get('/blocktime')
}

export const Unlock = async (params: {
  symbol: string
  requestIndex: string
  tokenRemoveAmount: string
  mvcRawTx: string
  mvcOutputIndex: number
}): Promise<{
  code: number
  data: {
    txHex: string
    scriptHex: string
    satoshis: string
    inputIndex: number
  }
  msg: string
}> => {
  params.symbol = changeSymbol(params.symbol)
  const compressData = await gzip(JSON.stringify(params))
  return DAO.post('/unlock', { data: compressData })
}

export const Unlock2 = async (params: {
  symbol: string
  requestIndex: string
  pubKey: string
  sig: string
}): Promise<{
  code: number
  data: {
    txid: string
    blockTime: number
  }
  msg: string
}> => {
  params.symbol = changeSymbol(params.symbol)
  return DAO.post('/unlock2', params)
}

export const Pledge = async (params: {
  symbol: string
  requestIndex: string
  mvcRawTx: string
  mvcOutputIndex: number
  mvcAddAmount: number
}): Promise<{
  code: number
  data: {
    txid: string
    blockTime: number
  }
  msg: string
}> => {
  params.symbol = changeSymbol(params.symbol)
  const compressData = await gzip(JSON.stringify(params))
  return DAO.post(
    '/deposit',
    { data: compressData },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  )
}

export const Withdraw = async (params: {
  symbol: string
  requestIndex: string
  mvcRawTx: string
  mvcOutputIndex: number
}): Promise<{
  code: number
  data: {
    txHex: string
    scriptHex: string
    satoshis: string
    inputIndex: number
  }
  msg: string
}> => {
  params.symbol = changeSymbol(params.symbol)
  const compressData = await gzip(JSON.stringify(params))
  return DAO.post('/withdraw', { data: compressData })
}

export const Withdraw2 = async (params: {
  symbol: string
  requestIndex: string
  pubKey: string
  sig: string
}): Promise<{
  code: number
  data: {
    txid: string
    blockTime: number
  }
  msg: string
}> => {
  params.symbol = changeSymbol(params.symbol)
  return DAO.post('/withdraw2', params)
}
