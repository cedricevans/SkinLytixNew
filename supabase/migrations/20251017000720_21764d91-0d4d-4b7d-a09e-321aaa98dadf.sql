-- Phase 4.2 (Simplified): Lock down waitlist access
-- Remove overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view waitlist" ON public.waitlist;

-- INSERT policy already exists ("Anyone can join waitlist")
-- No SELECT policy = no one can read waitlist via API (secure by default)

-- Phase 5.1: Add defensive profile creation policy
-- This provides fallback if the trigger fails, preventing signup issues
CREATE POLICY "Users can create their own profile"
  ON public.profiles 
  FOR INSERT
  WITH CHECK (auth.uid() = id);