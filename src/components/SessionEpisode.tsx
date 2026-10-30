import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import NarrationPlayer from './NarrationPlayer'
import type { EpisodeSession } from '../hooks/useCampaignEpisodes'

export function PreviouslyOn({ sessionId }: { sessionId: number | null | undefined }) {
  const [open, setOpen] = useState(true)
  const { data: recap } = useQuery<{ id: number; recap: string; audio_url: string | null } | null>({
    queryKey: ['session-recap', sessionId],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaign_recaps')
        .select('id, recap, audio_url')
        .eq('session_id', sessionId!)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      return (data as { id: number; recap: string; audio_url: string | null } | null) ?? null
    },
    enabled: !!sessionId,
  })

  if (!recap) return null

  return (
    <div
      className="rounded-xl px-5 sm:px-6 py-5"
      style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-gold-dim)' }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 cursor-pointer"
      >
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
          Previously on…
        </span>
        <span className="text-xs" style={{ color: 'var(--color-parchment-muted)' }}>{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-3 mt-3">
          {recap.audio_url && (
            <NarrationPlayer kind="recap" id={recap.id} audioUrl={recap.audio_url} voice={null} textLength={0} editable={false} />
          )}
          <p className="text-base leading-relaxed whitespace-pre-line italic" style={{ color: 'var(--color-parchment-muted)' }}>
            {recap.recap}
          </p>
        </div>
      )}
    </div>
  )
}

export function EpisodeNav({ previous, next, linkTo }: {
  previous: EpisodeSession | null
  next: EpisodeSession | null
  linkTo: (publicId: string) => string
}) {
  if (!previous && !next) return null

  return (
    <nav className="grid grid-cols-2 gap-3">
      {previous ? (
        <EpisodeLink to={linkTo(previous.public_id)} label="← Previous" title={previous.title} />
      ) : <span />}
      {next ? (
        <EpisodeLink to={linkTo(next.public_id)} label="Next →" title={next.title} alignRight />
      ) : <span />}
    </nav>
  )
}

function EpisodeLink({ to, label, title, alignRight }: { to: string; label: string; title: string; alignRight?: boolean }) {
  return (
    <Link
      to={to}
      className={`rounded-xl px-4 py-3 flex flex-col gap-1 transition-opacity hover:opacity-80 min-w-0 ${alignRight ? 'items-end text-right' : ''}`}
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <span className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
        {label}
      </span>
      <span className="text-sm truncate max-w-full" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
        {title}
      </span>
    </Link>
  )
}
