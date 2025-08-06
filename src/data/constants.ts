import { Network } from '@/stores/network'
export const NETWORK: Network = import.meta.env.VITE_NET_WORK_NEW || 'livenet'

export const SIGNING_MESSAGE = 'show.now'

export const SERVICE_ADDRESS=import.meta.env.VITE_SERVICE_ADDRESS
export const SERVICE_FEE=import.meta.env.VITE_SERVICE_FEE