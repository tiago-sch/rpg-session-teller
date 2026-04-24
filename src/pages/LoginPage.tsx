import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthCard from '../components/AuthCard'
import AuthInput from '../components/AuthInput'
import AuthButton from '../components/AuthButton'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <AuthCard title="Welcome Back" subtitle="Continue your tale where you left off">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput label="Email" type="email" placeholder="scribe@realm.com" value={email} onChange={e => setEmail(e.target.value)} required />
        <AuthInput label="Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
        {error && <p className="text-xs text-center" style={{ color: '#e07070' }}>{error}</p>}
        <div className="mt-1">
          <AuthButton type="submit" disabled={loading}>{loading ? 'Entering…' : 'Enter the Realm'}</AuthButton>
        </div>
      </form>
      <div className="mt-6 flex flex-col gap-2 text-sm text-center" style={{ color: 'var(--color-parchment-muted)' }}>
        <Link to="/forgot-password" className="hover:underline transition-opacity hover:opacity-80" style={{ color: 'var(--color-gold-light)' }}>
          Forgot your password?
        </Link>
        <span>
          New to the realm?{' '}
          <Link to="/register" className="hover:underline" style={{ color: 'var(--color-gold-light)' }}>
            Create an account
          </Link>
        </span>
      </div>
    </AuthCard>
  )
}
