import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

interface GroupData {
  id: number
  public_id: string
  user_id: string
  title: string
  description: string | null
  created_at: string
  creatorName: string | null
  sessions: GroupSession[]
  savedId: number | null
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

interface PickableSession {
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
  const navigate = useNavigate()
  const { user } = useAuth()

  const [copied, setCopied] = useState(false)

  // edit group
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')

  // add sessions modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [ownSessions, setOwnSessions] = useState<PickableSession[]>([])
  const [savedSessions, setSavedSessions] = useState<PickableSession[]>([])
  const [inGroupIds, setInGroupIds] = useState<Set<number>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const queryKey = ['group', public_id, user?.id ?? null] as const

  const { data: group, isLoading, isError } = useQuery<GroupData>({
    queryKey,
    queryFn: async () => {
      const { data: gData, error } = await supabase
        .from('session_groups')
        .select('id, public_id, user_id, title, description, created_at')
        .eq('public_id', public_id)
        .single()

      if (error || !gData) throw new Error('Not found')

      const isOwnerLocal = user?.id === gData.user_id

      const [{ data: profileData }, { data: gsData }, savedResult] = await Promise.all([
        supabase.from('profiles').select('display_name').eq('id', gData.user_id).single(),
        supabase
          .from('group_sessions')
          .select('session_id, sessions(id, public_id, title, tldr, campaigns(name), updated_at)')
          .eq('group_id', gData.id)
          .order('added_at', { ascending: false }),
        user && !isOwnerLocal
          ? supabase.from('saved_groups').select('id').eq('user_id', user.id).eq('group_public_id', public_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ])

      return {
        ...gData,
        creatorName: profileData?.display_name ?? null,
        sessions: (gsData as unknown as GroupSession[]) ?? [],
        savedId: (savedResult as { data: { id: number } | null }).data?.id ?? null,
      }
    },
  })

  const isOwner = !!user && group?.user_id === user.id
  const canSave = !!user && !isOwner

  const saveGroupMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('saved_groups')
        .insert({ user_id: user!.id, group_public_id: public_id })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['saved_groups_list', user?.id] })
    },
  })

  const unsaveGroupMutation = useMutation({
    mutationFn: async (savedId: number) => {
      const { error } = await supabase.from('saved_groups').delete().eq('id', savedId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['saved_groups_list', user?.id] })
    },
  })

  const editMutation = useMutation({
    mutationFn: async ({ title, description }: { title: string; description: string | null }) => {
      const { error } = await supabase
        .from('session_groups')
        .update({ title, description })
        .eq('id', group!.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['groups', user?.id] })
      setEditing(false)
    },
  })

  const saveSessionsMutation = useMutation({
    mutationFn: async ({ toAdd, toRemove }: { toAdd: number[]; toRemove: number[] }) => {
      await Promise.all([
        toAdd.length > 0
          ? supabase.from('group_sessions').insert(toAdd.map(sid => ({ group_id: group!.id, session_id: sid })))
          : Promise.resolve(),
        ...toRemove.map(sid =>
          supabase.from('group_sessions').delete().eq('group_id', group!.id).eq('session_id', sid)
        ),
      ])
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setInGroupIds(new Set(pendingIds))
      setShowAddModal(false)
    },
  })

  const removeMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      const { error } = await supabase
        .from('group_sessions')
        .delete()
        .eq('group_id', group!.id)
        .eq('session_id', sessionId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim()) return
    editMutation.mutate({ title: editTitle.trim(), description: editDesc.trim() || null })
  }

  const openAddModal = async () => {
    if (!group || !user) return
    setAddLoading(true)
    setShowAddModal(true)
    setSearch('')

    const [{ data: ownData }, { data: currentGs }, { data: savedData }] = await Promise.all([
      supabase
        .from('sessions')
        .select('id, public_id, title, campaigns(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase.from('group_sessions').select('session_id').eq('group_id', group.id),
      supabase.from('saved_sessions').select('session_public_id').eq('user_id', user.id),
    ])

    const savedPubIds = (savedData ?? []).map((s: { session_public_id: string }) => s.session_public_id)
    let savedSessionsData: PickableSession[] = []
    if (savedPubIds.length > 0) {
      const { data } = await supabase
        .from('sessions')
        .select('id, public_id, title, campaigns(name)')
        .in('public_id', savedPubIds)
        .order('created_at', { ascending: false })
      savedSessionsData = (data as unknown as PickableSession[]) ?? []
    }

    const currentIds = new Set((currentGs ?? []).map((r: { session_id: number }) => r.session_id))
    setOwnSessions((ownData as unknown as PickableSession[]) ?? [])
    setSavedSessions(savedSessionsData)
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

  const handleSaveGroupSessions = () => {
    const toAdd = [...pendingIds].filter(id => !inGroupIds.has(id))
    const toRemove = [...inGroupIds].filter(id => !pendingIds.has(id))
    saveSessionsMutation.mutate({ toAdd, toRemove })
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/g/${public_id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const goToSession = (sessionPublicId: string) => {
    if (!group) return
    navigate(`/s/${sessionPublicId}`, {
      state: { fromGroup: { public_id: group.public_id, title: group.title } },
    })
  }

  const addSaving = saveSessionsMutation.isPending
  const editSaving = editMutation.isPending

  const savingGroup = saveGroupMutation.isPending || unsaveGroupMutation.isPending

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
      {canSave && (
        <button
          onClick={() => group.savedId ? unsaveGroupMutation.mutate(group.savedId) : saveGroupMutation.mutate()}
          disabled={savingGroup}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
          style={{
            fontFamily: 'var(--font-display)',
            background: group.savedId ? 'var(--color-gold-dim)' : 'var(--color-surface-raised)',
            border: `1px solid ${group.savedId ? 'var(--color-gold)' : 'var(--color-border)'}`,
            color: group.savedId ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              fill={group.savedId ? 'currentColor' : 'none'}
            />
          </svg>
          <span className="hidden sm:inline">{group.savedId ? 'Saved' : 'Save'}</span>
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

  const q = search.toLowerCase()
  const match = (s: PickableSession) =>
    (s.title + ' ' + (s.campaigns?.name ?? '')).toLowerCase().includes(q)
  const filteredOwn = ownSessions.filter(match)
  const filteredSaved = savedSessions.filter(match)
  const selectedCount = pendingIds.size

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader right={headerRight} />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        {isLoading && (
          <div className="flex justify-center pt-24">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {isError && (
          <div className="text-center pt-24">
            <p style={{ color: 'var(--color-parchment-muted)' }}>This group could not be found.</p>
          </div>
        )}

        {group && !isLoading && (
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
                  {group.creatorName && <>By {group.creatorName} · </>}
                  {group.sessions.length} {group.sessions.length === 1 ? 'session' : 'sessions'}
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

            {group.sessions.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>No sessions in this group yet.</p>
              </div>
            )}

            {group.sessions.length > 0 && (
              <div className="flex flex-col gap-3">
                {group.sessions.map(gs => (
                  <div
                    key={gs.session_id}
                    className="rounded-xl px-5 py-4 flex flex-col gap-2"
                    style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <button
                        onClick={() => goToSession(gs.sessions.public_id)}
                        className="text-left font-semibold leading-snug hover:underline cursor-pointer"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-light)', background: 'none', border: 'none', padding: 0 }}
                      >
                        {gs.sessions.title}
                      </button>
                      {isOwner && (
                        <button
                          onClick={() => removeMutation.mutate(gs.session_id)}
                          disabled={removeMutation.isPending}
                          className="shrink-0 cursor-pointer transition-opacity hover:opacity-100 disabled:opacity-30"
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

      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { if (!addSaving) setShowAddModal(false) }}
        >
          <div
            className="relative w-full max-w-lg flex flex-col rounded-2xl shadow-2xl"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border-bright)',
              boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)',
              maxHeight: 'min(85vh, 640px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                  Add Sessions
                </p>
                {selectedCount > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--color-gold-dim)', color: '#0c0a14', fontFamily: 'var(--font-display)', fontWeight: 600 }}
                  >
                    {selectedCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-parchment-muted)' }}
              >✕</button>
            </div>

            <div className="px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div className="relative">
                <svg
                  width="14" height="14" viewBox="0 0 24 24" fill="none"
                  className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: 'var(--color-parchment-muted)' }}
                >
                  <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
                  <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search chronicles…"
                  autoFocus
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none"
                  style={inputStyle}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 py-3">
              {addLoading ? (
                <div className="flex justify-center py-10">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              ) : filteredOwn.length === 0 && filteredSaved.length === 0 ? (
                <p className="text-sm text-center py-10" style={{ color: 'var(--color-parchment-muted)' }}>
                  {search ? 'No chronicles match your search.' : 'No chronicles found.'}
                </p>
              ) : (
                <>
                  {filteredOwn.length > 0 && (
                    <div className="mb-2">
                      <p
                        className="px-6 pb-1 text-xs font-semibold tracking-widest uppercase"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)', opacity: 0.6 }}
                      >
                        My Chronicles
                      </p>
                      {filteredOwn.map(s => (
                        <SessionRow key={s.id} session={s} checked={pendingIds.has(s.id)} onToggle={() => toggleSession(s.id)} />
                      ))}
                    </div>
                  )}
                  {filteredSaved.length > 0 && (
                    <div>
                      {filteredOwn.length > 0 && (
                        <div className="mx-6 my-2 h-px" style={{ background: 'var(--color-border)' }} />
                      )}
                      <p
                        className="px-6 pb-1 text-xs font-semibold tracking-widest uppercase"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)', opacity: 0.6 }}
                      >
                        Saved Chronicles
                      </p>
                      {filteredSaved.map(s => (
                        <SessionRow key={s.id} session={s} checked={pendingIds.has(s.id)} onToggle={() => toggleSession(s.id)} />
                      ))}
                    </div>
                  )}
                </>
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

function SessionRow({ session, checked, onToggle }: { session: PickableSession; checked: boolean; onToggle: () => void }) {
  return (
    <label
      className="flex items-center gap-3 px-6 py-2.5 cursor-pointer transition-colors"
      style={{ background: checked ? 'rgba(200,145,58,0.06)' : 'transparent' }}
      onMouseEnter={e => { if (!checked) e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
      onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent' }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="shrink-0"
        style={{ accentColor: 'var(--color-gold)', width: '15px', height: '15px' }}
      />
      <div className="flex flex-col min-w-0">
        <span className="text-sm leading-snug truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
          {session.title}
        </span>
        {session.campaigns?.name && (
          <span className="text-xs" style={{ color: 'var(--color-gold)', opacity: 0.8 }}>{session.campaigns.name}</span>
        )}
      </div>
    </label>
  )
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
