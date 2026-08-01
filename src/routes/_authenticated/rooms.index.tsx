import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, DoorOpen, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoom, joinRoom, listMyRooms } from "@/lib/rooms.functions";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "Watch Rooms — StreamHub" },
      {
        name: "description",
        content:
          "Create or join a private StreamHub room with a room ID and password to chat live and share your screen with friends.",
      },
      { property: "og:title", content: "Watch Rooms — StreamHub" },
      {
        property: "og:description",
        content: "Private watch-together rooms with live chat and screen sharing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");

  const rooms = useQuery({ queryKey: ["my-rooms"], queryFn: () => listMyRooms() });

  const create = useMutation({
    mutationFn: () => createRoom({ data: { name: name.trim(), password: newPassword } }),
    onSuccess: (room) => {
      toast.success(`Room created — ID ${room.code}`);
      void queryClient.invalidateQueries({ queryKey: ["my-rooms"] });
      navigate({ to: "/rooms/$roomId", params: { roomId: room.id } });
    },
    onError: () => toast.error("Could not create the room."),
  });

  const join = useMutation({
    mutationFn: () => joinRoom({ data: { code: code.trim().toUpperCase(), password: joinPassword } }),
    onSuccess: (result) => {
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["my-rooms"] });
      navigate({ to: "/rooms/$roomId", params: { roomId: result.id } });
    },
    onError: () => toast.error("Could not join the room."),
  });

  return (
    <AppShell>
      <header className="animate-rise mt-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          <Users className="h-3.5 w-3.5" /> Watch together
        </span>
        <h1 className="mt-4 text-3xl font-extrabold sm:text-4xl">
          Private <span className="text-gradient">Rooms</span>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Spin up a room, share the ID and password, then chat and present your screen together in real time.
        </p>
      </header>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <form
          className="panel rounded-3xl p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || newPassword.length < 4) return;
            create.mutate();
          }}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Plus className="h-4 w-4 text-primary-glow" /> Create a room
          </h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room name</Label>
              <Input
                id="room-name"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
                placeholder="Friday movie night"
                className="rounded-xl bg-surface/70"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-password">Room password</Label>
              <Input
                id="room-password"
                type="password"
                value={newPassword}
                maxLength={72}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 4 characters"
                className="rounded-xl bg-surface/70"
              />
            </div>
            <Button
              type="submit"
              disabled={create.isPending || !name.trim() || newPassword.length < 4}
              className="gradient-brand w-full rounded-full font-semibold text-primary-foreground"
            >
              {create.isPending ? "Creating…" : "Create room"}
            </Button>
          </div>
        </form>

        <form
          className="panel rounded-3xl p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!code.trim() || !joinPassword) return;
            join.mutate();
          }}
        >
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <DoorOpen className="h-4 w-4 text-brand" /> Join a room
          </h2>
          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="join-code">Room ID</Label>
              <Input
                id="join-code"
                value={code}
                maxLength={12}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. K7QT2M"
                className="rounded-xl bg-surface/70 font-mono tracking-[0.3em]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="join-password">Password</Label>
              <Input
                id="join-password"
                type="password"
                value={joinPassword}
                maxLength={72}
                onChange={(e) => setJoinPassword(e.target.value)}
                className="rounded-xl bg-surface/70"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={join.isPending || !code.trim() || !joinPassword}
              className="w-full rounded-full font-semibold"
            >
              {join.isPending ? "Joining…" : "Join room"}
            </Button>
          </div>
        </form>
      </div>

      <section className="mt-12">
        <h2 className="text-lg font-bold">Your rooms</h2>
        {rooms.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading rooms…</p>
        ) : (rooms.data ?? []).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">You haven&apos;t joined any room yet.</p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(rooms.data ?? []).map((room) => (
              <div key={room.id} className="panel animate-rise rounded-2xl p-5">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                  <h3 className="truncate text-base font-bold">{room.name}</h3>
                  <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold">
                    {room.member_count} members
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(room.code);
                    toast.success("Room ID copied");
                  }}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-surface/70 px-3 py-1.5 font-mono text-sm tracking-[0.2em] text-brand"
                >
                  {room.code} <Copy className="h-3.5 w-3.5" />
                </button>
                <p className="mt-2 text-xs text-muted-foreground">Created {timeAgo(room.created_at)}</p>
                <Button asChild size="sm" className="mt-4 w-full rounded-full font-semibold">
                  <Link to="/rooms/$roomId" params={{ roomId: room.id }}>
                    Enter room
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
