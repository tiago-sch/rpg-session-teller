import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface AppHeaderProps {
  right?: React.ReactNode
}

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

export default function AppHeader({ right }: AppHeaderProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const homeTarget = user ? '/dashboard' : '/'

  return (
    <header
      className="flex items-center px-4 sm:px-6 py-3 shrink-0 gap-3"
      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}
    >
      {/* Logo + Name */}
      <button
        onClick={() => navigate(homeTarget)}
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

      {/* Center nav */}
      <div className="flex-1 flex justify-center">
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
                  onMouseEnter={e => {
                    if (!isActive) e.currentTarget.style.color = 'var(--color-parchment)'
                  }}
                  onMouseLeave={e => {
                    if (!isActive) e.currentTarget.style.color = 'var(--color-parchment-muted)'
                  }}
                >
                  {/* Icon only on mobile */}
                  <span
                    className="sm:hidden"
                    style={{ color: isActive ? 'var(--color-gold)' : 'inherit' }}
                  >
                    {link.icon}
                  </span>
                  {/* Text on desktop */}
                  <span className="hidden sm:inline">{link.label}</span>
                </button>
              )
            })}
          </nav>
        )}
      </div>

      {/* Right: page actions + profile */}
      <div className="flex items-center gap-2 shrink-0">
        {right && <>{right}</>}
        {user && (
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center justify-center w-8 h-8 rounded-full cursor-pointer transition-colors shrink-0"
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
      </div>
    </header>
  )
}
