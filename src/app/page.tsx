import { AlertTriangle, Users, Eye, Clock, Activity, TrendingUp, Heart, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { triggerSyncingFailsafe } from "./channels/actions";
import { unstable_noStore as noStore } from "next/cache";
import { turso } from "@/lib/turso";
import EngagementChart from "./ba-analysis/EngagementChart";
import Link from "next/link";

export const dynamic = 'force-dynamic';
export const revalidate = 300;

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

/* ── Custom UI primitives (matches Figma Specs) ───────────────────────────── */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl ${className}`}>
      {children}
    </div>
  );
}

function Ava({ title, colors, size = 30 }: { title: string; colors: string[]; size?: number }) {
  return (
    <div
      className="rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-white"
      style={{
        width: size, height: size,
        background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`,
        fontSize: size * 0.45,
      }}
    >
      {(title || "?")[0].toUpperCase()}
    </div>
  );
}

function VphBadge({ vph, ratio }: { vph: number; ratio: number }) {
  const c = ratio >= 3
    ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
    : ratio >= 1.5
    ? "text-sky-400 bg-sky-400/10 border-sky-400/25"
    : "text-amber-400 bg-amber-400/10 border-amber-400/25";
  return (
    <span className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${c}`}>
      {fmt(vph)} VPH
    </span>
  );
}

function BreakoutCard({
  channel,
  video,
  chartData,
  colors,
  syncTime,
  relTimeStr
}: {
  channel: any;
  video: any;
  chartData: any[];
  colors: string[];
  syncTime: Date | null;
  relTimeStr: string;
}) {
  const { badgeCls, badgeLabel } = video
    ? video.spike_ratio >= 3
      ? { badgeCls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/25", badgeLabel: "🚀 Breakout" }
      : video.spike_ratio >= 1.5
      ? { badgeCls: "text-sky-400 bg-sky-400/10 border-sky-400/25", badgeLabel: "📈 Rising" }
      : video.spike_ratio >= 1
      ? { badgeCls: "text-white/50 bg-white/5 border-white/10", badgeLabel: "Top Performer" }
      : { badgeCls: "text-red-400/70 bg-red-400/10 border-red-400/20", badgeLabel: "Underperforming" }
    : { badgeCls: "text-white/20 bg-white/5 border-white/10", badgeLabel: "No data" };

  return (
    <Card className="overflow-hidden">
      {/* Channel Header Row */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Ava title={channel.title} colors={colors} size={30} />
          <div>
            <p className="text-sm font-semibold text-white">{channel.title || channel.id}</p>
            <p className="text-[10px] font-mono text-white/30">
              {channel.id} · synced {relTimeStr}
            </p>
          </div>
        </div>
        <span className={`text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full border ${badgeCls}`}>
          {badgeLabel}
        </span>
      </div>

      {!video ? (
        <div className="py-10 text-center text-sm font-mono text-white/20">No video data yet</div>
      ) : (
        <div className="flex flex-col md:flex-row min-h-[108px]">
          {/* Left: Video Information */}
          <div className="flex gap-4 p-5 flex-1 min-w-0">
            {video.thumbnail_url ? (
              <Link href={`/ba-analysis/video/${video.video_id}?channelId=${encodeURIComponent(channel.id)}`} className="flex-shrink-0">
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-24 h-[54px] rounded-lg object-cover bg-white/5 hover:opacity-80 transition-opacity"
                />
              </Link>
            ) : (
              <div className="w-24 h-[54px] rounded-lg bg-white/5 flex items-center justify-center text-[10px] text-white/20 font-mono flex-shrink-0">
                No image
              </div>
            )}
            <div className="min-w-0 flex-1">
              <Link href={`/ba-analysis/video/${video.video_id}?channelId=${encodeURIComponent(channel.id)}`} className="hover:text-violet-300 transition-colors">
                <p className="text-sm font-medium text-white/90 leading-snug mb-2 line-clamp-2">
                  {video.title}
                </p>
              </Link>
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <VphBadge vph={video.vph} ratio={video.spike_ratio} />
                {video.spike_ratio >= 3 && (
                  <span className="inline-block text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-md">
                    ×{video.spike_ratio.toFixed(2)} SPIKE
                  </span>
                )}
                {video.is_short && (
                  <span className="inline-block text-[10px] font-mono text-pink-400 bg-pink-400/10 border border-pink-400/25 px-1.5 py-0.5 rounded-md">
                    📱 Short
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-[10px] font-mono text-white/30 flex-wrap">
                <span>{fmt(video.view_count)} views</span>
                {video.like_count > 0 && (
                  <span className="flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" />{fmt(video.like_count)}
                  </span>
                )}
                {video.comment_count > 0 && (
                  <span className="flex items-center gap-0.5">
                    <MessageCircle className="w-2.5 h-2.5" />{fmt(video.comment_count)}
                  </span>
                )}
                <span className="text-white/15">·</span>
                {video.published_at ? (
                  <span>Published {new Date(video.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                ) : (
                  <span>Captured {new Date(video.captured_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Mini Sparkline */}
          <div className="w-full md:w-56 flex-shrink-0 border-t md:border-t-0 md:border-l border-white/[0.06] bg-white/[0.015] flex flex-col h-32 md:h-auto">
            <div className="flex items-center justify-between px-4 pt-3.5 pb-1">
              <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">VPH trend (48h)</p>
              <p className="text-[11px] font-mono font-semibold text-violet-400">{fmt(video.vph)}</p>
            </div>
            <div className="flex-1 px-1 pb-2 min-h-0">
              {chartData.length > 0 ? (
                <EngagementChart data={chartData} variant="sparkline" />
              ) : (
                <div className="h-full flex items-center justify-center text-[10px] font-mono text-white/10">
                  No chart data
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ── Dashboard Page (Server Component) ────────────────────────────────────── */

export default async function Dashboard() {
  noStore(); // Prevent Turso cache stale data
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure user profile exists in public.users table
  await supabase.from('users').upsert({ id: user.id });

  // Run syncing failsafe in the background
  triggerSyncingFailsafe().catch((e) => console.error("Failsafe run error:", e));

  let totalSubs = 0;
  let totalViews = 0;
  let lastSyncedTime: number = 0;

  // Query user channels & API key errors in parallel to reduce database latency
  const [userChannelsResult, keyErrorsResult] = await Promise.all([
    supabase
      .from("user_channels")
      .select("channels(id, title, subscriber_count, view_count, last_synced_at)")
      .eq("user_id", user.id),
    supabase
      .from("api_key_errors")
      .select("channel_id, error_message")
      .eq("user_id", user.id)
  ]);

  const userChannels = userChannelsResult.data;
  const keyErrors = keyErrorsResult.data;

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
  }

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

  // ── Fetch Trending Video per Channel ──
  const trendingMap = new Map<string, any>();
  const chartMap = new Map<string, any[]>();
  let avgTrendingVph = 0;

  if (channels.length > 0) {
    const channelIds = channels.map((c: any) => c.id);

    try {
      // 1. Fetch top trending video per channel from Turso
      const channelPlaceholders = channelIds.map(() => "?").join(", ");
      const trendingQuery = `
        WITH LatestSnapshots AS (
          SELECT 
            video_id,
            channel_id,
            vph,
            baseline_vph,
            view_count,
            captured_at,
            ROW_NUMBER() OVER (
              PARTITION BY video_id 
              ORDER BY captured_at DESC
            ) as rn
          FROM video_snapshots
          WHERE channel_id IN (${channelPlaceholders})
            AND captured_at >= datetime('now', '-4 hours')
            AND vph IS NOT NULL
        ),
        RankedTrending AS (
          SELECT 
            video_id,
            channel_id,
            vph,
            baseline_vph,
            view_count,
            captured_at,
            ROW_NUMBER() OVER (
              PARTITION BY channel_id 
              ORDER BY (vph / NULLIF(baseline_vph, 0.0)) DESC
            ) as trend_rn
          FROM LatestSnapshots
          WHERE rn = 1 AND baseline_vph > 0.0
        )
        SELECT video_id, channel_id, vph, baseline_vph, view_count, captured_at
        FROM RankedTrending
        WHERE trend_rn = 1;
      `;

      const trendingRes = await turso.execute({
        sql: trendingQuery,
        args: channelIds
      });

      const trendingRows = trendingRes.rows;

      if (trendingRows.length > 0) {
        const videoIds = trendingRows.map(row => String(row.video_id));
        const videoPlaceholders = videoIds.map(() => "?").join(", ");

        // 2. Fetch metadata from Supabase and 48-hour history from Turso in parallel
        const [supabaseResult, tursoHistoryResult] = await Promise.allSettled([
          supabase
            .from("videos")
            .select("id, title, thumbnail_url, published_at, is_short, like_count, comment_count")
            .in("id", videoIds),
          turso.execute({
            sql: `
              SELECT video_id, vph, baseline_vph, captured_at
              FROM video_snapshots
              WHERE video_id IN (${videoPlaceholders})
                AND captured_at >= datetime('now', '-48 hours')
              ORDER BY captured_at ASC;
            `,
            args: videoIds
          })
        ]);

        // Named error logging for batch queries
        if (supabaseResult.status === "rejected") {
          console.error("[supabase-metadata] fetch error:", supabaseResult.reason);
        }
        if (tursoHistoryResult.status === "rejected") {
          console.error("[turso-history] fetch error:", tursoHistoryResult.reason);
        }

        // Map Supabase metadata
        const metadataMap = new Map<string, any>();
        if (supabaseResult.status === "fulfilled" && supabaseResult.value.data) {
          supabaseResult.value.data.forEach(v => metadataMap.set(v.id, v));
        }

        // Map Turso History to chartMap
        if (tursoHistoryResult.status === "fulfilled") {
          tursoHistoryResult.value.rows.forEach((row: any) => {
            const vid = String(row.video_id);
            if (!chartMap.has(vid)) {
              chartMap.set(vid, []);
            }
            chartMap.get(vid)!.push({
              captured_at: row.captured_at,
              vph: Number(row.vph) || 0,
              baseline_vph: Number(row.baseline_vph) || 0
            });
          });
        }

        // Combine into final trendingMap
        let totalVphSum = 0;
        trendingRows.forEach((row: any) => {
          const channelId = String(row.channel_id);
          const videoId = String(row.video_id);
          const meta = metadataMap.get(videoId);
          const vph = Number(row.vph) || 0;
          const baseline = Number(row.baseline_vph) || 0;
          const spikeRatio = baseline > 0 ? vph / baseline : 0;

          totalVphSum += vph;

          trendingMap.set(channelId, {
            video_id: videoId,
            title: meta?.title || "Unknown Video",
            thumbnail_url: meta?.thumbnail_url || "",
            is_short: meta?.is_short || false,
            vph,
            baseline_vph: baseline,
            spike_ratio: spikeRatio,
            captured_at: row.captured_at,
            published_at: meta?.published_at || null,
            like_count: Number(meta?.like_count) || 0,
            comment_count: Number(meta?.comment_count) || 0,
            view_count: Number(row.view_count) || 0
          });
        });

        avgTrendingVph = Math.round(totalVphSum / trendingRows.length);
      }
    } catch (err) {
      console.error("[trending-fetch] error in batch querying:", err);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
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
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-2">Avg Breakout VPH</p>
              <p className="text-2xl font-mono font-semibold leading-none text-amber-300">
                {avgTrendingVph > 0 ? fmt(avgTrendingVph) : "—"}
              </p>
              <p className="text-[11px] font-mono text-white/25 mt-1.5">across breakout videos</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Activity className="w-4 h-4 text-white/35" />
            </div>
          </div>
        </div>
      </div>

      {/* Breakout Video Cards List (Matches Figma specs) */}
      <div className="space-y-4">
        {channels.length === 0 ? (
          <p className="py-8 text-center text-sm font-mono text-white/20">No channels added yet</p>
        ) : (
          channels.map((ch: any, idx: number) => {
            const colors = channelColors[idx % channelColors.length];
            const syncTime = ch.last_synced_at ? new Date(ch.last_synced_at) : null;
            const chSyncMins = syncTime ? Math.floor((Date.now() - syncTime.getTime()) / 6e4) : 0;
            const relTimeStr = syncTime ? relTime(syncTime) : "—";
            const trending = trendingMap.get(ch.id);
            const chartData = trending ? (chartMap.get(trending.video_id) || []) : [];

            return (
              <BreakoutCard
                key={ch.id}
                channel={ch}
                video={trending}
                chartData={chartData}
                colors={colors}
                syncTime={syncTime}
                relTimeStr={relTimeStr}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
