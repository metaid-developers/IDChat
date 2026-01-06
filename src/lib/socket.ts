// import { io, Socket } from 'socket.io-client';
// import {useWsStore} from '@/stores/ws_new'
// interface SocketConfig {
//   url: string;
//   path: string;
//   metaid: string;
// }

// interface MessageData {
//   message: string;
//   timestamp: number;
//   [key: string]: any;
// }

// class SocketIOClient {
//   private socket: Socket | null = null;
//   private config: SocketConfig;

//   constructor(config: SocketConfig) {
//     this.config = config;
//   }

//   /**
//    * 连接到Socket.IO服务器
//    */
//   public connect(): void {
//     try {
//       this.socket = io(this.config.url, {
//         path: this.config.path,
//         query: {
//           'metaid': this.config.metaid
//         }
//       });

//       this.setupEventListeners();
//       console.log('正在连接到服务器...');
//     } catch (error) {
//       console.error('连接失败:', error);
//     }
//   }

//   /**
//    * 设置事件监听器
//    */
//   private setupEventListeners(): void {
//     if (!this.socket) return;

//     // 连接成功事件
//     this.socket.on('connect', () => {
//       console.log('✅ 已连接到服务器');
//       console.log('连接ID:', this.socket?.id);
//       this.logMessage('已连接到服务器');
//     });

//     // 断开连接事件
//     this.socket.on('disconnect', (reason: string) => {
//       console.log('❌ 与服务器断开连接');
//       console.log('断开原因:', reason);
//       this.logMessage(`与服务器断开连接: ${reason}`);
//     });

//     // 连接错误事件
//     this.socket.on('connect_error', (error: Error) => {
//       console.error('🔴 连接错误:', error);
//       this.logMessage(`连接错误: ${error.message}`);
//     });

//     // 接收消息事件
//     this.socket.on('message',(data: MessageData) => {

//     //   console.log('📨 收到消息:', data);
//       const ws=useWsStore()
//       ws._handleReceivedMessage(data)
//     //   this.logMessage(`收到消息: ${JSON.stringify(data)}`);
//     });

//     // 重新连接事件
//     this.socket.on('reconnect', (attemptNumber: number) => {
//       console.log('🔄 重新连接成功，尝试次数:', attemptNumber);
//       this.logMessage(`重新连接成功，尝试次数: ${attemptNumber}`);
//     });

//     // 重新连接尝试事件
//     this.socket.on('reconnect_attempt', (attemptNumber: number) => {
//       console.log('🔄 尝试重新连接，次数:', attemptNumber);
//       this.logMessage(`尝试重新连接，次数: ${attemptNumber}`);
//     });

//     // 重新连接错误事件
//     this.socket.on('reconnect_error', (error: Error) => {
//       console.error('🔴 重新连接错误:', error);
//       this.logMessage(`重新连接错误: ${error.message}`);
//     });
//   }

//   /**
//    * 发送消息
//    */
//   public sendMessage(message: string): void {
//     if (!this.socket || !this.socket.connected) {
//       console.error('❌ 未连接到服务器，无法发送消息');
//       this.logMessage('未连接到服务器，无法发送消息');
//       return;
//     }

//     try {
//       const messageData: MessageData = {
//         message,
//         timestamp: Date.now()
//       };

//       this.socket.emit('message', messageData);
//       console.log('📤 发送消息:', messageData);
//       this.logMessage(`发送消息: ${message}`);
//     } catch (error) {
//       console.error('发送消息失败:', error);
//       this.logMessage(`发送消息失败: ${error}`);
//     }
//   }

//   /**
//    * 断开连接
//    */
//   public disconnect(): void {
//     if (this.socket) {
//       this.socket.disconnect();
//       this.socket = null;
//       console.log('🔌 已断开连接');
//       this.logMessage('已断开连接');
//     }
//   }

//   /**
//    * 获取连接状态
//    */
//   public isConnected(): boolean {
//     return this.socket?.connected || false;
//   }

//   /**
//    * 获取Socket实例
//    */
//   public getSocket(): Socket | null {
//     return this.socket;
//   }

//   /**
//    * 记录消息到控制台
//    */
//   private logMessage(message: string): void {
//     const timestamp = new Date().toLocaleTimeString();
//     console.log(`[${timestamp}] ${message}`);
//   }
// }

// // 使用示例
// function main(): void {
//   const config: SocketConfig = {
//     url: 'https://www.show.now',
//     path: '/socket-test/socket.io',
//     metaid: '14f93c2e4d310186adc2f47d4dcecf9a29141045975b6df643b98be2bf9a92b9'
//   };

//   const client = new SocketIOClient(config);

//   // 连接到服务器
//   client.connect();

//   // 模拟发送消息（在实际应用中，你可能需要从用户输入获取消息）
//   setTimeout(() => {
//     if (client.isConnected()) {
//       client.sendMessage('Hello from TypeScript client!');
//     }
//   }, 2000);

//   // 处理进程退出
//   process.on('SIGINT', () => {
//     console.log('\n正在关闭连接...');
//     client.disconnect();
//     process.exit(0);
//   });
// }

// // 如果直接运行此文件，则执行main函数

// export { SocketIOClient, SocketConfig, MessageData };

import { io, Socket } from 'socket.io-client'
import { useWsStore } from '@/stores/ws_new'
import { useSimpleTalkStore } from '@/stores/simple-talk'

interface SocketConfig {
  url: string
  path: string
  metaid: string // 参数名改为 metaid（小写），值使用 globalMetaId
  type: 'app' | 'pc'
  heartbeatInterval?: number // 心跳间隔（毫秒）
  heartbeatTimeout?: number // 心跳超时时间（毫秒）
}

interface MessageData {
  message: string
  timestamp: number
  [key: string]: any
}

interface HeartbeatData {
  type: 'heartbeat'
  timestamp: number
  metaid: string // 参数名改为 metaid（小写）
}

class SocketIOClient {
  private socket: Socket | null = null
  private config: SocketConfig
  private heartbeatIntervalId: NodeJS.Timeout | null = null
  private heartbeatTimeoutId: NodeJS.Timeout | null = null
  private isHeartbeatRunning: boolean = false

  constructor(config: SocketConfig) {
    // 设置默认的心跳参数
    this.config = {
      heartbeatInterval: 30000, // 默认30秒
      heartbeatTimeout: 10000, // 默认10秒超时
      ...config,
    }
  }

  /**
   * 连接到Socket.IO服务器
   */
  public connect(): void {
    try {
      this.socket = io(this.config.url, {
        path: this.config.path,
        query: {
          metaid: this.config.metaid, // 参数名改为 metaid（小写），值使用 globalMetaId
          type: this.config.type,
        },
      })

      this.setupEventListeners()
      console.log('正在连接到服务器...')
    } catch (error) {
      console.error('连接失败:', error)
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return

    // 连接成功事件
    this.socket.on('connect', () => {
      console.log('✅ 已连接到服务器')
      console.log('连接ID:', this.socket?.id)
      this.logMessage('已连接到服务器')
      const simpleTalkStore = useSimpleTalkStore()
      if (simpleTalkStore.isInitialized) {
        simpleTalkStore.syncFromServer()
      }
      // 连接成功后启动心跳
      this.startHeartbeat()
    })

    // 断开连接事件
    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ 与服务器断开连接')
      console.log('断开原因:', reason)
      this.logMessage(`与服务器断开连接: ${reason}`)

      // 断开连接时停止心跳
      this.stopHeartbeat()
    })

    // 连接错误事件
    this.socket.on('connect_error', (error: Error) => {
      console.error('🔴 连接错误:', error)
      this.logMessage(`连接错误: ${error.message}`)

      // 连接错误时停止心跳
      this.stopHeartbeat()
    })

    // 接收消息事件
    this.socket.on('message', (data: MessageData) => {
      const ws = useWsStore()
      ws._handleReceivedMessage(data)
    })

    // 接收心跳响应事件
    this.socket.on('heartbeat_ack', (data: any) => {
      console.log('💓 收到心跳响应:', data)
      this.handleHeartbeatAck()
    })

    // 重新连接事件
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 重新连接成功，尝试次数:', attemptNumber)
      this.logMessage(`重新连接成功，尝试次数: ${attemptNumber}`)

      // 重新连接后重启心跳
      this.startHeartbeat()
    })

    // 重新连接尝试事件
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 尝试重新连接，次数:', attemptNumber)
      this.logMessage(`尝试重新连接，次数: ${attemptNumber}`)
    })

    // 重新连接错误事件
    this.socket.on('reconnect_error', (error: Error) => {
      console.error('🔴 重新连接错误:', error)
      this.logMessage(`重新连接错误: ${error.message}`)
    })
  }

  /**
   * 启动心跳检测
   */
  private startHeartbeat(): void {
    if (this.isHeartbeatRunning) {
      return
    }

    this.isHeartbeatRunning = true
    console.log('💓 启动心跳检测')

    // 清除可能存在的旧定时器
    this.stopHeartbeat()

    // 设置心跳间隔
    this.heartbeatIntervalId = setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)

    // 立即发送第一次心跳
    this.sendHeartbeat()
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    this.isHeartbeatRunning = false

    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId)
      this.heartbeatIntervalId = null
    }

    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId)
      this.heartbeatTimeoutId = null
    }

    console.log('💔 停止心跳检测')
  }

  /**
   * 发送心跳包
   */
  private sendHeartbeat(): void {
    if (!this.socket || !this.socket.connected) {
      console.warn('⚠️ 未连接到服务器，跳过心跳发送')
      return
    }

    try {
      // const heartbeatData: HeartbeatData = {
      //   type: 'heartbeat',
      //   timestamp: Date.now(),
      //   metaid: this.config.metaid
      // };
      const heartbeatMessage = { M: 'HEART_BEAT', C: 10 }
      //this.socket.emit('message', heartbeatMessage)

      this.socket.emit('ping')
      console.log('📤 发送心跳包:', heartbeatMessage)

      // 设置心跳超时检测
      //this.setHeartbeatTimeout();
    } catch (error) {
      console.error('发送心跳包失败:', error)
    }
  }

  /**
   * 设置心跳超时检测
   */
  private setHeartbeatTimeout(): void {
    // 清除之前的超时检测
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId)
    }

    this.heartbeatTimeoutId = setTimeout(() => {
      console.error('❌ 心跳超时，服务器无响应')
      this.logMessage('心跳超时，服务器无响应')

      // 心跳超时，主动断开连接并尝试重连
      this.handleHeartbeatTimeout()
    }, this.config.heartbeatTimeout)
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeatAck(): void {
    // 收到心跳响应，清除超时检测
    if (this.heartbeatTimeoutId) {
      clearTimeout(this.heartbeatTimeoutId)
      this.heartbeatTimeoutId = null
    }

    console.log('💓 心跳正常')
  }

  /**
   * 处理心跳超时
   */
  private handleHeartbeatTimeout(): void {
    console.error('💔 心跳超时，尝试重新连接')
    this.logMessage('心跳超时，尝试重新连接')

    // 断开当前连接
    this.disconnect()

    // 尝试重新连接
    setTimeout(() => {
      console.log('🔄 尝试重新连接...')
      this.connect()
    }, 5000)
  }

  /**
   * 发送消息
   */
  public sendMessage(message: string): void {
    if (!this.socket || !this.socket.connected) {
      console.error('❌ 未连接到服务器，无法发送消息')
      this.logMessage('未连接到服务器，无法发送消息')
      return
    }

    try {
      const messageData: MessageData = {
        message,
        timestamp: Date.now(),
      }

      this.socket.emit('message', messageData)
      console.log('📤 发送消息:', messageData)
      this.logMessage(`发送消息: ${message}`)
    } catch (error) {
      console.error('发送消息失败:', error)
      this.logMessage(`发送消息失败: ${error}`)
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    // 停止心跳检测
    this.stopHeartbeat()

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      console.log('🔌 已断开连接')
      this.logMessage('已断开连接')
    }
  }

  /**
   * 获取连接状态
   */
  public isConnected(): boolean {
    return this.socket?.connected || false
  }

  /**
   * 获取Socket实例
   */
  public getSocket(): Socket | null {
    return this.socket
  }

  /**
   * 记录消息到控制台
   */
  private logMessage(message: string): void {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] ${message}`)
  }
}

// 使用示例
// function main(): void {
//   const config: SocketConfig = {
//     url: 'https://www.show.now',
//     path: '/socket-test/socket.io',
//     metaid: '14f93c2e4d310186adc2f47d4dcecf9a29141045975b6df643b98be2bf9a92b9',
//     heartbeatInterval: 30000, // 30秒心跳间隔
//     heartbeatTimeout: 10000   // 10秒超时
//   };

//   const client = new SocketIOClient(config);

//   // 连接到服务器
//   client.connect();

//   // 模拟发送消息
//   setTimeout(() => {
//     if (client.isConnected()) {
//       client.sendMessage('Hello from TypeScript client!');
//     }
//   }, 2000);

//   // 处理进程退出
//   process.on('SIGINT', () => {
//     console.log('\n正在关闭连接...');
//     client.disconnect();
//     process.exit(0);
//   });
// }

export { SocketIOClient, SocketConfig, MessageData, HeartbeatData }
