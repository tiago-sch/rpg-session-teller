import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export interface Campaign {
  id: number
  name: string
}

interface CampaignSelectProps {
  value: number | null
  onChange: (id: number | null) => void
  disabled?: boolean
}

export default function CampaignSelect({ value, onChange, disabled }: CampaignSelectProps) {
  const { user } = useAuth()

  const { data: campaigns = [] } = useQuery<Campaign[]>({
    queryKey: ['campaigns', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('campaigns').select('id, name').order('name')
      return (data as Campaign[]) ?? []
    },
    enabled: !!user,
  })

  return (
    <select
      value={value ?? ''}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      disabled={disabled}
      className="px-4 py-2.5 rounded-lg text-sm transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
      style={{
        background: 'var(--color-ink-soft)',
        border: '1px solid var(--color-border)',
        color: value ? 'var(--color-parchment)' : 'var(--color-parchment-muted)',
        fontFamily: 'var(--font-body)',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M6 9l6 6 6-6' stroke='%23a89880' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 12px center',
        paddingRight: '36px',
      }}
    >
      <option value="">No campaign</option>
      {campaigns.map(c => (
        <option key={c.id} value={c.id}>{c.name}</option>
      ))}
    </select>
  )
}
