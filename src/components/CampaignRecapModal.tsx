import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useProfile, type Profile } from '../hooks/useProfile'
import { apiPost } from '../lib/api'
import { TONES } from '../lib/tones'
import InkCost from './InkCost'
import NarrationPlayer from './NarrationPlayer'

const RECAP_COST = 1
const SESSION_COUNTS = [1, 3, 5, 10]

export interface Recap {
  id: number
  recap: string
  tone: string | null
  session_count: number
  last_session_id: number | null
  session_id: number | null
  audio_url: string | null
  audio_voice: string | null
  audio_duration: number | null
  created_at: string
}

export interface RecapSessionOption {
  id: number
  title: string
}

export default function CampaignRecapModal({ campaignId, campaignName, sessionCount, sessions, onClose }: {
  campaignId: number
  campaignName: string
  sessionCount: number
  // The campaign's sessions in order, for choosing which one a recap introduces.
  sessions: RecapSessionOption[]
  onClose: () => void
}) {
  const { user, session } = useAuth()
  const { profile } = useProfile()
  const [count, setCount] = useState(Math.min(3, sessionCount))
  const [toneId, setToneId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [showEarlier, setShowEarlier] = useState(false)

  const queryKey = ['campaign-recaps', campaignId]
  const { data: recaps = [], isLoading } = useQuery<Recap[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaign_recaps')
        .select('id, recap, tone, session_count, last_session_id, session_id, audio_url, audio_voice, audio_duration, created_at')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as Recap[]) ?? []
    },
  })

  const [latest, ...earlier] = recaps
  const notEnoughInk = profile !== null && profile.inks < RECAP_COST
  const counts = SESSION_COUNTS.filter(n => n < sessionCount)

  const handleGenerate = async () => {
    setError('')
    setGenerating(true)
    try {
      const result = await apiPost<{ recap: Recap; inks: number }>('/api/generate-recap', session, {
        campaignId,
        sessionCount: count,
        toneId,
      })
      queryClient.setQueryData(queryKey, (old: Recap[] | undefined) => [result.recap, ...(old ?? [])])
      queryClient.setQueryData(['profile', user?.id], (old: Profile | null) =>
        old ? { ...old, inks: result.inks } : old
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recap.')
    } finally {
      setGenerating(false)
    }
  }

  const updateRecap = async (id: number, patch: Partial<Recap>) => {
    setError('')
    queryClient.setQueryData(queryKey, (old: Recap[] | undefined) => old?.map(r => (r.id === id ? { ...r, ...patch } : r)))
    const { error } = await supabase.from('campaign_recaps').update(patch).eq('id', id)
    if (error) setError('Failed to update the recap.')
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ['session-recap'] })
  }

  const deleteRecap = async (id: number) => {
    if (!window.confirm('Delete this recap?')) return
    setError('')
    queryClient.setQueryData(queryKey, (old: Recap[] | undefined) => old?.filter(r => r.id !== id))
    const { error } = await supabase.from('campaign_recaps').delete().eq('id', id)
    if (error) setError('Failed to delete the recap.')
    queryClient.invalidateQueries({ queryKey })
    queryClient.invalidateQueries({ queryKey: ['session-recap'] })
  }

  const cardProps = (recap: Recap) => ({
    recap,
    sessions,
    onNarrated: (audioUrl: string, voice: string, duration: number) => {
      queryClient.setQueryData(queryKey, (old: Recap[] | undefined) => old?.map(r => (r.id === recap.id ? { ...r, audio_url: audioUrl, audio_voice: voice, audio_duration: duration } : r)))
      queryClient.invalidateQueries({ queryKey: ['session-recap'] })
    },
    onLink: (sessionId: number | null) => updateRecap(recap.id, { session_id: sessionId }),
    onDelete: () => deleteRecap(recap.id),
  })

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Previously on…</p>
            <p className="text-sm truncate" style={{ color: 'var(--color-parchment-muted)' }}>{campaignName}</p>
          </div>
          <button onClick={onClose} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          ) : latest ? (
            <div className="flex flex-col gap-4">
              <RecapCard {...cardProps(latest)} />
              {earlier.length > 0 && (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEarlier(v => !v)}
                    className="self-start text-xs font-semibold tracking-widest uppercase cursor-pointer transition-opacity hover:opacity-80"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
                  >
                    {showEarlier ? '▾' : '▸'} Earlier recaps ({earlier.length})
                  </button>
                  {showEarlier && earlier.map(recap => <RecapCard key={recap.id} {...cardProps(recap)} compact />)}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>
              Turn your latest chronicles into a short recap to read aloud at the start of the next session.
            </p>
          )}

          <div className="flex flex-col gap-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>Cover</p>
              <div className="flex flex-wrap gap-2">
                {counts.map(n => (
                  <Pill key={n} active={count === n} disabled={generating} onClick={() => setCount(n)}>
                    {n === 1 ? 'Last session' : `Last ${n}`}
                  </Pill>
                ))}
                <Pill active={count === sessionCount} disabled={generating} onClick={() => setCount(sessionCount)}>
                  {sessionCount === 1 ? 'Last session' : `All ${sessionCount}`}
                </Pill>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>Tone <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 400 }}>(optional)</span></p>
              <div className="flex flex-wrap gap-2">
                {TONES.map(tone => (
                  <Pill key={tone.id} active={toneId === tone.id} disabled={generating} onClick={() => setToneId(toneId === tone.id ? null : tone.id)}>
                    {tone.label}
                  </Pill>
                ))}
              </div>
            </div>

            {error && <p className="text-sm" style={{ color: '#e07070' }}>{error}</p>}

            <div className="flex items-center justify-between gap-3">
              <InkCost amount={RECAP_COST} insufficient={notEnoughInk} />
              <button
                onClick={handleGenerate}
                disabled={generating || notEnoughInk}
                className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                  color: '#0c0a14',
                  border: '1px solid var(--color-gold-dim)',
                }}
              >
                {generating ? 'Writing…' : latest ? 'Write a new recap' : 'Write recap'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RecapCard({ recap, sessions, compact, onNarrated, onLink, onDelete }: {
  recap: Recap
  sessions: RecapSessionOption[]
  compact?: boolean
  onNarrated: (audioUrl: string, voice: string, duration: number) => void
  onLink: (sessionId: number | null) => void
  onDelete: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(!compact)
  const tone = TONES.find(t => t.id === recap.tone)
  const linkedMissing = recap.session_id !== null && !sessions.some(s => s.id === recap.session_id)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(recap.recap)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl px-4 py-4"
      style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
    >
      <p
        className={`whitespace-pre-line leading-relaxed ${expanded ? '' : 'line-clamp-3 cursor-pointer'}`}
        style={{ color: 'var(--color-parchment)', fontSize: compact ? '1rem' : '1.125rem' }}
        onClick={() => !expanded && setExpanded(true)}
      >
        {recap.recap}
      </p>
      <NarrationPlayer
        kind="recap"
        id={recap.id}
        audioUrl={recap.audio_url}
        voice={recap.audio_voice}
        duration={recap.audio_duration}
        textLength={recap.recap.length}
        editable
        onGenerated={onNarrated}
      />
      <p className="text-xs" style={{ color: 'var(--color-mist)' }}>
        {new Date(recap.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
        {recap.session_count > 0 && ` · covers ${recap.session_count} session${recap.session_count === 1 ? '' : 's'}`}
        {tone && ` · ${tone.label}`}
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
          Shown before
        </span>
        <select
          value={recap.session_id ?? ''}
          onChange={e => onLink(e.target.value ? Number(e.target.value) : null)}
          className="w-full rounded-lg px-3 py-2 text-sm cursor-pointer"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color: 'var(--color-parchment)' }}
        >
          <option value="">Not linked — attaches to the next session you write</option>
          {linkedMissing && <option value={recap.session_id!}>A deleted session, or one in another campaign</option>}
          {sessions.map((s, i) => (
            <option key={s.id} value={s.id}>#{i + 1} {s.title}</option>
          ))}
        </select>
      </label>
      <div className="flex justify-end gap-2 flex-wrap">
        <SmallButton onClick={handleCopy}>{copied ? 'Copied' : 'Copy'}</SmallButton>
        <SmallButton onClick={onDelete}>Delete</SmallButton>
      </div>
    </div>
  )
}

function Pill({ active, disabled, onClick, children }: { active: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer disabled:opacity-50"
      style={{
        fontFamily: 'var(--font-display)',
        background: active ? 'var(--color-gold-dim)' : 'var(--color-ink-soft)',
        border: `1px solid ${active ? 'var(--color-gold)' : 'var(--color-border)'}`,
        color: active ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
      }}
    >
      {children}
    </button>
  )
}

function SmallButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-opacity cursor-pointer hover:opacity-80"
      style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
    >
      {children}
    </button>
  )
}
