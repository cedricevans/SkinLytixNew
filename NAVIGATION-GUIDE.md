# 🗺️ How to Navigate to StudentReviewer Dashboard

**Date:** 2026-02-21  
**URL Path:** `/dashboard/reviewer`

---

## 📍 Quick Navigation Guide

### Option 1: Direct URL (Fastest)
Simply paste this into your browser address bar:

```
http://localhost:8081/dashboard/reviewer
```

**That's it!** This goes directly to the StudentReviewer dashboard.

---

## 🔐 Access Requirements

Before you can access the dashboard, you need:

✅ **Be Logged In**
- If you're not logged in, you'll be redirected to `/auth` page
- Login with your account that has reviewer role

✅ **Have Reviewer Role**
- Must have `reviewer` or `admin` role in the database
- Check your `user_roles` table entry

✅ **Student Certification (Optional)**
- May need student certification setup
- The app will check `student_certifications` table

---

## 📋 What You'll See on StudentReviewer Dashboard

### Main Section
```
┌─────────────────────────────────────────────────────────┐
│ StudentReviewer Dashboard                               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📊 ReviewerAccuracyCard (6 stat boxes)                 │
│ [Total] [Approval%] [High] [Moderate] [Limited] [Date] │
│                                                          │
│ 🗺️  Progress Bar                                         │
│ [████░░░░░░] 40% Complete                              │
│                                                          │
│ 📦 Products Awaiting Review:                            │
│                                                          │
│ ▼ Product 1: [Product Name]                            │
│   ├─ Ingredient A (not validated)                      │
│   ├─ Ingredient B (not validated)                      │
│   └─ Ingredient C (validated) ✓                        │
│                                                          │
│ ▼ Product 2: [Product Name]                            │
│   ├─ Ingredient X (not validated)                      │
│   └─ Ingredient Y (not validated)                      │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### To Start Testing:

1. **Click any product** → Product expands to show ingredients
2. **Click any ingredient name** → IngredientValidationPanel opens
3. **Walk through 6 steps** → Complete the validation workflow
4. **Click "Save Validation"** → Save the validation
5. **Watch for success toast** → Green message appears confirming save

---

## 🚀 Step-by-Step Navigation

### Step 1: Open Browser
- URL: `http://localhost:8081/dashboard/reviewer`
- Press Enter

### Step 2: Check If You're Logged In
- **If you see the dashboard:** ✅ Great! You're logged in
- **If you see login page:** Enter your credentials and login

### Step 3: View Dashboard
- You should see:
  - Header: "StudentReviewer Dashboard"
  - ReviewerAccuracyCard with stats at top
  - Progress bar
  - List of products with ingredients

### Step 4: Select a Product
- Click any product name to expand
- See list of ingredients for that product

### Step 5: Select an Ingredient
- Click any ingredient name
- IngredientValidationPanel modal/card opens
- See "Step 1 of 6: Observation"

### Step 6: Complete 6-Step Workflow
- **Step 1:** View observation (click Next)
- **Step 2:** Add citation (fill form, click Next)
- **Step 3:** Write explanation (150-300 words, click Next)
- **Step 4:** Select confidence (click one, click Next)
- **Step 5:** Select verdict (click Confirm/Correct/Escalate, click Next)
- **Step 6:** Optional notes (click "Save Validation")

### Step 7: Verify Success
- ✅ Green success toast appears
- ✅ Form closes/resets
- ✅ ReviewerAccuracyCard stats update
- ✅ Back to product list

---

## 🔗 URL Reference

| Page | URL | Requires Login | Notes |
|------|-----|---|---|
| StudentReviewer Dashboard | `/dashboard/reviewer` | ✅ Yes | Review products/ingredients |
| Login | `/auth` | ❌ No | Login page |
| Admin Dashboard | `/admin` | ✅ Yes | Admin-only features |
| Home | `/home` | ✅ Yes | Main app home |
| Settings | `/settings` | ✅ Yes | User settings |

---

## ⚠️ If You Can't Access the Dashboard

### Error: Redirected to `/auth`
**Problem:** You're not logged in  
**Solution:** Login with your account credentials

### Error: Access Denied / 403 Forbidden
**Problem:** You don't have reviewer role  
**Solution:** Contact admin to add `reviewer` or `admin` role to your account

### Error: Page shows "Not Found"
**Problem:** Dashboard URL might be wrong  
**Solution:** Use exact URL: `http://localhost:8081/dashboard/reviewer`

### Error: Component won't load
**Problem:** Database connection issue  
**Solution:** Check browser console (F12) for error messages

---

## 🎯 Ready to Test?

1. **Open:** `http://localhost:8081/dashboard/reviewer`
2. **Select:** Any product
3. **Click:** Any ingredient
4. **Walk through:** All 6 steps
5. **Save:** Click "Save Validation"
6. **Verify:** Green success toast appears

---

## 💡 Pro Tips

### Bookmark This URL
- Save `http://localhost:8081/dashboard/reviewer` as a bookmark
- Quick access each time you test

### Keep Console Open
- Press F12 to open DevTools
- Watch Network tab for requests
- Watch Console tab for errors

### Keep Browser Zoom Normal
- Use default zoom (100%)
- Text should be readable
- UI should look professional

### Use Multiple Products
- Test with different products
- Test with different ingredients
- This verifies loading works correctly

---

## ✅ Checklist Before Starting Test

- [ ] Open browser to `http://localhost:8081/dashboard/reviewer`
- [ ] See StudentReviewer Dashboard (not redirected to login)
- [ ] Can see ReviewerAccuracyCard with stats
- [ ] Can see product list
- [ ] Can expand product to see ingredients
- [ ] DevTools open and ready (F12)
- [ ] Console tab visible for error checking
- [ ] Network tab ready to monitor requests

---

**You're ready! Open the browser now and navigate to the dashboard.**

`http://localhost:8081/dashboard/reviewer`

**Then follow the 6-step workflow for each test scenario!**
