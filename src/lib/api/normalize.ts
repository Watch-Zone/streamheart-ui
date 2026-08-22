/**
 * The Nest API documents request bodies but not response shapes, and different
 * controllers return different casing. These readers accept every plausible
 * key so the UI never blanks out because a field was named `view_count`
 * instead of `viewCount`.
 */
import type {
  Comment,
  Dashboard,
  Feed,
  LiveJoin,
  LiveStream,
  Room,
  RoomMember,
  RoomMessage,
  Video,
} from "./types";

type Rec = Record<string, unknown>;

const asRec = (value: unknown): Rec => (value && typeof value === "object" ? (value as Rec) : {});

function pick(source: Rec, keys: string[]): unknown {
  for (const key of keys) {
    const value = source[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

const str = (source: Rec, keys: string[], fallback = ""): string => {
  const value = pick(source, keys);
  return value === undefined ? fallback : String(value);
};

const num = (source: Rec, keys: string[], fallback = 0): number => {
  const value = pick(source, keys);
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const bool = (source: Rec, keys: string[], fallback = false): boolean => {
  const value = pick(source, keys);
  if (value === undefined) return fallback;
  return value === true || value === "true" || value === 1 || value === "1";
};

const nullableStr = (source: Rec, keys: string[]): string | null => {
  const value = pick(source, keys);
  return value === undefined ? null : String(value);
};

const list = (value: unknown): Rec[] => (Array.isArray(value) ? value.map(asRec) : []);

function strArray(source: Rec, keys: string[]): string[] {
  const value = pick(source, keys);
  if (Array.isArray(value)) return value.map((entry) => String(entry)).filter(Boolean);
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
}

export function toVideo(input: unknown): Video {
  const row = asRec(input);
  const owner = asRec(pick(row, ["owner", "user", "channel", "creator"]));
  const id = str(row, ["id", "videoId", "video_id", "uuid"]);

  return {
    id,
    title: str(row, ["title", "name"], "Untitled"),
    description: str(row, ["description", "summary"]),
    tags: strArray(row, ["tags"]),
    category: str(row, ["category"], "General"),
    channelName:
      str(row, ["channelName", "channel_name"]) ||
      str(owner, ["displayName", "display_name", "name", "username"], "CineView"),
    ownerId: nullableStr(row, ["ownerId", "owner_id", "userId", "user_id"]) ?? nullableStr(owner, ["id"]),
    ownerAvatar:
      nullableStr(row, ["ownerAvatar", "owner_avatar", "avatarUrl", "avatar_url"]) ??
      nullableStr(owner, ["avatarUrl", "avatar_url", "imageUrl", "image_url"]),
    durationSeconds: num(row, ["durationSeconds", "duration_seconds", "duration"]),
    viewCount: num(row, ["viewCount", "view_count", "views"]),
    likeCount: num(row, ["likeCount", "like_count", "likes"]),
    thumbnailUrl: nullableStr(row, ["thumbnailUrl", "thumbnail_url", "thumbnail", "posterUrl"]),
    playbackUrl:
      nullableStr(row, ["playbackUrl", "playback_url", "hlsUrl", "hls_url", "videoUrl", "video_url", "url"]) ??
      (id ? `/api/be/api/videos/${id}/playback/master.m3u8` : null),
    status: str(row, ["status", "processingStatus"], "ready"),
    isLive: bool(row, ["isLive", "is_live"]) || str(row, ["kind"]) === "live",
    createdAt: str(row, ["createdAt", "created_at", "publishedAt"], new Date(0).toISOString()),
  };
}

export function toVideoList(input: unknown): Video[] {
  const source = Array.isArray(input) ? input : (pick(asRec(input), ["items", "data", "results", "videos"]) ?? []);
  return list(source).map(toVideo);
}

export function toFeed(input: unknown): Feed {
  const row = asRec(input);
  return {
    trendingTitle: str(row, ["trendingTitle", "trending_title"], "Trending now"),
    trending: toVideoList(row["trending"]),
    forYou: toVideoList(pick(row, ["forYou", "for_you"])),
    forYouFilters: strArray(row, ["forYouFilters", "for_you_filters"]),
    subscriptions: toVideoList(row["subscriptions"]),
  };
}

export function toComment(input: unknown): Comment {
  const row = asRec(input);
  const author = asRec(pick(row, ["author", "user", "owner"]));
  return {
    id: str(row, ["id", "commentId"], crypto.randomUUID()),
    body: str(row, ["text", "body", "message", "content"]),
    createdAt: str(row, ["createdAt", "created_at"], new Date().toISOString()),
    authorName:
      str(row, ["authorName", "author_name"]) ||
      str(author, ["displayName", "display_name", "name", "username"], "Viewer"),
    authorAvatar:
      nullableStr(row, ["authorAvatar", "author_avatar"]) ??
      nullableStr(author, ["avatarUrl", "avatar_url", "imageUrl"]),
  };
}

export function toVideoDetail(input: unknown) {
  const row = asRec(input);
  const videoSource = pick(row, ["video", "item", "data"]) ?? row;
  return {
    video: toVideo(videoSource),
    related: toVideoList(pick(row, ["related", "recommended", "suggestions"])),
    comments: list(pick(row, ["comments", "chat"])).map(toComment),
    liked: bool(row, ["liked", "isLiked", "hasLiked"]),
  };
}

export function toLiveStream(input: unknown): LiveStream {
  const row = asRec(input);
  const host = asRec(pick(row, ["host", "owner", "user"]));
  return {
    id: str(row, ["id", "streamId", "roomName", "videoId"]),
    title: str(row, ["title", "name"], "Live stream"),
    hostName:
      str(row, ["hostName", "host_name", "channelName"]) ||
      str(host, ["displayName", "name", "username"], "Creator"),
    hostAvatar:
      nullableStr(row, ["hostAvatar", "host_avatar"]) ?? nullableStr(host, ["avatarUrl", "imageUrl"]),
    category: str(row, ["category"], "Live"),
    thumbnailUrl: nullableStr(row, ["thumbnailUrl", "thumbnail_url", "thumbnail"]),
    viewerCount: num(row, ["viewerCount", "viewer_count", "viewers"]),
    startedAt: str(row, ["startedAt", "started_at", "createdAt"], new Date().toISOString()),
  };
}

export function toLiveStreamList(input: unknown): LiveStream[] {
  const source = Array.isArray(input) ? input : (pick(asRec(input), ["items", "streams", "data"]) ?? []);
  return list(source).map(toLiveStream);
}

export function toLiveJoin(input: unknown): LiveJoin {
  const row = asRec(input);
  return {
    token: str(row, ["token", "accessToken", "joinToken"]),
    serverUrl: nullableStr(row, ["serverUrl", "url", "livekitUrl", "wsUrl"]),
    playbackUrl: nullableStr(row, ["playbackUrl", "hlsUrl", "playback_url"]),
  };
}

export function toDashboard(input: unknown): Dashboard {
  const row = asRec(input);
  const profile = asRec(pick(row, ["profile", "user", "creator"]));
  const stats = asRec(pick(row, ["stats", "totals"]));
  const uploads = toVideoList(pick(row, ["uploads", "videos", "recentUploads", "history"]));

  return {
    displayName: str(profile, ["displayName", "display_name", "name", "username"], "Creator"),
    avatarUrl: nullableStr(profile, ["avatarUrl", "avatar_url", "imageUrl"]),
    stats: {
      videos: num(stats, ["videos", "videoCount", "totalVideos"], uploads.length),
      views: num(stats, ["views", "totalViews", "viewCount"]),
      likes: num(stats, ["likes", "totalLikes", "likeCount"]),
      subscribers: num(stats, ["subscribers", "subscriberCount", "followers"]),
    },
    uploads,
  };
}

export function toRoom(input: unknown): Room {
  const row = asRec(input);
  return {
    code: str(row, ["roomCode", "room_code", "code", "id"]),
    name: str(row, ["name", "title"], "Watch room"),
    hostId: nullableStr(row, ["hostId", "host_id", "ownerId", "createdBy"]),
    locked: bool(row, ["locked", "isLocked", "is_locked"]),
    memberCount: num(row, ["memberCount", "member_count", "participants", "activeMembers"]),
    maxParticipants: num(row, ["maxParticipants", "max_participants"], 20),
    createdAt: str(row, ["createdAt", "created_at"], new Date().toISOString()),
  };
}

export function toRoomMember(input: unknown): RoomMember {
  const row = asRec(input);
  const user = asRec(pick(row, ["user", "member", "profile"]));
  return {
    id: str(row, ["userId", "user_id", "id"]) || str(user, ["id"]),
    name:
      str(row, ["name", "displayName", "username"]) ||
      str(user, ["displayName", "name", "username"], "Guest"),
    avatarUrl: nullableStr(row, ["avatarUrl", "avatar_url"]) ?? nullableStr(user, ["avatarUrl", "imageUrl"]),
    isHost: bool(row, ["isHost", "is_host", "host"]),
  };
}

export function toRoomMessage(input: unknown): RoomMessage {
  const row = asRec(input);
  const author = asRec(pick(row, ["user", "author", "member"]));
  return {
    id: str(row, ["id", "messageId"], crypto.randomUUID()),
    body: str(row, ["text", "body", "message", "content"]),
    authorName:
      str(row, ["authorName", "userName", "name"]) ||
      str(author, ["displayName", "name", "username"], "Guest"),
    authorAvatar:
      nullableStr(row, ["authorAvatar", "avatarUrl"]) ?? nullableStr(author, ["avatarUrl", "imageUrl"]),
    createdAt: str(row, ["createdAt", "created_at", "sentAt"], new Date().toISOString()),
  };
}

export function toList<T>(input: unknown, map: (entry: unknown) => T): T[] {
  const source = Array.isArray(input) ? input : (pick(asRec(input), ["items", "data", "results"]) ?? []);
  return list(source).map(map);
}
