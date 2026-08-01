import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { fetchLiveMessages, fetchLiveStream, fetchLiveStreams } from "./live.server";

export const listLiveStreams = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ status: z.enum(["live", "ended", "all"]).default("all") })
      .default({ status: "all" })
      .parse(input ?? {}),
  )
  .handler(async ({ data }) => fetchLiveStreams(data.status));

export const getLiveStream = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => fetchLiveStream(data.id));

export const getLiveMessages = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => fetchLiveMessages(data.id));

export const startLiveStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        title: z.string().trim().min(1).max(140),
        description: z.string().max(2000).default(""),
        category: z.string().trim().min(1).max(40).default("General"),
        playback_url: z.string().url().max(1000).nullable().default(null),
        thumbnail_url: z.string().url().max(1000).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("live_streams")
      .insert({ ...data, owner_id: context.userId, status: "live" })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const endLiveStream = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("live_streams")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const sendLiveMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("live_messages")
      .insert({ stream_id: data.id, user_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
