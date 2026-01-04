-- Expert reviews by students for academic partnership
CREATE TABLE public.expert_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES public.user_analyses(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  reviewer_institution TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'revision_needed')),
  epiq_calibration_note TEXT,
  ingredient_accuracy_score INTEGER CHECK (ingredient_accuracy_score >= 1 AND ingredient_accuracy_score <= 5),
  recommendation_quality_score INTEGER CHECK (recommendation_quality_score >= 1 AND recommendation_quality_score <= 5),
  comments TEXT,
  reviewed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student-authored ingredient articles
CREATE TABLE public.ingredient_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT,
  content_markdown TEXT NOT NULL,
  author_id UUID NOT NULL,
  author_name TEXT,
  author_institution TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  featured_image_url TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Student certifications for SkinLytix program
CREATE TABLE public.student_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  institution TEXT NOT NULL,
  certification_level TEXT NOT NULL DEFAULT 'associate' CHECK (certification_level IN ('associate', 'specialist', 'expert')),
  courses_completed JSONB DEFAULT '[]'::jsonb,
  reviews_completed INTEGER DEFAULT 0,
  articles_published INTEGER DEFAULT 0,
  certified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic institutions for multi-HBCU support
CREATE TABLE public.academic_institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_code TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  partnership_tier TEXT NOT NULL DEFAULT 'standard' CHECK (partnership_tier IN ('standard', 'premium', 'founding')),
  contact_email TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.expert_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_institutions ENABLE ROW LEVEL SECURITY;

-- Expert Reviews Policies
CREATE POLICY "Reviewers can view all reviews" ON public.expert_reviews
  FOR SELECT USING (true);

CREATE POLICY "Reviewers can create reviews" ON public.expert_reviews
  FOR INSERT WITH CHECK (auth.uid() = reviewer_id);

CREATE POLICY "Reviewers can update their own reviews" ON public.expert_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Ingredient Articles Policies
CREATE POLICY "Anyone can view published articles" ON public.ingredient_articles
  FOR SELECT USING (status = 'published' OR auth.uid() = author_id);

CREATE POLICY "Authors can create articles" ON public.ingredient_articles
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update their own articles" ON public.ingredient_articles
  FOR UPDATE USING (auth.uid() = author_id);

-- Student Certifications Policies
CREATE POLICY "Users can view their own certifications" ON public.student_certifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view certifications for trust signals" ON public.student_certifications
  FOR SELECT USING (certified_at IS NOT NULL);

CREATE POLICY "Users can create their own certification records" ON public.student_certifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Academic Institutions Policies (public read for trust signals)
CREATE POLICY "Anyone can view active institutions" ON public.academic_institutions
  FOR SELECT USING (active = true);

-- Create indexes for performance
CREATE INDEX idx_expert_reviews_analysis ON public.expert_reviews(analysis_id);
CREATE INDEX idx_expert_reviews_status ON public.expert_reviews(review_status);
CREATE INDEX idx_ingredient_articles_slug ON public.ingredient_articles(slug);
CREATE INDEX idx_ingredient_articles_status ON public.ingredient_articles(status);
CREATE INDEX idx_student_certifications_user ON public.student_certifications(user_id);
CREATE INDEX idx_academic_institutions_code ON public.academic_institutions(short_code);

-- Insert founding partner
INSERT INTO public.academic_institutions (name, short_code, partnership_tier, active)
VALUES ('Spelman College', 'SPELMAN', 'founding', true);