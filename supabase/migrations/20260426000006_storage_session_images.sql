insert into storage.buckets (id, name, public)
values ('session-images', 'session-images', true)
on conflict do nothing;

create policy "Public read on session images"
  on storage.objects for select
  using (bucket_id = 'session-images');

create policy "Authenticated users can upload session images"
  on storage.objects for insert
  with check (bucket_id = 'session-images' and auth.uid() is not null);

create policy "Authenticated users can update session images"
  on storage.objects for update
  using (bucket_id = 'session-images' and auth.uid() is not null);

create policy "Authenticated users can delete session images"
  on storage.objects for delete
  using (bucket_id = 'session-images' and auth.uid() is not null);
