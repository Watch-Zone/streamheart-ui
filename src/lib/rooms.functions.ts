import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateRoomCode, hashPassword, listRoomsFor, verifyPassword } from "./rooms.server";

export const listMyRooms = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => listRoomsFor(context.supabase, context.userId));

export const createRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        name: z.string().trim().min(1).max(60),
        password: z.string().min(4).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const code = generateRoomCode();
    const password_hash = await hashPassword(data.password);
    const { data: room, error } = await context.supabase
      .from("rooms")
      .insert({ code, name: data.name, owner_id: context.userId, password_hash })
      .select("id, code")
      .single();
    if (error) throw new Error(error.message);
    await context.supabase.from("room_members").insert({ room_id: room.id, user_id: context.userId });
    return { id: room.id, code: room.code };
  });

export const joinRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        code: z.string().trim().min(4).max(12),
        password: z.string().min(1).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: room } = await supabaseAdmin
      .from("rooms")
      .select("id, password_hash")
      .eq("code", data.code.toUpperCase())
      .maybeSingle();
    if (!room || !(await verifyPassword(data.password, room.password_hash))) {
      return { ok: false as const, error: "Invalid room ID or password." };
    }
    const { error } = await supabaseAdmin
      .from("room_members")
      .upsert({ room_id: room.id, user_id: context.userId }, { onConflict: "room_id,user_id" });
    if (error) throw new Error(error.message);
    return { ok: true as const, id: room.id };
  });

export const getRoom = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: room } = await context.supabase
      .from("rooms")
      .select("id, code, name, owner_id, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!room) return null;
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", context.userId)
      .maybeSingle();
    return {
      room,
      me: { id: context.userId, name: profile?.display_name ?? "Viewer" },
      isOwner: room.owner_id === context.userId,
    };
  });

export const getRoomMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("room_messages")
      .select("id, body, user_id, created_at")
      .eq("room_id", data.id)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    const ids = [...new Set((rows ?? []).map((r) => r.user_id))];
    const { data: profiles } = ids.length
      ? await context.supabase.from("profiles").select("id, display_name").in("id", ids)
      : { data: [] };
    const names = new Map((profiles ?? []).map((p) => [p.id, p.display_name]));
    return (rows ?? []).map((row) => ({
      ...row,
      author_name: names.get(row.user_id) ?? "Viewer",
    }));
  });

export const sendRoomMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), body: z.string().trim().min(1).max(1000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("room_messages")
      .insert({ room_id: data.id, user_id: context.userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const leaveRoom = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await context.supabase
      .from("room_members")
      .delete()
      .eq("room_id", data.id)
      .eq("user_id", context.userId);
    return { ok: true };
  });
