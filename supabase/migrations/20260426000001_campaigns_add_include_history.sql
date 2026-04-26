alter table public.campaigns
  add column include_history boolean not null default false;
