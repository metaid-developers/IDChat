# 邀请链接消息渲染功能

## 更新日期

2025 年 11 月 23 日

## 功能说明

实现了当用户收到群聊邀请链接时，将其渲染成群聊邀请卡片样式，并区分发送人和接收人的交互权限。

## 实现内容

### 1. 链接检测支持

**文件：** `src/views/talk/components/MessageItem.vue`

**修改内容：**

- 扩展 `isChatGroupLink` 计算属性，支持检测私密群聊邀请链接
- 正则表达式从 `/channels/public/` 扩展为 `/channels/(public|private)/`
- 同时支持主群和子频道的邀请链接

```typescript
// 支持的链接格式
;/channels/bcilpu /
[groupId] / // 公开群聊
channels /
private /
[groupId] / // 私密群聊
channels /
public /
[groupId] /
[subChannelId] / // 子频道
  channels /
  private /
  [groupId] /
  [subChannelId] // 私密子频道
```

### 2. 群聊信息解析

**新增字段：** `isPrivate`

在 `groupLinkInfo` 计算属性中添加私密群标识：

```typescript
{
  pinId: string,
  groupName: string,
  groupAvatar: string,
  memberCount: number,
  fullUrl: string,
  creator: string,
  isPrivate: boolean,  // 新增：标识是否为私密群聊
}
```

### 3. 权限控制

**发送人本人：**

- 不可点击邀请卡片
- 显示灰色禁用状态（opacity: 0.6）
- 按钮文字显示"邀请已发送"
- 鼠标样式为 `cursor-not-allowed`

**接收人：**

- 可以点击邀请卡片
- 显示正常可交互状态
- 按钮文字显示"VIEW GROUP"
- 点击后跳转到群聊页面

```typescript
const handleGroupLinkClick = () => {
  // 如果是自己发送的消息，不允许点击
  if (isMyMessage.value) {
    console.log('发送人本人不可点击邀请链接')
    return
  }

  // 接收人可以打开链接
  window.open(linkInfo.fullUrl, '_self')
}
```

### 4. 视觉样式

**私密群聊标识：**

1. **锁图标徽章**

   - 显示在群头像右上角
   - 黄色背景 + 白色锁图标
   - 尺寸：20x20px
   - Tooltip 提示："私密群聊"

2. **"私密"标签**
   - 显示在群名称右侧
   - 黄色背景 + 深黄色文字
   - 圆角徽章样式
   - 文字："私密"

**卡片状态：**

| 状态     | 发送人       | 接收人       |
| -------- | ------------ | ------------ |
| 透明度   | 60%          | 100%         |
| 鼠标样式 | not-allowed  | pointer      |
| 悬停效果 | 无           | 阴影加深     |
| 按钮文字 | "邀请已发送" | "VIEW GROUP" |
| 按钮样式 | 灰色禁用     | 主题色可点击 |

### 5. 模板结构

```vue
<div class="群聊邀请卡片">
  <!-- 群头像 + 私密标识 -->
  <div class="relative">
    <ChatIcon :src="avatar" />
    <!-- 私密群锁图标 -->
    <div v-if="isPrivate" class="锁图标徽章">
      <Icon name="lock_closed" />
    </div>
  </div>
  
  <!-- 群信息 -->
  <div class="群名称">
    {{ groupName }}
    <!-- 私密徽章 -->
    <div v-if="isPrivate" class="私密标签">
      私密
    </div>
  </div>
  
  <!-- 邀请文字 -->
  <div>{{ senderName }} invites you to join this group</div>
  
  <!-- 群组信息 -->
  <div>creator: {{ creator }}</div>
  <div>members: {{ memberCount }}</div>
  
  <!-- 操作按钮 -->
  <div v-if="!isMyMessage">
    VIEW GROUP
  </div>
  <div v-else>
    邀请已发送
  </div>
</div>
```

## 国际化

**新增翻译键：**

```json
// zh.json
{
  "Talk": {
    "Channel": {
      "private_group": "私密群聊",
      "private": "私密",
      "invite_sent": "邀请已发送"
    }
  }
}

// en.json
{
  "Talk": {
    "Channel": {
      "private_group": "Private Group",
      "private": "Private",
      "invite_sent": "Invite Sent"
    }
  }
}
```

## 使用场景

### 场景 1：发送邀请

1. 用户 A 批量邀请用户 B、C、D 到私密群聊
2. 系统自动发送加密邀请链接给每个用户
3. 用户 A 在自己的聊天界面看到邀请卡片
   - 显示灰色禁用状态
   - 按钮显示"邀请已发送"
   - 无法点击

### 场景 2：接收邀请

1. 用户 B 收到来自用户 A 的邀请消息
2. 消息自动解密并渲染成邀请卡片
3. 用户 B 看到：
   - 完整的群信息（名称、头像、成员数）
   - 私密群标识（如果是私密群）
   - "VIEW GROUP" 按钮（可点击）
4. 点击按钮后跳转到群聊页面

### 场景 3：私密群聊

私密群聊邀请卡片会显示：

- 群头像右上角的锁图标
- 群名称旁的"私密"标签
- 其他信息与公开群聊相同

## 技术细节

### 正则表达式

```typescript
// 主群链接
const groupLinkPattern = /\/channels\/(public|private)\/([a-f0-9]+)/i

// 子频道链接
const subChannelLinkPattern = /\/channels\/(public|private)\/([a-f0-9]+i0)(?:\/([a-f0-9]+))?/i
```

### 匹配分组

- `match[1]`: 'public' 或 'private'
- `match[2]`: 群组 ID（不含 'i0'）
- `match[3]`: 子频道 ID（如果存在）

### 状态判断

```typescript
// 是否为私密群聊
const isPrivate = match[1] === 'private'

// 是否为自己发送
const isMyMessage = userStore.last?.metaid === message.metaId

// 是否可点击
const isClickable = !isMyMessage
```

## 样式类名

```scss
// 卡片容器
.cursor-pointer          // 可点击
.cursor-not-allowed      // 不可点击
.opacity-60              // 发送人状态

// 锁图标徽章
.bg-yellow-500           // 亮色模式背景
.dark:bg-yellow-600      // 暗色模式背景

// 私密标签
.bg-yellow-100           // 亮色模式背景
.dark:bg-yellow-900      // 暗色模式背景
.text-yellow-700         // 亮色模式文字
.dark:text-yellow-300    // 暗色模式文字

// 按钮状态
.bg-primary              // 可点击状态
.bg-gray-200             // 禁用状态
```

## 测试要点

### 功能测试

- [ ] 公开群聊邀请正确渲染
- [ ] 私密群聊邀请正确渲染
- [ ] 私密群显示锁图标和标签
- [ ] 发送人看到禁用状态
- [ ] 接收人看到可点击状态
- [ ] 点击跳转到正确的群聊页面
- [ ] 子频道邀请正确解析

### 视觉测试

- [ ] 卡片样式正确
- [ ] 私密标识显示正确
- [ ] 亮色/暗色模式切换正常
- [ ] 禁用状态视觉清晰
- [ ] 悬停效果正常

### 交互测试

- [ ] 发送人点击无反应
- [ ] 接收人点击跳转
- [ ] 按钮文字显示正确
- [ ] 国际化切换正常

## 相关文件

- `src/views/talk/components/MessageItem.vue` - 消息渲染组件
- `src/languages/zh.json` - 中文翻译
- `src/languages/en.json` - 英文翻译

## 效果预览

### 接收人视角（可点击）

```
┌─────────────────────────────────┐
│  [头像🔒]  群聊名称 [私密]        │
│           Alice invites you...  │
│                                 │
│  creator: Bob                   │
│  members: 15                    │
│  ─────────────────────────      │
│  [      VIEW GROUP      ]       │
└─────────────────────────────────┘
```

### 发送人视角（禁用）

```
┌─────────────────────────────────┐
│  [头像🔒]  群聊名称 [私密]    60% │
│           Alice invites you...  │
│                                 │
│  creator: Bob                   │
│  members: 15                    │
│  ─────────────────────────      │
│  [     邀请已发送     ] 灰色    │
└─────────────────────────────────┘
```

## 总结

✅ 支持公开和私密群聊邀请链接
✅ 自动渲染为美观的卡片样式
✅ 区分发送人和接收人权限
✅ 私密群聊显示明显标识
✅ 完整的国际化支持
✅ 响应式设计和暗色模式支持

用户体验大幅提升，邀请流程更加直观和友好！
