# 🔧 Fix: "supabase is not defined" Error

**Problem:** You tried to run the script in console before Supabase loaded  
**Solution:** Load a page with Supabase first, then run the script

---

## ✅ SOLUTION (3 Steps)

### Step 1: Navigate to a Page that Loads Supabase
Go to any dashboard page first. Use this URL:
```
http://localhost:8081/home
```
(This loads Supabase and your user session)

### Step 2: Open Browser Console (F12)
Press: **F12** (or Cmd+Option+I on Mac)  
Click: **Console** tab

### Step 3: Run the Script NOW
Paste this code:

```javascript
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('student_certifications').insert({
  user_id: user.id,
  institution: 'SkinLytix Admin',
  certification_level: 'expert'
});
console.log('✅ Student certification added!');
```

Press: **Enter**

Wait for: `✅ Student certification added!`

---

## 🚀 Then Continue

Once you see the success message:

1. **Refresh page:** Cmd/Ctrl + R
2. **Go to reviewer dashboard:** `http://localhost:8081/dashboard/reviewer`
3. **You now have access!** ✅

---

## 🎯 Complete Step-by-Step

### Step 1: Open home page
```
http://localhost:8081/home
```

### Step 2: Wait for page to load
- Should see header, navigation, etc.
- Page fully loaded

### Step 3: Open console (F12)
- Press F12
- Click "Console" tab
- Ready to type

### Step 4: Paste script
```javascript
const { data: { user } } = await supabase.auth.getUser();
await supabase.from('student_certifications').insert({
  user_id: user.id,
  institution: 'SkinLytix Admin',
  certification_level: 'expert'
});
console.log('✅ Student certification added!');
```

### Step 5: Press Enter
- Script runs
- See success message

### Step 6: Refresh page
- Cmd/Ctrl + R

### Step 7: Go to reviewer dashboard
```
http://localhost:8081/dashboard/reviewer
```

✅ **Done!** You now have access.

---

## ⚠️ If You Still Get Error

### Error: "ReferenceError: supabase is not defined"
**Fix:**
1. Make sure you're on a loaded page (like `/home`)
2. Wait 2-3 seconds for page to fully load
3. Then open console (F12)
4. Then run script

### Error: "Cannot insert duplicate key"
**Fix:**
- You already have a student cert!
- Good news: You already have access
- Just go to: `http://localhost:8081/dashboard/reviewer`

### Error: Something else
**Fix:**
1. Copy the error message exactly
2. Check you're on `/home` or similar page
3. Try refreshing page first (Cmd/Ctrl + R)
4. Try the script again

---

## 📋 Quick Checklist

- [ ] Go to: `http://localhost:8081/home` (or any dashboard page)
- [ ] Wait for page to fully load (2-3 seconds)
- [ ] Press F12 (open console)
- [ ] Click "Console" tab
- [ ] Paste the script above
- [ ] Press Enter
- [ ] See: `✅ Student certification added!`
- [ ] Refresh page: Cmd/Ctrl + R
- [ ] Go to: `http://localhost:8081/dashboard/reviewer`
- [ ] ✅ You now have access!

---

## 🎯 Why This Happens

The console script needs access to the `supabase` object, which is only available:
- ✅ After Supabase is imported in the page
- ✅ After your session is loaded
- ✅ On pages like `/home`, `/dashboard/reviewer`, `/admin`, etc.

Not available on:
- ❌ Index page
- ❌ Login page (before you're authenticated)
- ❌ Pages without Supabase integration

---

**Go to `/home` first, then try the script again!**

It will work once Supabase is loaded on the page.
