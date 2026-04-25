import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

interface SavedItem {
  id: number
  session_public_id: string
  note: string | null
  saved_at: string
  sessionTitle?: string
  sessionTldr?: string | null
  campaignName?: string | null
  creatorName?: string | null
}

const inputStyle = {
  background: 'var(--color-ink-soft)',
  border: '1px solid var(--color-border)',
  color: 'var(--color-parchment)',
  fontFamily: 'var(--font-body)',
}

export default function SavedPage() {
  const { user } = useAuth()

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')

  const { data: items = [], isLoading } = useQuery<SavedItem[]>({
    queryKey: ['saved_sessions', user?.id],
    queryFn: async () => {
      const { data: savedData } = await supabase
        .from('saved_sessions')
        .select('id, session_public_id, note, saved_at')
        .eq('user_id', user!.id)
        .order('saved_at', { ascending: false })

      if (!savedData || savedData.length === 0) return []

      const publicIds = savedData.map((s: { session_public_id: string }) => s.session_public_id)

      const { data: sessionsData } = await supabase
        .from('sessions')
        .select('public_id, title, tldr, user_id, campaigns(name)')
        .in('public_id', publicIds)

      const profileIds = [...new Set((sessionsData ?? []).map((s: { user_id: string }) => s.user_id))]
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name')
        .in('id', profileIds)

      const sessionMap = new Map((sessionsData ?? []).map((s: {
        public_id: string; title: string; tldr: string | null
        user_id: string; campaigns: { name: string }[] | null
      }) => [s.public_id, s]))
      const profileMap = new Map((profilesData ?? []).map((p: { id: string; display_name: string }) => [p.id, p.display_name]))

      return savedData.map((saved: { id: number; session_public_id: string; note: string | null; saved_at: string }) => {
        const session = sessionMap.get(saved.session_public_id)
        return {
          ...saved,
          sessionTitle: session?.title,
          sessionTldr: session?.tldr,
          campaignName: session?.campaigns?.[0]?.name ?? null,
          creatorName: session ? (profileMap.get(session.user_id) ?? null) : null,
        }
      })
    },
    enabled: !!user,
  })

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('saved_sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_sessions', user?.id] })
    },
  })

  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, note }: { id: number; note: string | null }) => {
      const { error } = await supabase
        .from('saved_sessions')
        .update({ note })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved_sessions', user?.id] })
      setEditingId(null)
    },
  })

  const handleEditNote = (id: number) => {
    updateNoteMutation.mutate({ id, note: editNote.trim() || null })
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
        <h1
          className="text-lg sm:text-xl font-semibold tracking-wide"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
        >
          Saved Chronicles
        </h1>

        {isLoading && (
          <div className="flex justify-center py-16">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {!isLoading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center text-center gap-4 py-20">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>No saved chronicles yet. Save sessions shared with you to find them here.</p>
          </div>
        )}

        {!isLoading && items.length > 0 && (
          <div className="flex flex-col gap-3">
            {items.map(item => (
              <div
                key={item.id}
                className="rounded-xl px-5 py-4 flex flex-col gap-2"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <a
                    href={`/s/${item.session_public_id}`}
                    className="font-semibold leading-snug hover:underline"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold-light)' }}
                  >
                    {item.sessionTitle ?? item.session_public_id}
                  </a>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setEditingId(item.id); setEditNote(item.note ?? '') }}
                      className="cursor-pointer transition-opacity hover:opacity-100"
                      style={{ color: 'var(--color-parchment-muted)', opacity: 0.6 }}
                      title="Edit note"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <button
                      onClick={() => removeMutation.mutate(item.id)}
                      disabled={removeMutation.isPending}
                      className="cursor-pointer transition-opacity hover:opacity-100 disabled:opacity-30"
                      style={{ color: 'var(--color-parchment-muted)', opacity: 0.6 }}
                      title="Remove from saved"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                </div>

                {item.campaignName && (
                  <p className="text-xs" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', opacity: 0.8 }}>{item.campaignName}</p>
                )}

                {item.sessionTldr && (
                  <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--color-parchment-muted)' }}>{item.sessionTldr}</p>
                )}

                {editingId === item.id ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <textarea
                      value={editNote}
                      onChange={e => setEditNote(e.target.value)}
                      autoFocus
                      rows={2}
                      placeholder="Add a note…"
                      className="w-full px-3 py-2 rounded-lg text-sm focus:outline-none resize-none"
                      style={inputStyle}
                      onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditNote(item.id)}
                        disabled={updateNoteMutation.isPending}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                        style={{ fontFamily: 'var(--font-display)', background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)', color: '#0c0a14', border: '1px solid var(--color-gold-dim)' }}
                      >
                        {updateNoteMutation.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={updateNoteMutation.isPending}
                        className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer disabled:opacity-40"
                        style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : item.note ? (
                  <p
                    className="text-xs italic px-3 py-2 rounded-lg"
                    style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
                  >
                    "{item.note}"
                  </p>
                ) : null}

                <p className="text-xs" style={{ color: 'var(--color-border-bright)' }}>
                  {item.creatorName && <>By {item.creatorName} · </>}
                  Saved {fmt(item.saved_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
