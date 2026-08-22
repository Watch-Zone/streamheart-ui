
-- comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Signed in users can view comments" ON public.comments FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.comments FROM anon;

-- live_messages
DROP POLICY IF EXISTS "Live chat is publicly readable" ON public.live_messages;
CREATE POLICY "Signed in users can view live chat" ON public.live_messages FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.live_messages FROM anon;

-- subscriptions
DROP POLICY IF EXISTS "Subscriptions are viewable by everyone" ON public.subscriptions;
CREATE POLICY "Signed in users can view subscriptions" ON public.subscriptions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.subscriptions FROM anon;

-- video_likes
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON public.video_likes;
CREATE POLICY "Signed in users can view likes" ON public.video_likes FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.video_likes FROM anon;

-- rooms: hide password_hash from client roles
REVOKE SELECT ON public.rooms FROM anon, authenticated;
GRANT SELECT (id, code, name, owner_id, created_at, updated_at) ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
