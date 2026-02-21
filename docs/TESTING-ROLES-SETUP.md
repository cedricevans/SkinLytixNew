# Testing & Setting Up Roles - Quick Guide

**Current Status:** ✅ Role infrastructure exists, but no UI admin page yet  
**Date:** February 21, 2026

---

## Current State

### ✅ What's Already Built
- **`user_roles` table** exists with `app_role` enum (admin, moderator, user)
- **RLS policies** enforce admin-only role management
- **StudentReviewer page** checks for moderator role + active certification
- **Role validation** in ProtectedRoute component

### ❌ What's Missing
- **No Admin Dashboard UI** to assign roles
- **No Role Management Page** for UI-based role assignment
- **No Certification Management UI** to create student certifications

---

## How to Test Roles Currently

### Option 1: Direct Database Insert (Fastest for Testing)

**Via Supabase Dashboard:**

1. Go to: https://app.supabase.com
2. Select project: `mzprefkjpyavwbtkebqj`
3. Navigate to: **SQL Editor**
4. Run this query to add a moderator role:

```sql
-- Insert moderator role for a user
INSERT INTO user_roles (user_id, role, created_at)
VALUES (
  '4efb5df3-ce0a-40f6-ae13-6defa1610d3a',  -- Replace with actual user_id
  'moderator',
  now()
)
ON CONFLICT (user_id, role) DO NOTHING;
```

**To find a user's ID:**
```sql
-- Find user ID by email
SELECT id, email FROM auth.users WHERE email = 'user@example.com';
```

**To create a student certification:**
```sql
INSERT INTO student_certifications (user_id, institution, certification_level, active)
VALUES (
  '4efb5df3-ce0a-40f6-ae13-6defa1610d3a',  -- User ID
  'University of California',                -- Institution name
  'apprentice',                              -- Level: apprentice, associate, or senior
  true                                       -- Active flag
);
```

---

### Option 2: Via Script (Better for Bulk Testing)

**Create file:** `test-roles.js`

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Use service role key (has admin powers)
);

async function setupTestUser(email, role, institution) {
  try {
    // 1. Find user by email
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) {
      console.log(`User ${email} not found`);
      return;
    }

    const userId = user.id;
    console.log(`Found user: ${email} (${userId})`);

    // 2. Add role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert({ user_id: userId, role }, { onConflict: 'user_id,role' });
    
    if (roleError) throw roleError;
    console.log(`✓ Added ${role} role`);

    // 3. Add certification if moderator
    if (role === 'moderator' && institution) {
      const { error: certError } = await supabase
        .from('student_certifications')
        .upsert(
          {
            user_id: userId,
            institution,
            certification_level: 'apprentice',
            active: true
          },
          { onConflict: 'user_id' }
        );
      
      if (certError) throw certError;
      console.log(`✓ Added apprentice certification for ${institution}`);
    }

    console.log(`✓ Setup complete for ${email}\n`);
  } catch (error) {
    console.error(`Error setting up ${email}:`, error.message);
  }
}

// Example usage
(async () => {
  await setupTestUser('cedric.evans@gmail.com', 'moderator', 'UC Berkeley');
  await setupTestUser('test@example.com', 'admin', null);
})();
```

**Run it:**
```bash
# Install dependencies first
npm install @supabase/supabase-js

# Set environment variables
export VITE_SUPABASE_URL="your_supabase_url"
export SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Run script
node test-roles.js
```

---

### Option 3: Test with Postman/cURL (For Checking Access)

**Test if user has moderator role:**

```bash
curl -X GET \
  'https://your-supabase-url/rest/v1/user_roles?user_id=eq.USER_ID&role=eq.moderator' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

**Check student certifications:**

```bash
curl -X GET \
  'https://your-supabase-url/rest/v1/student_certifications?user_id=eq.USER_ID&active=eq.true' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'apikey: YOUR_ANON_KEY'
```

---

## Testing the StudentReviewer Page

### Step 1: Set Up Test User with Role
```sql
-- Find your user ID
SELECT id, email FROM auth.users WHERE email = 'your-email@example.com';

-- Add moderator role
INSERT INTO user_roles (user_id, role)
VALUES ('YOUR_USER_ID', 'moderator')
ON CONFLICT (user_id, role) DO NOTHING;

-- Add certification
INSERT INTO student_certifications (user_id, institution, certification_level, active)
VALUES ('YOUR_USER_ID', 'Test University', 'apprentice', true)
ON CONFLICT (user_id) DO NOTHING;
```

### Step 2: Login to App
- Log in with the test user email
- Navigate to: `/dashboard/student-reviewer`
- Should see validation queue (if ingredients exist to validate)

### Step 3: Verify Access Control
- **With role + certification:** ✅ Access granted
- **Without role:** ❌ Access denied
- **Without certification:** ❌ Access denied

---

## Current Role-Based Access Rules

### `user_roles` Table
```
role = 'admin'     → Full system access, can manage all roles
role = 'moderator' → Can access StudentReviewer dashboard
role = 'user'      → Regular user, limited features
```

### StudentReviewer Page Requirements
```
✓ Has 'moderator' OR 'admin' role in user_roles
✓ Has active student_certifications record
✓ certification_level must be 'apprentice', 'associate', or 'senior'
✓ active = true
```

---

## How to Build the Admin Dashboard UI

When you're ready to create an admin UI (recommended post-MVP), you'll need:

### New Page: `/src/pages/AdminDashboard.tsx`

```typescript
// Check if user is admin
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId);

const isAdmin = roles?.some(r => r.role === 'admin');

// List all users with roles
const { data: userRoles } = await supabase
  .from('user_roles')
  .select('user_id, role, created_at');

// Add role to user
const { error } = await supabase
  .from('user_roles')
  .insert({ user_id, role });

// Create student certification
const { error } = await supabase
  .from('student_certifications')
  .insert({
    user_id,
    institution,
    certification_level: 'apprentice',
    active: true
  });
```

### Components Needed:
1. **UserRoleManager** - List users, assign roles
2. **CertificationManager** - Create/edit student certifications
3. **RoleSelector** - Dropdown to select admin/moderator/user
4. **InstitutionSelector** - Dropdown for universities

---

## Quick Testing Checklist

- [ ] User has moderator role in `user_roles`
- [ ] User has active `student_certifications` record
- [ ] Can access `/dashboard/student-reviewer` page
- [ ] Page shows "Access Denied" without both conditions
- [ ] Validation queue loads (if ingredients exist)
- [ ] Can see product analysis and ingredients to validate

---

## Troubleshooting

### "Access Denied" Error
1. Check if user has `moderator` role:
   ```sql
   SELECT * FROM user_roles WHERE user_id = 'YOUR_ID';
   ```
2. Check if user has active certification:
   ```sql
   SELECT * FROM student_certifications WHERE user_id = 'YOUR_ID' AND active = true;
   ```

### Role Not Applying
1. May need to refresh JWT token → Log out and log back in
2. Check RLS policies are correct on `user_roles` table
3. Verify `user_id` in insert matches actual Supabase user

### Can't Insert Role
1. Check UNIQUE constraint: `(user_id, role)` - can't add same role twice
2. Use `ON CONFLICT ... DO NOTHING` to avoid errors
3. Verify `user_id` exists in `auth.users`

---

## Next Steps (Post-MVP)

**Priority:** Create Admin Dashboard UI

**Include:**
1. User search/list view
2. Role assignment UI (checkboxes for admin/moderator/user)
3. Student certification creator
4. Institution selector (dropdown)
5. Bulk role import (CSV)
6. Audit log of who assigned what roles

**File to create:** `/src/pages/AdminDashboard.tsx`

---

## Current Database State

### `user_roles` Table
```sql
Columns:
  id (UUID)
  user_id (UUID) - FK to auth.users
  role (app_role enum: 'admin', 'moderator', 'user')
  created_at (TIMESTAMPTZ)
  
Constraint: UNIQUE (user_id, role)
RLS: Admins can manage all, users can view own
```

### `student_certifications` Table
```sql
Columns:
  id (UUID)
  user_id (UUID) - FK to auth.users
  institution (text)
  certification_level (text: 'apprentice', 'associate', 'senior')
  active (boolean)
  issued_at (TIMESTAMPTZ)
  expires_at (TIMESTAMPTZ, optional)
  
Constraint: UNIQUE (user_id)
RLS: Users view own, can create own
```

---

## Summary

**Current:** You can set roles via direct SQL or script  
**Recommended:** Use Supabase dashboard SQL editor for quick testing  
**Next:** Build Admin Dashboard UI for user-friendly role management

All role infrastructure is ready. Just need the UI layer to expose it.

---

**Questions?**
- Need help with SQL? See Supabase docs for `user_roles` table schema
- Want to test? Use the script above with your credentials
- Ready to build the UI? Start with AdminDashboard.tsx following the component pattern in the codebase
