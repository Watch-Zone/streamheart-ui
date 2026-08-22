import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Copy, LogOut, Users } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { RoomChat } from "@/components/RoomChat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { endRoom, getRoom, getRoomMembers, leaveRoom } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/keys";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Room — StreamHub" },
      {
        name: "description",
        content: "You're in a private StreamHub room: watch together and chat with everyone in real time.",
      },
      { property: "og:title", content: "Room — StreamHub" },
      { property: "og:description", content: "A private StreamHub room for watching together with live chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();

  const { data: room, isPending, isError } = useQuery({
    queryKey: qk.room(roomId),
    queryFn: () => getRoom(roomId),
    retry: false,
  });

  const { data: members } = useQuery({
    queryKey: qk.roomMembers(roomId),
    queryFn: () => getRoomMembers(roomId),
    refetchInterval: 10_000,
  });

  const leave = useMutation({
    mutationFn: () => leaveRoom(roomId),
    onSettled: () => navigate({ to: "/rooms" }),
  });

  const close = useMutation({
    mutationFn: () => endRoom(roomId),
    onSuccess: () => {
      toast.success("Room closed");
      navigate({ to: "/rooms" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isError) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md py-24 text-center">
          <h1 className="text-2xl font-extrabold">Room not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The code may be wrong, or the room has already ended.
          </p>
          <Button className="mt-6 rounded-full px-8" onClick={() => navigate({ to: "/rooms" })}>
            Back to rooms
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="flex flex-wrap items-center gap-3 pt-6">
        <div className="min-w-0">
          {isPending ? (
            <Skeleton className="h-8 w-56" />
          ) : (
            <h1 className="truncate font-display text-2xl font-extrabold tracking-tight">{room?.name}</h1>
          )}
          <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-mono tracking-[0.2em]">{roomId}</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {members?.length ?? room?.memberCount ?? 0}
            </span>
          </p>
        </div>

        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full"
            onClick={() => {
              void navigator.clipboard.writeText(roomId);
              toast.success("Room code copied");
            }}
          >
            <Copy className="mr-2 h-4 w-4" /> Copy code
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full"
            disabled={leave.isPending}
            onClick={() => leave.mutate()}
          >
            <LogOut className="mr-2 h-4 w-4" /> Leave
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-destructive hover:text-destructive"
            disabled={close.isPending}
            onClick={() => close.mutate()}
          >
            End room
          </Button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 space-y-6">
          <div className="panel flex aspect-video items-center justify-center rounded-2xl text-center">
            <div className="px-8">
              <h2 className="text-lg font-bold">The stage is ready</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Pick a title from the catalogue and everyone in this room watches along together.
              </p>
              <Button className="mt-5 rounded-full px-8" onClick={() => navigate({ to: "/explore" })}>
                Browse catalogue
              </Button>
            </div>
          </div>

          <section className="panel rounded-2xl p-5">
            <h2 className="text-sm font-bold">In this room</h2>
            <ul className="mt-4 flex flex-wrap gap-3">
              {(members ?? []).map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-2 rounded-full border border-border/60 bg-surface/70 py-1 pl-1 pr-3"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-[10px] font-bold uppercase">
                    {member.name.slice(0, 2)}
                  </span>
                  <span className="text-xs font-medium">{member.name}</span>
                  {member.isHost && <span className="text-[10px] uppercase text-brand">Host</span>}
                </li>
              ))}
              {(members ?? []).length === 0 && (
                <li className="text-sm text-muted-foreground">Nobody else here yet.</li>
              )}
            </ul>
          </section>
        </div>

        <aside className="min-w-0">
          <RoomChat code={roomId} />
        </aside>
      </div>
    </AppShell>
  );
}
