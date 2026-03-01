-- Admin-only helper for reviewer identity display
-- Allows admin dashboards to resolve validator user IDs to profile emails.

CREATE OR REPLACE FUNCTION public.get_reviewer_emails(p_user_ids UUID[])
RETURNS TABLE (id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.email
  FROM public.profiles p
  WHERE p.id = ANY(COALESCE(p_user_ids, ARRAY[]::UUID[]));
END;
$$;

REVOKE ALL ON FUNCTION public.get_reviewer_emails(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_reviewer_emails(UUID[]) TO authenticated;
