"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogIn, UserPlus, LogOut } from "lucide-react";

export function AuthHeader() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      setIsAuthenticated(!!data.user);
    };

    checkAuth();

    const { data: authListener } = createClient().auth.onAuthStateChange(
      (event, session) => {
        setIsAuthenticated(!!session?.user);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (isAuthenticated) {
    return (
      <button
        onClick={handleLogout}
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium"
      >
        <LogOut className="w-4 h-4" />
        <span>退出登录</span>
      </button>
    );
  }

  return (
    <div className="flex gap-2">
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium"
      >
        <LogIn className="w-4 h-4" />
        <span>登录</span>
      </Link>
      <Link
        href="/auth/sign-up"
        className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors text-white text-sm font-medium"
      >
        <UserPlus className="w-4 h-4" />
        <span>注册</span>
      </Link>
    </div>
  );
}
