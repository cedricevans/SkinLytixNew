# Admin Dashboard - Setup & Usage Guide

## Overview

The Admin Dashboard provides full CRUD (Create, Read, Update, Delete) capabilities for managing users, roles, certifications, and reviewer groups. This is the central control panel for the 3 authorized administrators.

## Authorization

**Only these 3 emails can access the Admin Dashboard:**

- `alicia@xiosolutionsllc.com`
- `cedric.evans@gmail.com`
- `pte295@gmail.com`

Attempting to access `/admin` with any other email will show an access denied message.

## Access

Navigate to: `http://localhost:8080/admin` (or your production URL + `/admin`)

## Dashboard Components

### 1. **Users & Roles Tab**
Manage user roles in the system.

**Features:**
- View all users with assigned roles
- Search users by email
- Add new roles to users (admin or reviewer)
- Remove roles for users
- Real-time stats update

**Steps to Add a Role:**
1. Click "Add Role" button
2. Enter the user's email address
3. Select role: Admin or Reviewer
4. Click "Add Role"

**Notes:**
- User must already have a SkinLytix account to assign a role
- Role types: `admin` | `reviewer` | `user`

---

### 2. **Certifications Tab**
Manage student certifications and qualification levels.

**Features:**
- View all student certifications
- Add new certifications
- Edit certification details (institution, level)
- Delete certifications
- Search by email
- Track certification levels: Associate, Specialist, Expert

**Steps to Add a Certification:**
1. Click "Add Certification" button
2. Enter student email
3. Enter institution name
4. Select certification level (Associate / Specialist / Expert)
5. Click "Add Certification"

**Certification Levels:**
- `associate` - Entry-level certification
- `specialist` - Mid-level certification
- `expert` - Advanced certification

**Notes:**
- Institution field is required (e.g., "Harvard Cosmetic Science Institute")
- Certifications are created as active by default

---

### 3. **Groups Tab** (Coming Soon)
Organize reviewers into groups for batch assignment and management.

**Planned Features:**
- Create reviewer groups
- Add/remove reviewers from groups
- Assign review batches to groups
- Track group membership

**Status:** Requires database migration for `reviewer_groups` table

---

### 4. **Audit Log Tab** (Coming Soon)
Track all administrative actions for compliance and debugging.

**Planned Features:**
- View all admin actions with timestamps
- Filter by action type (create_role, delete_role, etc.)
- Filter by administrator email
- See before/after values for edits

**Status:** Requires database migration for `audit_logs` table

---

## File Structure

```
src/
├── pages/
│   └── AdminDashboard.tsx          (Main admin page - authorization & layout)
│
└── components/
    └── admin/
        ├── UserRoleManager.tsx      (User roles CRUD)
        ├── CertificationManager.tsx (Certifications CRUD)
        ├── ReviewerGroupManager.tsx (Group management - pending DB)
        └── AuditLog.tsx             (Admin action tracking - pending DB)
```

---

## Database Schema

### Current Tables Used

**user_roles**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- role (text: 'admin' | 'reviewer' | 'user')
- created_at (TIMESTAMPTZ)
```

**student_certifications**
```sql
- id (UUID, PK)
- user_id (UUID, FK)
- institution (TEXT)
- certification_level (TEXT: 'associate' | 'specialist' | 'expert')
- created_at (TIMESTAMPTZ)
```

### Planned Tables

**reviewer_groups** (needs migration)
```sql
- id (UUID, PK)
- name (TEXT, unique)
- description (TEXT, optional)
- created_at (TIMESTAMPTZ)
```

**audit_logs** (needs migration)
```sql
- id (UUID, PK)
- action (TEXT: 'create_role' | 'delete_role' | 'update_cert' | etc)
- admin_email (TEXT)
- target_user (TEXT, optional)
- details (JSONB, optional)
- created_at (TIMESTAMPTZ)
```

---

## Statistics Dashboard

The dashboard displays 4 key metrics:

1. **Total Users** - Users with any assigned role
2. **Reviewers** - Count of reviewer roles
3. **Certified Reviewers** - Count of active certifications
4. **Reviewer Groups** - Count of groups (0 until feature enabled)

---

## Access Control & Permissions

### Authentication

- Uses Supabase Auth
- Checks email against `ADMIN_EMAILS` whitelist in `AdminDashboard.tsx`
- Falls back to login if no active session

### Database-Level Security (RLS)

All admin operations are protected by Row-Level Security policies:

- Admins can manage roles for other users
- Only authenticated admins can view/modify certifications
- Group management requires admin role

---

## Common Workflows

### Add a Reviewer

1. Navigate to "Users & Roles" tab
2. Click "Add Role"
3. Enter reviewer's email
4. Select "Reviewer" role
5. Confirm

### Certify a Reviewer

1. Go to "Certifications" tab
2. Click "Add Certification"
3. Enter reviewer's email
4. Enter their institution
5. Select level: Associate → Specialist → Expert
6. Save

### Bulk Operations

For bulk user imports or CSV uploads:
- Currently manual one-at-a-time via UI
- Future enhancement: CSV import modal in Users tab

---

## Troubleshooting

### "Access Denied" Message

**Cause:** Your email is not in the `ADMIN_EMAILS` list
**Solution:** Contact an authorized admin to be added

### "User Not Found" Error

**Cause:** The email you entered doesn't have a SkinLytix account yet
**Solution:** Have the user sign up first, then assign roles

### "Failed to Save" Error

**Cause:** Database connection issue or RLS policy violation
**Solution:** 
- Check Supabase status
- Verify your user has admin role in database
- Check browser console for details

### Buttons Disabled

**Cause:** Form submission in progress
**Solution:** Wait for operation to complete

---

## Future Enhancements

### Phase 2: Group Management
- [ ] Create reviewer_groups database table
- [ ] Add multi-select reviewer picker in group manager
- [ ] Implement batch assignment workflow
- [ ] Add group member management (add/remove)

### Phase 3: Audit Trail
- [ ] Create audit_logs database table
- [ ] Log all CRUD operations
- [ ] Add export audit log as CSV
- [ ] Implement compliance report generation

### Phase 4: Advanced Features
- [ ] CSV/Excel import for bulk role assignment
- [ ] User deactivation (soft delete)
- [ ] Role change history with before/after values
- [ ] Permission matrix visualization for Pascal's review control

---

## Contact & Support

For questions or issues:
- Review the TESTING-ROLES-SETUP.md for role testing methods
- Check database migrations in `supabase/migrations/`
- Consult Cosmetic-Science-Apprentice documentation for workflow context
