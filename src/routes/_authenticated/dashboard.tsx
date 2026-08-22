import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Eye, Heart, Upload, UserPlus, Video as VideoIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { VideoGrid } from "@/components/VideoCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatViews } from "@/lib/format";
import { getDashboard } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/keys";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Creator studio — StreamHub" },
      {
        name: "description",
        content: "Track your StreamHub views, likes and subscribers, and manage everything you've uploaded.",
      },
      { property: "og:title", content: "Creator studio — StreamHub" },
      { property: "og:description", content: "Track views, likes and subscribers and manage your uploads." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isPending } = useQuery({ queryKey: qk.dashboard, queryFn: getDashboard });

  const stats = [
    { label: "Videos", value: data?.stats.videos ?? 0, icon: VideoIcon, raw: true },
    { label: "Views", value: data?.stats.views ?? 0, icon: Eye },
    { label: "Likes", value: data?.stats.likes ?? 0, icon: Heart },
    { label: "Subscribers", value: data?.stats.subscribers ?? 0, icon: UserPlus },
  ];

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-4 pt-6">
        <div className="flex items-center gap-4">
          {data?.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={`${data.displayName} avatar`}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <span className="gradient-brand flex h-14 w-14 items-center justify-center rounded-full text-sm font-bold uppercase text-primary-foreground">
              {(data?.displayName ?? "You").slice(0, 2)}
            </span>
          )}
          <div>
            <h1 className="font-display text-2xl font-extrabold tracking-tight">Creator studio</h1>
            <p className="text-sm text-muted-foreground">{data?.displayName ?? "Your channel"}</p>
          </div>
        </div>

        <Button asChild className="rounded-full px-6 font-semibold">
          <Link to="/upload">
            <Upload className="mr-2 h-4 w-4" /> Upload video
          </Link>
        </Button>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="panel rounded-2xl p-5">
            <stat.icon className="h-4 w-4 text-brand" />
            <p className="mt-3 text-2xl font-extrabold tabular-nums">
              {isPending ? "—" : stat.raw ? stat.value : formatViews(stat.value).replace(" views", "")}
            </p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-lg font-bold">Your uploads</h2>
        {isPending ? (
          <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-2xl" />
            ))}
          </div>
        ) : (
          <VideoGrid videos={data?.uploads ?? []} />
        )}
      </section>
    </AppShell>
  );
}
