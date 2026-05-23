import { createClient } from "@/lib/supabase-server";
import { turso } from "@/lib/turso";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Activity, CalendarDays } from "lucide-react";
import EngagementChart from "./EngagementChart";
import ChannelSelector from "./ChannelSelector";

export const dynamic = 'force-dynamic';

export default async function BAAnalysis({ searchParams }: { searchParams: { channelId?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let monthlyViews = 0;
  let engagementData: any[] = [];
  let channelsList: any[] = [];
  let activeChannelId = searchParams.channelId;

  if (user) {
    // Lấy toàn bộ channel của user để hiển thị lên dropdown
    const { data: channels } = await supabase
      .from('channels')
      .select('id, title, view_count')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
      
    if (channels && channels.length > 0) {
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
    </div>
  );
}
