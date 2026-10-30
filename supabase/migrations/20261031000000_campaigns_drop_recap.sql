-- Recaps now live in campaign_recaps (copied over in 20261030000001).
alter table public.campaigns
  drop column if exists recap,
  drop column if exists recap_generated_at;
