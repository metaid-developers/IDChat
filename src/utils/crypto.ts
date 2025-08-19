import { enc, AES, mode, pad, MD5, SHA256 } from 'crypto-js'
import crypto from 'crypto'
import { HDPrivateKey, Script } from 'meta-contract/dist/mvc'
import { CryptoInfo } from '@/@types/talk'

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

export function ecdhDecrypt(message: string, privateKeyStr: string, publicKeyStr: string): string {
  const secretKey = _createEcdhSecret(privateKeyStr, publicKeyStr)
  const messageBytes = AES.decrypt(message, secretKey)

  return messageBytes.toString(enc.Utf8)
}

export function ecdhEncrypt(message: string, privateKeyStr: string, publicKeyStr: string): string {
  const secretKey = _createEcdhSecret(privateKeyStr, publicKeyStr)

  return AES.encrypt(message, secretKey).toString()
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
  console.log("address",address.toString(),privateKey.toString())
  
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
  const ECDH = crypto.createECDH('secp256k1')
  ECDH.setPrivateKey(privateKeyStr, 'hex')

  return ECDH.computeSecret(publicKeyStr, 'hex', 'hex')
}
