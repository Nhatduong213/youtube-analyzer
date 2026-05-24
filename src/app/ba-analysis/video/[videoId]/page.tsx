import { createClient } from "@/lib/supabase-server";
import { turso } from "@/lib/turso";
import { ArrowLeft, Activity, CalendarDays, Tag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import EngagementChart from "../../EngagementChart";

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

export default async function VideoAnalysis({ params }: { params: { videoId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { videoId } = params;

  // 1. Fetch Video Metadata (Supabase)
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
        SELECT captured_at, vph, baseline_vph 
        FROM video_snapshots 
        WHERE video_id = ?
        ORDER BY captured_at DESC 
        LIMIT 48
      `,
      args: [videoId]
    });
    
    hourlyData = rs.rows.map(row => ({
      captured_at: new Date(row.captured_at as string).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/ba-analysis?channelId=${video.channel_id}`}
          className="w-9 h-9 rounded-lg bg-white/[0.06] flex items-center justify-center text-white/35 hover:text-white/60 hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-white truncate">{video.title}</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">
            {channelTitle} · Published {new Date(video.published_at).toLocaleDateString()}
          </p>
        </div>
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
                <div className="flex justify-between items-center pb-2 border-b border-white/[0.05]">
                  <span className="text-[10px] font-mono text-white/35 uppercase tracking-widest">Video ID</span>
                  <span className="text-[10px] font-mono text-white/50 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md">
                    {video.id}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-white/[0.05]">
                  <span className="text-[10px] font-mono text-white/35 uppercase tracking-widest">Channel</span>
                  <span className="text-[10px] font-mono text-white/50 px-2 py-0.5 bg-white/5 border border-white/10 rounded-md">
                    {video.channel_id}
                  </span>
                </div>
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
                <p className="text-[11px] font-mono text-white/25 mt-0.5">Views Per Hour tracking</p>
              </div>
            </div>
            {hourlyData.length > 0 ? (
              <EngagementChart data={hourlyData} />
            ) : (
              <div className="h-60 flex items-center justify-center text-sm font-mono text-white/20 border border-dashed border-white/10 rounded-lg">
                No VPH data available in the last 48 hours.
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
