# How to Apply Data Restore Migration to Supabase

**Status:** Migration file ready ✅  
**File:** `supabase/migrations/20260218_data_restore.sql`  
**Records:** 152 rows across 13 tables  
**Date:** February 18, 2026

---

## Quick Start (Recommended)

### **Step 1: Go to Supabase Dashboard**
Open: https://app.supabase.com/

### **Step 2: Select Your Project**
Project ID: `mzprefkjpyavwbtkebqj`

### **Step 3: Open SQL Editor**
1. Click on **SQL Editor** in the left sidebar
2. Click **New Query**

### **Step 4: Copy Migration SQL**
Copy the complete contents of:
```
supabase/migrations/20260218_data_restore.sql
```

### **Step 5: Paste & Run**
1. Paste the SQL into the editor
2. Click **Run** button (or press Cmd+Enter)

### **Step 6: Verify Success**
You should see:
```
Queries completed successfully
```

---

## What Gets Inserted

| Table | Records | Description |
|-------|---------|-------------|
| `user_roles` | 1 | Admin role assignment |
| `academic_institutions` | 1 | Spelman College founding partner |
| `profiles` | 2 | Sample users (admin + free tier) |
| `routines` | 27 | User skincare routines |
| `routine_products` | 2 | Products linked to routines |
| `routine_optimizations` | 1 | AI analysis with recommendations |
| `saved_dupes` | 2 | User's saved alternative products |
| `chat_conversations` | 1 | Chat session |
| `chat_messages` | 1 | Chat message |
| `feedback` | 1 | Product rating |
| `beta_feedback` | 1 | PMF survey response |
| `usage_limits` | 15 | Free tier usage tracking |
| `ingredient_explanations_cache` | 54 | Ingredient knowledge base |

**Total: 152 rows**

---

## Alternative: Command Line (Advanced)

If you prefer the terminal and have `psql` installed:

```bash
# Get connection details from Supabase dashboard first
# Database → Connection String → Password-protected URI

psql "postgresql://[user]:[password]@db.mzprefkjpyavwbtkebqj.supabase.co:5432/postgres" \
  < supabase/migrations/20260218_data_restore.sql
```

---

## Verify Data Was Imported

After running the migration, verify with these SQL queries:

```sql
-- Check user profiles
SELECT COUNT(*) as profile_count FROM profiles;
-- Expected: 2

-- Check routines
SELECT COUNT(*) as routine_count FROM routines;
-- Expected: 27

-- Check routine optimizations
SELECT COUNT(*) as optimization_count FROM routine_optimizations;
-- Expected: 1

-- Check ingredient cache
SELECT COUNT(*) as ingredient_count FROM ingredient_explanations_cache;
-- Expected: 54

-- Check usage limits
SELECT COUNT(*) as usage_count FROM usage_limits;
-- Expected: 15
```

---

## If Something Goes Wrong

### Error: "permission denied for schema public"
- Ensure you're logged in as a user with database write permissions
- Contact Supabase support if needed

### Error: "Duplicate key value violates unique constraint"
- Some data may already exist
- The migration uses `ON CONFLICT DO NOTHING` for safety
- Safe to re-run the migration

### Error: "Column does not exist"
- Ensure all 31 base migrations have been applied first
- Check: SQL Editor → Query → `SELECT * FROM _supabase_migrations;`

---

## What This Data Enables

✅ **Testing User Profiles**
- Admin user (alicia@xiosolutionsllc.com)
- Free tier user (nate.p233@gmail.com)

✅ **Testing Routines & Analysis**
- 27 real user routines
- 1 complete optimization analysis with AI recommendations
- Shows conflicts, cost savings, redundancies

✅ **Testing Features**
- Chat history
- Feedback/ratings
- Product comparisons (saved dupes)
- Usage tracking (free tier limits)

✅ **Testing Ingredient Display**
- 54 pre-cached ingredients with explanations
- Roles: humectant, emollient, active, preservative, etc.
- Sources: knowledge base + AI-generated

✅ **Testing Analytics**
- 15 usage limit records across multiple months
- Shows feature adoption patterns
- Free tier tracking

---

## Next Steps After Import

1. **Test the Admin Dashboard**
   - Login as: `alicia@xiosolutionsllc.com`
   - Verify 27 routines appear
   - Check optimization analysis displays correctly

2. **Test Feature Usage**
   - View usage limits in user settings
   - Verify chat functionality with existing conversation

3. **Test Ingredient Display**
   - Scan/upload a product
   - Verify ingredients show explanations from cache
   - Check ingredient roles are displayed

4. **Test Analytics Views**
   - Navigate to /analytics (admin only)
   - Verify data from usage_limits flows through
   - Check user event tracking

---

## File Location
`/Users/cedricevans/Downloads/Work_Station/Skinlytix/supabase/migrations/20260218_data_restore.sql`

## Questions?
Check the detailed summaries:
- `DATA_RESTORE_SUMMARY.md` — Complete breakdown
- `MIGRATION_SUMMARY.md` — Overall database structure

