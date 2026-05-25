"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { fmt, parseDuration } from "./data-utils";
import type { MergedVideo } from "./data-utils";
import { Heart, MessageCircle } from "lucide-react";

type SortKey = "vph" | "views" | "likes" | "comments" | "published";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "vph", label: "VPH" },
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "published", label: "Published" },
];

function sortVideos(videos: MergedVideo[], sort: SortKey): MergedVideo[] {
  return [...videos].sort((a, b) => {
    switch (sort) {
      case "views": return b.view_count - a.view_count;
      case "likes": return b.like_count - a.like_count;
      case "comments": return b.comment_count - a.comment_count;
      case "published": return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      default: return b.vph - a.vph;
    }
  });
}

export default function VideoList({
  videos,
  channelId,
}: {
  videos: MergedVideo[];
  channelId: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const currentSort = (searchParams.get("sort") as SortKey) || "vph";

  const sorted = sortVideos(videos, currentSort);

  function handleSort(key: SortKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", key);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl">
      {/* Sort Bar */}
      <div className="flex items-center gap-1 px-4 py-3.5 border-b border-white/10 overflow-x-auto">
        <span className="text-[10px] font-mono text-white/25 uppercase tracking-widest mr-2 flex-shrink-0">
          Sort
        </span>
        {SORT_OPTIONS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex-shrink-0 ${
              currentSort === key
                ? "bg-violet-600/20 text-violet-300 border border-violet-500/25"
                : "text-white/35 hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-[10px] font-mono text-white/20 flex-shrink-0">
          {videos.length} videos
        </span>
      </div>

      {/* Video Rows */}
      <div className="divide-y divide-white/[0.05]">
        {sorted.length === 0 && (
          <p className="py-8 text-center text-sm font-mono text-white/20">
            No active videos found
          </p>
        )}
        {sorted.map((video) => (
          <VideoRow key={video.video_id} video={video} channelId={channelId} sort={currentSort} />
        ))}
      </div>
    </div>
  );
}

function VideoRow({
  video,
  channelId,
  sort,
}: {
  video: MergedVideo;
  channelId: string | null;
  sort: string;
}) {
  const vph = video.vph || 0;
  const ratio = video.spike_ratio || 0;
  const duration = parseDuration(video.duration);

  const badgeColor =
    ratio >= 3
      ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/25"
      : ratio >= 1
        ? "text-sky-400 bg-sky-400/10 border-sky-400/25"
        : "text-red-400 bg-red-400/10 border-red-400/25";

  // Safe back URL with encoded channelId
  const backParams = new URLSearchParams();
  if (channelId) backParams.set("channelId", channelId);
  if (sort && sort !== "vph") backParams.set("sort", sort);
  const queryStr = backParams.toString();
  const href = `/ba-analysis/video/${video.video_id}${queryStr ? `?${queryStr}` : ""}`;

  return (
    <a
      href={href}
      className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors cursor-pointer group"
    >
      {/* Thumbnail */}
      {video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={video.title}
          className="w-24 h-14 rounded-lg object-cover flex-shrink-0 bg-white/5 group-hover:opacity-90 transition-opacity"
        />
      ) : (
        <div className="w-24 h-14 rounded-lg flex-shrink-0 bg-white/5 flex items-center justify-center text-[10px] text-white/20 font-mono">
          No img
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-white/80 truncate mb-1.5 max-w-xs sm:max-w-md lg:max-w-lg group-hover:text-white transition-colors">
          {video.title}
        </p>
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
              ×{ratio.toFixed(1)} SPIKE
            </span>
          )}

          {/* Short Badge */}
          {video.is_short && (
            <span className="inline-block text-[10px] font-mono text-pink-400 bg-pink-400/10 border border-pink-400/25 px-1.5 py-0.5 rounded-md">
              📱 Short
            </span>
          )}

          {/* Duration */}
          {duration !== "—" && (
            <span className="text-[10px] font-mono text-white/25">
              {duration}
            </span>
          )}

          {/* Date */}
          <span className="text-[10px] font-mono text-white/20">
            {new Date(video.published_at).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="text-right flex-shrink-0 pl-4 space-y-1">
        <p className="text-sm font-mono font-semibold text-white">
          {fmt(video.view_count || 0)}
        </p>
        <p className="text-[9px] font-mono text-white/20 uppercase tracking-wider">
          views
        </p>
        {(video.like_count > 0 || video.comment_count > 0) && (
          <p className="text-[10px] font-mono text-white/25 mt-1 flex items-center gap-1.5 justify-end">
            {video.like_count > 0 && (
              <span className="flex items-center gap-0.5">
                <Heart className="w-2.5 h-2.5" />
                {fmt(video.like_count)}
              </span>
            )}
            {video.comment_count > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageCircle className="w-2.5 h-2.5" />
                {fmt(video.comment_count)}
              </span>
            )}
          </p>
        )}
      </div>
    </a>
  );
}
