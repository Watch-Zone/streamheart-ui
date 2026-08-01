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
      <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
        {q ? <>Results for <span className="text-gradient">{q}</span></> : <>Explore <span className="text-gradient">everything</span></>}
      </h1>

      <div className="my-5 flex flex-wrap gap-2">
        <Link
          to="/explore"
          search={{ q: q || undefined }}
          className={`rounded-full border border-border/70 px-4 py-1.5 text-sm transition-colors ${!tag ? "gradient-brand border-transparent font-semibold text-primary-foreground" : "bg-surface/70 hover:bg-secondary"}`}
        >
          All
        </Link>
        {TAGS.map((t) => (
          <Link
            key={t}
            to="/explore"
            search={{ q: q || undefined, tag: t }}
            className={`rounded-full border border-border/70 px-4 py-1.5 text-sm capitalize transition-colors ${tag === t ? "gradient-brand border-transparent font-semibold text-primary-foreground" : "bg-surface/70 hover:bg-secondary"}`}
          >
            {t}
          </Link>
        ))}
      </div>

      {isPending ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-video rounded-2xl" />
          ))}
        </div>
      ) : (
        <VideoGrid videos={data ?? []} />
      )}
    </AppShell>
  );
}
