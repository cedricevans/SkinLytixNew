# Admin Dashboard: Dynamic User Role Management

## Overview

Your admin dashboard has a **complete, built-in UI** for dynamically managing user roles—no SQL queries needed! This answers your requirement: "this has to be dynamic."

**Location:** http://localhost:8081/admin  
**Authorization:** Only authorized admins can access (cedric.evans@gmail.com ✅ is authorized)

---

## How to Add a User as a Reviewer (Moderator)

### Step 1: Navigate to Admin Dashboard
1. Open http://localhost:8081/admin in your browser
2. If you're logged in as an authorized admin, you'll see the admin interface
3. Click the **"Users & Roles"** tab

### Step 2: Open the "Add Role" Dialog
1. Click the **"+ Add Role"** button (top-right of the Users & Roles section)
2. A dialog will appear with two fields:
   - **Email Address** (required)
   - **Role** (dropdown)

### Step 3: Enter User Details
1. **Email Address:** Type the email of the user you want to add as a reviewer
   - Example: `john.doe@example.com`
   - The user **must already have a SkinLytix account** (they need to have signed up)

2. **Role:** Select **"Moderator - Can validate ingredients"**
   - This is the role needed to access the reviewer dashboard
   - Other options: Admin (full system access), User (regular user)

### Step 4: Confirm
1. Click **"Add Role"** button
2. You'll see a success toast: `"Role added: john.doe@example.com is now a moderator"`
3. The user immediately appears in the table below

---

## What Happens Next for the User

Once you've added the user as a moderator:

1. **They can now access:** http://localhost:8081/dashboard/reviewer
2. **They see:** The StudentReviewer dashboard with:
   - ReviewerAccuracyCard (stats on their validation performance)
   - IngredientValidationPanel (the 6-step OEW workflow)
3. **They can:** Start validating ingredients using the Confirm/Correct/Escalate workflow

---

## Managing Existing Roles

### View All User Roles
The **Users & Roles** tab shows a table with:
- **Email** - User's email address
- **Role** - Their current role (Admin, Moderator, or User)
- **Added** - Date when the role was assigned
- **Actions** - Delete button (trash icon) to remove the role

### Search for a User
1. Use the search box above the table: "Search by email..."
2. Rows filter in real-time as you type
3. Example: Type "cedric" to find all users with "cedric" in their email

### Remove a User's Role
1. Find the user in the table
2. Click the **trash icon** in the Actions column
3. The role is immediately removed and you'll see: "Role removed successfully"

---

## Other Admin Dashboard Tabs

### Certifications Tab
- View and manage **student certifications**
- Add verification that a user completed formal training
- Required for some review workflows (alternative to moderator role)

### Reviewer Groups Tab
- Create and manage **reviewer groups**
- Assign multiple reviewers to specific tasks
- Organize team-based review workflows

### Audit Log Tab
- View all **system changes and actions**
- Track who made what changes and when
- Full history of role assignments, deletions, certifications

---

## Complete Workflow Example

**Goal:** Add yourself as a moderator and access the reviewer dashboard

### Part A: Admin Dashboard (What you do)
1. Go to http://localhost:8081/admin
2. Click "Users & Roles" tab
3. Click "+ Add Role" button
4. Enter:
   - Email: `cedric.evans@gmail.com`
   - Role: `Moderator - Can validate ingredients`
5. Click "Add Role"
6. See success: "Role added: cedric.evans@gmail.com is now a moderator"

### Part B: Reviewer Dashboard (Same user in new tab/window)
1. Open http://localhost:8081/dashboard/reviewer (or refresh current page)
2. You now see the StudentReviewer interface
3. You can start the OEW workflow for any ingredient

### Part C: Testing the Workflow
1. Click on an ingredient from the list
2. Work through the 6-step process:
   - Step 1: Observation (read-only)
   - Step 2: Evidence (add citations)
   - Step 3: Writing (write analysis 150-300 words)
   - Step 4: Confidence (select High/Moderate/Limited)
   - Step 5: Verdict (Confirm/Correct/Escalate)
   - Step 6: Internal Notes (optional)
3. Click "Submit Review"
4. Your stats update instantly on ReviewerAccuracyCard

---

## Key Features of UserRoleManager

### ✅ Real-Time Validation
- Checks that the email exists in SkinLytix's auth system
- Prevents duplicate roles for the same user
- Validates email format

### ✅ Immediate Feedback
- Toast notifications for all actions (success, error, validation)
- Users appear in table immediately after adding
- No page refresh needed

### ✅ Search & Filter
- Live search by email as you type
- Useful for finding users in large lists
- Case-insensitive matching

### ✅ One-Click Deletion
- Remove roles with single trash icon click
- Stats update automatically
- Confirmation optional (direct delete)

---

## Troubleshooting

### Problem: "No user found with email: user@example.com"
**Solution:** The user hasn't signed up for SkinLytix yet.  
1. Have the user create an account at http://localhost:8081/auth (sign up)
2. Then add their role through the admin dashboard

### Problem: "This user already has the moderator role"
**Solution:** The user already has this role.  
- They can now access the reviewer dashboard immediately
- Or you can delete and re-add the role if needed

### Problem: Can't find "Users & Roles" tab
**Solution:** Make sure you're:
1. At http://localhost:8081/admin (not `/dashboard/reviewer`)
2. Logged in with an authorized admin email
3. Authorized emails: cedric.evans@gmail.com, alicia@xiosolutionsllc.com, pte295@gmail.com

### Problem: "Access Denied" when opening admin dashboard
**Solution:** Your email is not authorized.
1. Check your email address matches one in ADMIN_EMAILS
2. Or ask an authorized admin to add you as an admin role first

---

## Database Model (Behind the Scenes)

For reference, here's what happens when you use the UI:

**Table: `user_roles`**
```
id         | UUID (auto-generated)
user_id    | UUID (fetched from auth.users based on email)
role       | 'admin' | 'moderator' | 'user'
created_at | timestamp (auto-set)
```

**When you click "Add Role":**
1. UserRoleManager fetches user ID from auth system using email
2. Inserts a new row into user_roles table
3. Returns immediate success feedback
4. Reloads the table to show updated list

**No manual SQL needed!** The UI handles all database operations.

---

## Summary: Why This Is "Dynamic"

| Aspect | Manual SQL | Admin Dashboard |
|--------|-----------|-----------------|
| Speed | Slow (copy UUID, edit query, run) | Fast (click button, type email, done) |
| Errors | Easy to paste wrong UUID | Validates email automatically |
| Repetition | Frustrating for multiple users | Quick "Add Role" button each time |
| Undo | Manual DELETE query | Click trash icon |
| Verification | Need to check table | Instant table update |
| Learning Curve | Need SQL knowledge | Intuitive UI |

**Bottom line:** Use the admin dashboard for all recurring role management tasks. It's what it was built for!

---

## Ready to Test?

1. ✅ Add yourself as a moderator (or another user)
2. ✅ Navigate to http://localhost:8081/dashboard/reviewer
3. ✅ Start the OEW workflow testing (3 scenarios: Confirm, Correct, Escalate)
4. ✅ Report results in your next message

Your system is fully built and ready to test! 🚀
