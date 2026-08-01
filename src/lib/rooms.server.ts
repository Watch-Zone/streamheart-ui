import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const ITERATIONS = 100_000;

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i += 1) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

async function derive(password: string, salt: Uint8Array): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    key,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${toHex(salt.buffer)}$${await derive(password, salt)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, , saltHex, digest] = stored.split("$");
  if (scheme !== "pbkdf2" || !saltHex || !digest) return false;
  const candidate = await derive(password, fromHex(saltHex));
  if (candidate.length !== digest.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i += 1) diff |= candidate.charCodeAt(i) ^ digest.charCodeAt(i);
  return diff === 0;
}

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
}

export type RoomDTO = {
  id: string;
  code: string;
  name: string;
  owner_id: string;
  created_at: string;
  member_count: number;
};

export async function listRoomsFor(
  client: SupabaseClient<Database>,
  userId: string,
): Promise<RoomDTO[]> {
  const { data, error } = await client
    .from("rooms")
    .select("id, code, name, owner_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const { data: members } = await client
    .from("room_members")
    .select("room_id")
    .in(
      "room_id",
      rows.map((row) => row.id),
    );
  const counts = new Map<string, number>();
  for (const m of members ?? []) counts.set(m.room_id, (counts.get(m.room_id) ?? 0) + 1);
  return rows.map((row) => ({
    ...row,
    owner_id: row.owner_id ?? userId,
    member_count: counts.get(row.id) ?? 0,
  }));
}
