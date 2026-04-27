-- Add is_admin flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- RPC: aggregate stats for admin dashboard
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_users INT;
  total_chronicles INT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT COUNT(*) INTO total_users FROM public.profiles;
  SELECT COUNT(*) INTO total_chronicles FROM public.sessions;

  RETURN json_build_object(
    'total_users', total_users,
    'total_chronicles', total_chronicles
  );
END;
$$;

-- RPC: per-user stats for admin users list
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
    u.email::TEXT,
    p.display_name,
    p.is_admin,
    COUNT(DISTINCT s.id)  AS chronicles_count,
    COUNT(DISTINCT ss.id) AS saved_count,
    COUNT(DISTINCT sg.id) AS groups_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  LEFT JOIN public.sessions s       ON s.user_id  = p.id
  LEFT JOIN public.saved_sessions ss ON ss.user_id = p.id
  LEFT JOIN public.session_groups sg ON sg.user_id = p.id
  GROUP BY p.id, u.email, p.display_name, p.is_admin
  ORDER BY chronicles_count DESC;
END;
$$;
