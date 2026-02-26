-- Add reviewer groups, membership, and admin audit logging

-- 1) Reviewer groups
CREATE TABLE IF NOT EXISTS public.reviewer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.reviewer_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.reviewer_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  added_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviewer_group_members_group
  ON public.reviewer_group_members(group_id);

CREATE INDEX IF NOT EXISTS idx_reviewer_group_members_user
  ON public.reviewer_group_members(user_id);

-- 2) Admin audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  admin_id UUID,
  admin_email TEXT,
  target_user_id UUID,
  target_user_email TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3) Enable RLS
ALTER TABLE public.reviewer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviewer_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4) Reviewer groups policies (admin/moderator only)
DROP POLICY IF EXISTS "Admins can manage reviewer groups" ON public.reviewer_groups;
CREATE POLICY "Admins can manage reviewer groups"
  ON public.reviewer_groups
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Admins can manage reviewer group members" ON public.reviewer_group_members;
CREATE POLICY "Admins can manage reviewer group members"
  ON public.reviewer_group_members
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- 5) Audit log policies (admin/moderator only)
DROP POLICY IF EXISTS "Admins can read audit logs" ON public.audit_logs;
CREATE POLICY "Admins can read audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Admins can write audit logs" ON public.audit_logs;
CREATE POLICY "Admins can write audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- 6) Student certifications admin policies
ALTER TABLE public.student_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all certifications" ON public.student_certifications;
CREATE POLICY "Admins can view all certifications"
  ON public.student_certifications
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Admins can insert certifications" ON public.student_certifications;
CREATE POLICY "Admins can insert certifications"
  ON public.student_certifications
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Admins can update certifications" ON public.student_certifications;
CREATE POLICY "Admins can update certifications"
  ON public.student_certifications
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

DROP POLICY IF EXISTS "Admins can delete certifications" ON public.student_certifications;
CREATE POLICY "Admins can delete certifications"
  ON public.student_certifications
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
