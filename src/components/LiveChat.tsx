import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getLiveMessages, sendLiveMessage } from "@/lib/live.functions";
import { useSession } from "@/hooks/use-session";
import { initialsOf } from "@/lib/format";

export function LiveChat({ streamId }: { streamId: string }) {
  const [body, setBody] = useState("");
  const { user } = useSession();
  const queryClient = useQueryClient();
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["live-messages", streamId],
    queryFn: () => getLiveMessages({ data: { id: streamId } }),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`live-messages-${streamId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "live_messages", filter: `stream_id=eq.${streamId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["live-messages", streamId] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [streamId, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: () => sendLiveMessage({ data: { id: streamId, body } }),
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: ["live-messages", streamId] });
    },
  });

  return (
    <aside className="panel flex h-[480px] flex-col rounded-2xl xl:h-[calc(100vh-11rem)]">
      <div className="border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold">Live chat</h2>
        <p className="text-xs text-muted-foreground">Messages appear instantly for everyone watching.</p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.isPending ? (
          <p className="text-xs text-muted-foreground">Loading chat…</p>
        ) : (messages.data ?? []).length === 0 ? (
          <p className="text-xs text-muted-foreground">Be the first to say something.</p>
        ) : (
          (messages.data ?? []).map((message) => (
            <div key={message.id} className="flex gap-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-semibold">
                {initialsOf(message.author_name)}
              </span>
              <p className="min-w-0 text-sm leading-snug">
                <span className="mr-1.5 font-semibold text-brand">{message.author_name}</span>
                <span className="text-foreground/90 break-words">{message.body}</span>
              </p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-border/60 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (body.trim()) send.mutate();
        }}
      >
        {user ? (
          <>
            <Input
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Send a message…"
              maxLength={500}
              aria-label="Live chat message"
              className="h-10 rounded-full bg-surface/70"
            />
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 shrink-0 rounded-full"
              disabled={send.isPending || !body.trim()}
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button asChild variant="secondary" className="w-full rounded-full">
            <Link to="/auth">Sign in to chat</Link>
          </Button>
        )}
      </form>
    </aside>
  );
}
