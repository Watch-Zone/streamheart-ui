import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRoom, joinRoom } from "@/lib/api/endpoints";

export const Route = createFileRoute("/_authenticated/rooms/")({
  head: () => ({
    meta: [
      { title: "Watch-together rooms — StreamHub" },
      {
        name: "description",
        content:
          "Create a private StreamHub room or join one with a room code and password to watch and chat together.",
      },
      { property: "og:title", content: "Watch-together rooms — StreamHub" },
      { property: "og:description", content: "Create or join a private room to watch and chat together." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomsPage,
});

function RoomsPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const create = useMutation({
    mutationFn: () => createRoom({ name: name.trim(), password: newPassword || undefined }),
    onSuccess: (room) => {
      toast.success(`Room ${room.code} created`);
      navigate({ to: "/rooms/$roomId", params: { roomId: room.code } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const join = useMutation({
    mutationFn: () => joinRoom(code.trim().toUpperCase(), password || undefined),
    onSuccess: () => navigate({ to: "/rooms/$roomId", params: { roomId: code.trim().toUpperCase() } }),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <AppShell>
      <header className="mx-auto max-w-2xl pt-6 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-brand">
          <Users className="h-3.5 w-3.5" /> Watch together
        </span>
        <h1 className="mt-4 font-display text-3xl font-extrabold tracking-tight">Rooms</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Spin up a private room, share the code and password, and watch with everyone at once.
        </p>
      </header>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        <section className="panel rounded-3xl p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <Plus className="h-4 w-4 text-brand" /> Create a room
          </h2>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (name.trim()) create.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="room-name">Room name</Label>
              <Input
                id="room-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Friday movie night"
                maxLength={60}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-new-password">Password (optional)</Label>
              <Input
                id="room-new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Leave blank for an open room"
                maxLength={64}
              />
            </div>
            <Button type="submit" className="w-full rounded-full" disabled={create.isPending}>
              {create.isPending ? "Creating…" : "Create room"}
            </Button>
          </form>
        </section>

        <section className="panel rounded-3xl p-6">
          <h2 className="flex items-center gap-2 text-base font-bold">
            <KeyRound className="h-4 w-4 text-brand" /> Join a room
          </h2>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (code.trim()) join.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="room-code">Room code</Label>
              <Input
                id="room-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={12}
                className="font-mono tracking-[0.2em]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-password">Password</Label>
              <Input
                id="room-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                maxLength={64}
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              className="w-full rounded-full"
              disabled={join.isPending}
            >
              {join.isPending ? "Joining…" : "Join room"}
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
