import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { CommentDTO, VideoDTO } from "./video-types";

type DB = SupabaseClient<Database>;

export function publicClient(): DB {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

const SELECT =
  "id, owner_id, channel_name, title, description, tags, visibility, duration_seconds, view_count, video_url, thumbnail_url, created_at";

async function signOne(client: DB, bucket: string, value: string | null): Promise<string | null> {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const { data } = await client.storage.from(bucket).createSignedUrl(value, 60 * 60 * 6);
  return data?.signedUrl ?? null;
}

export async function withSignedMedia(client: DB, rows: VideoDTO[]): Promise<VideoDTO[]> {
  return Promise.all(
    rows.map(async (row) => ({
      ...row,
      video_url: await signOne(client, "videos", row.video_url),
      thumbnail_url: await signOne(client, "thumbnails", row.thumbnail_url),
    })),
  );
}

export async function fetchFeed(limit = 24): Promise<VideoDTO[]> {
  const client = publicClient();
  const { data, error } = await client
    .from("videos")
    .select(SELECT)
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return withSignedMedia(client, (data ?? []) as VideoDTO[]);
}

export async function fetchSearch(query: string, tag: string | null): Promise<VideoDTO[]> {
  const client = publicClient();
  let request = client.from("videos").select(SELECT).eq("visibility", "public");
  if (query.trim()) {
    const q = query.trim().replace(/[%,]/g, " ");
    request = request.or(`title.ilike.%${q}%,description.ilike.%${q}%,channel_name.ilike.%${q}%`);
  }
  if (tag) request = request.contains("tags", [tag]);
  const { data, error } = await request.order("view_count", { ascending: false }).limit(48);
  if (error) throw new Error(error.message);
  return withSignedMedia(client, (data ?? []) as VideoDTO[]);
}

export async function fetchVideo(id: string): Promise<{ video: VideoDTO; related: VideoDTO[] } | null> {
  const client = publicClient();
  const { data, error } = await client.from("videos").select(SELECT).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const { data: related } = await client
    .from("videos")
    .select(SELECT)
    .eq("visibility", "public")
    .neq("id", id)
    .order("view_count", { ascending: false })
    .limit(10);
  const [video] = await withSignedMedia(client, [data as VideoDTO]);
  return {
    video: video!,
    related: await withSignedMedia(client, (related ?? []) as VideoDTO[]),
  };
}

export async function fetchComments(videoId: string): Promise<CommentDTO[]> {
  const client = publicClient();
  const { data, error } = await client
    .from("comments")
    .select("id, body, created_at, user_id")
    .eq("video_id", videoId)
    .order("created_at", { ascending: false })
    .limit(100);
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
    id: row.id,
    body: row.body,
    created_at: row.created_at,
    user_id: row.user_id,
    author_name: byId.get(row.user_id)?.display_name ?? "Viewer",
    author_avatar: byId.get(row.user_id)?.avatar_url ?? null,
  }));
}

export async function fetchLikeCount(videoId: string): Promise<number> {
  const client = publicClient();
  const { count } = await client
    .from("video_likes")
    .select("video_id", { count: "exact", head: true })
    .eq("video_id", videoId);
  return count ?? 0;
}

export async function bumpViews(videoId: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("videos")
    .select("view_count")
    .eq("id", videoId)
    .maybeSingle();
  if (!data) return;
  await supabaseAdmin
    .from("videos")
    .update({ view_count: Number(data.view_count) + 1 })
    .eq("id", videoId);
}
