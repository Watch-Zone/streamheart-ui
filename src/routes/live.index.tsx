import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { listLiveStreams, startLiveStream } from "@/lib/live.functions";
import { useSession } from "@/hooks/use-session";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/live/")({
  head: () => ({
    meta: [
      { title: "Live now — StreamHub" },
      {
        name: "description",
        content:
          "Watch StreamHub creators broadcasting live right now, join the real-time chat, or start your own live stream in seconds.",
      },
      { property: "og:title", content: "Live now — StreamHub" },
      {
        property: "og:description",
        content: "Live broadcasts from StreamHub creators with real-time chat.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LivePage,
});

function LivePage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", category: "General", playback_url: "" });

  const streams = useQuery({
    queryKey: ["live-streams"],
    queryFn: () => listLiveStreams({ data: { status: "all" } }),
  });

  const start = useMutation({
    mutationFn: () =>
      startLiveStream({
        data: {
          title: form.title,
          description: form.description,
          category: form.category || "General",
          playback_url: form.playback_url.trim() ? form.playback_url.trim() : null,
          thumbnail_url: null,
        },
      }),
    onSuccess: ({ id }) => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["live-streams"] });
      navigate({ to: "/live/$streamId", params: { streamId: id } });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not go live"),
  });

  const all = streams.data ?? [];
  const live = all.filter((item) => item.status === "live");
  const past = all.filter((item) => item.status !== "live");

  return (
    <AppShell>
      <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-live/40 bg-live/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-live">
            <span className="live-dot h-1.5 w-1.5 rounded-full" /> Live
          </span>
          <h1 className="mt-3 text-3xl font-bold">Live now</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Real-time broadcasts with live chat. Start your own in one click.
          </p>
        </div>

        {user ? (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full px-6 font-semibold">
                <Radio className="mr-2 h-4 w-4" /> Go live
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl">
              <DialogHeader>
                <DialogTitle>Start a live stream</DialogTitle>
                <DialogDescription>
                  Give your broadcast a title. Add a playback link (MP4 or HLS) if you already have one.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  start.mutate();
                }}
              >
                <Input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  placeholder="Stream title"
                  maxLength={140}
                  required
                  aria-label="Stream title"
                />
                <Input
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  placeholder="Category"
                  maxLength={40}
                  aria-label="Category"
                />
                <Textarea
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  placeholder="What is this stream about?"
                  maxLength={2000}
                  aria-label="Description"
                />
                <Input
                  value={form.playback_url}
                  onChange={(event) => setForm({ ...form, playback_url: event.target.value })}
                  placeholder="https://… playback link (optional)"
                  maxLength={1000}
                  aria-label="Playback link"
                />
                <Button type="submit" className="w-full rounded-full" disabled={start.isPending}>
                  {start.isPending ? "Starting…" : "Go live"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button asChild variant="secondary" className="rounded-full">
            <Link to="/auth">Sign in to go live</Link>
          </Button>
        )}
      </header>

      <section className="mt-8">
        {streams.isPending ? (
          <p className="text-sm text-muted-foreground">Loading streams…</p>
        ) : live.length === 0 ? (
          <div className="panel rounded-2xl p-10 text-center">
            <h2 className="text-lg font-semibold">Nobody is live right now</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Be the first to go live and your stream shows up here instantly.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {live.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 ? (
        <section className="mt-12">
          <h2 className="text-lg font-semibold">Recently ended</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((stream) => (
              <LiveCard key={stream.id} stream={stream} />
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}

function LiveCard({
  stream,
}: {
  stream: { id: string; title: string; category: string; status: string; host_name: string; viewer_count: number; started_at: string };
}) {
  const isLive = stream.status === "live";
  return (
    <Link
      to="/live/$streamId"
      params={{ streamId: stream.id }}
      className="panel group animate-rise block overflow-hidden rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
    >
      <div className="relative flex aspect-video items-center justify-center bg-elevated">
        <Radio className="h-8 w-8 text-muted-foreground transition-colors group-hover:text-primary" />
        {isLive ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-live px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-live-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-live-foreground" /> Live
          </span>
        ) : (
          <span className="absolute left-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ended
          </span>
        )}
        <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/85 px-2.5 py-1 text-[10px] font-semibold">
          <Users className="h-3 w-3" /> {stream.viewer_count}
        </span>
      </div>
      <div className="p-4">
        <h3 className="line-clamp-1 text-sm font-semibold">{stream.title}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {stream.host_name} · {stream.category} · {timeAgo(stream.started_at)}
        </p>
      </div>
    </Link>
  );
}
