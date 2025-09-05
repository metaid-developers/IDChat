import { defineStore } from 'pinia'
import { useLocalStorage, type RemovableRef } from '@vueuse/core'
// import type { Psbt } from 'bitcoinjs-lib'
import { ElMessage } from 'element-plus'
import { TxComposer } from 'meta-contract'
// import * as unisatAdapter from '@/wallet-adapters/unisat'
// import * as okxAdapter from '@/wallet-adapters/okx'
import * as metaletAdapter from '@/wallet-adapters/metalet'
import { useCredentialsStore } from '@/stores/credentials'

import { Network, useNetworkStore } from './network'
import { useUserStore } from './user'
import { useRouter, Router } from 'vue-router'
import { useApprovedStore } from './approved'
import { useTalkStore } from './talk'
import { useEcdhsStore } from './ecdh'
import { useLayoutStore } from './layout'
function getWalletAdapter(wallet: Wallet) {
  switch (wallet) {
    case 'metalet':
      return metaletAdapter
    default:
      throw new Error(`Unsupported wallet: ${wallet}`)
  }
}

function getWalletProvider(wallet: Wallet) {
  switch (wallet) {
    case 'metalet':
      return window.metaidwallet
    default:
      throw new Error(`Unsupported wallet: ${wallet}`)
  }
}

export type Wallet = 'metalet'
export type WalletConnection = {
  wallet: Wallet
  status: 'connected' | 'disconnected'
  address: string
  pubKey: string
}

export const useConnectionStore = defineStore('connection', {
  state: () => {
    return {
      last: useLocalStorage('last-connection', {
        wallet: 'metalet',
        status: 'disconnected',
        address: '',
        pubKey: '',
      } as WalletConnection) as RemovableRef<WalletConnection>,
    }
  },

  getters: {
    has: (state) => !!state.last,
    connected: (state) =>
      state.last.status === 'connected' && !!state.last.address,
    getAddress: (state) => {
    //   if (IS_DEV && import.meta.env.VITE_TESTING_ADDRESS) {
    //     console.log(
    //       'Using testing address',
    //       import.meta.env.VITE_TESTING_ADDRESS,
    //     )
    //     return import.meta.env.VITE_TESTING_ADDRESS as string
    //   }

      return state.last.address
    },
    isTaproot: (state) =>
      state.last.address.startsWith('bc1p') ||
      state.last.address.startsWith('tb1p'),
    getPubKey: (state) => state.last.pubKey,
    provider: (state) => {
      if (!state.last) return null
      return getWalletProvider(state.last.wallet)
    },
    adapter: (state) => {
      if (!state.last) throw new Error('No connection')

      const adapter: {
        // initPsbt: () => Psbt
        getMvcBalance: () => Promise<any>
        getMvcAddress: () => Promise<string>
        pay:(toPayTransactions:{
        transations:Array<{
        txComposer: string
        message?: string
        }>,

        hasMetaid: boolean,
        feeb?: number
        }

      )=>{
        payedTransactions:string[]
      }
      smallPay:(toPayTransactions:{
        transations:Array<{
        txComposer: string
        message?: string
        }>,

        hasMetaid: boolean,
        feeb?: number
        }

      )=>{
        payedTransactions:string[]
      }
      autoPaymentStatus:()=>{
        isEnabled:boolean,
         isApproved:boolean,
         autoPaymentAmount:number
      }
      autoPayment:()=>{
        message:string
      }

        finishPsbt: (psbt: string) => string
        getAddress: () => Promise<string>

        signMvcMessage: (message: any) => Promise<any>
        getMvcPublickey: () => Promise<string>
        getPubKey: () => Promise<string>
        connect: () => Promise<{
          address: string
          pubKey: string
        }>
        metaletConnect?: () => Promise<{
          address: string
          pubKey: string
        }>
        disconnect: () => Promise<void>
        getBalance: () => Promise<number>
        inscribe: (tick: string) => Promise<string | undefined>
        signPsbt: (psbt: string, options?: any) => Promise<string>
        signPsbts: (psbts: string[], options?: any) => Promise<string[]>
        pushPsbt: (psbt: string) => Promise<string>
        signMessage: (message: string) => Promise<string>
        getPublicKey(): any
        getNetwork: () => Promise<Network>
        switchNetwork: (network: 'livenet' | 'testnet') => Promise<{
        address: string
        network: 'mainnet' | 'testnet'
        status: string
        }>
        // switchNetwork: (
        //   network: 'livenet' | 'testnet',
        // ) => Promise<'livenet' | 'testnet'>
      } = getWalletAdapter(state.last.wallet)

      return adapter
    },
  },

  actions: {
    async connect(wallet: Wallet) {
      const connection: WalletConnection = this.last
        ? (JSON.parse(JSON.stringify(this.last)) as WalletConnection)
        : {
            wallet,
            status: 'disconnected',
            address: '',
            pubKey: '',
          }

      let connectRes = await getWalletAdapter(wallet).connect()

      try {
        if (connectRes) {
          // check if network suits app's current environment;
          // if not, call switchNetwork
          const networkStore = useNetworkStore()
          const appNetwork = networkStore.network
          switch (wallet) {
            case 'metalet':

              const metaNetwork = await getWalletAdapter('metalet').getNetwork()
              if (metaNetwork !== appNetwork) {
                await getWalletAdapter('metalet').switchNetwork(appNetwork)

                // re-connect to get new address
                connectRes = await getWalletAdapter('metalet').connect()
              }
              break
          }

          connection.address = connectRes.address
          connection.pubKey = connectRes.pubKey

          connection.status = 'connected'
          connection.wallet = wallet

          this.last = connection

          return this.last
        }
      } catch (e: any) {
        ElMessage.error(e.message)
        connection.status = 'disconnected'
        connection.wallet = wallet
        this.last = connection
      }

      return this.last
    },

    async sync() {
      // get address again from wallet
      if (!this.connected) return

      this.last.status = 'connected'
      this.last.address = await this.adapter.getAddress()
      this.last.pubKey = await this.adapter.getMvcPublickey()

      // check network synced;
      // if not, disconnect
      const networkStore = useNetworkStore()

      const appNetwork = networkStore.network
      let networkSynced = true
      switch (this.last.wallet) {
        case 'metalet':
          const network = await this.adapter.getNetwork()
          if (network !== appNetwork) {
            networkSynced = false
            this.disconnect()
          }
          const userStore = useUserStore()
          await userStore.setUserInfo(this.last.address)
          break
      }

      if (networkSynced) {
        return this.last
      }
    },

    async disconnect(router:Router) {
      if (!this.last) return

      this.last.status = 'disconnected'
      this.last.address = ''
      this.last.pubKey = ''
      this.last.wallet= 'metalet'

      const userStore = useUserStore()
      const talkStore = useTalkStore()
      const approvedStore = useApprovedStore()
      const ecdhsStore=useEcdhsStore()
      console.log('router', router)

      await userStore.clearUserInfo()
      ecdhsStore.clear()
     
      if (window.metaidwallet?.smallPay) {
        await approvedStore.clear()
      }
      setTimeout(() => {
        talkStore.$patch({ isShowWelcome: false })
       
        router.push({
          name: 'talkChannel',
          params: { communityId: 'public', channelId: 'welcome' }
        // 'buzzRecommend'
        })
      }, 1000)
    },
  },
})
