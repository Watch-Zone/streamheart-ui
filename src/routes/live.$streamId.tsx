import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { LiveChat } from "@/components/LiveChat";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { endLiveStream, joinLiveStream, listLiveStreams } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/keys";

export const Route = createFileRoute("/live/$streamId")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Live stream — StreamHub" },
      {
        name: "description",
        content: "Watch this StreamHub broadcast live and chat with the host and other viewers in real time.",
      },
      { property: "og:title", content: "Live stream — StreamHub" },
      { property: "og:description", content: "Watch this StreamHub broadcast live and join the chat." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveWatchPage,
});

function LiveWatchPage() {
  const { streamId } = Route.useParams();
  const { isLoaded, isSignedIn } = useAuth();

  const { data: streams } = useQuery({ queryKey: qk.liveList, queryFn: listLiveStreams });
  const stream = streams?.find((entry) => entry.id === streamId);

  const { data: join, isPending } = useQuery({
    queryKey: qk.liveJoin(streamId),
    queryFn: () => joinLiveStream(streamId),
    enabled: isLoaded && Boolean(isSignedIn),
    retry: false,
  });

  const end = useMutation({
    mutationFn: () => endLiveStream(streamId),
    onSuccess: () => toast.success("Stream ended"),
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoaded && !isSignedIn) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-2xl font-extrabold">Sign in to join the stream</h1>
          <Button asChild className="mt-6 rounded-full px-8">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="aspect-video overflow-hidden rounded-2xl border border-border/60 bg-black">
            {isPending ? (
              <Skeleton className="h-full w-full" />
            ) : join?.playbackUrl ? (
              <VideoPlayer src={join.playbackUrl} poster={stream?.thumbnailUrl ?? null} autoPlay />
            ) : (
              <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">
                This broadcast has no playback source yet.
              </div>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
              <span className="live-dot" /> Live
            </span>
            <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">
              {stream?.title ?? "Live broadcast"}
            </h1>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-4 w-4" /> {stream?.viewerCount ?? 0} watching
            </span>
            {stream?.hostName && <span>Hosted by {stream.hostName}</span>}
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto rounded-full text-destructive hover:text-destructive"
              disabled={end.isPending}
              onClick={() => end.mutate()}
            >
              End stream
            </Button>
          </div>
        </div>

        <aside className="min-w-0">
          <LiveChat streamId={streamId} />
        </aside>
      </div>
    </AppShell>
  );
}
