create table public.saved_sessions (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users(id) on delete cascade,
  session_public_id uuid not null,
  note              text,
  saved_at          timestamptz not null default now(),
  unique(user_id, session_public_id)
);

create index saved_sessions_user_id_idx on public.saved_sessions(user_id);

alter table public.saved_sessions enable row level security;

create policy "Users can view their own saved sessions"
  on public.saved_sessions for select using (auth.uid() = user_id);

create policy "Users can save sessions"
  on public.saved_sessions for insert with check (auth.uid() = user_id);

create policy "Users can update their saved sessions"
  on public.saved_sessions for update using (auth.uid() = user_id);

create policy "Users can unsave sessions"
  on public.saved_sessions for delete using (auth.uid() = user_id);
