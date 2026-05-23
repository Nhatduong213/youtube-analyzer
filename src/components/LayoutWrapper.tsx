"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <main className="flex-1 overflow-hidden">{children}</main>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-8">
        <div className="mx-auto max-w-6xl">
          {children}
        </div>
      </main>
    </>
  );
}
