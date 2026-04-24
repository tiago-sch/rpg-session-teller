import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthCard from '../components/AuthCard'
import AuthInput from '../components/AuthInput'
import AuthButton from '../components/AuthButton'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) setError(error.message)
    else setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <AuthCard title="Messenger Dispatched" subtitle={`A reset scroll was sent to ${email}`}>
        <AuthButton onClick={() => window.location.href = '/login'}>Return to Login</AuthButton>
      </AuthCard>
    )
  }

  return (
    <AuthCard title="Lost the Key?" subtitle="We'll send you a link to restore access">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput label="Email" type="email" placeholder="scribe@realm.com" value={email} onChange={e => setEmail(e.target.value)} required />
        {error && <p className="text-xs text-center" style={{ color: '#e07070' }}>{error}</p>}
        <div className="mt-1">
          <AuthButton type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send Reset Link'}</AuthButton>
        </div>
      </form>
      <p className="mt-6 text-sm text-center" style={{ color: 'var(--color-parchment-muted)' }}>
        Remembered it?{' '}
        <Link to="/login" className="hover:underline" style={{ color: 'var(--color-gold-light)' }}>Back to login</Link>
      </p>
    </AuthCard>
  )
}
