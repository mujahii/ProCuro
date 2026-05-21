-- SECURITY DEFINER function so avatar_url updates bypass the
-- users_update_own WITH CHECK (role = get_my_role()) constraint,
-- which rejects updates when role IS NULL or causes false failures.
-- Updates both users and supplier_profiles in one call.
CREATE OR REPLACE FUNCTION public.update_own_avatar(p_url TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users SET avatar_url = p_url WHERE id = auth.uid();
  UPDATE public.supplier_profiles SET avatar_url = p_url WHERE user_id = auth.uid();
END;
$$;
