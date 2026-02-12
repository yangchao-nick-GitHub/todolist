# Supabase Realtime 实时同步功能

## 功能说明

应用现已集成 Supabase Realtime 功能，实现多设备间的数据实时同步。

## 工作原理

### 1. **Realtime 订阅**
- 使用 `supabase.channel()` 创建针对用户的专用频道
- 监听 `todos` 表的所有变更事件（INSERT、UPDATE、DELETE）
- 通过 `user_id` 过滤器，确保只接收当前用户的数据变更

### 2. **事件类型**
- **INSERT**: 新增待办事项时触发
- **UPDATE**: 更新待办事项（完成状态、编辑内容）时触发
- **DELETE**: 删除待办事项时触发

### 3. **去重机制**
为了避免本地操作被重复处理，实现了智能去重：

- **本地操作追踪**: 使用 `recentLocalChanges` Set 记录本地最近操作的 todo ID
- **自动过期**: 操作记录 5 秒后自动清除
- **重复检测**: Realtime 收到事件时，检查是否为本地操作，如果是则忽略

```typescript
// 本地操作（当前设备）
addTodo() → optimistic update → 记录 ID 到 recentLocalChanges
                                                          ↓
                                                   Realtime INSERT 事件
                                                   ↓
                                          检测到重复 → 忽略更新

// 远程操作（其他设备）
                                     Realtime INSERT 事件
                                           ↓
                                     检测到新 ID → 应用更新
```

## 使用场景

### 场景 1: 多设备同步
```
设备 A（手机）     设备 B（电脑）
   |                      |
   | 添加 Todo          |
   | ──────────────────→  | 自动显示新 Todo
   |                      |
   |              标记完成      |
   |  ←──────────────────|  Todo 自动标记完成
   |                      |
```

### 场景 2: 多标签页同步
```
标签页 1         标签页 2
   |                  |
   | 删除 Todo         |
   | ──────────────→   | Todo 自动消失
   |                  |
   |         修改文本      |
   |  ←──────────────|  文本自动更新
   |                  |
```

## 技术实现

### 关键代码

```typescript
// 创建 Realtime 频道
const channel = supabase
  .channel(`todos:${user.id}`)
  .on(
    'postgres_changes',
    {
      event: '*',           // 监听所有事件
      schema: 'public',
      table: 'todos',
      filter: `user_id=eq.${user.id}`,  // 只监听当前用户的数据
    },
    (payload) => {
      // 处理变更事件
      handleRealtimeUpdate(payload);
    }
  )
  .subscribe();

// 清理订阅
return () => {
  supabase.removeChannel(channel);
};
```

### 状态管理

- **本地操作**: 使用 optimistic updates 立即更新 UI
- **远程操作**: 通过 Realtime 事件同步更新
- **去重保护**: 5 秒内忽略重复的 ID

## 调试

### 查看实时事件
打开浏览器控制台，可以看到：
```
Realtime 订阅已建立
Realtime 更新: { eventType: 'INSERT', new: {...} }
忽略本地操作的重复更新: abc-123-def
```

### 验证 Realtime 工作状态

1. 打开两个浏览器窗口（或两个设备）
2. 登录同一个账户
3. 在一个窗口添加/修改/删除 todo
4. 观察另一个窗口是否自动更新

## 注意事项

1. **Supabase 项目需要启用 Realtime**
   - 在 Supabase Dashboard → Database → Replication 中启用
   - `todos` 表的 Realtime 需要开启

2. **网络要求**
   - 需要 WebSocket 支持
   - 稳定的网络连接

3. **性能优化**
   - 使用 5 秒过期时间避免内存泄漏
   - 使用 Set 数据结构快速查找重复 ID

## 未来改进

- [ ] 添加同步状态指示器（显示 "正在同步..."）
- [ ] 处理离线模式
- [ ] 添加冲突解决策略
- [ ] 显示最后同步时间
