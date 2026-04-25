import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

interface Group {
  id: number
  public_id: string
  title: string
  description: string | null
  created_at: string
  group_sessions: { count: number }[]
}

const inputStyle = {
  background: 'var(--color-ink-soft)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-parchment)',
  fontFamily: 'var(--font-body)',
}

export default function GroupsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    supabase
      .from('session_groups')
      .select('id, public_id, title, description, created_at, group_sessions(count)')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setGroups((data as unknown as Group[]) ?? [])
        setLoading(false)
      })
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    const { data, error } = await supabase
      .from('session_groups')
      .insert({ user_id: user!.id, title: newTitle.trim(), description: newDesc.trim() || null })
      .select('id, public_id, title, description, created_at, group_sessions(count)')
      .single()
    if (error) {
      setCreateError(error.message)
    } else {
      setGroups(gs => [data as unknown as Group, ...gs])
      setNewTitle('')
      setNewDesc('')
      setShowModal(false)
    }
    setCreating(false)
  }

  const copyShareLink = async (publicId: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/g/${publicId}`)
    setCopiedId(publicId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <h1
            className="text-lg sm:text-xl font-semibold tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            My Groups
          </h1>
          <button
            onClick={() => { setShowModal(true); setCreateError('') }}
            className="px-4 sm:px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
              color: '#0c0a14',
              border: '1px solid var(--color-gold-dim)',
              boxShadow: '0 0 16px rgba(200,145,58,0.2)',
            }}
          >
            + New Group
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-4 py-20">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <rect x="2" y="3" width="20" height="14" rx="2" stroke="var(--color-gold)" strokeWidth="1.5"/>
                <path d="M8 21h8M12 17v4" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>No groups yet. Create one to share a curated list of sessions.</p>
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="flex flex-col gap-3">
            {groups.map(group => {
              const count = group.group_sessions?.[0]?.count ?? 0
              return (
                <div
                  key={group.id}
                  className="rounded-xl px-5 py-4 flex flex-col gap-2"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      onClick={() => navigate(`/g/${group.public_id}`)}
                      className="text-left font-semibold leading-snug hover:underline cursor-pointer"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-light)' }}
                    >
                      {group.title}
                    </button>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        title="Copy share link"
                        onClick={() => copyShareLink(group.public_id)}
                        className="cursor-pointer transition-opacity hover:opacity-100"
                        style={{ color: copiedId === group.public_id ? 'var(--color-gold)' : 'var(--color-parchment-muted)', opacity: 0.7 }}
                      >
                        {copiedId === group.public_id ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          </svg>
                        )}
                      </button>
                      <a
                        href={`/g/${group.public_id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-opacity hover:opacity-100"
                        style={{ color: 'var(--color-parchment-muted)', opacity: 0.7 }}
                        title="Open public group page"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M15 3h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--color-parchment-muted)' }}>{group.description}</p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--color-border-bright)' }}>
                    {count} {count === 1 ? 'session' : 'sessions'}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>New Group</p>
              <button onClick={() => setShowModal(false)} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>Title</label>
                <input
                  type="text"
                  placeholder="Season 1 Highlights"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  required
                  autoFocus
                  className="px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
                  Description <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  placeholder="The best sessions from our first campaign arc…"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  className="px-4 py-2.5 rounded-lg text-sm focus:outline-none resize-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
              {createError && <p className="text-xs" style={{ color: '#e07070' }}>{createError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
              >
                {creating ? 'Creating…' : 'Create Group'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
