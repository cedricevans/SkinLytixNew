-- Reviewer/Admin work queue for unresolved ingredient validations.
-- Keeps all scanned ingredients, but exposes a focused queue of items that are not yet validated.

CREATE OR REPLACE VIEW public.reviewer_ingredient_work_queue AS
WITH analysis_ingredients AS (
  SELECT
    ua.id AS analysis_id,
    ua.user_id,
    ua.product_name,
    ua.brand,
    BTRIM(ing) AS ingredient_name,
    LOWER(BTRIM(ing)) AS ingredient_key,
    ua.analyzed_at
  FROM public.user_analyses ua
  CROSS JOIN LATERAL unnest(regexp_split_to_array(COALESCE(ua.ingredients_list, ''), '\\s*,\\s*')) AS ing
  WHERE BTRIM(ing) <> ''
),
latest_validation AS (
  SELECT DISTINCT ON (iv.analysis_id, LOWER(BTRIM(iv.ingredient_name)))
    iv.analysis_id,
    LOWER(BTRIM(iv.ingredient_name)) AS ingredient_key,
    iv.validation_status,
    COALESCE(NULLIF(LOWER(BTRIM(iv.corrected_safety_level)), ''), '') AS corrected_safety_level,
    iv.verdict,
    iv.public_explanation,
    iv.validator_id,
    iv.updated_at,
    iv.created_at
  FROM public.ingredient_validations iv
  ORDER BY iv.analysis_id, LOWER(BTRIM(iv.ingredient_name)), iv.updated_at DESC NULLS LAST, iv.created_at DESC NULLS LAST, iv.id DESC
),
joined AS (
  SELECT
    ai.analysis_id,
    ai.user_id,
    ai.product_name,
    ai.brand,
    ai.ingredient_name,
    ai.ingredient_key,
    ai.analyzed_at,
    COALESCE(lv.validation_status, 'pending') AS validation_status,
    CASE
      WHEN lv.corrected_safety_level IN ('safe', 'low_risk', 'low risk') THEN 'safe'
      WHEN lv.corrected_safety_level IN ('concern', 'unsafe', 'caution', 'avoid', 'high_risk', 'high risk') THEN 'concern'
      WHEN lv.corrected_safety_level IN ('needs_more_data', 'needs more data', 'needs_data', 'unverified', 'unknown', 'pending') THEN 'needs_more_data'
      WHEN COALESCE(lv.validation_status, 'pending') = 'validated' THEN 'safe'
      WHEN COALESCE(lv.validation_status, 'pending') = 'needs_correction' THEN 'concern'
      ELSE 'needs_more_data'
    END AS final_label,
    (lv.validation_status IS NOT NULL OR lv.verdict IS NOT NULL OR lv.public_explanation IS NOT NULL) AS worked_on,
    lv.verdict,
    lv.validator_id,
    COALESCE(lv.updated_at, lv.created_at, ai.analyzed_at) AS last_activity_at
  FROM analysis_ingredients ai
  LEFT JOIN latest_validation lv
    ON lv.analysis_id = ai.analysis_id
   AND lv.ingredient_key = ai.ingredient_key
)
SELECT DISTINCT ON (analysis_id, ingredient_key)
  analysis_id,
  user_id,
  product_name,
  brand,
  ingredient_name,
  validation_status,
  validator_id,
  (final_label = 'needs_more_data') AS needs_review,
  last_activity_at,
  final_label,
  worked_on,
  verdict
FROM joined
ORDER BY analysis_id, ingredient_key, last_activity_at DESC NULLS LAST;

GRANT SELECT ON public.reviewer_ingredient_work_queue TO authenticated;
