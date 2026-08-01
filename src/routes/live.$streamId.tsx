import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LiveChat } from "@/components/LiveChat";
import { endLiveStream, getLiveStream } from "@/lib/live.functions";
import { useSession } from "@/hooks/use-session";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/live/$streamId")({
  head: () => ({
    meta: [
      { title: "Live stream — StreamHub" },
      {
        name: "description",
        content: "Watch this StreamHub live broadcast and join the real-time chat with other viewers.",
      },
      { property: "og:title", content: "Live stream — StreamHub" },
      {
        property: "og:description",
        content: "A StreamHub live broadcast with real-time viewer chat.",
      },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveStreamPage,
});

function LiveStreamPage() {
  const { streamId } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();

  const stream = useQuery({
    queryKey: ["live-stream", streamId],
    queryFn: () => getLiveStream({ data: { id: streamId } }),
  });

  const end = useMutation({
    mutationFn: () => endLiveStream({ data: { id: streamId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["live-stream", streamId] });
      void queryClient.invalidateQueries({ queryKey: ["live-streams"] });
    },
  });

  if (stream.isPending) {
    return (
      <AppShell>
        <p className="mt-10 text-sm text-muted-foreground">Loading stream…</p>
      </AppShell>
    );
  }

  if (!stream.data) {
    return (
      <AppShell>
        <div className="mt-10">
          <h1 className="text-2xl font-bold">Stream not found</h1>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/live">Back to live</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const data = stream.data;
  const isLive = data.status === "live";
  const isHost = user?.id === data.owner_id;

  return (
    <AppShell>
      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="panel overflow-hidden rounded-2xl">
            <div className="relative aspect-video bg-black">
              {data.playback_url ? (
                <video
                  src={data.playback_url}
                  controls
                  autoPlay
                  playsInline
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-muted-foreground">
                  <Radio className="h-9 w-9" />
                  <p className="text-sm">
                    {isLive ? "Waiting for the host's video feed…" : "This stream has ended."}
                  </p>
                </div>
              )}
              {isLive ? (
                <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-live-foreground">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-live-foreground" /> Live
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold">{data.title}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Link
                  to="/profile/$userId"
                  params={{ userId: data.owner_id }}
                  className="font-semibold text-foreground hover:text-primary"
                >
                  {data.host_name}
                </Link>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {data.viewer_count} watching
                </span>
                <span>·</span>
                <span>{data.category}</span>
                <span>·</span>
                <span>started {timeAgo(data.started_at)}</span>
              </p>
            </div>
            {isHost && isLive ? (
              <Button
                variant="secondary"
                className="rounded-full"
                onClick={() => end.mutate()}
                disabled={end.isPending}
              >
                End stream
              </Button>
            ) : null}
          </div>

          {data.description ? (
            <div className="panel mt-5 rounded-2xl p-5 text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {data.description}
            </div>
          ) : null}
        </div>

        <LiveChat streamId={streamId} />
      </div>
    </AppShell>
  );
}
