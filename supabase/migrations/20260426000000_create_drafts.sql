create table public.drafts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  session_id  bigint references public.sessions(id) on delete cascade,
  title       text not null default '',
  campaign_id bigint references public.campaigns(id) on delete set null,
  prompt      text not null default '',
  fill_gaps   boolean not null default false,
  tone        text,
  updated_at  timestamptz not null default now(),

  -- one new-session draft per user (session_id IS NULL),
  -- one edit draft per user per session
  unique nulls not distinct (user_id, session_id)
);

create index drafts_user_id_idx on public.drafts (user_id);

create trigger drafts_set_updated_at
  before update on public.drafts
  for each row execute function public.set_updated_at();

alter table public.drafts enable row level security;

create policy "Users can view their own drafts"
  on public.drafts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own drafts"
  on public.drafts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own drafts"
  on public.drafts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own drafts"
  on public.drafts for delete
  using (auth.uid() = user_id);
