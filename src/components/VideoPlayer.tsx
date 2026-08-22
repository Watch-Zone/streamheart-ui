import { useEffect, useRef } from "react";

/**
 * The API serves HLS (`master.m3u8`). Safari plays it natively; everywhere else
 * hls.js is loaded lazily in the browser only.
 */
export function VideoPlayer({
  src,
  poster,
  autoPlay = false,
}: {
  src: string;
  poster?: string | null;
  autoPlay?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    const isHls = src.includes(".m3u8");
    if (!isHls || video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      return;
    }

    let destroy: (() => void) | undefined;
    let cancelled = false;

    void import("hls.js").then(({ default: Hls }) => {
      if (cancelled || !Hls.isSupported()) return;
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      destroy = () => hls.destroy();
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [src]);

  return (
    <video
      ref={ref}
      poster={poster ?? undefined}
      controls
      autoPlay={autoPlay}
      playsInline
      className="h-full w-full bg-black object-contain"
    />
  );
}
