import { createClient } from "@/lib/supabase-server";
import { turso } from "@/lib/turso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Activity, CalendarDays } from "lucide-react";
import EngagementChart from "./EngagementChart";
import ChannelSelector from "./ChannelSelector";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function BAAnalysis({ searchParams }: { searchParams: { channelId?: string } }) {
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BA Analysis</h1>
          <p className="text-muted-foreground mt-1">Deep dive into channel metrics and revenue estimates.</p>
        </div>
        
        <ChannelSelector channels={channelsList} activeId={activeChannelId || ""} />
      </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 mb-8 bg-card/50 backdrop-blur border border-border/50">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="heatmap">Upload Heatmap</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6 mt-0">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="glass-card border-l-4 border-l-emerald-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Low CPM ($1.5)</CardTitle>
                <DollarSign className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${lowRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Estimated monthly revenue</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg CPM ($3.5)</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gradient">${avgRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                  Estimated monthly revenue <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                </p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-[oklch(0.7_0.2_180)]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">High CPM ($7.0)</CardTitle>
                <DollarSign className="h-4 w-4 text-[oklch(0.7_0.2_180)]" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">${highRev.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Estimated monthly revenue</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/> Engagement Score</CardTitle>
            </CardHeader>
            <CardContent>
              <EngagementChart data={engagementData} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary"/> Upload Frequency Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed border-border/50 rounded-lg bg-background/30">
                Heatmap view will be available in the next iteration.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Video List Section */}
      <div className="mt-12">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Video Analytics
            </h2>
            <TabsList className="bg-card/50 backdrop-blur border border-border/50">
              <TabsTrigger value="all">All Videos</TabsTrigger>
              <TabsTrigger value="spiking">Spiking</TabsTrigger>
              <TabsTrigger value="high_vph">High VPH</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {allVideos.map(video => (
                <VideoCard key={video.video_id as string} video={video} />
              ))}
              {allVideos.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-lg bg-background/30">
                  No video data yet. Run the hourly-tracker to fetch videos.
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="spiking">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {spikingVideos.map(video => (
                <VideoCard key={video.video_id as string} video={video} />
              ))}
              {spikingVideos.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-lg bg-background/30">
                  No spiking videos detected for this channel (VPH &ge; 3x baseline).
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="high_vph">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {highVphVideos.map(video => (
                <VideoCard key={video.video_id as string} video={video} />
              ))}
              {highVphVideos.length === 0 && (
                <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed border-border/50 rounded-lg bg-background/30">
                  No videos with High VPH detected (&ge; 1,000 VPH).
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// Helper Component for Video Cards
function VideoCard({ video }: { video: any }) {
  return (
    <Card className="glass-card overflow-hidden flex flex-col group hover:border-primary/50 transition-colors">
      <a href={`/ba-analysis/video/${video.video_id}`} className="block aspect-video relative bg-muted overflow-hidden">
        {video.thumbnail_url ? (
          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">No image</div>
        )}
        <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded font-medium flex items-center gap-1">
          <Activity className="h-3 w-3" /> {(video.vph || 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} VPH
        </div>
      </a>
      <CardContent className="p-4 flex-1 flex flex-col">
        <a href={`/ba-analysis/video/${video.video_id}`} className="hover:text-primary transition-colors">
          <h3 className="font-medium text-sm line-clamp-2 mb-2" title={video.title}>{video.title}</h3>
        </a>
        <div className="text-xs text-muted-foreground mb-2">
          <span className="font-semibold text-foreground">{(video.view_count || 0).toLocaleString()}</span> views
        </div>
        <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>{new Date(video.published_at).toLocaleDateString()}</span>
          {video.spike_ratio > 0 && (
            <span className="text-emerald-500 font-medium bg-emerald-500/10 px-2 py-0.5 rounded">
              {video.spike_ratio.toFixed(1)}x spike
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
