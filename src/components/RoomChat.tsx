import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRoomMessages, sendRoomMessage } from "@/lib/rooms.functions";
import { cn } from "@/lib/utils";

export function RoomChat({ roomId, meId }: { roomId: string; meId: string }) {
  const [body, setBody] = useState("");
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["room-messages", roomId],
    queryFn: () => getRoomMessages({ data: { id: roomId } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`room-messages-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "room_messages", filter: `room_id=eq.${roomId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["room-messages", roomId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [roomId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: () => sendRoomMessage({ data: { id: roomId, body } }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["room-messages", roomId] });
    },
  });

  return (
    <div className="panel flex h-[520px] flex-col rounded-2xl xl:h-[calc(100vh-11rem)]">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-bold">Live chat</h2>
        <p className="text-xs text-muted-foreground">Messages sync instantly with everyone in the room.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.isPending ? (
          <p className="text-xs text-muted-foreground">Loading messages…</p>
        ) : (messages.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">No messages yet — say hello.</p>
        ) : (
          (messages.data ?? []).map((m) => {
            const mine = m.user_id === meId;
            return (
              <div key={m.id} className={cn("flex flex-col gap-1", mine && "items-end")}>
                <span className="px-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {mine ? "You" : m.author_name}
                </span>
                <span
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                    mine
                      ? "gradient-brand rounded-br-sm text-primary-foreground"
                      : "rounded-bl-sm bg-secondary text-secondary-foreground",
                  )}
                >
                  {m.body}
                </span>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-border/60 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!body.trim() || send.isPending) return;
          send.mutate();
        }}
      >
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={1000}
          placeholder="Send a message"
          aria-label="Chat message"
          className="rounded-full border-border/70 bg-surface/70"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!body.trim() || send.isPending}
          className="gradient-brand shrink-0 rounded-full text-primary-foreground"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
