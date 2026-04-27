-- Replace RAISE EXCEPTION with WHERE EXISTS so non-admins get empty results
-- instead of a 400 error. The AdminRoute guard handles frontend access control.

CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'total_users',      (SELECT COUNT(*) FROM public.profiles),
    'total_chronicles', (SELECT COUNT(*) FROM public.sessions)
  )
  WHERE EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
  id              UUID,
  email           TEXT,
  display_name    TEXT,
  is_admin        BOOLEAN,
  chronicles_count BIGINT,
  saved_count     BIGINT,
  groups_count    BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
  WHERE EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE
  )
  GROUP BY p.id, p.email, p.display_name, p.is_admin
  ORDER BY chronicles_count DESC;
$$;
