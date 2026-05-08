-- Fix 1: Add WITH CHECK to users_update_own policy to prevent role self-escalation.
-- Without this, any authenticated user could call supabase.from('users').update({ role: 'admin' })
-- and PostgREST would apply it because only USING (not WITH CHECK) was evaluated.
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE
  USING (auth.uid() = id OR get_my_role() = 'admin')
  WITH CHECK (
    get_my_role() = 'admin'
    OR (
      auth.uid() = id
      AND role = get_my_role()
    )
  );

-- Fix 2: Add role allowlist to create_profile_from_oauth to prevent privilege escalation via OAuth.
-- Without this, a user with role = NULL could call the RPC with p_role: 'admin' from the browser.
CREATE OR REPLACE FUNCTION public.create_profile_from_oauth(p_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_existing_role text;
BEGIN
  IF p_role NOT IN ('restaurant_owner', 'supplier') THEN
    RAISE EXCEPTION 'Invalid role: only restaurant_owner or supplier are allowed';
  END IF;

  SELECT role INTO v_existing_role FROM public.users WHERE id = v_user_id;

  IF v_existing_role IS NOT NULL THEN
    RETURN;
  END IF;

  UPDATE public.users SET role = p_role WHERE id = v_user_id;

  IF p_role = 'restaurant_owner' THEN
    INSERT INTO public.owner_profiles (user_id) VALUES (v_user_id)
    ON CONFLICT DO NOTHING;
  ELSIF p_role = 'supplier' THEN
    INSERT INTO public.supplier_profiles (user_id) VALUES (v_user_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;
