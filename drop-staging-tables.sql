-- 🗑️  DROP ALL STAGING TABLES (CASCADE to remove dependencies)
DROP TABLE IF EXISTS public."user_analyses_staging" CASCADE;
DROP TABLE IF EXISTS public."user_events_staging" CASCADE;
DROP TABLE IF EXISTS public."user_roles_staging" CASCADE;
DROP TABLE IF EXISTS public."routines_staging" CASCADE;
DROP TABLE IF EXISTS public."routine_products_staging" CASCADE;
DROP TABLE IF EXISTS public."routine_optimizations_staging" CASCADE;
DROP TABLE IF EXISTS public."chat_conversations_staging" CASCADE;
DROP TABLE IF EXISTS public."chat_messages_staging" CASCADE;
DROP TABLE IF EXISTS public."feedback_staging" CASCADE;
DROP TABLE IF EXISTS public."beta_feedback_staging" CASCADE;
DROP TABLE IF EXISTS public."saved_dupes_staging" CASCADE;
DROP TABLE IF EXISTS public."usage_limits_staging" CASCADE;
DROP TABLE IF EXISTS public."profiles_staging" CASCADE;
DROP TABLE IF EXISTS public."rate_limit_log_staging" CASCADE;
DROP TABLE IF EXISTS public."ingredient_cache_staging" CASCADE;
DROP TABLE IF EXISTS public."academic_institutions_staging" CASCADE;
