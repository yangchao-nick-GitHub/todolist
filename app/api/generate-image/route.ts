import { NextRequest, NextResponse } from "next/server";

const DASHSCOPE_API_URL = "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation";

// 宽高比映射到尺寸
const aspectRatioToSize: Record<string, string> = {
  "9:16": "720*1280",  // 竖屏
  "16:9": "1280*720",  // 横屏
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, aspectRatio = "9:16" } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "请输入提示词" },
        { status: 400 }
      );
    }

    const apiKey = process.env.QWEN_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "API密钥未配置" },
        { status: 500 }
      );
    }

    const size = aspectRatioToSize[aspectRatio] || "720*1280";

    const response = await fetch(DASHSCOPE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "z-image-turbo",
        input: {
          messages: [
            {
              role: "user",
              content: [
                {
                  text: prompt,
                },
              ],
            },
          ],
        },
        parameters: {
          prompt_extend: false,
          size,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("图片生成失败:", data);
      return NextResponse.json(
        { error: data.message || "图片生成失败" },
        { status: response.status }
      );
    }

    // 解析返回的图片URL
    const imageUrl = data.output?.choices?.[0]?.message?.content?.find(
      (item: { image?: string }) => item.image
    )?.image;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "未能获取生成的图片" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageUrl,
      requestId: data.request_id,
    });
  } catch (error) {
    console.error("生成图片时出错:", error);
    return NextResponse.json(
      { error: "服务器错误，请稍后重试" },
      { status: 500 }
    );
  }
}