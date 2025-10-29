-- Remove product database tables that are no longer needed
-- This cleanup maintains app integrity while removing redundant data storage

-- Drop foreign key dependencies first
DROP TABLE IF EXISTS public.product_ingredients CASCADE;

-- Drop products table
DROP TABLE IF EXISTS public.products CASCADE;

-- Clean up orphaned product_id references in user_analyses
UPDATE public.user_analyses 
SET product_id = NULL 
WHERE product_id IS NOT NULL;

-- Remove product_id column from user_analyses (cleanup)
ALTER TABLE public.user_analyses 
DROP COLUMN IF EXISTS product_id;