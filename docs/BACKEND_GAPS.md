# CineView API — Missing Endpoints Spec

Compared the frontend (StreamHub UI) against the live Swagger at
`https://cineview-api.priyanshusharma015.in/api-docs`. Everything below is **needed by the UI but not in the API yet**.

Conventions
- Auth `required` = Clerk bearer token (`Authorization: Bearer <jwt>`); `public` = no token.
- The caller's user id always comes from the token — never from the body.
- Timestamps ISO 8601 UTC. Lists return `{ items: T[], nextCursor: string | null }` with `?cursor=&limit=` (default 20, max 50).
- Errors: `{ code: string, message: string }` with proper HTTP status (400 validation, 401, 403, 404, 409, 429).

Priority: **P0** = a screen is broken without it · **P1** = feature incomplete · **P2** = polish.

---

## 1. Rooms

### P0 — `POST /api/v1/rooms/{roomCode}/messages` — send chat message
Auth required · caller must be a member (else 403).
```json
// input
{ "text": "string (1–1000)" }
// output 201
{ "id": "uuid", "text": "string", "createdAt": "ISO", "author": { "id": "string", "name": "string", "avatarUrl": "string|null" } }
```
Rate limit: 5 msgs / 3 s per user.

### P0 — `GET /api/v1/rooms/me` — rooms I own or joined (Rooms home list)
Auth required.
```json
// output 200
{ "items": [ { "code": "AB12CD", "name": "string", "hostId": "string", "isHost": true,
  "locked": false, "memberCount": 3, "maxParticipants": 8, "createdAt": "ISO", "endedAt": null } ] }
```

### P0 — `POST /api/v1/rooms/{roomCode}/token` — LiveKit token for screen share / mic
Auth required · member only.
```json
// input
{ "canPublish": true }
// output 200
{ "token": "livekit-jwt", "serverUrl": "wss://...", "identity": "clerk-user-id", "expiresAt": "ISO" }
```

### P1 — `GET /api/v1/rooms/{roomCode}/messages?after=<messageId>` — incremental fetch
Same shape as today's messages list, only messages newer than `after`. Lets the UI poll cheaply (or replace polling with a WebSocket gateway `rooms:{code}` emitting `message.created`, `member.joined`, `member.left`, `room.ended`).

### Notes on existing room endpoints
- `GET /rooms/{code}` must **never** return the password or its hash; return `locked: boolean` instead.
- `POST /join` with a wrong password → `403 { code: "invalid_password" }`; full room → `409 { code: "room_full" }`.

---

## 2. Live streams

### P0 — `GET /api/videos/live/{id}` — single stream (watch page header)
Public.
```json
{ "id": "string", "title": "string", "description": "string", "category": "string",
  "status": "live|ended", "viewerCount": 12, "startedAt": "ISO", "endedAt": null,
  "thumbnailUrl": "string|null", "playbackUrl": "https://.../index.m3u8|null",
  "host": { "id": "string", "name": "string", "avatarUrl": "string|null" } }
```

### P0 — `GET /api/videos/live/{id}/messages?after=<id>` — live chat history
Public · oldest first · max 200.
```json
{ "items": [ { "id": "uuid", "text": "string", "createdAt": "ISO", "author": { "id": "string", "name": "string", "avatarUrl": "string|null" } } ] }
```

### P0 — `POST /api/videos/live/{id}/messages` — send live chat
Auth required · 403 if stream ended.
```json
// input  { "text": "string (1–500)" }
// output 201  same item shape as above
```

### P1 — `start` response should include ingest details
`POST /api/videos/live/start` output should be:
```json
{ "id": "string", "rtmpUrl": "rtmp://...", "streamKey": "secret", "playbackUrl": "https://...m3u8",
  "livekit": { "token": "jwt", "serverUrl": "wss://..." } }
```
`streamKey` returned only to the owner.

---

## 3. Profiles (Profile page)

### P0 — `GET /api/users/{id}/profile` — public profile
Public.
```json
{ "profile": { "id": "string", "displayName": "string", "handle": "@name", "avatarUrl": "string|null",
    "bannerUrl": "string|null", "bio": "string|null", "website": "string|null", "location": "string|null",
    "createdAt": "ISO" },
  "stats": { "videos": 10, "views": 1234, "subscribers": 56 },
  "isSubscribed": false,
  "live": { "id": "string", "title": "string", "startedAt": "ISO" } }
```
`isSubscribed` only meaningful when a token is sent; `live` is `null` when offline.

### P0 — `GET /api/users/{id}/videos` — public uploads, newest first (paginated `Video[]`)

### P0 — `PATCH /api/users/me` — edit my profile
Auth required.
```json
// input (all optional)
{ "displayName": "1–60", "bio": "≤500", "website": "url ≤200", "location": "≤80",
  "avatarUrl": "≤1000", "bannerUrl": "≤1000" }
// output 200  the updated profile object
```

### P1 — `POST /api/users/me/avatar-upload-url` — presigned S3 PUT for avatar/banner
```json
// input  { "kind": "avatar|banner", "contentType": "image/jpeg|image/png|image/webp" }
// output { "uploadUrl": "https://s3...", "publicUrl": "https://cdn..." }
```

---

## 4. Subscriptions

| Method | Path | Auth | Output |
|---|---|---|---|
| POST | `/api/users/{id}/subscribe` | required | `{ "subscribed": true, "subscribers": 57 }` |
| POST | `/api/users/{id}/unsubscribe` | required | `{ "subscribed": false, "subscribers": 56 }` |
| GET | `/api/users/me/subscriptions` | required | paginated `{ id, name, avatarUrl }[]` |

P1. Feed's `subscriptions` rail depends on this. Subscribing to yourself → 400.

---

## 5. Videos

### P0 — `GET /api/videos/{id}/comments` — paginated comments
Public. Currently comments only arrive embedded in `GET /videos/{id}` (which requires auth), so signed-out viewers cannot watch or read.
```json
{ "items": [ { "id": "uuid", "text": "string", "createdAt": "ISO", "author": { "id": "string", "name": "string", "avatarUrl": "string|null" } } ], "nextCursor": null }
```

### P0 — make `GET /api/videos/{id}` public
Return the video for anyone if public; include `liked: boolean` only when a token is present. Private videos → 404 unless owner.

### P1 — `PATCH /api/videos/{id}` — edit (owner only)
```json
{ "title": "1–140", "description": "≤5000", "tags": ["≤20 items"], "category": "string", "isPublic": true }
```
### P1 — `DELETE /api/videos/{id}` — owner only · `204`, also deletes S3 objects.
### P2 — `DELETE /api/videos/{id}/comments/{commentId}` — author or video owner · `204`.

---

## 6. Platform / config

| Item | Priority | What's needed |
|---|---|---|
| CORS | P0 | Echo allowed origins (`*.lovable.app`, your custom domain, `localhost:8080`) with `credentials: true`. The UI currently works around it via its own proxy. |
| Field casing | P1 | Respond consistently in camelCase. The UI has a normalizer accepting both, but one shape avoids bugs. |
| `GET /api/users/try`, `/api/videos/live/test`, `/api/test/s3/upload` | P0 (security) | Remove or protect in production. |
| `/api/admin/*` | P0 (security) | Require an admin role check, not just a signed-in user. |
| Live webhooks `/api/v1/live/webhook/*` | P0 (security) | Verify a shared secret / signature. |
| Rate limiting | P1 | Chat, comments, likes, room join (prevent password brute force: 5 tries / min / user). |

---

## Summary checklist

- [ ] Rooms: send message, my rooms, LiveKit token, incremental messages
- [ ] Live: get by id, chat history, send chat, ingest details on start
- [ ] Profiles: public profile, user videos, update me, image upload URL
- [ ] Subscriptions: subscribe / unsubscribe / list
- [ ] Videos: public detail, public comments, edit, delete, delete comment
- [ ] Platform: CORS, camelCase, remove test routes, protect admin + webhooks, rate limits
