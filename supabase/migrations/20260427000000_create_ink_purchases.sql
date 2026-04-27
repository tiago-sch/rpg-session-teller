-- Track Stripe purchases and fulfill ink exactly once per Checkout Session.
CREATE TABLE IF NOT EXISTS public.ink_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_checkout_session_id TEXT NOT NULL UNIQUE,
  stripe_payment_intent_id TEXT,
  pack_id TEXT NOT NULL,
  inks INT NOT NULL CHECK (inks > 0),
  amount_total INT,
  currency TEXT,
  status TEXT NOT NULL DEFAULT 'fulfilled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ink_purchases_user_created_idx
  ON public.ink_purchases(user_id, created_at DESC);

ALTER TABLE public.ink_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own ink purchases" ON public.ink_purchases;
CREATE POLICY "Users can read their own ink purchases"
  ON public.ink_purchases
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION fulfill_ink_purchase(
  target_user_id UUID,
  checkout_session_id TEXT,
  payment_intent_id TEXT,
  purchased_pack_id TEXT,
  purchased_inks INT,
  purchase_amount_total INT,
  purchase_currency TEXT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inserted_id UUID;
  new_inks INT;
BEGIN
  IF purchased_inks <= 0 THEN
    RAISE EXCEPTION 'Purchased inks must be positive';
  END IF;

  INSERT INTO public.ink_purchases (
    user_id,
    stripe_checkout_session_id,
    stripe_payment_intent_id,
    pack_id,
    inks,
    amount_total,
    currency
  )
  VALUES (
    target_user_id,
    checkout_session_id,
    payment_intent_id,
    purchased_pack_id,
    purchased_inks,
    purchase_amount_total,
    purchase_currency
  )
  ON CONFLICT (stripe_checkout_session_id) DO NOTHING
  RETURNING id INTO inserted_id;

  IF inserted_id IS NOT NULL THEN
    UPDATE public.profiles
    SET inks = inks + purchased_inks
    WHERE id = target_user_id
    RETURNING inks INTO new_inks;

    IF new_inks IS NULL THEN
      RAISE EXCEPTION 'Profile not found';
    END IF;
  ELSE
    SELECT inks INTO new_inks
    FROM public.profiles
    WHERE id = target_user_id;
  END IF;

  RETURN new_inks;
END;
$$;

REVOKE ALL ON FUNCTION fulfill_ink_purchase(UUID, TEXT, TEXT, TEXT, INT, INT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION fulfill_ink_purchase(UUID, TEXT, TEXT, TEXT, INT, INT, TEXT) TO service_role;
