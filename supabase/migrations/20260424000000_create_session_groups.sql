create table public.session_groups (
  id          bigint generated always as identity primary key,
  public_id   uuid not null default gen_random_uuid() unique,
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index session_groups_user_id_idx on public.session_groups(user_id);

create trigger session_groups_set_updated_at
  before update on public.session_groups
  for each row execute function public.set_updated_at();

alter table public.session_groups enable row level security;

create policy "Session groups are publicly readable"
  on public.session_groups for select using (true);

create policy "Users can insert their own groups"
  on public.session_groups for insert with check (auth.uid() = user_id);

create policy "Users can update their own groups"
  on public.session_groups for update using (auth.uid() = user_id);

create policy "Users can delete their own groups"
  on public.session_groups for delete using (auth.uid() = user_id);

-- Junction table: which sessions belong to which group
create table public.group_sessions (
  group_id    bigint not null references public.session_groups(id) on delete cascade,
  session_id  bigint not null references public.sessions(id) on delete cascade,
  added_at    timestamptz not null default now(),
  primary key (group_id, session_id)
);

create index group_sessions_group_id_idx on public.group_sessions(group_id);
create index group_sessions_session_id_idx on public.group_sessions(session_id);

alter table public.group_sessions enable row level security;

create policy "Group sessions are publicly readable"
  on public.group_sessions for select using (true);

create policy "Group owners can add sessions"
  on public.group_sessions for insert
  with check (
    exists (
      select 1 from public.session_groups g
      where g.id = group_id and g.user_id = auth.uid()
    )
  );

create policy "Group owners can remove sessions"
  on public.group_sessions for delete
  using (
    exists (
      select 1 from public.session_groups g
      where g.id = group_id and g.user_id = auth.uid()
    )
  );
