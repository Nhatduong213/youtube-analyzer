"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function ChannelSelector({ channels, activeId }: { channels: any[]; activeId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  if (!channels || channels.length === 0) return null;

  const active = channels.find((c) => c.id === activeId) || channels[0];

  return (
    <div className="relative" ref={dropRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 px-4 py-2.5 backdrop-blur-xl bg-white/5 border border-white/10 hover:border-white/20 rounded-xl transition-colors"
      >
        {/* Channel Avatar */}
        <div
          className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-white text-[11px]"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
        >
          {active.title?.[0] || "?"}
        </div>
        <span className="text-sm font-semibold text-white">{active.title}</span>
        <ChevronDown
          className={`w-4 h-4 text-white/35 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-56 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-20 backdrop-blur-2xl"
          style={{ background: "oklch(0.14 0.03 262)" }}
        >
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => {
                router.push(`/ba-analysis?channelId=${ch.id}`);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left ${ch.id === activeId ? "bg-white/5" : ""}`}
            >
              <div
                className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-white text-[11px]"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
              >
                {ch.title?.[0] || "?"}
              </div>
              <div>
                <p className="text-sm text-white">{ch.title}</p>
                {ch.view_count && (
                  <p className="text-[10px] font-mono text-white/30">
                    {ch.view_count >= 1e9
                      ? (ch.view_count / 1e9).toFixed(1) + "B"
                      : ch.view_count >= 1e6
                        ? (ch.view_count / 1e6).toFixed(1) + "M"
                        : ch.view_count >= 1e3
                          ? (ch.view_count / 1e3).toFixed(1) + "K"
                          : ch.view_count.toLocaleString()}{" "}
                    views
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
