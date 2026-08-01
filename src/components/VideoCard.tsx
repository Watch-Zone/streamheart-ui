import { Link } from "@tanstack/react-router";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import type { VideoDTO } from "@/lib/video-types";
import { Play } from "lucide-react";

export function VideoCard({ video }: { video: VideoDTO }) {
  return (
    <Link
      to="/videos/$id"
      params={{ id: video.id }}
      className="group block"
      aria-label={video.title}
    >
      <div className="relative aspect-video overflow-hidden rounded-xl bg-surface">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={`Thumbnail for ${video.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Play className="h-8 w-8" />
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded bg-background/85 px-1.5 py-0.5 text-xs font-medium tabular-nums">
          {formatDuration(video.duration_seconds)}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold uppercase text-secondary-foreground">
          {video.channel_name.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">
            {video.title}
          </h3>
          <p className="mt-1 truncate text-xs text-muted-foreground">{video.channel_name}</p>
          <p className="text-xs text-muted-foreground">
            {formatViews(Number(video.view_count))} · {timeAgo(video.created_at)}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function VideoGrid({ videos }: { videos: VideoDTO[] }) {
  if (videos.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">No videos here yet.</p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}
