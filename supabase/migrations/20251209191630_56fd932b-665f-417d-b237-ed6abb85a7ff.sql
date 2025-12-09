-- Create subscription tier enum
CREATE TYPE public.subscription_tier AS ENUM ('free', 'premium', 'pro');

-- Add subscription columns to profiles
ALTER TABLE public.profiles
ADD COLUMN subscription_tier subscription_tier DEFAULT 'free',
ADD COLUMN demo_mode_tier subscription_tier DEFAULT NULL,
ADD COLUMN trial_started_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN stripe_customer_id TEXT DEFAULT NULL,
ADD COLUMN stripe_subscription_id TEXT DEFAULT NULL;

-- Create usage_limits table for tracking free tier limits
CREATE TABLE public.usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  chat_messages_used INTEGER DEFAULT 0,
  routine_optimizations_used INTEGER DEFAULT 0,
  product_comparisons_used INTEGER DEFAULT 0,
  pdf_exports_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Enable RLS on usage_limits
ALTER TABLE public.usage_limits ENABLE ROW LEVEL SECURITY;

-- RLS policies for usage_limits
CREATE POLICY "Users can view their own usage limits"
ON public.usage_limits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage limits"
ON public.usage_limits
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage limits"
ON public.usage_limits
FOR UPDATE
USING (auth.uid() = user_id);

-- Create user_badges table for gamification
CREATE TABLE public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(user_id, badge_type)
);

-- Enable RLS on user_badges
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_badges
CREATE POLICY "Users can view their own badges"
ON public.user_badges
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can earn badges"
ON public.user_badges
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Add streak tracking to profiles
ALTER TABLE public.profiles
ADD COLUMN streak_count INTEGER DEFAULT 0,
ADD COLUMN last_activity_date DATE DEFAULT NULL;

-- Create trigger for usage_limits updated_at
CREATE TRIGGER update_usage_limits_updated_at
BEFORE UPDATE ON public.usage_limits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();