import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { profile, loading, update } = useProfile()

  const [displayName, setDisplayName] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile) setDisplayName(profile.display_name ?? '')
  }, [profile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setSaving(true)
    const err = await update(displayName.trim())
    if (err) setError(err.message)
    else setSuccess(true)
    setSaving(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <header
        className="flex items-center justify-between px-8 py-4 shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-ink-soft)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
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
        <button
          onClick={() => navigate('/')}
          className="text-sm transition-opacity hover:opacity-70 cursor-pointer"
          style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}
        >
          ← Chronicles
        </button>
      </header>

      <main className="flex-1 w-full max-w-sm mx-auto px-6 py-12 flex flex-col gap-8">
        <div>
          <h1
            className="text-2xl font-semibold tracking-wide mb-1"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
          >
            Your Profile
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>
            {user?.email}
          </p>
        </div>

        <div
          className="rounded-xl px-6 py-6 flex flex-col gap-5"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          {loading ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-xs font-semibold tracking-widest uppercase"
                  style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
                >
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Aldric the Scribe"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  required
                  className="px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none"
                  style={{
                    background: 'var(--color-ink-soft)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-parchment)',
                    fontFamily: 'var(--font-body)',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'var(--color-gold-dim)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                />
                <p className="text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
                  Shown as the author on shared chronicles.
                </p>
              </div>

              {error && <p className="text-xs text-center" style={{ color: '#e07070' }}>{error}</p>}
              {success && <p className="text-xs text-center" style={{ color: 'var(--color-gold-light)' }}>Profile updated.</p>}

              <button
                type="submit"
                disabled={saving}
                className="py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)',
                  color: '#0c0a14',
                  border: '1px solid var(--color-gold-dim)',
                  boxShadow: '0 0 20px rgba(200,145,58,0.2)',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </form>
          )}
        </div>

        <button
          onClick={signOut}
          className="text-sm font-semibold tracking-widest uppercase transition-opacity hover:opacity-70 cursor-pointer text-left"
          style={{ fontFamily: 'var(--font-display)', color: '#e07070' }}
        >
          Sign out
        </button>
      </main>
    </div>
  )
}
