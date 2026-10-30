-- Narration length in seconds, so players can show it before loading the audio.
alter table public.sessions
  add column audio_duration real;

alter table public.campaign_recaps
  add column audio_duration real;

drop trigger sessions_set_updated_at on public.sessions;
create trigger sessions_set_updated_at
  before update on public.sessions
  for each row
  when (
    (to_jsonb(old) - 'position' - 'deleted_at' - 'updated_at' - 'audio_url' - 'audio_voice' - 'audio_duration' - 'language')
    is distinct from
    (to_jsonb(new) - 'position' - 'deleted_at' - 'updated_at' - 'audio_url' - 'audio_voice' - 'audio_duration' - 'language')
  )
  execute function public.set_updated_at();

create or replace function public.clear_stale_session_audio()
returns trigger language plpgsql as $$
begin
  if new.generated_text is distinct from old.generated_text or new.title is distinct from old.title then
    new.audio_url := null;
    new.audio_voice := null;
    new.audio_duration := null;
  end if;
  return new;
end;
$$;
