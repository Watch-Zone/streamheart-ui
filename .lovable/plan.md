## Goal

Recreate the StreamHub video-streaming UI from `Watch-Zone/VideoStream-UI` in this project. The original is a Next.js App Router app, which can't run here — I'll rebuild the same pages, layout and dark YouTube-like styling on this project's React + TanStack Start stack, and back it with Lovable Cloud instead of the external NestJS API.

## Pages

| Route | Content |
|---|---|
| `/` | Public feed — sidebar + responsive video grid with thumbnails, title, channel, views, duration |
| `/videos/$id` | Watch page — player, title/description/tags, channel row, like/subscribe actions, comments panel, related videos |
| `/explore` | Search UI with query, filters, result grid |
| `/upload` | Protected — file picker, title/description/tags/visibility, upload progress bar |
| `/dashboard` | Protected — creator's own videos, views, edit/delete |
| `/auth` | Sign in + sign up (email/password and Google) |
| `/reset-password` | Password reset completion |

Shared shell: top bar (logo, search, upload, account menu) + collapsible left sidebar (Home, Explore, Subscriptions, Your videos), matching the original's dark theme.

## Backend (Lovable Cloud)

- Enable Cloud; email/password + Google sign-in.
- `profiles` table (display name, handle, avatar) auto-created on signup by trigger.
- `videos` table: owner, title, description, tags, visibility, duration, view_count, thumbnail/video paths, created_at.
- `video_likes` and `comments` tables.
- `subscriptions` table (subscriber → channel).
- Storage buckets: `videos` (private-by-owner reads via signed URL or public if you prefer simple playback) and `thumbnails` (public).
- RLS on every table: public read for public videos, owner-scoped read for private/unlisted, owner-only writes; grants included in each migration.
- Reads/writes via TanStack server functions; protected pages under `_authenticated`.
- Seed migration with a handful of demo videos so the feed isn't empty on first load.

## Playback note

The original streams HLS from a transcoding backend. Lovable Cloud has no transcoder, so playback will use the uploaded file directly in a styled HTML5 player (progress, volume, fullscreen, speed). Same UI, no adaptive bitrate.

## Technical details

- Routes in `src/routes/`, per-route `head()` metadata (title, description, og/twitter).
- Design tokens (dark surfaces, red accent, radii) defined in `src/styles.css` — no hardcoded colors in components.
- Upload progress via XHR/`onUploadProgress` against Cloud storage.
- Shared UI in `src/components/` (VideoCard, VideoGrid, AppSidebar, PlayerShell, CommentList).

## Not included

- HLS/adaptive transcoding, live streaming and live chat (the repo's socket-based live features), Clerk/Paseto auth (replaced by Cloud auth), AWS Amplify config.
