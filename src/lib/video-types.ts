export type VideoDTO = {
  id: string;
  owner_id: string | null;
  channel_name: string;
  title: string;
  description: string;
  tags: string[];
  visibility: string;
  duration_seconds: number;
  view_count: number;
  video_url: string | null;
  thumbnail_url: string | null;
  created_at: string;
};

export type CommentDTO = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  author_name: string;
  author_avatar: string | null;
};
