import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { VideoGrid } from "@/components/VideoCard";
import { searchVideos } from "@/lib/videos.functions";
import { Skeleton } from "@/components/ui/skeleton";

const TAGS = ["animation", "music", "science", "coding", "food", "nature", "travel", "explainer"];

export const Route = createFileRoute("/explore")({
  validateSearch: z.object({ q: z.string().optional(), tag: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Explore videos — StreamHub" },
      {
        name: "description",
        content: "Search StreamHub for videos by title, creator or topic, and filter results by tag.",
      },
      { property: "og:title", content: "Explore videos — StreamHub" },
      {
        property: "og:description",
        content: "Search StreamHub for videos by title, creator or topic.",
      },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { q = "", tag } = Route.useSearch();
  const { data, isPending } = useQuery({
    queryKey: ["search", q, tag ?? null],
    queryFn: () => searchVideos({ data: { q, tag: tag ?? null } }),
  });

  return (
    <AppShell>
      <h1 className="text-xl font-bold tracking-tight">
        {q ? `Results for "${q}"` : "Explore"}
      </h1>

      <div className="my-5 flex flex-wrap gap-2">
        <Link
          to="/explore"
          search={{ q: q || undefined }}
          className={`rounded-full border border-border px-3 py-1.5 text-sm ${!tag ? "bg-foreground text-background" : "bg-surface"}`}
        >
          All
        </Link>
        {TAGS.map((t) => (
          <Link
            key={t}
            to="/explore"
            search={{ q: q || undefined, tag: t }}
            className={`rounded-full border border-border px-3 py-1.5 text-sm capitalize ${tag === t ? "bg-foreground text-background" : "bg-surface"}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-xl" />
          ))}
        </div>
      ) : (
        <VideoGrid videos={data ?? []} />
      )}
    </AppShell>
  );
}
