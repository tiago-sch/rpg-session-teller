insert into storage.buckets (id, name, public)
values ('character-avatars', 'character-avatars', true)
on conflict do nothing;

create policy "Public read on character avatars"
  on storage.objects for select
  using (bucket_id = 'character-avatars');

create policy "Authenticated users can upload character avatars"
  on storage.objects for insert
  with check (bucket_id = 'character-avatars' and auth.uid() is not null);

create policy "Authenticated users can update character avatars"
  on storage.objects for update
  using (bucket_id = 'character-avatars' and auth.uid() is not null);

create policy "Authenticated users can delete character avatars"
  on storage.objects for delete
  using (bucket_id = 'character-avatars' and auth.uid() is not null);
