-- Add inks currency to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS inks INTEGER NOT NULL DEFAULT 10;

-- Backfill existing users who may already have a profile row
UPDATE public.profiles SET inks = 10 WHERE inks = 10; -- no-op, just ensures default is applied

-- Atomically deduct inks from the calling user
-- Returns the new balance. Raises an exception if balance is insufficient.
CREATE OR REPLACE FUNCTION spend_inks(amount INT)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_inks INT;
  new_inks     INT;
BEGIN
  SELECT inks INTO current_inks
  FROM public.profiles
  WHERE id = auth.uid()
  FOR UPDATE;

  IF current_inks IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF current_inks < amount THEN
    RAISE EXCEPTION 'not_enough_inks';
  END IF;

  new_inks := current_inks - amount;
  UPDATE public.profiles SET inks = new_inks WHERE id = auth.uid();
  RETURN new_inks;
END;
$$;

-- Admin: set a user's ink balance to an arbitrary value
CREATE OR REPLACE FUNCTION admin_set_user_inks(target_user_id UUID, new_amount INT)
RETURNS INT
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

  IF new_amount < 0 THEN
    RAISE EXCEPTION 'Inks cannot be negative';
  END IF;

  UPDATE public.profiles SET inks = new_amount WHERE id = target_user_id;
  RETURN new_amount;
END;
$$;

-- Drop first because the return type changed (added inks column)
DROP FUNCTION IF EXISTS get_users_with_stats();

CREATE OR REPLACE FUNCTION get_users_with_stats()
RETURNS TABLE (
  id               UUID,
  email            TEXT,
  display_name     TEXT,
  is_admin         BOOLEAN,
  inks             INT,
  chronicles_count BIGINT,
  saved_count      BIGINT,
  groups_count     BIGINT
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
    p.inks,
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
  GROUP BY p.id, p.email, p.display_name, p.is_admin, p.inks
  ORDER BY chronicles_count DESC;
$$;
