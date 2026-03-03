-- Waitlist special pricing + waitlister identity support.
-- Phase 1 scope:
-- 1) Structured waitlist_special_pricing table
-- 2) Safe user self-read policy for their own waitlist row (email matched)
-- 3) RLS for user-visible waitlist offers

-- -----------------------------------------------------------------------------
-- 1) Waitlist special pricing table
-- -----------------------------------------------------------------------------
-- Ensure waitlist email can be used for deterministic upsert and lookups.
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_unique
  ON public.waitlist (LOWER(email));

CREATE TABLE IF NOT EXISTS public.waitlist_special_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waitlist_user_id UUID REFERENCES public.waitlist(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  promo_code TEXT NOT NULL UNIQUE,
  tier_offering TEXT NOT NULL CHECK (tier_offering IN ('premium', 'pro')),
  billing_cycle TEXT CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'annual')),
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  original_price NUMERIC(10,2),
  discounted_price NUMERIC(10,2),
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'activated', 'expired', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_special_pricing_email
  ON public.waitlist_special_pricing (LOWER(email));

CREATE INDEX IF NOT EXISTS idx_waitlist_special_pricing_user_id
  ON public.waitlist_special_pricing (user_id);

CREATE INDEX IF NOT EXISTS idx_waitlist_special_pricing_status_valid
  ON public.waitlist_special_pricing (status, valid_until);

-- Ensure one badge per user/badge_type pair.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_badges_user_badge_unique
  ON public.user_badges (user_id, badge_type);

-- -----------------------------------------------------------------------------
-- 2) RLS + policies
-- -----------------------------------------------------------------------------
ALTER TABLE public.waitlist_special_pricing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own waitlist offers" ON public.waitlist_special_pricing;
CREATE POLICY "Users can view their own waitlist offers"
ON public.waitlist_special_pricing
FOR SELECT
USING (
  auth.uid() = user_id
  OR LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

DROP POLICY IF EXISTS "Admins can manage waitlist offers" ON public.waitlist_special_pricing;
CREATE POLICY "Admins can manage waitlist offers"
ON public.waitlist_special_pricing
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);

-- -----------------------------------------------------------------------------
-- 3) updated_at trigger
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_waitlist_special_pricing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_waitlist_special_pricing_updated_at ON public.waitlist_special_pricing;
CREATE TRIGGER trg_waitlist_special_pricing_updated_at
BEFORE UPDATE ON public.waitlist_special_pricing
FOR EACH ROW
EXECUTE FUNCTION public.update_waitlist_special_pricing_updated_at();

-- -----------------------------------------------------------------------------
-- 4) Allow signed-in users to read only their own waitlist entry by email
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON public.waitlist;
CREATE POLICY "Users can view their own waitlist entry"
ON public.waitlist
FOR SELECT
USING (
  LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);
