import { Network } from '@/stores/network'
import Decimal from 'decimal.js-light'
export const NETWORK: Network = import.meta.env.VITE_NET_WORK_NEW || 'livenet'

export const SIGNING_MESSAGE = 'idchat.io'

export const PREFIX_PROTOCOL = '/protocols/'

export const ChannelMsg_Size = 20

export const Red_Packet_Min = new Decimal(0.0001).mul(10 ** 8).toNumber()

export const Red_Packet_Max = new Decimal(10).mul(10 ** 8).toNumber()

export const MAN_PUB_KEY =
  '048add0a6298f10a97785f7dd069eedb83d279a6f03e73deec0549e7d6fcaac4eef2c279cf7608be907a73c89eb44c28db084c27b588f1bd869321a6f104ec642d'
