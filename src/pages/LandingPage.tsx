import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AppHeader from '../components/AppHeader'

export default function LandingPage() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  const headerRight = !loading ? (
    user ? (
      <button
        onClick={() => navigate('/dashboard')}
        className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer transition-all"
        style={{
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
          color: '#0c0a14',
          border: '1px solid var(--color-gold-dim)',
          boxShadow: '0 0 12px rgba(200,145,58,0.2)',
        }}
      >
        My Chronicles
      </button>
    ) : (
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer transition-colors"
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
          className="px-4 py-1.5 rounded-lg text-xs font-semibold tracking-widest uppercase cursor-pointer transition-all"
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
      </div>
    )
  ) : undefined

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 70%)' }}
    >
      <AppHeader right={headerRight} />

      <main className="flex-1 flex flex-col">

        {/* ── Hero ── */}
        <section className="flex flex-col items-center text-center px-6 pt-20 pb-20 sm:pt-28 sm:pb-28">
          <div className="flex items-center gap-4 mb-8">
            <div className="h-px w-12 sm:w-24" style={{ background: 'linear-gradient(to right, transparent, var(--color-gold-dim))' }} />
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.7"/>
            </svg>
            <div className="h-px w-12 sm:w-24" style={{ background: 'linear-gradient(to left, transparent, var(--color-gold-dim))' }} />
          </div>

          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-wide mb-6 leading-tight max-w-3xl"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            Your adventures<br />
            <span style={{ color: 'var(--color-gold)' }}>deserve to be told.</span>
          </h1>

          <p
            className="text-base sm:text-lg leading-relaxed max-w-xl mb-10"
            style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}
          >
            Paste your session notes and let AI transform them into a vivid chronicle — an immersive narrative your whole table will remember. Edit, organise, share, and discover stories from adventurers around the world.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer transition-all"
              style={{
                fontFamily: 'var(--font-display)',
                background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                color: '#0c0a14',
                border: '1px solid var(--color-gold-dim)',
                boxShadow: '0 0 28px rgba(200,145,58,0.35)',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(200,145,58,0.55)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 28px rgba(200,145,58,0.35)')}
            >
              {user ? 'Open my chronicles' : 'Start chronicling — free'}
            </button>
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="w-full sm:w-auto px-8 py-3 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer transition-colors"
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

        <Divider />

        {/* ── How it works ── */}
        <section className="px-6 sm:px-12 lg:px-20 py-16 sm:py-20 flex flex-col gap-10">
          <div className="text-center">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
            >
              How it works
            </p>
            <h2
              className="text-xl sm:text-2xl font-semibold tracking-wide"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
            >
              From raw notes to legend in minutes.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 relative">
            {/* connecting line on desktop */}
            <div
              className="hidden sm:block absolute top-8 left-1/6 right-1/6 h-px"
              style={{ background: 'linear-gradient(to right, transparent, var(--color-border), var(--color-border), transparent)' }}
            />
            <Step
              number="01"
              title="Write your notes"
              body="Bullet points, stream of consciousness, shorthand — drop in whatever you recorded during the session."
            />
            <Step
              number="02"
              title="Generate your chronicle"
              body="AI crafts an immersive narrative. Not happy? Edit the text directly or revise your notes and regenerate."
            />
            <Step
              number="03"
              title="Share & discover"
              body="Drop a public link in your group chat. Organise chronicles into groups. Save favourites from other adventurers."
            />
          </div>
        </section>

        <Divider />

        {/* ── Features ── */}
        <section className="px-4 sm:px-8 lg:px-12 py-16 sm:py-20 flex flex-col gap-10">
          <div className="text-center">
            <p
              className="text-xs font-semibold tracking-widest uppercase mb-3"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}
            >
              Everything you need
            </p>
            <h2
              className="text-xl sm:text-2xl font-semibold tracking-wide"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
            >
              Built for every adventurer.
            </h2>
          </div>

          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px rounded-2xl overflow-hidden"
            style={{ border: '1px solid var(--color-border)' }}
          >
            <Feature
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              title="AI Chronicles"
              body="Gemini transforms your bullet-point notes into immersive narrative prose. Names, quotes, and events preserved exactly — no hallucinations."
            />
            <Feature
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
              title="Edit & Regenerate"
              body="Refine the generated chronicle word by word, or revise your session notes and regenerate a completely fresh version."
            />
            <Feature
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--color-gold)" strokeWidth="1.5"/>
                </svg>
              }
              title="Campaigns"
              body="Keep chronicles organised by campaign. Filter sessions on the fly and follow every story arc from first session to finale."
            />
            <Feature
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="7" width="20" height="13" rx="2" stroke="var(--color-gold)" strokeWidth="1.5"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
              title="Session Groups"
              body="Curate public collections of chronicles — best-of-campaign highlights, one-shots, legendary encounters — and share them as a single link."
            />
            <Feature
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              }
              title="Share with your table"
              body="Every chronicle gets a public link you can drop in your group chat. Readers see the full narrative without needing an account."
            />
            <Feature
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              title="Saved Chronicles"
              body="Bookmark sessions from other adventurers. Add a personal note to remember why a chronicle caught your eye."
            />
          </div>
        </section>

        <Divider />

        {/* ── Bottom CTA ── */}
        <section className="flex flex-col items-center text-center px-6 py-20 sm:py-28 gap-6">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.5"/>
          </svg>
          <h2
            className="text-2xl sm:text-3xl font-semibold tracking-wide"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            Ready to tell your story?
          </h2>
          <p
            className="text-sm sm:text-base leading-relaxed max-w-md"
            style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}
          >
            Your sessions are worth remembering. Start writing and let the chronicles begin.
          </p>
          <button
            onClick={() => navigate(user ? '/dashboard' : '/register')}
            className="px-10 py-3 rounded-lg text-sm font-semibold tracking-widest uppercase cursor-pointer transition-all"
            style={{
              fontFamily: 'var(--font-display)',
              background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
              color: '#0c0a14',
              border: '1px solid var(--color-gold-dim)',
              boxShadow: '0 0 24px rgba(200,145,58,0.3)',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 40px rgba(200,145,58,0.5)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(200,145,58,0.3)')}
          >
            {user ? 'Open my chronicles' : 'Start for free'}
          </button>
        </section>

        {/* ── Footer ── */}
        <footer
          className="px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p
            className="text-xs"
            style={{ color: 'var(--color-border-bright)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}
          >
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

function Divider() {
  return (
    <div className="flex items-center gap-4 px-6 sm:px-16">
      <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
      <svg width="10" height="10" viewBox="0 0 20 20" fill="none">
        <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.35"/>
      </svg>
      <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
    </div>
  )
}

function Step({ number, title, body }: { number: string; title: string; body: string }) {
  return (
    <div className="flex flex-col gap-4 px-6 sm:px-10 py-2 sm:py-4 relative">
      <p
        className="text-3xl font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', opacity: 0.25, lineHeight: 1 }}
      >
        {number}
      </p>
      <p
        className="text-sm font-semibold tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
      >
        {title}
      </p>
      <p
        className="text-sm leading-relaxed"
        style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}
      >
        {body}
      </p>
    </div>
  )
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div
      className="flex flex-col gap-4 px-6 sm:px-8 py-8 sm:py-10"
      style={{ background: 'var(--color-surface)' }}
    >
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
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-body)' }}
        >
          {body}
        </p>
      </div>
    </div>
  )
}
