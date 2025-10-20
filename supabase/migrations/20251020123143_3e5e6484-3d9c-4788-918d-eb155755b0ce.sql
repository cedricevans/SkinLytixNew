-- Phase 1: Database Schema Enhancement
-- Add body/hair support columns to profiles table

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS body_concerns JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS product_preferences JSONB DEFAULT '{"face": true, "body": false, "hair": false}',
ADD COLUMN IF NOT EXISTS scalp_type TEXT;

-- Set default preferences for existing users (face-only to preserve current behavior)
UPDATE profiles 
SET product_preferences = '{"face": true, "body": false, "hair": false}'
WHERE product_preferences IS NULL;

-- Add routine_type column for Phase 8 (Routine Builder Enhancement)
ALTER TABLE routines
ADD COLUMN IF NOT EXISTS routine_type TEXT DEFAULT 'face' CHECK (routine_type IN ('face', 'body', 'hair'));

COMMENT ON COLUMN profiles.body_concerns IS 'Array of body-specific skin concerns (body-acne, eczema, keratosis-pilaris, etc.)';
COMMENT ON COLUMN profiles.product_preferences IS 'User preferences for product types they want to analyze';
COMMENT ON COLUMN profiles.scalp_type IS 'Scalp type for hair product analysis (oily, dry, normal, sensitive, dandruff-prone)';
COMMENT ON COLUMN routines.routine_type IS 'Type of routine: face, body, or hair';