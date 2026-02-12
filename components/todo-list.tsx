"use client";

import { useState, useEffect } from "react";
import { Check, Circle, Plus, Trash2, Pencil, X, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

export function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [inputError, setInputError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setIsAuthenticated(!!data.user);
      setIsLoading(false);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          setIsAuthenticated(!!session?.user);
        }
      );

      return () => {
        subscription.unsubscribe();
      };
    };

    checkAuth();
  }, []);

  const addTodo = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isAuthenticated) {
      setInputError("请先登录");
      setTimeout(() => setInputError(""), 2000);
      return;
    }

    if (newTodo.trim()) {
      setTodos([...todos, { id: Date.now(), text: newTodo.trim(), completed: false }]);
      setNewTodo("");
      setInputError("");
    } else {
      setInputError("请输入待办事项内容");
      setTimeout(() => setInputError(""), 2000);
    }
  };

  const toggleTodo = (id: number) => {
    if (!isAuthenticated) return;
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (id: number) => {
    if (!isAuthenticated) return;
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const startEditing = (todo: Todo) => {
    if (!isAuthenticated) return;
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const saveEdit = () => {
    if (!isAuthenticated) return;
    if (editText.trim() && editingId) {
      setTodos(todos.map(todo =>
        todo.id === editingId ? { ...todo, text: editText.trim() } : todo
      ));
      setEditingId(null);
      setEditText("");
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
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
                disabled={!isAuthenticated}
                className={`flex-1 px-4 py-2 rounded-lg bg-white/20 border text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 ${
                  inputError ? 'border-red-400' : 'border-white/30'
                } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
              <button
                type="submit"
                disabled={!isAuthenticated}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-6 h-6" />
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
                  "group flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
                  "bg-white/10 hover:bg-white/20",
                  todo.completed && "opacity-75"
                )}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  disabled={!isAuthenticated}
                  className="text-white hover:scale-110 transition-transform duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {todo.completed ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                {editingId === todo.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="flex-1 px-3 py-1 rounded bg-white/20 border border-white/30 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                    />
                    <button
                      onClick={saveEdit}
                      className="p-1 text-white hover:text-green-300 transition-colors"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-1 text-white hover:text-red-300 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <span
                    className={cn(
                      "flex-1 text-white transition-all duration-300",
                      todo.completed && "line-through opacity-75"
                    )}
                  >
                    {todo.text}
                  </span>
                )}

                {editingId !== todo.id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={() => startEditing(todo)}
                      disabled={!isAuthenticated}
                      className="p-1 text-white hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteTodo(todo.id)}
                      disabled={!isAuthenticated}
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
