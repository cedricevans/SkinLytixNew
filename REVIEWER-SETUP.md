# 👥 How to Add a User as a Reviewer

**Database Structure Found:** ✅ (from migration files)  
**Connection:** Direct (via Supabase Console or SQL)

---

## 🎯 Quick Answer

To make a user a **reviewer/moderator**, you need to:

### Option 1: Add Role via Supabase Console (GUI - Easiest)
1. Go to Supabase Dashboard
2. Find the `user_roles` table
3. Insert a new row with: `user_id` + `role: 'moderator'`
4. Done! ✅

### Option 2: Use SQL (Direct Database Query)
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_HERE', 'moderator');
```

### Option 3: Use Browser Console (JavaScript)
```javascript
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('user_roles').insert({
  user_id: 'TARGET_USER_ID',
  role: 'moderator'
});
console.log('✅ User added as moderator!');
```

---

## 📊 Database Structure (What I Found)

### `user_roles` Table
```sql
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  role app_role NOT NULL,  -- Can be: 'admin', 'moderator', 'user'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Available Roles
| Role | Permission | Access |
|------|-----------|--------|
| `admin` | Full system access | Everything |
| `moderator` | Review & approve validations | Reviewer dashboard + admin features |
| `user` | Regular user | Limited access |

---

## ✅ STEP-BY-STEP: Add a User as Moderator

### Method 1: Supabase Dashboard (GUI)

#### Step 1: Go to Supabase Console
```
https://supabase.com/dashboard
```

#### Step 2: Select Your Project
- Click on your SkinLytix project

#### Step 3: Go to SQL Editor
- Left sidebar → SQL Editor

#### Step 4: Run This Query
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('PASTE_USER_ID_HERE', 'moderator');
```

Replace `PASTE_USER_ID_HERE` with the actual user UUID

#### Step 5: Click "Run"
- Should see: "1 row inserted"

#### Step 6: Done! ✅
User now has `moderator` role

---

### Method 2: Supabase Data Editor (Visual GUI)

#### Step 1: Go to Supabase Console
```
https://supabase.com/dashboard
```

#### Step 2: Click "Editor" (left sidebar)

#### Step 3: Find `user_roles` Table
- Tables list → Click `user_roles`

#### Step 4: Click "Insert Row"
- Button at top right

#### Step 5: Fill in Fields
- **user_id:** Paste the user's UUID
- **role:** Select `moderator` from dropdown

#### Step 6: Click "Save"

#### Step 7: Done! ✅
User is now a moderator

---

### Method 3: Browser Console (If You Have Access)

#### Step 1: Go to Any Dashboard Page
```
http://localhost:8081/home
```
(Makes sure Supabase is loaded)

#### Step 2: Open Console (F12)

#### Step 3: Paste This Script
```javascript
const userId = 'PASTE_USER_ID_HERE'; // Replace with actual UUID

const { error } = await supabase.from('user_roles').insert({
  user_id: userId,
  role: 'moderator'
});

if (error) {
  console.error('❌ Error:', error.message);
} else {
  console.log('✅ User added as moderator!');
}
```

#### Step 4: Replace `PASTE_USER_ID_HERE` with Real UUID

#### Step 5: Press Enter

#### Step 6: See Success Message

---

## 🔑 How to Find User IDs

### From Supabase Console:

#### Step 1: Go to Supabase
```
https://supabase.com/dashboard
```

#### Step 2: Click "Authentication" (left sidebar)

#### Step 3: Click "Users" Tab

#### Step 4: Find the User
- Look for their email
- Click them
- Copy the **UUID** (in "User ID" field)
- This is the `user_id` you need

### From Browser Console:

Get your own UUID:
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Your User ID:', user.id);
```

---

## 📋 Full Process Example

### Example: Add John (john@example.com) as Moderator

#### Step 1: Find John's User ID
- Go to Supabase → Authentication → Users
- Find: john@example.com
- Copy UUID: `550e8400-e29b-41d4-a716-446655440000`

#### Step 2: Add Role via SQL
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'moderator');
```

#### Step 3: Verify It Worked
```sql
SELECT * FROM public.user_roles 
WHERE user_id = '550e8400-e29b-41d4-a716-446655440000';
```
Should show one row with `role: 'moderator'`

#### Step 4: John Can Now
- ✅ Access `/dashboard/reviewer`
- ✅ Validate ingredients
- ✅ Review other users' validations
- ✅ Access `/admin` dashboard

---

## 🎯 Verification

### Check If User Has Role:

#### Via SQL:
```sql
SELECT user_id, role FROM public.user_roles 
WHERE role = 'moderator';
```

#### Via Console:
```javascript
const { data: roles } = await supabase
  .from('user_roles')
  .select('*')
  .eq('role', 'moderator');
console.log('All moderators:', roles);
```

---

## ⚠️ Common Issues

### Issue: "User ID not found"
**Solution:** Make sure you copied the full UUID correctly
- UUID format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
- Copy from Supabase, not guessed

### Issue: "Duplicate key value"
**Solution:** User already has that role
- Check existing roles first:
  ```sql
  SELECT * FROM public.user_roles 
  WHERE user_id = 'USER_ID';
  ```

### Issue: "user_id does not exist"
**Solution:** User doesn't exist in auth.users
- Make sure user is registered in app first
- User must login at least once

### Issue: User still can't access reviewer dashboard
**Solution:** 
1. User needs to refresh page (Cmd/Ctrl + R)
2. Or logout and login again
3. Or clear browser cache (F12 → Application → Clear Site Data)

---

## 📊 Role Comparison

| Feature | User | Moderator | Admin |
|---------|------|-----------|-------|
| View products | ✅ | ✅ | ✅ |
| Validate ingredients | ❌ | ✅ | ✅ |
| Review validations | ❌ | ✅ | ✅ |
| Approve corrections | ❌ | ✅ | ✅ |
| Review escalations | ❌ | ✅ | ✅ |
| Access admin dashboard | ❌ | ✅ | ✅ |
| Manage users/roles | ❌ | ❌ | ✅ |
| System configuration | ❌ | ❌ | ✅ |

---

## 🚀 Next Steps

### After Adding User as Moderator:

1. **User should login again** or refresh page
2. **They can now access:** `/dashboard/reviewer`
3. **They can start:** Validating ingredients
4. **They see:** ReviewerAccuracyCard stats
5. **They can:** Do 6-step workflow

---

## 💡 Pro Tips

### Bulk Add Multiple Users:
```sql
INSERT INTO public.user_roles (user_id, role) VALUES
('USER_ID_1', 'moderator'),
('USER_ID_2', 'moderator'),
('USER_ID_3', 'moderator');
```

### Promote User from User to Moderator:
```sql
UPDATE public.user_roles 
SET role = 'moderator'
WHERE user_id = 'USER_ID' AND role = 'user';
```

### List All Moderators:
```sql
SELECT u.email, ur.role 
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'moderator';
```

---

## ✅ Complete Checklist

- [ ] Know the user's UUID (from Supabase Auth)
- [ ] Choose your method (SQL, GUI, or Console)
- [ ] Insert row into `user_roles` table
- [ ] Set `role` to `'moderator'`
- [ ] Verify it worked (query the table)
- [ ] Ask user to refresh/logout+login
- [ ] User can now access reviewer dashboard ✅

---

**Which method do you want to use?**

- **GUI (Easiest):** Supabase Data Editor
- **SQL (Fastest):** Direct SQL query
- **Console (Quickest):** JavaScript in browser

Let me know and I can provide more specific steps!
