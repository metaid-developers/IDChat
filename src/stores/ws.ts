import { defineStore } from 'pinia'
import { useJobsStore } from './jobs'
import { useTalkStore } from './talk'
import { useUserStore } from './user'

export const useWsStore = defineStore('ws', {
  state: () => {
    return {
      ws: null as WebSocket | null,
      wsHeartBeatTimer: null as NodeJS.Timeout | null,
    }
  },

  getters: {
    selfMetaId(): string {
      const userStore = useUserStore()
      return userStore.last?.metaid || ''
    },

    activeChannelId(): string {
      const talk = useTalkStore()
      return talk.activeChannelId
    },
  },

  actions: {
    async init() {
      const selfMetaId = this.selfMetaId
      if (!selfMetaId) return
      const wsUri = `${import.meta.env.VITE_SHOW_NOW_HOST.replace(
        // 将.space换成.io
        '.space',
        '.io'
      ).replace('https://', 'wss://')}/ws-service?metaId=${selfMetaId}`
      this.ws = new WebSocket(wsUri)
      
      this.wsHeartBeatTimer = this._createHeartBeatTimer(wsUri)

      this.ws.addEventListener('message', this._handleReceivedMessage)
    },

    close() {
      if (this.wsHeartBeatTimer) {
        clearInterval(this.wsHeartBeatTimer)
        this.wsHeartBeatTimer = null
      }
      this.ws?.close()
      this.ws = null
    },

    async _handleReceivedMessage(event: MessageEvent) {
      
      const talk = useTalkStore()
      const jobsStore = useJobsStore()

      const messageWrapper = JSON.parse(event.data)
      switch (messageWrapper.M) {
        case 'WS_SERVER_NOTIFY_ROOM':
          
          await talk.handleNewGroupMessage(messageWrapper.D)
          jobsStore.playNotice()
          return
        case 'WS_SERVER_NOTIFY_CHAT':
          
          await talk.handleNewSessionMessage(messageWrapper.D)
          jobsStore.playNotice()
          return
        case 'WS_SERVER_NOTIFY_TX_TASK':
          
          await jobsStore.handleWsMessage(messageWrapper.D)
          return
      }
    },

    _createHeartBeatTimer(wsUri: string) {
      return setInterval(() => {
        if (this.ws?.readyState === WebSocket.CONNECTING) {
          return
        }

        if (this.ws?.readyState === WebSocket.CLOSING || this.ws?.readyState === WebSocket.CLOSED) {
          this.ws = new WebSocket(wsUri)
        }

        const heartBeat = {
          M: 'HEART_BEAT',
          C: 0,
        }
        this.ws?.send(JSON.stringify(heartBeat))
      }, 4000)
    },
  },
})
