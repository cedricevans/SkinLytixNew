-- Add OEW Workflow columns to ingredient_validations table
-- This migration adds support for the full Observation-Evidence-Writing framework
-- Date: February 21, 2026

-- 1. Add new columns to ingredient_validations
ALTER TABLE public.ingredient_validations ADD COLUMN IF NOT EXISTS (
  -- OEW Framework: Observation
  ai_claim_summary TEXT,
  
  -- OEW Framework: Evidence & Citations (references now in separate table)
  -- reference_sources JSONB already exists
  
  -- OEW Framework: Writing
  public_explanation TEXT,
  
  -- Confidence & Verdict
  confidence_level TEXT CHECK (confidence_level IN ('High', 'Moderate', 'Limited')),
  verdict TEXT CHECK (verdict IN ('confirm', 'correct', 'escalate')),
  
  -- Corrections (if verdict = 'correct')
  -- corrected_role, corrected_safety_level, correction_notes already exist
  
  -- Internal Review
  internal_notes TEXT,
  
  -- Escalation tracking (if verdict = 'escalate')
  is_escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  moderator_review_status TEXT DEFAULT 'pending' CHECK (moderator_review_status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  
  -- Timestamps
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create ingredient_validation_citations table (join table for many-to-many citations)
CREATE TABLE IF NOT EXISTS public.ingredient_validation_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to ingredient_validations
  validation_id UUID NOT NULL REFERENCES public.ingredient_validations(id) ON DELETE CASCADE,
  
  -- Citation metadata
  citation_type TEXT NOT NULL CHECK (citation_type IN (
    'peer_reviewed',
    'clinical_study', 
    'systematic_review',
    'dermatology_textbook',
    'cir_monograph',
    'other'
  )),
  
  -- Citation details
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  journal_name TEXT NOT NULL,
  publication_year INTEGER,
  
  -- Unique identifier (either DOI or PubMed ID)
  doi_or_pmid TEXT NOT NULL,
  
  -- Direct URL to source
  source_url TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index on citations table for faster lookups
CREATE INDEX IF NOT EXISTS idx_ingredient_validation_citations_validation_id 
  ON public.ingredient_validation_citations(validation_id);

CREATE INDEX IF NOT EXISTS idx_ingredient_validation_citations_doi_pmid 
  ON public.ingredient_validation_citations(doi_or_pmid);

-- 4. Enable RLS on citations table
ALTER TABLE public.ingredient_validation_citations ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for citations table
CREATE POLICY "Validators can insert citations for their validations"
  ON public.ingredient_validation_citations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ingredient_validations
      WHERE id = validation_id
      AND validator_id = auth.uid()
    )
  );

CREATE POLICY "Validators can view citations"
  ON public.ingredient_validation_citations FOR SELECT
  USING (true);

CREATE POLICY "Validators can delete their own citations"
  ON public.ingredient_validation_citations FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.ingredient_validations
      WHERE id = validation_id
      AND validator_id = auth.uid()
    )
  );

-- 6. Create enum types for verdict and confidence (optional, for better type safety)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verdict_type') THEN
    CREATE TYPE verdict_type AS ENUM ('confirm', 'correct', 'escalate');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'confidence_level_type') THEN
    CREATE TYPE confidence_level_type AS ENUM ('High', 'Moderate', 'Limited');
  END IF;
END $$;

-- 7. Update ingredient_validations RLS policies to support escalations
-- Drop old policies and recreate with escalation support
DROP POLICY IF EXISTS "Validators can update their own validations" ON public.ingredient_validations;
DROP POLICY IF EXISTS "Validators can insert their own validations" ON public.ingredient_validations;

CREATE POLICY "Validators can insert and upsert their own validations"
  ON public.ingredient_validations FOR INSERT
  WITH CHECK (validator_id = auth.uid());

CREATE POLICY "Validators can update their own validations"
  ON public.ingredient_validations FOR UPDATE
  USING (validator_id = auth.uid())
  WITH CHECK (validator_id = auth.uid());

-- Moderators and admins can review and approve escalations
CREATE POLICY "Moderators and admins can review escalated validations"
  ON public.ingredient_validations FOR UPDATE
  USING (
    is_escalated = true 
    AND (
      public.has_role(auth.uid(), 'admin') 
      OR public.has_role(auth.uid(), 'moderator')
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') 
    OR public.has_role(auth.uid(), 'moderator')
  );

-- 8. Create view for validation queue (unvalidated ingredients)
CREATE OR REPLACE VIEW public.ingredient_validation_queue AS
SELECT 
  ua.id as analysis_id,
  ua.user_id,
  ua.product_name,
  ua.brand,
  ua.category,
  ua.epiq_score,
  ua.analyzed_at,
  ia.ingredient_name,
  ia.ai_role_classification,
  ia.ai_safety_level,
  ia.ai_explanation,
  ia.pubchem_cid,
  ia.molecular_weight,
  COUNT(DISTINCT iv.id) as validation_count,
  MAX(iv.created_at) as last_validation_at
FROM public.user_analyses ua
JOIN public.ingredient_analyses ia ON ua.id = ia.analysis_id
LEFT JOIN public.ingredient_validations iv ON ia.ingredient_name = iv.ingredient_name AND ua.id = iv.analysis_id
WHERE iv.id IS NULL  -- Only unvalidated ingredients
GROUP BY ua.id, ia.ingredient_name, ia.ai_role_classification, ia.ai_safety_level, ia.ai_explanation, ia.pubchem_cid, ia.molecular_weight
ORDER BY ua.analyzed_at ASC;

-- 9. Create view for reviewer statistics
CREATE OR REPLACE VIEW public.reviewer_stats AS
SELECT 
  v.validator_id as user_id,
  v.validator_institution as institution,
  COUNT(*) as total_validations,
  COUNT(CASE WHEN v.verdict = 'confirm' THEN 1 END) as confirmed_validations,
  COUNT(CASE WHEN v.verdict = 'correct' THEN 1 END) as corrected_validations,
  COUNT(CASE WHEN v.verdict = 'escalate' THEN 1 END) as escalated_validations,
  COUNT(CASE WHEN v.confidence_level = 'High' THEN 1 END) as high_confidence_count,
  COUNT(CASE WHEN v.confidence_level = 'Moderate' THEN 1 END) as moderate_confidence_count,
  COUNT(CASE WHEN v.confidence_level = 'Limited' THEN 1 END) as limited_confidence_count,
  COUNT(CASE WHEN v.moderator_review_status = 'approved' THEN 1 END) as approved_count,
  COUNT(CASE WHEN v.moderator_review_status = 'rejected' THEN 1 END) as rejected_count,
  ROUND(
    100.0 * COUNT(CASE WHEN v.moderator_review_status = 'approved' THEN 1 END) / 
    NULLIF(COUNT(CASE WHEN v.moderator_review_status IS NOT NULL THEN 1 END), 0),
    2
  ) as approval_rate,
  MAX(v.updated_at) as last_validation_date
FROM public.ingredient_validations v
WHERE v.validator_id IS NOT NULL
GROUP BY v.validator_id, v.validator_institution;

-- 10. Create view for escalated validations (for moderator queue)
CREATE OR REPLACE VIEW public.escalated_validations_queue AS
SELECT 
  iv.id as validation_id,
  iv.analysis_id,
  iv.ingredient_name,
  iv.validator_id,
  iv.validator_institution,
  iv.ai_claim_summary,
  iv.escalation_reason,
  iv.confidence_level,
  iv.internal_notes,
  iv.is_escalated,
  iv.moderator_review_status,
  iv.created_at,
  iv.updated_at,
  ua.product_name,
  ua.brand,
  ua.category,
  uc.email as validator_email
FROM public.ingredient_validations iv
JOIN public.user_analyses ua ON iv.analysis_id = ua.id
LEFT JOIN public.auth.users uc ON iv.validator_id = uc.id
WHERE iv.is_escalated = true
  AND (iv.moderator_review_status = 'pending' OR iv.moderator_review_status = 'needs_revision')
ORDER BY iv.updated_at DESC;

-- 11. Grant appropriate permissions
GRANT SELECT ON public.ingredient_validation_queue TO anon, authenticated;
GRANT SELECT ON public.reviewer_stats TO authenticated;
GRANT SELECT ON public.escalated_validations_queue TO authenticated;

-- 12. Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION public.update_ingredient_validations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ingredient_validations_timestamp ON public.ingredient_validations;

CREATE TRIGGER update_ingredient_validations_timestamp
  BEFORE UPDATE ON public.ingredient_validations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ingredient_validations_timestamp();

-- 13. Backfill data: Mark existing validations as 'confirm' if they don't have a verdict
-- This preserves existing validation data
UPDATE public.ingredient_validations
SET verdict = 'confirm'
WHERE verdict IS NULL
  AND (ai_explanation_accurate = true OR pubchem_data_correct = true);

UPDATE public.ingredient_validations
SET verdict = 'correct'
WHERE verdict IS NULL
  AND correction_notes IS NOT NULL;

UPDATE public.ingredient_validations
SET verdict = 'escalate'
WHERE verdict IS NULL;

-- Set default confidence level based on accuracy
UPDATE public.ingredient_validations
SET confidence_level = 'High'
WHERE confidence_level IS NULL
  AND (pubchem_data_correct = true AND ai_explanation_accurate = true);

UPDATE public.ingredient_validations
SET confidence_level = 'Moderate'
WHERE confidence_level IS NULL
  AND (pubchem_data_correct = true OR ai_explanation_accurate = true);

UPDATE public.ingredient_validations
SET confidence_level = 'Limited'
WHERE confidence_level IS NULL;

-- Set default public_explanation from correction_notes if exists
UPDATE public.ingredient_validations
SET public_explanation = 'This ingredient requires further review. ' || COALESCE(correction_notes, 'See internal notes.')
WHERE public_explanation IS NULL
  AND correction_notes IS NOT NULL;

-- Update moderator_review_status for existing entries
UPDATE public.ingredient_validations
SET moderator_review_status = 
  CASE 
    WHEN verdict = 'escalate' THEN 'pending'
    ELSE 'approved'
  END
WHERE moderator_review_status IS NULL;
