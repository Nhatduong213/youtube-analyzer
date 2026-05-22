"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, Activity, CalendarDays } from "lucide-react";

export default function BAAnalysis() {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">BA Analysis</h1>
        <p className="text-muted-foreground mt-1">Deep dive into channel metrics and revenue estimates.</p>
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
                <div className="text-3xl font-bold">$18,675</div>
                <p className="text-xs text-muted-foreground mt-1">Estimated monthly revenue</p>
              </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-primary">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg CPM ($3.5)</CardTitle>
                <DollarSign className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gradient">$43,575</div>
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
                <div className="text-3xl font-bold">$87,150</div>
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
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                [Engagement Chart Placeholder]
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary"/> Upload Frequency Heatmap</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                [Heatmap Placeholder]
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
