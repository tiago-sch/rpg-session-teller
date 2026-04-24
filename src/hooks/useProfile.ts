import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface Profile {
  display_name: string | null
}

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setProfile(data ?? null)
        setLoading(false)
      })
  }, [user])

  const update = async (display_name: string) => {
    if (!user) return
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, display_name })
    if (!error) setProfile({ display_name })
    return error
  }

  return { profile, loading, update }
}
