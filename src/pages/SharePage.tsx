import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import AppHeader from '../components/AppHeader'

interface PublicSession {
  title: string
  campaign_name: string | null
  tldr: string | null
  generated_text: string | null
  updated_at: string
  creator_name: string | null
}

export default function SharePage() {
  const { public_id } = useParams<{ public_id: string }>()
  const [session, setSession] = useState<PublicSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: sessionData, error } = await supabase
        .from('sessions')
        .select('title, campaigns(name), tldr, generated_text, updated_at, user_id')
        .eq('public_id', public_id)
        .single()

      if (error || !sessionData) {
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', sessionData.user_id)
        .single()

      const sd = sessionData as typeof sessionData & { campaigns: { name: string } | null }
      setSession({
        title: sd.title,
        campaign_name: sd.campaigns?.name ?? null,
        tldr: sd.tldr,
        generated_text: sd.generated_text,
        updated_at: sd.updated_at,
        creator_name: profileData?.display_name ?? null,
      })
      setLoading(false)
    }
    load()
  }, [public_id])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {loading && (
          <div className="flex justify-center pt-24">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="var(--color-border-bright)" strokeWidth="3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--color-gold)" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {notFound && (
          <div className="text-center pt-24">
            <p style={{ color: 'var(--color-parchment-muted)' }}>This chronicle could not be found.</p>
          </div>
        )}

        {session && (
          <div className="flex flex-col gap-8">
            <div>
              {session.campaign_name && (
                <p className="text-xs font-semibold tracking-widest uppercase mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>
                  {session.campaign_name}
                </p>
              )}
              <h1
                className="text-2xl sm:text-3xl font-semibold tracking-wide mb-3"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
              >
                {session.title}
              </h1>
              <p className="text-xs" style={{ color: 'var(--color-parchment-muted)', fontFamily: 'var(--font-display)' }}>
                {session.creator_name && <>By {session.creator_name} · </>}
                Updated {fmt(session.updated_at)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
              <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                <path d="M10 2 L11.8 7.6 L18 7.6 L13.1 11.2 L14.9 16.8 L10 13.2 L5.1 16.8 L6.9 11.2 L2 7.6 L8.2 7.6 Z" fill="var(--color-gold)" opacity="0.6"/>
              </svg>
              <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            </div>

            {session.tldr && (
              <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Summary</p>
                <p className="text-base leading-relaxed" style={{ color: 'var(--color-parchment)' }}>{session.tldr}</p>
              </div>
            )}

            {session.generated_text && (
              <div className="rounded-xl px-5 sm:px-6 py-5" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold tracking-widest uppercase mb-3" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)' }}>Chronicle</p>
                <div className="text-base leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--color-parchment)', fontFamily: 'var(--font-body)' }}>
                  {session.generated_text}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function fmt(date: string) {
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}
