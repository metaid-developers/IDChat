import imageCompression from 'browser-image-compression'
import CryptoJs from 'crypto-js'
const CryptoJS = CryptoJs
import encHex from 'crypto-js/enc-hex'

export enum IsEncrypt {
  Yes = 1,
  No = 0,
}
export async function compressImage(image: File) {
  const options = {
    maxSizeMB: 0.3,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
  }
  const compressedFile = await imageCompression(image, options)
  return compressedFile
}

export interface AttachmentItem {
  fileName: string
  fileType: string
  data: string
  encrypt: IsEncrypt
  sha256: string
  size: number
  url: string
}

export function FileToAttachmentItem(file: File, encrypt: IsEncrypt = IsEncrypt.No) {
  return new Promise<AttachmentItem>(async resolve => {
    function readResult(blob: Blob) {
      return new Promise<void>(resolve => {
        const reader = new FileReader()
        reader.onload = () => {
          // @ts-ignore
          const wordArray = CryptoJs.lib.WordArray.create(reader.result)
          // @ts-ignore
          const buffer = Buffer.from(reader.result)
          // console.log("buffer", buffer, reader.result);
          hex += buffer.toString('hex') // 更新hex
          // 增量更新计算结果
          sha256Algo.update(wordArray) // 更新hash
          resolve()
        }
        reader.readAsArrayBuffer(blob)
      })
    }
    // 分块读取，防止内存溢出，这里设置为20MB,可以根据实际情况进行配置
    const chunkSize = 20 * 1024 * 1024

    let hex = '' // 二进制
    const sha256Algo = CryptoJs.algo.SHA256.create()

    for (let index = 0; index < file.size; index += chunkSize) {
      await readResult(file.slice(index, index + chunkSize))
    }
    resolve({
      data: hex,
      fileName: file.name,
      fileType: file.type,
      sha256: encHex.stringify(sha256Algo.finalize()),
      url: URL.createObjectURL(file),
      encrypt,
      size: file.size,
    })
  })
}
export const image2Attach = async (images: FileList) => {
  const attachments: AttachmentItem[] = []

  for (let i = 0; i < images.length; i++) {
    // 压缩图片
    const current = images[i]

    const compressed = await compressImage(current)
    const result = await FileToAttachmentItem(current.type === 'image/gif' ? current : compressed)
    if (result) attachments.push(result)

    // if (attachments.length <= 3) {
    // } else {
    // 	break;
    // }
  }
  return attachments
}
