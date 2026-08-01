CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Creator',
  handle TEXT UNIQUE,
  avatar_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, handle, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'Creator'),
    '@' || split_part(COALESCE(NEW.email, NEW.id::text), '@', 1) || '-' || substr(NEW.id::text, 1, 4),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_name TEXT NOT NULL DEFAULT 'StreamHub',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT[] NOT NULL DEFAULT '{}',
  visibility TEXT NOT NULL DEFAULT 'public',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  view_count BIGINT NOT NULL DEFAULT 0,
  video_url TEXT,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX videos_created_at_idx ON public.videos (created_at DESC);
GRANT SELECT ON public.videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public videos are viewable by everyone" ON public.videos FOR SELECT USING (visibility = 'public');
CREATE POLICY "Owners can view their own videos" ON public.videos FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can insert their own videos" ON public.videos FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update their own videos" ON public.videos FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can delete their own videos" ON public.videos FOR DELETE TO authenticated USING (auth.uid() = owner_id);

CREATE TABLE public.video_likes (
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, user_id)
);
GRANT SELECT ON public.video_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.video_likes TO authenticated;
GRANT ALL ON public.video_likes TO service_role;
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone" ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "Users can like as themselves" ON public.video_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own like" ON public.video_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX comments_video_id_idx ON public.comments (video_id, created_at DESC);
GRANT SELECT ON public.comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT ALL ON public.comments TO service_role;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can comment as themselves" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comment" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comment" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.subscriptions (
  subscriber_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (subscriber_id, channel_id)
);
GRANT SELECT ON public.subscriptions TO anon;
GRANT SELECT, INSERT, DELETE ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Subscriptions are viewable by everyone" ON public.subscriptions FOR SELECT USING (true);
CREATE POLICY "Users can subscribe as themselves" ON public.subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = subscriber_id);
CREATE POLICY "Users can unsubscribe themselves" ON public.subscriptions FOR DELETE TO authenticated USING (auth.uid() = subscriber_id);

INSERT INTO public.videos (channel_name, title, description, tags, duration_seconds, view_count, video_url, thumbnail_url, created_at) VALUES
('Big Buck Studio', 'Big Buck Bunny — Full Short Film', 'A giant rabbit takes revenge on three bullying rodents in this open-source animated classic.', ARRAY['animation','short film','open source'], 596, 1284300, 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=800&q=80', now() - interval '2 days'),
('Blender Open Movies', 'Sintel — Official Trailer', 'A lonely young woman searches for her lost dragon companion across a hostile world.', ARRAY['animation','fantasy','trailer'], 52, 843120, 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80', now() - interval '5 days'),
('Nature Frames', 'Coastal Timelapse in 4K', 'Waves, cliffs and shifting light captured over twelve hours on the Atlantic coast.', ARRAY['nature','timelapse','4k'], 421, 219845, 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=800&q=80', now() - interval '9 days'),
('Devcast', 'Building a Streaming Platform from Scratch', 'Architecture walkthrough: object storage, transcoding pipelines and adaptive playback.', ARRAY['coding','tutorial','streaming'], 1832, 97430, 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1517180102446-f3ece451e9d8?w=800&q=80', now() - interval '14 days'),
('Night Signals', 'Lo-fi Beats for Late Night Editing', 'Two hours of mellow instrumentals to keep the timeline moving.', ARRAY['music','lofi','focus'], 7320, 512760, 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&q=80', now() - interval '21 days'),
('Urban Motion', 'Tokyo After Rain — Street Cinematography', 'Neon reflections and quiet alleys, shot handheld across three nights in Shinjuku.', ARRAY['cinematography','travel','tokyo'], 634, 388210, 'https://test-videos.co.uk/vids/sintel/mp4/h264/720/Sintel_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80', now() - interval '28 days'),
('Kitchen Lab', 'The Only Pasta Technique You Need', 'Emulsification explained, then applied to four classic Roman sauces.', ARRAY['food','cooking','how-to'], 912, 664120, 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=800&q=80', now() - interval '33 days'),
('Deep Field', 'What Webb Actually Sees', 'Infrared astronomy explained without the jargon, with real mission imagery.', ARRAY['science','space','explainer'], 1145, 1043900, 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/720/Jellyfish_720_10s_1MB.mp4', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80', now() - interval '40 days');