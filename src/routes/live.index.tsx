import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import { Radio } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { TimeAgo } from "@/components/TimeAgo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listLiveStreams, startLiveStream } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/keys";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Live now — StreamHub" },
      {
        name: "description",
        content: "Watch creators streaming live right now on StreamHub, or start your own broadcast in seconds.",
      },
      { property: "og:title", content: "Live now — StreamHub" },
      { property: "og:description", content: "Watch creators streaming live, or start your own broadcast." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("General");

  const { data, isPending } = useQuery({
    queryKey: qk.liveList,
    queryFn: listLiveStreams,
    refetchInterval: 20_000,
  });

  const goLive = useMutation({
    mutationFn: () => startLiveStream({ title: title.trim(), category }),
    onSuccess: () => {
      setOpen(false);
      setTitle("");
      toast.success("You're live");
      void queryClient.invalidateQueries({ queryKey: qk.liveList });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const streams = data ?? [];

  return (
    <AppShell>
      <header className="flex flex-wrap items-end justify-between gap-4 pt-6">
        <div>
          <h1 className="flex items-center gap-3 font-display text-3xl font-extrabold tracking-tight">
            <span className="live-dot" /> Live now
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {streams.length} {streams.length === 1 ? "creator" : "creators"} broadcasting right now.
          </p>
        </div>

        {isSignedIn ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full px-6 font-semibold">
                <Radio className="mr-2 h-4 w-4" /> Go live
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Start a live stream</DialogTitle>
              </DialogHeader>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (title.trim()) goLive.mutate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="live-title">Stream title</Label>
                  <Input
                    id="live-title"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={140}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="live-category">Category</Label>
                  <Input
                    id="live-category"
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                    maxLength={40}
                  />
                </div>
                <Button type="submit" className="w-full rounded-full" disabled={goLive.isPending}>
                  {goLive.isPending ? "Starting…" : "Start streaming"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => navigate({ to: "/auth" })}
          >
            Sign in to go live
          </Button>
        )}
      </header>

      <section className="mt-10">
        {isPending ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-2xl" />
            ))}
          </div>
        ) : streams.length === 0 ? (
          <div className="panel rounded-3xl py-20 text-center">
            <p className="text-sm text-muted-foreground">No one is live right now. Be the first.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {streams.map((stream) => (
              <Link
                key={stream.id}
                to="/live/$streamId"
                params={{ streamId: stream.id }}
                className="group block"
              >
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-border/60 bg-surface">
                  {stream.thumbnailUrl ? (
                    <img
                      src={stream.thumbnailUrl}
                      alt={`Live preview for ${stream.title}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="gradient-brand h-full w-full opacity-50" />
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center gap-1.5 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur">
                    <span className="live-dot" /> Live
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 text-sm font-semibold">{stream.title}</h2>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {stream.hostName} · started <TimeAgo iso={stream.startedAt} />
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
