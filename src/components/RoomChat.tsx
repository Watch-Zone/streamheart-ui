import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimeAgo } from "@/components/TimeAgo";
import { getRoomMessages, sendRoomMessage } from "@/lib/api/endpoints";
import { qk } from "@/lib/api/keys";

export function RoomChat({ code }: { code: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const { data } = useQuery({
    queryKey: qk.roomMessages(code),
    queryFn: () => getRoomMessages(code),
    refetchInterval: 4_000,
  });

  const messages = data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const send = useMutation({
    mutationFn: () => sendRoomMessage(code, draft.trim()),
    onSuccess: () => {
      setDraft("");
      void queryClient.invalidateQueries({ queryKey: qk.roomMessages(code) });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="panel flex h-[560px] flex-col rounded-2xl">
      <header className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-bold">Room chat</h2>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <p className="text-sm text-muted-foreground">No messages yet — start the conversation.</p>
        )}
        {messages.map((message) => (
          <div key={message.id} className="flex gap-2.5">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold uppercase">
              {message.authorName.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground">{message.authorName}</span>{" "}
                <TimeAgo iso={message.createdAt} />
              </p>
              <p className="break-words text-sm">{message.body}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        className="flex gap-2 border-t border-border/60 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (draft.trim()) send.mutate();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Message the room…"
          maxLength={500}
          aria-label="Room chat message"
          className="rounded-full bg-surface/70"
        />
        <Button
          type="submit"
          size="icon"
          className="shrink-0 rounded-full"
          disabled={!draft.trim() || send.isPending}
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
