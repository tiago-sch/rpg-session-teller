import { INK_PACKS } from './_inkPacks.js'
import { createClient } from '@supabase/supabase-js'
import { requiredEnv, requiredEnvAny } from './_env.js'
import { readJsonBody, sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

interface FxQuoteRate {
  exchange_rate?: number
  base_rate?: number
}

interface FxQuoteResponse {
  id: string
  rates?: Record<string, FxQuoteRate>
}

interface FxQuoteErrorResponse {
  error?: {
    message?: string
  }
}

function getBearerToken(req: ApiRequest) {
  const rawHeader = req.headers.authorization
  const header = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader
  if (typeof header !== 'string') return null

  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match ? match[1] : null
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Method not allowed')
  }

  try {
    const supabase = createClient(
      requiredEnvAny('SUPABASE_URL', 'VITE_SUPABASE_URL'),
      requiredEnvAny('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
    )

    const token = getBearerToken(req)
    if (!token) return sendError(res, 401, 'Missing authorization token')

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return sendError(res, 401, 'Invalid authorization token')

    const body = await readJsonBody(req)
    const targetCurrency =
      typeof body === 'object' && body && 'targetCurrency' in body
        ? String(body.targetCurrency).toLowerCase()
        : 'usd'

    if (targetCurrency !== 'usd') {
      return sendError(res, 400, 'Only USD conversion is currently supported')
    }

    const sourceCurrency = INK_PACKS[0]?.currency?.toLowerCase()
    if (!sourceCurrency) {
      return sendError(res, 500, 'Ink pack currency is not configured')
    }

    const stripeSecret = requiredEnv('STRIPE_SECRET_KEY')
    const payload = new URLSearchParams({
      to_currency: targetCurrency,
      from_currencies: sourceCurrency,
      lock_duration: 'none',
    })

    const stripeResponse = await fetch('https://api.stripe.com/v1/fx_quotes', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeSecret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Stripe-Version': '2025-07-30.preview',
      },
      body: payload,
    })

    if (!stripeResponse.ok) {
      const errorBody = (await stripeResponse.json().catch(() => null)) as FxQuoteErrorResponse | null
      const message = errorBody?.error?.message ?? 'Unable to fetch FX quote from Stripe'
      return sendError(res, stripeResponse.status, message)
    }

    const quote = (await stripeResponse.json()) as FxQuoteResponse
    const rateInfo = quote.rates?.[sourceCurrency]
    const exchangeRate = rateInfo?.exchange_rate ?? rateInfo?.base_rate

    if (!exchangeRate || exchangeRate <= 0) {
      return sendError(res, 502, 'Stripe returned an invalid FX exchange rate')
    }

    const convertedPacks = INK_PACKS.map((pack) => {
      const sourceAmount = pack.unitAmount / 100
      const usdAmount = sourceAmount / exchangeRate
      return {
        packId: pack.id,
        currency: targetCurrency,
        amount: usdAmount,
        amountMinor: Math.round(usdAmount * 100),
      }
    })

    return res.status(200).json({
      quoteId: quote.id,
      sourceCurrency,
      targetCurrency,
      exchangeRate,
      convertedPacks,
    })
  } catch (error) {
    console.error('Failed to fetch ink FX quote', error)
    const message = error instanceof Error ? error.message : 'Unable to fetch FX quote'
    return sendError(res, 500, message)
  }
}
