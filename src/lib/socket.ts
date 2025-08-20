import { io, Socket } from 'socket.io-client';
import {useWsStore} from '@/stores/ws_new'
interface SocketConfig {
  url: string;
  path: string;
  metaid: string;
}

interface MessageData {
  message: string;
  timestamp: number;
  [key: string]: any;
}

class SocketIOClient {
  private socket: Socket | null = null;
  private config: SocketConfig;

  constructor(config: SocketConfig) {
    this.config = config;
  }

  /**
   * 连接到Socket.IO服务器
   */
  public connect(): void {
    try {
      this.socket = io(this.config.url, {
        path: this.config.path,
        query: {
          'metaid': this.config.metaid
        }
      });

      this.setupEventListeners();
      console.log('正在连接到服务器...');
    } catch (error) {
      console.error('连接失败:', error);
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // 连接成功事件
    this.socket.on('connect', () => {
      console.log('✅ 已连接到服务器');
      console.log('连接ID:', this.socket?.id);
      this.logMessage('已连接到服务器');
    });

    // 断开连接事件
    this.socket.on('disconnect', (reason: string) => {
      console.log('❌ 与服务器断开连接');
      console.log('断开原因:', reason);
      this.logMessage(`与服务器断开连接: ${reason}`);
    });

    // 连接错误事件
    this.socket.on('connect_error', (error: Error) => {
      console.error('🔴 连接错误:', error);
      this.logMessage(`连接错误: ${error.message}`);
    });
   
    // 接收消息事件
    this.socket.on('message',(data: MessageData) => {
        
    //   console.log('📨 收到消息:', data);
      const ws=useWsStore()
      ws._handleReceivedMessage(data)
    //   this.logMessage(`收到消息: ${JSON.stringify(data)}`);
    });

    // 重新连接事件
    this.socket.on('reconnect', (attemptNumber: number) => {
      console.log('🔄 重新连接成功，尝试次数:', attemptNumber);
      this.logMessage(`重新连接成功，尝试次数: ${attemptNumber}`);
    });

    // 重新连接尝试事件
    this.socket.on('reconnect_attempt', (attemptNumber: number) => {
      console.log('🔄 尝试重新连接，次数:', attemptNumber);
      this.logMessage(`尝试重新连接，次数: ${attemptNumber}`);
    });

    // 重新连接错误事件
    this.socket.on('reconnect_error', (error: Error) => {
      console.error('🔴 重新连接错误:', error);
      this.logMessage(`重新连接错误: ${error.message}`);
    });
  }

  /**
   * 发送消息
   */
  public sendMessage(message: string): void {
    if (!this.socket || !this.socket.connected) {
      console.error('❌ 未连接到服务器，无法发送消息');
      this.logMessage('未连接到服务器，无法发送消息');
      return;
    }

    try {
      const messageData: MessageData = {
        message,
        timestamp: Date.now()
      };

      this.socket.emit('message', messageData);
      console.log('📤 发送消息:', messageData);
      this.logMessage(`发送消息: ${message}`);
    } catch (error) {
      console.error('发送消息失败:', error);
      this.logMessage(`发送消息失败: ${error}`);
    }
  }

  /**
   * 断开连接
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 已断开连接');
      this.logMessage('已断开连接');
    }
  }

  /**
   * 获取连接状态
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * 获取Socket实例
   */
  public getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * 记录消息到控制台
   */
  private logMessage(message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`[${timestamp}] ${message}`);
  }
}

// 使用示例
function main(): void {
  const config: SocketConfig = {
    url: 'https://www.show.now',
    path: '/socket-test/socket.io',
    metaid: '14f93c2e4d310186adc2f47d4dcecf9a29141045975b6df643b98be2bf9a92b9'
  };

  const client = new SocketIOClient(config);

  // 连接到服务器
  client.connect();

  // 模拟发送消息（在实际应用中，你可能需要从用户输入获取消息）
  setTimeout(() => {
    if (client.isConnected()) {
      client.sendMessage('Hello from TypeScript client!');
    }
  }, 2000);

  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n正在关闭连接...');
    client.disconnect();
    process.exit(0);
  });
}

// 如果直接运行此文件，则执行main函数

export { SocketIOClient, SocketConfig, MessageData };
