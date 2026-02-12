"use client";

import { useState, useEffect } from "react";
import { Check, Circle, Plus, Trash2, Pencil, X, LogIn, Loader2, ImagePlus, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Todo = {
  id: string;
  text: string;
  completed: boolean;
  created_at: string;
  image_url: string | null;
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editImage, setEditImage] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);
      if (session?.user) {
        loadTodos();
      } else {
        setTodos([]);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  // 上传图片
  const handleImageUpload = async (file: File, todoId: string): Promise<string | null> => {
    if (!isAuthenticated) return null;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        setInputError(error.error || "上传失败");
        return null;
      }

      const data = await response.json();

      // 更新 todo 的 image_url
      const responseUpdate = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: data.imageUrl }),
      });

      if (!responseUpdate.ok) {
        const error = await responseUpdate.json();
        setInputError(error.error || "保存图片失败");
        return data.imageUrl;
      }

      // 更新本地状态
      setTodos((prevTodos) =>
        prevTodos.map((t) =>
          t.id === todoId ? { ...t, image_url: data.imageUrl } : t
        )
      );

      return data.imageUrl;
    } catch (error) {
      console.error("上传错误:", error);
      setInputError("上传失败，请重试");
      return null;
    }
  };

  // 删除图片
  const handleDeleteImage = async (todoId: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image_url: null }),
      });

      if (!response.ok) {
        const error = await response.json();
        setInputError(error.error || "删除图片失败");
        return;
      }

      setTodos((prevTodos) =>
        prevTodos.map((t) => (t.id === todoId ? { ...t, image_url: null } : t))
      );
    } catch (error) {
      console.error("删除错误:", error);
      setInputError("删除图片失败，请重试");
    }
  };

  const addTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setInputError("请先登录");
      setTimeout(() => setInputError(""), 2000);
      return;
    }

    if (newTodo.trim()) {
      setIsSaving(true);
      setInputError("");

      try {
        const response = await fetch("/api/todos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: newTodo.trim() }),
        });

        if (!response.ok) {
          const error = await response.json();
          setInputError(error.error || "添加失败");
          return;
        }

        const data = await response.json();
        setTodos([data.todo, ...todos]);
        setNewTodo("");
      } catch (error) {
        console.error("添加错误:", error);
        setInputError("添加失败，请重试");
      } finally {
        setIsSaving(false);
      }
    } else {
      setInputError("请输入待办事项内容");
      setTimeout(() => setInputError(""), 2000);
    }
  };

  const toggleTodo = async (id: string) => {
    if (!isAuthenticated) return;

    const todo = todos.find((t) => t.id === id);
    if (!todo) return;

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ completed: !todo.completed }),
      });

      if (!response.ok) {
        const error = await response.json();
        setInputError(error.error || "更新失败");
        return;
      }

      setTodos(
        todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
    } catch (error) {
      console.error("更新错误:", error);
      setInputError("更新失败，请重试");
    }
  };

  const deleteTodo = async (id: string) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        setInputError(error.error || "删除失败");
        return;
      }

      setTodos(todos.filter((t) => t.id !== id));
    } catch (error) {
      console.error("删除错误:", error);
      setInputError("删除失败，请重试");
    }
  };

  const startEditing = (todo: Todo) => {
    if (!isAuthenticated) return;
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditImage(todo.image_url || null);
    setInputError("");
  };

  const saveEdit = async () => {
    if (!isAuthenticated) return;
    const currentTodo = todos.find((t) => t.id === editingId);

    if (!currentTodo || !editText.trim() || !editingId) {
      setIsSaving(false);
      return;
    }

    setIsSaving(true);

    try {
      // 检查图片是否发生变化
      const imageChanged = currentTodo.image_url !== editImage;

      const updateData: { [key: string]: any } = {
        text: editText.trim(),
      };

      if (imageChanged) {
        updateData.image_url = editImage;
      }

      const response = await fetch(`/api/todos/${editingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        setInputError(error.error || "保存失败");
        return;
      }

      setTodos(
        todos.map((t) =>
          t.id === editingId
            ? { ...t, text: editText.trim(), image_url: editImage }
            : t
        )
      );
      setEditingId(null);
      setEditText("");
      setEditImage(null);
    } catch (error) {
      console.error("保存错误:", error);
      setInputError("保存失败，请重试");
    } finally {
      setIsSaving(false);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditImage(null);
    setInputError("");
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
            <div className="flex gap-2">
              <input
                type="text"
                value={newTodo}
                onChange={(e) => {
                  setNewTodo(e.target.value);
                  setInputError("");
                }}
                placeholder="添加新任务..."
                disabled={!isAuthenticated || isSaving}
                className={`flex-1 px-4 py-2 rounded-lg bg-white/20 border text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  inputError ? "border-red-400" : "border-white/30"
                } ${!isAuthenticated ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <button
                type="submit"
                disabled={!isAuthenticated || isSaving}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Plus className="w-6 h-6" />
                )}
              </button>
            </div>
            {inputError && (
              <p className="text-red-200 text-sm mt-1">{inputError}</p>
            )}
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

                <div className="flex-1 space-y-2">
                  {editingId === todo.id ? (
                    <div className="flex flex-col gap-2">
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
                        <label className="relative flex items-center justify-center">
                          {todo.image_url && !editImage && (
                            <span className="absolute right-2 text-white/50 text-xs">已有图片</span>
                          )}
                          <label
                            htmlFor={`image-${todo.id}`}
                            className="inline-flex items-center gap-2 px-2 py-1 rounded bg-white/20 hover:bg-white/30 text-white/80 text-sm transition-colors"
                          >
                            <ImagePlus className="w-4 h-4" />
                            <span>{editImage ? "更换" : "添加"}图片</span>
                          </label>
                        </div>
                        <input
                          id={`image-${todo.id}`}
                          type="file"
                          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleImageUpload(file, todo.id);
                            }
                          }}
                          disabled={isSaving}
                          className="hidden"
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
                    </div>
                  ) : (
                    <div className="flex-1 space-y-2">
                      {todo.image_url && (
                        <div className="relative w-full h-32 rounded-lg overflow-hidden bg-white/20 border border-white/30">
                          <img
                            src={todo.image_url}
                            alt={todo.text}
                            className="w-full h-full object-contain"
                          />
                          <button
                            onClick={() => handleDeleteImage(todo.id)}
                            disabled={!isAuthenticated || isSaving}
                            className="absolute top-2 right-2 p-1 bg-white/30 hover:bg-red-400 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="删除图片"
                          >
                            <XIcon className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                      <span
                        className={cn(
                          "flex-1 text-white transition-all duration-300",
                          todo.completed && "line-through opacity-75"
                        )}
                      >
                        {todo.text}
                      </span>
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
