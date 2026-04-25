create table public.saved_groups (
  id               bigint generated always as identity primary key,
  user_id          uuid not null references auth.users(id) on delete cascade,
  group_public_id  uuid not null,
  saved_at         timestamptz not null default now(),
  unique(user_id, group_public_id)
);

create index saved_groups_user_id_idx on public.saved_groups(user_id);

alter table public.saved_groups enable row level security;

create policy "Users can manage their own saved groups"
  on public.saved_groups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
