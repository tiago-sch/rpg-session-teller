import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'

const NAV = [
  {
    label: 'Chronicles',
    to: '/dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.6"/>
      </svg>
    ),
    active: (p: string) => p === '/dashboard' || p.startsWith('/session') || p === '/new',
  },
  {
    label: 'Groups',
    to: '/groups',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <rect x="2" y="7" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.6"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    ),
    active: (p: string) => p === '/groups' || p.startsWith('/g/'),
  },
  {
    label: 'Saved',
    to: '/saved',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    active: (p: string) => p === '/saved',
  },
]

export default function AppHeader() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, signOut } = useAuth()
  const { profile } = useProfile()

  useEffect(() => { setOpen(false) }, [location.pathname])

  const navTo = (path: string) => { navigate(path); setOpen(false) }

  const drawerLinkStyle = (active: boolean) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    fontSize: '0.75rem',
    fontFamily: 'var(--font-display)',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    cursor: 'pointer',
    border: 'none',
    background: active ? 'var(--color-surface-raised)' : 'transparent',
    color: active ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
    transition: 'background 0.15s, color 0.15s',
  })

  return (
    <>
      <header
        className="flex items-center px-4 sm:px-6 py-3 shrink-0 gap-3"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}
      >
        {/* Logo */}
        <button
          onClick={() => navTo(user ? '/dashboard' : '/')}
          className="flex items-center gap-2.5 shrink-0 cursor-pointer group"
        >
          <img
            src="/favicon.png"
            alt="RPG Session Teller"
            className="w-7 h-7 rounded-md"
            style={{ imageRendering: 'crisp-edges' }}
          />
          <span
            className="hidden sm:block text-sm font-semibold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            RPG Session Teller
          </span>
        </button>

        {/* ── Desktop: center nav ── */}
        <div className="hidden sm:flex flex-1 justify-center">
          {user && (
            <nav className="flex items-center">
              {NAV.map(link => {
                const isActive = link.active(location.pathname)
                return (
                  <button
                    key={link.to}
                    onClick={() => navigate(link.to)}
                    className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: isActive ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
                      borderBottom: `2px solid ${isActive ? 'var(--color-gold)' : 'transparent'}`,
                      paddingBottom: '0.25rem',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-parchment)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-parchment-muted)' }}
                  >
                    {link.label}
                  </button>
                )
              })}

              {profile?.is_admin && (() => {
                const isActive = location.pathname.startsWith('/admin')
                return (
                  <button
                    onClick={() => navigate('/admin')}
                    className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-colors"
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.7rem',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 600,
                      color: isActive ? 'var(--color-gold)' : 'var(--color-parchment-muted)',
                      borderBottom: `2px solid ${isActive ? 'var(--color-gold)' : 'transparent'}`,
                      paddingBottom: '0.25rem',
                    }}
                    onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-gold)' }}
                    onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--color-parchment-muted)' }}
                  >
                    Admin
                  </button>
                )
              })()}
            </nav>
          )}
        </div>

        {/* ── Desktop: ink balance ── */}
        {user && profile !== null && (
          <button
            onClick={() => navigate('/ink')}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            title="Buy ink"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-gold)', flexShrink: 0 }}>
              <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" fill="none"/>
            </svg>
            <span
              className="text-xs font-semibold tabular-nums"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)', letterSpacing: '0.04em' }}
            >
              {profile.inks}
            </span>
          </button>
        )}

        {/* ── Desktop: profile icon ── */}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors shrink-0"
            style={{
              background: 'var(--color-surface-raised)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-parchment-muted)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
            title="Profile"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        )}

        {/* ── Mobile: spacer + hamburger ── */}
        <div className="flex-1 sm:hidden" />

        <button
          onClick={() => setOpen(v => !v)}
          className="sm:hidden flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-colors shrink-0"
          style={{
            background: open ? 'var(--color-surface-raised)' : 'transparent',
            border: '1px solid var(--color-border)',
            color: 'var(--color-parchment-muted)',
          }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          aria-label="Menu"
        >
          {open ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          )}
        </button>
      </header>

      {/* ── Mobile drawer backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 sm:hidden"
          style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col sm:hidden"
        style={{
          width: '240px',
          background: 'var(--color-ink-soft)',
          borderLeft: '1px solid var(--color-border)',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.2s ease',
        }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-4 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {user ? (
            <div className="flex flex-col gap-0.5 min-w-0">
              <p
                className="text-sm font-semibold truncate"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                {profile?.display_name ?? user.email}
              </p>
              {profile !== null && (
                <div className="flex items-center gap-1 mt-0.5">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-gold)', flexShrink: 0 }}>
                    <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                  </svg>
                  <span className="text-xs tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', fontWeight: 600 }}>
                    {profile.inks} ink
                  </span>
                </div>
              )}
            </div>
          ) : (
            <span
              className="text-sm font-semibold tracking-widest uppercase"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
            >
              Menu
            </span>
          )}
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-7 h-7 rounded-lg cursor-pointer shrink-0 ml-2"
            style={{ border: '1px solid var(--color-border)', color: 'var(--color-parchment-muted)', background: 'transparent' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Drawer nav links */}
        <nav className="flex-1 flex flex-col gap-0.5 p-3 overflow-y-auto">
          {user ? (
            <>
              {NAV.map(link => {
                const active = link.active(location.pathname)
                return (
                  <button
                    key={link.to}
                    onClick={() => navTo(link.to)}
                    style={drawerLinkStyle(active)}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ color: active ? 'var(--color-gold)' : 'inherit' }}>{link.icon}</span>
                    {link.label}
                  </button>
                )
              })}

              <button
                onClick={() => navTo('/ink')}
                style={drawerLinkStyle(location.pathname === '/ink')}
                onMouseEnter={e => { if (location.pathname !== '/ink') (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)' }}
                onMouseLeave={e => { if (location.pathname !== '/ink') (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <span style={{ color: location.pathname === '/ink' ? 'var(--color-gold)' : 'inherit' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                  </svg>
                </span>
                Buy Ink
              </button>

              {profile?.is_admin && (() => {
                const active = location.pathname.startsWith('/admin')
                return (
                  <button
                    onClick={() => navTo('/admin')}
                    style={drawerLinkStyle(active)}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)' }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                  >
                    <span style={{ color: active ? 'var(--color-gold)' : 'inherit' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2L3 7l9 5 9-5-9-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                        <path d="M3 12l9 5 9-5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    Admin
                  </button>
                )
              })()}
            </>
          ) : (
            <>
              <button
                onClick={() => navTo('/login')}
                style={drawerLinkStyle(location.pathname === '/login')}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <polyline points="10 17 15 12 10 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                Sign In
              </button>
              <button
                onClick={() => navTo('/register')}
                style={{
                  ...drawerLinkStyle(false),
                  background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                  color: '#0c0a14',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.6"/>
                  <line x1="19" y1="8" x2="19" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                  <line x1="22" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
                Get Started
              </button>
            </>
          )}
        </nav>

        {/* Drawer bottom: profile + sign out */}
        {user && (
          <div
            className="flex flex-col gap-0.5 p-3 shrink-0"
            style={{ borderTop: '1px solid var(--color-border)' }}
          >
            <button
              onClick={() => navTo('/profile')}
              style={drawerLinkStyle(location.pathname === '/profile')}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--color-surface)'}
              onMouseLeave={e => {
                if (location.pathname !== '/profile') (e.currentTarget as HTMLElement).style.background = 'transparent'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Profile
            </button>
            <button
              onClick={signOut}
              style={{ ...drawerLinkStyle(false), color: '#e07070' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(224,112,112,0.08)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                <polyline points="16 17 21 12 16 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
              </svg>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </>
  )
}
