# Production Incident Report - February 21, 2026

## Incident Summary
**Status:** 🟢 RESOLVED  
**Duration:** ~30 minutes  
**Impact:** 5 users unable to login (production database)  
**Root Cause:** Database enum migration created breaking changes to RLS policies

---

## What Happened

1. **Attempted Change:** Convert role naming from 'moderator' to 'reviewer' to align with documentation
2. **Issue:** Created enum migration that broke RLS policies and has_role() function
3. **Result:** Users couldn't authenticate - 400 Bad Request errors on login
4. **Discovery:** Database schema showed enum was in inconsistent state

---

## How It Was Fixed

**Action Taken:** Reverted database to stable state

1. ✅ Disabled RLS on user_roles table temporarily
2. ✅ Dropped broken policies and functions
3. ✅ Converted role column to TEXT (avoiding enum dependency)
4. ✅ Dropped all broken enum types
5. ✅ Created fresh `app_role` enum with values: `('admin', 'moderator', 'user')`
6. ✅ Recreated `has_role()` function
7. ✅ Recreated RLS policies
8. ✅ Re-enabled RLS

**Result:** Database restored to working state ✅

---

## Code Changes Made

### 1. Deleted Broken Migrations
```
supabase/migrations/20260221_update_roles_moderator_to_reviewer.sql (DELETED)
supabase/migrations/20260221_fix_ingredient_corrections_policies.sql (DELETED)
supabase/migrations/20260221_rollback_enum_migration.sql (DELETED)
```

### 2. Fixed UserRoleManager Component
**File:** `src/components/admin/UserRoleManager.tsx`

Changed role selector from:
```tsx
<SelectItem value="reviewer">Reviewer - Can validate ingredients</SelectItem>
```

To:
```tsx
<SelectItem value="moderator">Moderator - Can validate ingredients</SelectItem>
```

Also updated form reset value: `'reviewer'` → `'moderator'`

---

## Current State

### Database
- ✅ `app_role` enum: `('admin', 'moderator', 'user')`
- ✅ `user_roles` table: Working with proper RLS policies
- ✅ `has_role()` function: Restored and functional
- ✅ All RLS policies: Active and enforcing access control

### Application
- ✅ Users can login
- ✅ Admin dashboard accessible to authorized users
- ✅ Role management UI shows correct options
- ✅ Navigation shows admin link for authorized users

### Role System (Current)
```
admin     → Full system access, manage roles/certifications
moderator → Can validate ingredients, requires certification
user      → Default role, regular user access
```

---

## Why It Failed (Lessons Learned)

### Problem 1: No Staging Environment
The migration was applied directly to production without testing in a staging database first.

### Problem 2: Cascading Dependencies
Changing an enum type that's referenced by:
- RLS policies
- Functions (has_role)
- Table columns
...requires careful coordination or causes cascade failures.

### Problem 3: Migration Ordering
The migration tried to update the enum before updating all dependent code/policies. Should have:
1. Updated all policies/functions FIRST (to accept both names)
2. Changed enum SECOND
3. Updated code THIRD

---

## Prevention Going Forward

### ✅ Do NOT Attempt Again
The 'moderator' → 'reviewer' change should not be attempted in production.

### Why Keep 'Moderator'?
- **Database uses it:** Enum defined as 'moderator'
- **RLS policies use it:** has_role() checks for 'moderator'
- **Documentation gap:** Update docs instead of changing database

### Alternative: Update Documentation Only
If 'reviewer' terminology is needed:
- Update docs to clarify: "Moderators are reviewers"
- Update UI labels: "Moderator (Reviewer)" 
- Keep database as-is

### If Changes Are Needed in Future
1. **Test in staging first** - Apply ALL migrations to staging DB
2. **Validate in staging** - Test login, role assignment, access control
3. **Plan migration order** - Update code → update policies → update enums
4. **Have rollback ready** - Keep SQL to revert if needed
5. **Deploy during low-traffic time** - Minimize user impact

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `src/components/admin/UserRoleManager.tsx` | Updated role selector from 'reviewer' to 'moderator' | ✅ Complete |
| `docs/ROLE-SYSTEM-UPDATE-SUMMARY.md` | Created (documenting the change) | ✅ Created |
| Broken migrations (3 files) | DELETED - not needed | ✅ Deleted |

---

## Timeline

| Time | Event |
|------|-------|
| T+0m | User noticed role system had 2 options (admin, moderator) instead of 3 |
| T+5m | Created migration to rename moderator → reviewer |
| T+10m | Migration applied to database - BROKE LOGIN |
| T+15m | Identified broken enum and RLS policies |
| T+20m | Created rollback SQL |
| T+25m | Database restored to stable state |
| T+30m | Users able to login, UI fixed, production stable ✅ |

---

## Current Admin Access

**Authorized Admin Emails:**
- alicia@xiosolutionsllc.com
- cedric.evans@gmail.com
- pte295@gmail.com

**Features Available:**
- ✅ User & Roles management
- ✅ Certification management
- ✅ Reviewer group management
- ✅ Audit log tracking

---

## Sign-Off

**Incident Status:** 🟢 RESOLVED  
**Production Health:** ✅ STABLE  
**User Impact:** Resolved  
**Rollback Used:** Yes (database enum reverted)  
**Root Cause:** Enum migration without staging validation

---

## Recommendations

1. **Create staging environment** for database testing
2. **Use feature flags** for large schema changes
3. **Run migrations in transactions** with rollback capability
4. **Test authentication** after any RLS/role changes
5. **Document role naming** clearly in README to avoid future confusion

