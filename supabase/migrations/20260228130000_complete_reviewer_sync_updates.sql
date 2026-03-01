-- Complete reviewer workflow updates (revised):
-- 1) Source ID citation model + dynamic source requirements
-- 2) Reviewer correction permissions for user_analyses updates
-- 3) Verified-entry edit guard (admin or original verifier only)
-- 4) Two-way sync: ingredient validation changes -> analysis score + user events

-- ============================================================================
-- 1) Citation model updates (Source ID workflow)
-- ============================================================================

ALTER TABLE public.ingredient_validation_citations
  ADD COLUMN IF NOT EXISTS source_id TEXT;

ALTER TABLE public.ingredient_validation_citations
  ADD COLUMN IF NOT EXISTS requested_source_type TEXT;

UPDATE public.ingredient_validation_citations
SET source_id = COALESCE(source_id, doi_or_pmid)
WHERE source_id IS NULL
  AND doi_or_pmid IS NOT NULL;

-- Normalize only CIR legacy type. Keep other legacy types untouched so existing DOI rows
-- do not fail new numeric PMID/CID checks.
UPDATE public.ingredient_validation_citations
SET citation_type = 'cir'
WHERE citation_type = 'cir_monograph';

ALTER TABLE public.ingredient_validation_citations
  ALTER COLUMN doi_or_pmid DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ingredient_validation_citations_source_id
  ON public.ingredient_validation_citations(source_id);

ALTER TABLE public.ingredient_validation_citations
  DROP CONSTRAINT IF EXISTS ingredient_validation_citations_citation_type_check;

ALTER TABLE public.ingredient_validation_citations
  ADD CONSTRAINT ingredient_validation_citations_citation_type_check
  CHECK (
    citation_type IN (
      -- new source model
      'pubmed',
      'pubchem',
      'cir',
      'dermatology_textbook',
      'request_source_type',
      'other',
      -- legacy values kept for backward compatibility
      'peer_reviewed',
      'clinical_study',
      'systematic_review',
      'cir_monograph'
    )
  );

ALTER TABLE public.ingredient_validation_citations
  DROP CONSTRAINT IF EXISTS ingredient_validation_citations_source_id_requirements;

ALTER TABLE public.ingredient_validation_citations
  ADD CONSTRAINT ingredient_validation_citations_source_id_requirements
  CHECK (
    CASE
      WHEN citation_type = 'pubmed' THEN COALESCE(source_id ~ '^[0-9]+$', false)
      WHEN citation_type = 'pubchem' THEN COALESCE(source_id ~ '^[0-9]+$', false)
      WHEN citation_type = 'cir' THEN COALESCE(NULLIF(BTRIM(source_id), ''), '') <> ''
      WHEN citation_type = 'request_source_type' THEN COALESCE(NULLIF(BTRIM(requested_source_type), ''), '') <> ''
      WHEN citation_type IN ('peer_reviewed', 'clinical_study', 'systematic_review', 'cir_monograph')
        THEN COALESCE(NULLIF(BTRIM(source_id), ''), NULLIF(BTRIM(doi_or_pmid), ''), '') <> ''
      ELSE true
    END
  );

DROP POLICY IF EXISTS "Validators can delete their own citations" ON public.ingredient_validation_citations;
DROP POLICY IF EXISTS "Validators and admins can delete citations" ON public.ingredient_validation_citations;

CREATE POLICY "Validators and admins can delete citations"
  ON public.ingredient_validation_citations FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.ingredient_validations v
      WHERE v.id = validation_id
        AND (
          v.validator_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
        )
    )
  );

-- ============================================================================
-- 2) Reviewer correction permissions for product analyses
-- ============================================================================

DROP POLICY IF EXISTS "Reviewers can update analyses for correction workflows" ON public.user_analyses;

CREATE POLICY "Reviewers can update analyses for correction workflows"
  ON public.user_analyses
  FOR UPDATE
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR EXISTS (
      SELECT 1
      FROM public.student_certifications sc
      WHERE sc.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR EXISTS (
      SELECT 1
      FROM public.student_certifications sc
      WHERE sc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update any validations" ON public.ingredient_validations;
CREATE POLICY "Admins can update any validations"
  ON public.ingredient_validations
  FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Validators and admins can delete validations" ON public.ingredient_validations;
CREATE POLICY "Validators and admins can delete validations"
  ON public.ingredient_validations
  FOR DELETE
  USING (
    validator_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- ============================================================================
-- 3) Guard verified validation edits (admin or original verifier only)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_verified_validation_editor()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID;
BEGIN
  actor_id := auth.uid();

  -- For authenticated client updates, verified rows are locked to admin/original verifier.
  IF OLD.validation_status = 'validated'
     AND actor_id IS NOT NULL
     AND actor_id <> OLD.validator_id
     AND NOT public.has_role(actor_id, 'admin')
  THEN
    RAISE EXCEPTION 'Only admins or the original verifier can edit verified entries';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_verified_validation_editor ON public.ingredient_validations;
CREATE TRIGGER enforce_verified_validation_editor
  BEFORE UPDATE ON public.ingredient_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_verified_validation_editor();

-- ============================================================================
-- 4) Two-way sync: validation changes update analysis score + create events
-- ============================================================================

CREATE OR REPLACE FUNCTION public.recalculate_analysis_score_from_validations(p_analysis_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_ingredients INTEGER := 0;
  v_existing_score INTEGER := 70;
  v_baseline_score INTEGER := 70;
  v_new_score INTEGER := 70;
  v_validated_count INTEGER := 0;
  v_needs_correction_count INTEGER := 0;
  v_pending_count INTEGER := 0;
  v_worked_on_count INTEGER := 0;
  v_safe_count INTEGER := 0;
  v_concern_count INTEGER := 0;
  v_needs_more_data_count INTEGER := 0;
  v_validated_ingredients JSONB := '[]'::jsonb;
  v_needs_correction_ingredients JSONB := '[]'::jsonb;
  v_pending_ingredients JSONB := '[]'::jsonb;
  v_safe_ingredients JSONB := '[]'::jsonb;
  v_problematic_ingredients JSONB := '[]'::jsonb;
  v_concern_ingredients JSONB := '[]'::jsonb;
  v_worked_on_ingredients JSONB := '[]'::jsonb;
  v_recommendations JSONB := '{}'::jsonb;
BEGIN
  SELECT
    COALESCE(ua.epiq_score, 70),
    COALESCE(ua.recommendations_json, '{}'::jsonb),
    COALESCE(
      (
        SELECT COUNT(*)
        FROM unnest(regexp_split_to_array(COALESCE(ua.ingredients_list, ''), '\s*,\s*')) AS ing
        WHERE BTRIM(ing) <> ''
      ),
      0
    )
  INTO v_existing_score, v_recommendations, v_total_ingredients
  FROM public.user_analyses ua
  WHERE ua.id = p_analysis_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_baseline_score := CASE
    WHEN COALESCE(v_recommendations #>> '{verification_summary,baseline_score}', '') ~ '^-?[0-9]+$'
      THEN (v_recommendations #>> '{verification_summary,baseline_score}')::INTEGER
    ELSE v_existing_score
  END;

  IF v_total_ingredients <= 0 THEN
    RETURN v_existing_score;
  END IF;

  WITH analysis_ingredients AS (
    SELECT DISTINCT ON (LOWER(BTRIM(ing)))
      BTRIM(ing) AS ingredient_name,
      LOWER(BTRIM(ing)) AS ingredient_key
    FROM unnest(regexp_split_to_array(COALESCE((SELECT ua.ingredients_list FROM public.user_analyses ua WHERE ua.id = p_analysis_id), ''), '\s*,\s*')) AS ing
    WHERE BTRIM(ing) <> ''
    ORDER BY LOWER(BTRIM(ing)), BTRIM(ing)
  ),
  ai_entries AS (
    SELECT
      LOWER(BTRIM(
        CASE
          WHEN jsonb_typeof(item) = 'string' THEN BTRIM(item::text, '"')
          ELSE COALESCE(item->>'name', '')
        END
      )) AS ingredient_key,
      'safe'::TEXT AS ai_label,
      item AS ai_item
    FROM jsonb_array_elements(COALESCE(v_recommendations->'safe_ingredients', '[]'::jsonb)) item

    UNION ALL

    SELECT
      LOWER(BTRIM(
        CASE
          WHEN jsonb_typeof(item) = 'string' THEN BTRIM(item::text, '"')
          ELSE COALESCE(item->>'name', '')
        END
      )) AS ingredient_key,
      'concern'::TEXT AS ai_label,
      item AS ai_item
    FROM jsonb_array_elements(COALESCE(v_recommendations->'problematic_ingredients', '[]'::jsonb)) item

    UNION ALL

    SELECT
      LOWER(BTRIM(
        CASE
          WHEN jsonb_typeof(item) = 'string' THEN BTRIM(item::text, '"')
          ELSE COALESCE(item->>'name', '')
        END
      )) AS ingredient_key,
      'needs_more_data'::TEXT AS ai_label,
      item AS ai_item
    FROM jsonb_array_elements(COALESCE(v_recommendations->'concern_ingredients', '[]'::jsonb)) item
  ),
  ai_classification AS (
    SELECT DISTINCT ON (ingredient_key)
      ingredient_key,
      ai_label,
      ai_item
    FROM ai_entries
    WHERE ingredient_key <> ''
    ORDER BY ingredient_key,
      CASE ai_label
        WHEN 'safe' THEN 1
        WHEN 'concern' THEN 2
        ELSE 3
      END
  ),
  latest_validation AS (
    SELECT DISTINCT ON (LOWER(BTRIM(ingredient_name)))
      LOWER(BTRIM(ingredient_name)) AS ingredient_key,
      validation_status,
      COALESCE(NULLIF(LOWER(BTRIM(corrected_safety_level)), ''), '') AS corrected_safety_level,
      public_explanation,
      correction_notes,
      verdict,
      confidence_level,
      validator_id,
      updated_at
    FROM public.ingredient_validations
    WHERE analysis_id = p_analysis_id
    ORDER BY LOWER(BTRIM(ingredient_name)), updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
  ),
  ingredient_statuses AS (
    SELECT
      ai.ingredient_key,
      ai.ingredient_name,
      COALESCE(lv.validation_status, 'pending') AS validation_status,
      CASE
        WHEN lv.corrected_safety_level IN ('safe', 'low_risk', 'low risk') THEN 'safe'
        WHEN lv.corrected_safety_level IN ('concern', 'unsafe', 'caution', 'avoid', 'high_risk', 'high risk') THEN 'concern'
        WHEN lv.corrected_safety_level IN ('needs_more_data', 'needs more data', 'needs_data', 'unverified', 'unknown', 'pending') THEN 'needs_more_data'
        WHEN COALESCE(lv.validation_status, 'pending') = 'validated' THEN 'safe'
        WHEN COALESCE(lv.validation_status, 'pending') = 'needs_correction' THEN 'concern'
        WHEN ac.ai_label IS NOT NULL THEN ac.ai_label
        ELSE 'needs_more_data'
      END AS final_label,
      (lv.validation_status IS NOT NULL OR lv.verdict IS NOT NULL OR lv.public_explanation IS NOT NULL OR lv.confidence_level IS NOT NULL) AS worked_on,
      ac.ai_item,
      lv.public_explanation,
      lv.correction_notes,
      lv.verdict,
      lv.confidence_level,
      lv.validator_id,
      lv.updated_at
    FROM analysis_ingredients ai
    LEFT JOIN latest_validation lv ON lv.ingredient_key = ai.ingredient_key
    LEFT JOIN ai_classification ac ON ac.ingredient_key = ai.ingredient_key
  )
  SELECT
    COUNT(*) FILTER (WHERE validation_status = 'validated'),
    COUNT(*) FILTER (WHERE validation_status = 'needs_correction'),
    COUNT(*) FILTER (WHERE validation_status = 'pending'),
    COUNT(*) FILTER (WHERE worked_on),
    COUNT(*) FILTER (WHERE final_label = 'safe'),
    COUNT(*) FILTER (WHERE final_label = 'concern'),
    COUNT(*) FILTER (WHERE final_label = 'needs_more_data'),
    COALESCE(jsonb_agg(ingredient_name ORDER BY ingredient_name) FILTER (WHERE validation_status = 'validated'), '[]'::jsonb),
    COALESCE(jsonb_agg(ingredient_name ORDER BY ingredient_name) FILTER (WHERE validation_status = 'needs_correction'), '[]'::jsonb),
    COALESCE(jsonb_agg(ingredient_name ORDER BY ingredient_name) FILTER (WHERE validation_status = 'pending'), '[]'::jsonb),
    COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(ai_item) = 'object' THEN
            ai_item || jsonb_build_object(
              'name', COALESCE(NULLIF(ai_item->>'name', ''), ingredient_name),
              'reviewed', worked_on,
              'reviewed_at', updated_at,
              'review_summary', public_explanation,
              'confidence', confidence_level,
              'verdict', verdict,
              'validator_id', validator_id
            )
          ELSE
            jsonb_build_object(
              'name', ingredient_name,
              'reviewed', worked_on,
              'reviewed_at', updated_at,
              'review_summary', public_explanation,
              'confidence', confidence_level,
              'verdict', verdict,
              'validator_id', validator_id
            )
        END
        ORDER BY ingredient_name
      ) FILTER (WHERE final_label = 'safe'),
      '[]'::jsonb
    ),
    COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(ai_item) = 'object' THEN
            ai_item || jsonb_build_object(
              'name', COALESCE(NULLIF(ai_item->>'name', ''), ingredient_name),
              'reason', COALESCE(correction_notes, ai_item->>'reason', public_explanation),
              'reviewed', worked_on,
              'reviewed_at', updated_at,
              'confidence', confidence_level,
              'verdict', verdict,
              'validator_id', validator_id
            )
          ELSE
            jsonb_build_object(
              'name', ingredient_name,
              'reason', COALESCE(correction_notes, public_explanation),
              'reviewed', worked_on,
              'reviewed_at', updated_at,
              'confidence', confidence_level,
              'verdict', verdict,
              'validator_id', validator_id
            )
        END
        ORDER BY ingredient_name
      ) FILTER (WHERE final_label = 'concern'),
      '[]'::jsonb
    ),
    COALESCE(
      jsonb_agg(
        CASE
          WHEN jsonb_typeof(ai_item) = 'object' THEN
            ai_item || jsonb_build_object(
              'name', COALESCE(NULLIF(ai_item->>'name', ''), ingredient_name),
              'explanation', COALESCE(public_explanation, ai_item->>'explanation', correction_notes),
              'reviewed', worked_on,
              'reviewed_at', updated_at,
              'confidence', confidence_level,
              'verdict', verdict,
              'validator_id', validator_id
            )
          ELSE
            jsonb_build_object(
              'name', ingredient_name,
              'explanation', COALESCE(public_explanation, correction_notes),
              'reviewed', worked_on,
              'reviewed_at', updated_at,
              'confidence', confidence_level,
              'verdict', verdict,
              'validator_id', validator_id
            )
        END
        ORDER BY ingredient_name
      ) FILTER (WHERE final_label = 'needs_more_data'),
      '[]'::jsonb
    ),
    COALESCE(jsonb_agg(ingredient_name ORDER BY ingredient_name) FILTER (WHERE worked_on), '[]'::jsonb)
  INTO
    v_validated_count,
    v_needs_correction_count,
    v_pending_count,
    v_worked_on_count,
    v_safe_count,
    v_concern_count,
    v_needs_more_data_count,
    v_validated_ingredients,
    v_needs_correction_ingredients,
    v_pending_ingredients,
    v_safe_ingredients,
    v_problematic_ingredients,
    v_concern_ingredients,
    v_worked_on_ingredients
  FROM ingredient_statuses;

  v_total_ingredients := v_safe_count + v_concern_count + v_needs_more_data_count;

  -- Apply verification adjustments to a stable baseline score to avoid drift.
  -- Score is based on final reviewer label, not verdict, so Safe/Concern directly drives user updates.
  v_new_score := LEAST(
    100,
    GREATEST(
      0,
      v_baseline_score + (v_safe_count * 2) - (v_concern_count * 6)
    )
  );

  UPDATE public.user_analyses
  SET
    epiq_score = v_new_score,
    recommendations_json = (v_recommendations
      - 'safe_ingredients'
      - 'problematic_ingredients'
      - 'concern_ingredients') || jsonb_build_object(
      'safe_ingredients', v_safe_ingredients,
      'problematic_ingredients', v_problematic_ingredients,
      'concern_ingredients', v_concern_ingredients,
      'verification_summary',
      jsonb_build_object(
        'baseline_score', v_baseline_score,
        'validated_count', v_validated_count,
        'needs_correction_count', v_needs_correction_count,
        'pending_count', v_pending_count,
        'worked_on_count', v_worked_on_count,
        'safe_count', v_safe_count,
        'concern_count', v_concern_count,
        'needs_more_data_count', v_needs_more_data_count,
        'score_safe_count', v_safe_count,
        'score_concern_count', v_concern_count,
        'score_model', 'baseline + (safe * 2) - (concern * 6)',
        'validated_ingredients', v_validated_ingredients,
        'needs_correction_ingredients', v_needs_correction_ingredients,
        'pending_ingredients', v_pending_ingredients,
        'worked_on_ingredients', v_worked_on_ingredients,
        'safe_ingredients', v_safe_ingredients,
        'concern_ingredients', v_problematic_ingredients,
        'needs_more_data_ingredients', v_concern_ingredients,
        'total_ingredients', v_total_ingredients,
        'last_synced_at', NOW()
      )
    )
  WHERE id = p_analysis_id;

  RETURN v_new_score;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_validation_to_analysis_and_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_analysis_id UUID;
  v_user_id UUID;
  v_before_score INTEGER;
  v_after_score INTEGER;
  v_ingredient_name TEXT;
  v_was_validated BOOLEAN := false;
  v_is_validated BOOLEAN := false;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_analysis_id := OLD.analysis_id;
    v_ingredient_name := OLD.ingredient_name;
    v_was_validated := COALESCE(OLD.validation_status, '') = 'validated';
    v_is_validated := false;
  ELSIF TG_OP = 'INSERT' THEN
    v_analysis_id := NEW.analysis_id;
    v_ingredient_name := NEW.ingredient_name;
    v_was_validated := false;
    v_is_validated := COALESCE(NEW.validation_status, '') = 'validated';
  ELSE
    v_analysis_id := COALESCE(NEW.analysis_id, OLD.analysis_id);
    v_ingredient_name := COALESCE(NEW.ingredient_name, OLD.ingredient_name);
    v_was_validated := COALESCE(OLD.validation_status, '') = 'validated';
    v_is_validated := COALESCE(NEW.validation_status, '') = 'validated';
  END IF;

  IF v_analysis_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  SELECT ua.user_id, ua.epiq_score
  INTO v_user_id, v_before_score
  FROM public.user_analyses ua
  WHERE ua.id = v_analysis_id;

  IF NOT FOUND THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    END IF;
    RETURN NEW;
  END IF;

  v_after_score := public.recalculate_analysis_score_from_validations(v_analysis_id);

  -- Notification event: an ingredient just became validated.
  IF v_user_id IS NOT NULL
     AND TG_OP <> 'DELETE'
     AND v_is_validated
     AND NOT v_was_validated
  THEN
    INSERT INTO public.user_events (
      user_id,
      event_name,
      event_category,
      event_properties,
      page_url
    ) VALUES (
      v_user_id,
      'ingredient_validated',
      'verification',
      jsonb_build_object(
        'analysis_id', v_analysis_id,
        'ingredient_name', v_ingredient_name
      ),
      '/analysis/' || v_analysis_id::text
    );
  END IF;

  -- Notification event: score changed after validation updates.
  IF v_user_id IS NOT NULL
     AND v_before_score IS DISTINCT FROM v_after_score
  THEN
    INSERT INTO public.user_events (
      user_id,
      event_name,
      event_category,
      event_properties,
      page_url
    ) VALUES (
      v_user_id,
      'product_score_changed',
      'verification',
      jsonb_build_object(
        'analysis_id', v_analysis_id,
        'previous_score', v_before_score,
        'new_score', v_after_score
      ),
      '/analysis/' || v_analysis_id::text
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_validation_to_analysis_and_events ON public.ingredient_validations;
CREATE TRIGGER sync_validation_to_analysis_and_events
  AFTER INSERT OR UPDATE OR DELETE ON public.ingredient_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_validation_to_analysis_and_events();
