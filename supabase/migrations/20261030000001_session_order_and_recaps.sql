-- ── Session order within a campaign ──
alter table public.sessions
  add column position integer,
  add column deleted_at timestamptz;

-- Reordering and deleting shouldn't count as editing the session.
drop trigger sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row
  when ((to_jsonb(old) - 'position' - 'deleted_at' - 'updated_at') is distinct from (to_jsonb(new) - 'position' - 'deleted_at' - 'updated_at'))
  execute function public.set_updated_at();

update public.sessions s
set position = ordered.rn
from (
  select id, row_number() over (partition by campaign_id order by created_at) as rn
  from public.sessions
  where campaign_id is not null
) ordered
where s.id = ordered.id;

create index sessions_campaign_position_idx on public.sessions (campaign_id, position);

-- New sessions, and sessions moved into a campaign, go to the end of it.
create or replace function public.set_session_position()
returns trigger language plpgsql as $$
begin
  if new.campaign_id is null then
    new.position := null;
  elsif tg_op = 'INSERT' or new.campaign_id is distinct from old.campaign_id then
    select coalesce(max(position), 0) + 1 into new.position
    from public.sessions
    where campaign_id = new.campaign_id;
  end if;
  return new;
end;
$$;

create trigger sessions_set_position
  before insert or update of campaign_id on public.sessions
  for each row execute function public.set_session_position();

-- Reorder a campaign's sessions: positions follow the order of session_ids.
create or replace function public.reorder_campaign_sessions(p_campaign_id bigint, p_session_ids bigint[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update public.sessions s
  set position = ordered.ord
  from unnest(p_session_ids) with ordinality as ordered(id, ord)
  where s.id = ordered.id
    and s.campaign_id = p_campaign_id
    and s.user_id = auth.uid();
end;
$$;

grant execute on function public.reorder_campaign_sessions(bigint, bigint[]) to authenticated;

-- ── Saved "Previously on…" recaps ──
create table public.campaign_recaps (
  id               bigint generated always as identity primary key,
  campaign_id      bigint not null references public.campaigns (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  recap            text not null,
  tone             text,
  session_count    integer not null default 0,
  -- The last session the recap covers.
  last_session_id  bigint references public.sessions (id) on delete set null,
  -- The session this recap introduces ("Previously on…" shown above it).
  session_id       bigint references public.sessions (id) on delete set null,
  created_at       timestamptz not null default now()
);

create index campaign_recaps_campaign_id_idx on public.campaign_recaps (campaign_id, created_at desc);
create index campaign_recaps_session_id_idx on public.campaign_recaps (session_id);

alter table public.campaign_recaps enable row level security;

create policy "Campaign recaps are publicly readable"
  on public.campaign_recaps for select using (true);

create policy "Users can insert their own recaps"
  on public.campaign_recaps for insert with check (auth.uid() = user_id);

create policy "Users can update their own recaps"
  on public.campaign_recaps for update using (auth.uid() = user_id);

create policy "Users can delete their own recaps"
  on public.campaign_recaps for delete using (auth.uid() = user_id);

grant select                          on public.campaign_recaps to anon;
grant select, insert, update, delete  on public.campaign_recaps to authenticated;
grant select, insert, update, delete  on public.campaign_recaps to service_role;

-- Keep the recaps already written.
insert into public.campaign_recaps (campaign_id, user_id, recap, created_at)
select id, user_id, recap, coalesce(recap_generated_at, now())
from public.campaigns
where recap is not null;

-- A new chronicle in a campaign picks up the latest recap not yet linked to a session.
create or replace function public.link_recap_to_new_session()
returns trigger language plpgsql as $$
begin
  if new.campaign_id is not null then
    update public.campaign_recaps
    set session_id = new.id
    where id = (
      select id from public.campaign_recaps
      where campaign_id = new.campaign_id
        and session_id is null
        and user_id = new.user_id
      order by created_at desc
      limit 1
    );
  end if;
  return new;
end;
$$;

create trigger sessions_link_recap
  after insert on public.sessions
  for each row execute function public.link_recap_to_new_session();

-- ── Soft delete for sessions ──

-- Deleted sessions disappear from every read, owner included; they can only
-- be listed and restored through the functions below.
drop policy if exists "Sessions are publicly readable" on public.sessions;
drop policy if exists "Users can view their own sessions" on public.sessions;

create policy "Sessions are readable unless deleted"
  on public.sessions for select
  using (deleted_at is null);

-- Positions must account for deleted sessions too, so a restored session
-- never shares a position with a newer one.
alter function public.set_session_position() security definer;
alter function public.set_session_position() set search_path = public;

create or replace function public.delete_session(p_session_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sessions
  set deleted_at = now()
  where id = p_session_id and user_id = auth.uid() and deleted_at is null;
$$;

create or replace function public.restore_session(p_session_id bigint)
returns void
language sql
security definer
set search_path = public
as $$
  update public.sessions
  set deleted_at = null
  where id = p_session_id and user_id = auth.uid();
$$;

create or replace function public.list_deleted_sessions()
returns table (id bigint, public_id uuid, title text, campaign_name text, deleted_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select s.id, s.public_id, s.title, c.name, s.deleted_at
  from public.sessions s
  left join public.campaigns c on c.id = s.campaign_id
  where s.user_id = auth.uid() and s.deleted_at is not null
  order by s.deleted_at desc;
$$;

revoke execute on function public.delete_session(bigint) from public, anon;
revoke execute on function public.restore_session(bigint) from public, anon;
revoke execute on function public.list_deleted_sessions() from public, anon;
grant execute on function public.delete_session(bigint) to authenticated;
grant execute on function public.restore_session(bigint) to authenticated;
grant execute on function public.list_deleted_sessions() to authenticated;
