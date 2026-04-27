import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { queryClient } from '../../lib/queryClient'
import AppHeader from '../../components/AppHeader'

interface UserStat {
  id: string
  email: string
  display_name: string | null
  is_admin: boolean
  inks: number
  chronicles_count: number
  saved_count: number
  groups_count: number
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="text-xs font-semibold tracking-widest uppercase px-2 py-0.5 rounded-full"
      style={{
        fontFamily: 'var(--font-display)',
        background: 'rgba(200,145,58,0.15)',
        color: 'var(--color-gold)',
        border: '1px solid rgba(200,145,58,0.3)',
      }}
    >
      {children}
    </span>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
        {value}
      </span>
      <span className="text-xs tracking-wide uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)', fontSize: '0.6rem', letterSpacing: '0.08em' }}>
        {label}
      </span>
    </div>
  )
}

function InkEditor({ userId, currentInks }: { userId: string; currentInks: number }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(String(currentInks))

  const mutation = useMutation({
    mutationFn: async (amount: number) => {
      const { error } = await supabase.rpc('admin_set_user_inks', {
        target_user_id: userId,
        new_amount: amount,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setEditing(false)
    },
  })

  const handleSave = () => {
    const parsed = parseInt(value, 10)
    if (isNaN(parsed) || parsed < 0) return
    mutation.mutate(parsed)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') { setValue(String(currentInks)); setEditing(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-gold)', flexShrink: 0 }}>
          <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
        </svg>
        <input
          type="number"
          min="0"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKey}
          autoFocus
          className="w-14 px-1.5 py-0.5 rounded text-xs text-center focus:outline-none"
          style={{ background: 'var(--color-ink-soft)', border: '1px solid var(--color-gold-dim)', color: 'var(--color-parchment)', fontFamily: 'var(--font-display)' }}
        />
        <button
          onClick={handleSave}
          disabled={mutation.isPending}
          className="flex items-center justify-center w-5 h-5 rounded cursor-pointer disabled:opacity-40"
          style={{ background: 'var(--color-gold-dim)', color: '#0c0a14' }}
          title="Save"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={() => { setValue(String(currentInks)); setEditing(false) }}
          className="flex items-center justify-center w-5 h-5 rounded cursor-pointer"
          style={{ background: 'var(--color-surface-raised)', color: 'var(--color-parchment-muted)', border: '1px solid var(--color-border)' }}
          title="Cancel"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => { setValue(String(currentInks)); setEditing(true) }}
      className="flex items-center gap-1.5 group cursor-pointer"
      title="Click to edit"
    >
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-gold)', flexShrink: 0 }}>
        <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
      </svg>
      <span className="text-sm font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
        {currentInks}
      </span>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--color-parchment-muted)' }}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  )
}

export default function AdminUsersPage() {
  const navigate = useNavigate()

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_users_with_stats')
      if (error) throw error
      return data as UserStat[]
    },
  })

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 cursor-pointer transition-colors"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            title="Back to Admin"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-semibold tracking-wide" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
              Users
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
              {users ? `${users.length} registered` : 'Loading…'}
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl px-5 py-4 text-sm" style={{ background: 'rgba(224,112,112,0.1)', border: '1px solid rgba(224,112,112,0.3)', color: '#e07070' }}>
            {(error as Error).message}
          </div>
        )}

        {/* Table header */}
        {!isLoading && users && users.length > 0 && (
          <div
            className="hidden sm:grid items-center px-5 gap-4"
            style={{ gridTemplateColumns: '1fr 100px repeat(3, 72px)', color: 'var(--color-parchment-muted)', fontSize: '0.6rem', fontFamily: 'var(--font-display)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
          >
            <span>User</span>
            <span>Ink</span>
            <span className="text-center">Chronicles</span>
            <span className="text-center">Saved</span>
            <span className="text-center">Groups</span>
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        ) : users && users.length > 0 ? (
          <div className="flex flex-col gap-2">
            {users.map(user => (
              <div
                key={user.id}
                className="rounded-xl px-5 py-4 flex flex-col sm:grid sm:items-center gap-3 sm:gap-4"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  gridTemplateColumns: '1fr 100px repeat(3, 72px)',
                }}
              >
                {/* User info */}
                <div className="flex flex-col gap-0.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold truncate" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
                      {user.display_name ?? user.email}
                    </span>
                    {user.is_admin && <Badge>Admin</Badge>}
                  </div>
                  <span className="text-xs truncate" style={{ color: 'var(--color-parchment-muted)' }}>
                    {user.display_name ? user.email : null}
                  </span>
                </div>

                {/* Ink — editable */}
                <div className="flex sm:block">
                  <InkEditor userId={user.id} currentInks={user.inks} />
                </div>

                {/* Stats */}
                <div className="flex sm:contents gap-6">
                  <div className="sm:flex sm:justify-center">
                    <Stat label="Chronicles" value={user.chronicles_count} />
                  </div>
                  <div className="sm:flex sm:justify-center">
                    <Stat label="Saved" value={user.saved_count} />
                  </div>
                  <div className="sm:flex sm:justify-center">
                    <Stat label="Groups" value={user.groups_count} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl px-6 py-12 flex flex-col items-center gap-3 text-center" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>No users found.</p>
          </div>
        )}
      </main>
    </div>
  )
}
