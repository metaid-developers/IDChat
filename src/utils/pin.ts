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
    }
  })

  const request: InscriptionRequest = {
    // commitTxPrevOutputList,
    feeRate: options?.feeRate ?? 1,
    revealOutValue: 546,
    metaidDataList,
    changeAddress: address,
    service: options?.service,
    outputs: options?.outputs,
  }
  const res = await window.metaidwallet.btc.inscribe({
    data: request,
    options: {
      noBroadcast: options?.noBroadcast !== 'no',
    },
  })
  console.log('inscrible res', res)
  return res
}
