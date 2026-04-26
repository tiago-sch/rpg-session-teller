create table public.campaign_characters (
  id          bigint generated always as identity primary key,
  campaign_id bigint not null references public.campaigns(id) on delete cascade,
  name        text not null,
  notes       text,
  photo_url   text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index campaign_characters_campaign_id_idx on public.campaign_characters (campaign_id);

alter table public.campaign_characters enable row level security;

create policy "Users can view characters for their own campaigns"
  on public.campaign_characters for select
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = campaign_characters.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy "Users can insert characters for their own campaigns"
  on public.campaign_characters for insert
  with check (
    exists (
      select 1 from public.campaigns
      where campaigns.id = campaign_characters.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy "Users can update characters for their own campaigns"
  on public.campaign_characters for update
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = campaign_characters.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );

create policy "Users can delete characters for their own campaigns"
  on public.campaign_characters for delete
  using (
    exists (
      select 1 from public.campaigns
      where campaigns.id = campaign_characters.campaign_id
        and campaigns.user_id = auth.uid()
    )
  );
