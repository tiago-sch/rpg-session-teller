import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { generateSession } from '../lib/gemini'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CampaignSelect from '../components/CampaignSelect'
import AppHeader from '../components/AppHeader'

type Step = 'form' | 'generating' | 'preview'

interface Result {
  tldr: string
  story: string
}

export default function NewSessionPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('form')
  const [title, setTitle] = useState('')
  const [campaignId, setCampaignId] = useState<number | null>(null)
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setStep('generating')
    try {
      const generated = await generateSession(prompt)
      setResult(generated)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('form')
    }
  }

  const handleSave = async () => {
    if (!result || !user) return
    setSaving(true)
    const { error } = await supabase.from('sessions').insert({
      user_id: user.id,
      title,
      campaign_id: campaignId,
      prompt,
      tldr: result.tldr,
      generated_text: result.story,
    })
    if (error) {
      setError(error.message)
      setSaving(false)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader back={{ label: 'Chronicles', to: '/dashboard' }} />

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {(step === 'form' || step === 'generating') && (
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
                disabled={step === 'generating'}
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
              <CampaignSelect value={campaignId} onChange={setCampaignId} disabled={step === 'generating'} />
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
                disabled={step === 'generating'}
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

            {error && <p className="text-sm text-center" style={{ color: '#e07070' }}>{error}</p>}

            <button
              type="submit"
              disabled={step === 'generating'}
              className="py-3 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                color: '#0c0a14',
                border: '1px solid var(--color-gold-dim)',
                boxShadow: '0 0 20px rgba(200,145,58,0.2)',
              }}
            >
              {step === 'generating' ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Chronicling the session…
                </span>
              ) : (
                'Tell the Story'
              )}
            </button>
          </form>
        )}

        {step === 'preview' && result && (
          <div className="flex flex-col gap-8">
            <div>
              <h1
                className="text-2xl font-semibold tracking-wide mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                {title}
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>
                Review your chronicle before saving.
              </p>
            </div>

            <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Summary</p>
              <p className="text-base leading-relaxed" style={{ color: 'var(--color-parchment)' }}>{result.tldr}</p>
            </div>

            <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Chronicle</p>
              <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}>
                {result.story}
              </div>
            </div>

            {error && <p className="text-sm text-center" style={{ color: '#e07070' }}>{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setStep('form')}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase transition-colors cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
              >
                Edit Notes
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)', boxShadow: '0 0 20px rgba(200,145,58,0.2)' }}
              >
                {saving ? 'Saving…' : 'Save Session'}
              </button>
            </div>
          </div>
        )}
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
