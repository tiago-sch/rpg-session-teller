import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useProfile, type Profile } from '../hooks/useProfile'
import { apiPost } from '../lib/api'
import { TONES } from '../lib/tones'
import InkCost from './InkCost'

const RECAP_COST = 1
const SESSION_COUNTS = [1, 3, 5, 10]

interface SavedRecap {
  recap: string | null
  recap_generated_at: string | null
}

export default function CampaignRecapModal({ campaignId, campaignName, sessionCount, onClose }: {
  campaignId: number
  campaignName: string
  sessionCount: number
  onClose: () => void
}) {
  const { user, session } = useAuth()
  const { profile } = useProfile()
  const [count, setCount] = useState(Math.min(3, sessionCount))
  const [toneId, setToneId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)

  const queryKey = ['campaign-recap', campaignId]
  const { data: saved, isLoading } = useQuery<SavedRecap | null>({
    queryKey,
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('recap, recap_generated_at')
        .eq('id', campaignId)
        .single()
      return (data as SavedRecap | null) ?? null
    },
  })

  useEffect(() => () => window.speechSynthesis?.cancel(), [])

  const recap = saved?.recap ?? null
  const notEnoughInk = profile !== null && profile.inks < RECAP_COST
  const counts = SESSION_COUNTS.filter(n => n < sessionCount)

  const handleGenerate = async () => {
    setError('')
    setGenerating(true)
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    try {
      const result = await apiPost<{ recap: string; generatedAt: string; inks: number }>('/api/generate-recap', session, {
        campaignId,
        sessionCount: count,
        toneId,
      })
      queryClient.setQueryData(queryKey, { recap: result.recap, recap_generated_at: result.generatedAt })
      queryClient.setQueryData(['profile', user?.id], (old: Profile | null) =>
        old ? { ...old, inks: result.inks } : old
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate recap.')
    } finally {
      setGenerating(false)
    }
  }

  const handleCopy = async () => {
    if (!recap) return
    await navigator.clipboard.writeText(recap)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSpeak = () => {
    if (!recap || !window.speechSynthesis) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(recap)
    utterance.rate = 0.95
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

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
          ) : recap ? (
            <div className="flex flex-col gap-3">
              <p className="whitespace-pre-line leading-relaxed" style={{ color: 'var(--color-parchment)', fontSize: '1.125rem' }}>{recap}</p>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs" style={{ color: 'var(--color-mist)' }}>
                  {saved?.recap_generated_at && `Written ${new Date(saved.recap_generated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </p>
                <div className="flex gap-2">
                  {'speechSynthesis' in window && (
                    <SmallButton onClick={handleSpeak}>{speaking ? 'Stop' : 'Read aloud'}</SmallButton>
                  )}
                  <SmallButton onClick={handleCopy}>{copied ? 'Copied' : 'Copy'}</SmallButton>
                </div>
              </div>
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
                {generating ? 'Writing…' : recap ? 'Write a new recap' : 'Write recap'}
              </button>
            </div>
          </div>
        </div>
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
