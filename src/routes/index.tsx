import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { VideoGrid } from "@/components/VideoCard";
import { getFeed } from "@/lib/videos.functions";

const feedQuery = queryOptions({ queryKey: ["feed"], queryFn: () => getFeed() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "StreamHub — Watch and share videos" },
      {
        name: "description",
        content:
          "StreamHub is a fast video streaming platform: browse the feed, search creators and upload your own videos.",
      },
      { property: "og:title", content: "StreamHub — Watch and share videos" },
      {
        property: "og:description",
        content: "Browse the feed, search creators and upload your own videos on StreamHub.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(feedQuery),
  component: FeedPage,
  errorComponent: () => (
    <AppShell>
      <p className="text-sm text-muted-foreground">The feed could not be loaded. Try refreshing.</p>
    </AppShell>
  ),
});

function FeedPage() {
  const { data } = useSuspenseQuery(feedQuery);
  return (
    <AppShell>
      <h1 className="mb-5 text-xl font-bold tracking-tight">Recommended</h1>
      <VideoGrid videos={data} />
    </AppShell>
  );
}
