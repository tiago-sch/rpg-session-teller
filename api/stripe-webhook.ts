import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getInkPack } from '../src/lib/inkPacks'
import { serverEnv } from './_env'
import { readRawBody, sendError } from './_http'
import type { ApiRequest, ApiResponse } from './_http'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripe = new Stripe(serverEnv.stripeSecretKey)
const supabaseAdmin = createClient(serverEnv.supabaseUrl, serverEnv.supabaseServiceRoleKey)

async function fulfillCheckoutSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== 'paid') return

  const userId = session.metadata?.user_id || session.client_reference_id
  const packId = session.metadata?.pack_id
  const inks = Number(session.metadata?.inks)
  const pack = packId ? getInkPack(packId) : undefined

  if (!userId || !pack || inks !== pack.inks) {
    throw new Error(`Invalid ink purchase metadata for Checkout Session ${session.id}`)
  }

  if (session.amount_total !== pack.unitAmount || session.currency !== pack.currency) {
    throw new Error(`Unexpected amount for Checkout Session ${session.id}`)
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null

  const { error } = await supabaseAdmin.rpc('fulfill_ink_purchase', {
    target_user_id: userId,
    checkout_session_id: session.id,
    payment_intent_id: paymentIntentId,
    purchased_pack_id: pack.id,
    purchased_inks: pack.inks,
    purchase_amount_total: session.amount_total,
    purchase_currency: session.currency,
  })

  if (error) throw error
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return sendError(res, 405, 'Method not allowed')
  }

  const signature = req.headers['stripe-signature']
  if (!signature || Array.isArray(signature)) {
    return sendError(res, 400, 'Missing Stripe signature')
  }

  let event: Stripe.Event
  try {
    const rawBody = await readRawBody(req)
    event = stripe.webhooks.constructEvent(rawBody, signature, serverEnv.stripeWebhookSecret)
  } catch (error) {
    console.error('Invalid Stripe webhook signature', error)
    return sendError(res, 400, 'Invalid webhook signature')
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await fulfillCheckoutSession(event.data.object)
    }

    return res.status(200).json({ received: true })
  } catch (error) {
    console.error('Failed to fulfill Stripe webhook', error)
    return sendError(res, 500, 'Webhook fulfillment failed')
  }
}
