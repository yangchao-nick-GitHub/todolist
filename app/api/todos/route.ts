import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// 获取当前用户的 todos
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ todos: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}

// 创建新的 todo
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "待办事项内容不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        text: text.trim(),
        completed: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ todo: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}

// 更新 todo（切换完成状态或编辑文本）
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await context.params;
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
    const updateData: Record<string, unknown> = {};
    if (text !== undefined) updateData.text = text;
    if (completed !== undefined) updateData.completed = completed;
    if (image_url !== undefined) updateData.image_url = image_url;

    const { data, error } = await supabase
      .from("todos")
      .update(updateData)
      .eq("id", id)
      .eq("user_id", user.id)
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { id } = await context.params;

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
      .eq("user_id", user.id);

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
