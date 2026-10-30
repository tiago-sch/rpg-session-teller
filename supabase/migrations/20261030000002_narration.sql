-- ── Narrated audio for chronicles and recaps ──
alter table public.sessions
  add column audio_url text,
  add column audio_voice text,
  add column language text;

alter table public.campaign_recaps
  add column audio_url text,
  add column audio_voice text,
  add column language text;

-- Generating audio or detecting the language isn't editing the session.
drop trigger sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row
  when (
    (to_jsonb(old) - 'position' - 'deleted_at' - 'updated_at' - 'audio_url' - 'audio_voice' - 'language')
    is distinct from
    (to_jsonb(new) - 'position' - 'deleted_at' - 'updated_at' - 'audio_url' - 'audio_voice' - 'language')
  )
  execute function public.set_updated_at();

-- Audio no longer matches once the chronicle text or title changes.
create or replace function public.clear_stale_session_audio()
returns trigger language plpgsql as $$
begin
  if new.generated_text is distinct from old.generated_text or new.title is distinct from old.title then
    new.audio_url := null;
    new.audio_voice := null;
  end if;
  return new;
end;
$$;

create trigger sessions_clear_stale_audio
  before update of generated_text, title on public.sessions
  for each row execute function public.clear_stale_session_audio();

-- Audio files are written by the API with the service role; anyone can play them.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('narrations', 'narrations', true, 52428800, array['audio/mpeg'])
on conflict do nothing;

create policy "Public read on narrations"
  on storage.objects for select
  using (bucket_id = 'narrations');
