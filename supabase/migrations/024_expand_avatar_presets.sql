-- Migration 024: Expand preset avatar pool from 30 → 40 by adding
-- 10 famous German castles and landmarks as additional bottts seeds.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_avatars TEXT[] := ARRAY[
    -- adventurer — warm cartoon faces
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmed&backgroundColor=fde68a',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Fatima&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Mehmet&backgroundColor=bae6fd',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Koch&backgroundColor=bbf7d0',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Leila&backgroundColor=fed7aa',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Ibrahim&backgroundColor=f5d0fe',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Maryam&backgroundColor=e0e7ff',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Bilal&backgroundColor=fef9c3',
    -- micah — minimalist faces
    'https://api.dicebear.com/7.x/micah/svg?seed=Yusuf&backgroundColor=f0fdf4',
    'https://api.dicebear.com/7.x/micah/svg?seed=Sara&backgroundColor=e8f4f8',
    'https://api.dicebear.com/7.x/micah/svg?seed=Mustafa&backgroundColor=ede9fe',
    'https://api.dicebear.com/7.x/micah/svg?seed=Halal&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/micah/svg?seed=Kueche&backgroundColor=fff7ed',
    'https://api.dicebear.com/7.x/micah/svg?seed=Hassan&backgroundColor=fef2f2',
    'https://api.dicebear.com/7.x/micah/svg?seed=Nour&backgroundColor=e0f2fe',
    'https://api.dicebear.com/7.x/micah/svg?seed=Amira&backgroundColor=fdf4ff',
    -- lorelei — elegant portraits
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Chef&backgroundColor=e0f2fe',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Aisha&backgroundColor=dcfce7',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Omar&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/lorelei/svg?seed=Zainab&backgroundColor=f5f0ff',
    -- bottts — German cities
    'https://api.dicebear.com/7.x/bottts/svg?seed=Berlin&backgroundColor=dbeafe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Hamburg&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Munich&backgroundColor=dcfce7',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Frankfurt&backgroundColor=fef3c7',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Cologne&backgroundColor=fdf4ff',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Stuttgart&backgroundColor=f0fdf4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Duesseldorf&backgroundColor=fff7ed',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Dortmund&backgroundColor=fff1f2',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Leipzig&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Hannover&backgroundColor=ffe4e6',
    -- bottts — famous German castles & landmarks
    'https://api.dicebear.com/7.x/bottts/svg?seed=BrandenburgerTor&backgroundColor=bfdbfe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Neuschwanstein&backgroundColor=e0f2fe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=KoelnerDom&backgroundColor=f1f5f9',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Elbphilharmonie&backgroundColor=cffafe',
    'https://api.dicebear.com/7.x/bottts/svg?seed=HeidelbergSchloss&backgroundColor=fce7f3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=NuernbergBurg&backgroundColor=fef3c7',
    'https://api.dicebear.com/7.x/bottts/svg?seed=DresdenZwinger&backgroundColor=fef9c3',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Frauenkirche&backgroundColor=fff7ed',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Roemerberg&backgroundColor=f0fdf4',
    'https://api.dicebear.com/7.x/bottts/svg?seed=Wartburg&backgroundColor=d1fae5'
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
