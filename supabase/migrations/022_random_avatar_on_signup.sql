-- Migration 022: Assign a random preset avatar to every new user on signup.
-- Backfills the 4 existing users who have no avatar.

-- 1. Update handle_new_user trigger to pick a random avatar from the same
--    30-preset list used in AvatarModal.jsx.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_avatars TEXT[] := ARRAY[
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmed&backgroundColor=fde68a',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Fatima&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Mehmet&backgroundColor=bae6fd',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Koch&backgroundColor=bbf7d0',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Leila&backgroundColor=fed7aa',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ibrahim&backgroundColor=f5d0fe',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Maryam&backgroundColor=e0e7ff',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Bilal&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/micah/svg?seed=Yusuf&backgroundColor=f0fdf4',
    'https://api.dicebear.com/7.x/micah/svg?seed=Sara&backgroundColor=e8f4f8',
    'https://api.dicebear.com/7.x/micah/svg?seed=Mustafa&backgroundColor=ede9fe',
    'https://api.dicebear.com/7.x/micah/svg?seed=Halal&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/micah/svg?seed=Kueche&backgroundColor=fff7ed',
    'https://api.dicebear.com/7.x/micah/svg?seed=Hassan&backgroundColor=fef2f2',
    'https://api.dicebear.com/7.x/micah/svg?seed=Nour&backgroundColor=e0f2fe',
    'https://api.dicebear.com/7.x/micah/svg?seed=Amira&backgroundColor=fdf4ff',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Chef&backgroundColor=e0f2fe',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Aisha&backgroundColor=dcfce7',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Omar&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Zainab&backgroundColor=f5f0ff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Berlin&backgroundColor=dbeafe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Hamburg&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Munich&backgroundColor=dcfce7',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Frankfurt&backgroundColor=fef3c7',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Cologne&backgroundColor=fdf4ff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Stuttgart&backgroundColor=f0fdf4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Duesseldorf&backgroundColor=fff7ed',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Dortmund&backgroundColor=fff1f2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Leipzig&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Hannover&backgroundColor=ffe4e6'
  ];
  v_avatar TEXT;
BEGIN
  v_avatar := v_avatars[1 + floor(random() * array_length(v_avatars, 1))::int];
  INSERT INTO public.users (id, email, full_name, role, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULL,
    v_avatar
  );
  RETURN NEW;
END;
$$;

-- 2. Backfill existing users who have no avatar.
DO $$
DECLARE
  v_avatars TEXT[] := ARRAY[
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmed&backgroundColor=fde68a',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Fatima&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Mehmet&backgroundColor=bae6fd',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Koch&backgroundColor=bbf7d0',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Leila&backgroundColor=fed7aa',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ibrahim&backgroundColor=f5d0fe',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Maryam&backgroundColor=e0e7ff',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Bilal&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/micah/svg?seed=Yusuf&backgroundColor=f0fdf4',
    'https://api.dicebear.com/7.x/micah/svg?seed=Sara&backgroundColor=e8f4f8',
    'https://api.dicebear.com/7.x/micah/svg?seed=Mustafa&backgroundColor=ede9fe',
    'https://api.dicebear.com/7.x/micah/svg?seed=Halal&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/micah/svg?seed=Kueche&backgroundColor=fff7ed',
    'https://api.dicebear.com/7.x/micah/svg?seed=Hassan&backgroundColor=fef2f2',
    'https://api.dicebear.com/7.x/micah/svg?seed=Nour&backgroundColor=e0f2fe',
    'https://api.dicebear.com/7.x/micah/svg?seed=Amira&backgroundColor=fdf4ff',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Chef&backgroundColor=e0f2fe',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Aisha&backgroundColor=dcfce7',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Omar&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Zainab&backgroundColor=f5f0ff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Berlin&backgroundColor=dbeafe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Hamburg&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Munich&backgroundColor=dcfce7',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Frankfurt&backgroundColor=fef3c7',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Cologne&backgroundColor=fdf4ff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Stuttgart&backgroundColor=f0fdf4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Duesseldorf&backgroundColor=fff7ed',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Dortmund&backgroundColor=fff1f2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Leipzig&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Hannover&backgroundColor=ffe4e6'
  ];
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.users WHERE avatar_url IS NULL OR avatar_url = '' LOOP
    UPDATE public.users
    SET avatar_url = v_avatars[1 + floor(random() * array_length(v_avatars, 1))::int]
    WHERE id = r.id;
  END LOOP;
END;
$$;
