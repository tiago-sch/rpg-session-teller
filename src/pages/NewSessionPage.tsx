import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { generateSession } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CampaignSelect from '../components/CampaignSelect'
import AppHeader from '../components/AppHeader'

export default function NewSessionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [prompt, setPrompt] = useState('')
  const [fillGaps, setFillGaps] = useState(false)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: async () => {
      const generated = await generateSession(prompt, fillGaps)
      const { data, error: saveError } = await supabase
        .from('sessions')
        .insert({
          user_id: user!.id,
          title,
          campaign_id: campaignId,
          prompt,
          tldr: generated.tldr,
          generated_text: generated.story,
        })
        .select('public_id')
        .single()
      if (saveError || !data) throw saveError ?? new Error('Failed to save session.')
      return (data as { public_id: string }).public_id
    },
    onSuccess: (publicId) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] })
      navigate(`/session/${publicId}`)
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
            <label
              className="text-xs font-semibold tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
            >
              Campaign <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
            </label>
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

          {error && <p className="text-sm text-center" style={{ color: '#e07070' }}>{error}</p>}

          <button
            type="submit"
            disabled={generating}
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
