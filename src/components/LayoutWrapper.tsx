"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || pathname === "/privacy" || pathname === "/terms" || pathname.startsWith("/auth");
  const [collapsed, setCollapsed] = useState(false);

  if (isPublicPage) {
    return <main className="flex-1 overflow-auto">{children}</main>;
  }

  return (
    <>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden relative min-w-0">
        {children}
      </main>
    </>
  );
}
