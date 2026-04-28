import { INK_PACKS } from './_inkPacks.js'
import { createClient } from '@supabase/supabase-js'
import { requiredEnvAny } from './_env.js'
import { readJsonBody, sendError } from './_http.js'
import type { ApiRequest, ApiResponse } from './_http.js'

interface PublicFxResponse {
  amount?: number
  base?: string
  date?: string
  rates?: Record<string, number>
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

    const fxResponse = await fetch(
      `https://api.frankfurter.app/latest?from=${sourceCurrency.toUpperCase()}&to=${targetCurrency.toUpperCase()}`
    )
    if (!fxResponse.ok) {
      return sendError(res, fxResponse.status, 'Unable to fetch FX rate')
    }

    const quote = (await fxResponse.json()) as PublicFxResponse
    const exchangeRate = quote.rates?.[targetCurrency.toUpperCase()]

    if (!exchangeRate || exchangeRate <= 0) {
      return sendError(res, 502, 'FX provider returned an invalid exchange rate')
    }

    const convertedPacks = INK_PACKS.map((pack) => {
      const sourceAmount = pack.unitAmount / 100
      const usdAmount = sourceAmount * exchangeRate
      return {
        packId: pack.id,
        currency: targetCurrency,
        amount: usdAmount,
        amountMinor: Math.round(usdAmount * 100),
      }
    })

    return res.status(200).json({
      provider: 'frankfurter.app',
      asOfDate: quote.date ?? null,
      sourceCurrency,
      targetCurrency,
      exchangeRate,
      convertedPacks,
    })
  } catch (error) {
    console.error('Failed to fetch public FX rate', error)
    const message = error instanceof Error ? error.message : 'Unable to fetch FX rate'
    return sendError(res, 500, message)
  }
}
