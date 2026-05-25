"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Tv, BarChart3, Bot, Settings, Activity, Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase-client";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Channels", href: "/channels", icon: Tv },
  { name: "BA Analysis", href: "/ba-analysis", icon: BarChart3 },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  const [email, setEmail] = useState<string>("...");
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.email) {
        setEmail(data.user.email);
      } else {
        setEmail("Guest");
      }
    });
  }, []);

  const firstLetter = email && email !== "..." ? email[0].toUpperCase() : "U";

  return (
    <aside
      className={`flex-shrink-0 flex flex-col border-r border-white/10 transition-all duration-300 ${collapsed ? "w-[60px]" : "w-56"}`}
      style={{ background: "oklch(0.11 0.02 258)" }}
    >
      {/* Logo section */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Activity className="w-4 h-4 text-white" />
        </div>
        {!collapsed && (
          <>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">YT Analyzer</p>
              <p className="text-[9px] font-mono text-white/25 uppercase tracking-wider">V14.0</p>
            </div>
            <button onClick={onToggle} className="p-1 text-white/20 hover:text-white/60 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>

      {/* Expand toggle when collapsed */}
      {collapsed && (
        <button
          onClick={onToggle}
          className="flex items-center justify-center py-3 text-white/25 hover:text-white/60 border-b border-white/10 transition-colors"
        >
          <Menu className="w-4 h-4" />
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              title={collapsed ? item.name : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${collapsed ? "justify-center" : ""} ${
                isActive
                  ? "bg-violet-600/15 text-violet-300 border border-violet-500/20"
                  : "text-white/35 hover:text-white/70 hover:bg-white/5 border border-transparent"
              }`}
            >
              <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-violet-400" : ""}`} />
              {!collapsed && <span className="font-medium truncate">{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User section */}
      <div className={`p-3 border-t border-white/10 flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white uppercase">
          {firstLetter}
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-white/50 truncate" title={email}>{email}</p>
            <p className="text-[9px] font-mono text-white/20">Pro plan</p>
          </div>
        )}
      </div>
    </aside>
  );
}
