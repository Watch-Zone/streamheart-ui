import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, GitCommitHorizontal, Github, HelpCircle, RefreshCw, RotateCw, Rocket } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TimeAgo } from "@/components/TimeAgo";
import { getGithubSyncStatus } from "@/lib/github.functions";

export const Route = createFileRoute("/sync")({
  head: () => ({
    meta: [
      { title: "GitHub sync status — StreamHub" },
      {
        name: "description",
        content:
          "Live view of the StreamHub GitHub sync: last publish time, current sync state and the latest commit pushed to the repository.",
      },
      { property: "og:title", content: "GitHub sync status — StreamHub" },
      {
        property: "og:description",
        content: "Last publish time, sync state and latest commit for the StreamHub repository.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SyncPage,
});

const STATE_META = {
  synced: {
    label: "In sync",
    hint: "The latest commit is included in the published build.",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  },
  pending: {
    label: "Publish pending",
    hint: "New commits landed after the last publish. Hit Publish → Update to deploy them.",
    icon: RotateCw,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  },
  unknown: {
    label: "Unknown",
    hint: "Sync state could not be determined right now.",
    icon: HelpCircle,
    className: "border-border bg-muted/40 text-muted-foreground",
  },
} as const;

function SyncPage() {
  const fetchStatus = useServerFn(getGithubSyncStatus);
  const { data, isPending, isFetching, refetch } = useQuery({
    queryKey: ["github-sync-status"],
    queryFn: () => fetchStatus(),
    refetchInterval: 60_000,
  });

  const meta = STATE_META[data?.state ?? "unknown"];
  const StateIcon = meta.icon;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight">GitHub sync</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Deployment and repository state for{" "}
              <a
                className="text-foreground underline underline-offset-4"
                href={data?.repoUrl ?? "https://github.com/Watch-Zone/VideoStream-UI"}
                target="_blank"
                rel="noreferrer"
              >
                {data?.repo ?? "Watch-Zone/VideoStream-UI"}
              </a>
              .
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </header>

        {isPending ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="mt-8 space-y-4">
            <section className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <StateIcon className="h-5 w-5" />
                  <div>
                    <p className="text-sm font-semibold">Sync state</p>
                    <p className="text-xs text-muted-foreground">{meta.hint}</p>
                  </div>
                </div>
                <Badge variant="outline" className={meta.className}>
                  {meta.label}
                </Badge>
              </div>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
              <div className="flex items-center gap-3">
                <Rocket className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold">Last publish</p>
                  <p className="text-xs text-muted-foreground">
                    {data?.lastPublishAt ? (
                      <>
                        <TimeAgo date={data.lastPublishAt} /> ·{" "}
                        {new Date(data.lastPublishAt).toUTCString()}
                      </>
                    ) : (
                      "No published deployment detected."
                    )}
                  </p>
                  {data?.publishedUrl ? (
                    <a
                      className="mt-1 inline-block text-xs text-primary underline underline-offset-4"
                      href={data.publishedUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {data.publishedUrl.replace("https://", "")}
                    </a>
                  ) : null}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border/60 bg-card/60 p-5 backdrop-blur">
              <div className="flex items-start gap-3">
                <GitCommitHorizontal className="mt-0.5 h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">Latest commit</p>
                  {data?.commit ? (
                    <>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="rounded-md border border-border/60 bg-muted/40 px-2 py-1 font-mono text-xs">
                          {data.commit.shortSha}
                        </code>
                        <span className="text-xs text-muted-foreground">on {data.branch}</span>
                        <a
                          className="text-xs text-primary underline underline-offset-4"
                          href={data.commit.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View on GitHub
                        </a>
                      </div>
                      <p className="mt-2 truncate text-sm">{data.commit.message}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {data.commit.author}
                        {data.commit.committedAt ? (
                          <>
                            {" · "}
                            <TimeAgo date={data.commit.committedAt} />
                          </>
                        ) : null}
                      </p>
                      <p className="mt-3 break-all font-mono text-[11px] text-muted-foreground">{data.commit.sha}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {data?.error ?? "Commit information is unavailable."}
                    </p>
                  )}
                </div>
              </div>
            </section>

            <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Github className="h-3.5 w-3.5" />
              Checked {data ? <TimeAgo date={data.checkedAt} /> : null} · auto-refreshes every minute
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
