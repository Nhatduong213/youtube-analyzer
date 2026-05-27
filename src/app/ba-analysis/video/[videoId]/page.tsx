import { createClient } from "@/lib/supabase-server";
import { turso } from "@/lib/turso";
import { ArrowLeft, Activity, CalendarDays, Tag } from "lucide-react";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import EngagementChart from "../../EngagementChart";
import { fmt, parseDuration, safeChannelId } from "../../data-utils";

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export const dynamic = 'force-dynamic';

export default async function VideoAnalysis(props: {
  params: Promise<{ videoId: string }> | { videoId: string };
  searchParams: Promise<{ channelId?: string; sort?: string }> | { channelId?: string; sort?: string };
}) {
  noStore(); // Prevent Turso HTTP cache stale data

  // Await for Next.js 15 compatibility (params/searchParams are Promises)
  const resolvedParams = await Promise.resolve(props.params);
  const searchParams = await Promise.resolve(props.searchParams);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { videoId } = resolvedParams;

  // Validate videoId: only valid 11-char YouTube video IDs reach the DB
  if (!VIDEO_ID_RE.test(videoId)) {
    notFound();
  }

  // 1. Fetch Video Metadata (Supabase) — now includes new columns
  const { data: video } = await supabase
    .from('videos')
    .select('*, channels(title)')
    .eq('id', videoId)
    .single();

  if (!video) {
    return (
      <div className="p-6 max-w-6xl mx-auto flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-semibold text-white mb-4">Video not found</h2>
        <Link
          href="/ba-analysis"
          className="text-violet-400 hover:text-violet-300 text-sm font-mono transition-colors"
        >
          Return to BA Analysis
        </Link>
      </div>
    );
  }

  // 2. Fetch Turso 48h VPH
  let hourlyData: any[] = [];
  try {
    const rs = await turso.execute({
      sql: `
        WITH RankedSnapshots AS (
          SELECT video_id, vph, baseline_vph, captured_at,
                 strftime('%Y-%m-%dT%H:00:00', captured_at) AS hour_bucket,
                 ROW_NUMBER() OVER (
                   PARTITION BY strftime('%Y-%m-%dT%H:00:00', captured_at)
                   ORDER BY captured_at DESC
                 ) as rn
          FROM video_snapshots
          WHERE video_id = ?
        )
        SELECT hour_bucket, captured_at, vph, baseline_vph
        FROM RankedSnapshots
        WHERE rn = 1
        ORDER BY hour_bucket DESC
        LIMIT 48
      `,
      args: [videoId]
    });
    
    hourlyData = rs.rows.map(row => ({
      captured_at: row.captured_at as string,
      vph: Number(row.vph) || 0,
      baseline_vph: Number(row.baseline_vph) || 0
    })).reverse();
  } catch (e) {
    console.error("Turso error:", e);
  }

  // 3. Fetch Daily Stats from Supabase
  let dailyStats: any[] = [];
  const { data: dailyData } = await supabase
    .from('daily_video_stats')
    .select('captured_date, view_count')
    .eq('video_id', videoId)
    .order('captured_date', { ascending: true });
    
  if (dailyData) {
    dailyStats = dailyData;
  }

  const channelTitle = (video.channels as any)?.title || "Unknown Channel";
  const duration = parseDuration(video.duration);

  // Safe back URL with channelId and sort preserved
  // Safe back URL with channelId and sort preserved
  const backChannelId = safeChannelId(searchParams.channelId) || video.channel_id;
  const backSort = searchParams.sort;
  const backParams = new URLSearchParams();
  if (backChannelId) backParams.set("channelId", backChannelId);
  if (backSort && backSort !== "vph") backParams.set("sort", backSort);
  const backQuery = backParams.toString();
  const backHref = `/ba-analysis${backQuery ? `?${backQuery}` : ""}`;

  // Find max views for ratio bar calculation
  const maxViews = dailyStats.length > 0 ? Math.max(...dailyStats.map(s => s.view_count)) : 1;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Link
          href={backHref}
          className="flex items-center gap-2 text-white/40 hover:text-white text-sm mb-5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Channel Analytics
        </Link>
        <h1 className="text-2xl font-semibold text-white truncate">{video.title}</h1>
        <p className="text-xs font-mono text-white/30 mt-0.5">
          {channelTitle} · Published {new Date(video.published_at).toLocaleDateString()}
          {duration !== "—" && ` · ${duration}`}
          {video.is_short && " · 📱 Short"}
        </p>
      </div>

      {/* Video Info Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Left Column: Thumbnail + Quick Stats */}
        <div className="md:col-span-1 space-y-4">
          {/* Thumbnail */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="aspect-video relative bg-white/5">
              {video.thumbnail_url ? (
                <img
                  src={video.thumbnail_url}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm font-mono text-white/20">
                  No Thumbnail
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                {[
                  { label: "Views", value: fmt(video.view_count || 0) },
                  { label: "Likes", value: fmt(video.like_count || 0) },
                  { label: "Comments", value: fmt(video.comment_count || 0) },
                  { label: "Duration", value: duration },
                  { label: "Type", value: video.is_short ? "📱 Short" : "🎬 Video" },
                  { label: "Video ID", value: video.id },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center pb-2 border-b border-white/[0.05]">
                    <span className="text-[10px] font-mono text-white/35 uppercase tracking-widest">{label}</span>
                    <span className="text-[10px] font-mono text-white/50 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md truncate max-w-[200px]">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Description</h3>
            <div className="text-xs font-mono text-white/40 whitespace-pre-wrap leading-relaxed max-h-[300px] overflow-y-auto">
              {video.description || "No description provided."}
            </div>
          </div>

          {/* Tags */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-white/35" />
              Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {Array.isArray(video.tags) && video.tags.length > 0 ? (
                video.tags.map((tag: string, i: number) => (
                  <span
                    key={i}
                    className="text-[10px] font-mono text-violet-400 bg-violet-400/10 border border-violet-400/20 px-2 py-0.5 rounded-md"
                  >
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-[11px] font-mono text-white/20">No tags found.</span>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Analytics */}
        <div className="md:col-span-2 space-y-4">
          {/* VPH Chart */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-white/35" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">VPH — Last 48 Hours</h3>
                <p className="text-[11px] font-mono text-white/25 mt-0.5">
                  {hourlyData.length > 0 && hourlyData.length < 24
                    ? `Showing ${hourlyData.length} hours of data`
                    : "Views Per Hour tracking"}
                </p>
              </div>
            </div>
            {hourlyData.length > 0 ? (
              <EngagementChart data={hourlyData} />
            ) : (
              <div className="h-60 flex items-center justify-center text-sm font-mono text-white/20 border border-dashed border-white/10 rounded-lg">
                No VPH data available. Collecting...
              </div>
            )}
          </div>

          {/* Daily Views */}
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-white/10">
              <CalendarDays className="w-4 h-4 text-white/35" />
              <h3 className="text-sm font-semibold text-white">Daily Views History</h3>
            </div>
            {dailyStats.length > 0 ? (
              <div className="divide-y divide-white/[0.05]">
                {dailyStats.map((stat, idx) => (
                  <div
                    key={idx}
                    className="flex justify-between items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                  >
                    <span className="text-sm text-white/60 font-mono">
                      {new Date(stat.captured_date).toLocaleDateString()}
                    </span>
                    <div className="flex-1 mx-6">
                      <div
                        className="h-1 rounded-full bg-violet-500/30"
                        style={{ width: `${(stat.view_count / maxViews) * 100}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-white/50 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md">
                      {stat.view_count.toLocaleString()} views
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-sm font-mono text-white/20">
                No daily stats recorded yet. Data will appear after 24 hours.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
