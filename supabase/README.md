# Database Export - 2026-02-18

Complete data export for database cloning.

## Files

| File | Tables | Notes |
|------|--------|-------|
| `profiles.json` | profiles | All user profiles (50 users) |
| `small-tables.json` | user_roles, academic_institutions, saved_dupes, user_badges, student_certifications, expert_reviews, ingredient_validations, ingredient_articles, product_cache, waitlist | Small/empty reference tables |
| `routines.sql` | routines | User routines (SQL INSERTs) |
| `routine_products.sql` | routine_products | Products in routines (SQL INSERTs) |
| `chat_conversations.sql` | chat_conversations | Chat sessions (SQL INSERTs) |
| `chat_messages.sql` | chat_messages | Chat history (SQL INSERTs) |
| `feedback.sql` | feedback, beta_feedback, usage_limits | User feedback and usage tracking (SQL INSERTs) |
| `routine_optimizations.json` | routine_optimizations | AI optimization results (Large JSON) |

## Tables Exported via CSV (not included here)
These were exported manually from Cloud → Database → Tables:
- `user_analyses` (198 rows, large JSON)
- `ingredient_cache` (418 rows, large JSON)
- `user_events` (3,964 rows, high volume)
- `market_dupe_cache` (30 rows, large JSON)

## Tables NOT exported (operational/regenerable)
- `rate_limit_log` - Operational IP logs, will regenerate
- `ingredient_explanations_cache` - Will regenerate from AI/knowledge base

## Import Order (respects foreign keys)
1. profiles
2. user_roles
3. academic_institutions
4. user_analyses (from CSV)
5. routines
6. routine_products
7. routine_optimizations (from JSON)
8. chat_conversations
9. chat_messages
10. saved_dupes
11. market_dupe_cache (from CSV)
12. usage_limits
13. feedback
14. beta_feedback
15. user_events (from CSV)
16. ingredient_cache (from CSV)
17. ingredient_explanations_cache (regenerable)
18. All empty tables (user_badges, student_certifications, etc.)
