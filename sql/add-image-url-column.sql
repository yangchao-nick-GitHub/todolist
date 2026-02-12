-- ============================================
-- 添加 image_url 字段到现有的 todos 表
-- ============================================
-- 在 Supabase Dashboard 的 SQL Editor 中运行此脚本

-- 检查并添加 image_url 字段（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'todos'
        AND column_name = 'image_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.todos ADD COLUMN image_url TEXT;
        RAISE NOTICE '已成功添加 image_url 字段';
    ELSE
        RAISE NOTICE 'image_url 字段已存在，无需添加';
    END IF;
END $$;

-- 验证字段是否已添加
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'todos'
AND table_schema = 'public'
AND column_name = 'image_url';
