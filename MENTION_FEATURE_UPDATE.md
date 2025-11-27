# Mention 功能优化说明

## 概述

优化了消息中的 @提及 功能，使用 `message.mention` 字段精确匹配用户名，避免随意 @ 就会高亮的问题，并支持点击跳转到私聊页面。

## 主要改动

### 1. 数据结构

新增了 `mentionedUsers` 缓存用于存储被提及用户的信息：

```typescript
interface MentionedUser {
  metaId: string
  name: string
  avatar?: string
}

const mentionedUsers = ref<Map<string, MentionedUser>>(new Map())
```

### 2. 用户信息获取

添加了 `fetchMentionedUserInfo` 函数，根据 `message.mention` 数组中的 metaId 批量获取用户信息：

```typescript
const fetchMentionedUserInfo = async (metaId: string) => {
  // 从缓存中查找
  if (mentionedUsers.value.has(metaId)) {
    return mentionedUsers.value.get(metaId)!
  }

  // 通过 API 查询用户信息
  const userInfo = await getUserInfoByAddress(metaId)
  const mentionedUser: MentionedUser = {
    metaId,
    name: userInfo.name || metaId.slice(0, 8),
    avatar: userInfo.avatar,
  }
  mentionedUsers.value.set(metaId, mentionedUser)
  return mentionedUser
}
```

### 3. 初始化

在组件挂载时批量获取所有被提及用户的信息：

```typescript
const initMentionedUsers = async () => {
  if (!props.message.mention || props.message.mention.length === 0) {
    return
  }

  // 批量获取被提及用户的信息
  await Promise.all(props.message.mention.map(metaId => fetchMentionedUserInfo(metaId)))
}

onMounted(() => {
  initMentionedUsers()
})
```

### 4. 精确匹配渲染

改进了 `parseTextMessage` 函数，只对 `message.mention` 中的用户进行高亮：

```typescript
// 处理 @ 提及：使用 message.mention 字段精确匹配
if (props.message.mention && props.message.mention.length > 0) {
  mentionedUsers.value.forEach((user, metaId) => {
    const username = user.name
    // 使用边界匹配确保完整匹配用户名，支持用户名中的空格
    const escapedUsername = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const mentionRegex = new RegExp(`@${escapedUsername}(?=\\s|$|<|\\.|,|!|\\?|;)`, 'g')

    text = text.replace(mentionRegex, function(match) {
      return `<span class="mention" data-metaid="${metaId}" style="color: #fc457b; font-weight: 600; cursor: pointer;">${match}</span>`
    })
  })
}
```

**关键特性：**

- 只匹配 `message.mention` 数组中的用户
- 支持用户名中的空格（转义特殊字符）
- 使用边界匹配确保完整匹配用户名
- 添加 `data-metaid` 属性用于点击跳转

### 5. 点击跳转

添加了 `handleMentionClick` 函数处理 mention 点击事件：

```typescript
const handleMentionClick = async (metaId: string) => {
  // 如果是自己，不跳转
  if (metaId === userStore.last?.metaid) {
    return
  }

  // 检查自己是否支持私聊
  if (!userStore.last?.chatpubkey) {
    return ElMessage.error(`${i18n.t('self_private_chat_unsupport')}`)
  }

  // 跳转到私聊页面
  router.push({
    name: 'talkAtMe',
    params: {
      channelId: metaId,
    },
  })
  simpleTalk.setActiveChannel(metaId)
}
```

在 `handleMessageClick` 中添加了事件委托：

```typescript
const handleMessageClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement

  // 处理 mention 点击
  if (target.classList.contains('mention')) {
    event.preventDefault()
    const metaId = target.getAttribute('data-metaid')
    if (metaId) {
      handleMentionClick(metaId)
    }
  }
}
```

## 解决的问题

### 1. 随意 @ 高亮问题

**之前：** 使用正则表达式 `/@(\S+)/g` 匹配所有 `@` 后面跟非空白字符的内容，导致任意 `@something` 都会被高亮。

**现在：** 只有 `message.mention` 数组中的用户才会被高亮，必须是真实的 @ 提及。

### 2. 用户名空格问题

**之前：** 使用 `\S+` 匹配非空白字符，导致用户名中有空格的用户无法完整匹配。

**现在：**

- 对用户名进行转义处理 `username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`
- 使用完整用户名进行匹配
- 使用边界匹配 `(?=\s|$|<|\.|,|!|\?|;)` 确保精确匹配

### 3. 点击跳转支持

**之前：** mention 高亮后无法交互。

**现在：**

- 点击 mention 可跳转到对应用户的私聊页面
- 自动设置活跃频道
- 检查私聊支持状态

## 使用示例

### 消息数据结构

```typescript
{
  content: "Hi @John Doe and @Jane, how are you?",
  mention: [
    "metaid_of_john_doe",
    "metaid_of_jane"
  ],
  // ... 其他字段
}
```

### 渲染结果

```html
Hi <span class="mention" data-metaid="metaid_of_john_doe" style="...">@John Doe</span> and
<span class="mention" data-metaid="metaid_of_jane" style="...">@Jane</span>, how are you?
```

### 点击效果

点击 `@John Doe` 或 `@Jane` 会：

1. 检查是否支持私聊
2. 跳转到对应用户的私聊页面
3. 设置该私聊为活跃频道

## 注意事项

1. **性能优化**：使用 Map 缓存用户信息，避免重复请求
2. **批量加载**：组件挂载时批量获取所有被提及用户的信息
3. **容错处理**：如果 API 请求失败，使用 metaId 前 8 位作为默认用户名
4. **边界情况**：
   - 如果 `message.mention` 为空或未定义，不进行任何处理
   - 如果点击自己的 mention，不跳转
   - 如果不支持私聊，显示错误提示

## 测试建议

1. 测试普通 @ 提及（message.mention 中的用户）
2. 测试用户名包含空格的情况
3. 测试用户名包含特殊字符的情况
4. 测试随意 @ 不在 mention 列表中的内容（应该不高亮）
5. 测试点击 mention 跳转功能
6. 测试点击自己的 mention（不应跳转）
7. 测试不支持私聊的情况（应显示错误）
