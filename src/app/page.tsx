import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Users, Eye, TrendingUp } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
          <p className="text-muted-foreground mt-1">Track your YouTube channel performance and blacklist status.</p>
        </div>
        
        <div className="flex items-center gap-3 bg-destructive/10 text-destructive px-4 py-2 rounded-xl border border-destructive/20">
          <AlertCircle className="h-5 w-5" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Last synced: 3 hours ago</span>
            <span className="text-xs opacity-80">Warning: Sync delayed</span>
          </div>
          <button className="ml-2 text-xs bg-destructive text-destructive-foreground px-3 py-1.5 rounded-lg hover:bg-destructive/90 transition-colors">
            Report Issue
          </button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Subscribers</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">124,500</div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">12,450,200</div>
            <p className="text-xs text-emerald-400 mt-1 flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" /> +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card relative overflow-hidden">
          <div className="absolute right-0 top-0 w-24 h-24 bg-primary/10 rounded-bl-full z-0" />
          <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. VPH</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold text-gradient">3,450</div>
            <p className="text-xs text-muted-foreground mt-1">
              Views per hour on average
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Recent Blacklisted Videos</h2>
        <Card className="glass-card">
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/20 border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-medium">Video ID</th>
                  <th className="px-6 py-4 font-medium">VPH (First Hour)</th>
                  <th className="px-6 py-4 font-medium">Baseline VPH</th>
                  <th className="px-6 py-4 font-medium">Multiplier</th>
                  <th className="px-6 py-4 font-medium">Detected At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {[
                  { video_id: "dQw4w9WgXcQ", vph_first_hour: 450, baseline_vph: 1200, multiplier: 3, detected_at: "2026-05-22T08:00:00Z" },
                  { video_id: "jNQXAC9IVRw", vph_first_hour: 200, baseline_vph: 800, multiplier: 3, detected_at: "2026-05-21T00:00:00Z" }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/10 transition-colors">
                    <td className="px-6 py-4 font-mono text-primary">{row.video_id}</td>
                    <td className="px-6 py-4 text-destructive font-semibold">{row.vph_first_hour}</td>
                    <td className="px-6 py-4">{row.baseline_vph}</td>
                    <td className="px-6 py-4">{row.multiplier}x</td>
                    <td className="px-6 py-4 text-muted-foreground">{new Date(row.detected_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
