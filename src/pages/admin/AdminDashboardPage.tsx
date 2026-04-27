import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import AppHeader from '../../components/AppHeader'

interface AdminStats {
  total_users: number
  total_chronicles: number
}

function StatCard({ label, value, icon }: { label: string; value: number | undefined; icon: React.ReactNode }) {
  return (
    <div
      className="rounded-xl px-6 py-6 flex flex-col gap-3"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
    >
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-surface-raised)', color: 'var(--color-gold)' }}
      >
        {icon}
      </div>
      <div>
        <div
          className="text-3xl font-semibold tracking-wide"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
        >
          {value ?? '—'}
        </div>
        <div
          className="text-xs font-semibold tracking-widest uppercase mt-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
        >
          {label}
        </div>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_stats')
      if (error) throw error
      return data as AdminStats
    },
  })

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-surface-raised)', color: 'var(--color-gold)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7l9 5 9-5-9-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M3 12l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
              <path d="M3 17l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h1
              className="text-2xl font-semibold tracking-wide"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
            >
              Admin Dashboard
            </h1>
            <p className="text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
              Platform overview
            </p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div
            className="rounded-xl px-5 py-4 text-sm"
            style={{ background: 'rgba(224,112,112,0.1)', border: '1px solid rgba(224,112,112,0.3)', color: '#e07070' }}
          >
            {(error as Error).message}
          </div>
        )}

        {/* Stats */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StatCard
              label="Total Users"
              value={stats?.total_users}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M2 21c0-4 3.1-7 7-7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="17" cy="9" r="3" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M14 21c0-3 1.8-5 4-5h0c2.2 0 4 2 4 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              }
            />
            <StatCard
              label="Total Chronicles"
              value={stats?.total_chronicles}
              icon={
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.6"/>
                </svg>
              }
            />
          </div>
        )}

        {/* Nav to users list */}
        <div
          className="rounded-xl px-6 py-5 flex items-center justify-between cursor-pointer transition-colors group"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          onClick={() => navigate('/admin/users')}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'var(--color-surface-raised)', color: 'var(--color-parchment-muted)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
                <path d="M2 21c0-4 3.1-7 7-7h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <path d="M17 13v8M13 17h8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <p
                className="text-sm font-semibold tracking-wide"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                Users
              </p>
              <p className="text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
                View all users and their stats
              </p>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-parchment-muted)' }}>
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </main>
    </div>
  )
}
