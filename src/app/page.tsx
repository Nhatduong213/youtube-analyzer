import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, Eye, TrendingUp } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Forcing dynamic rendering to ensure fresh data on every load
export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  // Fetch Channel KPI (MVP: taking the first channel available)
  const { data: channelData } = await supabase
    .from("channels")
    .select("subscriber_count, view_count, last_synced_at")
    .limit(1)
    .single();

  const totalSubs = channelData?.subscriber_count || 0;
  const totalViews = channelData?.view_count || 0;
  
  // Calculate if last synced is older than 2 hours
  const lastSynced = channelData?.last_synced_at ? new Date(channelData.last_synced_at) : null;
  const hoursSinceSync = lastSynced ? (Date.now() - lastSynced.getTime()) / (1000 * 60 * 60) : 0;
  const isSyncDelayed = hoursSinceSync > 2;

  // Fetch Blacklist Data joined with Videos table
  const { data: blacklist } = await supabase
    .from("daily_blacklist")
    .select("*, videos(title)")
    .order("created_at", { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Track your YouTube channel performance and blacklist status.</p>
        </div>
        
        <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border ${isSyncDelayed ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
          <AlertCircle className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {lastSynced ? `Last synced: ${Math.floor(hoursSinceSync)} hours ago` : 'Never synced'}
            </span>
            {isSyncDelayed && <span className="text-xs opacity-80">Warning: Sync delayed</span>}
          </div>
          {isSyncDelayed && (
            <button className="ml-2 text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg hover:bg-destructive/90 transition-colors">
              Report Issue
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalSubs.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="glass-card relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-bl-full z-0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. VPH</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-gradient">Data in Turso</div>
            <p className="text-xs text-muted-foreground mt-1">
              Connect Turso to view this metric
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Blacklisted Videos</h2>
        <Card className="glass-card">
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Video Title / ID</th>
                  <th className="px-6 py-4 font-medium">VPH (First Hour)</th>
                  <th className="px-6 py-4 font-medium">Baseline VPH</th>
                  <th className="px-6 py-4 font-medium">Multiplier</th>
                  <th className="px-6 py-4 font-medium">Detected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {(!blacklist || blacklist.length === 0) && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                      No recent blacklisted videos found.
                    </td>
                  </tr>
                )}
                {blacklist?.map((row, idx) => {
                  const videoTitle = Array.isArray(row.videos) ? row.videos[0]?.title : row.videos?.title;
                  
                  return (
                    <tr key={idx} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-primary max-w-xs truncate" title={videoTitle}>
                          {videoTitle || "Unknown Title"}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">{row.video_id}</div>
                      </td>
                      <td className="px-6 py-4 text-destructive font-semibold">{Number(row.vph_first_hour).toLocaleString()}</td>
                      <td className="px-6 py-4">{Number(row.baseline_vph).toLocaleString()}</td>
                      <td className="px-6 py-4">{row.multiplier}x</td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(row.created_at).toLocaleString()}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
