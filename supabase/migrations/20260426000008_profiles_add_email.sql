-- Add email column to profiles so admin queries don't need to join auth.users
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Backfill existing rows from auth.users (runs as postgres superuser in migration context)
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id;

-- Keep email in sync on new signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(TRIM(NEW.raw_user_meta_data->>'display_name'), ''),
      SPLIT_PART(NEW.email, '@', 1)
    ),
    NEW.email
  );
  RETURN NEW;
END;
$$;

-- Recreate get_users_with_stats without the auth.users join
CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
  id UUID,
  email TEXT,
  display_name TEXT,
  is_admin BOOLEAN,
  chronicles_count BIGINT,
  saved_count BIGINT,
  groups_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.display_name,
    p.is_admin,
    COUNT(DISTINCT s.id)   AS chronicles_count,
    COUNT(DISTINCT ss.id)  AS saved_count,
    COUNT(DISTINCT sg.id)  AS groups_count
  FROM public.profiles p
  LEFT JOIN public.sessions s        ON s.user_id  = p.id
  LEFT JOIN public.saved_sessions ss ON ss.user_id = p.id
  LEFT JOIN public.session_groups sg ON sg.user_id = p.id
  GROUP BY p.id, p.email, p.display_name, p.is_admin
  ORDER BY chronicles_count DESC;
END;
$$;
