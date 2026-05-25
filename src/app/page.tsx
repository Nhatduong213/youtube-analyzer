import { AlertTriangle, Users, Eye, Clock, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

/* ── Utility functions ────────────────────────────────────────────────────── */

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

function relTime(d: Date): string {
  const m = Math.floor((Date.now() - d.getTime()) / 6e4);
  if (m < 60) return m + "m ago";
  return Math.floor(m / 60) + "h ago";
}

/* ── VPH Badge component ──────────────────────────────────────────────────── */

function VphBadge({ vph, ratio }: { vph: number; ratio: number }) {
  const c = ratio >= 3
    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
    : ratio >= 1
    ? "text-sky-400 bg-sky-400/10 border-sky-400/25"
    : "text-red-400 bg-red-400/10 border-red-400/25";
  return (
    <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${c}`}>
      {fmt(vph)} VPH
    </span>
  );
}

/* ── Dashboard Page (Server Component) ────────────────────────────────────── */

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let totalSubs = 0;
  let totalViews = 0;
  let lastSyncedTime: number = 0;
  let blacklist: any[] = [];

  // Query through user_channels junction table
  const { data: userChannels } = await supabase
    .from("user_channels")
    .select("channels(id, title, subscriber_count, view_count, last_synced_at)")
    .eq("user_id", user.id);

  const channels = userChannels?.map((uc: any) => uc.channels).filter(Boolean) || [];

  if (channels.length > 0) {
    channels.forEach((ch: any) => {
      totalSubs += Number(ch.subscriber_count) || 0;
      totalViews += Number(ch.view_count) || 0;
      if (ch.last_synced_at) {
        const t = new Date(ch.last_synced_at).getTime();
        if (t > lastSyncedTime) lastSyncedTime = t;
      }
    });

    const channelIds = channels.map((c: any) => c.id);
    
    const { data: bList } = await supabase
      .from("daily_blacklist")
      .select("*, videos(title)")
      .in("channel_id", channelIds)
      .order("detected_at", { ascending: false })
      .limit(10);
      
    if (bList) {
      blacklist = bList;
    }
  }

  // Check for API key errors
  const { data: keyErrors } = await supabase
    .from("api_key_errors")
    .select("channel_id, error_message")
    .eq("user_id", user.id);

  const syncMins = lastSyncedTime ? Math.floor((Date.now() - lastSyncedTime) / 6e4) : 0;
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const syncCls = !lastSyncedTime
    ? "text-white/40 border-white/10 bg-white/5"
    : syncMins > 90
    ? "text-red-400 border-red-500/25 bg-red-500/10"
    : syncMins > 30
    ? "text-amber-400 border-amber-500/25 bg-amber-500/10"
    : "text-emerald-400 border-emerald-500/25 bg-emerald-500/10";

  /* Channel color palette for avatars */
  const channelColors = [
    ["#f59e0b", "#ef4444"],
    ["#3b82f6", "#06b6d4"],
    ["#ef4444", "#ec4899"],
    ["#8b5cf6", "#6366f1"],
    ["#10b981", "#06b6d4"],
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Dashboard</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">Overview · {today}</p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-mono px-3 py-1.5 rounded-full border ${syncCls}`}>
          <Clock className="w-3 h-3" />
          {lastSyncedTime ? `Last sync ${syncMins}m ago` : "Never synced"}
          {syncMins > 30 && lastSyncedTime > 0 && <AlertTriangle className="w-3 h-3" />}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Subscribers */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-2">Total Subscribers</p>
              <p className="text-2xl font-mono font-semibold leading-none text-violet-300">{fmt(totalSubs)}</p>
              <p className="text-[11px] font-mono text-white/25 mt-1.5">{channels.length} channels tracked</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Users className="w-4 h-4 text-white/35" />
            </div>
          </div>
        </div>

        {/* Total Views */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-2">Total Views</p>
              <p className="text-2xl font-mono font-semibold leading-none text-sky-300">{fmt(totalViews)}</p>
              <p className="text-[11px] font-mono text-white/25 mt-1.5">all-time across channels</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Eye className="w-4 h-4 text-white/35" />
            </div>
          </div>
        </div>

        {/* Avg VPH */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-2">Avg VPH</p>
              <p className="text-2xl font-mono font-semibold leading-none text-amber-300">—</p>
              <p className="text-[11px] font-mono text-white/25 mt-1.5">placeholder · calculating...</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-white/35" />
            </div>
          </div>
        </div>
      </div>

      {/* Blacklisted Videos */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <h2 className="text-sm font-semibold text-white">Blacklisted Videos</h2>
          <span className="ml-auto text-[10px] font-mono text-red-400 bg-red-400/10 border border-red-400/20 px-2 py-0.5 rounded">
            {blacklist.length} today
          </span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {(!blacklist || blacklist.length === 0) && (
            <p className="py-8 text-center text-sm font-mono text-white/20">No blacklisted videos today</p>
          )}
          {blacklist?.map((row: any, idx: number) => {
            const videoTitle = Array.isArray(row.videos) ? row.videos[0]?.title : row.videos?.title;
            const ratio = Number(row.multiplier) || 0;
            const vph = Number(row.vph_first_hour) || 0;

            return (
              <div key={idx} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white/75 truncate">{videoTitle || "Unknown Title"}</p>
                  <p className="text-[11px] font-mono text-white/25 mt-0.5">
                    {row.video_id} · {new Date(row.detected_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <VphBadge vph={vph} ratio={ratio} />
                  <span className="text-xs font-mono text-red-400 w-14 text-right">×{ratio.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Channel Overview */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
        <div className="px-5 py-4 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white">Channel Overview</h2>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {channels.length === 0 && (
            <p className="py-8 text-center text-sm font-mono text-white/20">No channels added yet</p>
          )}
          {channels.map((ch: any, idx: number) => {
            const colors = channelColors[idx % channelColors.length];
            const syncTime = ch.last_synced_at ? new Date(ch.last_synced_at) : null;
            const chSyncMins = syncTime ? Math.floor((Date.now() - syncTime.getTime()) / 6e4) : 0;

            return (
              <div key={ch.id} className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors">
                {/* Avatar */}
                <div
                  className="rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-white"
                  style={{
                    width: 36, height: 36,
                    background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
                    fontSize: 14,
                  }}
                >
                  {(ch.title || "?")[0].toUpperCase()}
                </div>

                {/* Name / handle */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white/80">{ch.title || ch.id}</p>
                  <p className="text-[11px] font-mono text-white/25">{ch.id}</p>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <p className="text-xs font-mono font-semibold text-white">{fmt(Number(ch.subscriber_count) || 0)}</p>
                    <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">subs</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-mono font-semibold text-white">{fmt(Number(ch.view_count) || 0)}</p>
                    <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">views</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-[11px] font-mono ${chSyncMins > 90 ? "text-amber-400" : "text-white/40"}`}>
                      {syncTime ? relTime(syncTime) : "—"}
                    </p>
                    <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">synced</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
