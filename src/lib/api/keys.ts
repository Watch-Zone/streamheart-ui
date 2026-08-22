/** Central TanStack Query keys so invalidation stays consistent. */
export const qk = {
  feed: ["feed"] as const,
  search: (q: string) => ["search", q] as const,
  video: (id: string) => ["video", id] as const,
  dashboard: ["dashboard"] as const,
  liveList: ["live", "list"] as const,
  liveJoin: (id: string) => ["live", "join", id] as const,
  room: (code: string) => ["room", code] as const,
  roomMembers: (code: string) => ["room", code, "members"] as const,
  roomMessages: (code: string) => ["room", code, "messages"] as const,
};
