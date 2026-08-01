# StreamHub Backend API

All app-internal endpoints are TanStack **server functions** (typed RPC). They are called from React with
`fn({ data: <input> })`. Auth-protected functions attach the signed-in user's bearer token automatically
and resolve the caller server-side — `user_id` is **never** accepted from the client.

Conventions used below:

- **Auth**: `public` = callable signed-out · `required` = 401 without a session.
- All inputs are validated with Zod; invalid input rejects before the handler runs.
- All timestamps are ISO 8601 strings (UTC). All ids are UUIDs unless stated.
- Row access is additionally enforced by row-level security in the database.

---

## 1. Live streaming — `src/lib/live.functions.ts`

### `listLiveStreams`

| | |
|---|---|
| Method | GET |
| Auth | public |

**Input**

```ts
{ status?: "live" | "ended" | "all" }   // default "all"
```

**Output** — up to 48 rows, newest first

```ts
Array<{
  id: string;
  owner_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  playback_url: string | null;
  status: "live" | "ended";
  viewer_count: number;
  started_at: string;
  ended_at: string | null;
  host_name: string;       // joined from profiles
  host_avatar: string | null;
}>
```

### `getLiveStream`

| | |
|---|---|
| Method | GET · Auth | public |

**Input** `{ id: string /* uuid */ }`
**Output** one stream object as above, or `null` when it does not exist.

### `getLiveMessages`

| | |
|---|---|
| Method | GET · Auth | public |

**Input** `{ id: string /* stream id */ }`

**Output** — oldest first, max 200

```ts
Array<{
  id: string;
  body: string;
  user_id: string;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
}>
```

### `startLiveStream`

| | |
|---|---|
| Method | POST · Auth | required |

**Input**

```ts
{
  title: string;             // 1–140
  description?: string;      // ≤ 2000, default ""
  category?: string;         // ≤ 40, default "General"
  playback_url?: string|null // valid URL (MP4/HLS), default null
  thumbnail_url?: string|null
}
```

**Output** `{ id: string }` — the new stream, created with `status: "live"` and `owner_id` = caller.

### `endLiveStream`

| | |
|---|---|
| Method | POST · Auth | required |

**Input** `{ id: string }`
**Output** `{ ok: true }`. No-op unless the caller owns the stream.

### `sendLiveMessage`

| | |
|---|---|
| Method | POST · Auth | required |

**Input** `{ id: string /* stream id */, body: string /* 1–500 */ }`
**Output** `{ ok: true }`

**Realtime**: clients subscribe to Postgres `INSERT` on `public.live_messages`
filtered by `stream_id=eq.<id>` and refetch `getLiveMessages` on each event.

---

## 2. Profiles — `src/lib/profile.functions.ts`

### `getProfile`

| | |
|---|---|
| Method | GET · Auth | public |

**Input** `{ userId: string }`

**Output** (`null` if the profile does not exist)

```ts
{
  profile: {
    id: string;
    display_name: string;
    handle: string;
    avatar_url: string | null;
    banner_url: string | null;
    bio: string | null;
    website: string | null;
    location: string | null;
    created_at: string;
  };
  videos: VideoDTO[];        // public uploads, newest first, max 48, signed media URLs
  live: { id: string; title: string; status: string; started_at: string } | null;
  stats: { videos: number; views: number; subscribers: number };
}
```

### `updateMyProfile`

| | |
|---|---|
| Method | POST · Auth | required |

**Input**

```ts
{
  display_name: string;  // 1–60
  bio?: string;          // ≤ 500
  website?: string;      // ≤ 200
  location?: string;     // ≤ 80
  avatar_url?: string;   // ≤ 1000
  banner_url?: string;   // ≤ 1000
}
```

**Output** `{ ok: true }`. Always updates the **caller's own** row; empty strings are stored as `null`.

---

## 3. Rooms — `src/lib/rooms.functions.ts`

All room functions require auth.

| Function | Method | Input | Output |
|---|---|---|---|
| `listMyRooms` | GET | – | `Array<{ id, code, name, owner_id, created_at, member_count }>` |
| `createRoom` | POST | `{ name: string /*1–60*/, password: string /*4–72*/ }` | `{ id, code }` |
| `joinRoom` | POST | `{ code: string /*4–12*/, password: string }` | `{ ok: true, id }` \| `{ ok: false, error: string }` |
| `getRoom` | GET | `{ id }` | `{ room, me: { id, name }, isOwner }` \| `null` |
| `getRoomMessages` | GET | `{ id }` | `Array<{ id, body, user_id, created_at, author_name }>` |
| `sendRoomMessage` | POST | `{ id, body /*1–1000*/ }` | `{ ok: true }` |
| `leaveRoom` | POST | `{ id }` | `{ ok: true }` |

Room passwords are hashed with PBKDF2-SHA256 (100k iterations, per-row salt) and verified server-side
with a constant-time comparison. The hash is never returned to the client. Membership rows are what RLS
checks for reading room chat.

---

## 4. Videos — `src/lib/videos.functions.ts`

| Function | Auth | Input | Output |
|---|---|---|---|
| `getFeed` | public | – | `VideoDTO[]` |
| `searchVideos` | public | `{ q?: string, tag?: string \| null }` | `VideoDTO[]` |
| `getVideo` | public | `{ id }` | `{ video, related } \| null` |
| `getComments` | public | `{ id }` | `CommentDTO[]` |
| `addComment` | required | `{ id, body }` | `{ ok: true }` |
| `getMyVideos` | required | – | `VideoDTO[]` |

```ts
type VideoDTO = {
  id: string; owner_id: string | null; channel_name: string;
  title: string; description: string; tags: string[]; visibility: string;
  duration_seconds: number; view_count: number;
  video_url: string | null;      // short-lived signed URL
  thumbnail_url: string | null;  // short-lived signed URL
  created_at: string;
};
```

---

## 5. Error contract

| Situation | Result |
|---|---|
| Zod validation failure | throws before the handler; surfaced as a request error |
| Missing / expired session on a protected fn | HTTP `401 Unauthorized` |
| Row hidden by RLS | empty array or `null`, not an error |
| Database failure | throws `Error(message)`; the UI shows a toast |

Client-side, every mutation uses TanStack Query and invalidates the matching query key
(`["live-streams"]`, `["live-stream", id]`, `["live-messages", id]`, `["profile", userId]`,
`["rooms"]`, `["room-messages", id]`).
