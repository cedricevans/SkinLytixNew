# 👨‍💼 ADMIN USER - Quick Summary

**You are:** Admin  
**Your problem:** Can't see reviewer/review dashboard  
**The reason:** Reviewer dashboard requires student certification (you only have admin role)  
**The solution:** Add student cert to yourself (2 minutes) OR use admin dashboard

---

## 🎯 Your Two Options

### Option 1: Use Admin Dashboard (Immediate Access)
```
URL: http://localhost:8081/admin
Status: ✅ Can access RIGHT NOW
Purpose: Review & manage all validations
```

### Option 2: Also Access Reviewer Dashboard (Add Student Cert First)
```
1. Open console (F12)
2. Paste script (see below)
3. Refresh page
4. URL: http://localhost:8081/dashboard/reviewer
Status: ✅ Can access after step 3
Purpose: Do validations + see admin review
```

---

## 🔧 How to Add Student Certification (30 seconds)

**Step 1:** Press **F12** (open console)  
**Step 2:** Click **Console** tab  
**Step 3:** Paste this:

```javascript
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('student_certifications').insert({
  user_id: user.id,
  institution: 'SkinLytix Admin',
  certification_level: 'expert'
});
console.log('✅ Done! Refresh page now.');
```

**Step 4:** Press **Enter**  
**Step 5:** See `✅ Done! Refresh page now.`  
**Step 6:** Press **Cmd/Ctrl + R** (refresh)  
**Step 7:** Go to `http://localhost:8081/dashboard/reviewer`  

✅ **Done!** You now have access to both dashboards.

---

## 📊 What You Get

### Admin Dashboard (`/admin`)
- See all validations from all users
- Review & approve submissions
- Manage escalations
- View reviewer stats

### Reviewer Dashboard (`/dashboard/reviewer`)
- Validate ingredients (6 steps)
- Track your own progress
- See your stats
- Test the workflow

---

## 🚀 Recommended Testing Path

1. **Run the script above** (add student cert)
2. **Go to reviewer dashboard:** `/dashboard/reviewer`
3. **Do 3 validations:** Confirm, Correct, Escalate
4. **Go to admin dashboard:** `/admin`
5. **See your validations** in review queue
6. **Test end-to-end** workflow

---

## ✅ Quick Checklist

- [ ] Understand you're admin (have both dashboard options)
- [ ] Know reviewer dashboard needs student cert
- [ ] Open console (F12)
- [ ] Run the script to add cert
- [ ] Refresh page
- [ ] Can now access: `/dashboard/reviewer`
- [ ] Can also access: `/admin`

---

**Ready to test? Run the script and access the reviewer dashboard!**

Or just use the admin dashboard if you prefer: `http://localhost:8081/admin`

See **ADMIN-QUICK-REFERENCE.md** for detailed guide!
