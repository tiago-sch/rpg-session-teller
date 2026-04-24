import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthCard from '../components/AuthCard'
import AuthInput from '../components/AuthInput'
import AuthButton from '../components/AuthButton'

export default function RegisterPage() {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName.trim() } },
    })
    if (error) setError(error.message)
    else setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <AuthCard title="Scroll Sent" subtitle="Check your email to confirm your account">
        <AuthButton onClick={() => window.location.href = '/login'}>Back to Login</AuthButton>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Begin Your Legend" subtitle="Create an account to start your chronicle">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput label="Your Name" type="text" placeholder="Aldric the Scribe" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
        <AuthInput label="Email" type="email" placeholder="scribe@realm.com" value={email} onChange={e => setEmail(e.target.value)} required />
        <AuthInput label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <AuthInput label="Confirm Password" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        {error && <p className="text-xs text-center" style={{ color: '#e07070' }}>{error}</p>}
        <div className="mt-1">
          <AuthButton type="submit" disabled={loading}>{loading ? 'Inscribing…' : 'Begin the Chronicle'}</AuthButton>
        </div>
      </form>
      <p className="mt-6 text-sm text-center" style={{ color: 'var(--color-parchment-muted)' }}>
        Already a member?{' '}
        <Link to="/login" className="hover:underline" style={{ color: 'var(--color-gold-light)' }}>Sign in</Link>
      </p>
    </AuthCard>
  )
}
