import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

interface Group {
  id: number
  public_id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
}

interface GroupSession {
  session_id: number
  sessions: {
    id: number
    public_id: string
    title: string
    tldr: string | null
    campaigns: { name: string } | null
    updated_at: string
  }
}

interface UserSession {
  id: number
  public_id: string
  title: string
  campaigns: { name: string } | null
}

const inputStyle = {
  background: 'var(--color-ink-soft)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-parchment)',
  fontFamily: 'var(--font-body)',
}

export default function GroupPage() {
  const { public_id } = useParams<{ public_id: string }>()
  const { user } = useAuth()

  const [group, setGroup] = useState<Group | null>(null)
  const [creatorName, setCreatorName] = useState<string | null>(null)
  const [sessions, setSessions] = useState<GroupSession[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)

  // edit group
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editSaving, setEditSaving] = useState(false)

  // add sessions modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [userSessions, setUserSessions] = useState<UserSession[]>([])
  const [inGroupIds, setInGroupIds] = useState<Set<number>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [addLoading, setAddLoading] = useState(false)
  const [addSaving, setAddSaving] = useState(false)

  const isOwner = !!user && group?.user_id === user.id

  useEffect(() => {
    async function load() {
      const { data: gData, error } = await supabase
        .from('session_groups')
        .select('id, public_id, user_id, title, description, created_at')
        .eq('public_id', public_id)
        .single()

      if (error || !gData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setGroup(gData as Group)

      const [{ data: profileData }, { data: gsData }] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', gData.user_id).single(),
        supabase
          .from('group_sessions')
          .select('session_id, sessions(id, public_id, title, tldr, campaigns(name), updated_at)')
          .eq('group_id', gData.id)
          .order('added_at', { ascending: false }),
      ])

      setCreatorName(profileData?.display_name ?? null)
      setSessions((gsData as unknown as GroupSession[]) ?? [])
      setLoading(false)
    }
    load()
  }, [public_id])

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!group || !editTitle.trim()) return
    setEditSaving(true)
    const { error } = await supabase
      .from('session_groups')
      .update({ title: editTitle.trim(), description: editDesc.trim() || null })
      .eq('id', group.id)
    if (!error) {
      setGroup(g => g ? { ...g, title: editTitle.trim(), description: editDesc.trim() || null } : g)
      setEditing(false)
    }
    setEditSaving(false)
  }

  const openAddModal = async () => {
    if (!group || !user) return
    setAddLoading(true)
    setShowAddModal(true)

    const [{ data: allSessions }, { data: currentGs }] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, public_id, title, campaigns(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('group_sessions')
        .select('session_id')
        .eq('group_id', group.id),
    ])

    const currentIds = new Set((currentGs ?? []).map((r: { session_id: number }) => r.session_id))
    setUserSessions((allSessions as unknown as UserSession[]) ?? [])
    setInGroupIds(currentIds)
    setPendingIds(new Set(currentIds))
    setAddLoading(false)
  }

  const toggleSession = (id: number) => {
    setPendingIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSaveGroupSessions = async () => {
    if (!group) return
    setAddSaving(true)

    const toAdd = [...pendingIds].filter(id => !inGroupIds.has(id))
    const toRemove = [...inGroupIds].filter(id => !pendingIds.has(id))

    await Promise.all([
      toAdd.length > 0
        ? supabase.from('group_sessions').insert(toAdd.map(sid => ({ group_id: group.id, session_id: sid })))
        : Promise.resolve(),
      ...toRemove.map(sid =>
        supabase.from('group_sessions').delete().eq('group_id', group.id).eq('session_id', sid)
      ),
    ])

    // Reload sessions list
    const { data: gsData } = await supabase
      .from('group_sessions')
      .select('session_id, sessions(id, public_id, title, tldr, campaigns(name), updated_at)')
      .eq('group_id', group.id)
      .order('added_at', { ascending: false })

    setSessions((gsData as unknown as GroupSession[]) ?? [])
    setInGroupIds(new Set(pendingIds))
    setAddSaving(false)
    setShowAddModal(false)
  }

  const removeSession = async (sessionId: number) => {
    if (!group) return
    await supabase.from('group_sessions').delete().eq('group_id', group.id).eq('session_id', sessionId)
    setSessions(prev => prev.filter(gs => gs.session_id !== sessionId))
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/g/${public_id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const headerRight = group && !editing ? (
    <>
      {isOwner && (
        <button
          onClick={() => { setEditTitle(group.title); setEditDesc(group.description ?? ''); setEditing(true) }}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-colors cursor-pointer"
          style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <span className="hidden sm:inline">Edit</span>
        </button>
      )}
      <button
        onClick={handleCopy}
        className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer"
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
        <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
      </button>
    </>
  ) : undefined

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader right={headerRight} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
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
            <p style={{ color: 'var(--color-parchment-muted)' }}>This group could not be found.</p>
          </div>
        )}

        {group && !loading && (
          <>
            {editing ? (
              <form onSubmit={handleEditSave} className="flex flex-col gap-3">
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
                  <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
                    Description <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    rows={3}
                    className="px-4 py-2.5 rounded-lg text-sm focus:outline-none resize-none"
                    style={inputStyle}
                    onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                  />
                </div>
                <div className="flex gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
                  >
                    {editSaving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(false)}
                    disabled={editSaving}
                    className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                    style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <h1
                  className="text-2xl sm:text-3xl font-semibold tracking-wide mb-2"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
                >
                  {group.title}
                </h1>
                {group.description && (
                  <p className="text-base mb-2" style={{ color: 'var(--color-parchment-muted)' }}>{group.description}</p>
                )}
                <p className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
                  {creatorName && <>By {creatorName} · </>}
                  {sessions.length} {sessions.length === 1 ? 'session' : 'sessions'}
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

            {isOwner && (
              <div>
                <button
                  onClick={openAddModal}
                  className="px-4 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer"
                  style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px dashed var(--color-gold-dim)', color: 'var(--color-gold)' }}
                >
                  + Add Sessions
                </button>
              </div>
            )}

            {sessions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>No sessions in this group yet.</p>
              </div>
            )}

            {sessions.length > 0 && (
              <div className="flex flex-col gap-3">
                {sessions.map(gs => (
                  <div
                    key={gs.session_id}
                    className="rounded-xl px-5 py-4 flex flex-col gap-2"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <a
                        href={`/s/${gs.sessions.public_id}`}
                        className="font-semibold leading-snug hover:underline"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-light)' }}
                      >
                        {gs.sessions.title}
                      </a>
                      {isOwner && (
                        <button
                          onClick={() => removeSession(gs.session_id)}
                          className="shrink-0 cursor-pointer transition-opacity hover:opacity-100"
                          style={{ color: 'var(--color-parchment-muted)', opacity: 0.5 }}
                          title="Remove from group"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          </svg>
                        </button>
                      )}
                    </div>
                    {gs.sessions.campaigns?.name && (
                      <p className="text-xs" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', opacity: 0.8 }}>{gs.sessions.campaigns.name}</p>
                    )}
                    {gs.sessions.tldr && (
                      <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--color-parchment-muted)' }}>{gs.sessions.tldr}</p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--color-border-bright)' }}>{fmt(gs.sessions.updated_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Add Sessions modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { if (!addSaving) setShowAddModal(false) }}
        >
          <div
            className="relative w-full max-w-lg max-h-[80vh] flex flex-col rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Add Sessions</p>
              <button onClick={() => setShowAddModal(false)} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
              {addLoading ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              ) : userSessions.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-parchment-muted)' }}>No sessions found.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {userSessions.map(s => (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors"
                      style={{ background: pendingIds.has(s.id) ? 'var(--color-surface-raised)' : 'transparent' }}
                      onMouseEnter={e => { if (!pendingIds.has(s.id)) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (!pendingIds.has(s.id)) e.currentTarget.style.background = 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={pendingIds.has(s.id)}
                        onChange={() => toggleSession(s.id)}
                        className="shrink-0"
                        style={{ accentColor: 'var(--color-gold)' }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>{s.title}</span>
                        {s.campaigns?.name && (
                          <span className="text-xs" style={{ color: 'var(--color-gold)', opacity: 0.8 }}>{s.campaigns.name}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={handleSaveGroupSessions}
                disabled={addSaving || addLoading}
                className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
              >
                {addSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                disabled={addSaving}
                className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
              >
                Cancel
              </button>
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
