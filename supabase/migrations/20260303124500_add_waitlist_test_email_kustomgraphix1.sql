-- Add test waitlist user and a test special-pricing offer for magic-link validation.

INSERT INTO public.waitlist (
  first_name,
  last_name,
  email,
  skin_type,
  skin_condition,
  money_spent
)
VALUES (
  'Test',
  'Waitlister',
  'kustomgraphix1@gmail.com',
  'Combination',
  'Dark spots / Hyperpigmentation',
  '$25-$49'
)
ON CONFLICT (email) DO UPDATE
SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  skin_type = EXCLUDED.skin_type,
  skin_condition = EXCLUDED.skin_condition,
  money_spent = EXCLUDED.money_spent;

INSERT INTO public.waitlist_special_pricing (
  waitlist_user_id,
  user_id,
  email,
  promo_code,
  tier_offering,
  billing_cycle,
  discount_percentage,
  original_price,
  discounted_price,
  valid_from,
  valid_until,
  status,
  metadata
)
VALUES (
  (SELECT id FROM public.waitlist WHERE LOWER(email) = LOWER('kustomgraphix1@gmail.com') LIMIT 1),
  (SELECT id FROM public.profiles WHERE LOWER(email) = LOWER('kustomgraphix1@gmail.com') LIMIT 1),
  'kustomgraphix1@gmail.com',
  'WL_KG1_TEST01',
  'premium',
  'monthly',
  50,
  7.99,
  4.00,
  now(),
  now() + INTERVAL '30 days',
  'pending',
  '{"source":"manual_test_insert","note":"magic-link waitlist test user"}'::jsonb
)
ON CONFLICT (promo_code) DO UPDATE
SET
  waitlist_user_id = EXCLUDED.waitlist_user_id,
  user_id = EXCLUDED.user_id,
  email = EXCLUDED.email,
  tier_offering = EXCLUDED.tier_offering,
  billing_cycle = EXCLUDED.billing_cycle,
  discount_percentage = EXCLUDED.discount_percentage,
  original_price = EXCLUDED.original_price,
  discounted_price = EXCLUDED.discounted_price,
  valid_from = EXCLUDED.valid_from,
  valid_until = EXCLUDED.valid_until,
  status = EXCLUDED.status,
  metadata = EXCLUDED.metadata;
