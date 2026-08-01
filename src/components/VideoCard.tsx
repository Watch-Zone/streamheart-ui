import { Link } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import type { VideoDTO } from "@/lib/video-types";
import { cn } from "@/lib/utils";

export function PosterCard({
  video,
  index = 0,
  wide = false,
}: {
  video: VideoDTO;
  index?: number;
  wide?: boolean;
}) {
  return (
    <Link
      to="/videos/$id"
      params={{ id: video.id }}
      aria-label={video.title}
      className="group animate-rise block"
      style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
    >
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-card transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/60 group-hover:glow",
          wide ? "aspect-video" : "aspect-[2/3]",
        )}
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={`Cover art for ${video.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="gradient-brand flex h-full w-full items-center justify-center opacity-70">
            <Play className="h-8 w-8 text-primary-foreground" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/10 to-transparent opacity-90" />

        <span className="absolute right-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold tabular-nums backdrop-blur">
          {formatDuration(video.duration_seconds)}
        </span>

        <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="gradient-brand flex h-12 w-12 items-center justify-center rounded-full shadow-glow">
            <Play className="h-5 w-5 fill-primary-foreground text-primary-foreground" />
          </span>
        </span>

        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{video.title}</h3>
          <p className="mt-1 truncate text-[11px] text-muted-foreground">
            {video.channel_name} · {formatViews(Number(video.view_count))}
          </p>
        </div>
      </div>
    </Link>
  );
}

export function VideoCard({ video }: { video: VideoDTO }) {
  return (
    <Link to="/videos/$id" params={{ id: video.id }} className="group block" aria-label={video.title}>
      <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/60 bg-surface">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={`Thumbnail for ${video.title}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Play className="h-8 w-8" />
          </div>
        )}
        <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold tabular-nums">
          {formatDuration(video.duration_seconds)}
        </span>
      </div>
      <div className="mt-3 flex gap-3">
        <span className="gradient-brand mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold uppercase text-primary-foreground">
          {video.channel_name.slice(0, 2)}
        </span>
        <div className="min-w-0">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-primary-glow">
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
    return <p className="py-16 text-center text-sm text-muted-foreground">Nothing here yet.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
}

export function Rail({
  title,
  videos,
  wide = false,
}: {
  title: string;
  videos: VideoDTO[];
  wide?: boolean;
}) {
  if (videos.length === 0) return null;
  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="text-lg font-bold sm:text-xl">{title}</h2>
        <span className="text-xs text-muted-foreground">{videos.length} titles</span>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6">
        {videos.map((video, i) => (
          <div
            key={video.id}
            className={cn("shrink-0 snap-start", wide ? "w-[300px] sm:w-[360px]" : "w-[150px] sm:w-[180px]")}
          >
            <PosterCard video={video} index={i} wide={wide} />
          </div>
        ))}
      </div>
    </section>
  );
}
