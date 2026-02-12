# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个基于 Next.js 15+ App Router 和 Supabase 构建的待办事项（Todo List）应用，具备实时多设备同步和图片上传功能。

### 核心特性
- **实时同步**: 使用 Supabase Realtime 实现多设备/多标签页间数据自动同步
- **图片上传**: 支持为待办事项添加图片附件（上传到 Supabase Storage）
- **完全类型安全**: 使用 TypeScript 和严格类型定义
- **认证系统**: 基于 Supabase Auth 的密码登录/注册流程
- **行级安全**: 使用 RLS (Row Level Security) 确保数据隔离

## 开发命令

### 核心命令
```bash
# 启动开发服务器（端口 3000）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 运行 ESLint 检查
npm run lint
```

### 开发环境要求
- Node.js 18+
- 有效的 Supabase 项目（需要启用 Realtime 和 Storage）
- `.env.local` 文件中配置环境变量

## 代码架构

### 应用结构
```
app/                      # Next.js App Router
├── api/                   # API 路由（服务端）
│   ├── todos/             # 待办事项 CRUD API
│   │   ├── route.ts      # GET (列表), POST (创建)
│   │   └── [id]/route.ts  # PATCH (更新), DELETE (删除)
│   └── upload-image/       # 图片上传到 Storage
├── auth/                   # 认证相关页面
│   ├── login/            # 登录
│   ├── sign-up/          # 注册
│   ├── forgot-password/   # 忘记密码
│   └── update-password/   # 更新密码
├── layout.tsx               # 根布局（暗色模式、主题）
├── page.tsx                 # 主页（TodoList 组件）
└── protected/               # 受保护的路由示例

components/               # React 组件
├── todo-list.tsx         # 核心待办事项组件（客户端）
├── auth-button.tsx        # 认证按钮（服务端）
├── auth-header.tsx         # 导航栏认证组件
└── ui/                    # shadcn/ui 基础组件

lib/                     # 工具库
├── supabase/
│   ├── server.ts          # 服务端 Supabase 客户端（基于 cookies）
│   └── client.ts          # 客户端 Supabase 客户端
└── utils.ts               # 通用工具函数（cn class merge）

sql/                     # 数据库初始化和迁移脚本
├── init.sql               # 创建 todos 表和 RLS 策略
├── add-image-url-column.sql  # 添加 image_url 字段
└── storage-setup.sql      # 配置 Supabase Storage bucket

docs/                    # 文档
└── REALTIME.md            # Realtime 功能详细说明
```

### Supabase 集成架构

#### 认证流程
```
客户端组件 → AuthButton (Server Component)
               ↓
         检查 cookies 中的 session
               ↓
         createServerClient() 读取用户状态
               ↓
         显示登录按钮或用户信息
```

#### 数据库操作流程
```
客户端操作 → API 路由（服务端）
               ↓
         createServerClient() 获取用户身份
               ↓
         Supabase Client 执行数据库操作
               ↓
         RLS 策略验证权限（user_id 匹配）
               ↓
         返回结果到客户端
```

#### Realtime 同步机制
```
Supabase Database 变更
       ↓
Realtime Server 推送事件
       ↓
客户端订阅监听 (postgres_changes)
       ↓
检查去重机制 (recentLocalChanges Set)
       ↓
更新本地状态 (todos State)
```

## 数据库 Schema

### todos 表结构
```sql
CREATE TABLE public.todos (
  id           UUID PRIMARY KEY,          -- UUID 主键
  user_id     UUID NOT NULL,             -- 关联 auth.users
  text         TEXT NOT NULL,             -- 待办事项内容
  image_url    TEXT,                      -- 图片 URL（可选）
  completed    BOOLEAN DEFAULT FALSE,        -- 完成状态
  created_at   TIMESTAMPTZ NOT NULL,      -- 创建时间
  updated_at   TIMESTAMPTZ NOT NULL       -- 更新时间
);
```

### RLS 策略
- **SELECT**: 用户只能查看自己的 todos (`auth.uid() = user_id`)
- **INSERT**: 用户只能创建自己的 todos
- **UPDATE**: 用户只能更新自己的 todos
- **DELETE**: 用户只能删除自己的 todos

### Storage 配置
- **Bucket 名称**: `todolist`
- **公开访问**: 是（图片可直接通过 URL 访问）
- **文件路径**: `{user_id}/{timestamp}.{extension}`
- **大小限制**: 5MB
- **允许格式**: JPG, PNG, GIF, WebP

## 组件架构

### 客户端组件 (Client Components)
标记为 `"use client"` 的组件，处理用户交互和本地状态：

#### TodoList (`components/todo-list.tsx`)
**职责：**
- 完整的 CRUD 操作界面
- 图片上传和预览
- Realtime 订阅管理
- 智能去重逻辑

**状态管理：**
```typescript
const [todos, setTodos] = useState<Todo[]>([]);
const [newTodo, setNewTodo] = useState("");
const [editingId, setEditingId] = useState<string | null>(null);
const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [imagePreview, setImagePreview] = useState<string>("");
const [recentLocalChanges, setRecentLocalChanges] = useState<Set<string>>(new Set());
```

**Realtime 集成：**
```typescript
// 订阅 todos 表变更
supabase
  .channel(`todos:${user.id}`)
  .on('postgres_changes', {
    event: '*',              // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'todos',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // 去重检查
    if (recentLocalChanges.has(recordId)) return;
    // 应用更新
  })
  .subscribe();
```

**图片上传流程：**
1. 用户选择文件 → `handleFileSelect` 验证类型和大小
2. 显示本地预览 → `setImagePreview` (FileReader)
3. 提交时上传 → `POST /api/upload-image` (FormData)
4. 获取 URL 并创建 todo → `POST /api/todos` (带 `image_url`)

### 服务端组件 (Server Components)
默认不标记 `"use client"`，处理服务端逻辑：

#### AuthButton (`components/auth-button.tsx`)
- 读取 cookies 中的用户 session
- 条件渲染登录/登出按钮
- 处理登出操作（清除 cookies）

## API 路由设计

### RESTful API 规范
```
GET    /api/todos        # 获取当前用户的所有 todos
POST   /api/todos        # 创建新的 todo（支持 image_url）
GET    /api/todos/:id    # (未实现，单个 todo 详情）
PATCH  /api/todos/:id    # 更新 todo (completed, text, image_url)
DELETE /api/todos/:id    # 删除 todo

POST   /api/upload-image  # 上传图片到 Storage
```

### 认证和权限模式
```typescript
// 所有 API 路由的统一模式
export async function POST(request: NextRequest) {
  // 1. 创建服务端客户端
  const supabase = await createClient();

  // 2. 验证用户身份（从 cookies 读取 session）
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  // 3. 执行数据库操作（RLS 自动确保 user_id 匹配）
  const { data, error } = await supabase
    .from("todos")
    .insert({ user_id: user.id, ... })
    .select()
    .single();

  // 4. 返回结果
  return NextResponse.json({ todo: data }, { status: 201 });
}
```

## 重要模式和约定

### Server vs Client 组件决策
- **使用 Client Component**: 需要用户交互、状态管理、实时更新
  - TodoList（复杂交互、Realtime 订阅）
  - 表单控件
- **使用 Server Component**: 可以在服务端执行、优化 SEO
  - AuthButton（读取 cookies）
  - 布局组件
  - 大部分页面

### 错误处理模式
```typescript
try {
  // API 调用
  const response = await fetch("/api/todos", { ... });

  if (!response.ok) {
    const error = await response.json();
    setInputError(error.error || "操作失败");
    return;
  }

  // 成功处理
  const data = await response.json();
  setTodos(data.todos);
} catch (error) {
  console.error("操作错误:", error);
  setInputError("操作失败，请重试");
}
```

### Optimistic Updates 模式
```typescript
// 1. 立即更新 UI（乐观更新）
setTodos((prev) => [newTodo, ...prev]);
setRecentLocalChanges((prev) => new Set(prev).add(newTodo.id));

// 2. 发送 API 请求
const response = await fetch("/api/todos", { ... });

// 3. Realtime 事件会被去重机制忽略（5 秒内）
```

### 类型安全模式
```typescript
// 明确的类型定义
type Todo = {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
  image_url?: string;  // 可选字段
};

// API 响应类型
interface TodoResponse {
  todo: Todo;
}

interface ErrorResponse {
  error: string;
}
```

## 开发注意事项

### Supabase 相关
1. **Realtime 功能依赖**: 必须在 Supabase Dashboard 中为 `todos` 表启用 Realtime
   - 路径: Database → Replication → 选择 todos 表 → Toggle Realtime
2. **Storage 配置**: 需要创建 `todolist` bucket 并设置为公开
   - 参考 `sql/storage-setup.sql` 脚本
3. **环境变量**: 确保 `.env.local` 中配置了正确的 Supabase URL 和 Key

### 客户端状态管理
- 使用 `recentLocalChanges` Set 避免本地操作和 Realtime 事件冲突
- 记录在 5 秒后自动清理，防止内存泄漏
- 每个本地操作后都应该调用 `setRecentLocalChanges((prev) => new Set(prev).add(id))`

### 图片上传注意
- 图片上传是可选的，`image_url` 可以为 `null`
- 前端先上传到 `/api/upload-image`，获取 URL 后再创建 todo
- 文件大小限制：5MB，类型限制：image/jpeg, image/png, image/gif, image/webp

### 路由处理器注意事项
- App Router 的动态路由使用 `[id]` 文件夹
- `params` 是 Promise，需要 await: `const { id } = await params;`
- 所有 API 操作都应该验证用户身份和权限

### 代码风格
- **导入顺序**: React hooks → 第三方库 → 本地组件/工具
- **类型优先**: 优先使用 TypeScript 类型而非 `any`
- **错误显示**: 使用 `inputError` state 统一显示用户友好的错误消息
- **组件解耦**: TodoList 不直接调用 Supabase，通过 API 路由（便于扩展）

## 关键文件说明

| 文件 | 用途 | 重要说明 |
|------|------|----------|
| `lib/supabase/server.ts` | 服务端 Supabase 客户端 | 使用 cookies 管理 session，在 API 路由和 Server Components 中使用 |
| `lib/supabase/client.ts` | 客户端 Supabase 客户端 | 在 Client Components 中使用，支持 Realtime 订阅 |
| `components/todo-list.tsx` | 核心业务组件 | 包含完整的 CRUD、图片上传、Realtime 同步逻辑 |
| `app/api/todos/route.ts` | 待办事项集合 API | GET (列表), POST (创建) |
| `app/api/todos/[id]/route.ts` | 单个待办事项 API | PATCH (更新), DELETE (删除) |
| `app/api/upload-image/route.ts` | 图片上传 API | 上传到 Supabase Storage，返回公开 URL |
| `sql/init.sql` | 数据库初始化 | 创建表、索引、RLS 策略 |
| `docs/REALTIME.md` | Realtime 功能文档 | 详细说明实时同步机制和测试方法 |

## 常见任务

### 添加新的 API 端点
1. 在 `app/api/` 下创建新文件夹或 `route.ts` 文件
2. 使用 `createClient()` 从 `@/lib/supabase/server` 导入服务端客户端
3. 验证用户身份：`const { data: { user } } = await supabase.auth.getUser()`
4. 使用 `NextResponse.json()` 返回 JSON 响应
5. 参考现有路由的错误处理模式

### 修改数据库结构
1. 在 `sql/` 目录创建新的迁移脚本
2. 使用 `ALTER TABLE` 添加新列或 `CREATE TABLE` 创建新表
3. 更新 TypeScript 类型定义（如果影响客户端代码）
4. 在 Supabase Dashboard 的 SQL Editor 中测试脚本
5. 更新 RLS 策略以包含新表/列

### 添加新的客户端组件
1. 在文件顶部添加 `"use client";` 指令
2. 从 `@/lib/supabase/client` 导入客户端：`import { createClient } from "@/lib/supabase/client"`
3. 使用 `useState` 管理组件状态
4. 遵循现有的组件结构和样式模式（Tailwind CSS）

### 主题和样式
- 使用 `next-themes` 实现暗色/亮色模式切换
- Tailwind CSS 类名遵循 `background-foreground` 命名约定
- shadcn/ui 组件位于 `components/ui/` 目录
- 使用 `cn()` 工具函数合并条件类名

### 调试 Realtime 问题
1. 打开浏览器控制台查看 "Realtime 更新:" 日志
2. 在 Supabase Dashboard 检查 Realtime 是否启用（Database → Replication）
3. 验证用户是否登录（Realtime 订阅需要 `user.id`）
4. 检查 filter 配置：`user_id=eq.${user.id}` 是否正确
5. 查看网络面板的 WebSocket 连接状态

参考 `docs/REALTIME.md` 获取更多 Realtime 调试信息。
