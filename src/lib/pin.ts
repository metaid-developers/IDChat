import { isNull } from 'meta-contract/dist/common/utils'
export function createScriptForMvc(metaidData: any) {
  const res1 = ['metaid',metaidData.operation]


  let res2 = []
  if (metaidData.operation !== 'init') {
    res2.push(metaidData.path)
    res2.push(metaidData.encryption ?? '0')
    res2.push(metaidData.version ?? '1.0.0')
    res2.push(metaidData.contentType ?? 'text/plain;utf-8')
    const body = isNull(metaidData.body)
      ? undefined
      : Buffer.isBuffer(metaidData.body)
        ? metaidData.body
        : Buffer.from(metaidData.body, metaidData?.encoding ?? 'utf-8')
    res2.push(body)
 
      // const maxChunkSize = 520
      // const bodySize = (body as Buffer).length
      // for (let i = 0; i < bodySize; i += maxChunkSize) {
      //   let end = i + maxChunkSize
      //   if (end > bodySize) {
      //     end = bodySize
      //   }
      //   res2.push((body as Buffer).subarray(i, end))
      // }
     
  }

  
  return [...res1,...res2] 

}