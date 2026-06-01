import dayjs from 'dayjs'
import { NodeName } from '@/enum'
import { useEcdhsStore } from '@/stores/ecdh'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import { decrypt, ecdhDecrypt } from '@/utils/crypto-lite'
import { containsString } from '@/utils/light'

export const formatTimestamp = (timestamp: number, i18n: any, showMinutesWhenOld = true) => {
  if (String(timestamp).length < 13) {
    timestamp = timestamp * 1000
  }

  if (String(timestamp).length >= 16) {
    timestamp = timestamp / 1000
  }

  const day = dayjs(timestamp)

  if (day.isSame(dayjs(), 'day')) {
    return `${day.format('HH:mm')}`
  }

  if (day.isSame(dayjs().subtract(1, 'day'), 'day')) {
    return `${i18n.t('Talk.Datetime.yesterday')}${day.format('HH:mm')}`
  }

  if (showMinutesWhenOld) {
    if (day.isSame(dayjs(), 'year')) {
      return day.format('MM/DD HH:mm')
    }

    return day.format('YYYY/MM/DD HH:mm')
  }

  if (day.isSame(dayjs(), 'year')) {
    return day.format('MM/DD')
  }

  return day.format('YYYY/MM/DD')
}

export const validateTextMessage = (message: string) => {
  message = message.trim()

  return message.length > 0 && message.length <= 5000
}

export const isFileTooLarge = (file: File) => {
  return file.size > 10 * 1024 * 1024
}

export const isImage = (file: File) => {
  const type = file.type

  return (
    type === 'image/jpeg' || type === 'image/png' || type === 'image/gif' || type === 'image/jpg'
  )
}

export function decryptedMessage(
  content: string,
  encryption: string,
  protocol: string,
  isMock = false,
  isSession = false,
  secretKeyStr = '',
  publicKeyStr = ''
) {
  if (!content) return

  const simpleTalk = useSimpleTalkStore()

  if (encryption === '0') {
    return content
  }

  if (
    containsString(protocol, NodeName.SimpleFileGroupChat) ||
    containsString(protocol, NodeName.SimpleFileMsg)
  ) {
    return content
  }

  if (isSession) {
    if (!simpleTalk.activeChannel) return ''

    const ecdhsStore = useEcdhsStore()
    const ecdhPubkey = publicKeyStr || simpleTalk.activeChannel.publicKeyStr
    const ecdh = ecdhsStore.getEcdh(ecdhPubkey)

    try {
      return ecdhDecrypt(content, ecdh?.sharedSecret || '')
    } catch (error) {
      throw new Error((error as any).toString())
    }
  }

  if (!secretKeyStr) {
    const activeChannel = simpleTalk.activeChannel

    if (activeChannel?.type === 'sub-group' && activeChannel.parentGroupId) {
      const parentChannel = simpleTalk.getParentGroupChannel(activeChannel.id)
      if (parentChannel?.roomJoinType === '100' && parentChannel.passwordKey) {
        secretKeyStr = parentChannel.passwordKey
      }
    } else if (activeChannel?.passwordKey) {
      secretKeyStr = activeChannel.passwordKey
    }
  }

  return decrypt(content, secretKeyStr || simpleTalk.activeChannelId.substring(0, 16))
}
