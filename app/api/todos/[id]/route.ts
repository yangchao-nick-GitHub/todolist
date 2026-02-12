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

    // 验证 todo 是否属于当前用户
    const { data: todoData, error: checkError } = await supabase
      .from("todos")
      .select("user_id")
      .eq("id", id)
      .single();

    if (checkError || !todoData || todoData.user_id !== user.id) {
      return NextResponse.json({ error: "无权操作此待办事项" }, { status: 403 });
    }

    // 构建更新对象
    const updateData: { [key: string]: any } = {};
    if (text !== undefined) updateData.text = text;
    if (completed !== undefined) updateData.completed = completed;
    if (image_url !== undefined) updateData.image_url = image_url;

    const { data, error } = await supabase
      .from("todos")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id) // 额外的安全检查
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ todo: data });
  } catch (error) {
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

    // 验证 todo 是否属于当前用户
    const { data: todoData, error: checkError } = await supabase
      .from("todos")
      .select("user_id")
      .eq("id", id)
      .single();

    if (checkError || !todoData || todoData.user_id !== user.id) {
      return NextResponse.json({ error: "无权操作此待办事项" }, { status: 403 });
    }

    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // 额外的安全检查

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
