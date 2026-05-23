"use client";

import { useRouter } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Youtube } from "lucide-react";

export default function ChannelSelector({ channels, activeId }: { channels: any[], activeId: string }) {
  const router = useRouter();

  if (!channels || channels.length === 0) return null;

  return (
    <div className="w-full max-w-xs">
      <Select 
        value={activeId} 
        onValueChange={(val) => router.push(`/ba-analysis?channelId=${val}`)}
      >
        <SelectTrigger className="glass-card font-semibold bg-background/50 h-12">
          <div className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-primary" />
            <SelectValue placeholder="Select a channel" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {channels.map(ch => (
            <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
