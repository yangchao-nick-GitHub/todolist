import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// 更新 todo（切换完成状态或编辑文本）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { text, completed, image_url } = body;

    // 构建更新对象
    const updateData: { [key: string]: any } = {
      updated_at: new Date().toISOString(),
    };
    if (text !== undefined) updateData.text = text;
    if (completed !== undefined) updateData.completed = completed;
    if (image_url !== undefined) updateData.image_url = image_url;

    console.log(`📝 [PATCH /api/todos/${id}] 用户 ${user.id} 更新待办事项:`, updateData);

    // ⚡ 优化：使用 RLS 自动验证权限，无需额外查询
    // RLS 策略会确保只能更新自己的 todos
    const { data, error } = await supabase
      .from("todos")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id) // RLS 会验证这个条件
      .select()
      .single();

    if (error) {
      console.error(`❌ [PATCH /api/todos/${id}] 数据库更新失败:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      console.warn(`⚠️ [PATCH /api/todos/${id}] 待办事项不存在或无权操作`);
      return NextResponse.json({ error: "待办事项不存在或无权操作" }, { status: 404 });
    }

    console.log(`✅ [PATCH /api/todos/${id}] 更新成功:`, data);
    return NextResponse.json({ todo: data });
  } catch (error) {
    console.error(`❌ [PATCH /api/todos] 服务器错误:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}

// 删除 todo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await params;

    console.log(`🗑️ [DELETE /api/todos/${id}] 用户 ${user.id} 删除待办事项`);

    // ⚡ 优化：使用 RLS 自动验证权限，无需额外查询
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // RLS 会验证这个条件

    if (error) {
      console.error(`❌ [DELETE /api/todos/${id}] 数据库删除失败:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ [DELETE /api/todos/${id}] 删除成功`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(`❌ [DELETE /api/todos] 服务器错误:`, error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
