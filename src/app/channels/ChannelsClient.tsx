"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addChannel, deleteChannel } from "./actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tv, Plus, Trash2, Loader2, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function ChannelsClient({ initialChannels }: { initialChannels: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addChannel(formData);
      if (res.success && res.channelId) {
        // Sau khi thêm kênh, tự động gọi redirect qua trang BA Analysis
        router.push(`/ba-analysis?channelId=${res.channelId}`);
      } else if (!res.success) {
        alert("Failed to add channel: " + res.error);
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this channel?")) {
      setDeletingId(id);
      await deleteChannel(id);
      setDeletingId(null);
    }
  };

  if (initialChannels.length === 0) {
    return (
      <div className="flex h-[calc(100vh-120px)] items-center justify-center animate-in fade-in slide-in-from-bottom-4">
        <Card className="w-full max-w-md glass-card border-t-4 border-t-primary">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Add Your First Channel</CardTitle>
            <CardDescription>Enter a YouTube Channel ID to start tracking</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input name="channelId" placeholder="UC_x5XG1OV2P6uZZ5FSM9Ttw" required className="bg-background/50" />
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-lg shadow-primary/20" disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Add Channel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Channels</h1>
          <p className="text-muted-foreground mt-1">Manage the YouTube channels you are tracking.</p>
        </div>
        <Card className="glass-card p-2 w-full md:w-auto">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input name="channelId" placeholder="Channel ID (UC...)" required className="bg-background/50 w-full md:w-64 border-none" />
            <Button type="submit" disabled={isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </Button>
          </form>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {initialChannels.map((ch) => (
          <Card key={ch.id} className="glass-card relative group hover:border-primary/50 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {ch.thumbnail_url ? (
                      <img src={ch.thumbnail_url} alt={ch.title} className="h-full w-full object-cover" />
                    ) : (
                      <Tv className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-1" title={ch.title}>{ch.title}</h3>
                    <p className="text-xs font-mono text-muted-foreground mt-1">{ch.id}</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Subscribers</p>
                  <p className="font-semibold">{ch.subscriber_count ? ch.subscriber_count.toLocaleString() : "..."}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Videos</p>
                  <p className="font-semibold">{ch.video_count ? ch.video_count.toLocaleString() : "..."}</p>
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Link href={`/ba-analysis?channelId=${ch.id}`} className="flex-1 inline-flex items-center justify-center rounded-md bg-primary/10 hover:bg-primary/20 text-primary px-4 py-2 text-sm font-medium transition-colors">
                  Analyze <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive border-border/50"
                  onClick={() => handleDelete(ch.id)}
                  disabled={deletingId === ch.id}
                >
                  {deletingId === ch.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
