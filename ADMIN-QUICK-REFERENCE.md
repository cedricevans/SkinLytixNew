# 👨‍💼 Admin User Guide - Access Both Dashboards

**You are:** Admin user  
**Your role:** System administrator with full access  
**Your options:** Admin dashboard OR Reviewer dashboard (or both)

---

## 🎯 Quick Answer

You have **TWO dashboards** available:

### Dashboard 1: Admin Dashboard (Recommended for admins)
```
URL: http://localhost:8081/admin
Purpose: Manage and review all user submissions
```

### Dashboard 2: Reviewer Dashboard (For testing workflow)
```
URL: http://localhost:8081/dashboard/reviewer
Purpose: Actually validate ingredients (6-step workflow)
Note: Requires student certification (can add yourself)
```

---

## 📊 What Each Dashboard Does

### Admin Dashboard (`/admin`)
✅ **Can access immediately** (you're already admin)

**What you see:**
- All validations from all reviewers
- Review queue for corrections
- Escalations from reviewers
- Reviewer performance metrics
- System statistics

**What you can do:**
- Approve validations
- Reject with feedback
- Review escalations
- See reviewer stats
- Manage system data

---

### Reviewer Dashboard (`/dashboard/reviewer`)
⚠️ **Needs student certification** (easy to add)

**What you see:**
- Products to validate
- Ingredients needing validation
- Your personal stats
- 6-step validation workflow

**What you can do:**
- Validate ingredients (Observation → Evidence → Writing → Confidence → Verdict → Notes)
- Track your progress
- See your accuracy metrics

---

## 🚀 How to Access Both (Full Testing)

### Step 1: Go to Admin Dashboard (You Have Access Now)
```
Open browser: http://localhost:8081/admin
```
✅ This should work immediately

### Step 2: Add Student Certification to Yourself
**Open browser DevTools:**
- Press: **F12** (or Cmd+Option+I on Mac)
- Click: **Console** tab
- Paste this code:

```javascript
const { data: { user } } = await supabase.auth.getUser();
await supabase
  .from('student_certifications')
  .insert({
    user_id: user.id,
    institution: 'SkinLytix Admin',
    certification_level: 'expert'
  });
console.log('✅ Student certification added!');
```

- Press: **Enter**
- Look for: `✅ Student certification added!`

### Step 3: Refresh Page
- Press: **Cmd/Ctrl + R** (refresh)

### Step 4: Now Access Reviewer Dashboard
```
Open browser: http://localhost:8081/dashboard/reviewer
```
✅ This should now work!

---

## 🧪 Testing Flow (Recommended)

### Full Testing as Admin:

**Phase 1: Do Validations (as reviewer)**
1. Open: `http://localhost:8081/dashboard/reviewer`
2. Select a product
3. Click an ingredient
4. Walk through 6 steps
5. Save validation
6. ✅ See success toast

**Phase 2: Review Your Work (as admin)**
1. Open: `http://localhost:8081/admin`
2. See your validation in review queue
3. See it's pending approval
4. Approve or reject it
5. ✅ See workflow complete

**Phase 3: Verify Workflow**
1. Back to reviewer dashboard
2. See your stats updated
3. Verify everything works end-to-end

---

## ✅ Checklist to Get Full Access

- [ ] Understand you're an admin
- [ ] Know you have 2 dashboards available
- [ ] Open: `http://localhost:8081/admin` (test admin dashboard)
- [ ] Open console (F12)
- [ ] Run student certification script
- [ ] Refresh page
- [ ] Open: `http://localhost:8081/dashboard/reviewer` (test reviewer dashboard)
- [ ] Both should now work!

---

## 🎯 What to Test First

### Option A: Quick Admin Test (5 min)
```
1. Open: http://localhost:8081/admin
2. Explore the admin dashboard
3. Look for validation queue
4. See any pending items
```

### Option B: Full Workflow Test (15 min)
```
1. Add student cert to yourself (see Step 2 above)
2. Open: http://localhost:8081/dashboard/reviewer
3. Do 3 validations (Confirm, Correct, Escalate)
4. Open: http://localhost:8081/admin
5. See your validations in queue
6. Verify workflow end-to-end
```

---

## 📝 Browser Console Script (Copy-Paste Ready)

If you want to add student cert without typing:

**Just copy this entire block and paste into console (F12):**

```javascript
// Add student certification to admin account
(async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('📝 Adding certification for user:', user.id);
    
    const { error } = await supabase
      .from('student_certifications')
      .insert({
        user_id: user.id,
        institution: 'SkinLytix Admin',
        certification_level: 'expert'
      });
    
    if (error) {
      console.error('❌ Error:', error.message);
    } else {
      console.log('✅ Certification added! Refresh page to access reviewer dashboard.');
    }
  } catch (err) {
    console.error('❌ Exception:', err);
  }
})();
```

Then press **Enter** and wait for the message!

---

## 🎨 Visual: Your Access Levels

```
┌─────────────────────────────────────────────┐
│         YOUR ADMIN ACCOUNT                  │
├─────────────────────────────────────────────┤
│                                             │
│  Role: Admin                                │
│  ✅ Can access: /admin dashboard            │
│  ✅ Can access: Any user page               │
│  ✅ Can add: Student certification          │
│                                             │
│  To also test as reviewer:                  │
│  1. Add student cert (script above)         │
│  2. Refresh page                            │
│  3. Access: /dashboard/reviewer             │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ⚠️ Common Issues & Fixes

### Issue: Can't access `/admin`
**Fix:** Verify you're logged in
- Check: Are you logged into app?
- Try: Refresh page (Cmd/Ctrl + R)

### Issue: Console script says "cannot find supabase"
**Fix:** Supabase loads from page
- Try: Go to dashboard first, THEN open console
- Then: Run the script

### Issue: Still can't access `/dashboard/reviewer`
**Fix:** Certification might not have saved
- Try: Hard refresh (Cmd/Ctrl + Shift + R)
- Try: Clear cache and refresh

### Issue: Admin dashboard is empty
**Fix:** Need test data
- Check: Are there validations in database?
- If not: Do some validations first in reviewer dashboard

---

## 🚀 Ready? Here's What to Do RIGHT NOW

### Option 1: Test Admin Dashboard Only (2 minutes)
```
Go to: http://localhost:8081/admin
```

### Option 2: Test Both Dashboards (5 minutes setup + 15 min testing)
```
1. Press F12 (open console)
2. Paste the script above
3. Press Enter
4. See ✅ message
5. Refresh page (Cmd/Ctrl + R)
6. Go to: http://localhost:8081/dashboard/reviewer
7. Start testing!
```

---

**Which would you like to do?**

I'm ready to help you test either or both dashboards!
