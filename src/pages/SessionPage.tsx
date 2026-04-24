import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import CampaignSelect from '../components/CampaignSelect'

interface Session {
  user_id: string
  title: string
  campaign_id: number | null
  campaigns: { name: string } | null
  tldr: string | null
  prompt: string | null
  generated_text: string | null
  created_at: string
  updated_at: string
}

export default function SessionPage() {
  const { public_id } = useParams<{ public_id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const [copied, setCopied] = useState(false)

  // inline edit state
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editCampaignId, setEditCampaignId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState('')

  useEffect(() => {
    supabase
      .from('sessions')
      .select('user_id, title, campaign_id, campaigns(name), tldr, prompt, generated_text, created_at, updated_at')
      .eq('public_id', public_id)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setNotFound(true)
        } else if (data.user_id !== user?.id) {
          navigate(`/s/${public_id}`, { replace: true })
        } else {
          setSession(data as unknown as Session)
        }
        setLoading(false)
      })
  }, [public_id, user, navigate])

  const startEditing = () => {
    if (!session) return
    setEditTitle(session.title)
    setEditCampaignId(session.campaign_id)
    setEditError('')
    setEditing(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) return
    setSaving(true)
    setEditError('')
    const { error } = await supabase
      .from('sessions')
      .update({ title: editTitle.trim(), campaign_id: editCampaignId })
      .eq('public_id', public_id)
    if (error) {
      setEditError(error.message)
      setSaving(false)
    } else {
      setSession(s => s ? { ...s, title: editTitle.trim(), campaign_id: editCampaignId } : s)
      setEditing(false)
      setSaving(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/s/${public_id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const inputStyle = {
    background: 'var(--color-ink-soft)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-parchment)',
    fontFamily: 'var(--font-body)',
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <header
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--color-gold)" strokeWidth="1.5"/>
            </svg>
          </div>
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            RPG Session Teller
          </span>
        </div>
        <div className="flex items-center gap-3">
          {session && !editing && (
            <>
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Edit
              </button>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: copied ? 'var(--color-gold-dim)' : 'var(--color-surface-raised)',
                  border: `1px solid ${copied ? 'var(--color-gold)' : 'var(--color-border)'}`,
                  color: copied ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {copied ? 'Copied!' : 'Share'}
              </button>
            </>
          )}
          <button
            onClick={() => navigate('/')}
            className="text-sm transition-opacity hover:opacity-70 cursor-pointer"
            style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}
          >
            ← Chronicles
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-6 py-12">
        {loading && (
          <div className="flex justify-center pt-24">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {notFound && (
          <div className="text-center pt-24">
            <p style={{ color: 'var(--color-parchment-muted)' }}>This chronicle could not be found.</p>
          </div>
        )}

        {session && (
          <div className="flex flex-col gap-8">
            {/* Title block — view or edit */}
            {editing ? (
              <form onSubmit={handleSave} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>Title</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={e => setEditTitle(e.target.value)}
                    required
                    autoFocus
                    className="px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>Campaign <span style={{ color: 'var(--color-mist)' }}>(optional)</span></label>
                  <CampaignSelect value={editCampaignId} onChange={setEditCampaignId} />
                </div>
                {editError && <p className="text-xs" style={{ color: '#e07070' }}>{editError}</p>}
                <div className="flex gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={saving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {session.campaigns?.name && (
                  <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                    {session.campaigns.name}
                  </p>
                )}
                <h1
                  className="text-3xl font-semibold tracking-wide mb-3"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
                >
                  {session.title}
                </h1>
                <p className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
                  Created {fmt(session.created_at)}
                  {session.updated_at !== session.created_at && ` · Updated ${fmt(session.updated_at)}`}
                </p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.6"/>
              </svg>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>

            {session.tldr && (
              <div className="rounded-xl px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Summary</p>
                <p className="text-base leading-relaxed" style={{ color: 'var(--color-parchment)' }}>{session.tldr}</p>
              </div>
            )}

            {session.generated_text && (
              <div className="rounded-xl px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Chronicle</p>
                <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}>
                  {session.generated_text}
                </div>
              </div>
            )}

            {session.prompt && (
              <div>
                <button
                  onClick={() => setShowNotes(true)}
                  className="text-xs font-semibold tracking-widest uppercase cursor-pointer transition-opacity hover:opacity-70"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
                >
                  View Original Notes
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {showNotes && session?.prompt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowNotes(false)}
        >
          <div
            className="relative w-full max-w-xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Original Notes</p>
              <button onClick={() => setShowNotes(false)} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
            </div>
            <div className="overflow-y-auto px-6 py-5">
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}>{session.prompt}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
