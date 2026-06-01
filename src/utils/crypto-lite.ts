import { AES, enc, mode, pad } from 'crypto-js'

const Utf8 = enc.Utf8
const iv = Utf8.parse('0000000000000000')

function hexToBase64(hex: string) {
  let binary = ''

  for (let i = 0; i < hex.length; i += 2) {
    binary += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16))
  }

  return btoa(binary)
}

export function decrypt(message: string, secretKeyStr: string): string {
  const secretKey = Utf8.parse(secretKeyStr)

  try {
    const messageBase64 = hexToBase64(message)
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

  return Array.from(atob(encrypted.toString()), char =>
    char.charCodeAt(0).toString(16).padStart(2, '0')
  ).join('')
}

export function ecdhEncrypt(message: string, secretKey: string): string {
  return AES.encrypt(message, secretKey).toString()
}

export function ecdhDecrypt(message: string, secretKey: string): string {
  try {
    const messageBytes = AES.decrypt(message, secretKey)
    return messageBytes.toString(enc.Utf8)
  } catch {
    return ''
  }
}

export function ecdhEncryptForPrivateImg(message: string, secretKey: string): string {
  const messageWordArray = enc.Hex.parse(message)
  const secretKeyWordArray = enc.Hex.parse(secretKey)

  const encrypted = AES.encrypt(messageWordArray, secretKeyWordArray, {
    mode: mode.CBC,
    padding: pad.Pkcs7,
    iv,
  })

  return encrypted.ciphertext.toString(enc.Hex)
}
