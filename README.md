# Todo List App - 基于 Next.js 和 Supabase 的待办事项应用

<p align="center">
  <a href="#功能特性"><strong>功能特性</strong></a> ·
  <a href="#技术栈"><strong>技术栈</strong></a> ·
  <a href="#快速开始"><strong>快速开始</strong></a> ·
  <a href="#项目结构"><strong>项目结构</strong></a>
</p>

<p align="center">
  <img src="./app/todolist.png" alt="Todo List 应用预览" width="800">
</p>

## 功能特性

### 核心功能
- ✅ **用户认证**: 完整的登录、注册、忘记密码功能
- ✅ **待办事项管理**: 创建、编辑、删除、标记完成
- ✅ **实时同步**: 基于Supabase Realtime的多设备实时同步
- ✅ **图片上传**: 支持为待办事项添加图片附件
- ✅ **数据安全**: 行级安全策略(RLS)确保用户数据隔离
- ✅ **响应式设计**: 适配桌面和移动设备的现代UI

### 高级特性
- 🔄 **实时协作**: 多设备/多标签页间自动同步数据
- 📷 **图片附件**: 上传图片到Supabase Storage，支持预览
- 🔒 **安全防护**: 完整的权限验证和输入校验
- 🎨 **暗色模式**: 支持主题切换
- ⚡ **快速响应**: Optimistic Updates提供即时反馈

## 技术栈

### 前端框架
- **Next.js 16**: 使用最新的App Router架构
- **React 19**: 客户端和服务端组件
- **TypeScript**: 完全类型安全
- **Tailwind CSS**: 实用优先的CSS框架
- **shadcn/ui**: 高质量的React组件库

### 后端服务
- **Supabase Auth**: 用户认证和会话管理
- **Supabase Database**: PostgreSQL数据库和RLS策略
- **Supabase Storage**: 图片文件存储
- **Supabase Realtime**: 实时数据同步

### 开发工具
- **ESLint**: 代码质量检查
- **Turbopack**: Next.js优化的构建工具

## 快速开始

### 环境要求
- Node.js 18+
- npm/yarn/pnpm 包管理器
- Supabase账号（免费计划即可）

### 安装步骤

1. **克隆仓库**
   ```bash
   git clone <your-repo-url>
   cd with-supabase-app
   ```

2. **安装依赖**
   ```bash
   npm install
   # 或
   pnpm install
   ```

3. **配置环境变量**

   复制 `.env.example` 为 `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

   在 `.env.local` 中配置：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

   > **获取配置信息**: 在 [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api) 的 API 设置中找到

4. **数据库初始化**

   在Supabase Dashboard 的 SQL Editor 中运行 `sql/init.sql`，创建 `todos` 表和 RLS 策略。

5. **启用 Realtime**

   在Supabase Dashboard 中：
   - 进入 Database → Replication
   - 为 `todos` 表启用 Realtime

6. **配置 Storage（用于图片上传）**

   在Supabase Dashboard 的 SQL Editor 中运行 `sql/storage-setup.sql`，创建 `todolist` bucket。

7. **启动开发服务器**
   ```bash
   npm run dev
   ```

   访问 [http://localhost:3000](http://localhost:3000)

### 常用命令

```bash
# 开发
npm run dev          # 启动开发服务器（localhost:3000）

# 构建
npm run build        # 构建生产版本

# 生产运行
npm run start        # 启动生产服务器

# 代码检查
npm run lint         # 运行ESLint
```

## 项目结构

```
with-supabase-app/
├── app/                      # Next.js App Router
│   ├── api/               # API路由
│   │   ├── todos/         # 待办事项 CRUD API
│   │   └── upload-image/  # 图片上传API
│   ├── auth/              # 认证页面
│   │   ├── login/          # 登录
│   │   ├── sign-up/        # 注册
│   │   └── forgot-password/# 忘记密码
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 主页（TodoList组件）
│   └── protected/         # 受保护路由示例
│
├── components/               # React组件
│   ├── todo-list.tsx      # 核心业务组件
│   ├── auth-button.tsx     # 认证按钮
│   ├── auth-header.tsx     # 导航栏
│   └── ui/                # shadcn/ui基础组件
│
├── lib/                    # 工具库
│   └── supabase/         # Supabase客户端配置
│       ├── server.ts      # 服务端（cookies）
│       └── client.ts      # 客户端（Realtime）
│
├── sql/                    # 数据库脚本
│   ├── init.sql           # 表结构和RLS策略
│   ├── storage-setup.sql   # Storage配置
│   └── add-image-url-column.sql  # 迁移脚本
│
├── docs/                   # 文档
│   └── REALTIME.md        # Realtime功能说明
│
└── public/                 # 静态资源
```

## 数据库 Schema

### todos 表

```sql
CREATE TABLE public.todos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  image_url    TEXT,                    -- 图片URL（可选）
  completed    BOOLEAN DEFAULT FALSE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);
```

### 安全策略 (RLS)

所有操作都通过 Row Level Security 保护，确保用户只能访问自己的数据：

- **SELECT**: 用户只能查看自己的 todos
- **INSERT**: 用户只能创建自己的 todos
- **UPDATE**: 用户只能更新自己的 todos
- **DELETE**: 用户只能删除自己的 todos

### Storage

- **Bucket**: `todolist`
- **公开访问**: 是（图片可直接通过URL访问）
- **文件大小限制**: 5MB
- **支持格式**: JPG, PNG, GIF, WebP
- **存储路径**: `{user_id}/{timestamp}.{extension}`

## API 路由

### 待办事项 API

| 方法 | 路由 | 功能 |
|------|--------|------|
| GET | `/api/todos` | 获取当前用户的所有待办事项 |
| POST | `/api/todos` | 创建新的待办事项（支持image_url） |
| PATCH | `/api/todos/[id]` | 更新待办事项（completed、text、image_url） |
| DELETE | `/api/todos/[id]` | 删除待办事项 |

### 其他 API

| 方法 | 路由 | 功能 |
|------|--------|------|
| POST | `/api/upload-image` | 上传图片到Supabase Storage |

## 核心组件

### TodoList (`components/todo-list.tsx`)

**功能：**
- 完整的CRUD操作界面
- 图片上传和预览
- Supabase Realtime实时订阅
- 智能去重机制

**Realtime同步：**
```typescript
// 订阅todos表变更
supabase
  .channel(`todos:${user.id}`)
  .on('postgres_changes', {
    event: '*',              // INSERT, UPDATE, DELETE
    schema: 'public',
    table: 'todos',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // 处理远程变更
  })
  .subscribe();
```

**图片上传流程：**
1. 用户选择文件 → `handleFileSelect` 验证类型和大小
2. 显示本地预览 → `setImagePreview` (FileReader)
3. 提交时上传 → `POST /api/upload-image` (FormData)
4. 获取URL并创建todo → `POST /api/todos` (带`image_url`)

## 开发指南

### 添加新功能

1. **数据库变更**:
   - 在 `sql/` 目录创建迁移脚本
   - 更新 TypeScript 类型定义（如果影响客户端代码）

2. **API 路由**:
   - 在 `app/api/` 下创建新路由
   - 使用 `createClient()` 从 `@/lib/supabase/server` 导入服务端客户端
   - 验证用户身份：`const { data: { user } } = await supabase.auth.getUser()`
   - 使用 `NextResponse.json()` 返回JSON响应
   - 参考现有路由的错误处理模式

3. **客户端组件**:
   - 在 `components/` 下创建组件
   - 添加 `"use client";` 指令
   - 使用 `useState` 管理组件状态
   - 遵循现有的组件结构和样式模式（Tailwind CSS）

### 代码规范

- **TypeScript**: 使用严格类型，避免 `any`
- **错误显示**: 使用 `inputError` state 统一显示用户友好的错误消息
- **组件解耦**: TodoList 不直接调用Supabase，通过 API 路由（便于扩展）

### Realtime 调试

打开浏览器控制台，查看实时同步日志：
```
Realtime 订阅已建立
Realtime 更新: { eventType: 'INSERT', ... }
忽略本地操作的重复更新: xxx-id
```

详细说明请参考 [docs/REALTIME.md](./docs/REALTIME.md)

## 部署

### Vercel 部署

1. 推送代码到 GitHub
2. 在 [Vercel](https://vercel.com) 导入项目
3. 配置环境变量：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### 其他部署

兼容任何支持 Next.js 的托管平台：
- Vercel（推荐）
- Netlify
- Railway
- Render
- 自托管

## 文档

- [CLAUDE.md](./CLAUDE.md) - Claude Code 开发指南
- [docs/REALTIME.md](./docs/REALTIME.md) - Realtime 功能详细说明

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！
