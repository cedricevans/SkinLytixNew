-- Add has_seen_walkthrough column to profiles table
ALTER TABLE profiles 
ADD COLUMN has_seen_walkthrough BOOLEAN DEFAULT FALSE;

-- Update existing users to have has_seen_walkthrough = true (so they don't see it)
UPDATE profiles 
SET has_seen_walkthrough = TRUE 
WHERE is_profile_complete = TRUE;