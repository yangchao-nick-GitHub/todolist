"use client";

import { useState } from "react";
import { Sparkles, RefreshCw, Zap, AlertCircle, ChevronLeft, ChevronRight, X, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AspectRatio = "9:16" | "16:9";

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
  aspectRatio: AspectRatio;
}

export default function AIImagePage() {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [points, setPoints] = useState(5);
  const [error, setError] = useState("");
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("9:16");

  const handleGenerate = async () => {
    if (!prompt.trim() || points < 1 || isGenerating) return;

    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "图片生成失败");
      }

      setPoints((prev) => prev - 1);

      // 处理返回的4张图片
      const newImages: GeneratedImage[] = data.images.map((img: { url: string; requestId: string }) => ({
        id: img.requestId || `${Date.now()}-${Math.random()}`,
        url: img.url,
        prompt: prompt,
        createdAt: new Date().toISOString(),
        aspectRatio,
      }));

      setImages((prev) => [...newImages, ...prev]);
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成失败，请重试");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRecharge = () => {
    alert("充值功能开发中...");
  };

  const openPreview = (index: number) => {
    setPreviewIndex(index);
  };

  const closePreview = () => {
    setPreviewIndex(null);
  };

  const goToPrev = () => {
    if (previewIndex !== null && previewIndex > 0) {
      setPreviewIndex(previewIndex - 1);
    }
  };

  const goToNext = () => {
    if (previewIndex !== null && previewIndex < images.length - 1) {
      setPreviewIndex(previewIndex + 1);
    }
  };

  const currentImage = previewIndex !== null ? images[previewIndex] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 py-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* 顶部输入区域 */}
        <div className="mb-8">
          <div className="flex gap-4 items-center justify-center">
            {/* 输入框区域 - 更宽，可容纳三行 */}
            <div className="w-[600%] max-w-[1000px] flex items-center gap-2 bg-white/90 backdrop-blur rounded-2xl p-3 shadow-lg">
              {/* 左侧：宽高比选择 + 输入框 */}
              <div className="flex items-center gap-2 flex-1">
                {/* 宽高比选择 */}
                <div className="flex items-center gap-1 px-1 shrink-0">
                  <button
                    onClick={() => setAspectRatio("9:16")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
                      aspectRatio === "9:16"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    竖屏
                  </button>
                  <button
                    onClick={() => setAspectRatio("16:9")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium transition-colors ${
                      aspectRatio === "16:9"
                        ? "bg-purple-500 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Monitor className="w-4 h-4" />
                    横屏
                  </button>
                </div>

                {/* 输入框 - 多行文本，支持三行 */}
                <textarea
                  placeholder="输入您的创意描述，让AI为您生成精美图片..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isGenerating}
                  rows={2}
                  className="flex-1 border-0 bg-transparent text-base focus:outline-none resize-none min-h-[50px]"
                />
              </div>

              {/* 生成按钮 */}
              <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || points < 1 || isGenerating}
                className="h-10 px-6 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl shrink-0"
              >
                {isGenerating ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-1" />
                    生成
                  </>
                )}
              </Button>
            </div>

            {/* 点数显示 */}
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur px-4 py-3 rounded-xl">
              <div className="flex items-center gap-1">
                <Zap className="w-5 h-5 text-yellow-300" />
                <span className="text-white font-semibold text-lg">
                  {points} 点
                </span>
              </div>
              <Button
                onClick={handleRecharge}
                variant="secondary"
                size="sm"
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold"
              >
                充值
              </Button>
            </div>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-500/20 backdrop-blur px-4 py-3 rounded-xl text-white">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {/* 图片展示区域 */}
        <div className="grid grid-cols-4 gap-4 max-w-4xl mx-auto">
          {images.length > 0 ? (
            images.map((image, index) => (
              <div
                key={image.id}
                className={`rounded-xl overflow-hidden bg-white/20 backdrop-blur shadow-lg cursor-pointer hover:scale-105 transition-transform duration-300 ${
                  image.aspectRatio === "9:16" ? "aspect-[9/16]" : "aspect-video"
                }`}
                onClick={() => openPreview(index)}
              >
                <img
                  src={image.url}
                  alt={image.prompt}
                  className="w-full h-full object-cover"
                />
              </div>
            ))
          ) : (
            <>
              <div className="aspect-square rounded-xl border-2 border-dashed border-white/40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
                <Sparkles className="w-8 h-8 text-white/60" />
                <span className="text-white/60 text-xs text-center">
                  输入提示词
                </span>
              </div>
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center"
                >
                  <RefreshCw className="w-6 h-6 text-white/30" />
                </div>
              ))}
            </>
          )}
        </div>

        {/* 生成中状态 */}
        {isGenerating && (
          <div className="mt-8 flex justify-center">
            <div className="flex items-center gap-3 bg-white/20 backdrop-blur px-8 py-4 rounded-xl">
              <RefreshCw className="w-6 h-6 text-white animate-spin" />
              <span className="text-white font-semibold text-lg">
                正在生成图片，请稍候...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 图片预览弹框 */}
      <Dialog open={previewIndex !== null} onOpenChange={closePreview}>
        <DialogContent className="max-w-[98vw] w-full h-[95vh] bg-black/95 border-0 p-0">
          <DialogHeader className="absolute top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
            <DialogTitle className="text-white text-sm truncate max-w-[70%]">
              {currentImage?.prompt || ""}
            </DialogTitle>
          </DialogHeader>

          {/* 关闭按钮 */}
          <button
            onClick={closePreview}
            className="absolute top-4 right-4 z-20 w-12 h-12 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* 上一张按钮 */}
          {images.length > 1 && previewIndex !== null && previewIndex > 0 && (
            <button
              onClick={goToPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-16 h-16 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            >
              <ChevronLeft className="w-12 h-12" />
            </button>
          )}

          {/* 下一张按钮 */}
          {images.length > 1 && previewIndex !== null && previewIndex < images.length - 1 && (
            <button
              onClick={goToNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-16 h-16 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors"
            >
              <ChevronRight className="w-12 h-12" />
            </button>
          )}

          {/* 图片显示 - 全屏最大化 */}
          <div className="flex items-center justify-center w-full h-full p-4">
            {currentImage && (
              <img
                src={currentImage.url}
                alt={currentImage.prompt}
                className="max-w-full max-h-[90vh] object-contain rounded-lg"
              />
            )}
          </div>

          {/* 底部指示器 */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setPreviewIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === previewIndex
                      ? "bg-white"
                      : "bg-white/40 hover:bg-white/60"
                  }`}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}