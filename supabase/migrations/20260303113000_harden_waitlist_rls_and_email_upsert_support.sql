-- Harden waitlist access and ensure deterministic ON CONFLICT(email) support.

-- Keep exact email uniqueness for INSERT ... ON CONFLICT (email).
CREATE UNIQUE INDEX IF NOT EXISTS idx_waitlist_email_exact_unique
  ON public.waitlist (email);

-- Remove legacy broad-read policy from initial waitlist migration.
DROP POLICY IF EXISTS "Authenticated users can view waitlist" ON public.waitlist;

-- Ensure users can only read their own waitlist entry by email.
DROP POLICY IF EXISTS "Users can view their own waitlist entry" ON public.waitlist;
CREATE POLICY "Users can view their own waitlist entry"
ON public.waitlist
FOR SELECT
USING (
  LOWER(email) = LOWER(COALESCE(auth.jwt() ->> 'email', ''))
);

-- Preserve admin visibility for operational/support workflows.
DROP POLICY IF EXISTS "Admins can view all waitlist entries" ON public.waitlist;
CREATE POLICY "Admins can view all waitlist entries"
ON public.waitlist
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
      AND ur.role = 'admin'
  )
);
