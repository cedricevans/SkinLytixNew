# SkinLytix Platform — Implementation Status & User Workflows

**Document Date:** February 25, 2026  
**Status:** Production-Ready (Part I), In-Development (Part II)  
**Repository:** https://github.com/cedricevans/SkinLytixNew

---

## Executive Summary

The SkinLytix platform implements a **two-part apprentice contribution system**:

1. **Part I: Ingredient Validation Workflow** ✅ **COMPLETE & LIVE**
2. **Part II: Educational Article Publishing** ⏳ **In Development**

This document outlines both workflows, system architecture, and user access levels for your team's reference.

---

# PART I: INGREDIENT VALIDATION WORKFLOW ✅

## Overview

The Ingredient Validation Workflow enables **Cosmetic Science Apprentices** to review, correct, and validate ingredient data submitted by product scanners. This ensures scientific accuracy across the entire product database.

### Key Principles
- **Human Expert Verification** — Apprentices validate AI-generated ingredient data against peer-reviewed literature
- **Citation-Backed Claims** — Every validation must include ≥1 peer-reviewed source
- **Confidence Transparency** — Apprentices rate confidence (High/Moderate/Limited) on each validation
- **No Score Inflation** — Validations refine scientific accuracy without affecting EpiQ product scores
- **12-Month Review Cycle** — Validated ingredients flagged for re-review after 12 months

---

## User Types & Access Levels

### 1. **ADMINS** (Platform Operators)

**Authorized Users:**
- `alicia@xiosolutionsllc.com`
- `cedric.evans@gmail.com`
- `pte295@gmail.com`

**Access:**
- Admin Dashboard: `/admin`
- Reviewer Dashboard: `/dashboard/reviewer`

**Capabilities:**
- Assign moderator/user roles to apprentices
- Manage certifications (institution, level)
- View system statistics
- Manage reviewer groups (planned)
- Audit logging (planned)

**Access Granted:** Email whitelist + admin role in `user_roles` table

---

### 2. **MODERATORS / CERTIFIED APPRENTICES** (Ingredient Validators)

**Qualifications:**
- Authenticated SkinLytix user
- **ONE OF:**
  - `moderator` role assigned by admin, OR
  - `student_certification` record with institution + level

**Access:**
- Reviewer Dashboard: `/dashboard/reviewer`
- Cannot access admin panel

**Capabilities:**
- View ingredient validation queue
- Complete 6-step OEW validation workflow
- Submit corrected ingredient data
- Write public explanations
- Earn "Human Expert Verified" badges
- Author educational articles (Part II)

**Access Granted:** `user_roles` table OR `student_certifications` table

---

### 3. **REGULAR USERS** (Product Contributors)

**Anyone who signs up at:** `/auth`

**Access:**
- Product Upload: `/upload`
- Analysis Viewing: `/analysis/:id`
- Personal dashboard (planned)

**Capabilities:**
- Scan products with camera or manual entry
- View ingredient analysis results
- See validation results for their scans
- Optionally become an apprentice (via admin role assignment)

**Access Granted:** Supabase Auth signup

---

## The 6-Step Validation Workflow

### **Step 1: Observation** (Read-Only Review)

**What Apprentice Sees:**
- Ingredient name
- AI-generated role classification
- AI-generated safety level
- AI-generated explanation
- PubChem data (molecular weight, CID)
- Scope tags (face/body/scalp)
- Current version info (if exists)

**What Apprentice Does:**
- Reviews AI output for accuracy
- Evaluates scientific reasonableness
- Prepares to validate against literature

**Data Source:** `ingredient_cache` table (PubChem + AI analysis)

---

### **Step 2: Evidence** (Citation Entry) 

**Requirement:** ≥1 peer-reviewed scientific citation

**Citation Fields (Required):**
- Citation Type (Journal, Book, Conference, Thesis, etc.)
- Title
- Authors
- Journal Name (if applicable)
- Publication Year
- DOI or PubMed ID
- Source URL (optional)

**What Apprentice Does:**
- Locate peer-reviewed literature supporting or contradicting AI output
- Enter citation details
- Can add multiple citations for same ingredient
- Cannot proceed to Step 3 without ≥1 citation

**Data Storage:** `ingredient_validation_citations` table

---

### **Step 3: Writing** (Public Explanation)

**Requirement:** Consumer-friendly explanation, 150–300 words

**Content Guidelines:**
- Explain ingredient role in cosmetics (e.g., "Niacinamide is a vitamin B3 derivative that...")
- Address safety (e.g., "Safe at typical use levels in rinse-off products...")
- Cite evidence (e.g., "Research shows that...")
- Avoid jargon or include definitions
- No medical claims (cosmetics only)

**Word Count Enforcement:**
- Minimum: 150 words
- Maximum: 300 words
- Real-time counter displayed

**Public Use:**
- Displayed on product pages when ingredient is validated
- Appears as: "Scientific Explanation by [Apprentice Name]"

**Data Storage:** `ingredient_validations.public_explanation`

---

### **Step 4: Confidence Level**

**Three-Tier System:**
- **High** — Multiple peer-reviewed sources, strong consensus, well-established data
- **Moderate** — Some peer-reviewed sources, minor gaps, emerging research
- **Limited** — Few sources, contradictory data, preliminary findings

**What Apprentice Selects:**
- Confidence in their validation accuracy
- Based on literature available + AI output quality

**Impact:**
- Displayed to consumers ("Confidence: Moderate")
- Helps users evaluate ingredient reliability
- Informs future review prioritization

**Data Storage:** `ingredient_validations.confidence_level`

---

### **Step 5: Verdict**

**Three Possible Verdicts:**

#### **Verdict A: ✅ CONFIRM**
- AI output is scientifically accurate
- Ingredient data needs NO correction
- Apprentice still provides public explanation + citation

**Action:** Saves validation as-is, marks `validation_status = 'validated'`

---

#### **Verdict B: 🔧 CORRECT**
- AI output has errors
- Apprentice provides corrections
- Requires: Corrected role AND/OR corrected safety level

**Correction Fields:**
- **Corrected Role** (e.g., "Humectant" instead of "Emollient")
- **Corrected Safety Level** (e.g., "Safe" instead of "Caution")
- **Explanation** (why correction needed)

**Action:** Saves validation with corrections, updates ingredient record, marks `expert_verified = true`

---

#### **Verdict C: ⚠️ ESCALATE**
- Data is unclear, contradictory, or requires deeper expertise
- Escalates to faculty/senior scientist review

**Escalation Fields:**
- **Reason for Escalation** (e.g., "Conflicting literature regarding safety in pregnancy")
- **Citation(s)** supporting escalation

**Action:** Marks `validation_status = 'escalated'`, flags for faculty review, creates internal ticket

---

### **Step 6: Internal Notes** (Optional)

**Purpose:** Private notes for future apprentice reviews or faculty review

**Constraints:**
- ≤500 characters
- Not visible to public
- Only visible to admins and during future reviews

**Examples:**
- "AI safety level was conservative; literature supports wider application"
- "Limited data; recommend re-review when 2026 studies published"
- "Conflicts with INCI definitions; needs faculty clarification"

**Data Storage:** `ingredient_validations.internal_notes`

---

## Validation Becomes Active

Once submitted, the system:

1. **Creates validation record** in `ingredient_validations` table
2. **Stores citations** in `ingredient_validation_citations` table
3. **Updates ingredient** in `ingredient_cache` (if corrections provided)
4. **Sets timestamp** for 12-month re-review trigger
5. **Marks validated ingredient** with `expert_verified = true` flag
6. **Generates badge** for display on products

---

## Public Display: "Human Expert Verified" Badge

### On Ingredient Rows:
```
Niacinamide  |  Safe  |  ✓ Human Expert Verified — Cosmetic Science Apprentice (Spelman College)
```

### On Product Pages:
If product contains ≥1 validated ingredient:
```
🧠 Contains Expert-Verified Ingredients
This product contains ingredients that have been validated by certified cosmetic science apprentices.
```

### Ingredient Details Page:
```
Scientific Background by Maya R., Spelman '27
(Reviewed February 2026)

[150–300 word explanation]

Sources:
• Journal of Cosmetic Dermatology, 2024
• INCI Dictionary, 2025
• [Link to citation details]

Confidence Level: Moderate
```

---

## Data Model for Ingredient Validation

### Database Tables

#### **ingredient_validations**
```sql
CREATE TABLE ingredient_validations (
  id UUID PRIMARY KEY,
  ingredient_id UUID NOT NULL,
  analysis_id UUID,
  validator_id UUID NOT NULL (references profiles),
  validation_status TEXT ('validated' | 'escalated' | 'pending'),
  
  -- Step 1: Observation (read-only, sourced from ingredient_cache)
  ai_role_classification TEXT,
  ai_safety_level TEXT,
  ai_explanation TEXT,
  
  -- Step 2: Evidence (citations stored in ingredient_validation_citations)
  -- (see separate table)
  
  -- Step 3: Writing
  public_explanation TEXT,
  
  -- Step 4: Confidence
  confidence_level TEXT ('High' | 'Moderate' | 'Limited'),
  
  -- Step 5: Verdict + Corrections
  verdict TEXT ('confirm' | 'correct' | 'escalate'),
  corrected_role TEXT,
  corrected_safety_level TEXT,
  correction_notes TEXT,
  escalation_reason TEXT,
  
  -- Step 6: Internal Notes
  internal_notes TEXT,
  
  -- Metadata
  expert_verified BOOLEAN DEFAULT true,
  moderator_review_status TEXT ('pending' | 'approved' | 'rejected'),
  review_due_date DATE (12 months from created_at),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### **ingredient_validation_citations**
```sql
CREATE TABLE ingredient_validation_citations (
  id UUID PRIMARY KEY,
  validation_id UUID NOT NULL (references ingredient_validations),
  
  citation_type TEXT ('journal' | 'book' | 'conference' | 'thesis' | 'other'),
  title TEXT,
  authors TEXT,
  journal TEXT,
  year INT,
  doi_or_pmid TEXT,
  source_url TEXT,
  
  created_at TIMESTAMP
);
```

#### **ingredient_cache** (Pre-populated)
```sql
CREATE TABLE ingredient_cache (
  id UUID PRIMARY KEY,
  ingredient_name TEXT,
  pubchem_cid TEXT,
  molecular_weight NUMERIC,
  ai_role TEXT,
  ai_safety_level TEXT,
  ai_explanation TEXT,
  properties_json JSONB,
  expert_verified BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

#### **user_roles**
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (references profiles),
  role TEXT ('admin' | 'moderator' | 'user'),
  
  UNIQUE(user_id, role),
  created_at TIMESTAMP
);
```

#### **student_certifications**
```sql
CREATE TABLE student_certifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL (references profiles),
  institution TEXT,
  certification_level TEXT,
  
  created_at TIMESTAMP
);
```

---

## Access Control

### Authorization Check (StudentReviewer.tsx)

User can access `/dashboard/reviewer` IF:

```
Authenticated AND (
  (user has moderator role in user_roles) OR 
  (user has student_certification record)
)
```

### Admin Access Check (AdminDashboard.tsx)

User can access `/admin` IF:

```
Authenticated AND (
  user.email IN ['alicia@xiosolutionsllc.com', 'cedric.evans@gmail.com', 'pte295@gmail.com']
)
```

---

# PART II: EDUCATIONAL ARTICLE WORKFLOW ⏳

## Overview

Apprentices author educational articles explaining cosmetic ingredients to consumers. Articles undergo faculty review before publication.

## Status: **In Development**

The following features are **planned** but not yet implemented:

- [ ] Article submission dashboard (`/dashboard/articles`)
- [ ] Draft/Submit/Approved/Published workflow
- [ ] Faculty review queue
- [ ] Citation management for articles
- [ ] Publication pipeline
- [ ] Public article display (ingredient pages)

## Proposed Flow (When Built)

### **Step 1: Apprentice Writes Article**

**Route:** `/dashboard/articles`

**Article Fields:**
- Title (50–150 chars)
- Content (400–1200 words)
- ≥1 peer-reviewed citation
- Author attribution (name or anonymous)

**Status:** Draft (editable, private)

---

### **Step 2: Submit for Faculty Review**

**Action:** Click "Submit for Review" button

**Effect:**
- Status changes to "Submitted"
- Editing locked
- Sent to faculty review queue

---

### **Step 3: Faculty Review**

**Faculty Dashboard:** `/admin/faculty-review`

**Faculty Can:**
- View article + citations
- Evaluate scientific integrity
- Approve / Reject with notes

**If Rejected:**
- Status → "Rejected"
- Apprentice sees notes
- Can revise and resubmit

**If Approved:**
- Status → "Approved"
- Ready to publish

---

### **Step 4: Publish**

**Action:** Automatic or manual publish

**Effect:**
- Status → "Published"
- Article visible on platform:
  - Ingredient detail pages
  - Product analysis pages
  - Apprentice profile

**Display Format:**
```
"Niacinamide Explained" by Maya R., Spelman '27
(Reviewed prior to publication)

[Article content]

Sources:
• [Citations]
```

---

## Database Tables (Part II - To Be Created)

```sql
CREATE TABLE apprentice_articles (
  id UUID PRIMARY KEY,
  apprentice_id UUID NOT NULL,
  title TEXT,
  content TEXT (400–1200 words),
  status TEXT ('draft' | 'submitted' | 'rejected' | 'approved' | 'published'),
  
  created_at TIMESTAMP,
  submitted_at TIMESTAMP,
  published_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE article_citations (
  id UUID PRIMARY KEY,
  article_id UUID NOT NULL,
  -- Same fields as ingredient_validation_citations
  citation_type TEXT,
  title TEXT,
  authors TEXT,
  journal TEXT,
  year INT,
  doi_or_pmid TEXT
);

CREATE TABLE faculty_reviews (
  id UUID PRIMARY KEY,
  article_id UUID NOT NULL,
  reviewer_id UUID NOT NULL (admin/faculty),
  status TEXT ('approved' | 'rejected'),
  notes TEXT,
  
  created_at TIMESTAMP
);
```

---

# SYSTEM ARCHITECTURE

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript |
| **UI Components** | Shadcn/UI + Tailwind CSS |
| **State Management** | React Hooks + Local Storage |
| **Backend** | Supabase (PostgreSQL + Auth) |
| **APIs** | Edge Functions (Deno) |
| **Hosting** | Vercel (frontend) + Supabase (backend) |

---

## Key Components (Part I)

| Component | Purpose | Lines |
|-----------|---------|-------|
| `StudentReviewer.tsx` | Main validator dashboard | 520 |
| `IngredientValidationPanel.tsx` | 6-step form container | 437 |
| `OEWObservationPanel.tsx` | Step 1 (AI review) | ~100 |
| `OEWEvidencePanel.tsx` | Step 2 (citations) | ~100 |
| `OEWWritingPanel.tsx` | Step 3 (public explanation) | ~100 |
| `ConfidenceLevelSelector.tsx` | Step 4 (confidence) | ~80 |
| `VerdictSelector.tsx` | Step 5 (verdict) | ~150 |
| `InternalNotesPanel.tsx` | Step 6 (notes) | ~95 |
| `ReviewerAccuracyCard.tsx` | Stats display | ~160 |

---

## Database Architecture

### Core Tables (All Implemented)

```
user_auth (Supabase Auth)
  ├── profiles (user info)
  ├── user_roles (admin/moderator assignments)
  └── student_certifications (apprentice qualifications)

ingredient_data
  ├── ingredient_cache (PubChem + AI data)
  ├── ingredient_validations (OEW submissions)
  └── ingredient_validation_citations (sources)

product_data
  ├── user_analyses (product scans)
  └── products (master product list)
```

---

## Security & Authorization

### Row-Level Security (RLS)

**ingredient_validations table:**
- Apprentices can create own validations
- Apprentices can read all validations (shared queue)
- Admins can read/update all validations

**user_roles table:**
- Only admins can insert
- Uses SECURITY DEFINER function to bypass RLS

**student_certifications table:**
- Admins can create/update certifications
- Apprentices can read own certification

---

## API Endpoints

### Edge Functions

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/functions/add-user-role` | POST | Assign moderator/admin roles (admin only) |
| `/functions/analyze-product` | POST | Scan product ingredients (internal) |
| `/functions/query-pubchem` | POST | Fetch PubChem data (internal) |

---

## Development URLs

### Local Development (Port 8080/8081)
```
Home:             http://localhost:8080
Upload Product:   http://localhost:8080/upload
View Analysis:    http://localhost:8080/analysis/[id]
Reviewer Queue:   http://localhost:8080/dashboard/reviewer
Admin Dashboard:  http://localhost:8080/admin
Login:            http://localhost:8080/auth
```

### Environment Variables (`.env.local`)
```
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

# IMPLEMENTATION TIMELINE

## ✅ COMPLETED (Part I)

- [x] Database schema (7 core tables)
- [x] Supabase Auth setup
- [x] 6-step validation workflow
- [x] Admin role management
- [x] Student certification system
- [x] RLS policies
- [x] Citation storage
- [x] Validation status tracking
- [x] 12-month review trigger
- [x] Public display badges
- [x] Stats/accuracy tracking

---

## ⏳ IN DEVELOPMENT (Part II)

- [ ] Article submission interface
- [ ] Faculty review dashboard
- [ ] Article approval workflow
- [ ] Publication pipeline
- [ ] Public article display

---

## 📋 FUTURE ENHANCEMENTS

- [ ] Email notifications (validation submitted, approved, etc.)
- [ ] Apprentice profile pages (show contributed validations)
- [ ] Ingredient version history & comparison
- [ ] Batch validation import
- [ ] Reviewer groups/teams
- [ ] Audit logging
- [ ] Leaderboards/gamification
- [ ] AI model retraining pipeline

---

# ADMIN QUICK START

## Assigning a User as Moderator/Apprentice

1. **Log in** with admin email
2. **Go to:** `/admin`
3. **Click:** "Users & Roles" tab
4. **Enter:** User's email address
5. **Select:** "Moderator" from dropdown
6. **Click:** "Add Role"
7. **Confirm:** User now appears in roles list

---

## Adding Student Certification

1. **Go to:** `/admin`
2. **Click:** "Certifications" tab
3. **Enter:** User's email, institution, level
4. **Click:** "Add Certification"
5. **Result:** User gains reviewer access

---

## Reviewing Validations (Future)

When Part II launches:

1. **Go to:** `/admin/faculty-review`
2. **View:** Submitted articles
3. **Approve:** If scientifically sound
4. **Reject:** If issues exist (with notes)
5. **Published articles** appear publicly

---

# FAQ

### Q: Can an admin also be a moderator?
**A:** Yes. Admins can have both the admin role and moderator role.

### Q: What if an apprentice validates an ingredient incorrectly?
**A:** The validation is submitted with its confidence level. Future reviews (after 12 months) will catch errors. Also, escalations go to faculty for high-uncertainty cases.

### Q: Are product scores affected by validations?
**A:** No. Validations refine ingredient data accuracy without affecting EpiQ product scoring. This prevents score inflation while improving science quality.

### Q: Can validations be edited after submission?
**A:** Not in current design. They can be superseded by new validations during 12-month reviews. This maintains audit trail integrity.

### Q: Who can see internal notes?
**A:** Only admins and during future apprentice reviews. Not visible to consumers.

### Q: What happens if an apprentice leaves the program?
**A:** Their validations remain active. Admin can revoke moderator role but validations persist (they have creation timestamp).

---

# SUPPORT & CONTACT

**Repository:** https://github.com/cedricevans/SkinLytixNew

**Issues/Questions:**
- Check browser console (F12) for errors
- Verify Supabase connectivity
- Contact: `cedric.evans@gmail.com`

---

**Last Updated:** February 25, 2026  
**Version:** 1.0 (Part I Complete, Part II Planned)
