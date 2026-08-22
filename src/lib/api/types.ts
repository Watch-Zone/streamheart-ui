/** Application-facing view models. Backend rows are mapped into these. */

export type Video = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  channelName: string;
  ownerId: string | null;
  ownerAvatar: string | null;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
  status: string;
  isLive: boolean;
  createdAt: string;
};

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
};

export type Feed = {
  trendingTitle: string;
  trending: Video[];
  forYou: Video[];
  forYouFilters: string[];
  subscriptions: Video[];
};

export type VideoDetail = {
  video: Video;
  related: Video[];
  comments: Comment[];
  liked: boolean;
};

export type LiveStream = {
  id: string;
  title: string;
  hostName: string;
  hostAvatar: string | null;
  category: string;
  thumbnailUrl: string | null;
  viewerCount: number;
  startedAt: string;
};

export type LiveJoin = {
  token: string;
  serverUrl: string | null;
  playbackUrl: string | null;
};

export type DashboardStats = {
  videos: number;
  views: number;
  likes: number;
  subscribers: number;
};

export type Dashboard = {
  displayName: string;
  avatarUrl: string | null;
  stats: DashboardStats;
  uploads: Video[];
};

export type Room = {
  code: string;
  name: string;
  hostId: string | null;
  locked: boolean;
  memberCount: number;
  maxParticipants: number;
  createdAt: string;
};

export type RoomMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isHost: boolean;
};

export type RoomMessage = {
  id: string;
  body: string;
  authorName: string;
  authorAvatar: string | null;
  createdAt: string;
};
