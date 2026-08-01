import { useCallback, useEffect, useRef, useState } from "react";
import { MonitorUp, MonitorX, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Signal =
  | { kind: "presenting"; from: string; name: string }
  | { kind: "stopped"; from: string }
  | { kind: "request"; from: string }
  | { kind: "offer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "answer"; from: string; to: string; sdp: RTCSessionDescriptionInit }
  | { kind: "ice"; from: string; to: string; candidate: RTCIceCandidateInit };

const ICE: RTCConfiguration = {
  iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:global.stun.twilio.com:3478"] }],
};

export function RoomStage({
  roomId,
  meId,
  meName,
}: {
  roomId: string;
  meId: string;
  meName: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const streamRef = useRef<MediaStream | null>(null);
  const [sharing, setSharing] = useState(false);
  const [presenter, setPresenter] = useState<string | null>(null);
  const [presenterName, setPresenterName] = useState<string>("");
  const [participants, setParticipants] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const post = useCallback((payload: Signal) => {
    void channelRef.current?.send({ type: "broadcast", event: "signal", payload });
  }, []);

  const closePeer = useCallback((id: string) => {
    peersRef.current.get(id)?.close();
    peersRef.current.delete(id);
  }, []);

  const stopSharing = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    setSharing(false);
    setPresenter(null);
    if (videoRef.current) videoRef.current.srcObject = null;
    post({ kind: "stopped", from: meId });
  }, [meId, post]);

  useEffect(() => {
    const channel = supabase.channel(`room-stage-${roomId}`, {
      config: { presence: { key: meId }, broadcast: { self: false } },
    });
    channelRef.current = channel;

    channel.on("presence", { event: "sync" }, () => {
      setParticipants(Object.keys(channel.presenceState()).length || 1);
    });

    channel.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const msg = payload as Signal;
      if (msg.from === meId) return;

      if (msg.kind === "presenting") {
        setPresenter(msg.from);
        setPresenterName(msg.name);
        if (!streamRef.current) post({ kind: "request", from: meId });
        return;
      }

      if (msg.kind === "stopped") {
        setPresenter(null);
        closePeer(msg.from);
        if (videoRef.current) videoRef.current.srcObject = null;
        return;
      }

      if (msg.kind === "request" && streamRef.current) {
        const pc = new RTCPeerConnection(ICE);
        peersRef.current.set(msg.from, pc);
        streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            post({ kind: "ice", from: meId, to: msg.from, candidate: e.candidate.toJSON() });
          }
        };
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        post({ kind: "offer", from: meId, to: msg.from, sdp: offer });
        return;
      }

      if (msg.kind === "offer" && msg.to === meId) {
        const pc = new RTCPeerConnection(ICE);
        peersRef.current.set(msg.from, pc);
        pc.ontrack = (e) => {
          if (videoRef.current) videoRef.current.srcObject = e.streams[0] ?? null;
        };
        pc.onicecandidate = (e) => {
          if (e.candidate) {
            post({ kind: "ice", from: meId, to: msg.from, candidate: e.candidate.toJSON() });
          }
        };
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        post({ kind: "answer", from: meId, to: msg.from, sdp: answer });
        return;
      }

      if (msg.kind === "answer" && msg.to === meId) {
        await peersRef.current.get(msg.from)?.setRemoteDescription(msg.sdp);
        return;
      }

      if (msg.kind === "ice" && msg.to === meId) {
        try {
          await peersRef.current.get(msg.from)?.addIceCandidate(msg.candidate);
        } catch {
          /* ignore late candidates */
        }
      }
    });

    void channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ id: meId, name: meName });
        post({ kind: "request", from: meId });
      }
    });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [roomId, meId, meName, post, closePeer]);

  async function startSharing() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      streamRef.current = stream;
      setSharing(true);
      setPresenter(meId);
      setPresenterName(meName);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
      }
      stream.getVideoTracks()[0]?.addEventListener("ended", stopSharing);
      post({ kind: "presenting", from: meId, name: meName });
    } catch {
      setError("Screen sharing was blocked or cancelled.");
    }
  }

  const live = Boolean(presenter);

  return (
    <div className="panel overflow-hidden rounded-3xl">
      <div className="relative aspect-video w-full bg-background">
        <video ref={videoRef} autoPlay playsInline className="h-full w-full object-contain" />
        {!live && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <span className="gradient-brand flex h-14 w-14 items-center justify-center rounded-2xl">
              <MonitorUp className="h-6 w-6 text-primary-foreground" />
            </span>
            <p className="text-sm font-semibold">Nobody is presenting</p>
            <p className="max-w-sm px-6 text-xs text-muted-foreground">
              Share your screen to stream a video, a match or anything else to everyone in this room.
            </p>
          </div>
        )}
        {live && (
          <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-[11px] font-semibold backdrop-blur">
            <span className="animate-live h-2 w-2 rounded-full bg-destructive" />
            {sharing ? "You are presenting" : `${presenterName || "A member"} is presenting`}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3">
        <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4" /> {participants} in room
        </span>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
          <Button
            onClick={sharing ? stopSharing : startSharing}
            size="sm"
            className={cn(
              "rounded-full font-semibold",
              sharing ? "bg-destructive text-destructive-foreground" : "gradient-brand text-primary-foreground",
            )}
          >
            {sharing ? (
              <>
                <MonitorX className="mr-2 h-4 w-4" /> Stop sharing
              </>
            ) : (
              <>
                <MonitorUp className="mr-2 h-4 w-4" /> Share screen
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
