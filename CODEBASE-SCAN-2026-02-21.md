# SkinLytix Cosmetic Science Apprentice Reviewer - COMPLETE CODEBASE SCAN
**Date:** February 21, 2026  
**Status:** Implementation Status Report

---

## 📊 EXECUTIVE SUMMARY: What's Already Built

✅ **FULLY IMPLEMENTED:**
- Student Reviewer Dashboard page (497 lines)
- Ingredient Validation Panel component (365 lines)
- Ingredient Source Panel component (258 lines)  
- Validation Progress Bar component
- Database schema (ingredient_validations + ingredient_corrections tables)
- Access control (role + certification checks)
- Ingredient caching system
- Product-to-ingredient workflow

⚠️ **PARTIALLY IMPLEMENTED:**
- Basic yes/no validation (needs OEW framework upgrade)
- Simple corrections fields (needs full workflow expansion)
- Reference sources (needs citation builder)

❌ **NOT YET BUILT:**
- OEW workflow components (Observation, Evidence, Writing panels)
- Citation builder form
- Confidence level selector (High/Moderate/Limited)
- Verdict selector (Confirm/Correct/Escalate)
- Consumer explanation textarea
- Edge functions for validation queue
- Escalation workflow
- Public explanation field in database

---

## 📁 EXISTING CODEBASE STRUCTURE

### Pages
```
src/pages/dashboard/
├── StudentReviewer.tsx (497 lines) ✅ MAIN PAGE
│   ├── Access control (role + certification)
│   ├── Products list view
│   ├── Ingredient validation view
│   ├── Two-column layout (ingredients + validation panel)
│   └── Stats cards (products to validate, validated count, flagged count)
```

### Components - Already Built
```
src/components/reviewer/
├── IngredientValidationPanel.tsx (365 lines) ✅
│   ├── PubChem data verification (correct/incorrect)
│   ├── AI explanation verification (accurate/needs revision)
│   ├── Corrections section (role, safety level, notes)
│   ├── Reference sources selection (checkboxes)
│   └── Save validation button
│
├── IngredientSourcePanel.tsx (258 lines) ✅
│   ├── Data Sources tabs (PubChem, AI, OBF)
│   ├── PubChem data display
│   ├── AI analysis display
│   ├── Open Beauty Facts data display
│   └── Quick reference links (CIR, EWG, Paula's Choice, INCIDecoder)
│
└── ValidationProgressBar.tsx ✅
    ├── Progress bar visualization
    ├── Status badges (validated, needs correction, remaining)
    └── Completion message
```

### Database - Already Built
```
Migrations:
├── 20260104005003_34878ee2-66c8-44d8-9bee-9967ac0ee146.sql
│   ├── ingredient_validations table
│   ├── ingredient_corrections table
│   ├── RLS policies
│   └── Indexes & constraints
```

---

## 🗄️ DATABASE SCHEMA: What Exists

### Table: `ingredient_validations` (CREATED)

**Current columns:**
```typescript
{
  id: UUID (primary key);
  
  // Link to analysis
  analysis_id: UUID;
  ingredient_name: TEXT;
  
  // Validator info
  validator_id: UUID;
  validator_institution: TEXT;
  
  // PubChem verification
  pubchem_data_correct: BOOLEAN;
  pubchem_cid_verified: TEXT;
  molecular_weight_correct: BOOLEAN;
  
  // AI verification
  ai_explanation_accurate: BOOLEAN;
  ai_role_classification_correct: BOOLEAN;
  
  // Corrections (filled if verification fails)
  corrected_role: TEXT;
  corrected_safety_level: TEXT;
  correction_notes: TEXT;
  
  // Source tracking
  reference_sources: JSONB (array of strings);
  
  // Status
  validation_status: TEXT ('validated', 'needs_correction');
  
  created_at: TIMESTAMPTZ;
}
```

**Missing columns (needed for OEW workflow):**
```typescript
  ai_claim_summary: TEXT;              // ❌ NOT IN DB
  verdict: TEXT;                        // ❌ NOT IN DB (confirm/correct/escalate)
  public_explanation: TEXT;             // ❌ NOT IN DB (150-300 word plain language)
  confidence_level: TEXT;               // ❌ NOT IN DB (High/Moderate/Limited)
  internal_notes: TEXT;                 // ❌ NOT IN DB (for moderator review)
  is_escalated: BOOLEAN;                // ❌ NOT IN DB
  escalation_reason: TEXT;              // ❌ NOT IN DB
  moderator_review_status: TEXT;        // ❌ NOT IN DB
```

### Table: `ingredient_corrections` (CREATED)

**Current columns:**
```typescript
{
  id: UUID;
  ingredient_name: TEXT (unique);
  canonical_name: TEXT;
  verified_pubchem_cid: TEXT;
  verified_molecular_weight: NUMERIC;
  verified_role: TEXT;
  verified_safety_level: TEXT;
  verified_explanation: TEXT;
  common_names: TEXT[];
  validation_count: INTEGER;
  last_validated_by: UUID;
  last_validated_at: TIMESTAMPTZ;
  created_at: TIMESTAMPTZ;
  updated_at: TIMESTAMPTZ;
}
```

**Status:** ✅ Ready for corrections management

### Missing Table: `ingredient_validation_citations`

**NOT YET CREATED** — Needed for:
```typescript
{
  id: UUID;
  validation_id: UUID (FK to ingredient_validations);
  citation_type: TEXT (peer_reviewed, clinical_study, systematic_review, dermatology_textbook);
  title: TEXT;
  authors: TEXT;
  journal_name: TEXT;
  publication_year: INTEGER;
  doi_or_pmid: TEXT;
  source_url: TEXT;
  created_at: TIMESTAMPTZ;
}
```

---

## 💻 COMPONENT ANALYSIS: Current Implementation

### StudentReviewer.tsx (Main Page) — 497 Lines

**WHAT'S WORKING:**
```jsx
✅ Access control:
   - Check for moderator/admin role
   - Check for student certification
   - Redirect if no access

✅ Products list view:
   - Load recent analyses (50 max)
   - Display product name, brand, category
   - Show ingredient count
   - Click to select product

✅ Ingredient validation view:
   - Two-column layout (ingredients list + validation panel)
   - Left sidebar: scrollable ingredient list with status icons
   - Right side: IngredientValidationPanel + IngredientSourcePanel
   - Progress bar showing validated/needs correction/remaining
   - Back button to exit

✅ Stats cards:
   - Products to validate
   - Ingredients validated
   - Flagged for correction

✅ Data loading:
   - Load products from user_analyses
   - Load validations for selected product
   - Load ingredient cache (PubChem, molecular weight)
```

**WHAT'S MISSING:**
```jsx
❌ Validation queue system (should load NEXT unvalidated, not all products)
❌ Step-by-step OEW workflow (currently just yes/no + corrections)
❌ Confidence level selector
❌ Verdict selector (confirm/correct/escalate)
❌ Public explanation textarea
❌ Citation builder form
❌ Reviewer accuracy stats
❌ Escalation workflow
```

---

### IngredientValidationPanel.tsx (365 Lines)

**WHAT'S WORKING:**
```jsx
✅ PubChem data section:
   - Display CID and molecular weight
   - Link to PubChem
   - Correct/Incorrect buttons (boolean toggle)

✅ AI explanation section:
   - Display AI role and explanation
   - Accurate/Needs Revision buttons (boolean toggle)

✅ Corrections section (conditional):
   - Shows only when pubchemCorrect=false OR aiAccurate=false
   - Role selector dropdown (13 roles: humectant, emollient, surfactant, etc.)
   - Safety level dropdown (safe, caution, avoid)
   - Correction notes textarea

✅ Reference sources section:
   - Checkbox list of 7 sources (PubChem, CIR, EWG, Paula's Choice, Academic Textbook, Peer-Reviewed Paper, Other)
   - Toggle sources with checkboxes

✅ Save button:
   - Validates that pubchemCorrect and aiAccurate are set
   - Saves to ingredient_validations table
   - Sets status to 'validated' or 'needs_correction'
   - Calls onValidationComplete callback

✅ Existing validation:
   - Loads and displays previous validation if exists
   - Allows re-validation
```

**WHAT'S MISSING:**
```jsx
❌ "Observation" panel (display AI claim clearly)
❌ "Evidence" panel (citation builder + list)
❌ "Writing" panel (public explanation textarea)
❌ Confidence level selector (High/Moderate/Limited with radio buttons)
❌ Verdict selector (Confirm/Correct/Escalate with radio buttons)
❌ ai_claim_summary field
❌ public_explanation field
❌ confidence_level field
❌ internal_notes field
❌ is_escalated flag
❌ escalation_reason field
❌ Step indicator showing Obs → Evi → Wri → Conf → Verd

WORKFLOW MISMATCH:
- Current: Yes/No checkboxes for PubChem and AI accuracy
- Needed: Full OEW framework with 6 steps
```

---

### IngredientSourcePanel.tsx (258 Lines)

**WHAT'S WORKING:**
```jsx
✅ Tabs for data sources (PubChem, AI, OBF)

✅ PubChem tab:
   - Display CID, molecular weight, formula
   - Show IUPAC name and synonyms
   - Link to PubChem website

✅ AI tab:
   - Display classified role
   - Display safety level
   - Display AI explanation

✅ OBF tab:
   - Display category
   - Display functions
   - Link to Open Beauty Facts

✅ Quick reference links:
   - CIR Database
   - EWG Skin Deep
   - Paula's Choice
   - INCIDecoder
```

**WHAT'S MISSING:**
```jsx
❌ Not part of OEW workflow currently
❌ Should integrate with Evidence panel
❌ Citation format/preview
```

---

### ValidationProgressBar.tsx

**WHAT'S WORKING:**
```jsx
✅ Progress bar with percentage
✅ Status badges (validated, needs correction, remaining)
✅ Completion message when all ingredients done
```

**WHAT'S MISSING:**
```jsx
❌ Step indicators (Observation → Evidence → Writing → Confidence → Verdict)
❌ Per-step progress tracking
```

---

## 🔧 WHAT NEEDS TO BE BUILT NEXT

### Priority 1: Database Updates (Critical)

**Migration needed:**
```sql
ALTER TABLE ingredient_validations ADD COLUMN (
  ai_claim_summary TEXT,                          -- What AI claimed
  verdict TEXT CHECK (verdict IN ('confirm', 'correct', 'escalate')),
  public_explanation TEXT,                         -- 150-300 word explanation
  confidence_level TEXT CHECK (confidence_level IN ('High', 'Moderate', 'Limited')),
  internal_notes TEXT,                             -- For moderator review
  is_escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  moderator_review_status TEXT                    -- pending, approved, rejected
);

-- Create citations junction table
CREATE TABLE ingredient_validation_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id UUID REFERENCES ingredient_validations(id) ON DELETE CASCADE,
  citation_type TEXT CHECK (citation_type IN ('peer_reviewed', 'clinical_study', 'systematic_review', 'dermatology_textbook')),
  title TEXT NOT NULL,
  authors TEXT NOT NULL,
  journal_name TEXT NOT NULL,
  publication_year INTEGER,
  doi_or_pmid TEXT NOT NULL,
  source_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

### Priority 2: New Components (OEW Framework)

**Need to create:**

1. **OEWObservationPanel.tsx**
   - Display ingredient name (large)
   - Show AI claim summary
   - Show AI role classification
   - Show AI safety level
   - Read-only section (reviewers observe first)

2. **OEWEvidencePanel.tsx**
   - Citation form (title, authors, journal, year, DOI/PMID, URL)
   - Add/remove citation buttons
   - Citation list (show added citations)
   - Citation count badge
   - Minimum 1 citation validation

3. **OEWWritingPanel.tsx**
   - Large textarea for public explanation (150-300 words)
   - Word count display
   - Plain language tips
   - Placeholder with guidance

4. **ConfidenceLevelSelector.tsx**
   - Radio buttons: High / Moderate / Limited
   - Help text for each level
   - Evidence quality assessment guide

5. **VerdictSelector.tsx**
   - Radio buttons: Confirm / Correct / Escalate
   - Description for each option
   - Visual indicators

6. **CorrectionInput.tsx**
   - Text area (visible only if verdict = "correct")
   - "What needs to be corrected?" placeholder

7. **CitationForm.tsx**
   - Individual citation form
   - Fields: type, title, authors, journal, year, DOI/PMID, URL
   - Validate DOI/PMID format
   - Add button to insert into list

8. **CitationList.tsx**
   - Display added citations
   - Remove button for each
   - Citation count

9. **ReviewerAccuracyCard.tsx**
   - Show reviewer stats
   - Validations completed
   - Accuracy percentage
   - Institution name

### Priority 3: Edge Functions (Backend)

**Need to create:**

1. **validate-ingredient** (POST)
   - Accept full validation JSON with all OEW data + citations
   - Validate all required fields present
   - Check user has apprentice role
   - Verify citation URLs
   - Save to ingredient_validations + ingredient_validation_citations

2. **get-validation-queue** (GET)
   - Return next N unvalidated ingredients
   - Filter by institution if multi-tenant
   - Exclude already-validated
   - Include product context
   - Return pagination

3. **validate-citation-url** (POST)
   - Accept DOI or PMID
   - Verify URL accessibility
   - Extract title/authors from PubMed API
   - Return metadata

### Priority 4: UI Enhancements

**Update IngredientValidationPanel.tsx:**
- Replace simple yes/no with OEW workflow
- Integrate 6 new components
- Step indicator at top
- Remove old "corrections" section
- Add new workflow sections

**Update StudentReviewer.tsx:**
- Add queue system instead of showing all products
- Add reviewer stats card at top
- Update progress bar to show OEW steps
- Add step navigation

---

## 🗄️ DATA FLOW: Current vs Needed

### CURRENT FLOW (Simple Yes/No)
```
User → Click Product
     → See ingredients list
     → Select ingredient
     → Verify: PubChem correct? (yes/no)
     → Verify: AI accurate? (yes/no)
     → If no: Enter corrections (role, safety, notes)
     → Select reference sources (checkboxes)
     → Click Save
     → Status: validated OR needs_correction
```

### NEEDED FLOW (OEW Framework)
```
User → Get next ingredient from queue
     → OBSERVATION:
        - Read AI claim
        - See AI classification
        - Understand what needs verification
     → EVIDENCE:
        - Find peer-reviewed sources
        - Add citations (title, authors, journal, DOI/PMID, URL)
        - Minimum 1 required
     → WRITING:
        - Write 150-300 word consumer-friendly explanation
        - Plain language, no jargon
        - Lead with safety info
     → CONFIDENCE:
        - Choose High/Moderate/Limited
        - Based on evidence quality
     → VERDICT:
        - Choose Confirm/Correct/Escalate
        - If Correct: enter what needs changing
        - If Escalate: explain why insufficient
     → SAVE:
        - All fields validated
        - Saved to ingredient_validations + citations
        - Moderator review status = pending
        - Move to next ingredient
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Database (1-2 hours)
- [ ] Create migration file for new columns
- [ ] Create migration file for ingredient_validation_citations table
- [ ] Add RLS policies for citations table
- [ ] Test migrations in local Supabase

### Phase 2: Components (4-6 hours)
- [ ] OEWObservationPanel.tsx
- [ ] OEWEvidencePanel.tsx + CitationForm.tsx + CitationList.tsx
- [ ] OEWWritingPanel.tsx
- [ ] ConfidenceLevelSelector.tsx
- [ ] VerdictSelector.tsx
- [ ] CorrectionInput.tsx
- [ ] ReviewerAccuracyCard.tsx

### Phase 3: Update Main Panel (2-3 hours)
- [ ] Refactor IngredientValidationPanel.tsx
- [ ] Add step indicator
- [ ] Integrate 6 new components
- [ ] Update save logic for full OEW data

### Phase 4: Edge Functions (2-3 hours)
- [ ] validate-ingredient function
- [ ] get-validation-queue function
- [ ] validate-citation-url function

### Phase 5: Integration (1-2 hours)
- [ ] Update StudentReviewer.tsx
- [ ] Add queue system
- [ ] Add reviewer stats
- [ ] Test complete workflow

### Phase 6: Testing & Refinement (1-2 hours)
- [ ] Test validation with all 3 verdict types
- [ ] Test citation saving
- [ ] Test escalation flag
- [ ] Manual testing of OEW workflow

---

## 🎯 NEXT IMMEDIATE STEPS

1. **Review this scan** — Confirm understanding of what's built
2. **Create database migration** — Add missing columns to ingredient_validations
3. **Create citations table** — ingredient_validation_citations
4. **Start with OEWObservationPanel** — Simplest component to build first
5. **Progress to Evidence & Writing** — More complex but follow pattern
6. **Update main panel** — Integrate all components
7. **Test complete workflow** — End-to-end validation

---

## 📊 FILE INVENTORY

### Page
- `/src/pages/dashboard/StudentReviewer.tsx` (497 lines)

### Components
- `/src/components/reviewer/IngredientValidationPanel.tsx` (365 lines)
- `/src/components/reviewer/IngredientSourcePanel.tsx` (258 lines)
- `/src/components/reviewer/ValidationProgressBar.tsx` (simple)

### Database
- `/supabase/migrations/20260104005003_*.sql` (ingredient tables)

### Missing (To Build)
- `/src/components/reviewer/OEWObservationPanel.tsx`
- `/src/components/reviewer/OEWEvidencePanel.tsx`
- `/src/components/reviewer/OEWWritingPanel.tsx`
- `/src/components/reviewer/ConfidenceLevelSelector.tsx`
- `/src/components/reviewer/VerdictSelector.tsx`
- `/src/components/reviewer/CorrectionInput.tsx`
- `/src/components/reviewer/CitationForm.tsx`
- `/src/components/reviewer/CitationList.tsx`
- `/src/components/reviewer/ReviewerAccuracyCard.tsx`
- `/supabase/functions/validate-ingredient/index.ts`
- `/supabase/functions/get-validation-queue/index.ts`
- `/supabase/functions/validate-citation-url/index.ts`

---

## ✅ CONCLUSION

**The foundation is solid:**
- ✅ Database structure exists
- ✅ Role access control working
- ✅ Product/ingredient loading working
- ✅ Basic validation UI exists
- ✅ Status tracking functional

**What's needed:**
- ❌ OEW workflow components (6 new components)
- ❌ Enhanced database fields (11 new columns)
- ❌ Citations table (new table)
- ❌ Edge functions (3 new functions)
- ❌ Full workflow integration

**Build order: Database → Components → Main Panel → Edge Functions → Integration → Test**
