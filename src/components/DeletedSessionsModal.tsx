import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface DeletedSession {
  id: number
  public_id: string
  title: string
  campaign_name: string | null
  deleted_at: string
}

export default function DeletedSessionsModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [error, setError] = useState('')

  const queryKey = ['deleted-sessions', user?.id]
  const { data: sessions = [], isLoading } = useQuery<DeletedSession[]>({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_deleted_sessions')
      if (error) throw error
      return (data as DeletedSession[]) ?? []
    },
    enabled: !!user,
  })

  const handleRestore = async (id: number) => {
    setError('')
    setRestoringId(id)
    const { error } = await supabase.rpc('restore_session', { p_session_id: id })
    setRestoringId(null)
    if (error) {
      setError('Failed to restore the session.')
      return
    }
    queryClient.setQueryData(queryKey, (old: DeletedSession[] | undefined) => old?.filter(s => s.id !== id))
    queryClient.invalidateQueries({ queryKey: ['sessions', user?.id] })
    queryClient.invalidateQueries({ queryKey: ['campaign-episodes'] })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl shadow-2xl"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border-bright)', boxShadow: '0 0 60px rgba(200,145,58,0.08), 0 24px 48px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Recently deleted</p>
          <button onClick={onClose} className="text-lg leading-none cursor-pointer transition-opacity hover:opacity-60" style={{ color: 'var(--color-parchment-muted)' }}>✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4 flex flex-col gap-3">
          {error && <p className="text-sm" style={{ color: '#e07070' }}>{error}</p>}
          {isLoading ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-parchment-muted)' }}>Loading…</p>
          ) : sessions.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--color-parchment-muted)' }}>No deleted sessions.</p>
          ) : sessions.map(s => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-lg px-4 py-3"
              style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-border)' }}
            >
              <div className="min-w-0">
                <p className="font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>{s.title}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-mist)' }}>
                  {s.campaign_name ? `${s.campaign_name} · ` : ''}
                  Deleted {new Date(s.deleted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button
                onClick={() => handleRestore(s.id)}
                disabled={restoringId !== null}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide cursor-pointer transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ fontFamily: 'var(--font-display)', background: 'var(--color-surface-raised)', border: '1px solid var(--color-gold-dim)', color: 'var(--color-gold-light)' }}
              >
                {restoringId === s.id ? 'Restoring…' : 'Restore'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
