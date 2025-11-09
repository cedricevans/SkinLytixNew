-- Add explicit permissions to analytics views for security
-- These views aggregate data across all users and should only be accessible to admins
-- Access is controlled via:
-- 1. Database permissions (this migration)
-- 2. Frontend ProtectedRoute component
-- 3. Frontend useAnalytics hooks validation

-- Revoke public access from all analytics views
REVOKE ALL ON cta_performance_metrics FROM PUBLIC;
REVOKE ALL ON conversion_funnel_metrics FROM PUBLIC;
REVOKE ALL ON user_journey_analysis FROM PUBLIC;
REVOKE ALL ON engagement_metrics_summary FROM PUBLIC;

-- Grant SELECT only to authenticated users
-- Additional validation happens in frontend via user_roles table
GRANT SELECT ON cta_performance_metrics TO authenticated;
GRANT SELECT ON conversion_funnel_metrics TO authenticated;
GRANT SELECT ON user_journey_analysis TO authenticated;
GRANT SELECT ON engagement_metrics_summary TO authenticated;

-- Note: The user_roles table has proper RLS policies
-- Only authenticated admins can access /analytics route via ProtectedRoute
-- Frontend hooks perform additional admin validation before querying these views