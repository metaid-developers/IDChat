<!--
  IndexedDB 数据克隆安全性测试组件
  用于测试复杂数据对象在保存到 IndexedDB 时的处理
-->
<template>
  <div class="clone-safety-test">
    <h3>IndexedDB 数据克隆安全性测试</h3>
    
    <!-- 测试状态 -->
    <div class="test-status">
      <p>简化聊天系统状态: {{ chat.isInitialized ? '✅ 已初始化' : '❌ 未初始化' }}</p>
      <p>测试进行中: {{ isTesting ? '⏳ 是' : '✅ 否' }}</p>
    </div>

    <!-- 测试操作 -->
    <div class="test-actions">
      <h4>数据克隆测试</h4>
      <div class="action-buttons">
        <button @click="testSimpleChannel" :disabled="isTesting">测试简单频道数据</button>
        <button @click="testComplexChannel" :disabled="isTesting">测试复杂频道数据</button>
        <button @click="testProblematicChannel" :disabled="isTesting">测试问题数据</button>
        <button @click="testCircularReference" :disabled="isTesting">测试循环引用</button>
        <button @click="testLargeArrays" :disabled="isTesting">测试大数组数据</button>
      </div>
    </div>

    <!-- 测试结果 -->
    <div class="test-results">
      <h4>测试结果</h4>
      <div class="results-grid">
        <div v-for="(result, index) in testResults" :key="index" :class="['result-item', result.status]">
          <div class="result-header">
            <span class="test-name">{{ result.testName }}</span>
            <span class="status-icon">{{ result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏳' }}</span>
          </div>
          <div class="result-message">{{ result.message }}</div>
          <div class="result-time">{{ result.timestamp }}</div>
          <div v-if="result.error" class="result-error">
            错误: {{ result.error }}
          </div>
        </div>
      </div>
    </div>

    <!-- 操作日志 -->
    <div class="logs">
      <h4>详细日志</h4>
      <div class="log-container">
        <div v-for="(log, index) in logs" :key="index" :class="['log-item', log.type]">
          <span class="log-time">{{ log.time }}</span>
          <span class="log-message">{{ log.message }}</span>
        </div>
      </div>
      <button @click="clearLogs">清空日志</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSimpleTalkStore } from '@/stores/simple-talk'
import type { SimpleChannel, SimpleMessage } from '@/@types/simple-chat'
import { MessageType } from '@/@types/simple-chat'

const chat = useSimpleTalkStore()

interface TestResult {
  testName: string
  status: 'pending' | 'success' | 'error'
  message: string
  timestamp: string
  error?: string
}

interface LogItem {
  time: string
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

const isTesting = ref(false)
const testResults = ref<TestResult[]>([])
const logs = ref<LogItem[]>([])

// 添加日志
const addLog = (message: string, type: LogItem['type'] = 'info') => {
  logs.value.unshift({
    time: new Date().toLocaleTimeString(),
    type,
    message
  })
  if (logs.value.length > 50) {
    logs.value = logs.value.slice(0, 50)
  }
}

// 添加测试结果
const addTestResult = (testName: string, status: TestResult['status'], message: string, error?: string) => {
  const result: TestResult = {
    testName,
    status,
    message,
    timestamp: new Date().toLocaleTimeString(),
    error
  }
  testResults.value.unshift(result)
  if (testResults.value.length > 20) {
    testResults.value = testResults.value.slice(0, 20)
  }
}

// 执行测试
const runTest = async (testName: string, testFn: () => Promise<void>) => {
  isTesting.value = true
  addLog(`开始测试: ${testName}`, 'info')
  addTestResult(testName, 'pending', '测试进行中...')
  
  try {
    await testFn()
    addTestResult(testName, 'success', '测试通过')
    addLog(`✅ 测试通过: ${testName}`, 'success')
  } catch (error: any) {
    addTestResult(testName, 'error', '测试失败', error.message)
    addLog(`❌ 测试失败: ${testName} - ${error.message}`, 'error')
  } finally {
    isTesting.value = false
  }
}

// 测试简单频道数据
const testSimpleChannel = () => runTest('简单频道数据', async () => {
  const simpleChannel: SimpleChannel = {
    id: `test_simple_${Date.now()}`,
    type: 'group',
    name: '测试群聊',
    createdBy: 'test_user',
    createdAt: Date.now(),
    unreadCount: 0,
    members: ['user1', 'user2', 'user3']
  }

  await chat.db.saveChannel(simpleChannel)
  addLog('简单频道数据保存成功', 'success')
})

// 测试复杂频道数据
const testComplexChannel = () => runTest('复杂频道数据', async () => {
  const complexChannel: SimpleChannel = {
    id: `test_complex_${Date.now()}`,
    type: 'private',
    name: '测试私聊',
    avatar: 'https://example.com/avatar.jpg',
    createdBy: 'test_user',
    createdAt: Date.now(),
    unreadCount: 5,
    members: ['user1', 'user2'],
    targetMetaId: 'target_user',
    publicKeyStr: 'public_key_string',
    lastMessage: {
      content: '这是最后一条消息',
      sender: 'user1',
      senderName: '用户1',
      timestamp: Date.now(),
      type: MessageType.msg,
      chatPublicKey: 'chat_public_key'
    },
    serverData: {
      originalData: {
        nested: {
          deep: {
            value: '深层嵌套数据'
          }
        },
        arrayData: [1, 2, 3, 'string', { key: 'value' }],
        timestamp: Date.now(),
        boolean: true,
        null: null,
        undefined: undefined
      }
    }
  }

  await chat.db.saveChannel(complexChannel)
  addLog('复杂频道数据保存成功', 'success')
})

// 测试问题数据
const testProblematicChannel = () => runTest('问题数据处理', async () => {
  const problematicChannel: SimpleChannel = {
    id: `test_problematic_${Date.now()}`,
    type: 'group',
    name: '问题数据测试',
    createdBy: 'test_user',
    createdAt: Date.now(),
    unreadCount: 0,
    serverData: {
      // 包含函数的数据（不可序列化）
      someFunction: () => console.log('this function cannot be cloned'),
      // 包含 Date 对象
      dateObject: new Date(),
      // 包含正则表达式
      regexObject: /test/g,
      // 包含 Map 对象
      mapObject: new Map([['key', 'value']]),
      // 包含 Set 对象
      setObject: new Set([1, 2, 3]),
      // 正常数据
      normalData: 'this should work'
    }
  }

  await chat.db.saveChannel(problematicChannel)
  addLog('问题数据已被安全处理并保存', 'success')
})

// 测试循环引用
const testCircularReference = () => runTest('循环引用处理', async () => {
  const circularObj: any = {
    name: 'circular test',
    data: {}
  }
  // 创建循环引用
  circularObj.data.parent = circularObj

  const circularChannel: SimpleChannel = {
    id: `test_circular_${Date.now()}`,
    type: 'group',
    name: '循环引用测试',
    createdBy: 'test_user',
    createdAt: Date.now(),
    unreadCount: 0,
    serverData: circularObj
  }

  await chat.db.saveChannel(circularChannel)
  addLog('循环引用数据已被安全处理', 'success')
})

// 测试大数组数据
const testLargeArrays = () => runTest('大数组数据处理', async () => {
  const largeArray = Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `Item ${i}`,
    data: Array.from({ length: 100 }, (_, j) => `data_${i}_${j}`)
  }))

  const largeArrayChannel: SimpleChannel = {
    id: `test_large_${Date.now()}`,
    type: 'group',
    name: '大数组测试',
    createdBy: 'test_user',
    createdAt: Date.now(),
    unreadCount: 0,
    serverData: {
      largeArray,
      metadata: {
        size: largeArray.length,
        created: new Date().toISOString()
      }
    }
  }

  await chat.db.saveChannel(largeArrayChannel)
  addLog(`大数组数据保存成功，包含 ${largeArray.length} 个元素`, 'success')
})

// 清空日志
const clearLogs = () => {
  logs.value = []
}
</script>

<style scoped>
.clone-safety-test {
  max-width: 1000px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.test-status,
.test-actions,
.test-results,
.logs {
  margin: 20px 0;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 6px;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.action-buttons button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.action-buttons button:hover:not(:disabled) {
  background: #0056b3;
}

.action-buttons button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.results-grid {
  display: grid;
  gap: 12px;
}

.result-item {
  border: 1px solid #eee;
  border-radius: 6px;
  padding: 12px;
}

.result-item.success {
  border-color: #28a745;
  background-color: #f8fff9;
}

.result-item.error {
  border-color: #dc3545;
  background-color: #fff8f8;
}

.result-item.pending {
  border-color: #ffc107;
  background-color: #fffef8;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.test-name {
  font-weight: bold;
  font-size: 16px;
}

.status-icon {
  font-size: 18px;
}

.result-message {
  margin-bottom: 4px;
  color: #333;
}

.result-time {
  font-size: 12px;
  color: #666;
}

.result-error {
  margin-top: 8px;
  padding: 8px;
  background: #ffe6e6;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #d93025;
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
  border-radius: 4px;
  padding: 10px;
  font-family: monospace;
  font-size: 12px;
}

.log-item {
  margin: 2px 0;
  padding: 2px 4px;
  border-radius: 2px;
}

.log-item.info { background: #e3f2fd; }
.log-item.success { background: #e8f5e8; }
.log-item.warning { background: #fff3cd; }
.log-item.error { background: #f8d7da; }

.log-time {
  color: #666;
  margin-right: 8px;
}
</style>
