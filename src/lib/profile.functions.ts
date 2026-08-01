import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { publicClient, withSignedMedia } from "./videos.server";
import type { VideoDTO } from "./video-types";

const VIDEO_SELECT =
  "id, owner_id, channel_name, title, description, tags, visibility, duration_seconds, view_count, video_url, thumbnail_url, created_at";

export const getProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const client = publicClient();
    const { data: profile } = await client
      .from("profiles")
      .select("id, display_name, handle, avatar_url, banner_url, bio, website, location, created_at")
      .eq("id", data.userId)
      .maybeSingle();
    if (!profile) return null;

    const { data: videoRows } = await client
      .from("videos")
      .select(VIDEO_SELECT)
      .eq("owner_id", data.userId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(48);
    const videos = await withSignedMedia(client, (videoRows ?? []) as VideoDTO[]);

    const { count: subscribers } = await client
      .from("subscriptions")
      .select("channel_id", { count: "exact", head: true })
      .eq("channel_id", data.userId);

    const { data: live } = await client
      .from("live_streams")
      .select("id, title, status, started_at")
      .eq("owner_id", data.userId)
      .eq("status", "live")
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      profile,
      videos,
      live,
      stats: {
        videos: videos.length,
        views: videos.reduce((sum, v) => sum + Number(v.view_count ?? 0), 0),
        subscribers: subscribers ?? 0,
      },
    };
  });

export const updateMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(60),
        bio: z.string().max(500).default(""),
        website: z.string().max(200).default(""),
        location: z.string().max(80).default(""),
        avatar_url: z.string().max(1000).default(""),
        banner_url: z.string().max(1000).default(""),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({
        display_name: data.display_name,
        bio: data.bio || null,
        website: data.website || null,
        location: data.location || null,
        avatar_url: data.avatar_url || null,
        banner_url: data.banner_url || null,
      })
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
