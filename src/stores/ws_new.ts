import { defineStore } from 'pinia'
import { useJobsStore } from './jobs'
import { useUserStore } from './user'
import { SocketIOClient } from '@/lib/socket'
import { disconnect } from 'process'
import { useSimpleTalkStore } from './simple-talk'
import { useRootStore, isIOS, isAndroid } from './root'
import { VITE_IDCHAT_PATH_WS, VITE_SHOW_NOW_WS } from '@/config/app-config'

interface MessageData {
  message: string
  timestamp: number
  [key: string]: any
}

interface SocketConfig {
  url: string
  path: string
  metaid: string
  type: 'pc' | 'app'
}

export const useWsStore = defineStore('ws', {
  state: () => {
    return {
      ws: null as SocketIOClient | null,
      //wsHeartBeatTimer: null as NodeJS.Timeout | null,
    }
  },

  getters: {
    selfMetaId(): string {
      const userStore = useUserStore()
      return userStore.last?.metaid || ''
    },

    activeChannelId(): string {
      const simpleTalk = useSimpleTalkStore()
      return simpleTalk.activeChannelId
    },

    isConnected(state) {
      return state.ws?.isConnected()
    },
  },

  actions: {
    async init() {
      const selfMetaId = this.selfMetaId
      const rootStore = useRootStore()
      rootStore.checkWebViewBridge()
      if (!selfMetaId) return
      const config: SocketConfig = {
        url: `${VITE_SHOW_NOW_WS() || import.meta.env.VITE_SHOW_NOW_WS}`,
        path: `${VITE_IDCHAT_PATH_WS()}/socket.io`,
        metaid: selfMetaId,
        type: rootStore.isWebView || isIOS || isAndroid ? 'app' : 'pc',
      }

      this.ws = new SocketIOClient(config)
      // this.ws=client
      this.ws.connect()

      setTimeout(() => {
        if (this.ws?.isConnected()) {
          // console.log("Hello from TypeScript client!")
          //client.sendMessage('Hello from TypeScript client!');
        }
      }, 2000)

      // const socket=client.getSocket()

      //
      // const socket=io(`${import.meta.env.VITE_SHOW_NOW_WS}`,{
      //       query:{
      //         metaid:selfMetaId,

      //       },
      //     path:'/socket-test/socket.io',
      //      reconnection: true,
      //      reconnectionAttempts: Infinity,
      //      reconnectionDelay: 1000,
      //      reconnectionDelayMax: 5000,
      //     randomizationFactor: 0.5,
      //      timeout: 20000,
      //     transports: ['websocket', 'polling'],
      // })
      // // const wsUri = `${import.meta.env.VITE_SHOW_NOW_HOST.replace(
      // //   // 将.space换成.io
      // //   '.space',
      // //   '.io'
      // // ).replace('https://', 'wss://')}/ws-service?metaId=${selfMetaId}`
      // this.ws =socket //new WebSocket(wsUri)

      // //this.wsHeartBeatTimer = this._createHeartBeatTimer()
      // socket.on('connect', () => {
      //
      // console.log('Socket.io connected successfully', socket.id);
      // });
      // socket.on('connect_error', (error) => {
      // console.error('Socket.io connection error:', error);
      // });
      // socket.on('message', this._handleReceivedMessage)
    },

    disconnect() {
      this.ws?.disconnect()
    },

    // close() {
    //   if (this.wsHeartBeatTimer) {
    //     clearInterval(this.wsHeartBeatTimer)
    //     this.wsHeartBeatTimer = null
    //   }
    //   this.ws?.close()
    //   this.ws = null
    // },
    //MessageEvent
    async _handleReceivedMessage(data: MessageData) {
      const jobsStore = useJobsStore()
      const simpleTalkStore = useSimpleTalkStore()
      // event.data
      const messageWrapper = JSON.parse(data)
      switch (messageWrapper.M) {
        case 'WS_SERVER_NOTIFY_GROUP_CHAT':
          // await talk.handleNewGroupMessage(messageWrapper.D)
          console.log('收到新消息', messageWrapper.D)
          await simpleTalkStore.receiveMessage(messageWrapper.D)

          jobsStore.playNotice()
          return
        case 'WS_SERVER_NOTIFY_PRIVATE_CHAT':
          // await talk.handleNewSessionMessage(messageWrapper.D)
          console.log('收到新消息', messageWrapper.D)
          await simpleTalkStore.receiveMessage(messageWrapper.D)
          jobsStore.playNotice()
          return
        case 'WS_SERVER_NOTIFY_GROUP_ROLE':
          await simpleTalkStore.receiveUserRoleMessage(messageWrapper.D)
          return
        case 'WS_SERVER_NOTIFY_TX_TASK':
          await jobsStore.handleWsMessage(messageWrapper.D)
          return

        default:
          break
      }
    },
    //wsUri: string
    // _createHeartBeatTimer() {
    //   return setInterval(() => {

    //     // if (this.ws?.readyState === WebSocket.CONNECTING) {
    //     //   return
    //     // }
    //     if(this.ws?.connected){
    //       return
    //     }

    //     if (this.ws?.connected === false) {
    //       // this.ws = new WebSocket(wsUri)
    //        const selfMetaId = this.selfMetaId
    //     if (!selfMetaId) return
    //       const socket=io(`${import.meta.env.VITE_SHOW_NOW_WS}/`,{
    //       query:{
    //           "metaid":selfMetaId,

    //         },
    //       path:'/socket-test/socket.io',
    //       // reconnection: true,
    //       // reconnectionAttempts: Infinity,
    //       // reconnectionDelay: 1000,
    //       // reconnectionDelayMax: 5000,
    //       // randomizationFactor: 0.5,
    //       // timeout: 20000,
    //       // transports: ['websocket', 'polling'],
    //   })
    //   this.ws=socket
    //     }
    //   //
    //   //   if (this.ws?.readyState === WebSocket.CLOSING || this.ws?.readyState === WebSocket.CLOSED) {
    //   //     // this.ws = new WebSocket(wsUri)
    //   //      const selfMetaId = this.selfMetaId
    //   //   if (!selfMetaId) return
    //   //     this.ws=io(`${import.meta.env.VITE_SHOW_NOW_WS}?metaid=${selfMetaId}`,{
    //   //     reconnection: true,
    //   //     reconnectionAttempts: Infinity,
    //   //     reconnectionDelay: 1000,
    //   //     reconnectionDelayMax: 5000,
    //   //     randomizationFactor: 0.5,
    //   //     timeout: 20000,
    //   //     transports: ['websocket', 'polling'],
    //   // })
    //   //   }

    //     if(!this.ws){

    //       //this.ws = new WebSocket(wsUri)
    //     const selfMetaId = this.selfMetaId
    //     if (!selfMetaId) return
    //       this.ws=io(`${import.meta.env.VITE_SHOW_NOW_WS}`,{
    //         query:{
    //           metaid:selfMetaId,

    //         },
    //       path:'/socket-test/socket.io',
    //       reconnection: true,
    //       reconnectionAttempts: Infinity,
    //       reconnectionDelay: 1000,
    //       reconnectionDelayMax: 5000,
    //       randomizationFactor: 0.5,
    //       timeout: 20000,
    //       transports: ['websocket', 'polling'],
    //   })
    //     }

    //     const heartBeat = {
    //       M: 'HEART_BEAT',
    //       C: 0,
    //     }
    //     this.ws.send(JSON.stringify(heartBeat))
    //   }, 4000)
    // },
  },
})
