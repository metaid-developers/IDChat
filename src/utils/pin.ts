import { ChatChain } from '@/enum'
import { useChainStore } from '@/stores/chain'
import { createPin } from './userInfo'

export interface InscribeResultForYesBroadcast {
  commitTxId: string
  revealTxIds: string[]
  commitCost: string
  revealCost: string
  status?: string
}
export interface InscribeResultForNoBroadcast {
  commitTxHex: string
  revealTxsHex: string[]
  commitCost: string
  revealCost: string
  status?: string
}
export interface InscribeResultForIfBroadcasting {
  no: InscribeResultForYesBroadcast
  yes: InscribeResultForNoBroadcast
}
export type Operation = 'init' | 'create' | 'modify' | 'revoke'
export type Encryption = '0' | '1' | '2'
export type MetaidData = {
  operation?: Operation
  body?: string | Buffer
  path?: string
  contentType?: string
  encryption?: '0' | '1' | '2'
  version?: string
  encoding?: BufferEncoding
  revealAddr?: string
  flag?: 'metaid'
  outputs?: {
    address: string
    value: number
  }[]
}
export type InscribeData = Omit<MetaidData, 'revealAddr'>
export type InscriptionRequest = {
  // commitTxPrevOutputList: PrevOutput[]
  feeRate: number
  metaidDataList: MetaidData[]
  revealOutValue: number
  changeAddress: string
  minChangeValue?: number
  service?: {
    address: string
    satoshis: string
  }
  outputs?: {
    address: string
    satoshis: string
  }[]
}

export function getEffectiveBTCFeerate(feeRate: number): number {
  return feeRate === 1 ? 1.1 : feeRate
}
export async function createPinWithBtc<T extends keyof InscribeResultForIfBroadcasting>({
  inscribeDataArray,
  options,
}: {
  inscribeDataArray: InscribeData[]
  options: {
    noBroadcast: T
    feeRate?: number
    network?: 'mainnet' | 'testnet' | 'regtest'
    service?: {
      address: string
      satoshis: string
    }
    outputs?: {
      address: string
      satoshis: string
    }[]
  }
}): Promise<InscribeResultForIfBroadcasting[T]> {
  const address = await window.metaidwallet.btc.getAddress()

  const metaidDataList: MetaidData[] = inscribeDataArray.map(inp => {
    const contentType = inp?.contentType ?? 'text/plain'
    const encoding = inp?.encoding ?? 'utf-8'
    return {
      operation: inp.operation,
      revealAddr: address,
      body: inp?.body,
      path: inp?.path,
      contentType: contentType,
      encryption: inp?.encryption,
      flag: inp?.flag,
      version: '1.0.0',
      encoding,
      outputs: inp.outputs || [],
    }
  })

  const request: InscriptionRequest = {
    // commitTxPrevOutputList,
    feeRate: getEffectiveBTCFeerate(options?.feeRate ?? 1),
    revealOutValue: 546,
    metaidDataList,
    changeAddress: address,
    service: options?.service,
    outputs: options?.outputs,
  }

  const data = {
    data: request,
    options: {
      noBroadcast: options?.noBroadcast !== 'no',
    },
  }

  console.log('data', JSON.stringify(data))

  const res = await window.metaidwallet.btc.inscribe({
    data: request,
    options: {
      noBroadcast: options?.noBroadcast !== 'no',
    },
  })

  console.log('inscrible res', res)

  return res
}

export async function createPinWithDoge<T extends keyof InscribeResultForIfBroadcasting>({
  inscribeDataArray,
  options,
}: {
  inscribeDataArray: InscribeData[]
  options: {
    noBroadcast: T
    feeRate?: number
    network?: 'mainnet' | 'testnet' | 'regtest'
    service?: {
      address: string
      satoshis: string
    }
    outputs?: {
      address: string
      satoshis: string
    }[]
  }
}): Promise<InscribeResultForIfBroadcasting[T]> {
  const address = await window.metaidwallet.doge.getAddress()

  const metaidDataList: MetaidData[] = inscribeDataArray.map(inp => {
    const contentType = inp?.contentType ?? 'text/plain'
    const encoding = inp?.encoding ?? 'utf-8'
    return {
      operation: inp.operation,
      revealAddr: address,
      body: inp?.body,
      path: inp?.path,
      contentType: contentType,
      encryption: inp?.encryption,
      flag: inp?.flag,
      version: '1.0.0',
      encoding,
      outputs: inp.outputs || [],
    }
  })

  const request: InscriptionRequest = {
    feeRate: options?.feeRate ?? 200000, // Doge 默认费率
    revealOutValue: 100000, // Doge 最小输出值（1 DOGE = 100000000 satoshis）
    metaidDataList,
    changeAddress: address,
    service: options?.service,
    outputs: options?.outputs,
  }

  const data = {
    data: request,
    options: {
      noBroadcast: options?.noBroadcast !== 'no',
    },
  }

  console.log('doge inscribe data', JSON.stringify(data))
  debugger
  const res = await window.metaidwallet.doge.inscribe({
    data: request,
    options: {
      noBroadcast: options?.noBroadcast !== 'no',
    },
  })

  console.log('doge inscribe res', res)

  return res
}

export async function createSinglePin(metaidData: InscribeData) {
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
    if (txIDs.status) {
      throw new Error(txIDs.status)
    }
    return {
      status: 'success',
      txIDs,
    }
  } else if (currentChain === ChatChain.doge) {
    const txIDs = await createPinWithDoge({
      inscribeDataArray: [metaidData],
      options: {
        network: 'mainnet',
        noBroadcast: 'no',
        feeRate: feeRate,
      },
    })
    if (txIDs.status) {
      throw new Error(txIDs.status)
    }
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
