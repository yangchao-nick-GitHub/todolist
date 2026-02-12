-- ============================================
-- Todo List 数据库表和策略初始化
-- ============================================
-- 此脚本创建 todos 表及相关的 RLS 策略
-- 确保用户只能访问自己的待办事项

-- ============================================
-- 1. 创建 todos 表
-- ============================================

CREATE TABLE IF NOT EXISTS public.todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  image_url TEXT,  -- 添加图片URL字段
  completed BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc', now()) NOT NULL
);

-- ============================================
-- 2. 创建索引以提高查询性能
-- ============================================

-- 按用户索引：快速获取某个用户的所有 todos
CREATE INDEX IF NOT EXISTS todos_user_id_idx ON public.todos(user_id);

-- 按创建时间倒序索引：最新的显示在前面
CREATE INDEX IF NOT EXISTS todos_created_at_idx ON public.todos(created_at DESC);

-- ============================================
-- 3. 启用行级安全性（RLS）
-- ============================================

ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. 创建 RLS 策略
-- ============================================
-- 这些策略确保用户只能访问和操作自己的待办事项

-- 删除所有现有的 policies（如果存在）
DROP POLICY IF EXISTS "Users can view their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can insert their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can update their own todos" ON public.todos;
DROP POLICY IF EXISTS "Users can delete their own todos" ON public.todos;

-- 策略 1: 用户只能查看自己的 todos
CREATE POLICY "Users can view their own todos"
ON public.todos
FOR SELECT
USING (auth.uid() = user_id);

-- 策略 2: 用户只能插入自己的 todos
CREATE POLICY "Users can insert their own todos"
ON public.todos
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 策略 3: 用户只能更新自己的 todos
CREATE POLICY "Users can update their own todos"
ON public.todos
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 策略 4: 用户只能删除自己的 todos
CREATE POLICY "Users can delete their own todos"
ON public.todos
FOR DELETE
USING (auth.uid() = user_id);

-- ============================================
-- 5. 表结构说明
-- ============================================

-- 字段说明：
-- id: UUID，主键，自动生成的唯一标识符
-- user_id: UUID，外键关联到 auth.users 表，用于 RLS 策略
-- text: TEXT，待办事项的内容
-- image_url: TEXT，图片的 URL（可选）
-- completed: BOOLEAN，是否完成，默认为 false
-- created_at: TIMESTAMPTZ，创建时间，自动设置为当前 UTC 时间
-- updated_at: TIMESTAMPTZ，最后更新时间，自动设置为当前 UTC 时间

-- 安全说明：
-- 所有 CRUD 操作都需要通过 RLS 策略验证
-- auth.uid() 自动获取当前登录用户的 ID
-- 每个策略都确保 user_id 匹配当前用户
-- 外键 ON DELETE CASCADE 确保用户被删除后，其 todos 自动删除
