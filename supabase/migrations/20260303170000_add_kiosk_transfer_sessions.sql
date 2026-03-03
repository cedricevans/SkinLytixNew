-- Kiosk transfer sessions support magic-link/QR handoff from kiosk to personal accounts.

CREATE TABLE IF NOT EXISTS public.kiosk_transfer_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kiosk_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_email text,
  recipient_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transfer_token text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'magic_link_sent', 'claimed', 'expired', 'cancelled')),
  claim_url text,
  magic_link_sent_at timestamp with time zone,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '30 minutes'),
  claimed_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.kiosk_transfer_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.kiosk_transfer_sessions(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.user_analyses(id) ON DELETE CASCADE,
  transferred_to_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transferred_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (session_id, analysis_id)
);

CREATE INDEX IF NOT EXISTS idx_kiosk_transfer_sessions_kiosk_user
  ON public.kiosk_transfer_sessions(kiosk_user_id);

CREATE INDEX IF NOT EXISTS idx_kiosk_transfer_sessions_status
  ON public.kiosk_transfer_sessions(status);

CREATE INDEX IF NOT EXISTS idx_kiosk_transfer_sessions_expires_at
  ON public.kiosk_transfer_sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_kiosk_transfer_sessions_recipient_email
  ON public.kiosk_transfer_sessions((lower(recipient_email)));

CREATE INDEX IF NOT EXISTS idx_kiosk_transfer_items_session_id
  ON public.kiosk_transfer_items(session_id);

CREATE INDEX IF NOT EXISTS idx_kiosk_transfer_items_analysis_id
  ON public.kiosk_transfer_items(analysis_id);

ALTER TABLE public.kiosk_transfer_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kiosk_transfer_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Kiosk users can view own transfer sessions" ON public.kiosk_transfer_sessions;
CREATE POLICY "Kiosk users can view own transfer sessions"
  ON public.kiosk_transfer_sessions
  FOR SELECT
  USING (kiosk_user_id = auth.uid());

DROP POLICY IF EXISTS "Recipients can view claimed transfer sessions" ON public.kiosk_transfer_sessions;
CREATE POLICY "Recipients can view claimed transfer sessions"
  ON public.kiosk_transfer_sessions
  FOR SELECT
  USING (recipient_user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all transfer sessions" ON public.kiosk_transfer_sessions;
CREATE POLICY "Admins can view all transfer sessions"
  ON public.kiosk_transfer_sessions
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Kiosk users can update own transfer sessions" ON public.kiosk_transfer_sessions;
CREATE POLICY "Kiosk users can update own transfer sessions"
  ON public.kiosk_transfer_sessions
  FOR UPDATE
  USING (kiosk_user_id = auth.uid())
  WITH CHECK (kiosk_user_id = auth.uid());

DROP POLICY IF EXISTS "Kiosk/recipient/admin can view transfer items" ON public.kiosk_transfer_items;
CREATE POLICY "Kiosk/recipient/admin can view transfer items"
  ON public.kiosk_transfer_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.kiosk_transfer_sessions s
      WHERE s.id = kiosk_transfer_items.session_id
        AND (
          s.kiosk_user_id = auth.uid()
          OR s.recipient_user_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

DROP TRIGGER IF EXISTS update_kiosk_transfer_sessions_updated_at ON public.kiosk_transfer_sessions;
CREATE TRIGGER update_kiosk_transfer_sessions_updated_at
  BEFORE UPDATE ON public.kiosk_transfer_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
