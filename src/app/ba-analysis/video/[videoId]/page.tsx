import { createClient } from "@/lib/supabase-server";
import { turso } from "@/lib/turso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, CalendarDays, ArrowLeft, Tag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import EngagementChart from "../../EngagementChart"; // Reuse chart component

export const dynamic = 'force-dynamic';

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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Video not found</h2>
        <Link href="/ba-analysis" className="text-primary hover:underline">Return to BA Analysis</Link>
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

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/ba-analysis?channelId=${video.channel_id}`} className="p-2 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight line-clamp-1">{video.title}</h1>
          <p className="text-muted-foreground mt-1 flex items-center gap-2">
            <span>{(video.channels as any)?.title || 'Unknown Channel'}</span>
            <span>•</span>
            <span>Published {new Date(video.published_at).toLocaleDateString()}</span>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card className="glass-card overflow-hidden">
            <div className="aspect-video relative bg-muted">
              {video.thumbnail_url ? (
                <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">No Thumbnail</div>
              )}
            </div>
            <CardContent className="p-6">
              <h3 className="font-semibold text-lg mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Video ID</span>
                  <Badge variant="outline" className="font-mono">{video.id}</Badge>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-border/50">
                  <span className="text-muted-foreground">Channel ID</span>
                  <Badge variant="outline" className="font-mono">{video.channel_id}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6 bg-card/50 backdrop-blur border border-border/50">
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-6 mt-0">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle>Description</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted/30 p-4 rounded-lg whitespace-pre-wrap text-sm border border-border/50 max-h-[400px] overflow-y-auto">
                    {video.description || 'No description provided.'}
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Tag className="h-4 w-4"/> Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(video.tags) && video.tags.length > 0 ? (
                      video.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-0">{tag}</Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No tags found.</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-0">
              <Card className="glass-card border-t-4 border-t-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary"/> VPH (Last 48 Hours)</CardTitle>
                </CardHeader>
                <CardContent>
                  {hourlyData.length > 0 ? (
                    <EngagementChart data={hourlyData} />
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground border border-dashed border-border/50 rounded-lg bg-background/30">
                      No VPH data available in the last 48 hours.
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-emerald-500"/> Daily Views History</CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyStats.length > 0 ? (
                    <div className="space-y-3">
                      {dailyStats.map((stat, idx) => (
                        <div key={idx} className="flex justify-between items-center p-3 rounded-lg bg-muted/30 border border-border/50">
                          <div className="font-medium">{new Date(stat.captured_date).toLocaleDateString()}</div>
                          <Badge variant="outline" className="text-sm px-3 py-1 bg-background">{stat.view_count.toLocaleString()} views</Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground border border-dashed border-border/50 rounded-lg bg-background/30">
                      No daily stats recorded yet. Data will appear after 24 hours.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
