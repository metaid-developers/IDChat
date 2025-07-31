import { Network } from '@/stores/network'
export const NETWORK: Network = import.meta.env.VITE_NETWORK || 'livenet'

export const SIGNING_MESSAGE = 'show.now'