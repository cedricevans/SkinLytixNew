-- Ensure waitlist signup linkage is tracked as an activation event.
-- This migration updates the auth signup hook and backfills existing linked users.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, subscription_tier, trial_started_at, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'free',
    NOW(),
    NOW() + INTERVAL '7 days'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);

  IF NEW.email IS NOT NULL THEN
    UPDATE public.waitlist_special_pricing wsp
    SET
      user_id = NEW.id,
      status = CASE
        WHEN wsp.status IN ('pending', 'sent') THEN 'activated'
        ELSE wsp.status
      END,
      activated_at = COALESCE(wsp.activated_at, NOW())
    WHERE wsp.user_id IS NULL
      AND LOWER(wsp.email) = LOWER(NEW.email);

    IF EXISTS (
      SELECT 1
      FROM public.waitlist w
      WHERE LOWER(w.email) = LOWER(NEW.email)
    ) THEN
      INSERT INTO public.user_badges (user_id, badge_type, metadata)
      VALUES (
        NEW.id,
        'waitlister',
        jsonb_build_object('source', 'waitlist', 'linked_email', LOWER(NEW.email))
      )
      ON CONFLICT (user_id, badge_type) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill linkage + activation status for any already-authenticated users.
UPDATE public.waitlist_special_pricing wsp
SET
  user_id = p.id,
  status = CASE
    WHEN wsp.status IN ('pending', 'sent') THEN 'activated'
    ELSE wsp.status
  END,
  activated_at = COALESCE(wsp.activated_at, NOW())
FROM public.profiles p
WHERE p.email IS NOT NULL
  AND LOWER(wsp.email) = LOWER(p.email)
  AND (
    wsp.user_id IS DISTINCT FROM p.id
    OR (wsp.status IN ('pending', 'sent') AND wsp.activated_at IS NULL)
  );

