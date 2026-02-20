-- Allow users to update their own analyses (needed for price edits in routines)
CREATE POLICY "Users can update their own analyses"
  ON public.user_analyses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
