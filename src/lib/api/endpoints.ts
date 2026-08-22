/** Every CineView API call the app makes, in one place. */
import { api } from "./http";
import {
  toDashboard,
  toFeed,
  toLiveJoin,
  toLiveStreamList,
  toList,
  toRoom,
  toRoomMember,
  toRoomMessage,
  toVideoDetail,
  toVideoList,
} from "./normalize";

/* ── Discovery (public) ─────────────────────────────────────────────── */

export const getFeed = () => api.get<unknown>("/api/feed").then(toFeed);

export const searchVideos = (query: string) =>
  query.trim().length < 2
    ? Promise.resolve([])
    : api.get<unknown>(`/api/videos/search?q=${encodeURIComponent(query.trim())}`).then(toVideoList);

/* ── Video (auth) ───────────────────────────────────────────────────── */

export const getVideo = (id: string) =>
  api.get<unknown>(`/api/videos/${encodeURIComponent(id)}`, { auth: true }).then(toVideoDetail);

export const getVideoStatus = (id: string) =>
  api.get<{ status?: string }>(`/api/videos/${encodeURIComponent(id)}/status`);

export const recordView = (id: string) =>
  api.post<unknown>(`/api/videos/${encodeURIComponent(id)}/view`).catch(() => null);

export const likeVideo = (id: string) =>
  api.post<unknown>(`/api/videos/${encodeURIComponent(id)}/like`, undefined, { auth: true });

export const unlikeVideo = (id: string) =>
  api.post<unknown>(`/api/videos/${encodeURIComponent(id)}/unlike`, undefined, { auth: true });

export const postComment = (id: string, text: string) =>
  api.post<unknown>(`/api/videos/${encodeURIComponent(id)}/comments`, { text }, { auth: true });

/* ── Upload (auth) ──────────────────────────────────────────────────── */

export type UploadTicket = {
  videoId: string;
  videoUploadUrl: string;
  thumbnailUploadUrl?: string;
  videoKey: string;
};

export const createUploadUrls = (input: {
  videoExt: string;
  contentType: string;
  thumbnailExt?: string;
}) => api.post<UploadTicket>("/api/videos/upload-url", input, { auth: true });

export const confirmUpload = (input: {
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  isPublic: boolean;
  fileKey: string;
}) => api.post<{ videoId: string | number; status: string }>("/api/videos", input, { auth: true });

/* ── Creator studio (auth) ──────────────────────────────────────────── */

export const getDashboard = () => api.get<unknown>("/api/dashboard", { auth: true }).then(toDashboard);

/* ── Live ───────────────────────────────────────────────────────────── */

export const listLiveStreams = () => api.get<unknown>("/api/videos/live/list").then(toLiveStreamList);

export const startLiveStream = (input: { title: string; category?: string }) =>
  api.post<unknown>("/api/videos/live/start", input, { auth: true });

export const joinLiveStream = (id: string) =>
  api.get<unknown>(`/api/videos/live/join/${encodeURIComponent(id)}`, { auth: true }).then(toLiveJoin);

export const endLiveStream = (id: string) =>
  api.post<unknown>(`/api/videos/live/end/${encodeURIComponent(id)}`, undefined, { auth: true });

/* ── Rooms ──────────────────────────────────────────────────────────── */

export const createRoom = (input: { name: string; password?: string; maxParticipants?: number }) =>
  api.post<unknown>("/api/v1/rooms", input, { auth: true }).then(toRoom);

export const getRoom = (code: string) =>
  api.get<unknown>(`/api/v1/rooms/${encodeURIComponent(code)}`, { auth: true }).then(toRoom);

export const joinRoom = (code: string, password?: string) =>
  api.post<unknown>(`/api/v1/rooms/${encodeURIComponent(code)}/join`, { password }, { auth: true });

export const leaveRoom = (code: string) =>
  api.post<unknown>(`/api/v1/rooms/${encodeURIComponent(code)}/leave`, undefined, { auth: true });

export const getRoomMembers = (code: string) =>
  api
    .get<unknown>(`/api/v1/rooms/${encodeURIComponent(code)}/members`, { auth: true })
    .then((data) => toList(data, toRoomMember));

export const getRoomMessages = (code: string) =>
  api
    .get<unknown>(`/api/v1/rooms/${encodeURIComponent(code)}/messages`, { auth: true })
    .then((data) => toList(data, toRoomMessage));

export const endRoom = (code: string) =>
  api.post<unknown>(`/api/v1/rooms/${encodeURIComponent(code)}/end`, undefined, { auth: true });

/**
 * The documented room API is read-only for messages; the backend is expected to
 * expose this companion route (or a socket gateway). Failures surface in the UI.
 */
export const sendRoomMessage = (code: string, text: string) =>
  api.post<unknown>(`/api/v1/rooms/${encodeURIComponent(code)}/messages`, { text }, { auth: true });
