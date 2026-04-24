import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import AppHeader from '../components/AppHeader'

interface Campaign {
  id: number
  name: string
  description: string | null
}

interface Session {
  public_id: string
  title: string
  campaign_id: number | null
  campaigns: { name: string } | null
  tldr: string | null
  created_at: string
  updated_at: string
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()

  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<number | 'all' | 'none'>('all')
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const openEdit = (c: Campaign) => {
    setEditingCampaign(c)
    setEditName(c.name)
    setEditDesc(c.description ?? '')
    setEditError('')
  }

  const handleEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCampaign) return
    setEditError('')
    setEditSaving(true)
    const { error } = await supabase
      .from('campaigns')
      .update({ name: editName.trim(), description: editDesc.trim() || null })
      .eq('id', editingCampaign.id)
    if (error) {
      setEditError(error.message)
    } else {
      setCampaigns(cs =>
        cs.map(c => c.id === editingCampaign.id
          ? { ...c, name: editName.trim(), description: editDesc.trim() || null }
          : c
        ).sort((a, b) => a.name.localeCompare(b.name))
      )
      setEditingCampaign(null)
    }
    setEditSaving(false)
  }

  useEffect(() => {
    supabase
      .from('campaigns')
      .select('id, name, description')
      .eq('user_id', user!.id)
      .order('name')
      .then(({ data }) => {
        setCampaigns(data ?? [])
        setLoadingCampaigns(false)
      })
  }, [])

  useEffect(() => {
    setLoadingSessions(true)
    let query = supabase
      .from('sessions')
      .select('public_id, title, campaign_id, campaigns(name), tldr, created_at, updated_at')
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false })

    if (selectedCampaign === 'none') {
      query = query.is('campaign_id', null)
    } else if (selectedCampaign !== 'all') {
      query = query.eq('campaign_id', selectedCampaign)
    }

    query.then(({ data }) => {
      setSessions((data as unknown as Session[]) ?? [])
      setLoadingSessions(false)
    })
  }, [selectedCampaign])

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    setCreating(true)
    const { data, error } = await supabase
      .from('campaigns')
      .insert({ user_id: user!.id, name: newName.trim(), description: newDesc.trim() || null })
      .select('id, name, description')
      .single()
    if (error) {
      setCreateError(error.message)
    } else {
      setCampaigns(c => [...c, data].sort((a, b) => a.name.localeCompare(b.name)))
      setNewName('')
      setNewDesc('')
      setShowModal(false)
    }
    setCreating(false)
  }

  const isLoading = loadingSessions || loadingCampaigns

  const profileBtn = (
    <button
      onClick={() => navigate('/profile')}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
      style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
      <span className="hidden sm:inline">{profile?.display_name ?? user?.email}</span>
    </button>
  )

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader right={profileBtn} />

      {/* Mobile campaign chips */}
      <div className="md:hidden flex items-center gap-2 px-4 py-3 overflow-x-auto shrink-0" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}>
        <Chip label="All" active={selectedCampaign === 'all'} onClick={() => setSelectedCampaign('all')} />
        {campaigns.map(c => (
          <Chip key={c.id} label={c.name} active={selectedCampaign === c.id} onClick={() => setSelectedCampaign(c.id)} />
        ))}
        {campaigns.length > 0 && (
          <Chip label="Uncategorized" active={selectedCampaign === 'none'} onClick={() => setSelectedCampaign('none')} muted />
        )}
        <button
          onClick={() => { setShowModal(true); setCreateError('') }}
          className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase cursor-pointer"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', border: '1px dashed var(--color-gold-dim)', whiteSpace: 'nowrap' }}
        >
          + Campaign
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        <aside
          className="hidden md:flex w-56 shrink-0 flex-col py-6 px-3 gap-1 overflow-y-auto"
          style={{ borderRight: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}
        >
          <p className="px-3 pb-2 text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
            Campaigns
          </p>
          <SidebarItem label="All Sessions" active={selectedCampaign === 'all'} onClick={() => setSelectedCampaign('all')} />
          {campaigns.map(c => (
            <SidebarItem key={c.id} label={c.name} active={selectedCampaign === c.id} onClick={() => setSelectedCampaign(c.id)} onEdit={() => openEdit(c)} />
          ))}
          {campaigns.length > 0 && (
            <SidebarItem label="Uncategorized" active={selectedCampaign === 'none'} onClick={() => setSelectedCampaign('none')} muted />
          )}
          <div className="mt-auto pt-4">
            <button
              onClick={() => { setShowModal(true); setCreateError('') }}
              className="w-full px-3 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase text-left transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', border: '1px dashed var(--color-gold-dim)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(200,145,58,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              + New Campaign
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto px-4 sm:px-8 py-6 sm:py-8 flex flex-col gap-5 sm:gap-6">

          {/* Title row */}
          <div className="flex items-center justify-between gap-3">
            <h1
              className="text-lg sm:text-xl font-semibold tracking-wide truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
            >
              {selectedCampaign === 'all'
                ? 'All Sessions'
                : selectedCampaign === 'none'
                ? 'Uncategorized'
                : (campaigns.find(c => c.id === selectedCampaign)?.name ?? '')}
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              {/* Edit campaign shortcut on mobile when a specific campaign is selected */}
              {selectedCampaign !== 'all' && selectedCampaign !== 'none' && (
                <button
                  onClick={() => { const c = campaigns.find(x => x.id === selectedCampaign); if (c) openEdit(c) }}
                  className="md:hidden p-2 rounded-lg cursor-pointer"
                  style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                  title="Edit campaign"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
              <button
                onClick={() => navigate('/new')}
                className="px-4 sm:px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                  color: '#0c0a14',
                  border: '1px solid var(--color-gold-dim)',
                  boxShadow: '0 0 16px rgba(200,145,58,0.2)',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(200,145,58,0.4)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(200,145,58,0.2)')}
              >
                + New
              </button>
            </div>
          </div>

          {/* Campaign description */}
          {selectedCampaign !== 'all' && selectedCampaign !== 'none' && (
            (() => {
              const desc = campaigns.find(c => c.id === selectedCampaign)?.description
              return desc ? (
                <p className="text-sm -mt-2" style={{ color: 'var(--color-parchment-muted)' }}>{desc}</p>
              ) : null
            })()
          )}

          {/* Loading */}
          {isLoading && (
            <div className="flex justify-center py-16">
              <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          )}

          {/* Empty state */}
          {!isLoading && sessions.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-20">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--color-gold)" strokeWidth="1.5"/>
                </svg>
              </div>
              <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>No sessions here yet.</p>
            </div>
          )}

          {/* Mobile: session cards */}
          {!isLoading && sessions.length > 0 && (
            <div className="md:hidden flex flex-col gap-3">
              {sessions.map(session => (
                <div
                  key={session.public_id}
                  className="rounded-xl px-4 py-4 flex flex-col gap-2"
                  style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => navigate(`/session/${session.public_id}`)}
                      className="text-left font-semibold leading-snug hover:underline cursor-pointer"
                      style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-light)' }}
                    >
                      {session.title}
                    </button>
                    <div className="flex items-center gap-2 shrink-0 pt-0.5">
                      <button
                        title="Copy share link"
                        onClick={async () => {
                          await navigator.clipboard.writeText(`${window.location.origin}/s/${session.public_id}`)
                          setCopiedId(session.public_id)
                          setTimeout(() => setCopiedId(null), 2000)
                        }}
                        className="cursor-pointer"
                        style={{ color: copiedId === session.public_id ? 'var(--color-gold)' : 'var(--color-parchment-muted)', opacity: 0.7 }}
                      >
                        {copiedId === session.public_id ? (
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
                        title="Open share page"
                        href={`/s/${session.public_id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: 'var(--color-parchment-muted)', opacity: 0.7 }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                          <path d="M15 3h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                      </a>
                    </div>
                  </div>
                  {selectedCampaign === 'all' && session.campaigns?.name && (
                    <p className="text-xs" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', opacity: 0.8 }}>{session.campaigns.name}</p>
                  )}
                  {session.tldr && (
                    <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--color-parchment-muted)' }}>{session.tldr}</p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--color-border-bright)' }}>{fmt(session.created_at)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Desktop: sessions table */}
          {!isLoading && sessions.length > 0 && (
            <div className="hidden md:block rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr style={{ background: 'var(--color-surface-raised)', borderBottom: '1px solid var(--color-border)' }}>
                    {(selectedCampaign === 'all'
                      ? ['Title', 'Campaign', 'Summary', 'Created', 'Updated', '']
                      : ['Title', 'Summary', 'Created', 'Updated', '']
                    ).map(col => (
                      <th
                        key={col}
                        className="px-5 py-3 text-left text-xs font-semibold tracking-widest uppercase"
                        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session, i) => (
                    <tr
                      key={session.public_id}
                      style={{
                        background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-ink-soft)',
                        borderBottom: i < sessions.length - 1 ? '1px solid var(--color-border)' : 'none',
                      }}
                    >
                      <td className="px-5 py-4 align-top w-44">
                        <button
                          onClick={() => navigate(`/session/${session.public_id}`)}
                          className="text-left font-semibold leading-snug hover:underline cursor-pointer transition-opacity hover:opacity-80"
                          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-light)' }}
                        >
                          {session.title}
                        </button>
                      </td>
                      {selectedCampaign === 'all' && (
                        <td className="px-5 py-4 align-top whitespace-nowrap text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
                          {session.campaigns?.name ?? <span style={{ color: 'var(--color-border-bright)' }}>—</span>}
                        </td>
                      )}
                      <td className="px-5 py-4 align-top" style={{ color: 'var(--color-parchment-muted)' }}>
                        <span className="line-clamp-2 leading-relaxed">{session.tldr ?? '—'}</span>
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
                        {fmt(session.created_at)}
                      </td>
                      <td className="px-5 py-4 align-top whitespace-nowrap text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
                        {fmt(session.updated_at)}
                      </td>
                      <td className="px-4 py-4 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            title="Copy share link"
                            onClick={async () => {
                              await navigator.clipboard.writeText(`${window.location.origin}/s/${session.public_id}`)
                              setCopiedId(session.public_id)
                              setTimeout(() => setCopiedId(null), 2000)
                            }}
                            className="transition-opacity cursor-pointer"
                            style={{ color: copiedId === session.public_id ? 'var(--color-gold)' : 'var(--color-parchment-muted)', opacity: 0.7 }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                          >
                            {copiedId === session.public_id ? (
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
                            title="Open share page"
                            href={`/s/${session.public_id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="transition-opacity"
                            style={{ color: 'var(--color-parchment-muted)', opacity: 0.7 }}
                            onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                            onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                              <path d="M15 3h6v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                              <path d="M10 14L21 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                            </svg>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>

      {/* New Campaign modal */}
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
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>New Campaign</p>
              <button onClick={() => setShowModal(false)} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleCreateCampaign} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>Name</label>
                <input
                  type="text"
                  placeholder="Curse of Strahd"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  required
                  autoFocus
                  className="px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)', color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
                  Description <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  placeholder="A gothic horror campaign set in the land of Barovia…"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={3}
                  className="px-4 py-2.5 rounded-lg text-sm focus:outline-none resize-none"
                  style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)', color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
              {createError && <p className="text-xs" style={{ color: '#e07070' }}>{createError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
              >
                {creating ? 'Creating…' : 'Create Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Campaign modal */}
      {editingCampaign && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => setEditingCampaign(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Edit Campaign</p>
              <button onClick={() => setEditingCampaign(null)} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
            </div>
            <form onSubmit={handleEditCampaign} className="px-6 py-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  required
                  autoFocus
                  className="px-4 py-2.5 rounded-lg text-sm focus:outline-none"
                  style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)', color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}
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
                  style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)', color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>
              {editError && <p className="text-xs" style={{ color: '#e07070' }}>{editError}</p>}
              <button
                type="submit"
                disabled={editSaving}
                className="py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
              >
                {editSaving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function Chip({ label, active, onClick, muted }: { label: string; active: boolean; onClick: () => void; muted?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase cursor-pointer transition-colors"
      style={{
        fontFamily: 'var(--font-display)',
        background: active ? 'var(--color-surface-raised)' : 'transparent',
        border: active ? '1px solid var(--color-gold-dim)' : '1px solid var(--color-border)',
        color: active ? 'var(--color-parchment)' : muted ? 'var(--color-mist)' : 'var(--color-parchment-muted)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
}

function SidebarItem({ label, active, onClick, onEdit, muted }: {
  label: string
  active: boolean
  onClick: () => void
  onEdit?: () => void
  muted?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      className="relative flex items-center rounded-lg"
      style={{
        background: active ? 'var(--color-surface-raised)' : hovered ? 'var(--color-surface)' : 'transparent',
        borderLeft: active ? '2px solid var(--color-gold)' : '2px solid transparent',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        onClick={onClick}
        className="flex-1 text-left px-3 py-2 text-sm cursor-pointer"
        style={{
          fontFamily: 'var(--font-display)',
          color: active ? 'var(--color-parchment)' : muted ? 'var(--color-mist)' : 'var(--color-parchment-muted)',
        }}
      >
        {label}
      </button>
      {onEdit && hovered && (
        <button
          onClick={e => { e.stopPropagation(); onEdit() }}
          className="pr-2.5 cursor-pointer transition-opacity hover:opacity-100"
          style={{ color: 'var(--color-parchment-muted)', opacity: 0.6 }}
          title="Edit campaign"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
    </div>
  )
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
