import { defineStore } from 'pinia'
// import { networks } from 'bitcoinjs-lib'

import { NETWORK } from '@/data/constants'

export type Network = 'livenet' | 'testnet'
export const useNetworkStore = defineStore('network', {
  getters: {
    network: () => NETWORK,
    
    // btcNetwork: () => (NETWORK === 'livenet' ? 'bitcoin' : 'testnet'),
    // typedNetwork: () =>
    //   NETWORK === 'livenet' ? networks.bitcoin : networks.testnet,
    // ordersNetwork: () => NETWORK,
    isTestnet: () => NETWORK === 'testnet',
  },
})
