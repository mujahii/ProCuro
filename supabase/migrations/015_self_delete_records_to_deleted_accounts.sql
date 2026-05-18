-- Self-deletion via delete_own_account() must leave an audit row in
-- public.deleted_accounts so the admin panel can see the user disappeared.
-- deleted_by_admin_id = NULL signals "self-deleted" vs admin-initiated.
CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid           uuid := auth.uid();
  v_email         text;
  v_role          text;
  v_business_name text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Capture identity before the cascade wipes it
  SELECT u.email,
         u.role,
         COALESCE(sp.business_name, op.restaurant_name)
    INTO v_email, v_role, v_business_name
    FROM public.users u
    LEFT JOIN public.supplier_profiles sp ON sp.user_id = u.id
    LEFT JOIN public.owner_profiles    op ON op.user_id = u.id
   WHERE u.id = v_uid;

  -- Record the self-deletion (deleted_by_admin_id NULL = self)
  INSERT INTO public.deleted_accounts
    (user_id, email, role, business_name, deleted_by_admin_id)
  VALUES
    (v_uid, v_email, v_role, v_business_name, NULL);

  -- Now delete the auth user; cascades into public.users + dependents
  DELETE FROM auth.users WHERE id = v_uid;
END;
$function$;
