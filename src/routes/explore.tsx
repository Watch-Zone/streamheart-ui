import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { z } from "zod";
import { AppShell } from "@/components/AppShell";
import { VideoGrid } from "@/components/VideoCard";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { searchVideos } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/keys";

const searchSchema = z.object({ q: z.string().catch("") });

export const Route = createFileRoute("/explore")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Explore videos — StreamHub" },
      {
        name: "description",
        content:
          "Search the full StreamHub catalogue by title, description or tag and discover new creators to watch.",
      },
      { property: "og:title", content: "Explore videos — StreamHub" },
      { property: "og:description", content: "Search the StreamHub catalogue by title, description or tag." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

function ExplorePage() {
  const { q } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(q);

  const { data, isFetching } = useQuery({
    queryKey: qk.search(q),
    queryFn: () => searchVideos(q),
  });

  return (
    <AppShell>
      <header className="mx-auto max-w-2xl pt-6 text-center">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">Explore</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Search across every title on StreamHub. Type at least two characters.
        </p>

        <form
          className="relative mt-6"
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ search: { q: draft } });
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search titles, creators, tags…"
            aria-label="Search videos"
            maxLength={120}
            className="h-12 rounded-full border-border/70 bg-surface/70 pl-11 pr-4 backdrop-blur"
          />
        </form>
      </header>

      <section className="mt-10">
        {isFetching ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-2xl" />
            ))}
          </div>
        ) : q.trim().length < 2 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Start typing to search the catalogue.
          </p>
        ) : (
          <VideoGrid videos={data ?? []} />
        )}
      </section>
    </AppShell>
  );
}
