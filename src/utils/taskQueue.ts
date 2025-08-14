import { getChannelMessagesForTask } from '@/api/talk'

export class GroupMessagePollingQueue {
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    groupId: string;
    metaId: string;
    cursor: string;
    size: string;
    lastTimestamp: string;
  }>;
  private isPolling: boolean;
  private pollingInterval: number;

  constructor(pollingInterval: number = 3000) {
    this.queue = [];
    this.isPolling = false;
    this.pollingInterval = pollingInterval;
  }

  // 添加轮询任务到队列
  public enqueue(
    groupId: string,
    metaId: string,
    cursor: string = '1',
    size: string = '20',
    initialTimestamp: string = '0'
  ): Promise<ChatMessageItem[]> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        task: () => this.pollMessages(groupId, metaId, cursor, size, initialTimestamp),
        resolve,
        reject,
        groupId,
        metaId,
        cursor,
        size,
        lastTimestamp: initialTimestamp
      });

      if (!this.isPolling) {
        this.startPolling();
      }
    });
  }

  // 开始轮询
  private async startPolling() {
    if (this.queue.length === 0 || this.isPolling) {
      return;
    }

    this.isPolling = true;
    const currentTask = this.queue[0];

    try {
      const messages = await currentTask.task();
      
      if (messages && messages.length > 0) {
        // 有新消息，处理消息并继续轮询
        currentTask.resolve(messages);
        this.queue.shift(); // 移除已完成的任务
        
        // 如果有下一个任务，开始执行
        if (this.queue.length > 0) {
          this.startPolling();
        } else {
          this.isPolling = false;
        }
      } else {
        // 没有新消息，等待一段时间后继续轮询
        setTimeout(() => {
          this.startPolling();
        }, this.pollingInterval);
      }
    } catch (error) {
      // 发生错误，等待一段时间后继续轮询
      console.error('轮询出错:', error);
      setTimeout(() => {
        this.startPolling();
      }, this.pollingInterval);
    }
  }

  // 轮询消息的具体实现
  private async pollMessages(
    groupId: string,
    metaId: string,
    cursor: string,
    size: string,
    timestamp: string
  ): Promise<ChatMessageItem[]> {
    try {
      const response = await getChannelMessagesForTask({
        groupId,
        metaId,
        cursor,
        size,
        timestamp
      });
      console.log("response",response)
      
      // 更新最后一次成功的时间戳
      if (this.queue.length > 0) {
        // 假设接口返回的数据中包含nextTimestamp
        // 如果没有，可以使用当前时间戳或其他逻辑
        this.queue[0].lastTimestamp = response.nextTimestamp?.toString() ;
      }

      return response.list || [];
    } catch (error) {
      console.error('获取群聊消息失败:', error);
      throw error;
    }
  }

  // 清空队列
  public clear() {
    this.queue = [];
    this.isPolling = false;
  }

  // 设置轮询间隔
  public setPollingInterval(interval: number) {
    this.pollingInterval = interval;
  }
}


