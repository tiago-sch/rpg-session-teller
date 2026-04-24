create table public.campaigns (
  id          bigint generated always as identity primary key,
  public_id   uuid not null default gen_random_uuid() unique,
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index campaigns_user_id_idx on public.campaigns (user_id);

create trigger campaigns_set_updated_at
  before update on public.campaigns
  for each row execute function public.set_updated_at();

alter table public.campaigns enable row level security;

create policy "Users can view their own campaigns"
  on public.campaigns for select using (auth.uid() = user_id);

create policy "Campaigns are publicly readable"
  on public.campaigns for select using (true);

create policy "Users can insert their own campaigns"
  on public.campaigns for insert with check (auth.uid() = user_id);

create policy "Users can update their own campaigns"
  on public.campaigns for update using (auth.uid() = user_id);

create policy "Users can delete their own campaigns"
  on public.campaigns for delete using (auth.uid() = user_id);

-- Replace free-text campaign_name with a proper FK
alter table public.sessions
  drop column if exists campaign_name,
  add column campaign_id bigint references public.campaigns (id) on delete set null;

create index sessions_campaign_id_idx on public.sessions (campaign_id);
