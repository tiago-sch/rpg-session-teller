-- Explicit grants for all public tables.
-- Required because Supabase will stop auto-granting privileges on new tables
-- (breaking change announced 2026-04-28, enforced on existing projects 2026-10-30).
-- These grants are idempotent and safe to run on existing projects.

grant select                          on public.profiles          to anon;
grant select, insert, update          on public.profiles          to authenticated;
grant select, insert, update, delete  on public.profiles          to service_role;

grant select                          on public.sessions          to anon;
grant select, insert, update, delete  on public.sessions          to authenticated;
grant select, insert, update, delete  on public.sessions          to service_role;

grant select, insert, update, delete  on public.saved_sessions    to authenticated;

grant select                          on public.session_groups    to anon;
grant select, insert, update, delete  on public.session_groups    to authenticated;

grant select                          on public.group_sessions    to anon;
grant select, insert, delete          on public.group_sessions    to authenticated;

grant select                          on public.campaigns         to anon;
grant select, insert, update, delete  on public.campaigns         to authenticated;

grant select, insert, update, delete  on public.drafts            to authenticated;

grant select, insert, update, delete  on public.saved_groups      to authenticated;

grant select, insert, update, delete  on public.campaign_characters to authenticated;

grant select                          on public.ink_purchases     to authenticated;
grant select, insert, update, delete  on public.ink_purchases     to service_role;

-- Sequence grants so identity columns work correctly
grant usage, select on all sequences in schema public to authenticated;
grant usage, select on all sequences in schema public to service_role;
