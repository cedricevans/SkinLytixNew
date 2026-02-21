# 🔑 How to Find & Use Real User UUIDs

**Error:**
```
ERROR: 22P02: invalid input syntax for type uuid: "PASTE_USER_UUID_HERE"
```

**Problem:**
You used the placeholder text instead of replacing it with a real UUID.

**Solution:**
Replace `PASTE_USER_UUID_HERE` with an actual user's UUID from your Supabase database.

---

## 🎯 **Step 1: Get a Real User UUID**

### **Option A: From Supabase Dashboard (Easiest)**

#### Step 1: Go to Supabase Console
```
https://supabase.com/dashboard
```

#### Step 2: Select Your Project
Click on your SkinLytix project

#### Step 3: Click "Authentication" (left sidebar)

#### Step 4: Click "Users" Tab
You'll see a list of all users

#### Step 5: Find a User
Look for any user by their email address

#### Step 6: Copy Their UUID
Click on the user → Copy the UUID field
- Format looks like: `550e8400-e29b-41d4-a716-446655440000`

---

### **Option B: From Browser Console**

If you're logged in to the app, you can get your own UUID:

#### Step 1: Open App
```
http://localhost:8081/home
```

#### Step 2: Open Console (F12)

#### Step 3: Run This Command
```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('Your UUID:', user.id);
```

#### Step 4: Copy Your UUID
Look at console output

---

## 📋 **Step 2: Use Real UUID in SQL Query**

### **WRONG (what you did):**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('PASTE_USER_UUID_HERE', 'moderator');
```
❌ This is a placeholder, not a real UUID

### **RIGHT (what to do):**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'moderator');
```
✅ This is a real UUID

---

## 🚀 **Complete Example**

### **Your Supabase Dashboard Shows:**
```
Users:
├─ john@example.com     UUID: a1b2c3d4-e5f6-7890-abcd-ef1234567890
├─ jane@example.com     UUID: b2c3d4e5-f6a7-8901-bcde-f12345678901
└─ admin@example.com    UUID: c3d4e5f6-a7b8-9012-cdef-123456789012
```

### **Use One of These Real UUIDs:**

#### Example 1: Add john@example.com as moderator
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'moderator');
```

#### Example 2: Add jane@example.com as moderator
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'moderator');
```

#### Example 3: Add admin@example.com as moderator
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'moderator');
```

---

## 🎯 **Step-by-Step: Fix Your Query**

### **Step 1: Go to Supabase Dashboard**
```
https://supabase.com/dashboard
```

### **Step 2: Click Authentication → Users**
You see a list of users

### **Step 3: Pick ANY User**
Example: `john@example.com`

### **Step 4: Click on That User**
A panel opens showing their details

### **Step 5: Find "User ID" Field**
It shows something like:
```
User ID: 550e8400-e29b-41d4-a716-446655440000
```

### **Step 6: Copy That UUID**
(Ctrl+C or Command+C)

### **Step 7: Go Back to SQL Editor**

### **Step 8: Paste UUID into Query**
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'moderator');
```

### **Step 9: Click Run**
✅ Should work now!

---

## ✅ **UUID Format**

A real UUID looks like:
```
550e8400-e29b-41d4-a716-446655440000
```

**Key Points:**
- 36 characters total
- 8 dash 4 dash 4 dash 4 dash 12
- Lowercase letters and numbers
- NOT the placeholder text!

---

## 🔍 **If No Users Exist**

If you see no users in the Authentication tab:

1. **You need to create a test user first**
2. Go to the app: `http://localhost:8081`
3. Click "Sign Up"
4. Create an account with email/password
5. This creates a user in the database
6. Now you can get their UUID and add them as reviewer

---

## 💡 **Pro Tip: Quick Test Setup**

### To test everything quickly:

#### Step 1: Create test user
- App: `http://localhost:8081`
- Click Sign Up
- Email: `test@example.com`
- Password: anything

#### Step 2: Get their UUID
- Supabase Dashboard → Authentication → Users
- Find `test@example.com`
- Copy their UUID

#### Step 3: Add as moderator
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('PASTE_REAL_UUID_HERE', 'moderator');
```

#### Step 4: User can now test
- Login to app as test@example.com
- Go to: `/dashboard/reviewer`
- Start validating ingredients

---

## ⚠️ **Common Mistakes**

### ❌ WRONG:
```sql
VALUES ('PASTE_USER_UUID_HERE', 'moderator');
```
This is a placeholder string, not a real UUID

### ❌ WRONG:
```sql
VALUES ('john@example.com', 'moderator');
```
Email is not a UUID

### ❌ WRONG:
```sql
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'user');
```
Role should be 'moderator' (not 'user') for reviewer

### ✅ RIGHT:
```sql
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'moderator');
```
Real UUID + correct role

---

## ✅ **Verification**

After you add the user, verify it worked:

```sql
SELECT u.email, ur.role 
FROM auth.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role = 'moderator';
```

You should see your user in the results!

---

## 🚀 **Next Steps**

1. **Get a real UUID** (from Supabase Users list)
2. **Replace the placeholder** in the SQL query
3. **Run the query**
4. **User is now a moderator!** ✅

---

**Ready? Go get a real UUID and try again!**

Need help finding users? Let me know!
