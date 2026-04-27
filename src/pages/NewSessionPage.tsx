import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { apiPost } from '../lib/api'
import { TONES } from '../lib/tones'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import CampaignSelect from '../components/CampaignSelect'
import AppHeader from '../components/AppHeader'
import { useDraft, formatDraftAge } from '../hooks/useDraft'

export default function NewSessionPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navCampaignId = (location.state as { campaignId?: number } | null)?.campaignId ?? null
  const { user, session } = useAuth()
  const { profile } = useProfile()
  const [title, setTitle] = useState('')
  const [campaignId, setCampaignId] = useState<number | null>(navCampaignId)
  const [prompt, setPrompt] = useState('')
  const [fillGaps, setFillGaps] = useState(false)
  const [toneId, setToneId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [draftApplied, setDraftApplied] = useState(false)

  const { draft, saveDraft, clearDraft } = useDraft(user, null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: campaigns = [] } = useQuery<{ id: number; include_history: boolean; notes: string | null }[]>({
    queryKey: ['campaigns', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('campaigns')
        .select('id, include_history, notes')
        .eq('user_id', user!.id)
      return (data as { id: number; include_history: boolean; notes: string | null }[]) ?? []
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const selectedCampaignData = campaigns.find(c => c.id === campaignId)
  const historyEnabled = selectedCampaignData?.include_history ?? false
  const draftAppliedRef = useRef(false)

  // Apply draft once it loads (only on first load, not after discard)
  useEffect(() => {
    if (!draft || draftAppliedRef.current) return
    draftAppliedRef.current = true
    if (draft.title) setTitle(draft.title)
    if (draft.campaign_id !== null) setCampaignId(draft.campaign_id)
    if (draft.prompt) setPrompt(draft.prompt)
    setFillGaps(draft.fill_gaps)
    if (draft.tone) setToneId(draft.tone)
    setDraftApplied(true)
  }, [draft])

  // Autosave on change (debounced 1.5s)
  useEffect(() => {
    if (!title && !prompt) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveDraft({ title, campaign_id: campaignId, prompt, fill_gaps: fillGaps, tone: toneId })
    }, 1500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [title, campaignId, prompt, fillGaps, toneId, saveDraft])

  const mutation = useMutation({
    mutationFn: async () => {
      const data = await apiPost<{ publicId: string; inks: number }>('/api/generate-session', session, {
        title,
        campaignId,
        prompt,
        fillGaps,
        toneId,
      })
      return data
    },
    onSuccess: (data) => {
      clearDraft()
      queryClient.setQueryData(['profile', user?.id], (old: typeof profile) =>
        old ? { ...old, inks: data.inks } : old
      )
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] })
      navigate(`/session/${data.publicId}`)
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    },
  })

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate()
  }

  const generating = mutation.isPending

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <form onSubmit={handleGenerate} className="flex flex-col gap-6">
          {draftApplied && (
            <div
              className="flex items-center justify-between px-4 py-2.5 rounded-lg text-xs"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', color: 'var(--color-parchment-muted)' }}
            >
              <span style={{ fontFamily: 'var(--font-display)' }}>
                Draft restored{draft?.updated_at ? ` · saved ${formatDraftAge(draft.updated_at)}` : ''}
              </span>
              <button
                type="button"
                onClick={() => {
                  clearDraft()
                  draftAppliedRef.current = true
                  setTitle('')
                  setCampaignId(null)
                  setPrompt('')
                  setFillGaps(false)
                  setToneId(null)
                  setDraftApplied(false)
                }}
                className="ml-4 underline cursor-pointer hover:opacity-70 transition-opacity"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
              >
                Discard
              </button>
            </div>
          )}

          <div>
            <h1
              className="text-2xl font-semibold tracking-wide mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
            >
              New Session
            </h1>
            <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>
              Describe what happened and let the chronicler do the rest.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
            >
              Session Title
            </label>
            <input
              type="text"
              placeholder="The Fall of Ironveil"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              disabled={generating}
              className="px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none disabled:opacity-50"
              style={{
                background: 'var(--color-ink-soft)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-parchment)',
                fontFamily: 'var(--font-body)',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <label
                className="text-xs font-semibold tracking-widest uppercase"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
              >
                Campaign <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              {historyEnabled && (
                <div className="relative group flex items-center">
                  <span
                    className="text-xs font-semibold tracking-wide px-2 py-0.5 rounded-full"
                    style={{ fontFamily: 'var(--font-display)', background: 'var(--color-gold-dim)', color: 'var(--color-parchment)', border: '1px solid var(--color-gold)', cursor: 'default' }}
                  >
                    History on
                  </span>
                  <div
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg px-3 py-2.5 text-xs leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)', color: 'var(--color-parchment-muted)' }}
                  >
                    Previous session summaries from this campaign will be included in the generation prompt to help the AI maintain continuity.
                  </div>
                </div>
              )}
            </div>
            <CampaignSelect value={campaignId} onChange={setCampaignId} disabled={generating} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
            >
              Session Notes
            </label>
            <textarea
              placeholder={"• The party arrived at the ruins of Ironveil at dusk\n• Mira spotted tracks leading into the catacombs\n• \"We go in at dawn\" — said Aldric\n• ..."}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              required
              rows={12}
              disabled={generating}
              className="px-4 py-3 rounded-lg text-sm leading-relaxed resize-y transition-colors focus:outline-none disabled:opacity-50"
              style={{
                background: 'var(--color-ink-soft)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-parchment)',
                fontFamily: 'var(--font-body)',
                minHeight: '220px',
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            />
            <p className="text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
              Bullet points, prose, or a mix — any format works. Write in any language.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={fillGaps}
              disabled={generating}
              onClick={() => setFillGaps(v => !v)}
              className="relative shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50"
              style={{
                width: '36px',
                height: '20px',
                background: fillGaps ? 'var(--color-gold)' : 'var(--color-border-bright)',
              }}
            >
              <span
                className="absolute top-0.5 rounded-full transition-transform"
                style={{
                  width: '16px',
                  height: '16px',
                  background: fillGaps ? '#0c0a14' : 'var(--color-ink)',
                  transform: fillGaps ? 'translateX(18px)' : 'translateX(2px)',
                }}
              />
            </button>
            <span className="text-sm" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}>
              Fill the gaps
            </span>
            <div className="relative group">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-border-bright)', cursor: 'default', flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-lg px-3 py-2.5 text-xs leading-relaxed pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-10"
                style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)', color: 'var(--color-parchment-muted)' }}
              >
                When enabled, the AI can add plausible dialogue, describe environments, and connect scenes with brief passages. It won't invent new characters or plot events — only colour what's already there.
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
              Tone <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(tone => {
                const active = toneId === tone.id
                return (
                  <button
                    key={tone.id}
                    type="button"
                    disabled={generating}
                    onClick={() => setToneId(active ? null : tone.id)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all cursor-pointer disabled:opacity-50"
                    style={{
                      fontFamily: 'var(--font-display)',
                      background: active ? 'var(--color-gold-dim)' : 'var(--color-ink-soft)',
                      border: `1px solid ${active ? 'var(--color-gold)' : 'var(--color-border)'}`,
                      color: active ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
                    }}
                  >
                    {tone.label}
                  </button>
                )
              })}
            </div>
          </div>

          {error && <p className="text-sm text-center" style={{ color: '#e07070' }}>{error}</p>}

          {draft && !draftApplied && (
            <p className="text-xs text-center" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
              Draft autosaved · {formatDraftAge(draft.updated_at)}
            </p>
          )}

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={generating || (profile !== null && profile.inks < 1)}
              className="py-3 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                color: '#0c0a14',
                border: '1px solid var(--color-gold-dim)',
                boxShadow: '0 0 20px rgba(200,145,58,0.2)',
              }}
            >
              {generating ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Chronicling the session…
                </span>
              ) : (
                'Tell the Story'
              )}
            </button>
            <div className="flex items-center justify-center gap-1.5">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: profile !== null && profile.inks < 1 ? '#e07070' : 'var(--color-gold)' }}>
                <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
              </svg>
              <span
                className="text-xs"
                style={{ fontFamily: 'var(--font-display)', color: profile !== null && profile.inks < 1 ? '#e07070' : 'var(--color-parchment-muted)', letterSpacing: '0.04em' }}
              >
                {profile !== null && profile.inks < 1 ? 'Not enough ink' : 'Costs 1 ink'}
              </span>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
