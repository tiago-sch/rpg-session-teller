alter table public.campaigns
  add column recap text,
  add column recap_generated_at timestamptz;
