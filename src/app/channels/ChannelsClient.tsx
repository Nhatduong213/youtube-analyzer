"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import { addChannel, deleteChannel } from "./actions";
import { Plus, Trash2, Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";

/* ── Helpers ─────────────────────────────────────────────────── */

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

/** Deterministic gradient pair from a string seed */
function gradientFromId(id: string): [string, string] {
  const GRADIENTS: [string, string][] = [
    ["#8b5cf6", "#6366f1"],
    ["#ec4899", "#f43f5e"],
    ["#06b6d4", "#3b82f6"],
    ["#f59e0b", "#ef4444"],
    ["#10b981", "#14b8a6"],
    ["#a855f7", "#ec4899"],
    ["#6366f1", "#8b5cf6"],
    ["#f97316", "#eab308"],
    ["#0ea5e9", "#6366f1"],
    ["#22c55e", "#0ea5e9"],
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function relTime(d: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "—";
  const m = Math.floor((Date.now() - date.getTime()) / 6e4);
  if (m < 1) return "just now";
  if (m < 60) return m + "m ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + "h ago";
  return Math.floor(h / 24) + "d ago";
}

/* ── Avatar ──────────────────────────────────────────────────── */

function Ava({ title, id, size = 44 }: { title: string; id: string; size?: number }) {
  const [colorA, colorB] = useMemo(() => gradientFromId(id), [id]);
  const letter = title?.[0]?.toUpperCase() || "?";

  return (
    <div
      className="rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${colorA}, ${colorB})`,
        fontSize: size * 0.38,
      }}
    >
      {letter}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export default function ChannelsClient({ initialChannels }: { initialChannels: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addChannel(formData);
      if (res.success && res.channelId) {
        router.push(`/ba-analysis?channelId=${res.channelId}`);
      } else if (!res.success) {
        alert("Failed to add channel: " + res.error);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this channel?")) {
      setDeletingId(id);
      await deleteChannel(id);
      setDeletingId(null);
    }
  };

  /* ── Empty state ─────────────────────────────────────────── */
  if (initialChannels.length === 0) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-white">Channels</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">0 channels tracked</p>
        </div>

        {/* Add Channel card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white mb-3">Add Channel</h2>
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              name="channelId"
              required
              placeholder="Channel ID or @handle"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-violet-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              {isPending ? "Adding..." : "Add"}
            </button>
          </form>
        </div>

        {/* Empty placeholder */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl py-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
            <TrendingUp className="w-7 h-7 text-violet-400" />
          </div>
          <p className="text-sm font-mono text-white/25">Add your first channel to start tracking</p>
        </div>
      </div>
    );
  }

  /* ── Main view ───────────────────────────────────────────── */
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Channels</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">
          {initialChannels.length} channel{initialChannels.length !== 1 ? "s" : ""} tracked
        </p>
      </div>

      {/* Add Channel card */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-3">Add Channel</h2>
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            name="channelId"
            required
            placeholder="Channel ID or @handle"
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-white/20 font-mono outline-none focus:border-violet-500/50 transition-colors"
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {isPending ? "Adding..." : "Add"}
          </button>
        </form>
      </div>

      {/* Channel cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {initialChannels.map((ch) => (
          <div
            key={ch.id}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-colors group"
          >
            {/* Top row: avatar + title + delete */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <Ava title={ch.title || "?"} id={ch.id} size={44} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{ch.title || "Syncing..."}</p>
                  <p className="text-[11px] font-mono text-white/30 truncate">{ch.id}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(ch.id)}
                disabled={deletingId === ch.id}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-white/30 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all flex-shrink-0"
              >
                {deletingId === ch.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* 2×2 mini stats */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-0.5">Subscribers</p>
                <p className="text-xs font-mono font-semibold text-white/80">
                  {ch.subscriber_count ? fmt(ch.subscriber_count) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-0.5">Videos</p>
                <p className="text-xs font-mono font-semibold text-white/80">
                  {ch.video_count ? ch.video_count.toLocaleString() : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-0.5">Total Views</p>
                <p className="text-xs font-mono font-semibold text-white/80">
                  {ch.view_count ? fmt(ch.view_count) : "—"}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-mono text-white/25 uppercase tracking-widest mb-0.5">Last Sync</p>
                <p className="text-xs font-mono font-semibold text-white/80">
                  {relTime(ch.last_synced_at || ch.updated_at)}
                </p>
              </div>
            </div>

            {/* Analyze button */}
            <div className="pt-3 border-t border-white/10">
              <Link
                href={`/ba-analysis?channelId=${ch.id}`}
                className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-violet-400 hover:text-violet-300 hover:bg-violet-500/5 rounded-lg transition-colors"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                Analyze Channel
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
