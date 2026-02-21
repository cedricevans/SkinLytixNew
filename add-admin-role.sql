-- First, find the user ID for cedric.evans@gmail.com
-- Then insert the admin role

-- Get current user ID (you'll need to run this from authenticated context)
-- This script is for manual execution in Supabase SQL Editor

-- Find user by email
SELECT id, email FROM auth.users WHERE email = 'cedric.evans@gmail.com';

-- Then use that ID in the INSERT below:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('<USER_ID_HERE>', 'admin');

-- OR, if you know your user ID, run this directly:
-- INSERT INTO public.user_roles (user_id, role) VALUES ('4efb5df3-ce0a-40f6-ae13-6defa1610d3a', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
