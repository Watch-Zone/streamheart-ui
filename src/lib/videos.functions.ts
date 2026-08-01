import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  bumpViews,
  fetchComments,
  fetchFeed,
  fetchLikeCount,
  fetchSearch,
  fetchVideo,
  withSignedMedia,
  publicClient,
} from "./videos.server";

export const getFeed = createServerFn({ method: "GET" }).handler(async () => fetchFeed());

export const searchVideos = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ q: z.string().max(120).default(""), tag: z.string().max(60).nullable().default(null) }).parse(input),
  )
  .handler(async ({ data }) => fetchSearch(data.q, data.tag));

export const getVideo = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => fetchVideo(data.id));

export const getComments = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => fetchComments(data.id));

export const getLikeCount = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => fetchLikeCount(data.id));

export const registerView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    await bumpViews(data.id);
    return { ok: true };
  });

export const getMyVideos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("videos")
      .select("*")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return withSignedMedia(publicClient(), (data ?? []) as never);
  });

export const createVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().min(1).max(140),
        description: z.string().max(5000).default(""),
        tags: z.array(z.string().max(40)).max(12).default([]),
        visibility: z.enum(["public", "unlisted", "private"]).default("public"),
        duration_seconds: z.number().int().min(0).max(86400).default(0),
        video_path: z.string().min(1).max(500),
        thumbnail_path: z.string().max(500).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    const { data: row, error } = await context.supabase
      .from("videos")
      .insert({
        owner_id: context.userId,
        channel_name: profile?.display_name ?? "Creator",
        title: data.title,
        description: data.description,
        tags: data.tags,
        visibility: data.visibility,
        duration_seconds: data.duration_seconds,
        video_url: data.video_path,
        thumbnail_url: data.thumbnail_path,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteVideo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("videos")
      .delete()
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const toggleLike = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("video_likes")
      .select("video_id")
      .eq("video_id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing) {
      await context.supabase
        .from("video_likes")
        .delete()
        .eq("video_id", data.id)
        .eq("user_id", context.userId);
      return { liked: false };
    }
    await context.supabase.from("video_likes").insert({ video_id: data.id, user_id: context.userId });
    return { liked: true };
  });

export const getMyLike = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: existing } = await context.supabase
      .from("video_likes")
      .select("video_id")
      .eq("video_id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();
    return { liked: Boolean(existing) };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("comments")
      .insert({ video_id: data.id, user_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
