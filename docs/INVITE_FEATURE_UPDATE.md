# 私密群聊邀请功能更新

## 更新日期

2025 年 11 月 23 日

## 更新内容

本次更新在原有邀请功能基础上，集成了 `BatchGetUsersEcdhPubkeyForPrivateChat` 接口，实现了私密群聊邀请前的 chatPublicKey 检查。

## 主要变更

### 1. API 集成

**文件：** `src/views/talk/components/ChannelMemberListDrawer.vue`

**导入新接口：**

```typescript
import {
  getChannelMembers,
  searchChannelMembers,
  getUserGroupRole,
  searchGroupsAndUsers,
  BatchGetUsersEcdhPubkeyForPrivateChat, // 新增
} from '@/api/talk'
```

### 2. 状态管理

**新增状态变量：**

```typescript
const userChatPublicKeys = ref<Map<string, string>>(new Map())
```

用于存储搜索到的用户的 chatPublicKey，key 为 metaId，value 为 chatPublicKey。

### 3. 搜索功能增强

**更新 `handleInviteSearch()` 函数：**

```typescript
const handleInviteSearch = async () => {
  const query = inviteSearchQuery.value.trim()

  if (!query) {
    inviteUserList.value = []
    userChatPublicKeys.value.clear()
    return
  }

  inviteSearching.value = true
  try {
    const result = await searchGroupsAndUsers({ query, size: '20' })

    if (result && result.users && result.users.length > 0) {
      inviteUserList.value = result.users

      // 批量获取用户的 chatPublicKey
      const metaIds = result.users.map(user => user.metaId)

      try {
        const userInfos = await BatchGetUsersEcdhPubkeyForPrivateChat({ metaIds })

        // 存储到 Map 中
        userChatPublicKeys.value.clear()
        if (userInfos && userInfos.length > 0) {
          userInfos.forEach(userInfo => {
            if (userInfo.chatPublicKey) {
              userChatPublicKeys.value.set(userInfo.metaid, userInfo.chatPublicKey)
            }
          })
        }

        console.log('获取到的用户 chatPublicKey:', userChatPublicKeys.value)
      } catch (error) {
        console.warn('获取用户 chatPublicKey 失败:', error)
        // 即使失败也继续显示用户列表，但邀请按钮会被禁用
      }
    } else {
      inviteUserList.value = []
      userChatPublicKeys.value.clear()
    }
  } catch (error) {
    console.error('搜索用户失败:', error)
    inviteUserList.value = []
    userChatPublicKeys.value.clear()
    ElMessage.error('搜索失败')
  } finally {
    inviteSearching.value = false
  }
}
```

**关键改进：**

1. 搜索成功后自动批量获取所有用户的 chatPublicKey
2. 将结果存储在 Map 中以便快速查询
3. 即使获取失败也不影响用户列表显示，只是邀请按钮会被禁用

### 4. 邀请逻辑增强

**更新 `handleInviteUser()` 函数：**

```typescript
const handleInviteUser = async (user: SearchUserItem) => {
  if (!currentChannelInfo.value) return

  try {
    const isPrivateGroup = currentChannelInfo.value.roomJoinType === '100'

    if (isPrivateGroup && !currentChannelInfo.value.passwordKey) {
      ElMessage.error('私密群聊密钥未设置')
      return
    }

    // 检查用户的 chatPublicKey
    const userChatPublicKey = userChatPublicKeys.value.get(user.metaId)

    if (isPrivateGroup) {
      // 私密群聊必须有 chatPublicKey
      if (!userChatPublicKey) {
        ElMessage.warning('该用户未开通私聊，无法邀请到私密群聊')
        return
      }

      // TODO: 使用 ECDH 协商密钥加密 passwordKey
      // const ecdh = await getEcdhPublickey(userChatPublicKey)
      // const encryptedPasscode = encrypt(currentChannelInfo.value.passwordKey, ecdh.secret)

      const groupId = currentChannelInfo.value.id
      const passcode = currentChannelInfo.value.passwordKey
      const inviteUrl = `${window.location.origin}/channels/private/${groupId}?passcode=${passcode}`

      copy(inviteUrl)
      ElMessage.success(`已生成私密群聊邀请链接并复制到剪贴板`)

      console.log('私密群聊邀请链接:', inviteUrl)
      console.log('被邀请用户:', user)
      console.log('用户 chatPublicKey:', userChatPublicKey)
    } else {
      // 公开群聊逻辑保持不变
      const groupId = currentChannelInfo.value.id
      const inviteUrl = `${window.location.origin}/channels/public/${groupId}`

      copy(inviteUrl)
      ElMessage.success(`已生成群聊邀请链接并复制到剪贴板`)

      console.log('公开群聊邀请链接:', inviteUrl)
      console.log('被邀请用户:', user)
    }

    showInviteModal.value = false
  } catch (error) {
    console.error('生成邀请链接失败:', error)
    ElMessage.error('生成邀请链接失败')
  }
}
```

**关键改进：**

1. 从 Map 中获取用户的 chatPublicKey
2. 私密群聊强制检查 chatPublicKey，如果没有则显示警告并阻止邀请
3. 在控制台输出 chatPublicKey 用于调试（后续可用于 ECDH 加密）

### 5. UI 增强

**新增辅助函数：**

```typescript
// 判断是否为私密群聊
const isPrivateGroup = computed(() => {
  return currentChannelInfo.value?.roomJoinType === '100'
})

// 检查用户是否可以被邀请（私密群聊需要 chatPublicKey）
const canInviteUser = (user: SearchUserItem): boolean => {
  if (!isPrivateGroup.value) {
    // 公开群聊都可以邀请
    return true
  }
  // 私密群聊需要检查是否有 chatPublicKey
  return userChatPublicKeys.value.has(user.metaId)
}

// 获取邀请按钮的提示文本
const getInviteButtonTooltip = (user: SearchUserItem): string => {
  if (!isPrivateGroup.value) {
    return i18n.t('talk.invite')
  }
  if (userChatPublicKeys.value.has(user.metaId)) {
    return i18n.t('talk.invite')
  }
  return i18n.t('talk.user_chat_not_enabled')
}
```

**模板更新：**

```vue
<el-tooltip :content="getInviteButtonTooltip(user)" placement="top" :disabled="canInviteUser(user)">
  <ElButton
    type="primary"
    size="small"
    :disabled="!canInviteUser(user)"
    @click="handleInviteUser(user)"
  >
    {{ $t('Talk.Channel.invite') }}
  </ElButton>
</el-tooltip>
```

**UI 改进：**

1. 邀请按钮根据用户是否有 chatPublicKey 自动启用/禁用
2. 禁用状态下鼠标悬停显示提示信息
3. 提示信息国际化支持（中英文）

### 6. 国际化支持

**文件：** `src/languages/zh.json` 和 `src/languages/en.json`

**新增翻译：**

```json
// zh.json
{
  "talk": {
    "user_chat_not_enabled": "该用户未开通私聊"
  }
}

// en.json
{
  "talk": {
    "user_chat_not_enabled": "User has not enabled private chat"
  }
}
```

## 用户体验流程

### 公开群聊邀请

1. 群主点击"邀请成员"按钮
2. 输入搜索关键字
3. 系统自动搜索用户并获取 chatPublicKey（后台执行）
4. 显示用户列表，所有用户的邀请按钮都可用
5. 点击"邀请"按钮生成公开群聊链接并复制

### 私密群聊邀请

1. 群主点击"邀请成员"按钮
2. 输入搜索关键字
3. 系统自动搜索用户并获取 chatPublicKey
4. 显示用户列表：
   - **有 chatPublicKey 的用户**：邀请按钮正常显示，可点击
   - **无 chatPublicKey 的用户**：邀请按钮禁用，鼠标悬停显示"该用户未开通私聊"
5. 点击可用的邀请按钮生成私密群聊链接并复制（当前为未加密版本）

## 安全性说明

### 当前状态

- ✅ chatPublicKey 获取已实现
- ✅ 未开通私聊的用户无法被邀请到私密群聊
- ⏳ passwordKey 仍以明文形式在 URL 中传输（临时方案）

### 下一步计划

1. 实现 ECDH 密钥协商
2. 使用协商密钥 AES 加密 passwordKey
3. 在邀请链接中传输加密后的 passcode
4. 接受邀请时使用相同的 ECDH 协商密钥解密

详见：`docs/PRIVATE_GROUP_ENCRYPTION.md`

## 测试要点

### 功能测试

1. **搜索功能**

   - [ ] 搜索用户能正常显示结果
   - [ ] 清空搜索框能清空结果列表
   - [ ] 搜索时正确显示加载状态

2. **chatPublicKey 获取**

   - [ ] 搜索后自动调用 BatchGetUsersEcdhPubkeyForPrivateChat
   - [ ] 正确存储到 userChatPublicKeys Map
   - [ ] 控制台正确输出 chatPublicKey 信息

3. **邀请按钮状态**

   - [ ] 公开群聊：所有用户的邀请按钮都可用
   - [ ] 私密群聊：有 chatPublicKey 的用户按钮可用
   - [ ] 私密群聊：无 chatPublicKey 的用户按钮禁用
   - [ ] 鼠标悬停正确显示提示信息

4. **邀请流程**
   - [ ] 公开群聊生成正确的邀请链接
   - [ ] 私密群聊生成包含 passcode 的邀请链接
   - [ ] 链接正确复制到剪贴板
   - [ ] 显示成功提示消息

### 异常处理测试

1. **API 失败**

   - [ ] 搜索 API 失败时显示错误提示
   - [ ] BatchGetUsersEcdhPubkeyForPrivateChat 失败时不影响用户列表显示
   - [ ] 所有按钮被禁用（因为没有 chatPublicKey）

2. **边界情况**
   - [ ] 搜索结果为空时正确显示
   - [ ] 用户列表为空时不调用 BatchGetUsersEcdhPubkeyForPrivateChat
   - [ ] 部分用户有 chatPublicKey，部分没有时正确处理

## 代码质量

### 优点

1. ✅ 清晰的职责分离（搜索、获取 key、UI 展示）
2. ✅ 完善的错误处理
3. ✅ 国际化支持
4. ✅ 用户友好的提示信息
5. ✅ 控制台日志便于调试

### 改进建议

1. 考虑添加 loading 状态指示器（获取 chatPublicKey 时）
2. 考虑添加重试机制（API 失败时）
3. 考虑缓存 chatPublicKey（避免重复请求）

## 依赖关系

```
ChannelMemberListDrawer.vue
  ↓
searchGroupsAndUsers (搜索用户)
  ↓
BatchGetUsersEcdhPubkeyForPrivateChat (获取 chatPublicKey)
  ↓
userChatPublicKeys Map (存储)
  ↓
canInviteUser (检查是否可邀请)
  ↓
handleInviteUser (生成邀请链接)
```

## 相关文件

- `src/views/talk/components/ChannelMemberListDrawer.vue` - 主要实现
- `src/api/talk.ts` - API 接口定义
- `src/languages/zh.json` - 中文翻译
- `src/languages/en.json` - 英文翻译
- `docs/PRIVATE_GROUP_ENCRYPTION.md` - 加密方案文档

## 后续工作

1. **高优先级**

   - [ ] 实现 ECDH 密钥协商
   - [ ] 实现 AES 加密/解密
   - [ ] 更新邀请链接使用加密 passcode

2. **中优先级**

   - [ ] 添加 chatPublicKey 缓存机制
   - [ ] 优化批量获取性能
   - [ ] 添加单元测试

3. **低优先级**
   - [ ] 添加邀请历史记录
   - [ ] 支持批量邀请
   - [ ] 邀请链接过期机制

## 总结

本次更新成功集成了 `BatchGetUsersEcdhPubkeyForPrivateChat` 接口，实现了私密群聊邀请前的资格检查。用户体验得到显著改善，未开通私聊的用户无法被邀请到私密群聊，避免了后续无法正常通信的问题。

下一步需要实现 ECDH + AES 加密方案，确保 passwordKey 在传输过程中的安全性。
