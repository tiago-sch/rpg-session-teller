import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getInkPack } from '../src/lib/inkPacks'
import { getAppUrl, requiredEnv, requiredEnvAny } from './_env'
import { readJsonBody, sendError } from './_http'
import type { ApiRequest, ApiResponse } from './_http'

function getBearerToken(req: ApiRequest) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length)
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Method not allowed')
  }

  try {
    const stripe = new Stripe(requiredEnv('STRIPE_SECRET_KEY'))
    const supabase = createClient(
      requiredEnvAny('SUPABASE_URL', 'VITE_SUPABASE_URL'),
      requiredEnvAny('SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY')
    )

    const token = getBearerToken(req)
    if (!token) return sendError(res, 401, 'Missing authorization token')

    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    if (userError || !user) return sendError(res, 401, 'Invalid authorization token')

    const body = await readJsonBody(req)
    const packId = typeof body === 'object' && body && 'packId' in body ? String(body.packId) : ''
    const pack = getInkPack(packId)
    if (!pack) return sendError(res, 400, 'Unknown ink pack')

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: pack.currency,
            unit_amount: pack.unitAmount,
            product_data: {
              name: `${pack.name} - ${pack.inks} ink`,
              description: 'Consumable ink for RPG Session Teller AI actions',
            },
          },
        },
      ],
      metadata: {
        user_id: user.id,
        pack_id: pack.id,
        inks: String(pack.inks),
      },
      success_url: `${getAppUrl()}/ink?purchase=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getAppUrl()}/ink?purchase=cancelled`,
    })

    return res.status(200).json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Failed to create ink checkout session', error)
    const message = error instanceof Error ? error.message : 'Unable to start checkout'
    return sendError(res, 500, message)
  }
}
