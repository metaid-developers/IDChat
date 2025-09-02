import { defineStore,type _GettersTree } from 'pinia'
import { useLocalStorage, type RemovableRef } from '@vueuse/core'
import {type ECDH_TYPE} from '@/@types/common'





export const useEcdhsStore =defineStore('ecdhs', {
  state: () => {
    return {
      ecdhList: useLocalStorage(
        'ecdhs',
        Array<ECDH_TYPE>,
      ) as RemovableRef<
        Array<ECDH_TYPE>
      >
    }
  },

  getters: {
    getEcdh: (state) => {
      return (ecdhPubKey: string) => {
        
        return state.ecdhList.find((s) => s.externalPubKey === ecdhPubKey)
      }
    },
  },

  actions: {
    insert(ecdh:ECDH_TYPE,ecdhPubKey:string) {
      if (this.ecdhList.find((s) => s.externalPubKey === ecdhPubKey)) return
       this.ecdhList.push(ecdh)
      
    },

  
    remove(ecdhPubKey: string) {
      this.ecdhList = this.ecdhList.filter((s) => s.externalPubKey !== ecdhPubKey)
    },


    clear(){
      this.ecdhList=[]
    }

 

 
  },
})