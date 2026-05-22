"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { KeyRound, Globe, Zap, Save } from "lucide-react";

export default function Settings() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your API keys, timezone, and algorithm preferences.</p>
      </div>

      <div className="grid gap-6">
        <Card className="glass-card border-t-4 border-t-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-primary" />
              YouTube API Configuration
            </CardTitle>
            <CardDescription>
              Your personal YouTube Data API v3 key. This is required for the hourly tracker to function.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input id="apiKey" type="password" placeholder="AIzaSy..." className="bg-background/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-[oklch(0.7_0.2_180)]" />
              Localization
            </CardTitle>
            <CardDescription>
              Set your timezone so the daily scan runs correctly at 00:00 your time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select defaultValue="Asia/Ho_Chi_Minh">
                <SelectTrigger className="bg-background/50">
                  <SelectValue placeholder="Select timezone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Universal Time)</SelectItem>
                  <SelectItem value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (UTC+7)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="h-5 w-5 text-yellow-500" />
              Algorithm Tweaks
            </CardTitle>
            <CardDescription>
              Adjust how aggressive the blacklist detection is.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="spike">Spike Multiplier (2x - 10x)</Label>
                <span className="text-sm font-bold text-primary">3.0x</span>
              </div>
              <Input id="spike" type="range" min="2" max="10" step="0.5" defaultValue="3" className="w-full accent-primary" />
              <p className="text-xs text-muted-foreground">
                Videos with VPH lower than Baseline × Multiplier will be blacklisted. Default is 3x.
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t border-border/50 py-4 flex justify-end">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-6 shadow-lg shadow-primary/20">
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
