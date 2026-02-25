"use client";

import { useState, useEffect } from "react";
import { Check, Circle, Plus, Trash2, Pencil, X, LogIn, Loader2, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
  image_url?: string;
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [inputError, setInputError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  // 用于追踪本地最近操作的 todo ID，避免 Realtime 重复更新
  const [recentLocalChanges, setRecentLocalChanges] = useState<Set<string>>(new Set());

  const supabase = createClient();

  const loadTodos = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setIsAuthenticated(false);
      setTodos([]);
      setIsLoading(false);
      return;
    }

    setIsAuthenticated(true);

    try {
      const response = await fetch("/api/todos", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.error("加载失败:", response.statusText);
        setInputError("加载失败，请重试");
        return;
      }

      const data = await response.json();
      setTodos(data.todos || []);
    } catch (error) {
      console.error("加载错误:", error);
      setInputError("加载失败，请重试");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTodos();

    const { data: authData } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        loadTodos();
      } else {
        setTodos([]);
      }
    });

    // 创建 Realtime 频道订阅 todos 表的变更
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      channel = supabase
        .channel(`todos:${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'todos',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('Realtime 更新:', payload);
            const { eventType, new: newRecord, old: oldRecord } = payload;

            // 检查是否是本地操作导致的重复更新
            const recordId = eventType === 'DELETE' ? oldRecord?.id : newRecord?.id;
            if (!recordId) return;

            if (recentLocalChanges.has(recordId)) {
              console.log('忽略本地操作的重复更新:', recordId);
              // 清理过期的变更记录（5秒后）
              setTimeout(() => {
                setRecentLocalChanges((prev) => {
                  const next = new Set(prev);
                  next.delete(recordId);
                  return next;
                });
              }, 5000);
              return;
            }

            switch (eventType) {
              case 'INSERT':
                // 新增待办事项（来自其他设备）
                setTodos((prev) => {
                  // 避免重复添加
                  if (prev.some((t) => t.id === newRecord.id)) {
                    return prev;
                  }
                  return [newRecord as Todo, ...prev];
                });
                break;
              case 'UPDATE':
                // 更新待办事项（来自其他设备）
                setTodos((prev) =>
                  prev.map((todo) =>
                    todo.id === newRecord.id ? (newRecord as Todo) : todo
                  )
                );
                break;
              case 'DELETE':
                // 删除待办事项（来自其他设备）
                setTodos((prev) =>
                  prev.filter((todo) => todo.id !== oldRecord.id)
                );
                break;
            }
          }
        )
        .subscribe();

      console.log('Realtime 订阅已建立');
    };

    setupRealtimeSubscription();

    return () => {
      authData.subscription.unsubscribe();
      if (channel) {
        supabase.removeChannel(channel);
        console.log('Realtime 订阅已取消');
      }
    };
  }, []);

  const addTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setInputError("请先登录");
      setTimeout(() => setInputError(""), 2000);
      return;
    }

    // 至少需要图片或文字
    if (!newTodo.trim() && !selectedFile) {
      setInputError("请输入文字或上传图片");
      setTimeout(() => setInputError(""), 2000);
      return;
    }

    setIsSaving(true);
    setInputError("");

    try {
      // 如果有选择图片，先上传图片
      let imageUrl: string | undefined;
      if (selectedFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", selectedFile);

        const uploadResponse = await fetch("/api/upload-image", {
          method: "POST",
          body: formData,
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          setInputError(error.error || "图片上传失败");
          setIsUploading(false);
          setIsSaving(false);
          return;
        }

        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.imageUrl;
        setIsUploading(false);
      }

      const response = await fetch("/api/ai-parse-todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: newTodo.trim() || undefined,
          imageUrl: imageUrl,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setInputError(error.error || "AI 解析失败");
        return;
      }

      const data = await response.json();
      // 将新创建的待办事项添加到列表前面
      setTodos([...data.todos, ...todos]);
      setNewTodo("");
      clearImage();

      // 记录所有新操作，避免 Realtime 重复处理
      const newIds = new Set(recentLocalChanges);
      data.todos.forEach((todo: Todo) => newIds.add(todo.id));
      setRecentLocalChanges(newIds);
    } catch (error) {
      console.error("AI 解析错误:", error);
      setInputError("AI 解析失败，请重试");
    } finally {
      setIsSaving(false);
      setIsUploading(false);
    }
  };

  const toggleTodo = async (id: string) => {
    if (!isAuthenticated) return;

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    // 记录本次操作，避免 Realtime 重复处理
    setRecentLocalChanges((prev) => new Set(prev).add(id));

    // ⚡ 乐观更新：立即更新 UI，无需等待 API 响应
    const newCompletedState = !todo.completed;
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: newCompletedState } : t))
    );

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: newCompletedState }),
      });

      if (!response.ok) {
        // 如果失败，回滚 UI
        const error = await response.json();
        console.error("更新失败:", error);
        setInputError(error.error || "更新失败");
        setTodos(
          todos.map((t) => (t.id === id ? { ...t, completed: todo.completed } : t))
        );
        return;
      }

      // ✅ 验证后端返回的数据
      const data = await response.json();
      if (data.todo && data.todo.completed === newCompletedState) {
        console.log("✅ 后端更新成功:", data.todo);
      } else {
        console.warn("⚠️ 后端返回数据不匹配:", data);
      }
    } catch (error) {
      // 如果失败，回滚 UI
      console.error("❌ 更新错误:", error);
      setInputError("更新失败，请重试");
      setTodos(
        todos.map((t) => (t.id === id ? { ...t, completed: todo.completed } : t))
      );
    }
  };

  const deleteTodo = async (id: string) => {
    if (!isAuthenticated) return;

    // 记录本次操作，避免 Realtime 重复处理
    setRecentLocalChanges((prev) => new Set(prev).add(id));

    // ⚡ 乐观更新：立即从 UI 中删除
    const previousTodos = todos;
    setTodos(todos.filter((t) => t.id !== id));

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        // 如果失败，回滚 UI
        const error = await response.json();
        console.error("删除失败:", error);
        setInputError(error.error || "删除失败");
        setTodos(previousTodos);
        return;
      }

      // ✅ 验证后端删除成功
      const data = await response.json();
      if (data.success) {
        console.log("✅ 后端删除成功, id:", id);
      }
    } catch (error) {
      // 如果失败，回滚 UI
      console.error("❌ 删除错误:", error);
      setInputError("删除失败，请重试");
      setTodos(previousTodos);
    }
  };

  const startEditing = (todo: Todo) => {
    if (!isAuthenticated) return;
    setEditingId(todo.id);
    setEditText(todo.text);
    setInputError("");
  };

  const saveEdit = async () => {
    if (!isAuthenticated) return;
    if (editText.trim() && editingId) {
      setIsSaving(true);

      try {
        const response = await fetch(`/api/todos/${editingId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: editText.trim() }),
        });

        if (!response.ok) {
          const error = await response.json();
          setInputError(error.error || "保存失败");
          return;
        }

        setTodos(
          todos.map((t) => (t.id === editingId ? { ...t, text: editText.trim() } : t))
        );
        setEditingId(null);
        setEditText("");
        // 记录本次操作，避免 Realtime 重复处理
        setRecentLocalChanges((prev) => new Set(prev).add(editingId));
      } catch (error) {
        console.error("保存错误:", error);
        setInputError("保存失败，请重试");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setInputError("");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 验证文件类型
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setInputError("只支持 JPG、PNG、GIF、WebP 格式的图片");
      return;
    }

    // 验证文件大小（5MB）
    if (file.size > 5 * 1024 * 1024) {
      setInputError("图片大小不能超过 5MB");
      return;
    }

    setSelectedFile(file);

    // 创建预览
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setInputError("");
  };

  const clearImage = () => {
    setSelectedFile(null);
    setImagePreview("");
  };

  if (isLoading) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6">
            <div className="text-center text-white">加载中...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-xl p-6">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            待办事项
          </h1>

          {!isAuthenticated && (
            <div className="mb-6 p-4 rounded-lg bg-white/10 border border-white/20 text-center">
              <p className="text-white mb-3">请先登录以使用待办事项功能</p>
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white font-medium"
              >
                <LogIn className="w-4 h-4" />
                <span>前往登录</span>
              </Link>
            </div>
          )}

          <form onSubmit={addTodo} className="mb-6">
            <textarea
              value={newTodo}
              onChange={(e) => {
                setNewTodo(e.target.value);
                setInputError("");
              }}
              placeholder="输入待办事项或上传图片，AI 会自动解析...&#10;例如：&#10;- 明天下午3点开会&#10;- 买牛奶和面包&#10;- 完成项目报告&#10;&#10;提示：可以直接上传待办事项的截图或照片"
              disabled={!isAuthenticated || isSaving}
              rows={3}
              className={`w-full px-4 py-3 rounded-lg bg-white/20 border text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none ${
                inputError ? "border-red-400" : "border-white/30"
              } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
            />

            {/* 图片上传和预览区域 */}
            <div className="mt-3">
              {!imagePreview ? (
                <label className={`flex items-center justify-center gap-2 w-full px-4 py-3 rounded-lg border-2 border-dashed transition-colors duration-200 cursor-pointer ${
                  !isAuthenticated || isSaving
                    ? "border-white/20 opacity-50 cursor-not-allowed"
                    : "border-white/30 hover:border-white/50"
                }`}>
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileSelect}
                    disabled={!isAuthenticated || isSaving}
                    className="hidden"
                  />
                  <ImageIcon className="w-5 h-5 text-white/70" />
                  <span className="text-white/70 text-sm">点击上传待办事项图片（可选）</span>
                </label>
              ) : (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="预览"
                    className="w-full h-auto rounded-lg border border-white/30"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    disabled={isSaving}
                    className="absolute top-2 right-2 p-2 rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-3 space-y-3">
              {inputError && (
                <p className="text-red-200 text-sm text-center">{inputError}</p>
              )}

              <button
                type="submit"
                disabled={!isAuthenticated || isSaving || (!newTodo.trim() && !selectedFile)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving || isUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{isUploading ? "图片上传中..." : "AI 解析中..."}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>AI 解析并添加</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="space-y-3">
            {todos.map((todo) => (
              <div
                key={todo.id}
                className={cn(
                  "group flex items-start gap-3 p-3 rounded-lg transition-all duration-300",
                  "bg-white/10 hover:bg-white/20",
                  todo.completed && "opacity-75"
                )}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  disabled={!isAuthenticated || isSaving}
                  className="text-white hover:scale-110 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 mt-1"
                >
                  {todo.completed ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="flex-1 px-3 py-1 rounded bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") cancelEdit();
                        }}
                      />
                      <button
                        onClick={saveEdit}
                        disabled={isSaving}
                        className="p-1 text-white hover:text-green-300 transition-colors disabled:opacity-50"
                      >
                        {isSaving ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Check className="w-5 h-5" />
                        )}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-1 text-white hover:text-red-300 transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "text-white transition-all duration-300",
                          todo.completed && "line-through opacity-75"
                        )}
                      >
                        {todo.text}
                      </span>
                      {todo.image_url && (
                        <img
                          src={todo.image_url}
                          alt="任务图片"
                          className="mt-2 rounded-lg max-h-48 w-auto object-cover border border-white/20"
                        />
                      )}
                    </>
                  )}
                </div>

                {editingId !== todo.id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => startEditing(todo)}
                      disabled={!isAuthenticated || isSaving}
                      className="p-1 text-white hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      disabled={!isAuthenticated || isSaving}
                      className="p-1 text-white hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {todos.length === 0 && isAuthenticated && (
            <div className="text-center text-white/70 mt-8">
              还没有待办事项，添加一个开始吧！
            </div>
          )}

          {!isAuthenticated && todos.length === 0 && (
            <div className="text-center text-white/70 mt-8">
              登录后即可创建和管理您的待办事项
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
