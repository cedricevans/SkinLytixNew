-- Allow reviewers (admin/moderator/certified) to view all analyses
-- Needed for reviewer dashboard and validation queues
DROP POLICY IF EXISTS "Reviewers can view all analyses" ON public.user_analyses;

CREATE POLICY "Reviewers can view all analyses"
  ON public.user_analyses
  FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'moderator')
    OR EXISTS (
      SELECT 1
      FROM public.student_certifications sc
      WHERE sc.user_id = auth.uid()
    )
  );
