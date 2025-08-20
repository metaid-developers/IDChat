import { Network } from '@/stores/network'
import Decimal from 'decimal.js-light'
export const NETWORK: Network = import.meta.env.VITE_NET_WORK_NEW || 'livenet'

export const SIGNING_MESSAGE = 'show.now'

export const SERVICE_ADDRESS=import.meta.env.VITE_SERVICE_ADDRESS
export const SERVICE_FEE=import.meta.env.VITE_SERVICE_FEE

export const PREFIX_PROTOCOL='/protocols/'

export const ChannelMsg_Size=30

export const Red_Packet_Min=new Decimal(0.0001).mul(10 ** 8).toNumber()

export const Red_Packet_Max=new Decimal(10).mul(10 ** 8).toNumber()