import { publicClient } from "./videos.server";

export type LiveStreamDTO = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  playback_url: string | null;
  status: string;
  viewer_count: number;
  started_at: string;
  ended_at: string | null;
  host_name: string;
  host_avatar: string | null;
};

const SELECT =
  "id, owner_id, title, description, category, thumbnail_url, playback_url, status, viewer_count, started_at, ended_at";

type Row = Omit<LiveStreamDTO, "host_name" | "host_avatar">;

async function withHosts(rows: Row[]): Promise<LiveStreamDTO[]> {
  if (rows.length === 0) return [];
  const client = publicClient();
  const ids = [...new Set(rows.map((row) => row.owner_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((row) => ({
    ...row,
    host_name: byId.get(row.owner_id)?.display_name ?? "Creator",
    host_avatar: byId.get(row.owner_id)?.avatar_url ?? null,
  }));
}

export async function fetchLiveStreams(status: "live" | "ended" | "all" = "all") {
  const client = publicClient();
  let request = client.from("live_streams").select(SELECT);
  if (status !== "all") request = request.eq("status", status);
  const { data, error } = await request.order("started_at", { ascending: false }).limit(48);
  if (error) throw new Error(error.message);
  return withHosts((data ?? []) as Row[]);
}

export async function fetchLiveStream(id: string): Promise<LiveStreamDTO | null> {
  const client = publicClient();
  const { data, error } = await client.from("live_streams").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [row] = await withHosts([data as Row]);
  return row ?? null;
}

export async function fetchLiveMessages(streamId: string) {
  const client = publicClient();
  const { data, error } = await client
    .from("live_messages")
    .select("id, body, user_id, created_at")
    .eq("stream_id", streamId)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const ids = [...new Set(rows.map((row) => row.user_id))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, display_name, avatar_url")
    .in("id", ids);
  const byId = new Map((profiles ?? []).map((p) => [p.id, p]));
  return rows.map((row) => ({
    ...row,
    author_name: byId.get(row.user_id)?.display_name ?? "Viewer",
    author_avatar: byId.get(row.user_id)?.avatar_url ?? null,
  }));
}
