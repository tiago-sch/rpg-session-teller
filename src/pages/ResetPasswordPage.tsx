import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AuthCard from '../components/AuthCard'
import AuthInput from '../components/AuthInput'
import AuthButton from '../components/AuthButton'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else navigate('/')
    setLoading(false)
  }

  return (
    <AuthCard title="Forge New Key" subtitle="Set a new password for your account">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <AuthInput label="New Password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        <AuthInput label="Confirm Password" type="password" placeholder="••••••••" value={confirm} onChange={e => setConfirm(e.target.value)} required />
        {error && <p className="text-xs text-center" style={{ color: '#e07070' }}>{error}</p>}
        <div className="mt-1">
          <AuthButton type="submit" disabled={loading}>{loading ? 'Forging…' : 'Update Password'}</AuthButton>
        </div>
      </form>
    </AuthCard>
  )
}
