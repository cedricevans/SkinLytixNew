-- Add image_url column to user_analyses for storing uploaded product images
ALTER TABLE public.user_analyses 
ADD COLUMN IF NOT EXISTS image_url TEXT;