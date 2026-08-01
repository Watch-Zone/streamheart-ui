import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Copy, LogOut } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { RoomChat } from "@/components/RoomChat";
import { RoomStage } from "@/components/RoomStage";
import { getRoom, leaveRoom } from "@/lib/rooms.functions";

export const Route = createFileRoute("/_authenticated/rooms/$roomId")({
  head: () => ({
    meta: [
      { title: "Room — StreamHub" },
      {
        name: "description",
        content: "A private StreamHub room with live chat and screen sharing for watching together.",
      },
      { property: "og:title", content: "Room — StreamHub" },
      {
        property: "og:description",
        content: "Live chat and screen sharing inside a private StreamHub watch room.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RoomPage,
});

function RoomPage() {
  const { roomId } = Route.useParams();
  const navigate = useNavigate();
  const room = useQuery({ queryKey: ["room", roomId], queryFn: () => getRoom({ data: { id: roomId } }) });

  const leave = useMutation({
    mutationFn: () => leaveRoom({ data: { id: roomId } }),
    onSuccess: () => navigate({ to: "/rooms" }),
  });

  if (room.isPending) {
    return (
      <AppShell>
        <p className="mt-10 text-sm text-muted-foreground">Opening room…</p>
      </AppShell>
    );
  }

  if (!room.data) {
    return (
      <AppShell>
        <div className="mt-10">
          <h1 className="text-2xl font-bold">Room not available</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You are not a member of this room, or it no longer exists.
          </p>
          <Button asChild className="mt-5 rounded-full">
            <Link to="/rooms">Back to rooms</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const { room: data, me } = room.data;

  return (
    <AppShell>
      <header className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            to="/rooms"
            aria-label="Back to rooms"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold sm:text-2xl">{data.name}</h1>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard?.writeText(data.code);
                toast.success("Room ID copied");
              }}
              className="mt-1 inline-flex items-center gap-2 text-xs font-mono tracking-[0.25em] text-brand"
            >
              {data.code} <Copy className="h-3 w-3" />
            </button>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={() => leave.mutate()}
          disabled={leave.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" /> Leave
        </Button>
      </header>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RoomStage roomId={roomId} meId={me.id} meName={me.name} />
        <RoomChat roomId={roomId} meId={me.id} />
      </div>
    </AppShell>
  );
}
