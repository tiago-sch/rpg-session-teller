create extension if not exists "pgcrypto";

create table public.sessions (
  id            bigint generated always as identity primary key,
  public_id     uuid not null default gen_random_uuid() unique,
  user_id       uuid not null references auth.users (id) on delete cascade,
  title         text not null,
  tldr          text,
  prompt        text,
  generated_text text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Index for fast user-scoped queries
create index sessions_user_id_idx on public.sessions (user_id);

-- Keep updated_at current automatically
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger sessions_set_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

-- Row-level security: users can only see and modify their own sessions
alter table public.sessions enable row level security;

create policy "Users can view their own sessions"
  on public.sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert their own sessions"
  on public.sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own sessions"
  on public.sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete their own sessions"
  on public.sessions for delete
  using (auth.uid() = user_id);
