import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, MapPin, Eye, Film, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VideoCard } from "@/components/VideoCard";
import { getProfile, updateMyProfile } from "@/lib/profile.functions";
import { useSession } from "@/hooks/use-session";
import { formatViews, initialsOf, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/profile/$userId")({
  head: () => ({
    meta: [
      { title: "Creator profile — StreamHub" },
      {
        name: "description",
        content:
          "See a StreamHub creator's profile: their bio, uploaded videos, total views and whether they are live right now.",
      },
      { property: "og:title", content: "Creator profile — StreamHub" },
      {
        property: "og:description",
        content: "A StreamHub creator profile with uploads, stats and live status.",
      },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { userId } = Route.useParams();
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const profile = useQuery({
    queryKey: ["profile", userId],
    queryFn: () => getProfile({ data: { userId } }),
  });

  if (profile.isPending) {
    return (
      <AppShell>
        <p className="mt-10 text-sm text-muted-foreground">Loading profile…</p>
      </AppShell>
    );
  }

  if (!profile.data) {
    return (
      <AppShell>
        <div className="mt-10">
          <h1 className="text-2xl font-bold">Profile not found</h1>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { profile: p, videos, stats, live } = profile.data;
  const isMe = user?.id === p.id;

  return (
    <AppShell>
      <section className="animate-fade panel relative mt-4 overflow-hidden rounded-3xl">
        <div className="aurora h-36 w-full sm:h-44">
          {p.banner_url ? (
            <img src={p.banner_url} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : null}
        </div>

        <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:p-7">
          <div className="-mt-16 shrink-0 sm:-mt-20">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border border-border bg-primary text-2xl font-bold text-primary-foreground sm:h-28 sm:w-28">
              {p.avatar_url ? (
                <img
                  src={p.avatar_url}
                  alt={`${p.display_name} avatar`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                initialsOf(p.display_name ?? "Creator")
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold sm:text-3xl">{p.display_name}</h1>
              {live ? (
                <Link
                  to="/live/$streamId"
                  params={{ streamId: live.id }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-live px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-live-foreground"
                >
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-live-foreground" /> Live now
                </Link>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {p.handle} · joined {timeAgo(p.created_at)}
            </p>
            {p.bio ? <p className="mt-3 max-w-2xl text-sm text-foreground/90">{p.bio}</p> : null}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {p.location ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {p.location}
                </span>
              ) : null}
              {p.website ? (
                <a
                  href={p.website}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 hover:text-primary"
                >
                  <Globe className="h-3.5 w-3.5" /> {p.website.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </div>
          </div>

          {isMe ? (
            <EditProfileDialog
              open={open}
              onOpenChange={setOpen}
              initial={{
                display_name: p.display_name ?? "",
                bio: p.bio ?? "",
                website: p.website ?? "",
                location: p.location ?? "",
                avatar_url: p.avatar_url ?? "",
                banner_url: p.banner_url ?? "",
              }}
              onSaved={() => {
                setOpen(false);
                void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
              }}
            />
          ) : null}
        </div>
      </section>

      <section className="mt-6 grid grid-cols-3 gap-3">
        <StatCard icon={Film} label="Videos" value={String(stats.videos)} />
        <StatCard icon={Eye} label="Views" value={formatViews(stats.views).replace(" views", "")} />
        <StatCard icon={Users} label="Subscribers" value={String(stats.subscribers)} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Uploads</h2>
        {videos.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No public videos yet.</p>
        ) : (
          <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Film;
  label: string;
  value: string;
}) {
  return (
    <div className="panel rounded-2xl p-4 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

function EditProfileDialog({
  open,
  onOpenChange,
  initial,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
  initial: {
    display_name: string;
    bio: string;
    website: string;
    location: string;
    avatar_url: string;
    banner_url: string;
  };
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const save = useMutation({
    mutationFn: () => updateMyProfile({ data: form }),
    onSuccess: () => {
      toast.success("Profile updated");
      onSaved();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" className="rounded-full sm:self-center">
          Edit profile
        </Button>
      </DialogTrigger>
      <DialogContent className="rounded-2xl">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Input
            value={form.display_name}
            onChange={(event) => setForm({ ...form, display_name: event.target.value })}
            placeholder="Display name"
            maxLength={60}
            required
            aria-label="Display name"
          />
          <Textarea
            value={form.bio}
            onChange={(event) => setForm({ ...form, bio: event.target.value })}
            placeholder="Short bio"
            maxLength={500}
            aria-label="Bio"
          />
          <Input
            value={form.location}
            onChange={(event) => setForm({ ...form, location: event.target.value })}
            placeholder="Location"
            maxLength={80}
            aria-label="Location"
          />
          <Input
            value={form.website}
            onChange={(event) => setForm({ ...form, website: event.target.value })}
            placeholder="https://your-site.com"
            maxLength={200}
            aria-label="Website"
          />
          <Input
            value={form.avatar_url}
            onChange={(event) => setForm({ ...form, avatar_url: event.target.value })}
            placeholder="Avatar image URL"
            maxLength={1000}
            aria-label="Avatar URL"
          />
          <Input
            value={form.banner_url}
            onChange={(event) => setForm({ ...form, banner_url: event.target.value })}
            placeholder="Banner image URL"
            maxLength={1000}
            aria-label="Banner URL"
          />
          <Button type="submit" className="w-full rounded-full" disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

