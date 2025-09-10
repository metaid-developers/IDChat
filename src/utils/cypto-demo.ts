
import { enc, AES, mode, pad, MD5, SHA256 } from 'crypto-js'

const Utf8 = enc.Utf8
const iv = Utf8.parse('0000000000000000')
export function ecdhDecrypt(message: string, secretKey: string): string {

 try {
   const messageBytes = AES.decrypt(message, secretKey)
  
  return messageBytes.toString(enc.Utf8)
 } catch (error) {
  return ''
 }
}



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


export function ecdhEncrypt(message: string, secretKey: string,): string {
  return AES.encrypt(message, secretKey).toString()
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


/**
 * 群聊
 * @param message 
 * @param secretKeyStr 
 * @returns 
 */
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

/**
 * 群聊
 * @param message 
 * @param secretKeyStr 
 * @returns 
 */
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