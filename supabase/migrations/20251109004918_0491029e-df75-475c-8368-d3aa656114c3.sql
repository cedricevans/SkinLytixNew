-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table with proper security
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create CTA performance metrics view
CREATE OR REPLACE VIEW cta_performance_metrics AS
SELECT 
  DATE(created_at) as date,
  event_name,
  COUNT(*) as total_clicks,
  COUNT(DISTINCT user_id) as unique_users,
  event_properties->>'location' as location,
  event_properties->>'text' as cta_text
FROM user_events
WHERE event_name IN ('demo_cta_clicked', 'signup_cta_clicked')
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), event_name, event_properties->>'location', event_properties->>'text'
ORDER BY date DESC;

-- Create conversion funnel metrics view
CREATE OR REPLACE VIEW conversion_funnel_metrics AS
WITH homepage_views AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as viewers
  FROM user_events
  WHERE event_name = 'page_viewed' AND page_url = '/'
  GROUP BY DATE(created_at)
),
demo_clicks AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as demo_users
  FROM user_events
  WHERE event_name = 'demo_cta_clicked'
  GROUP BY DATE(created_at)
),
signup_clicks AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as signup_users
  FROM user_events
  WHERE event_name = 'signup_cta_clicked'
  GROUP BY DATE(created_at)
),
completed_onboarding AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as onboarded_users
  FROM user_events
  WHERE event_name = 'onboarding_completed'
  GROUP BY DATE(created_at)
),
first_analyses AS (
  SELECT 
    DATE(analyzed_at) as date,
    COUNT(DISTINCT user_id) as analyzing_users
  FROM user_analyses
  GROUP BY DATE(analyzed_at)
)
SELECT 
  COALESCE(h.date, d.date, s.date, o.date, a.date) as date,
  COALESCE(h.viewers, 0) as homepage_views,
  COALESCE(d.demo_users, 0) as demo_clicks,
  COALESCE(s.signup_users, 0) as signup_clicks,
  COALESCE(o.onboarded_users, 0) as completed_onboarding,
  COALESCE(a.analyzing_users, 0) as first_analysis,
  CASE 
    WHEN COALESCE(h.viewers, 0) > 0 
    THEN ROUND(100.0 * COALESCE(d.demo_users, 0) / h.viewers, 2)
    ELSE 0 
  END as demo_ctr,
  CASE 
    WHEN COALESCE(h.viewers, 0) > 0 
    THEN ROUND(100.0 * COALESCE(s.signup_users, 0) / h.viewers, 2)
    ELSE 0 
  END as signup_ctr,
  CASE 
    WHEN COALESCE(s.signup_users, 0) > 0 
    THEN ROUND(100.0 * COALESCE(o.onboarded_users, 0) / s.signup_users, 2)
    ELSE 0 
  END as onboarding_completion_rate
FROM homepage_views h
FULL OUTER JOIN demo_clicks d ON h.date = d.date
FULL OUTER JOIN signup_clicks s ON COALESCE(h.date, d.date) = s.date
FULL OUTER JOIN completed_onboarding o ON COALESCE(h.date, d.date, s.date) = o.date
FULL OUTER JOIN first_analyses a ON COALESCE(h.date, d.date, s.date, o.date) = a.date
WHERE COALESCE(h.date, d.date, s.date, o.date, a.date) >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;

-- Create user journey analysis view
CREATE OR REPLACE VIEW user_journey_analysis AS
WITH user_actions AS (
  SELECT 
    user_id,
    MIN(CASE WHEN event_name = 'page_viewed' AND page_url = '/' THEN created_at END) as first_homepage_view,
    MIN(CASE WHEN event_name = 'demo_cta_clicked' THEN created_at END) as first_demo_click,
    MIN(CASE WHEN event_name = 'signup_cta_clicked' THEN created_at END) as first_signup_click,
    MIN(CASE WHEN event_name = 'onboarding_completed' THEN created_at END) as onboarding_completed,
    (SELECT MIN(analyzed_at) FROM user_analyses WHERE user_analyses.user_id = user_events.user_id) as first_analysis
  FROM user_events
  GROUP BY user_id
)
SELECT 
  COUNT(*) as total_users,
  COUNT(first_homepage_view) as viewed_homepage,
  COUNT(first_demo_click) as clicked_demo,
  COUNT(first_signup_click) as clicked_signup,
  COUNT(onboarding_completed) as completed_onboarding,
  COUNT(first_analysis) as completed_first_analysis,
  ROUND(100.0 * COUNT(first_demo_click) / NULLIF(COUNT(first_homepage_view), 0), 2) as homepage_to_demo_rate,
  ROUND(100.0 * COUNT(first_signup_click) / NULLIF(COUNT(first_homepage_view), 0), 2) as homepage_to_signup_rate,
  ROUND(100.0 * COUNT(onboarding_completed) / NULLIF(COUNT(first_signup_click), 0), 2) as signup_to_onboarding_rate,
  ROUND(100.0 * COUNT(first_analysis) / NULLIF(COUNT(onboarding_completed), 0), 2) as onboarding_to_analysis_rate,
  AVG(EXTRACT(EPOCH FROM (first_demo_click - first_homepage_view)) / 60)::INTEGER as avg_minutes_to_demo,
  AVG(EXTRACT(EPOCH FROM (first_signup_click - first_homepage_view)) / 60)::INTEGER as avg_minutes_to_signup,
  AVG(EXTRACT(EPOCH FROM (onboarding_completed - first_signup_click)) / 60)::INTEGER as avg_minutes_to_complete_onboarding
FROM user_actions
WHERE first_homepage_view >= CURRENT_DATE - INTERVAL '30 days';

-- Create engagement metrics summary view
CREATE OR REPLACE VIEW engagement_metrics_summary AS
WITH daily_metrics AS (
  SELECT 
    DATE(created_at) as date,
    COUNT(DISTINCT user_id) as daily_active_users,
    COUNT(*) FILTER (WHERE event_category = 'engagement') as engagement_events,
    COUNT(*) FILTER (WHERE event_category = 'conversion') as conversion_events,
    COUNT(*) FILTER (WHERE event_name = 'product_analyzed') as analyses,
    COUNT(*) FILTER (WHERE event_name = 'routine_created') as routines_created,
    COUNT(*) FILTER (WHERE event_name = 'routine_optimized') as routines_optimized
  FROM user_events
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY DATE(created_at)
)
SELECT 
  date,
  daily_active_users,
  engagement_events,
  conversion_events,
  analyses,
  routines_created,
  routines_optimized,
  ROUND(engagement_events::NUMERIC / NULLIF(daily_active_users, 0), 2) as avg_engagement_per_user,
  ROUND(conversion_events::NUMERIC / NULLIF(daily_active_users, 0), 2) as avg_conversions_per_user
FROM daily_metrics
ORDER BY date DESC;