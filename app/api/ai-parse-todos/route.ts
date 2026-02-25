import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// AI 解析并创建待办事项
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
      return NextResponse.json({ error: "输入内容不能为空" }, { status: 400 });
    }

    // 从环境变量获取配置
    const apiKey = process.env.OPENAI_API_KEY;
    const baseURL = process.env.OPENAI_BASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!apiKey || !baseURL || !serviceRoleKey) {
      return NextResponse.json(
        { error: "服务器配置错误，请联系管理员" },
        { status: 500 }
      );
    }

    // 调用 OpenAI API 解析待办事项
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    const prompt = `请解析以下文本，提取出所有待办事项。

要求：
1. 识别文本中的所有待办事项
2. 每个待办事项应该简洁明确
3. 如果只有一个事项，返回单个对象
4. 如果有多个事项，返回数组

输入文本：
${text}

请严格按照以下 JSON 格式返回（不要包含任何其他文字）：
{
  "todos": [
    {
      "text": "待办事项内容"
    }
  ]
}

或者如果是单个事项：
{
  "todos": [
    {
      "text": "待办事项内容"
    }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "你是一个专业的待办事项解析助手，能够从自然语言文本中准确提取待办事项，并以 JSON 格式返回。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json({ error: "AI 解析失败" }, { status: 500 });
    }

    // 解析 AI 返回的 JSON
    let parsedTodos;
    try {
      const parsed = JSON.parse(aiResponse);
      parsedTodos = parsed.todos || [];
    } catch (error) {
      console.error("JSON 解析错误:", error);
      return NextResponse.json({ error: "AI 返回格式错误" }, { status: 500 });
    }

    if (!parsedTodos.length || parsedTodos.length === 0) {
      return NextResponse.json({ error: "未识别到待办事项" }, { status: 400 });
    }

    // 使用 Service Role Key 创建 Supabase 客户端（绕过 RLS）
    const serviceRoleClient = createServiceRoleClient(serviceRoleKey);

    // 批量插入待办事项
    const todosToInsert = parsedTodos.map((todo: { text: string }) => ({
      user_id: user.id,
      text: todo.text.trim(),
      completed: false,
      image_url: null,
    }));

    const { data: insertedTodos, error: insertError } = await serviceRoleClient
      .from("todos")
      .insert(todosToInsert)
      .select();

    if (insertError) {
      console.error("插入错误:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        todos: insertedTodos,
        count: insertedTodos.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("AI 解析错误:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "服务器错误" },
      { status: 500 }
    );
  }
}
