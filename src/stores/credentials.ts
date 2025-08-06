import { defineStore,type _GettersTree } from 'pinia'
import { useLocalStorage, type RemovableRef } from '@vueuse/core'

import { useConnectionStore } from '@/stores/connection'
import { SIGNING_MESSAGE } from '@/data/constants'
// import { login } from '@/queries/orders-api'
import {useUserStore} from '@/stores/user'


export const useCredentialsStore =defineStore('credentials', {
  state: () => {
    return {
      credentials: useLocalStorage(
        'credentials',
        [] as { publicKey: string; signature: string; address: string,marketSig?:string }[],
      ) as RemovableRef<
        { publicKey: string; signature: string; address: string,marketSig?:string }[]
      >,
      signing: false,
    }
  },

  getters: {
    getByAddress: (state) => {
      return (address: string) => {
        return state.credentials.find((s) => s.address === address)
      }
    },

    has: (state) => {
      return (address: string) => {
        return !!state.credentials.find((s) => s.address === address)
      }
    },

    get: (state) => {
      const connectionStore = useConnectionStore()
      const connected = connectionStore.connected
      const address = connectionStore.getAddress
      const credential = state.credentials.find((s) => s.address === address)

      const ready = connected && !!credential

      if (!ready) return false

      return credential
    },

    ready: (state) => {
      const connectionStore = useConnectionStore()
      const connected = connectionStore.connected
      const address = connectionStore.getAddress
      const credential = state.credentials.find((s) => s.address === address)

      return connected && !!credential
    },
  },

  actions: {
    add({
      publicKey,
      signature,
      address,
     
    }: {
      publicKey: string
      signature: string
      address: string
     
    }) {
      if (this.credentials.find((s) => s.address === address)) return

      this.credentials.push({ publicKey, signature, address })
    },

    remove(address: string) {
      this.credentials = this.credentials.filter((s) => s.address !== address)
    },

    async sign() {
      
      const connectionStore = useConnectionStore()
      const connection = connectionStore.last
      if (!connection.address || connection.status === 'disconnected') {
        throw new Error('Please connect to a wallet first.')
      }
      
      const address = connectionStore.getAddress

      // read from store first.
      const credential = this.getByAddress(address)
      if (credential) return credential

      // nothing in cache
      // check if signing already;
      // if so, wait for it.
      // if (this.signing) return false
      this.signing = true

      // perform sign
      const message = SIGNING_MESSAGE
    
      let publicKey: string = connection.pubKey
      let signature: string = ''
    
      try {
        switch (connection.wallet) {
          case 'metalet':
            publicKey = await connectionStore.adapter.getMvcPublickey()
            
            signature = await connectionStore.adapter.signMessage(message)
            
            break
          default:
            throw new Error(`Unsupported wallet: ${connection.wallet}`)
        }

        this.add({ publicKey, signature, address })

        return { publicKey, signature, address }
      } catch (e) {
        // it's likely that the user rejected the signing.
        this.signing = false
      }
    },

    async login() {
      // 1. sync connection
      
      const connectionStore = useConnectionStore()
      const synced = await connectionStore.sync()
      if (!synced) {
        return false
      }

      // 2. get credential
      const credential = await this.sign()
      
      if (!credential) return false

      const userStore=useUserStore()
      await userStore.setUserInfo(credential.address)

      // 3. login to api
    //   const res = await login(credential)
    //   if (res.error) {
    //     ElMessage.error(res.error)
    //     return false
    //   }

      return credential
    },
  },
})
