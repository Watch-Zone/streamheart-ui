## Goal

Move away from the YouTube-style grid to a cinematic OTT streaming look (dark navy/indigo gradients, glow accents, full-bleed hero banners, horizontal rails, poster tiles) — inspired by premium streaming apps, with our own branding, not a copy of anyone's logo or artwork. Plus a new **Rooms** feature for watch-together style sessions with chat and screen sharing.

## 1. Redesign — new visual system

- New tokens in `src/styles.css`: deep midnight background, indigo→violet gradients, soft glow shadows, glass surfaces, larger radii, display typeface for headings.
- Replace the left-sidebar shell with a **floating top nav bar** (logo, Home, Explore, Rooms, search, avatar) that turns translucent on scroll, plus a bottom tab bar on mobile.
- **Home**: full-bleed autoplaying hero banner with gradient scrim, title, description and Play/Add buttons; below it horizontal scroll rails ("Trending Now", "New Releases", "Continue Watching", "Recommended") with 16:9 poster cards that lift and glow on hover.
- **Watch page**: cinema layout — large player, metadata bar with pills, gradient panels for description/comments, related titles as a rail.
- **Explore**: hero search with category chips and poster grid.
- **Upload / Dashboard / Auth**: restyled to match (glass cards, gradient CTAs).

## 2. Rooms feature


| Route            | Content                                                               |
| ---------------- | --------------------------------------------------------------------- |
| `/rooms`         | List of your rooms + Create room + Join by ID & password              |
| `/rooms/$roomId` | The live room: participant strip, screen-share stage, live chat panel |


**Create/Join**

- Create returns a short human-friendly Room ID and takes a password. Password is hashed (bcrypt-style) and verified server-side; never sent to the client.
- Joining with correct ID + password grants a membership row; membership is what RLS checks for chat and presence.

**Inside the room**

- Live chat: messages table + Realtime subscription, message bubbles with avatar, name and timestamp.
- Screen sharing: `getDisplayMedia` + WebRTC peer connections, with Realtime broadcast channels for offer/answer/ICE signalling. Whoever shares becomes the stage; others see the stream. Works for small groups (a handful of participants per room).
- Presence list showing who's in the room, plus mic/leave controls and a "Stop sharing" button.

## Technical details

- New tables: `rooms` (id, code, name, owner, password_hash, created_at), `room_members`, `room_messages` — each with GRANTs, RLS scoped to membership, and Realtime enabled on messages.
- Password hash + verification and room creation/join go through TanStack server functions; screen-share signalling is client-side over Supabase Realtime broadcast (no media touches the server).
- Reusable components: `HeroBanner`, `Rail`, `PosterCard`, `TopNav`, `RoomStage`, `RoomChat`.
- Per-route `head()` metadata updated for the new sections; rooms are `noindex`.
- Fixes the current hydration warning on the home page along the way.

## Notes

- Screen sharing is peer-to-peer, so it's best with roughly 2–6 people per room; browser support requires a desktop browser (mobile browsers can watch but not share).
- No DRM, no synced playback of platform video across participants in this pass — the shared experience is chat + screen share. Say the word and I'll add synced playback next.  

- prefect also try a good teaming architecture inside it, so which look more amzing - and also try to use the animation inside the UI side - make sure our page is remain light - No lag or any things like that --
  &nbsp;