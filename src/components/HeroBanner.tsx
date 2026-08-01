import { Link } from "@tanstack/react-router";
import { Info, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatViews } from "@/lib/format";
import type { VideoDTO } from "@/lib/video-types";

export function HeroBanner({ video }: { video: VideoDTO }) {
  return (
    <section className="relative isolate h-[68vh] min-h-[420px] w-full overflow-hidden">
      {video.thumbnail_url ? (
        <img
          src={video.thumbnail_url}
          alt={`Featured artwork for ${video.title}`}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="gradient-brand absolute inset-0 opacity-60" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/10" />
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/40 to-transparent" />

      <div className="animate-rise relative z-10 mx-auto flex h-full max-w-[1600px] flex-col justify-end px-4 pb-14 sm:px-6">
        <span className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-glow">
          <span className="animate-live h-1.5 w-1.5 rounded-full bg-primary-glow" /> Featured today
        </span>
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">{video.title}</h1>
        <p className="mt-3 max-w-xl text-sm text-muted-foreground line-clamp-3 sm:text-base">
          {video.description || `A featured pick from ${video.channel_name}.`}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {video.channel_name} · {formatViews(Number(video.view_count))}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            asChild
            size="lg"
            className="gradient-brand rounded-full px-7 font-semibold text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <Link to="/videos/$id" params={{ id: video.id }}>
              <Play className="mr-2 h-5 w-5 fill-current" /> Watch now
            </Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="rounded-full px-7 font-semibold">
            <Link to="/videos/$id" params={{ id: video.id }} hash="details">
              <Info className="mr-2 h-5 w-5" /> More info
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
