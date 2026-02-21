# SkinLytix Admin Dashboard Documentation Index

Welcome! This directory contains complete documentation for the Admin Dashboard system.

## 📚 Documentation Files

### For Admin Users (Use These!)

1. **📖 [Admin-Quick-Reference.md](Admin-Quick-Reference.md)** ← **START HERE**
   - Quick overview of the admin dashboard
   - Common tasks & workflows
   - Error messages & solutions
   - 5-minute quick start

2. **📘 [Admin-Dashboard-Setup.md](Admin-Dashboard-Setup.md)**
   - Complete user guide
   - Feature descriptions
   - Access control & permissions
   - Common workflows explained
   - Troubleshooting guide

### For Developers (Technical Reference)

3. **📗 [Admin-Dashboard-Implementation.md](Admin-Dashboard-Implementation.md)**
   - Full technical implementation details
   - File structure & architecture
   - Database schema
   - Code quality metrics
   - Testing checklist
   - Deployment notes

### Related Documentation

4. **[TESTING-ROLES-SETUP.md](TESTING-ROLES-SETUP.md)**
   - How to test the role system
   - 3 different testing approaches
   - Setup instructions

5. **[Cosmetic-Science-Apprentice-* files](features/)**
   - OEW Reviewer Workflow documentation
   - Implementation details for the review system

---

## 🎯 Quick Start

### I'm an Admin - How Do I Use This?

1. **First Time?** Read: [Admin-Quick-Reference.md](Admin-Quick-Reference.md)
2. **Need Details?** Read: [Admin-Dashboard-Setup.md](Admin-Dashboard-Setup.md)
3. **Still Have Questions?** See Troubleshooting section

### I'm a Developer - Where Do I Look?

1. **Implementation Details?** Read: [Admin-Dashboard-Implementation.md](Admin-Dashboard-Implementation.md)
2. **Testing?** See the Testing Checklist section
3. **Deployment?** See the Deployment Notes section

---

## 🔐 Authorized Admins

Only these 3 emails can access the admin dashboard:

```
✅ alicia@xiosolutionsllc.com
✅ cedric.evans@gmail.com
✅ pte295@gmail.com
```

**Access URL:** `http://localhost:8080/admin` (dev) or `https://skinlytix.com/admin` (production)

---

## 📋 Admin Dashboard Features

### ✅ Currently Available

| Feature | Status | Tab | Details |
|---------|--------|-----|---------|
| User Role Management | ✅ Live | Users & Roles | Add/Edit/Delete roles |
| Certification Management | ✅ Live | Certifications | Manage reviewer certifications |
| Authorization | ✅ Live | All | 3-email whitelist protection |
| Stats Dashboard | ✅ Live | Top | Real-time metrics |
| Search/Filter | ✅ Live | All | Search by email |

### ⏳ Coming Soon (DB Migration Required)

| Feature | Status | Tab | Requirements |
|---------|--------|-----|--------------|
| Reviewer Groups | 🔄 Planned | Groups | Need `reviewer_groups` table |
| Audit Logging | 🔄 Planned | Audit Log | Need `audit_logs` table |
| Group Management | 🔄 Planned | Groups | Need `group_members` table |
| CSV Import | 🔄 Planned | Users & Roles | Enhancement request |

---

## 🚀 Getting Started as Admin

### Step 1: Access the Dashboard
```
1. Go to http://localhost:8080/admin
2. Log in with your email
3. If authorized, you'll see the dashboard
```

### Step 2: Check Your Role
- Look at the banner at the top showing your email
- Verify you're logged in as the right user

### Step 3: Start Managing
- Click any tab to start working
- Follow the Quick Reference for common tasks

---

## 📚 Tab Guide

### Users & Roles Tab
- **Purpose:** Manage who has what role
- **Roles:** Admin, Moderator, User
- **Operations:** Add role, Remove role, Search users
- **Who Uses:** All admins for team management

### Certifications Tab
- **Purpose:** Track reviewer qualifications
- **Levels:** Associate, Specialist, Expert
- **Operations:** Add, Edit, Delete certifications
- **Who Uses:** All admins for reviewer verification

### Groups Tab (Coming Soon)
- **Purpose:** Organize reviewers into teams
- **Operations:** Create, Manage, Assign batches
- **Status:** Awaiting database setup
- **Who Uses:** Pascal for review batch control

### Audit Log Tab (Coming Soon)
- **Purpose:** Track all admin actions
- **Operations:** View, Filter, Export
- **Status:** Awaiting database setup
- **Who Uses:** All admins for compliance

---

## 🛠️ Technical Stack

```
Frontend:
- React 18 + TypeScript
- Tailwind CSS + shadcn/ui
- Vite bundler
- React Router v6

Backend:
- Supabase (PostgreSQL)
- Row-Level Security (RLS)
- REST API

Icons:
- Lucide Icons
- React Query for data management
```

---

## 📊 Database Tables

### Currently Used
- `user_roles` - User role assignments
- `student_certifications` - Reviewer certifications
- `profiles` - User profile data

### Needed for Full Features
- `reviewer_groups` - Team groupings
- `group_members` - Group membership
- `audit_logs` - Action tracking

---

## 🐛 Troubleshooting

### Common Issues

**"Access Denied" error**
- Your email isn't in the admin list
- Contact an authorized admin to be added

**"User Not Found" when adding role**
- User email doesn't have a SkinLytix account yet
- Have them sign up first

**Button doesn't respond**
- Refresh the page
- Clear browser cache
- Check network tab for errors

**Dashboard looks broken**
- Clear browser cache
- Hard refresh (Cmd+Shift+R on Mac)
- Try in incognito mode

See **[Admin-Dashboard-Setup.md](Admin-Dashboard-Setup.md)** for more troubleshooting

---

## 📞 Support

### Resources
- This documentation
- Browser Developer Console (F12)
- Supabase Dashboard status page
- GitHub Issues (for bugs)

### Contact
- Reach out to development team
- Check Supabase console for database errors
- Review application logs

---

## 📈 Statistics & Metrics

Dashboard displays:
- **Total Users** - Users with assigned roles
- **Moderators** - Active moderators
- **Certified Reviewers** - Certification count
- **Reviewer Groups** - Group count (0 until feature launches)

All stats update in real-time when you make changes.

---

## 🎓 Learning Path

### For New Admins
1. Read: Admin-Quick-Reference.md (5 min)
2. Watch: Dashboard overview (2 min)
3. Try: Add a test moderator (2 min)
4. Reference: Admin-Dashboard-Setup.md as needed

### For Developers
1. Read: Admin-Dashboard-Implementation.md (15 min)
2. Review: Component files in `src/components/admin/` (10 min)
3. Check: Database schema in `supabase/migrations/` (5 min)
4. Test: Run `npm run dev` and navigate to `/admin` (5 min)

---

## ✨ Features Overview

### User Role Management
```
✓ Add admin/moderator roles
✓ Remove roles
✓ Search by email
✓ See all active roles
✓ Real-time updates
```

### Certification Management
```
✓ Track reviewer certifications
✓ 3 certification levels
✓ Associate/Specialist/Expert
✓ Edit institution & level
✓ Delete certifications
✓ Filter by email
```

### Authorization & Security
```
✓ Email whitelist (3 authorized)
✓ Supabase Auth integration
✓ Row-Level Security (RLS)
✓ Session management
✓ Secure operations
```

---

## 🔄 Data Flow

```
Admin Dashboard
    ↓
[User Action: Click Add Role]
    ↓
[Form Validation]
    ↓
[Supabase API Call]
    ↓
[Database Update]
    ↓
[RLS Policy Check]
    ↓
[Success Toast & Stats Refresh]
```

---

## 📦 Files & Locations

### Main Page
- `src/pages/AdminDashboard.tsx` - Main dashboard page

### Components
- `src/components/admin/UserRoleManager.tsx`
- `src/components/admin/CertificationManager.tsx`
- `src/components/admin/ReviewerGroupManager.tsx`
- `src/components/admin/AuditLog.tsx`

### Documentation
- `docs/Admin-Quick-Reference.md` - You are here!
- `docs/Admin-Dashboard-Setup.md` - User guide
- `docs/Admin-Dashboard-Implementation.md` - Technical details

---

## 🎯 Next Steps

### If You're an Admin
→ Go read **[Admin-Quick-Reference.md](Admin-Quick-Reference.md)**

### If You're a Developer
→ Go read **[Admin-Dashboard-Implementation.md](Admin-Dashboard-Implementation.md)**

### If You Want to Deploy
→ See the Deployment Notes in the Implementation guide

### If You Need to Extend Features
→ Review the Architecture section in Implementation guide

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025 | Initial release with Users & Roles and Certifications |
| TBD | 2025 | Add Groups & Audit Log tabs (after DB migration) |
| TBD | 2025 | CSV bulk import feature |

---

## ✅ Verification Checklist

- [x] Admin Dashboard created and integrated
- [x] User role management working
- [x] Certification management working
- [x] Authorization working (3-email whitelist)
- [x] Documentation complete
- [x] Ready for production testing

---

## 🎉 You're Ready!

The Admin Dashboard is ready to use. Pick a document above and get started!

**New Admin?** Start with **[Admin-Quick-Reference.md](Admin-Quick-Reference.md)**  
**Developer?** Start with **[Admin-Dashboard-Implementation.md](Admin-Dashboard-Implementation.md)**

---

**Questions?** Check the documentation, review the source code, or reach out to the development team.

Happy administrating! 🚀
