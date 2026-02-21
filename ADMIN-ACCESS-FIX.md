# 🔧 FIX: Admin Can't Access Reviewer Dashboard

**Issue:** You're logged in as admin but can't see the reviewer dashboard  
**Root Cause:** Access check may be failing silently  
**Solution:** Multiple fixes below

---

## 🔍 Why This Happens

The StudentReviewer dashboard at `/dashboard/reviewer` checks for:

```
Admin OR Moderator role → ALLOWS access
OR
Student Certification → ALLOWS access
```

Even though you're admin, the check might be failing because:
1. ❌ Role not properly stored in database
2. ❌ User_id mismatch
3. ❌ Role name doesn't match exactly
4. ❌ Silent redirect without clear error

---

## ✅ SOLUTION 1: Direct Admin Access (Fastest)

As an admin, you have TWO options:

### Option A: Use Admin Dashboard
```
http://localhost:8081/admin
```
This is the admin-only dashboard where you can:
- See all validations
- Review submissions
- Approve/reject corrections
- View reviewer stats
- Manage escalations

### Option B: Add Student Certification to Yourself
To also access the reviewer dashboard:

**Step 1:** Open browser DevTools console (F12)
**Step 2:** Run this command:
```javascript
// Add student certification to your account
await supabase
  .from('student_certifications')
  .insert({
    user_id: (await supabase.auth.getUser()).data.user.id,
    institution: 'SkinLytix Admin',
    certification_level: 'expert',
    verified_at: new Date().toISOString()
  });
```
**Step 3:** Refresh page and try `/dashboard/reviewer` again

---

## ✅ SOLUTION 2: Verify Your Admin Role

**Check 1: Confirm Admin Role Exists**

Open browser console (F12) and run:
```javascript
// Check your current user
const { data: { user } } = await supabase.auth.getUser();
console.log('Your User ID:', user.id);

// Check your roles
const { data: roles } = await supabase
  .from('user_roles')
  .select('*')
  .eq('user_id', user.id);
console.log('Your Roles:', roles);
```

**Expected Output:**
```
Your User ID: [some-uuid]
Your Roles: [{ user_id: [uuid], role: 'admin' }]
```

**If empty or wrong:**
- Your role might not be set
- Run this to add it:
```javascript
const { data: { user } } = await supabase.auth.getUser();
await supabase
  .from('user_roles')
  .insert({
    user_id: user.id,
    role: 'admin'
  });
```

---

## ✅ SOLUTION 3: Verify Access & Load Data

**If you want to use the reviewer dashboard (not admin):**

**Step 1:** Ensure you have both:
- [x] Admin role in `user_roles`
- [x] Student certification in `student_certifications`

**Step 2:** Navigate to:
```
http://localhost:8081/dashboard/reviewer
```

**Step 3:** Open browser console (F12) and check:
- [ ] No red error messages
- [ ] See message: "Access granted" or similar
- [ ] ProductAnalysis loads products
- [ ] ReviewerAccuracyCard displays stats

---

## 📊 Dashboard Comparison

### Admin Dashboard (`/admin`)
**Access:** Admins only  
**Purpose:** Review and manage all validations  
**Features:**
- ✅ See all user submissions
- ✅ Approve/reject corrections
- ✅ Review escalations
- ✅ View reviewer performance
- ✅ Manage system-wide settings
- ✅ View statistics & analytics

### Reviewer Dashboard (`/dashboard/reviewer`)
**Access:** Reviewers + Student Certified users  
**Purpose:** Review products and validate ingredients  
**Features:**
- ✅ Validate product ingredients
- ✅ 6-step workflow (Observation → Evidence → Writing → Confidence → Verdict → Notes)
- ✅ View personal validation stats
- ✅ Track your review progress
- ✅ See your accuracy metrics

---

## 🎯 Recommended Path for You (Admin)

Since you're an **admin**, here's what makes sense:

### Option 1: Test Admin Features (Recommended)
```
Go to: http://localhost:8081/admin
```
You'll see the admin dashboard where you can:
- Review validations that have been submitted
- Manage corrections
- View escalations
- See reviewer performance metrics

### Option 2: Also Test as Reviewer
If you want to test BOTH as admin AND as reviewer:

**Step A:** Run this in browser console (F12):
```javascript
// Add student cert to yourself
const { data: { user } } = await supabase.auth.getUser();
await supabase
  .from('student_certifications')
  .insert({
    user_id: user.id,
    institution: 'SkinLytix',
    certification_level: 'expert',
    verified_at: new Date().toISOString()
  });
```

**Step B:** Refresh page (Cmd/Ctrl + R)

**Step C:** Go to: `http://localhost:8081/dashboard/reviewer`

Now you can access both dashboards!

---

## 🚀 Quick Start (Choose Your Path)

### Path 1: Admin Testing Only
```
1. Open: http://localhost:8081/admin
2. See admin dashboard
3. Review validations here
```

### Path 2: Admin + Reviewer Testing
```
1. Open console (F12)
2. Run student cert insert script
3. Refresh page
4. Go to: http://localhost:8081/dashboard/reviewer
5. See reviewer dashboard
6. Test 6-step workflow
7. Then go to: http://localhost:8081/admin
8. See validations appear in admin review
```

---

## 📋 URL Reference for Admins

| Page | URL | What You See |
|------|-----|---|
| Admin Dashboard | `/admin` | Manage all validations |
| Reviewer Dashboard | `/dashboard/reviewer` | Validate ingredients (need cert) |
| Settings | `/settings` | Account settings |
| Home | `/home` | Main app home |

---

## ⚠️ Troubleshooting

### Issue: Still can't access after adding role/cert
**Solution:**
1. Hard refresh page: **Cmd/Ctrl + Shift + R**
2. Clear browser cache
3. Check browser console (F12) for errors
4. Restart dev server

### Issue: Error message on page
**Solution:**
1. Open browser console (F12)
2. Look for red error messages
3. Copy exact error text
4. Check error mentions "Access Denied" or other issue

### Issue: No data loads
**Solution:**
1. Verify you have products in `user_analyses` table
2. Check database connection in console
3. Try refreshing page

---

## 💡 Pro Tips

### For Testing OEW Workflow:
1. **Use reviewer dashboard** (`/dashboard/reviewer`)
2. **Do validations** (Steps 1-6)
3. **Switch to admin** (`/admin`)
4. **See your submissions** in review queue

### For Testing Full Flow:
1. As reviewer: Complete a validation
2. As admin: Review and approve it
3. Watch it update in reviewer stats
4. Verify approval workflow works

---

## 🎯 Next Steps

### Immediate:
**Choose one:**

**Option A (Admin Only):**
```
Go to: http://localhost:8081/admin
```

**Option B (Both Admin + Reviewer):**
1. Open console (F12)
2. Run student cert insert
3. Go to: http://localhost:8081/dashboard/reviewer

---

**Which path would you like to take?**

If you're ready to test, let me know and I can provide specific instructions for that path!
