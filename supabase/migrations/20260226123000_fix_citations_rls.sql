-- Fix RLS for ingredient_validation_citations inserts (reviewer workflow)
-- Ensures validators and reviewer roles can insert citations for their validations

-- Ensure validations are selectable (needed for RLS subquery)
DROP POLICY IF EXISTS "Anyone can view validations" ON public.ingredient_validations;
CREATE POLICY "Anyone can view validations"
  ON public.ingredient_validations FOR SELECT
  USING (true);

-- Replace citation insert policy with reviewer-aware policy
DROP POLICY IF EXISTS "Validators can insert citations for their validations" ON public.ingredient_validation_citations;
CREATE POLICY "Validators and reviewers can insert citations"
  ON public.ingredient_validation_citations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.ingredient_validations v
      WHERE v.id = validation_id
        AND (
          v.validator_id = auth.uid()
          OR public.has_role(auth.uid(), 'admin')
          OR public.has_role(auth.uid(), 'moderator')
          OR EXISTS (
            SELECT 1 FROM public.student_certifications sc
            WHERE sc.user_id = auth.uid()
          )
        )
    )
  );
