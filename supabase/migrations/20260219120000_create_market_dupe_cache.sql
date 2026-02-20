-- Create market_dupe_cache table for cached market dupes per user/product
CREATE TABLE IF NOT EXISTS public.market_dupe_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_product_id UUID NOT NULL REFERENCES public.user_analyses(id) ON DELETE CASCADE,
  dupes JSONB,
  dupes_count INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint for upsert on user_id + source_product_id
CREATE UNIQUE INDEX IF NOT EXISTS market_dupe_cache_user_product_unique
  ON public.market_dupe_cache(user_id, source_product_id);

CREATE INDEX IF NOT EXISTS market_dupe_cache_updated_at_idx
  ON public.market_dupe_cache(updated_at);

-- Enable RLS
ALTER TABLE public.market_dupe_cache ENABLE ROW LEVEL SECURITY;

-- Users can only access their own market dupe cache
CREATE POLICY "Users can view their market dupe cache"
ON public.market_dupe_cache FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their market dupe cache"
ON public.market_dupe_cache FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their market dupe cache"
ON public.market_dupe_cache FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their market dupe cache"
ON public.market_dupe_cache FOR DELETE
USING (auth.uid() = user_id);
