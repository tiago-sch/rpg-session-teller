import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

interface PublicSession {
  title: string
  campaign_name: string | null
  tldr: string | null
  generated_text: string | null
  updated_at: string
  creator_name: string | null
  owner_id: string
}

const inputStyle = {
  background: 'var(--color-ink-soft)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-parchment)',
  fontFamily: 'var(--font-body)',
}

export default function SharePage() {
  const { public_id } = useParams<{ public_id: string }>()
  const { user } = useAuth()

  const [session, setSession] = useState<PublicSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // save state
  const [savedId, setSavedId] = useState<number | null>(null)
  const [savedNote, setSavedNote] = useState<string | null>(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [noteInput, setNoteInput] = useState('')
  const [saving, setSaving] = useState(false)

  const isOwner = !!user && session?.owner_id === user.id
  const canSave = !!user && !isOwner

  useEffect(() => {
    async function load() {
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('title, campaigns(name), tldr, generated_text, updated_at, user_id')
        .eq('public_id', public_id)
        .single()

      if (error || !sessionData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const sd = sessionData as typeof sessionData & { campaigns: { name: string } | null }

      const [{ data: profileData }, savedResult] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', sessionData.user_id).single(),
        user && sessionData.user_id !== user.id
          ? supabase
              .from('saved_sessions')
              .select('id, note')
              .eq('user_id', user.id)
              .eq('session_public_id', public_id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      setSession({
        title: sd.title,
        campaign_name: sd.campaigns?.name ?? null,
        tldr: sd.tldr,
        generated_text: sd.generated_text,
        updated_at: sd.updated_at,
        creator_name: profileData?.display_name ?? null,
        owner_id: sessionData.user_id,
      })

      if (savedResult.data) {
        setSavedId(savedResult.data.id)
        setSavedNote(savedResult.data.note ?? null)
      }

      setLoading(false)
    }
    load()
  }, [public_id, user])

  const openSaveModal = () => {
    setNoteInput(savedNote ?? '')
    setShowSaveModal(true)
  }

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    if (savedId) {
      // update existing
      const { error } = await supabase
        .from('saved_sessions')
        .update({ note: noteInput.trim() || null })
        .eq('id', savedId)
      if (!error) {
        setSavedNote(noteInput.trim() || null)
        setShowSaveModal(false)
      }
    } else {
      const { data, error } = await supabase
        .from('saved_sessions')
        .insert({ user_id: user.id, session_public_id: public_id, note: noteInput.trim() || null })
        .select('id, note')
        .single()
      if (!error && data) {
        setSavedId(data.id)
        setSavedNote(data.note ?? null)
        setShowSaveModal(false)
      }
    }
    setSaving(false)
  }

  const handleUnsave = async () => {
    if (!savedId) return
    await supabase.from('saved_sessions').delete().eq('id', savedId)
    setSavedId(null)
    setSavedNote(null)
    setShowSaveModal(false)
  }

  const headerRight = canSave ? (
    <button
      onClick={openSaveModal}
      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer"
      style={{
        fontFamily: 'var(--font-display)',
        background: savedId ? 'var(--color-gold-dim)' : 'var(--color-surface-raised)',
        border: `1px solid ${savedId ? 'var(--color-gold)' : 'var(--color-border)'}`,
        color: savedId ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          fill={savedId ? 'currentColor' : 'none'}
        />
      </svg>
      <span className="hidden sm:inline">{savedId ? 'Saved' : 'Save'}</span>
    </button>
  ) : undefined

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader right={headerRight} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
            <div>
              {session.campaign_name && (
                <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                  {session.campaign_name}
                </p>
              )}
              <h1
                className="text-2xl sm:text-3xl font-semibold tracking-wide mb-3"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                {session.title}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
                {session.creator_name && <>By {session.creator_name} · </>}
                Updated {fmt(session.updated_at)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.6"/>
              </svg>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>

            {session.tldr && (
              <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Summary</p>
                <p className="text-base leading-relaxed" style={{ color: 'var(--color-parchment)' }}>{session.tldr}</p>
              </div>
            )}

            {session.generated_text && (
              <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Chronicle</p>
                <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}>
                  {session.generated_text}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Save modal */}
      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { if (!saving) setShowSaveModal(false) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                {savedId ? 'Saved Chronicle' : 'Save Chronicle'}
              </p>
              <button onClick={() => setShowSaveModal(false)} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
                  Note <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  autoFocus
                  rows={3}
                  placeholder="What drew you to this chronicle…"
                  className="px-4 py-2.5 rounded-lg text-sm focus:outline-none resize-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
                >
                  {saving ? 'Saving…' : savedId ? 'Update Note' : 'Save'}
                </button>
                {savedId && (
                  <button
                    onClick={handleUnsave}
                    disabled={saving}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                  >
                    Unsave
                  </button>
                )}
              </div>
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
