import { enc, AES, mode, pad, MD5, SHA256 } from 'crypto-js'
import crypto from 'crypto'
import { HDPrivateKey, Script } from 'meta-contract/dist/mvc'
import { CryptoInfo } from '@/@types/talk'
import * as cryptojs from 'crypto-js'
const Utf8 = enc.Utf8
const iv = Utf8.parse('0000000000000000')

export function decrypt(message: string, secretKeyStr: string): string {
  const secretKey = Utf8.parse(secretKeyStr)

  try {
    const messageBuffer = Buffer.from(message, 'hex')
    const messageBase64 = messageBuffer.toString('base64')

    const messageBytes = AES.decrypt(messageBase64, secretKey, {
      iv,
      mode: mode.CBC,
      padding: pad.Pkcs7,
    })

    return messageBytes.toString(Utf8)
  } catch {
    return message
  }
}

export function encrypt(message: string, secretKeyStr: string): string {
  const messageWordArray = Utf8.parse(message)
  const secretKey = Utf8.parse(secretKeyStr)

  const encrypted = AES.encrypt(messageWordArray, secretKey, {
    iv,
    mode: mode.CBC,
    padding: pad.Pkcs7,
  })
  const _encryptedBuf = Buffer.from(encrypted.toString(), 'base64')

  return _encryptedBuf.toString('hex')
}

export function aesEncrypt(message: string, secretKeyStr: string) {
  // 密码长度不足 16/32 位用 0 补够位数
  const paddedKey =
    secretKeyStr.length > 16 ? secretKeyStr.padEnd(32, '0') : secretKeyStr.padEnd(16, '0')
  const iv = '0000000000000000',
    utf8Str = Utf8.parse(message),
    utf8Key = Utf8.parse(paddedKey),
    utf8Iv = Utf8.parse(iv)

  return AES.encrypt(utf8Str, utf8Key, {
    iv: utf8Iv,
    mode: mode.CBC,
    padding: pad.Pkcs7,
  }).toString()
}

// export function ecdhDecrypt(message: string, privateKeyStr: string, publicKeyStr: string): string {
//
//   const secretKey = _createEcdhSecret(privateKeyStr, publicKeyStr)
//   console.log("secretKey0",secretKey)
//
//   const messageBytes = AES.decrypt(message, secretKey)

//   return messageBytes.toString(enc.Utf8)
// }





export function ecdhDecryptForPrivateImg(message: string, secretKey: string): string {
  try {
    // 将hex字符串转换为WordArray
    const messageWordArray = enc.Hex.parse(message)
    const secretKeyWordArray = enc.Hex.parse(secretKey)

    // 使用CipherParams创建正确的解密参数
    const cipherParams = {
      ciphertext: messageWordArray,
    } as any

    const messageBytes = AES.decrypt(cipherParams, secretKeyWordArray, {
      mode: mode.CBC,
      padding: pad.Pkcs7,
      iv: iv,
    })

    return messageBytes.toString(enc.Hex)
  } catch (error) {
    console.error('ECDH解密失败:', error)
    return ''
  }
}

export function decryptToBlob(
  encryptedData: ArrayBuffer | Uint8Array,
  secretKey: string,
  
): Blob | null {
  try {
    // 将ArrayBuffer或Uint8Array转换为hex字符串
    const uint8Array =
      encryptedData instanceof Uint8Array ? encryptedData : new Uint8Array(encryptedData)
    const hexString = Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('')
    
    const result = ecdhDecryptForPrivateImg(hexString, secretKey)

    if (!result) {
      console.error('解密失败，返回空结果')
      return null
    }

    // 解密后的数据应该是原始图片的hex格式
    // 直接转换为Blob
    return hexStringToBlob(result)
  } catch (error) {
    console.error('转换为 Blob 失败:', error)
    return null
  }
}

// 十六进制字符串转 Blob
export function hexStringToBlob(
  hexString: string,
  mimeType: string = 'application/octet-stream'
): Blob {
  const byteArray = new Uint8Array(hexString.length / 2)

  for (let i = 0; i < hexString.length; i += 2) {
    byteArray[i / 2] = parseInt(hexString.substr(i, 2), 16)
  }

  return new Blob([byteArray], { type: mimeType })
}

// Base64 字符串转 Blob
export function base64ToBlob(base64String: string, mimeType: string = 'image/jpeg'): Blob {
  // 移除可能的 Data URL 前缀
  const base64Data = base64String.replace(/^data:.*?;base64,/, '')

  const byteCharacters = atob(base64Data)
  const byteArrays = []

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512)
    const byteNumbers = new Array(slice.length)

    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i)
    }

    const byteArray = new Uint8Array(byteNumbers)
    byteArrays.push(byteArray)
  }

  return new Blob(byteArrays, { type: mimeType })
}

// 普通文本转 Blob
export function textToBlob(text: string, mimeType: string = 'text/plain'): Blob {
  return new Blob([text], { type: mimeType })
}

// 直接使用 Uint8Array 创建 Blob
export function uint8ArrayToBlob(
  data: Uint8Array,
  mimeType: string = 'application/octet-stream'
): Blob {
  return new Blob([data], { type: mimeType })
}

// 判断是否是十六进制字符串
function isLikelyHexString(str: string): boolean {
  return /^[0-9a-fA-F]+$/.test(str) && str.length % 2 === 0
}

// 判断是否是 Base64 字符串
function isLikelyBase64(str: string): boolean {
  return /^[A-Za-z0-9+/]*={0,2}$/.test(str) && str.length % 4 === 0
}



export function ecdhEncrypt(message: string, secretKey: string): string {


  return AES.encrypt(message, secretKey).toString()

}

export function ecdhDecrypt(message: string, secretKey: string): string {

 try {

   const messageBytes = AES.decrypt(message, secretKey)
    
    return messageBytes.toString(enc.Utf8) 
  
 } catch (error) {
  return ''
 }
}



export function ecdhEncryptForPrivateImg(message: string, secretKey: string): string {
  // 将hex字符串转换为WordArray
  
  const messageWordArray = enc.Hex.parse(message)
  const secretKeyWordArray = enc.Hex.parse(secretKey)

  const encrypted = AES.encrypt(messageWordArray, secretKeyWordArray, {
    mode: mode.CBC,
    padding: pad.Pkcs7,
    iv: iv,
  })

  // 返回hex格式的加密数据
  return encrypted.ciphertext.toString(enc.Hex)
}

export function MD5Hash(message: string): string {
  return MD5(Utf8.parse(message)).toString()
}

export function generateSeed(key: string): string {
  return SHA256(key).toString()
}

export function buildCryptoInfo(key: string, net: string): CryptoInfo {
  const seed = generateSeed(key)

  const hdPrivateKey = HDPrivateKey.fromSeed(seed, net as string)
  const privateKey = hdPrivateKey.deriveChild('m/0/0').privateKey
  const publicKey = hdPrivateKey.deriveChild('m/0/0').publicKey
  const address = publicKey.toAddress(net)
  const wif = hdPrivateKey.deriveChild('m/0/0').privateKey.toWIF()
  const addressStr = address.toString()
  const script = Script.fromAddress(address)
  const scriptStr = script.toHex()
  const xpub = hdPrivateKey.xpubkey.toString()

  return {
    hdPrivateKey,
    privateKey,
    publicKey,
    address,
    addressStr,
    wif,
    script,
    scriptStr,
    xpub,
  }
}

function _createEcdhSecret(privateKeyStr: string, publicKeyStr: string): string {
  // const ECDH = crypto.createECDH('secp256k1')
  // ECDH.setPrivateKey(privateKeyStr, 'hex')

  // return ECDH.computeSecret(publicKeyStr, 'hex', 'hex')
  const ECDH = crypto.createECDH('secp256k1')
  ECDH.setPrivateKey(privateKeyStr, 'hex')

  return ECDH.computeSecret(publicKeyStr, 'hex', 'hex')
}
