import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";
import { useEffect, useState } from "react";
import { Heart, MessageSquare, Play } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { VideoPlayer } from "@/components/VideoPlayer";
import { VideoCard } from "@/components/VideoCard";
import { TimeAgo } from "@/components/TimeAgo";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatViews } from "@/lib/format";
import { getVideo, likeVideo, postComment, recordView, unlikeVideo } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/keys";
import { ApiError } from "@/lib/api/http";

export const Route = createFileRoute("/videos/$id")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Watch — StreamHub" },
      {
        name: "description",
        content: "Watch this title on StreamHub, join the conversation in the comments and discover more.",
      },
      { property: "og:title", content: "Watch — StreamHub" },
      { property: "og:description", content: "Watch this title on StreamHub and discover more from the creator." },
      { property: "og:type", content: "video.other" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WatchPage,
});

function WatchPage() {
  const { id } = Route.useParams();
  const { isSignedIn, isLoaded } = useAuth();
  const queryClient = useQueryClient();
  const [comment, setComment] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: qk.video(id),
    queryFn: () => getVideo(id),
    enabled: isLoaded && Boolean(isSignedIn),
    retry: false,
  });

  useEffect(() => {
    if (data) void recordView(id);
  }, [data, id]);

  const toggleLike = useMutation({
    mutationFn: () => (data?.liked ? unlikeVideo(id) : likeVideo(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.video(id) }),
    onError: (err: Error) => toast.error(err.message),
  });

  const addComment = useMutation({
    mutationFn: () => postComment(id, comment.trim()),
    onSuccess: () => {
      setComment("");
      toast.success("Comment posted");
      void queryClient.invalidateQueries({ queryKey: qk.video(id) });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoaded && !isSignedIn) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-2xl font-extrabold">Sign in to watch</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            CineView requires an account to stream this title.
          </p>
          <Button asChild className="mt-6 rounded-full px-8">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (isPending || !isLoaded) {
    return (
      <AppShell>
        <Skeleton className="aspect-video w-full rounded-2xl" />
        <Skeleton className="mt-6 h-8 w-2/3" />
      </AppShell>
    );
  }

  if (error || !data?.video.id) {
    const message = error instanceof ApiError ? error.message : "This video could not be loaded.";
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-2xl font-extrabold">Video unavailable</h1>
          <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        </div>
      </AppShell>
    );
  }

  const { video, related, comments } = data;

  return (
    <AppShell>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="aspect-video overflow-hidden rounded-2xl border border-border/60 bg-black">
            {video.playbackUrl ? (
              <VideoPlayer src={video.playbackUrl} poster={video.thumbnailUrl} autoPlay />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <Play className="h-10 w-10" />
              </div>
            )}
          </div>

          <div id="details" className="mt-5">
            <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">{video.title}</h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="gradient-brand flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold uppercase text-primary-foreground">
                {video.channelName.slice(0, 2)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{video.channelName}</p>
                <p className="text-xs text-muted-foreground">
                  {formatViews(video.viewCount)} · <TimeAgo iso={video.createdAt} />
                </p>
              </div>

              <Button
                variant={data.liked ? "default" : "secondary"}
                size="sm"
                className="ml-auto rounded-full"
                disabled={toggleLike.isPending}
                onClick={() => toggleLike.mutate()}
              >
                <Heart className={`mr-2 h-4 w-4 ${data.liked ? "fill-current" : ""}`} />
                {video.likeCount || ""} {data.liked ? "Liked" : "Like"}
              </Button>
            </div>

            {video.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {video.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {video.description && (
              <p className="panel mt-4 whitespace-pre-wrap rounded-2xl p-4 text-sm text-muted-foreground">
                {video.description}
              </p>
            )}
          </div>

          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <MessageSquare className="h-4 w-4" /> Comments
            </h2>

            <form
              className="mt-4"
              onSubmit={(event) => {
                event.preventDefault();
                if (comment.trim()) addComment.mutate();
              }}
            >
              <Textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Add a comment…"
                maxLength={500}
                rows={3}
                className="rounded-2xl bg-surface/70"
              />
              <Button
                type="submit"
                size="sm"
                className="mt-2 rounded-full"
                disabled={!comment.trim() || addComment.isPending}
              >
                Post comment
              </Button>
            </form>

            <ul className="mt-6 space-y-5">
              {comments.length === 0 && (
                <li className="text-sm text-muted-foreground">No comments yet — be the first.</li>
              )}
              {comments.map((entry) => (
                <li key={entry.id} className="flex gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-bold uppercase">
                    {entry.authorName.slice(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">{entry.authorName}</span>{" "}
                      <TimeAgo iso={entry.createdAt} />
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{entry.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="min-w-0">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">Up next</h2>
          <div className="space-y-6">
            {related.length === 0 && <p className="text-sm text-muted-foreground">Nothing related yet.</p>}
            {related.map((entry) => (
              <VideoCard key={entry.id} video={entry} />
            ))}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}
