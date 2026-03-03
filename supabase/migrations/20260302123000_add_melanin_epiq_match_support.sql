-- Add melanin-aware profile fields and EpiQ Match metadata support.
-- Keeps existing epiq_score (0-100) as the canonical numeric score while deriving user-facing EpiQ Match fields.

-- -----------------------------------------------------------------------------
-- 1) Profile extensions for melanin-aware scoring
-- -----------------------------------------------------------------------------
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS melanin_level SMALLINT,
  ADD COLUMN IF NOT EXISTS sensitivities JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS pregnancy_safe BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS vegan BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_melanin_level_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_melanin_level_check
  CHECK (melanin_level IS NULL OR melanin_level BETWEEN 1 AND 6);

COMMENT ON COLUMN public.profiles.melanin_level IS 'Optional Fitzpatrick-adjacent melanin level (1-6) used for PIH-aware compatibility logic.';
COMMENT ON COLUMN public.profiles.sensitivities IS 'Ingredient sensitivities selected by user (e.g. fragrance, alcohol).';
COMMENT ON COLUMN public.profiles.pregnancy_safe IS 'Whether user requested pregnancy-safe filtering logic.';
COMMENT ON COLUMN public.profiles.vegan IS 'Whether user requested vegan-only compatibility filtering.';

-- -----------------------------------------------------------------------------
-- 2) user_analyses EpiQ Match and trust-signal columns
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_analyses
  ADD COLUMN IF NOT EXISTS epiq_match_tier TEXT,
  ADD COLUMN IF NOT EXISTS epiq_match_pct INTEGER,
  ADD COLUMN IF NOT EXISTS epiq_match_color TEXT,
  ADD COLUMN IF NOT EXISTS verdict TEXT,
  ADD COLUMN IF NOT EXISTS melanin_alert BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS melanin_alert_message TEXT,
  ADD COLUMN IF NOT EXISTS show_epiq_score_sublabel BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS validation_status TEXT DEFAULT 'ai_scored',
  ADD COLUMN IF NOT EXISTS confidence_score TEXT DEFAULT 'moderate',
  ADD COLUMN IF NOT EXISTS epiq_engine_version TEXT DEFAULT 'v2.1',
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB DEFAULT '{}'::jsonb;

ALTER TABLE public.user_analyses
  DROP CONSTRAINT IF EXISTS user_analyses_epiq_match_pct_check;
ALTER TABLE public.user_analyses
  ADD CONSTRAINT user_analyses_epiq_match_pct_check
  CHECK (epiq_match_pct IS NULL OR (epiq_match_pct >= 0 AND epiq_match_pct <= 100));

ALTER TABLE public.user_analyses
  DROP CONSTRAINT IF EXISTS user_analyses_verdict_check;
ALTER TABLE public.user_analyses
  ADD CONSTRAINT user_analyses_verdict_check
  CHECK (verdict IS NULL OR verdict IN ('compatible', 'caution', 'avoid'));

ALTER TABLE public.user_analyses
  DROP CONSTRAINT IF EXISTS user_analyses_validation_status_check;
ALTER TABLE public.user_analyses
  ADD CONSTRAINT user_analyses_validation_status_check
  CHECK (
    validation_status IS NULL
    OR validation_status IN ('ai_scored', 'analyst_reviewed', 'flagged_for_review', 'escalated')
  );

ALTER TABLE public.user_analyses
  DROP CONSTRAINT IF EXISTS user_analyses_confidence_score_check;
ALTER TABLE public.user_analyses
  ADD CONSTRAINT user_analyses_confidence_score_check
  CHECK (confidence_score IS NULL OR confidence_score IN ('low', 'moderate', 'high'));

CREATE INDEX IF NOT EXISTS idx_user_analyses_melanin_alert
  ON public.user_analyses (melanin_alert)
  WHERE melanin_alert = true;

CREATE INDEX IF NOT EXISTS idx_user_analyses_epiq_match_tier
  ON public.user_analyses (epiq_match_tier);

-- -----------------------------------------------------------------------------
-- 3) Helper: map score + alert -> tier/color/verdict
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.derive_epiq_match(
  p_epiq_score INTEGER,
  p_melanin_alert BOOLEAN
)
RETURNS TABLE (
  tier TEXT,
  pct INTEGER,
  color TEXT,
  verdict TEXT,
  show_epiq_score_sublabel BOOLEAN
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_score INTEGER := LEAST(100, GREATEST(0, COALESCE(p_epiq_score, 0)));
BEGIN
  IF COALESCE(p_melanin_alert, false) THEN
    RETURN QUERY SELECT
      'Melanin Alert'::TEXT,
      v_score,
      '#A855F7'::TEXT,
      'caution'::TEXT,
      false;
    RETURN;
  END IF;

  IF v_score >= 90 THEN
    RETURN QUERY SELECT 'Excellent Match', v_score, '#22C55E', 'compatible', true;
  ELSIF v_score >= 75 THEN
    RETURN QUERY SELECT 'Strong Match', v_score, '#84CC16', 'compatible', true;
  ELSIF v_score >= 55 THEN
    RETURN QUERY SELECT 'Moderate Match', v_score, '#EAB308', 'caution', true;
  ELSIF v_score >= 30 THEN
    RETURN QUERY SELECT 'Low Match', v_score, '#F97316', 'caution', true;
  ELSE
    RETURN QUERY SELECT 'Not a Match', v_score, '#EF4444', 'avoid', true;
  END IF;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4) Trigger: keep EpiQ Match fields in sync for inserts/updates
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_user_analysis_epiq_match_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_match RECORD;
  v_melanin_alert BOOLEAN := COALESCE(NEW.melanin_alert, false);
  v_score INTEGER := LEAST(100, GREATEST(0, COALESCE(NEW.epiq_score, 0)));
BEGIN
  -- Backward-compatible melanin alert inference from recommendations_json
  IF NOT v_melanin_alert AND NEW.recommendations_json IS NOT NULL THEN
    IF jsonb_typeof(NEW.recommendations_json->'melanin_alert') = 'boolean' THEN
      v_melanin_alert := COALESCE((NEW.recommendations_json->>'melanin_alert')::BOOLEAN, false);
    END IF;

    IF NOT v_melanin_alert
       AND jsonb_typeof(NEW.recommendations_json->'melanin_alert_ingredients') = 'array'
       AND jsonb_array_length(NEW.recommendations_json->'melanin_alert_ingredients') > 0
    THEN
      v_melanin_alert := true;
    END IF;
  END IF;

  SELECT *
  INTO v_match
  FROM public.derive_epiq_match(v_score, v_melanin_alert);

  NEW.epiq_score := v_score;
  NEW.melanin_alert := v_melanin_alert;
  NEW.epiq_match_tier := v_match.tier;
  NEW.epiq_match_pct := v_match.pct;
  NEW.epiq_match_color := v_match.color;
  NEW.verdict := v_match.verdict;
  NEW.show_epiq_score_sublabel := v_match.show_epiq_score_sublabel;

  IF NEW.melanin_alert AND COALESCE(NULLIF(BTRIM(NEW.melanin_alert_message), ''), '') = '' THEN
    NEW.melanin_alert_message := 'Review Before Use - ingredients may affect melanated skin differently.';
  END IF;

  NEW.validation_status := COALESCE(NULLIF(BTRIM(NEW.validation_status), ''), 'ai_scored');
  NEW.confidence_score := COALESCE(NULLIF(BTRIM(NEW.confidence_score), ''), 'moderate');
  NEW.epiq_engine_version := COALESCE(NULLIF(BTRIM(NEW.epiq_engine_version), ''), 'v2.1');
  NEW.score_breakdown := COALESCE(NEW.score_breakdown, '{}'::jsonb);

  NEW.recommendations_json := COALESCE(NEW.recommendations_json, '{}'::jsonb)
    || jsonb_build_object(
      'epiq_match', jsonb_build_object(
        'tier', NEW.epiq_match_tier,
        'pct', NEW.epiq_match_pct,
        'color', NEW.epiq_match_color,
        'verdict', NEW.verdict
      ),
      'melanin_alert', NEW.melanin_alert,
      'melanin_alert_message', NEW.melanin_alert_message,
      'show_epiq_score_sublabel', NEW.show_epiq_score_sublabel,
      'validation_status', NEW.validation_status,
      'confidence_score', NEW.confidence_score,
      'epiq_engine_version', NEW.epiq_engine_version,
      'score_breakdown', NEW.score_breakdown
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_analysis_epiq_match_fields ON public.user_analyses;

CREATE TRIGGER trg_sync_user_analysis_epiq_match_fields
  BEFORE INSERT OR UPDATE OF epiq_score, recommendations_json, melanin_alert, melanin_alert_message, validation_status, confidence_score, score_breakdown
  ON public.user_analyses
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_analysis_epiq_match_fields();

-- Backfill existing rows so new columns are populated immediately.
UPDATE public.user_analyses
SET
  epiq_score = COALESCE(epiq_score, 0),
  recommendations_json = COALESCE(recommendations_json, '{}'::jsonb);
