-- Phase 2 reviewer/moderation updates:
-- - Add moderation/compatibility/nuance fields to ingredient_validations.
-- - Enforce moderator-only approval decisions.
-- - Expand reviewer access policy for user_analyses.

ALTER TABLE public.ingredient_validations
  ADD COLUMN IF NOT EXISTS nuance_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS compatibility_assessment text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS compatibility_notes text,
  ADD COLUMN IF NOT EXISTS moderator_feedback text,
  ADD COLUMN IF NOT EXISTS moderator_reviewed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS moderator_reviewer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.ingredient_validations
  DROP CONSTRAINT IF EXISTS ingredient_validations_compatibility_assessment_check;

ALTER TABLE public.ingredient_validations
  ADD CONSTRAINT ingredient_validations_compatibility_assessment_check
  CHECK (
    compatibility_assessment = ANY (
      ARRAY[
        'compatible'::text,
        'caution'::text,
        'avoid'::text,
        'needs_more_data'::text,
        'unknown'::text
      ]
    )
  );

CREATE INDEX IF NOT EXISTS idx_ingredient_validations_moderator_status
  ON public.ingredient_validations (moderator_review_status);

CREATE INDEX IF NOT EXISTS idx_ingredient_validations_moderator_reviewer
  ON public.ingredient_validations (moderator_reviewer_id);

DROP POLICY IF EXISTS "Reviewers can view all analyses" ON public.user_analyses;
CREATE POLICY "Reviewers can view all analyses"
  ON public.user_analyses
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'reviewer')
    OR EXISTS (
      SELECT 1
      FROM public.student_certifications sc
      WHERE sc.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Review stakeholders can view validations" ON public.ingredient_validations;
DROP POLICY IF EXISTS "Anyone can view validations" ON public.ingredient_validations;
CREATE POLICY "Review stakeholders can view validations"
  ON public.ingredient_validations
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'reviewer')
    OR EXISTS (
      SELECT 1
      FROM public.student_certifications sc
      WHERE sc.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_analyses ua
      WHERE ua.id = ingredient_validations.analysis_id
        AND ua.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Moderators can review all validations" ON public.ingredient_validations;
CREATE POLICY "Moderators can review all validations"
  ON public.ingredient_validations
  FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'moderator')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.enforce_validation_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id uuid;
  is_privileged boolean := false;
  old_status text;
  new_status text;
BEGIN
  actor_id := auth.uid();

  -- Allow trusted server-side jobs (auth.uid() is null) to manage state explicitly.
  IF actor_id IS NULL THEN
    is_privileged := true;
  ELSE
    is_privileged := public.has_role(actor_id, 'admin') OR public.has_role(actor_id, 'moderator');
  END IF;

  old_status := CASE
    WHEN TG_OP = 'INSERT' THEN 'pending'
    ELSE COALESCE(OLD.moderator_review_status, 'pending')
  END;
  new_status := COALESCE(NEW.moderator_review_status, 'pending');

  -- Non-moderators/non-admins cannot self-approve.
  IF NOT is_privileged THEN
    NEW.moderator_review_status := 'pending';
    NEW.moderator_feedback := NULL;
    NEW.moderator_reviewed_at := NULL;
    NEW.moderator_reviewer_id := NULL;
    RETURN NEW;
  END IF;

  -- Stamp moderation metadata whenever moderation status changes.
  IF new_status IS DISTINCT FROM old_status THEN
    IF new_status IN ('approved', 'rejected', 'needs_revision') THEN
      NEW.moderator_reviewed_at := NOW();
      NEW.moderator_reviewer_id := COALESCE(NEW.moderator_reviewer_id, actor_id);
    ELSIF new_status = 'pending' THEN
      NEW.moderator_reviewed_at := NULL;
      NEW.moderator_reviewer_id := NULL;
      NEW.moderator_feedback := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_validation_moderation_fields
  ON public.ingredient_validations;

CREATE TRIGGER enforce_validation_moderation_fields
  BEFORE INSERT OR UPDATE
  ON public.ingredient_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_validation_moderation_fields();
