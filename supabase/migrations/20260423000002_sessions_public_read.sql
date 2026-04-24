-- Allow anyone (including unauthenticated) to read sessions via public_id.
-- The UUID acts as the access token for share links.
-- Existing insert/update/delete policies remain owner-only.
create policy "Sessions are publicly readable"
  on public.sessions for select
  using (true);
