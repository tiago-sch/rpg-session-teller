import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--color-gold)" strokeWidth="1.5"/>
            </svg>
          </div>
          <span
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            RPG Session Teller
          </span>
        </div>

        {!loading && (
          <nav className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                  color: '#0c0a14',
                  border: '1px solid var(--color-gold-dim)',
                  boxShadow: '0 0 12px rgba(200,145,58,0.2)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="currentColor" strokeWidth="1.8"/>
                </svg>
                My Chronicles
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-colors cursor-pointer"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'var(--color-surface-raised)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-parchment-muted)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  Sign in
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase transition-all cursor-pointer"
                  style={{
                    fontFamily: 'var(--font-display)',
                    background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                    color: '#0c0a14',
                    border: '1px solid var(--color-gold-dim)',
                    boxShadow: '0 0 12px rgba(200,145,58,0.2)',
                  }}
                >
                  Get started
                </button>
              </>
            )}
          </nav>
        )}
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="flex flex-col items-center text-center px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
          {/* Ornament */}
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px w-12 sm:w-20" style={{ background: 'linear-gradient(to right, transparent, var(--color-gold-dim))' }} />
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.7"/>
            </svg>
            <div className="h-px w-12 sm:w-20" style={{ background: 'linear-gradient(to left, transparent, var(--color-gold-dim))' }} />
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-wide mb-6 leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            Your adventures<br />
            <span style={{ color: 'var(--color-gold)' }}>deserve to be told.</span>
          </h1>

          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl mb-10"
            style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}
          >
            Paste your session notes and let AI transform them into a polished chronicle — a vivid narrative retelling of every battle, twist, and moment your table will remember.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                color: '#0c0a14',
                border: '1px solid var(--color-gold-dim)',
                boxShadow: '0 0 24px rgba(200,145,58,0.3)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 36px rgba(200,145,58,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(200,145,58,0.3)')}
            >
              {user ? 'Open my chronicles' : 'Start chronicling — free'}
            </button>
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-semibold tracking-widest uppercase transition-colors cursor-pointer"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'transparent',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-parchment-muted)',
                }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-border-bright)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
              >
                Sign in
              </button>
            )}
          </div>
        </section>

        {/* Divider */}
        <div className="flex items-center gap-4 px-6 sm:px-16 pb-0">
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.4"/>
          </svg>
          <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
        </div>

        {/* Features */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-px mx-4 sm:mx-8 lg:mx-16 my-12 sm:my-16 rounded-xl overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
          <Feature
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            }
            title="AI Chronicles"
            body="Gemini transforms bullet-point notes into immersive, narrative prose. Names, quotes, and events are preserved exactly — no hallucinations, no liberties."
          />
          <Feature
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--color-gold)" strokeWidth="1.5"/>
              </svg>
            }
            title="Campaigns"
            body="Organise sessions by campaign so your chronicles stay grouped. Browse past sessions by campaign, filter on the fly, and never lose track of your story arcs."
          />
          <Feature
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            }
            title="Share with your table"
            body="Every session gets a public link you can drop in your group chat. Readers see the full chronicle without needing an account."
          />
        </section>

        {/* Footer */}
        <footer className="mt-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--color-border)' }}>
          <p className="text-xs" style={{ color: 'var(--color-border-bright)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
            RPG SESSION TELLER — FORGE YOUR LEGEND
          </p>
          <div className="flex items-center gap-5">
            <span className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
              Built by{' '}
              <a
                href="https://tiagoschmidt.com"
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-70"
                style={{ color: 'var(--color-gold)', textDecoration: 'none' }}
              >
                Tiago Schmidt
              </a>
            </span>
            <a
              href="https://github.com/tiago-sch/rpg-session-teller"
              target="_blank"
              rel="noreferrer"
              className="transition-opacity hover:opacity-70"
              style={{ color: 'var(--color-parchment-muted)' }}
              title="View source on GitHub"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836a9.59 9.59 0 0 1 2.504.337c1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
            </a>
          </div>
        </footer>
      </main>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4 px-6 sm:px-8 py-8 sm:py-10" style={{ background: 'var(--color-surface)' }}>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
        style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)' }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-sm font-semibold tracking-widest uppercase mb-2"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
        >
          {title}
        </p>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}>
          {body}
        </p>
      </div>
    </div>
  )
}
