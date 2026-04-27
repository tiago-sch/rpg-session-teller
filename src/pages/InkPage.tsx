import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import AppHeader from '../components/AppHeader'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../hooks/useProfile'
import { queryClient } from '../lib/queryClient'
import { supabase } from '../lib/supabase'
import { INK_PACKS, formatPackPrice } from '../lib/inkPacks'

interface InkPurchase {
  id: string
  pack_id: string
  inks: number
  amount_total: number | null
  currency: string | null
  created_at: string
}

export default function InkPage() {
  const { session, user } = useAuth()
  const { profile } = useProfile()
  const [searchParams] = useSearchParams()
  const [checkoutPackId, setCheckoutPackId] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState('')

  const purchaseStatus = searchParams.get('purchase')

  useEffect(() => {
    if (purchaseStatus === 'success') {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['ink-purchases', user?.id] })
    }
  }, [purchaseStatus, user?.id])

  const { data: purchases = [] } = useQuery({
    queryKey: ['ink-purchases', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ink_purchases')
        .select('id, pack_id, inks, amount_total, currency, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      if (error) throw error
      return (data ?? []) as InkPurchase[]
    },
    enabled: !!user,
  })

  const startCheckout = async (packId: string) => {
    setCheckoutError('')
    setCheckoutPackId(packId)

    try {
      const response = await fetch('/api/create-ink-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ packId }),
      })

      const data = await response.json()
      if (!response.ok || !data.url) {
        throw new Error(data.error ?? 'Unable to start checkout')
      }

      window.location.assign(data.url)
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Unable to start checkout')
      setCheckoutPackId(null)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 0%, #1e1830 0%, var(--color-ink) 60%)' }}
    >
      <AppHeader />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1
              className="text-2xl font-semibold tracking-wide mb-1"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}
            >
              Buy Ink
            </h1>
            <p className="text-sm max-w-xl" style={{ color: 'var(--color-parchment-muted)' }}>
              Ink fuels chronicle rewrites and scene illustrations. Purchases are fulfilled after Stripe confirms payment.
            </p>
          </div>

          <div
            className="flex items-center gap-3 rounded-lg px-4 py-3 shrink-0"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--color-gold)', flexShrink: 0 }}>
              <path d="M12 2C12 2 5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
            </svg>
            <div>
              <p className="text-xs font-semibold tracking-widest uppercase" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}>
                Current Balance
              </p>
              <p className="text-xl font-semibold tabular-nums" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
                {profile?.inks ?? 0} ink
              </p>
            </div>
          </div>
        </div>

        {purchaseStatus === 'success' && (
          <StatusMessage tone="success" text="Payment received. Your ink balance will update as soon as the webhook finishes processing." />
        )}
        {purchaseStatus === 'cancelled' && (
          <StatusMessage tone="muted" text="Checkout was cancelled. No ink was purchased." />
        )}
        {checkoutError && <StatusMessage tone="error" text={checkoutError} />}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INK_PACKS.map(pack => (
            <article
              key={pack.id}
              className="rounded-lg p-5 flex flex-col gap-5"
              style={{
                background: pack.featured ? 'var(--color-surface-raised)' : 'var(--color-surface)',
                border: `1px solid ${pack.featured ? 'var(--color-gold-dim)' : 'var(--color-border)'}`,
                boxShadow: pack.featured ? '0 0 28px rgba(200,145,58,0.12)' : 'none',
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
                    {pack.name}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>
                    {pack.inks} ink
                  </p>
                </div>
                {pack.featured && (
                  <span
                    className="text-[0.65rem] font-semibold tracking-widest uppercase px-2 py-1 rounded"
                    style={{ fontFamily: 'var(--font-display)', color: 'var(--color-gold)', border: '1px solid var(--color-gold-dim)' }}
                  >
                    Popular
                  </span>
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment)' }}>
                  {formatPackPrice(pack)}
                </p>
                <p className="text-xs text-right" style={{ color: 'var(--color-parchment-muted)' }}>
                  {Math.round(pack.inks / (pack.unitAmount / 100))} ink / dollar
                </p>
              </div>

              <button
                onClick={() => startCheckout(pack.id)}
                disabled={checkoutPackId !== null}
                className="mt-auto py-2.5 rounded-lg text-sm font-semibold tracking-widest uppercase transition-all cursor-pointer disabled:opacity-40"
                style={{
                  fontFamily: 'var(--font-display)',
                  background: pack.featured
                    ? 'linear-gradient(135deg, var(--color-gold-dim) 0%, var(--color-gold) 100%)'
                    : 'var(--color-ink-soft)',
                  color: pack.featured ? '#0c0a14' : 'var(--color-parchment)',
                  border: `1px solid ${pack.featured ? 'var(--color-gold-dim)' : 'var(--color-border-bright)'}`,
                }}
              >
                {checkoutPackId === pack.id ? 'Opening Stripe...' : 'Buy Ink'}
              </button>
            </article>
          ))}
        </section>

        <section className="flex flex-col gap-3">
          <h2
            className="text-sm font-semibold tracking-widest uppercase"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-parchment-muted)' }}
          >
            Recent Purchases
          </h2>

          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
            {purchases.length === 0 ? (
              <p className="px-4 py-4 text-sm" style={{ background: 'var(--color-surface)', color: 'var(--color-parchment-muted)' }}>
                No ink purchases yet.
              </p>
            ) : (
              purchases.map(purchase => (
                <div
                  key={purchase.id}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                  style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-parchment)' }}>
                      +{purchase.inks} ink
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-parchment-muted)' }}>
                      {new Date(purchase.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm" style={{ color: 'var(--color-parchment-muted)' }}>
                    {formatPurchaseAmount(purchase)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

function StatusMessage({ tone, text }: { tone: 'success' | 'muted' | 'error'; text: string }) {
  const color = tone === 'error'
    ? '#e07070'
    : tone === 'success'
      ? 'var(--color-gold-light)'
      : 'var(--color-parchment-muted)'

  return (
    <p
      className="rounded-lg px-4 py-3 text-sm"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', color }}
    >
      {text}
    </p>
  )
}

function formatPurchaseAmount(purchase: InkPurchase) {
  if (!purchase.amount_total || !purchase.currency) return 'Paid'

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: purchase.currency.toUpperCase(),
  }).format(purchase.amount_total / 100)
}
