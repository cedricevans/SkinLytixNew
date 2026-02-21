# Admin Dashboard - Quick Reference Guide

## Access the Admin Dashboard

🔗 **URL:** `http://localhost:8080/admin` (development)  
🔗 **URL:** `https://skinlytix.com/admin` (production)

**Requirements:**
- Must be logged in
- Your email must be in the authorized admin list

**Authorized Admins:**
```
✅ alicia@xiosolutionsllc.com
✅ cedric.evans@gmail.com  
✅ pte295@gmail.com
```

---

## Dashboard Overview

```
┌─────────────────────────────────────┐
│     ADMIN DASHBOARD                 │
├─────────────────────────────────────┤
│ [Statistics Cards]                  │
│ Total Users | Moderators | Certified | Groups
│                                     │
├─────────────────────────────────────┤
│ [Navigation Tabs]                   │
│ Users & Roles | Certs | Groups | Audit
│                                     │
├─────────────────────────────────────┤
│ [Tab Content - varies by selection] │
│                                     │
└─────────────────────────────────────┘
```

---

## Tab 1: Users & Roles

### What It Does
Manage who has what role in the system.

### Roles Available
- **Admin** - Full system access
- **Moderator** - Review and moderate submissions
- **User** - Regular user (default)

### Common Tasks

#### Add a New Role
```
1. Click [+ Add Role] button
2. Enter email: john@example.com
3. Select role: Moderator
4. Click [Add Role]
✓ Done!
```

#### Search for a User
```
1. Type email in search box
2. Table filters automatically
3. See user's current role
```

#### Remove a Role
```
1. Find user in table
2. Click 🗑️ trash icon
3. Role is deleted immediately
```

---

## Tab 2: Certifications

### What It Does
Track and manage reviewer certifications.

### Certification Levels
- **Associate** - Entry-level (NEW reviewers)
- **Specialist** - Intermediate (EXPERIENCED reviewers)
- **Expert** - Advanced (SENIOR reviewers)

### Common Tasks

#### Add a New Certification
```
1. Click [+ Add Certification] button
2. Enter email: sarah@example.com
3. Enter institution: "Harvard Cosmetic Institute"
4. Select level: Associate
5. Click [Add Certification]
✓ Certification created!
```

#### Edit a Certification
```
1. Find certification in table
2. Click ✏️ edit icon
3. Change institution or level
4. Click [Update Certification]
✓ Changes saved!
```

#### Delete a Certification
```
1. Find certification in table
2. Click 🗑️ trash icon
3. Certification removed
```

#### Upgrade a Reviewer's Level
```
1. Click ✏️ edit icon
2. Change from "Associate" → "Specialist" → "Expert"
3. Click [Update Certification]
✓ Promotion complete!
```

---

## Tab 3: Reviewer Groups (Coming Soon)

### What It Will Do
- Organize reviewers into teams
- Assign review batches to groups
- Track group membership
- Manage group admins

**Status:** Feature in development (database setup required)

---

## Tab 4: Audit Log (Coming Soon)

### What It Will Track
- Who did what, when
- Admin action history
- System changes log

**Tracks:**
- Add/remove roles
- Create/edit certifications
- Group assignments
- All timestamps

**Status:** Feature in development (database setup required)

---

## Common Scenarios

### Scenario 1: New Reviewer Signs Up
```
1. Go to Certifications tab
2. Click [+ Add Certification]
3. Enter their email
4. Enter their institution name
5. Select "Associate" level (beginner)
6. Save
```

### Scenario 2: Promote Moderator to Admin
```
1. Go to Users & Roles tab
2. Click [+ Add Role]
3. Enter moderator's email
4. Select "Admin"
5. They now have full system access
```

### Scenario 3: Remove Someone from System
```
1. Go to Users & Roles tab
2. Find their email
3. Click 🗑️ trash icon to remove role
4. (Or go to Certifications and delete there too)
```

---

## Keyboard Shortcuts & Tips

### Search
- Click search box
- Type email (case-insensitive)
- Results filter automatically

### Buttons
- **[+ Add]** = Create new record
- **✏️** = Edit record
- **🗑️** = Delete record
- **[Add/Update/Create]** = Submit form

### Forms
- All red asterisk (*) fields are required
- Email must be valid
- Emails are case-insensitive

---

## Error Messages & Solutions

### "User Not Found"
**Problem:** Email you entered doesn't exist  
**Solution:** Have them sign up first, then add role

### "Role Already Exists"  
**Problem:** User already has that role  
**Solution:** They can only have one role of each type

### "Access Denied"  
**Problem:** Your email isn't authorized  
**Solution:** Contact an authorized admin to add you

### "Failed to Save"  
**Problem:** Database or connection issue  
**Solution:** Check Supabase status, refresh page, try again

---

## Statistics Dashboard

The 4 cards at the top show key metrics:

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Total   │  │Moderators│  │ Certified│  │  Groups  │
│ Users    │  │          │  │ Reviewers│  │          │
│    42    │  │    8     │  │    23    │  │    0     │
└──────────┘  └──────────┘  └──────────┘  └──────────┘
```

These update automatically when you add/remove roles or certifications.

---

## Data Tips

### Best Practices
✅ Use real institutions: "Harvard", "MIT", "Stanford"  
✅ Use valid emails: "john.smith@company.com"  
✅ Keep descriptions clear and concise  
✅ Review certifications quarterly  

### What NOT To Do
❌ Don't create fake users  
❌ Don't assign random roles  
❌ Don't delete active reviewers without notice  
❌ Don't use test emails in production  

---

## Need Help?

### Documentation
📄 **Admin Dashboard Setup Guide** → `docs/Admin-Dashboard-Setup.md`  
📄 **Role Testing Guide** → `docs/TESTING-ROLES-SETUP.md`  
📄 **Implementation Details** → `docs/Admin-Dashboard-Implementation.md`

### Quick Checks
- Verify you're logged in
- Check your email is authorized
- Refresh the page if buttons aren't working
- Clear browser cache if issues persist

### Contact Support
- Check browser console (F12) for error details
- Review Supabase dashboard for database issues
- Contact technical lead if stuck

---

## Statistics Definitions

| Card | Meaning | Example |
|------|---------|---------|
| **Total Users** | Users with assigned roles | 42 people |
| **Moderators** | People with moderator role | 8 moderators |
| **Certified Reviewers** | Active certifications | 23 reviewers |
| **Reviewer Groups** | Teams of reviewers | 0 (coming soon) |

---

## Action Limits

- No limit on adding roles
- No limit on certifications per user
- No limit on certifications per institution
- Email searches are instant
- Operations complete in < 1 second

---

## Session & Security

**Your Session:**
- Lasts until you log out
- Automatically refreshes
- Times out after 30 days

**Data Security:**
- All operations logged (future feature)
- Role-based access control enforced
- Database-level permissions (RLS)

---

## Quick Decision Tree

```
Need to...

├─ Add/Remove a role?
│  └─ Go to "Users & Roles" tab
│
├─ Manage certifications?
│  └─ Go to "Certifications" tab
│
├─ Track who did what?
│  └─ Go to "Audit Log" tab (coming soon)
│
└─ Organize reviewers into teams?
   └─ Go to "Groups" tab (coming soon)
```

---

## Pro Tips

💡 **Bulk Operations:** Add one at a time via forms. CSV import coming soon.  
💡 **Search Tips:** Type partial emails (e.g., "john" finds "john@example.com")  
💡 **Sorting:** Click table headers to sort (coming soon)  
💡 **Exports:** Download data as CSV (coming soon)  

---

## Production Checklist

Before going live:

- [ ] Test with all 3 authorized emails
- [ ] Add at least one moderator
- [ ] Create at least one certification
- [ ] Test role deletion
- [ ] Verify stats update correctly
- [ ] Test on mobile/tablet
- [ ] Check browser console for errors
- [ ] Backup database before major changes

---

## Questions?

**Most Common Questions:**

Q: Can I have multiple roles?  
A: User can only have one role active at a time.

Q: How do I export data?  
A: CSV export coming in next update.

Q: Can I bulk import?  
A: Bulk import coming in next update.

Q: How far back do audit logs go?  
A: Audit logs launching with next phase.

Q: What happens when I delete something?  
A: Deletion is permanent. Logged in audit trail (coming soon).

---

**Version:** 1.0  
**Last Updated:** 2025  
**Status:** Production Ready ✅
