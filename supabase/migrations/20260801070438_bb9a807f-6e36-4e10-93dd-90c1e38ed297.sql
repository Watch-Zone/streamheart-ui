REVOKE EXECUTE ON FUNCTION public.is_room_member(uuid, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_room_owner(uuid, uuid) FROM authenticated;