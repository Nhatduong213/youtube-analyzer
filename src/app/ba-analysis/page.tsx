import { createClient } from "@/lib/supabase-server";
import { turso } from "@/lib/turso";
import { AlertTriangle } from "lucide-react";
import EngagementChart from "./EngagementChart";
import ChannelSelector from "./ChannelSelector";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toLocaleString();
}

function fmtRev(views: number, cpm: number): string {
  const e = (views / 1e3) * cpm;
  if (e >= 1e6) return "$" + (e / 1e6).toFixed(2) + "M";
  if (e >= 1e3) return "$" + (e / 1e3).toFixed(1) + "K";
  return "$" + e.toFixed(0);
}

export default async function BAAnalysis({ searchParams }: { searchParams: { channelId?: string; mainTab?: string; vidTab?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  let monthlyViews = 0;
  let engagementData: any[] = [];
  let channelsList: any[] = [];
  let spikingVideos: any[] = [];
  let highVphVideos: any[] = [];
  let allVideos: any[] = [];
  let activeChannelId = searchParams.channelId;
  const mainTab = searchParams.mainTab || "revenue";
  const vidTab = searchParams.vidTab || "all";

  if (user) {
    // Lấy toàn bộ channel của user qua user_channels junction table
    const { data: userChannels } = await supabase
      .from('user_channels')
      .select('channels(id, title, view_count)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });

    const channels = userChannels?.map((uc: any) => uc.channels).filter(Boolean) || [];
      
    if (channels.length > 0) {
      channelsList = channels;
      if (!activeChannelId) {
        activeChannelId = channels[0].id;
      }
    }

    if (activeChannelId) {
      const selectedChannel = channels?.find(c => c.id === activeChannelId);
      if (selectedChannel && selectedChannel.view_count) {
        // Giả sử lấy trung bình 5% tổng view lịch sử làm số view tháng (cho MVP)
        monthlyViews = Math.floor(selectedChannel.view_count * 0.05);
      }

      // Lấy data snapshot biểu đồ VPH từ Turso theo channel được chọn
      try {
        const rs = await turso.execute({
          sql: `
            SELECT captured_at, vph, baseline_vph 
            FROM video_snapshots 
            WHERE channel_id = ?
            ORDER BY captured_at DESC 
            LIMIT 24
          `,
          args: [activeChannelId]
        });
        
        engagementData = rs.rows.map(row => ({
          captured_at: new Date(row.captured_at as string).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          vph: Number(row.vph) || 0,
          baseline_vph: Number(row.baseline_vph) || 0
        })).reverse(); // Reverse để thời gian đi từ quá khứ đến hiện tại
      } catch (e) {
        console.error("Turso error:", e);
      }

      // Lấy top videos VPH (kết hợp Turso & Supabase)
      try {
        const rs = await turso.execute({
          sql: `
            SELECT video_id, vph, baseline_vph, view_count, captured_at
            FROM (
              SELECT video_id, vph, baseline_vph, view_count, captured_at,
                ROW_NUMBER() OVER (PARTITION BY video_id ORDER BY captured_at DESC) as rn
              FROM video_snapshots
              WHERE channel_id = ?
            )
            WHERE rn = 1
            ORDER BY vph DESC
            LIMIT 50
          `,
          args: [activeChannelId]
        });
        
        if (rs.rows.length > 0) {
          const videoIds = rs.rows.map(row => row.video_id);
          
          const { data: videosData } = await supabase
            .from('videos')
            .select('id, title, published_at, thumbnail_url')
            .in('id', videoIds);

          if (videosData) {
            const processedVideos = rs.rows.map(row => {
              const v = videosData.find(vid => vid.id === row.video_id);
              const baseline = Number(row.baseline_vph) || 0;
              const vph = Number(row.vph) || 0;
              const spike_ratio = baseline > 0 ? vph / baseline : 0;

              return {
                video_id: row.video_id,
                title: v?.title || 'Unknown Video',
                published_at: v?.published_at || new Date().toISOString(),
                thumbnail_url: v?.thumbnail_url || '',
                view_count: Number(row.view_count) || 0,
                vph,
                baseline_vph: baseline,
                captured_at: row.captured_at,
                spike_ratio
              };
            });
            
            allVideos = processedVideos.sort((a, b) => b.view_count - a.view_count);
            spikingVideos = processedVideos.filter(v => v.spike_ratio >= 3).sort((a, b) => b.spike_ratio - a.spike_ratio);
            highVphVideos = processedVideos.filter(v => v.vph >= 1000).sort((a, b) => b.vph - a.vph);
          }
        }
      } catch (e) {
        console.error("Top videos error:", e);
      }
    }
  }

  // Fallback data nếu DB Turso đang trống cho kênh này
  if (engagementData.length === 0) {
    engagementData = [
      { captured_at: "10:00", vph: 1200, baseline_vph: 1000 },
      { captured_at: "11:00", vph: 1500, baseline_vph: 1000 },
      { captured_at: "12:00", vph: 3450, baseline_vph: 1000 },
      { captured_at: "13:00", vph: 4100, baseline_vph: 1000 },
      { captured_at: "14:00", vph: 2800, baseline_vph: 1000 },
    ];
  }

  const lowRev = (monthlyViews / 1000) * 1.5;
  const avgRev = (monthlyViews / 1000) * 3.5;
  const highRev = (monthlyViews / 1000) * 7.0;

  const avgBaseline = engagementData.length > 0
    ? Math.round(engagementData.reduce((s, d) => s + (d.baseline_vph || 0), 0) / engagementData.length)
    : 0;

  const MTABS = [
    { id: "revenue", label: "Revenue" },
    { id: "engagement", label: "Engagement" },
    { id: "heatmap", label: "Upload Heatmap" },
  ];

  const VTABS = [
    { id: "all", label: "All Videos", n: allVideos.length },
    { id: "spiking", label: "Spiking", n: spikingVideos.length },
    { id: "highvph", label: "High VPH", n: highVphVideos.length },
  ];

  const shownVideos = vidTab === "spiking" ? spikingVideos : vidTab === "highvph" ? highVphVideos : allVideos;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-white">BA Analysis</h1>
          <p className="text-xs font-mono text-white/30 mt-0.5">
            Business analytics · revenue estimates · VPH tracking
          </p>
        </div>
        <ChannelSelector channels={channelsList} activeId={activeChannelId || ""} />
      </div>

      {/* Main Tabs (pill-style) */}
      <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl w-fit">
        {MTABS.map(({ id, label }) => (
          <a
            key={id}
            href={`/ba-analysis?channelId=${activeChannelId || ""}&mainTab=${id}&vidTab=${vidTab}`}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              mainTab === id ? "bg-violet-600 text-white" : "text-white/40 hover:text-white"
            }`}
          >
            {label}
          </a>
        ))}
      </div>

      {/* Revenue Tab */}
      {mainTab === "revenue" && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "Low CPM", cpm: 1.5, value: lowRev, color: "text-slate-300" },
            { label: "Avg CPM", cpm: 3.5, value: avgRev, color: "text-violet-300" },
            { label: "High CPM", cpm: 7.0, value: highRev, color: "text-emerald-300" },
          ].map(({ label, cpm, value, color }) => (
            <div
              key={label}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5"
            >
              <p className="text-[10px] font-mono text-white/35 uppercase tracking-widest mb-1">
                {label} — ${cpm}
              </p>
              <p className={`text-2xl font-mono font-semibold mb-1 ${color}`}>
                {fmtRev(monthlyViews, cpm)}
              </p>
              <p className="text-[11px] font-mono text-white/25">
                {fmt(monthlyViews)} views × estimated
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Engagement Tab */}
      {mainTab === "engagement" && (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-sm font-semibold text-white">VPH — 24h Snapshot</h3>
              <p className="text-[11px] font-mono text-white/30 mt-0.5">
                Views Per Hour · channel performance
              </p>
            </div>
            {avgBaseline > 0 && (
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <div className="flex items-center gap-1.5 text-amber-400/70">
                  <div className="w-4 border-t border-dashed border-amber-400/60" />
                  Baseline {fmt(avgBaseline)} VPH
                </div>
              </div>
            )}
          </div>
          <EngagementChart data={engagementData} />
        </div>
      )}

      {/* Heatmap Tab */}
      {mainTab === "heatmap" && (
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl py-20 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-amber-400" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">Upload Heatmap</p>
            <p className="text-sm font-mono text-white/25 mt-1">Not yet implemented ⚠️</p>
          </div>
        </div>
      )}

      {/* Video Analytics Section */}
      <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
        <div className="flex items-center gap-1 px-4 py-3.5 border-b border-white/10">
          {VTABS.map(({ id, label, n }) => (
            <a
              key={id}
              href={`/ba-analysis?channelId=${activeChannelId || ""}&mainTab=${mainTab}&vidTab=${id}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                vidTab === id
                  ? "bg-white/10 text-white"
                  : "text-white/35 hover:text-white"
              }`}
            >
              {label}
              <span
                className={`font-mono text-[10px] ${
                  vidTab === id ? "text-white/50" : "text-white/20"
                }`}
              >
                {n}
              </span>
            </a>
          ))}
        </div>
        <div className="divide-y divide-white/[0.05]">
          {shownVideos.length === 0 && (
            <p className="py-8 text-center text-sm font-mono text-white/20">
              No videos in this filter
            </p>
          )}
          {shownVideos.map((video) => (
            <VideoCard key={video.video_id as string} video={video} />
          ))}
        </div>
      </div>
    </div>
  );
}

// Helper Component for Video Cards — list layout matching Figma
function VideoCard({ video }: { video: any }) {
  const vph = video.vph || 0;
  const ratio = video.spike_ratio || 0;

  // VPH Badge color
  const badgeColor =
    ratio >= 3
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
      : ratio >= 1
        ? "text-sky-400 bg-sky-400/10 border-sky-400/25"
        : "text-red-400 bg-red-400/10 border-red-400/25";

  return (
    <a
      href={`/ba-analysis/video/${video.video_id}`}
      className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
    >
      {/* Thumbnail */}
      {video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-24 h-14 rounded-lg object-cover flex-shrink-0 bg-white/5"
        />
      ) : (
        <div className="w-24 h-14 rounded-lg flex-shrink-0 bg-white/5 flex items-center justify-center text-[10px] text-white/20 font-mono">
          No img
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/75 truncate mb-1.5">{video.title}</p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* VPH Badge */}
          <span
            className={`inline-block text-[10px] font-mono px-1.5 py-0.5 rounded-md border ${badgeColor}`}
          >
            {fmt(vph)} VPH
          </span>

          {/* Spike Tag */}
          {ratio >= 3 && (
            <span className="inline-block text-[10px] font-mono text-amber-400 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded-md">
              ×{ratio.toFixed(2)} SPIKE
            </span>
          )}

          {/* Date */}
          <span className="text-[10px] font-mono text-white/20">
            {new Date(video.published_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Views */}
      <div className="text-right flex-shrink-0 pl-4">
        <p className="text-sm font-mono font-semibold text-white">
          {fmt(video.view_count || 0)}
        </p>
        <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider mt-0.5">
          views
        </p>
      </div>
    </a>
  );
}
