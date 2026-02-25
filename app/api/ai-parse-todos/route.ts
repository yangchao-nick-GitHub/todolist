import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// AI 解析并创建待办事项（支持图片和文本）
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { text, imageUrl } = body;

    // 至少需要图片或文字
    if ((!text || text.trim() === "") && !imageUrl) {
      return NextResponse.json({ error: "请输入文字或上传图片" }, { status: 400 });
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

    // 调用 OpenAI API 解析待办事项（使用 qwen2.5-vl-72b-instruct）
    const openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseURL,
    });

    // 构建消息内容
    let userContent: string | Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

    if (imageUrl && text) {
      // 同时有图片和文字
      userContent = [
        { type: "text", text: `请结合图片和以下文字，提取出所有待办事项：\n\n${text}` },
        { type: "image_url", image_url: { url: imageUrl } },
      ];
    } else if (imageUrl) {
      // 只有图片
      userContent = [
        { type: "text", text: "请查看这张图片，提取出图片中所有的待办事项。" },
        { type: "image_url", image_url: { url: imageUrl } },
      ];
    } else {
      // 只有文字
      userContent = `请解析以下文本，提取出所有待办事项：\n\n${text}`;
    }

    const systemPrompt = `你是一个专业的待办事项识别助手。

任务：从图片或文字中准确识别并提取待办事项。

要求：
1. 只提取明确的待办事项（tasks, to-dos, 需要做的事情）
2. 保持原文和源语言，不要翻译或改写
3. 不要添加任何额外内容或解释
4. 不要包含已完成或完成标记的内容
5. 每个待办事项应该简洁明确
6. 识别列表、手写字、截图等各种形式的待办事项

输出格式：严格按照以下 JSON 格式返回，不要包含任何其他文字
{
  "todos": [
    { "text": "待办事项原文" }
  ]
}`;

    const completion = await openai.chat.completions.create({
      model: "qwen2.5-vl-72b-instruct",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: 0.1,
    });

    const aiResponse = completion.choices[0]?.message?.content;
    if (!aiResponse) {
      return NextResponse.json({ error: "AI 解析失败" }, { status: 500 });
    }

    // 解析 AI 返回的 JSON（可能包含 markdown 代码块）
    let parsedTodos;
    try {
      // 尝试提取 JSON（处理可能的前后文字或 markdown 代码块）
      let jsonStr = aiResponse.trim();

      // 移除可能的 markdown 代码块标记
      jsonStr = jsonStr.replace(/```json\n?/g, "").replace(/```\n?/g, "");

      // 提取 JSON 部分（如果有其他文字）
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);
      parsedTodos = parsed.todos || [];
    } catch (error) {
      console.error("JSON 解析错误:", error);
      console.error("AI 响应内容:", aiResponse);
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
      image_url: null, // 不保存原始图片
    }));

    const { data: insertedTodos, error: insertError } = await serviceRoleClient
      .from("todos")
      .insert(todosToInsert)
      .select();

    if (insertError) {
      console.error("插入错误:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log(`✅ [AI 解析] 用户 ${user.id} 成功插入 ${insertedTodos.length} 个待办事项`);

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
