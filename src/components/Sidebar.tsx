"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BarChart3, Settings, Youtube, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "BA Analysis", href: "/ba-analysis", icon: BarChart3 },
  { name: "AI Assistant", href: "/ai-assistant", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-64 flex-col glass-card border-r border-y-0 border-l-0 border-border/50 bg-card/40 backdrop-blur-3xl relative z-10">
      <div className="flex h-16 items-center gap-3 px-6 py-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-[oklch(0.7_0.2_180)] text-primary-foreground shadow-lg shadow-primary/20">
          <Youtube className="h-6 w-6" />
        </div>
        <span className="text-lg font-bold text-gradient">BA Analyzer</span>
      </div>

      <nav className="flex-1 space-y-2 px-4 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                isActive
                  ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  isActive ? "scale-110" : "group-hover:scale-110"
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4">
        <div className="rounded-xl bg-muted/30 p-4 border border-border/50">
          <p className="text-xs text-muted-foreground">System Status</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-sm font-medium">All systems operational</span>
          </div>
        </div>
      </div>
    </div>
  );
}
