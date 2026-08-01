CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT 'Watch Room',
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.room_members (
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE public.room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
GRANT SELECT, INSERT, DELETE ON public.room_members TO authenticated;
GRANT ALL ON public.room_members TO service_role;
GRANT SELECT, INSERT, DELETE ON public.room_messages TO authenticated;
GRANT ALL ON public.room_messages TO service_role;

CREATE OR REPLACE FUNCTION public.is_room_member(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = _room_id AND user_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_room_owner(_room_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rooms WHERE id = _room_id AND owner_id = _user_id
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_room_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_room_owner(uuid, uuid) TO authenticated, service_role;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and members can view rooms"
  ON public.rooms FOR SELECT TO authenticated
  USING (auth.uid() = owner_id OR public.is_room_member(id, auth.uid()));

CREATE POLICY "Users can create their own rooms"
  ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their rooms"
  ON public.rooms FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their rooms"
  ON public.rooms FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

CREATE POLICY "Members can view room membership"
  ON public.room_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_room_member(room_id, auth.uid()) OR public.is_room_owner(room_id, auth.uid()));

CREATE POLICY "Owners can add themselves as member"
  ON public.room_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_room_owner(room_id, auth.uid()));

CREATE POLICY "Members can leave, owners can remove"
  ON public.room_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_room_owner(room_id, auth.uid()));

CREATE POLICY "Members can read room chat"
  ON public.room_messages FOR SELECT TO authenticated
  USING (public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Members can post to room chat"
  ON public.room_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_room_member(room_id, auth.uid()));

CREATE POLICY "Authors and owners can delete messages"
  ON public.room_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_room_owner(room_id, auth.uid()));

CREATE INDEX room_messages_room_created_idx ON public.room_messages (room_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER rooms_set_updated_at
  BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.room_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_messages;