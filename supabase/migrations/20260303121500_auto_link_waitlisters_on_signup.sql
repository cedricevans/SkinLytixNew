-- Auto-link waitlist records when a user account is created.
-- This keeps waitlist_special_pricing/user_badges in sync for magic-link signups.

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
    SET user_id = NEW.id
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

-- Backfill existing authenticated users that match the waitlist by email.
UPDATE public.waitlist_special_pricing wsp
SET user_id = p.id
FROM public.profiles p
WHERE wsp.user_id IS NULL
  AND p.email IS NOT NULL
  AND LOWER(wsp.email) = LOWER(p.email);

INSERT INTO public.user_badges (user_id, badge_type, metadata)
SELECT
  p.id,
  'waitlister',
  jsonb_build_object('source', 'waitlist', 'linked_email', LOWER(p.email))
FROM public.profiles p
JOIN public.waitlist w
  ON p.email IS NOT NULL
 AND LOWER(w.email) = LOWER(p.email)
ON CONFLICT (user_id, badge_type) DO NOTHING;
