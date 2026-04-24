interface AuthCardProps {
  title: string
  subtitle: string
  children: React.ReactNode
}

function Ornament() {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[var(--color-gold-dim)]" />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="shrink-0 opacity-80">
        <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" />
      </svg>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[var(--color-gold-dim)]" />
    </div>
  )
}

export default function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #1e1830 0%, var(--color-ink) 70%)' }}
    >
      <div
        className="w-full max-w-sm px-8 pt-8 pb-9 rounded-2xl shadow-2xl"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 0 60px rgba(200,145,58,0.07), 0 24px 48px rgba(0,0,0,0.6)',
        }}
      >
        {/* Logo mark */}
        <div className="flex justify-center mb-5">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--color-surface-raised)', border: '1px solid var(--color-border-bright)' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="var(--color-gold)" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="var(--color-gold)" strokeWidth="1.5"/>
              <path d="M9 7h6M9 11h4" stroke="var(--color-gold-light)" strokeWidth="1.2" strokeLinecap="round" opacity="0.7"/>
            </svg>
          </div>
        </div>

        <h1
          className="text-center text-xl font-semibold tracking-wider mb-1"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
        >
          {title}
        </h1>
        <p className="text-center text-sm mb-6" style={{ color: 'var(--color-parchment-muted)' }}>
          {subtitle}
        </p>

        <Ornament />
        {children}
      </div>
    </div>
  )
}
