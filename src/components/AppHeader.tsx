import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

interface AppHeaderProps {
  right?: React.ReactNode
  back?: { label: string; to: string }
}

export default function AppHeader({ right, back }: AppHeaderProps) {
  const navigate = useNavigate()
  const { user } = useAuth()

  const homeTarget = user ? '/dashboard' : '/'

  return (
    <header
      className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 shrink-0"
      style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => navigate(homeTarget)}
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
          style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--color-gold)" strokeWidth="1.5"/>
          </svg>
        </button>
        {back ? (
          <button
            onClick={() => navigate(back.to)}
            className="text-sm transition-opacity hover:opacity-70 cursor-pointer truncate"
            style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}
          >
            ← <span className="hidden sm:inline">{back.label}</span>
          </button>
        ) : (
          <span
            className="hidden sm:block text-sm font-semibold tracking-widest uppercase truncate"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            RPG Session Teller
          </span>
        )}
      </div>
      {right && <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-3">{right}</div>}
    </header>
  )
}
