-- Drop the redundant ingredient_corrections table
-- Corrections are already stored in ingredient_validations
DROP TABLE IF EXISTS public.ingredient_corrections;