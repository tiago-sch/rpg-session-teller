import { useState } from 'react'
import { useParams, useLocation, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

interface SessionPublicData {
  title: string
  campaign_name: string | null
  tldr: string | null
  generated_text: string | null
  updated_at: string
  creator_name: string | null
  owner_id: string
  savedId: number | null
  savedNote: string | null
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
  const location = useLocation()
  const fromGroup = (location.state as { fromGroup?: { public_id: string; title: string } } | null)?.fromGroup

  const [showSaveModal, setShowSaveModal] = useState(false)
  const [noteInput, setNoteInput] = useState('')

  const queryKey = ['session_public', public_id, user?.id ?? null] as const

  const { data, isLoading, isError } = useQuery<SessionPublicData>({
    queryKey,
    queryFn: async () => {
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('title, campaigns(name), tldr, generated_text, updated_at, user_id')
        .eq('public_id', public_id)
        .single()

      if (error || !sessionData) throw new Error('Not found')

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

      return {
        title: sd.title,
        campaign_name: sd.campaigns?.name ?? null,
        tldr: sd.tldr,
        generated_text: sd.generated_text,
        updated_at: sd.updated_at,
        creator_name: profileData?.display_name ?? null,
        owner_id: sessionData.user_id,
        savedId: savedResult.data?.id ?? null,
        savedNote: savedResult.data?.note ?? null,
      }
    },
  })

  const isOwner = !!user && data?.owner_id === user.id
  const canSave = !!user && !isOwner

  const saveMutation = useMutation({
    mutationFn: async ({ savedId, note }: { savedId: number | null; note: string | null }) => {
      if (savedId) {
        const { error } = await supabase
          .from('saved_sessions')
          .update({ note })
          .eq('id', savedId)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('saved_sessions')
          .insert({ user_id: user!.id, session_public_id: public_id, note })
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['saved_sessions', user?.id] })
      setShowSaveModal(false)
    },
  })

  const unsaveMutation = useMutation({
    mutationFn: async (savedId: number) => {
      const { error } = await supabase.from('saved_sessions').delete().eq('id', savedId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      queryClient.invalidateQueries({ queryKey: ['saved_sessions', user?.id] })
      setShowSaveModal(false)
    },
  })

  const openSaveModal = () => {
    setNoteInput(data?.savedNote ?? '')
    setShowSaveModal(true)
  }

  const saving = saveMutation.isPending || unsaveMutation.isPending

  const headerRight = canSave ? (
    <button
      onClick={openSaveModal}
      className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer"
      style={{
        fontFamily: 'var(--font-display)',
        background: data?.savedId ? 'var(--color-gold-dim)' : 'var(--color-surface-raised)',
        border: `1px solid ${data?.savedId ? 'var(--color-gold)' : 'var(--color-border)'}`,
        color: data?.savedId ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          fill={data?.savedId ? 'currentColor' : 'none'}
        />
      </svg>
      <span className="hidden sm:inline">{data?.savedId ? 'Saved' : 'Save'}</span>
    </button>
  ) : undefined

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader right={headerRight} />

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

        {data && (
          <div className="flex flex-col gap-8">
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
              {data.campaign_name && (
                <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                  {data.campaign_name}
                </p>
              )}
              <h1
                className="text-2xl sm:text-3xl font-semibold tracking-wide mb-3"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                {data.title}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
                {data.creator_name && <>By {data.creator_name} · </>}
                Updated {fmt(data.updated_at)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.6"/>
              </svg>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>

            {data.tldr && (
              <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Summary</p>
                <p className="text-base leading-relaxed" style={{ color: 'var(--color-parchment)' }}>{data.tldr}</p>
              </div>
            )}

            {data.generated_text && (
              <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Chronicle</p>
                <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}>
                  {data.generated_text}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

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
                {data?.savedId ? 'Saved Chronicle' : 'Save Chronicle'}
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
                  onClick={() => saveMutation.mutate({ savedId: data?.savedId ?? null, note: noteInput.trim() || null })}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                  style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
                >
                  {saving ? 'Saving…' : data?.savedId ? 'Update Note' : 'Save'}
                </button>
                {data?.savedId && (
                  <button
                    onClick={() => unsaveMutation.mutate(data.savedId!)}
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
