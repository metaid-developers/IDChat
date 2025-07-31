import { InviteActivityTag } from '@/enum'
// import { getToken, getUserName } from '@/stores/user'
import HttpRequest from '@/utils/request'

// @ts-ignore
const Broad = new HttpRequest(`${import.meta.env.VITE_BASEAPI}/broad`, {
  header: {
    // accessKey: () => getToken(),
    // userName: () => getUserName(),
    timestamp: () => new Date().getTime(),
  },
  errorHandel: (error: any) => {
    if (error.response && error.response.data && error.response.data.data !== '') {
      return Promise.reject(Error(error.response.data.data))
    } else {
      // 对响应错误做点什么
      return Promise.reject(error)
    }
  },
}).request

// 获取团队热力榜累计金额
export const GetPrizePool = (params: { activityId: string | number }): Promise<any> => {
  const { activityId, ..._params } = params
  return Broad.get(`/v1/activity/${activityId}/team/prize/pool`, { params: _params })
}
// 获取团队热力榜队伍排名
export const GetTeamRankings = (params: {
  activityId: string | number
  page: number
  teamId?: string
  metaId?: string
  isDetail?: boolean
  pageSize?: number
}): Promise<GetTeamRankingsRes> => {
  const { activityId, ..._params } = params
  return Broad.get(`/v1/activity/${activityId}/team/leaderBoard`, { params: _params })
}
// 获取我参与的队伍信息
export const GetMyTeams = (params: {
  activityId: string | number
  metaId: string
  isDetail?: boolean
}): Promise<GetMyTeamsRes> => {
  const { activityId, metaId, ..._params } = params
  return Broad.get(`/v1/activity/${activityId}/team/user/${metaId}/list`, {
    params: _params,
  })
}

// 获取团队热力榜队内排名
export const GetTeamMembers = (params: {
  activityId: string | number
  teamId: string
  isDetail?: boolean
  page?: number
  pageSize?: number
}): Promise<GetTeamMembersRes> => {
  const { activityId, teamId, ..._params } = params
  return Broad.get(`/v1/activity/${activityId}/team/${teamId}/info`, { params: _params })
}

//  获取参与人数
export const GetInvitateCount = (params: {
  activityId: string | number
  metaId?: string
}): Promise<GetInvitateCountRes> => {
  const { activityId, ..._params } = params
  return Broad.get(`/v1/activity/${activityId}/total`, { params: _params })
}

//  提交参与活动
export const CommitActivity = (params: {
  actionIndex: number
  activityId: number
  address: string
  metaId?: string
  publicKey?: string
  refererMetaId: string
  tag: InviteActivityTag // 1:分享微信 2:分享朋友圈 3：复制URL 4：分享图片 5：注册完成 6 kyc完成
}) => {
  return Broad.post('/v1/activity/commit/info', params)
}

// 获取我推荐的人
export const GetMyInvitations = (params: {
  metaId: string
  activityId: number | string
  page: number
  pageSize: number
}): Promise<GetMyInvitationsRes> => {
  const { metaId, activityId, ..._params } = params
  return Broad.get(`/v1/activity/${activityId}/user/${metaId}`, { params: _params })
}

// 获取邀请排行榜
export const GetActivityInviteRank = (params: {
  activityId: number | string
  page: number
  page_size: number
}): Promise<GetMyInvitationsRes> => {
  const { activityId, ..._params } = params
  return Broad.get(`/v1/activity/${activityId}/leaderBoard`, { params: _params })
}

export const GetUserPriority = (params: { metaId: string }): Promise<GetUserDateByActivityRes> => {
  return Broad.get(`/v1/nft/market/priority/user/${params.metaId}/2`)
}

export const GetUserHoldNFT = (address: string): Promise<GetUserDateByActivityRes> => {
  return Broad.get(`/v1/nft/user/address/${address}`)
}

export const GetDisCount = (address: string): Promise<GetDisCountRes> => {
  return Broad.get('/v1/nft/market/feeinfo/discount', { params: { address } })
}

export const GetCollectRecords = (params: {
  tag: string
  pageSize: number
  timestamp: number
}): Promise<GetCollectRecords> => {
  return Broad.post('/v1/nft/market/album/record/order', params)
}

export const GetFeeInfo = (params: {
  codehash: string | string[]
  genesis: string | string[]
  address?: string
  ignoreIndex?: number
}): Promise<GerFeeInfoRes> => {
  // 冬奥nft 费率固定 3 3
  const { codehash, genesis, ..._params } = params
  return Broad.get(`/v1/nft/market/feeinfo/${codehash}/${genesis}`, {
    params: _params,
  })
}

export const GetGenesisStatistics = (topicType: string): Promise<GetGenesisVolumeInfoRes> => {
  return Broad.get(`/v1/nos/count/volume/info`, {
    params: {
      day: 7,
      key: topicType,
    },
  })
}
