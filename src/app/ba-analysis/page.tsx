import { createClient } from "@/lib/supabase-server";
import { turso } from "@/lib/turso";
import { redirect } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import EngagementChart from "./EngagementChart";
import ChannelSelector from "./ChannelSelector";
import VideoList from "./VideoList";
import { Trophy, Heart, MessageCircle, Eye, Tv, Activity, TrendingUp } from "lucide-react";
import {
  LATEST_SNAPSHOTS_SQL,
  VPH_CHART_SQL,
  mergeVideoData,
  safeChannelId,
  fmt,
} from "./data-utils";
import type { MergedVideo } from "./data-utils";

export const dynamic = 'force-dynamic';

export default async function BAAnalysis({ searchParams }: { searchParams: { channelId?: string; sort?: string } }) {
  noStore(); // Prevent Turso HTTP cache stale data

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure user profile exists in public.users table
  await supabase.from('users').upsert({ id: user.id });

  // Channel list for selector
  let channelsList: any[] = [];
  let activeChannelId: string | null = safeChannelId(searchParams.channelId) || null;

  // Fetch user's channels
  const { data: userChannels } = await supabase
    .from('user_channels')
    .select('channels(id, title, view_count, subscriber_count, last_synced_at)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  const channels = userChannels?.map((uc: any) => uc.channels).filter(Boolean) || [];
  if (channels.length > 0) {
    channelsList = channels;
    if (!activeChannelId) {
      activeChannelId = channels[0].id;
    }
  }

  // ── Parallel fetch with graceful degradation ──
  let chartData: any[] = [];
  let activeVideos: MergedVideo[] = [];
  let topPerformer: MergedVideo | null = null;

  if (activeChannelId) {
    const FETCH_NAMES = ['vph-chart', 'all-videos-vph', 'blacklist'] as const;

    const [chartResult, videosResult, blacklistResult] = await Promise.allSettled([
      // 1. VPH Chart data
      turso.execute({ sql: VPH_CHART_SQL, args: [activeChannelId] }),

      // 2. Latest snapshots per video + Supabase merge
      (async () => {
        const rs = await turso.execute({ sql: LATEST_SNAPSHOTS_SQL, args: [activeChannelId] });
        if (rs.rows.length === 0) return [];

        const videoIds = rs.rows.map(row => row.video_id as string);
        const { data: videosData } = await supabase
          .from('videos')
          .select('id, title, published_at, thumbnail_url, like_count, comment_count, duration, is_short')
          .in('id', videoIds);

        return mergeVideoData(
          rs.rows.map(r => ({
            video_id: r.video_id as string,
            vph: Number(r.vph) || 0,
            baseline_vph: Number(r.baseline_vph) || 0,
            view_count: Number(r.view_count) || 0,
            captured_at: r.captured_at as string,
          })),
          videosData || []
        );
      })(),

      // 3. Blacklisted video IDs
      (async () => {
        const { data: bl } = await supabase
          .from('daily_blacklist')
          .select('video_id')
          .eq('channel_id', activeChannelId!);
        return new Set(bl?.map(b => b.video_id) || []);
      })(),
    ]);

    // Named error logging
    [chartResult, videosResult, blacklistResult].forEach((r, i) => {
      if (r.status === 'rejected') {
        const msg = r.reason instanceof Error ? r.reason.message : JSON.stringify(r.reason);
        console.error(`[${FETCH_NAMES[i]}] channelId=${activeChannelId}:`, msg);
      }
    });

    // Extract results with fallbacks
    if (chartResult.status === 'fulfilled') {
      chartData = chartResult.value.rows.map(row => ({
        hour: row.hour as string,
        total_vph: Number(row.total_vph) || 0,
        video_count: Number(row.video_count) || 0,
      }));
    }

    const allVideos = videosResult.status === 'fulfilled' ? videosResult.value : [];
    const blacklistedIds = blacklistResult.status === 'fulfilled' ? blacklistResult.value : new Set<string>();

    // Filter: remove blacklisted
    activeVideos = allVideos.filter(v => !blacklistedIds.has(v.video_id));

    // Top performer: highest VPH non-short video
    topPerformer = activeVideos.find(v => !v.is_short) || null;
  }

  // ── Compute stats ──
  const selectedChannel = channels.find((c: any) => c.id === activeChannelId);
  const totalViews = chartData.reduce((s, d) => s + d.total_vph, 0);
  const avgVph = chartData.length > 0 ? Math.round(totalViews / chartData.length) : 0;
  const activeVideoCount = activeVideos.length;
  const chartHours = chartData.length;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">Channel Analytics</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">
            VPH tracking · video performance · real-time insights
          </p>
        </div>
        <ChannelSelector channels={channelsList} activeId={activeChannelId || ""} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Total Views (48h)",
            value: fmt(totalViews),
            sub: `from ${chartHours} hourly buckets`,
            color: "text-sky-300",
            Icon: Eye,
          },
          {
            label: "Active Videos",
            value: activeVideoCount.toString(),
            sub: "non-blacklisted",
            color: "text-emerald-300",
            Icon: Tv,
          },
          {
            label: "Avg VPH",
            value: fmt(avgVph),
            sub: "channel average",
            color: "text-violet-300",
            Icon: Activity,
          },
          {
            label: "Top VPH",
            value: topPerformer ? fmt(topPerformer.vph) : "—",
            sub: topPerformer ? "non-short peak" : "no data",
            color: "text-amber-300",
            Icon: TrendingUp,
          },
        ].map(({ label, value, sub, color, Icon }) => (
          <div
            key={label}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 flex justify-between items-start"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-2">
                {label}
              </p>
              <p className={`text-2xl font-mono font-semibold leading-none ${color}`}>{value}</p>
              <p className="text-[11px] font-mono text-white/25 mt-1.5">{sub}</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-white/35" />
            </div>
          </div>
        ))}
      </div>

      {/* Top Performer Card */}
      {topPerformer ? (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Top Performer</p>
          </div>
          <a
            href={`/ba-analysis/video/${topPerformer.video_id}${activeChannelId ? `?channelId=${encodeURIComponent(activeChannelId)}` : ""}`}
            className="flex items-center gap-5 hover:bg-white/[0.02] rounded-lg p-2 -m-2 transition-colors flex-wrap sm:flex-nowrap"
          >
            {topPerformer.thumbnail_url ? (
              <img
                src={topPerformer.thumbnail_url}
                alt={topPerformer.title}
                className="w-40 h-[90px] rounded-xl object-cover flex-shrink-0 bg-white/5 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ minWidth: 160 }}
              />
            ) : (
              <div className="w-40 h-[90px] rounded-xl flex-shrink-0 bg-white/5 flex items-center justify-center text-[10px] text-white/20 font-mono" style={{ minWidth: 160 }}>
                No img
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-white truncate hover:text-violet-300 transition-colors mb-2">{topPerformer.title}</p>
              <div className="flex items-center gap-2 flex-wrap mb-3">
                <span className="inline-block text-[10px] font-mono text-emerald-400 bg-emerald-400/10 border border-emerald-400/25 px-2 py-0.5 rounded-md font-semibold">
                  {fmt(topPerformer.vph)} VPH
                </span>
                {topPerformer.vph / (topPerformer.baseline_vph || 1) >= 3 && (
                  <span className="inline-block text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-md">
                    ×{(topPerformer.vph / (topPerformer.baseline_vph || 1)).toFixed(2)} SPIKE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs font-mono flex-wrap">
                <span className="text-white/50">
                  {fmt(topPerformer.view_count)} views
                </span>
                {topPerformer.like_count > 0 && (
                  <span className="flex items-center gap-1 text-white/40">
                    <Heart className="w-3 h-3" />
                    {fmt(topPerformer.like_count)}
                  </span>
                )}
                {topPerformer.comment_count > 0 && (
                  <span className="flex items-center gap-1 text-white/40">
                    <MessageCircle className="w-3 h-3" />
                    {fmt(topPerformer.comment_count)}
                  </span>
                )}
                <span className="text-[10px] font-mono text-white/15">
                  Peak at {new Date(topPerformer.captured_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </a>
        </div>
      ) : activeChannelId ? (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl py-12 flex flex-col items-center gap-3">
          <span className="text-2xl">📊</span>
          <p className="text-sm font-mono text-white/30">No active videos yet</p>
          <p className="text-xs font-mono text-white/15">
            Data will appear after the hourly tracker runs
          </p>
        </div>
      ) : null}

      {/* VPH Chart */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-sm font-semibold text-white">Channel VPH — 48h</h3>
            <p className="text-[11px] font-mono text-white/30 mt-0.5">
              {chartHours > 0 && chartHours < 24
                ? `Showing ${chartHours} hours of data`
                : "Sum of all active videos · views per hour"}
            </p>
          </div>
          {avgVph > 0 && (
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <div className="flex items-center gap-1.5 text-violet-400/70">
                <div className="w-4 border-t border-violet-400/60" />
                Avg {fmt(avgVph)} VPH
              </div>
            </div>
          )}
        </div>
        {chartData.length > 0 ? (
          <EngagementChart data={chartData} />
        ) : (
          <div className="h-60 flex items-center justify-center text-sm font-mono text-white/20 border border-dashed border-white/10 rounded-lg">
            Collecting data... VPH chart will appear after the first tracker run.
          </div>
        )}
      </div>

      {/* Video List */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Content</h3>
        <VideoList videos={activeVideos} channelId={activeChannelId} />
      </div>
    </div>
  );
}
