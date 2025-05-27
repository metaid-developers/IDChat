import { GetMetaNameResolver } from '@/api/aggregation'
import { getOneNft } from '@/api/metasv-proxy'
import sha256 from 'crypto-js/sha256'

const metaNameRegex = /[\s\S]+[.][a-zA-Z0-9_-]+/

export function isMetaName(name: string) {
  return metaNameRegex.test(name)
}

export async function getMetaNameAddress(metaNameNft: string): Promise<{ address: string }> {
  // 去掉开头的协议名，如：metaid://
  const [codehash, genesis, tokenIndex] = metaNameNft.split('://')[1]?.split('/')
  if (!codehash || !genesis || !tokenIndex) {
    return { address: '' }
  }

  // 查询nft地址
  const nftInfo = await getOneNft({ codehash, genesis, tokenIndex })
  
  const address = nftInfo?.address

  return { address: address || '' }
}

export async function resolveMetaName(metaName: string) {
  // 带.meta后缀的常规名，则先裁掉后缀；否则直接解析
  const metaidSuffix = '.metaid'
  const isMetaIdSolution = metaName.endsWith(metaidSuffix)
  let metaNameWithoutSuffix = isMetaIdSolution
    ? metaName.slice(0, metaName.length - metaidSuffix.length)
    : metaName

  // 转为小写（白名单的除外）
  const whiteList = [
    'YOU',
    'Soul',
    'MetaID',
    'MVC',
    'Show3',
    'TEST_MVC_COMMUNITY',
    'AVATAR2',
    'MAN',
    'One World One Community',
    'MetaId Test',
    'OurTesting',
    'LOVE',
    'onlyyou',
    '666666',
    '可乐记得加冰',
  ]
  const inWhiteList = whiteList.includes(metaNameWithoutSuffix)
  if (!inWhiteList) {
    metaNameWithoutSuffix = metaNameWithoutSuffix.toLowerCase()
  }

  // 解析metaName：sha256一次
  // 查看本地是否有缓存
  // const metaNameLookup = localStorage.getItem('metaNameLookup') || '{}'
  // let metaNameLookupObj = JSON.parse(metaNameLookup)
  // if (metaNameLookupObj[metaNameWithoutSuffix]) {
  //   const communityId = metaNameLookupObj[metaNameWithoutSuffix]
  //   return {
  //     communityId,
  //     metaName,
  //   }
  // }

  // 本地没有缓存，则计算sha256
  let communityId
  
  if (inWhiteList || !isMetaIdSolution) {
    communityId = sha256(metaNameWithoutSuffix).toString()
  } else {
    communityId = await GetMetaNameResolver({ name: metaNameWithoutSuffix })
      .then((res: any) => {
        let communityId = res.data.communityId
        
        if (!communityId) {
          console.log('metaname接口无社区id，尝试本地解析')
          communityId = sha256(metaNameWithoutSuffix).toString()
        }
        return communityId
      })

      .catch((err: any) => {
        console.log('metaname接口无法解析，尝试本地解析')
        communityId = sha256(metaNameWithoutSuffix).toString()
        console.log('本地解析结果：', communityId)
        
        return communityId
      })
  }

  // 缓存到本地
  // metaNameLookupObj[metaNameWithoutSuffix] = communityId
  // localStorage.setItem('metaNameLookup', JSON.stringify(metaNameLookupObj))

  return {
    communityId,
    metaName,
  }
}
