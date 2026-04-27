import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { apiPost } from '../lib/api'
import { TONES } from '../lib/tones'
import CampaignSelect from '../components/CampaignSelect'
import AppHeader from '../components/AppHeader'
import { useDraft, formatDraftAge, type DraftData } from '../hooks/useDraft'

interface Session {
  id: number
  user_id: string
  title: string
  campaign_id: number | null
  campaigns: { name: string; notes: string | null } | null
  tldr: string | null
  prompt: string | null
  tone: string | null
  generated_text: string | null
  cover_image_url: string | null
  image_prompt: string | null
  created_at: string
  updated_at: string
}

interface PendingRegen {
  title: string
  campaignId: number | null
  prompt: string
  toneId: string | null
  tldr: string
  story: string
}

const inputStyle = {
  background: 'var(--color-ink-soft)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-parchment)',
  fontFamily: 'var(--font-body)',
}

export default function SessionPage() {
  const { public_id } = useParams<{ public_id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromGroup = (location.state as { fromGroup?: { public_id: string; title: string } } | null)?.fromGroup
  const { user, session: authSession } = useAuth()
  const { profile } = useProfile()

  const [copied, setCopied] = useState(false)

  // unified edit view
  const [showEdit, setShowEdit] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editCampaignId, setEditCampaignId] = useState<number | null>(null)
  const [editTab, setEditTab] = useState<'notes' | 'chronicle'>('notes')
  const [editPromptValue, setEditPromptValue] = useState('')
  const [editFillGaps, setEditFillGaps] = useState(false)
  const [editToneId, setEditToneId] = useState<string | null>(null)
  const [editTextValue, setEditTextValue] = useState('')
  const [editError, setEditError] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [regenError, setRegenError] = useState('')
  const [generatingImage, setGeneratingImage] = useState(false)
  const [imageError, setImageError] = useState('')
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageExtraNotes, setImageExtraNotes] = useState('')
  const [imgToggleCampaignName, setImgToggleCampaignName] = useState(true)
  const [imgToggleTitle, setImgToggleTitle] = useState(true)
  const [imgToggleCampaignNotes, setImgToggleCampaignNotes] = useState(true)
  const [imgToggleCharacters, setImgToggleCharacters] = useState(true)
  const [imgToggleTone, setImgToggleTone] = useState(true)
  const [imageModalChars, setImageModalChars] = useState<{ name: string; notes?: string | null }[]>([])
  const [imageModalCharsLoading, setImageModalCharsLoading] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // regen confirmation
  const [pendingRegen, setPendingRegen] = useState<PendingRegen | null>(null)

  // add to group
  const [showGroupModal, setShowGroupModal] = useState(false)
  const [userGroups, setUserGroups] = useState<{ id: number; title: string }[]>([])
  const [sessionGroupIds, setSessionGroupIds] = useState<Set<number>>(new Set())
  const [pendingGroupIds, setPendingGroupIds] = useState<Set<number>>(new Set())
  const [groupModalLoading, setGroupModalLoading] = useState(false)
  const [groupSaving, setGroupSaving] = useState(false)

  // Autosave edit draft while editing
  const sessionQueryKey = ['session', public_id] as const

  const { data: session, isLoading, isError } = useQuery<Session>({
    queryKey: sessionQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('id, user_id, title, campaign_id, campaigns(name, notes), tldr, prompt, tone, generated_text, cover_image_url, image_prompt, created_at, updated_at')
        .eq('public_id', public_id)
        .single()
      if (error || !data) throw new Error('Not found')
      return data as unknown as Session
    },
  })

  const { draft, saveDraft, clearDraft } = useDraft(user, session?.id ?? undefined)

  // Autosave edit draft while editing
  useEffect(() => {
    if (!showEdit) return
    if (!editTitle && !editPromptValue) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      saveDraft({ title: editTitle, campaign_id: editCampaignId, prompt: editPromptValue, fill_gaps: editFillGaps, tone: editToneId })
    }, 1500)
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [showEdit, editTitle, editCampaignId, editPromptValue, editFillGaps, editToneId, saveDraft])

  // Redirect non-owners to public share page
  useEffect(() => {
    if (session && user && session.user_id !== user.id) {
      navigate(`/s/${public_id}`, { replace: true })
    }
  }, [session, user, public_id, navigate])

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const { error } = await supabase.from('sessions').update(payload).eq('public_id', public_id)
      if (error) throw error
    },
    onSuccess: () => {
      clearDraft()
      queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['session_public', public_id] })
      setShowEdit(false)
    },
    onError: (err) => {
      setEditError(err instanceof Error ? err.message : 'Save failed.')
    },
  })

  const openEdit = () => {
    if (!session) return
    setEditTitle(session.title)
    setEditCampaignId(session.campaign_id)
    setEditPromptValue(session.prompt ?? '')
    setEditTextValue(session.generated_text ?? '')
    setEditFillGaps(false)
    setEditToneId(session.tone ?? null)
    setEditTab('notes')
    setEditError('')
    setRegenError('')
    const draftIsNewer = draft && new Date(draft.updated_at) > new Date(session.updated_at)
    setShowDraftBanner(!!draftIsNewer)
    setShowEdit(true)
  }

  const restoreDraft = (d: DraftData) => {
    setEditTitle(d.title)
    setEditCampaignId(d.campaign_id)
    setEditPromptValue(d.prompt)
    setEditFillGaps(d.fill_gaps)
    setEditToneId(d.tone)
    setShowDraftBanner(false)
  }

  const handleRegenerate = async () => {
    if (!editPromptValue.trim()) return
    setRegenerating(true)
    setRegenError('')
    try {
      const result = await apiPost<{ tldr: string; story: string; inks: number }>('/api/regenerate-session', authSession, {
        publicId: public_id,
        campaignId: editCampaignId,
        prompt: editPromptValue.trim(),
        fillGaps: editFillGaps,
        toneId: editToneId,
      })
      queryClient.setQueryData(['profile', user?.id], (old: typeof profile) =>
        old ? { ...old, inks: result.inks } : old
      )
      setPendingRegen({
        title: editTitle.trim(),
        campaignId: editCampaignId,
        prompt: editPromptValue.trim(),
        toneId: editToneId,
        tldr: result.tldr,
        story: result.story,
      })
      setShowEdit(false)
    } catch (error) {
      setRegenError(error instanceof Error ? error.message : 'Generation failed. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  const openImageModal = async () => {
    setImageExtraNotes(session?.image_prompt ?? '')
    setImgToggleCampaignName(true)
    setImgToggleTitle(true)
    setImgToggleCampaignNotes(true)
    setImgToggleCharacters(true)
    setImgToggleTone(true)
    setImageError('')
    setShowImageModal(true)
    if (session?.campaign_id) {
      setImageModalCharsLoading(true)
      const { data: chars } = await supabase
        .from('campaign_characters')
        .select('name, notes')
        .eq('campaign_id', session.campaign_id)
        .order('sort_order')
      setImageModalChars(((chars ?? []) as { name: string; notes?: string | null }[]).filter(c => c.name.trim()))
      setImageModalCharsLoading(false)
    } else {
      setImageModalChars([])
    }
  }

  const handleGenerateImage = async () => {
    if (!session || !user) return
    setGeneratingImage(true)
    setImageError('')
    try {
      const result = await apiPost<{ publicUrl: string; inks: number }>('/api/generate-session-image', authSession, {
        publicId: public_id,
        extraNotes: imageExtraNotes,
        includeCampaignName: imgToggleCampaignName,
        includeTitle: imgToggleTitle,
        includeCampaignNotes: imgToggleCampaignNotes,
        includeCharacters: imgToggleCharacters,
        includeTone: imgToggleTone,
      })
      queryClient.setQueryData(['profile', user?.id], (old: typeof profile) =>
        old ? { ...old, inks: result.inks } : old
      )
      queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      setShowImageModal(false)
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Image generation failed. Please try again.')
    } finally {
      setGeneratingImage(false)
    }
  }

  const handleSaveChanges = () => {
    if (!editTitle.trim()) return
    const payload: Record<string, unknown> =
      editTab === 'chronicle'
        ? { title: editTitle.trim(), campaign_id: editCampaignId, generated_text: editTextValue }
        : { title: editTitle.trim(), campaign_id: editCampaignId }
    saveMutation.mutate(payload)
  }

  const confirmRegenMutation = useMutation({
    mutationFn: async (regen: PendingRegen) => {
      const { error } = await supabase
        .from('sessions')
        .update({
          title: regen.title,
          campaign_id: regen.campaignId,
          prompt: regen.prompt,
          tone: regen.toneId,
          tldr: regen.tldr,
          generated_text: regen.story,
        })
        .eq('public_id', public_id)
      if (error) throw error
    },
    onSuccess: () => {
      clearDraft()
      queryClient.invalidateQueries({ queryKey: sessionQueryKey })
      queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['session_public', public_id] })
      setPendingRegen(null)
    },
  })

  const openGroupModal = async () => {
    if (!session || !user) return
    setGroupModalLoading(true)
    setShowGroupModal(true)
    const [{ data: groups }, { data: memberships }] = await Promise.all([
      supabase.from('session_groups').select('id, title').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('group_sessions').select('group_id').eq('session_id', session.id),
    ])
    const currentIds = new Set((memberships ?? []).map((m: { group_id: number }) => m.group_id))
    setUserGroups(groups ?? [])
    setSessionGroupIds(currentIds)
    setPendingGroupIds(new Set(currentIds))
    setGroupModalLoading(false)
  }

  const toggleGroup = (id: number) => {
    setPendingGroupIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSaveGroups = async () => {
    if (!session) return
    setGroupSaving(true)
    const toAdd = [...pendingGroupIds].filter(id => !sessionGroupIds.has(id))
    const toRemove = [...sessionGroupIds].filter(id => !pendingGroupIds.has(id))
    await Promise.all([
      toAdd.length > 0
        ? supabase.from('group_sessions').insert(toAdd.map(gid => ({ group_id: gid, session_id: session.id })))
        : Promise.resolve(),
      ...toRemove.map(gid =>
        supabase.from('group_sessions').delete().eq('group_id', gid).eq('session_id', session.id)
      ),
    ])
    // Invalidate any open group pages so their session lists refresh
    queryClient.invalidateQueries({ queryKey: ['group'] })
    setSessionGroupIds(new Set(pendingGroupIds))
    setGroupSaving(false)
    setShowGroupModal(false)
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/s/${public_id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
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
            <p style={{ color: 'var(--color-parchment-muted)' }}>This chronicle could not be found.</p>
          </div>
        )}

        {/* ── Edit view ── */}
        {session && showEdit && (
          <div className="flex flex-col gap-6">
            {showDraftBanner && draft && (
              <div
                className="flex items-center justify-between px-4 py-2.5 rounded-lg text-xs"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-gold-dim)', color: 'var(--color-parchment-muted)' }}
              >
                <span style={{ fontFamily: 'var(--font-display)' }}>
                  Unsaved draft from {formatDraftAge(draft.updated_at)}
                </span>
                <div className="flex items-center gap-3 ml-4">
                  <button
                    type="button"
                    onClick={() => restoreDraft(draft)}
                    className="font-semibold cursor-pointer hover:opacity-70 transition-opacity"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => { clearDraft(); setShowDraftBanner(false) }}
                    className="cursor-pointer hover:opacity-70 transition-opacity underline"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            <div>
              <h1
                className="text-2xl font-semibold tracking-wide mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                Edit Session
              </h1>
              <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>
                Update the title, campaign, notes, or chronicle.
              </p>
            </div>

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
                Campaign <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <CampaignSelect value={editCampaignId} onChange={setEditCampaignId} />
            </div>

            <div
              className="flex rounded-lg p-1 gap-1"
              style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
            >
              {(['notes', 'chronicle'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setEditTab(tab)}
                  className="flex-1 py-2 rounded-md text-xs font-semibold tracking-widest uppercase transition-colors cursor-pointer"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: editTab === tab ? 'var(--color-surface-raised)' : 'transparent',
                    color: editTab === tab ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
                    border: editTab === tab ? '1px solid var(--color-border-bright)' : '1px solid transparent',
                  }}
                >
                  {tab === 'notes' ? 'Session Notes' : 'Chronicle'}
                </button>
              ))}
            </div>

            {editTab === 'notes' && (
              <div className="flex flex-col gap-4">
                <textarea
                  value={editPromptValue}
                  onChange={e => setEditPromptValue(e.target.value)}
                  rows={12}
                  className="px-4 py-3 rounded-lg text-sm leading-relaxed resize-y focus:outline-none"
                  style={{ ...inputStyle, minHeight: '220px' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={editFillGaps}
                    disabled={regenerating}
                    onClick={() => setEditFillGaps(v => !v)}
                    className="relative shrink-0 rounded-full transition-colors cursor-pointer disabled:opacity-50"
                    style={{ width: '36px', height: '20px', background: editFillGaps ? 'var(--color-gold)' : 'var(--color-border-bright)' }}
                  >
                    <span
                      className="absolute top-0.5 rounded-full transition-transform"
                      style={{ width: '16px', height: '16px', background: editFillGaps ? '#0c0a14' : 'var(--color-ink)', transform: editFillGaps ? 'translateX(18px)' : 'translateX(2px)' }}
                    />
                  </button>
                  <span className="text-sm" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}>Fill the gaps</span>
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
                      const active = editToneId === tone.id
                      return (
                        <button
                          key={tone.id}
                          type="button"
                          disabled={regenerating}
                          onClick={() => setEditToneId(active ? null : tone.id)}
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
                {regenError && <p className="text-xs" style={{ color: '#e07070' }}>{regenError}</p>}
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating || !editPromptValue.trim() || (profile !== null && profile.inks < 1)}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)', boxShadow: '0 0 20px rgba(200,145,58,0.2)' }}
                  >
                    {regenerating && (
                      <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.3)" strokeWidth="3" />
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#0c0a14" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                    )}
                    {regenerating ? 'Generating…' : 'Regenerate Chronicle'}
                  </button>
                  <InkCost amount={1} insufficient={profile !== null && profile.inks < 1} />
                </div>
              </div>
            )}

            {editTab === 'chronicle' && (
              <textarea
                value={editTextValue}
                onChange={e => setEditTextValue(e.target.value)}
                rows={16}
                className="px-4 py-3 rounded-lg text-sm leading-relaxed resize-y focus:outline-none"
                style={{ ...inputStyle, minHeight: '280px' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              />
            )}

            {editError && <p className="text-xs" style={{ color: '#e07070' }}>{editError}</p>}

            {draft && !showDraftBanner && (
              <p className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
                Draft autosaved · {formatDraftAge(draft.updated_at)}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saveMutation.isPending || !editTitle.trim()}
                className="px-6 py-2.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40 transition-colors"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)', color: 'var(--color-parchment)' }}
              >
                {saveMutation.isPending ? 'Saving…' : editTab === 'chronicle' ? 'Save Changes' : 'Save Title & Campaign'}
              </button>
              <button
                type="button"
                onClick={() => { clearDraft(); setShowEdit(false) }}
                disabled={saveMutation.isPending || regenerating}
                className="px-6 py-2.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ── Session view ── */}
        {session && !showEdit && (
          <div className="flex flex-col gap-8">
            {/* Action bar */}
            <div className="flex justify-end gap-2">
              {!session.cover_image_url && (
                <button
                  onClick={openImageModal}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-colors cursor-pointer"
                  style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
                    <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span className="hidden sm:inline">Scene Image</span>
                </button>
              )}
              <button
                onClick={openGroupModal}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-colors cursor-pointer"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <line x1="8" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <line x1="8" y1="18" x2="21" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="3" cy="6" r="1.5" fill="currentColor"/>
                  <circle cx="3" cy="12" r="1.5" fill="currentColor"/>
                  <circle cx="3" cy="18" r="1.5" fill="currentColor"/>
                </svg>
                <span className="hidden sm:inline">Groups</span>
              </button>
              <button
                onClick={openEdit}
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
            </div>
            {session.cover_image_url && (
              <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                <img
                  src={session.cover_image_url}
                  alt="Session cover"
                  className="w-full object-cover"
                  style={{ maxHeight: '400px' }}
                />
                <button
                  onClick={openImageModal}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer transition-opacity"
                  style={{ fontFamily: 'var(--font-display)', background: 'rgba(12,10,20,0.75)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(6px)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(12,10,20,0.9)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(12,10,20,0.75)')}
                  title="Edit scene image"
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span className="hidden sm:inline">Edit</span>
                </button>
              </div>
            )}

            {fromGroup && (
              <Link
                to={`/g/${fromGroup.public_id}`}
                className="flex items-center gap-1.5 -mb-4 w-fit transition-opacity hover:opacity-70"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none' }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                  <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {fromGroup.title}
              </Link>
            )}
            <div>
              {session.campaigns?.name && (
                <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                  {session.campaigns.name}
                </p>
              )}
              <h1
                className="text-2xl sm:text-3xl font-semibold tracking-wide mb-3"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                {session.title}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
                Created {fmt(session.created_at)}
                {session.updated_at !== session.created_at && ` · Updated ${fmt(session.updated_at)}`}
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

            {session.generated_text !== null && (
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

      {/* Add to Group modal */}
      {showGroupModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          onClick={() => { if (!groupSaving) setShowGroupModal(false) }}
        >
          <div
            className="relative w-full max-w-sm max-h-[70vh] flex flex-col rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Add to Group</p>
              <button onClick={() => setShowGroupModal(false)} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-4">
              {groupModalLoading ? (
                <div className="flex justify-center py-8">
                  <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
              ) : userGroups.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--color-parchment-muted)' }}>
                  No groups yet.{' '}
                  <a href="/groups" className="underline" style={{ color: 'var(--color-gold)' }}>Create one</a>
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {userGroups.map(g => (
                    <label
                      key={g.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer"
                      style={{ background: pendingGroupIds.has(g.id) ? 'var(--color-surface-raised)' : 'transparent' }}
                    >
                      <input
                        type="checkbox"
                        checked={pendingGroupIds.has(g.id)}
                        onChange={() => toggleGroup(g.id)}
                        style={{ accentColor: 'var(--color-gold)' }}
                      />
                      <span className="text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>{g.title}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-2 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={handleSaveGroups}
                disabled={groupSaving || groupModalLoading || userGroups.length === 0}
                className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
              >
                {groupSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => setShowGroupModal(false)}
                disabled={groupSaving}
                className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image generation modal */}
      {showImageModal && session && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
          onClick={() => { if (!generatingImage) setShowImageModal(false) }}
        >
          <div
            className="relative w-full max-w-lg max-h-[90vh] flex flex-col rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Scene Image</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-parchment-muted)' }}>
                  {session.cover_image_url ? 'Regenerate the scene illustration' : 'Generate a scene illustration'}
                </p>
              </div>
              <button
                onClick={() => setShowImageModal(false)}
                disabled={generatingImage}
                className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer disabled:opacity-40 transition-opacity hover:opacity-60"
                style={{ color: 'var(--color-parchment-muted)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">
              {/* Current image preview */}
              {session.cover_image_url && (
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                  <img
                    src={session.cover_image_url}
                    alt="Current scene"
                    className="w-full object-cover"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}

              {/* Context toggles */}
              <div className="flex flex-col">
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
                  Include in prompt
                </p>
                {[
                  { label: 'Campaign name', value: imgToggleCampaignName, set: setImgToggleCampaignName, available: !!session.campaigns?.name, hint: session.campaigns?.name },
                  { label: 'Session title', value: imgToggleTitle, set: setImgToggleTitle, available: !!session.title, hint: session.title },
                  { label: 'Campaign notes', value: imgToggleCampaignNotes, set: setImgToggleCampaignNotes, available: !!session.campaigns?.notes, hint: null },
                  { label: 'Characters', value: imgToggleCharacters, set: setImgToggleCharacters, available: !imageModalCharsLoading && (imageModalChars.length > 0 || !!session.campaign_id), hint: imageModalCharsLoading ? 'Loading…' : imageModalChars.length > 0 ? imageModalChars.map(c => c.name).join(', ') : null },
                  { label: 'Session tone', value: imgToggleTone, set: setImgToggleTone, available: !!session.tone, hint: TONES.find(t => t.id === session.tone)?.label ?? null },
                ].map(({ label, value, set, available, hint }, i, arr) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-3 py-3"
                    style={{
                      opacity: available ? 1 : 0.4,
                      borderBottom: i < arr.length - 1 ? '1px solid var(--color-border)' : undefined,
                    }}
                  >
                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                      <span className="text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>{label}</span>
                      {hint && (
                        <span className="text-xs truncate" style={{ color: 'var(--color-parchment-muted)' }}>{hint}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={value && available}
                      disabled={!available || generatingImage}
                      onClick={() => set(v => !v)}
                      className="relative shrink-0 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed overflow-hidden"
                      style={{ width: '36px', height: '20px', background: value && available ? 'var(--color-gold)' : 'var(--color-border-bright)' }}
                    >
                      <span
                        className="absolute top-0.5 left-0 rounded-full transition-transform"
                        style={{ width: '16px', height: '16px', background: value && available ? '#0c0a14' : 'var(--color-ink)', transform: value && available ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                  </div>
                ))}
              </div>

              {/* Extra notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
                  Extra notes <span style={{ color: 'var(--color-mist)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
                </label>
                <textarea
                  value={imageExtraNotes}
                  onChange={e => setImageExtraNotes(e.target.value)}
                  disabled={generatingImage}
                  rows={3}
                  placeholder="e.g. Focus on the dragon, dramatic lighting, dusk sky…"
                  className="px-3 py-2.5 rounded-lg text-sm leading-relaxed resize-none focus:outline-none disabled:opacity-50"
                  style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)', color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
              </div>

              {imageError && (
                <p className="text-xs" style={{ color: '#e07070' }}>{imageError}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col gap-2 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGenerateImage}
                  disabled={generatingImage || (profile !== null && profile.inks < 3)}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
                >
                  {generatingImage ? (
                    <>
                      <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="rgba(0,0,0,0.3)" strokeWidth="3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" stroke="#0c0a14" strokeWidth="3" strokeLinecap="round"/>
                      </svg>
                      Painting the scene…
                    </>
                  ) : (
                    session.cover_image_url ? 'Regenerate' : 'Generate'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowImageModal(false)}
                  disabled={generatingImage}
                  className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                >
                  Cancel
                </button>
              </div>
              <InkCost amount={3} insufficient={profile !== null && profile.inks < 3} />
            </div>
          </div>
        </div>
      )}

      {/* Regeneration confirmation modal */}
      {pendingRegen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="relative w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl shadow-2xl"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
          >
            <div className="px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>New Chronicle Generated</p>
              <p className="text-sm mt-1" style={{ color: 'var(--color-parchment-muted)' }}>Replace the existing summary and chronicle with the new version?</p>
            </div>
            <div className="overflow-y-auto px-6 py-5 flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>New Summary</p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--color-parchment)' }}>{pendingRegen.tldr}</p>
              </div>
              <div>
                <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>New Chronicle</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap line-clamp-6" style={{ color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}>{pendingRegen.story}</p>
              </div>
            </div>
            <div className="flex gap-2 px-6 py-4 shrink-0" style={{ borderTop: '1px solid var(--color-border)' }}>
              <button
                onClick={() => confirmRegenMutation.mutate(pendingRegen)}
                disabled={confirmRegenMutation.isPending}
                className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
              >
                {confirmRegenMutation.isPending ? 'Saving…' : 'Replace'}
              </button>
              <button
                onClick={() => setPendingRegen(null)}
                disabled={confirmRegenMutation.isPending}
                className="px-5 py-2 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
              >
                Discard
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

function InkCost({ amount, insufficient }: { amount: number; insufficient: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: insufficient ? '#e07070' : 'var(--color-gold)', flexShrink: 0 }}>
        <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
      <span className="text-xs" style={{ fontFamily: 'var(--font-display)', color: insufficient ? '#e07070' : 'var(--color-parchment-muted)', letterSpacing: '0.04em' }}>
        {insufficient ? 'Not enough ink' : `Costs ${amount} ink`}
      </span>
    </div>
  )
}
