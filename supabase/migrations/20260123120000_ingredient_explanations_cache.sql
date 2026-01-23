-- Ingredient explanation cache (AI/local explanations - permanent cache)
CREATE TABLE IF NOT EXISTS public.ingredient_explanations_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name TEXT NOT NULL,
  normalized_name TEXT UNIQUE NOT NULL,
  role TEXT,
  explanation TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ingredient_explanations_cache_name
  ON public.ingredient_explanations_cache(normalized_name);

ALTER TABLE public.ingredient_explanations_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can read ingredient explanations
CREATE POLICY "Anyone can read ingredient explanations"
  ON public.ingredient_explanations_cache FOR SELECT
  USING (true);
