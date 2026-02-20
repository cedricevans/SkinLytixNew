# Fix User Import Order - Critical Steps

## Problem
`user_analyses` import fails with foreign key error:
```
ERROR: violates foreign key constraint - user_id does not exist in profiles
```

### Root Cause
**Import order is wrong.** You need:
1. **Create auth users FIRST** (auth.users table - 54 unique emails)
2. **Then import profiles** (profiles table - references auth.users)
3. **Then import user_analyses** (references profiles.id)

---

## Current Status

### ✅ What's Already in Supabase
- **ingredient_cache**: 423 records ✓
- **ingredient_explanations_cache**: 54 records ✓
- **SQL migration data**: 145 records ✓
- **TOTAL**: ~625 records functional

### ❌ What's Blocked
- **profiles.json**: 54 profiles (NEED auth users first)
- **user_analyses**: 371 records (NEED profiles first)

---

## Solution: 3-Step Fix

### STEP 1: Create Auth Users in Supabase Dashboard

You must manually create auth users because **Supabase doesn't allow custom UUIDs** via API.

**Steps:**
1. Go to: [Supabase Dashboard](https://app.supabase.com)
2. Select project: `mzprefkjpyavwbtkebqj`
3. Go to: **Authentication** → **Users**
4. Click **"Invite user"** or **"Add user"** button

**Create users for these 54 emails:**

```
1. alicia@xiosolutionsllc.com
2. support@skinlytix.com
3. skylarxiomara@gmail.com
4. giger.shawnika@gmail.com
5. jones.k.kevin@gmail.com
6. skifle3@gmail.com
7. denaenicole@comcast.net
8. pdupass@gmail.com
9. exdupass@gmail.com
10. autumnanniase@icloud.com
11. axdupass@yahoo.com
12. james.goodnight05@gmail.com
13. icruse125@gmail.com
14. alton.jx@gmail.com
15. daniele@toolhouse.ai
16. joneskkevin@gmail.com
17. angelagrant.a@gmail.com
18. kharris488@gmail.com
19. livwilson105@gmail.com
20. victor.hicks@codingwithculture.com
21. chriseothomas@gmail.com
22. crtny_sumpter@yahoo.com
23. cyntressadickey@yahoo.com
24. kristi.hector@gmail.com
25. tiffany@outlook.con
26. nate.p233@gmail.com
27. milagrosestherfiguereo@gmail.com
28. jamienewby11@gmail.com
29. a.dupass@gmail.com
30. ejowharah@yahoo.com
31. ct_hammonds@yahoo.com
32. andrecosby87@gmail.com
33. gtjumperzo@gmail.com
34. danax16@gmail.com
35. shanellebwilliams@gmail.com
36. sandramccullough@yahoo.com
37. test_nov24@test.com
38. test_d67f@test.com
39. test_625b@test.com
40. test_1216@test.com
41. t_revere@yahoo.com
42. ladygist1@gmail.com
43. ssuziesuarez@gmail.com
44. test_45d2@test.com
45. test_80c0@test.com
46. test_8902@test.com
47. test_2a49@test.com
48. test_6413@test.com
49. test_b9eb@test.com
```

**For each user:**
- Enter Email
- Set Password (temporary)
- Click "Invite" or "Add"

⏱️ **This will take ~5-10 minutes for 54 users**

### STEP 2: Create UUID Mapping

After creating users in Supabase, they'll be assigned NEW UUIDs. You need to map:
- **Old UUID** (in profiles.json) → **New UUID** (from Supabase)

**Action:**
1. In Supabase Dashboard, go to: **Authentication** → **Users**
2. For each user, note the UUID assigned by Supabase
3. Create a JSON file `uuid-mapping.json` with format:

```json
{
  "4efb5df3-ce0a-40f6-ae13-6defa1610d3a": "actual-uuid-from-supabase-1",
  "1efb1396-aa1e-419c-8ba2-1b6366143783": "actual-uuid-from-supabase-2",
  ...
}
```

**OR provide the mapping via CSV:**
```
old_uuid,new_uuid
4efb5df3-ce0a-40f6-ae13-6defa1610d3a,<new-uuid>
1efb1396-aa1e-419c-8ba2-1b6366143783,<new-uuid>
...
```

### STEP 3: Update profiles.json with New UUIDs

Once you have the mapping, update `profiles.json` to use Supabase's UUIDs:

```bash
node supabase/update-uuid-mapping.js uuid-mapping.json
```

This will:
- Read the mapping file
- Update `profiles.json` to use new UUIDs
- Create backup of old file

### STEP 4: Import Data in Correct Order

```bash
# Dry run first
node supabase/import-csv-data.js --dry-run

# Then actually import
node supabase/import-csv-data.js
```

This will:
1. ✅ Import profiles (54 records)
2. ✅ Import user_analyses (371 records)

---

## Alternative: Faster Method (If Supabase Supports It)

If your Supabase project has **Auth Admin API** or **Postgres direct access**, you can:

```bash
# Check if service role can create users with custom UUIDs
psql -h <your-host> -U postgres -d postgres << 'EOF'
INSERT INTO auth.users (id, email, encrypted_password) 
VALUES ('4efb5df3-ce0a-40f6-ae13-6defa1610d3a', 'alicia@xiosolutionsllc.com', 'password_hash');
EOF
```

Ask your Supabase support if this is possible for your project.

---

## Commands to Run Now

### 1. View Required Users (Run Anytime)
```bash
node supabase/setup-auth-users.js
```

### 2. After Creating Users in Dashboard (Update UUIDs)
```bash
# Once you have the mapping
node supabase/update-uuid-mapping.js uuid-mapping.json
```

### 3. Import All Data
```bash
# Dry run first (safe to run anytime)
node supabase/import-csv-data.js --dry-run

# After Step 2 is complete
node supabase/import-csv-data.js
```

---

## File Locations

- **profiles.json**: `/supabase/profiles.json` (54 users to import)
- **user_analyses.csv**: `/supabase/user_analyses-export-2026-02-18_12-45-38.csv` (371 rows)
- **uuid-mapping.json**: Create this after Supabase user creation
- **import-csv-data.js**: Ready to run (handles both JSON and CSV)

---

## Success Criteria

After following these steps, you should have:

```
✅ 54 auth users created in Supabase
✅ 54 profiles imported 
✅ 371 user_analyses imported
✅ All foreign key constraints satisfied
✅ Database fully functional
```

---

## If You Get Stuck

1. **Can't create users via Dashboard?**
   - Try Supabase CLI: `supabase auth create-user --email <email> --password <pass>`

2. **Supabase won't accept 54 manual user creations?**
   - Contact Supabase support - ask about bulk user import or UUID preservation
   - Or: Create a subset of users for testing first

3. **UUID mapping too tedious?**
   - I can create an automated script if you export Supabase's user list as CSV

---

## Status: Ready to Proceed

Your import scripts are ready. You just need to:
1. ✋ Manually create auth users (if Supabase requires it)
2. 🗺️ Create UUID mapping 
3. ▶️ Run the import scripts

All scripts prepared and waiting.
