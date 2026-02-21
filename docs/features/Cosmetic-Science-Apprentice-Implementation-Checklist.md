# Cosmetic Science Apprentice Implementation Checklist

**Version:** 1.0  
**Last Updated:** February 21, 2026  
**Priority:** High  
**Epic:** Reviewer Dashboard Phase 2 - OEW Workflow  

---

## Quick Start

This document provides a prioritized, actionable checklist for implementing the Cosmetic Science Apprentice Reviewer workflow based on `docs/features/Cosmetic-Science-Apprentice-Workflow.md`.

**Estimated effort:** 80–120 hours (5–8 weeks with 2 engineers)

---

## Phase 1: MVP (Must-Have for Launch)

### Database Layer

#### Task 1.1: Add Missing Fields to `ingredient_validations` Table
**Priority:** 🔴 Critical  
**Effort:** 2 hours  
**File:** Supabase migrations or `supabase/migrations/`

```sql
-- Add new fields to existing ingredient_validations table
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS ai_claim_summary text;
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS verdict text CHECK (verdict IN ('confirm', 'correct', 'escalate'));
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS public_explanation text;
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS confidence_level text CHECK (confidence_level IN ('High', 'Moderate', 'Limited'));
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS internal_notes text;
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS is_escalated boolean DEFAULT false;
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS escalation_reason text;
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS moderator_review_status text;
ALTER TABLE ingredient_validations ADD COLUMN IF NOT EXISTS moderator_feedback text;
```

**Acceptance Criteria:**
- [ ] All 9 new columns added without errors
- [ ] Confidence level enum only allows High/Moderate/Limited
- [ ] Verdict enum only allows confirm/correct/escalate
- [ ] Backward compatibility maintained (old records still readable)
- [ ] Migration tested on staging database

#### Task 1.2: Create `ingredient_validation_citations` Join Table
**Priority:** 🔴 Critical  
**Effort:** 2 hours  
**File:** Supabase migration

```sql
CREATE TABLE ingredient_validation_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id uuid NOT NULL REFERENCES ingredient_validations(id) ON DELETE CASCADE,
  citation_type text NOT NULL CHECK (
    citation_type IN ('peer_reviewed', 'clinical_study', 'systematic_review', 'dermatology_textbook')
  ),
  title text NOT NULL,
  authors text NOT NULL,
  journal_or_book text NOT NULL,
  publication_year integer,
  doi_or_pmid text NOT NULL,
  url text NOT NULL,
  created_at timestamp DEFAULT now(),
  UNIQUE(validation_id, doi_or_pmid)
);

CREATE INDEX idx_citations_validation_id ON ingredient_validation_citations(validation_id);
CREATE INDEX idx_citations_doi_pmid ON ingredient_validation_citations(doi_or_pmid);
```

**Acceptance Criteria:**
- [ ] Table created with all fields
- [ ] Foreign key constraint works (delete validation → cascade delete citations)
- [ ] Citation type enum restricted to 4 valid values
- [ ] DOI/PMID is unique per validation
- [ ] Indexes created for query performance

#### Task 1.3: Create `ingredient_validation_queue` View
**Priority:** 🟡 Important  
**Effort:** 1 hour  
**File:** Supabase migration

```sql
CREATE VIEW ingredient_validation_queue AS
SELECT 
  ua.id as analysis_id,
  ua.product_name,
  ua.brand,
  ua.category,
  ua.epiq_score,
  STRING_AGG(DISTINCT ia.ingredient_name, ', ') as ingredients_to_validate,
  COUNT(DISTINCT ia.ingredient_name) as ingredient_count,
  COUNT(CASE WHEN iv.id IS NOT NULL THEN 1 END) as validated_count,
  ua.analyzed_at,
  ua.created_at
FROM user_analyses ua
LEFT JOIN ingredient_analysis ia ON ua.id = ia.analysis_id
LEFT JOIN ingredient_validations iv ON ua.id = iv.analysis_id AND ia.ingredient_name = iv.ingredient_name
WHERE iv.id IS NULL
GROUP BY ua.id, ua.product_name, ua.brand, ua.category, ua.epiq_score, ua.analyzed_at, ua.created_at
ORDER BY ua.analyzed_at ASC;
```

**Acceptance Criteria:**
- [ ] View returns unvalidated ingredients correctly
- [ ] Query returns product context (name, brand, category, epiq_score)
- [ ] Ingredient count matches actual ingredients
- [ ] Validated count is accurate
- [ ] Can be queried from Supabase client without errors

#### Task 1.4: Add RLS Policies
**Priority:** 🔴 Critical  
**Effort:** 1.5 hours  
**File:** Supabase policies

```sql
-- ingredient_validations RLS
CREATE POLICY ingredient_validations_select ON ingredient_validations
FOR SELECT
USING (
  auth.uid() = validator_id 
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

CREATE POLICY ingredient_validations_insert ON ingredient_validations
FOR INSERT
WITH CHECK (
  auth.uid() = validator_id
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'moderator'))
  AND EXISTS (SELECT 1 FROM student_certifications WHERE user_id = auth.uid() AND active = true)
);

-- ingredient_validation_citations RLS
CREATE POLICY citations_select ON ingredient_validation_citations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM ingredient_validations iv
    WHERE iv.id = validation_id
    AND (
      auth.uid() = iv.validator_id
      OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
    )
  )
);

CREATE POLICY citations_insert ON ingredient_validation_citations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM ingredient_validations iv
    WHERE iv.id = validation_id
    AND auth.uid() = iv.validator_id
  )
);
```

**Acceptance Criteria:**
- [ ] Reviewers can only see their own validations
- [ ] Admins can see all validations
- [ ] Only users with moderator + active certification can insert
- [ ] Citations inherit access from parent validation
- [ ] RLS policies tested with test users

---

### Backend: Edge Functions

#### Task 1.5: Create `validate-ingredient` Edge Function
**Priority:** 🔴 Critical  
**Effort:** 4 hours  
**File:** `supabase/functions/validate-ingredient/index.ts`

**Signature:**
```typescript
POST /functions/v1/validate-ingredient
Content-Type: application/json

{
  "analysis_id": "uuid",
  "ingredient_name": "string",
  "ai_claim_summary": "string",
  "verdict": "confirm|correct|escalate",
  "correction_if_any": "string|null",
  "public_explanation": "string",
  "confidence": "High|Moderate|Limited",
  "citations": [Citation[]],
  "internal_notes": "string"
}
```

**Responsibilities:**
1. Validate user authentication (JWT token)
2. Check user has moderator role + active certification
3. Validate all required fields present
4. Validate JSON schema (use Zod for input validation)
5. Validate citations have DOI or PMID
6. Check DOI/PMID URLs are accessible
7. Save to `ingredient_validations` table
8. Create citation records in `ingredient_validation_citations`
9. Return 201 Created with validation ID

**Acceptance Criteria:**
- [ ] Rejects requests from non-authenticated users (401)
- [ ] Rejects requests from users without moderator role (403)
- [ ] Rejects requests from users without active certification (403)
- [ ] Validates JSON schema on input (returns 400 if invalid)
- [ ] Validates citations have DOI or PMID (returns 400 if missing)
- [ ] Validates DOI/PMID URLs are accessible (returns 400 if dead link)
- [ ] Saves validation with all fields to database
- [ ] Creates citation records with foreign key to validation
- [ ] Returns 201 with validation ID on success
- [ ] Returns 500 on database error with helpful message
- [ ] Tested with valid and invalid inputs

#### Task 1.6: Create `get-validation-queue` Edge Function
**Priority:** 🔴 Critical  
**Effort:** 3 hours  
**File:** `supabase/functions/get-validation-queue/index.ts`

**Signature:**
```typescript
GET /functions/v1/get-validation-queue?limit=10&offset=0
Authorization: Bearer {token}

Response: {
  "queue": ValidationQueueItem[],
  "total_unvalidated": number,
  "current_page": number,
  "total_pages": number
}
```

**Responsibilities:**
1. Validate user authentication
2. Check user has moderator or admin role
3. Query `ingredient_validation_queue` view
4. Return next N unvalidated ingredients with product context
5. Support pagination (limit + offset)
6. Return total count for progress display

**Acceptance Criteria:**
- [ ] Returns only unvalidated ingredients
- [ ] Includes product context (name, brand, category, epiq_score)
- [ ] Returns ingredient count and validated count per product
- [ ] Supports pagination with limit and offset
- [ ] Returns total count for progress bar
- [ ] Tested with 0, 1, 10+, 100+ ingredients
- [ ] Response time < 500ms

#### Task 1.7: Create `validate-citation-url` Edge Function
**Priority:** 🟡 Important  
**Effort:** 2 hours  
**File:** `supabase/functions/validate-citation-url/index.ts`

**Signature:**
```typescript
POST /functions/v1/validate-citation-url
{
  "doi_or_pmid": "string",
  "url": "string"
}

Response: {
  "valid": boolean,
  "status_code": number,
  "title": "string|null",
  "authors": "string|null"
}
```

**Responsibilities:**
1. Accept DOI or PMID
2. Verify URL is accessible (HTTP HEAD request)
3. Extract title/authors from PubMed API if PMID provided
4. Return validation status + metadata

**Acceptance Criteria:**
- [ ] Returns 200 if URL is accessible
- [ ] Returns 404 if URL is dead
- [ ] Validates both HTTP and HTTPS URLs
- [ ] Extracts metadata from PubMed if PMID provided
- [ ] Handles timeouts gracefully (< 5 second timeout)
- [ ] Returns metadata that can prefill citation form

---

### Frontend: UI Components

#### Task 1.8: Create `OEWObservationPanel` Component
**Priority:** 🔴 Critical  
**Effort:** 2 hours  
**File:** `src/components/reviewer/OEWObservationPanel.tsx`

**Props:**
```typescript
interface OEWObservationPanelProps {
  ingredientName: string;
  aiClaimSummary: string;
  aiRole?: string;
  aiSafetyLevel?: string;
  aiExplanation?: string;
  pubchemCid?: string;
}
```

**Renders:**
- Ingredient name (large heading)
- "AI Claim" section with: summary + full explanation
- "Original AI Classification" with: role, safety level, skin type recommendations
- PubChem link if CID available
- Read-only format (no input fields)

**Acceptance Criteria:**
- [ ] Displays ingredient name prominently
- [ ] Shows AI claim summary clearly
- [ ] Shows full AI explanation in readable format
- [ ] Displays AI classification (role, safety level)
- [ ] Links to PubChem if CID provided
- [ ] Responsive on mobile and desktop
- [ ] Matches design system (colors, typography, spacing)

#### Task 1.9: Create `CitationForm` Component
**Priority:** 🔴 Critical  
**Effort:** 3 hours  
**File:** `src/components/reviewer/CitationForm.tsx`

**Props:**
```typescript
interface CitationFormProps {
  onSubmit: (citation: Citation) => void;
  isSubmitting?: boolean;
}
```

**Renders:**
- Citation type selector (dropdown: peer_reviewed, clinical_study, systematic_review, dermatology_textbook)
- Title input field (required)
- Authors input field (required, format: "Last, F.; Last, F.; et al.")
- Journal/book name input (required)
- Year input (required, 4-digit number)
- DOI input OR PMID input (one required, use radio button to toggle)
- URL input (required, with validation)
- "Validate Citation" button (calls `validate-citation-url` function)
- Submit button (disabled until all fields valid)
- Cancel button

**Features:**
- Client-side validation (required fields, URL format, 4-digit year)
- Auto-populate metadata from `validate-citation-url` when DOI/PMID entered
- Show "Citation Valid ✓" indicator when URL is verified
- Error messages for invalid inputs
- Loading spinner on validate button

**Acceptance Criteria:**
- [ ] All 8 fields present and required
- [ ] Citation type dropdown restricted to 4 valid values
- [ ] Year field accepts 4-digit numbers only
- [ ] DOI/PMID toggle works (show one at a time)
- [ ] URL validation on blur (real-time feedback)
- [ ] Submit button disabled until form is complete
- [ ] "Validate Citation" button calls API function
- [ ] Shows loading state while validating
- [ ] Shows validation result (✓ valid, ✗ invalid)
- [ ] Can add author names in "Last, F." format

#### Task 1.10: Create `CitationList` Component
**Priority:** 🔴 Critical  
**Effort:** 1.5 hours  
**File:** `src/components/reviewer/CitationList.tsx`

**Props:**
```typescript
interface CitationListProps {
  citations: Citation[];
  onRemove: (index: number) => void;
  readOnly?: boolean;
}
```

**Renders:**
- List of added citations
- For each citation:
  - Citation type badge (colored: peer_reviewed=blue, clinical=green, etc.)
  - Title (clickable → opens DOI/PMID URL)
  - Authors
  - Journal, Year
  - "Remove" button (if not readOnly)
- "Minimum 1 citation required" message (red) if list is empty
- "Citation count: X" summary

**Acceptance Criteria:**
- [ ] Displays all citations in list format
- [ ] Citation type badges are color-coded
- [ ] Titles are clickable links to source
- [ ] Remove button removes citation from list
- [ ] Shows error if list is empty
- [ ] Can be set to read-only mode
- [ ] Responsive on mobile

#### Task 1.11: Create `OEWEvidencePanel` Component
**Priority:** 🔴 Critical  
**Effort:** 2 hours  
**File:** `src/components/reviewer/OEWEvidencePanel.tsx`

**Props:**
```typescript
interface OEWEvidencePanelProps {
  citations: Citation[];
  onAddCitation: (citation: Citation) => void;
  onRemoveCitation: (index: number) => void;
  isAddingCitation?: boolean;
}
```

**Renders:**
- Section header: "Evidence (Peer-Reviewed Sources)"
- Instructions: "Link at least 1 peer-reviewed source to verify the AI claim"
- Evidence quality tier (help text explaining evidence hierarchy)
- If citations empty: show `<CitationForm />` expanded
- If citations exist: show `<CitationList />` + "Add Another Citation" button
- "Add Another Citation" button toggles form visibility

**Acceptance Criteria:**
- [ ] Shows instructions and help text
- [ ] Displays evidence quality tier reference
- [ ] Citation form visible when adding
- [ ] Citation list visible when citations exist
- [ ] "Add Another Citation" button expands form
- [ ] Can add multiple citations
- [ ] Can remove citations
- [ ] Validates minimum 1 citation before submission

#### Task 1.12: Create `OEWWritingPanel` Component
**Priority:** 🔴 Critical  
**Effort:** 2 hours  
**File:** `src/components/reviewer/OEWWritingPanel.tsx`

**Props:**
```typescript
interface OEWWritingPanelProps {
  value: string;
  onChange: (text: string) => void;
  characterCount?: boolean;
}
```

**Renders:**
- Section header: "Write Public Explanation"
- Instructions: "Explain this ingredient in plain language for consumers (150–300 words)"
- Textarea with placeholder
- Character count (current / 300)
- Word count badge
- Helper text with writing tips
- Validation message if < 150 or > 300 words

**Acceptance Criteria:**
- [ ] Textarea accepts long-form text
- [ ] Shows real-time character count
- [ ] Shows word count
- [ ] Displays warning if < 150 words (red)
- [ ] Displays warning if > 300 words (orange)
- [ ] Displays OK if 150–300 words (green)
- [ ] Helper tips visible (plain language, avoid claims, mention cautions)
- [ ] Responds to onChange events
- [ ] Accessible with keyboard navigation

#### Task 1.13: Create `ConfidenceLevelSelector` Component
**Priority:** 🔴 Critical  
**Effort:** 1.5 hours  
**File:** `src/components/reviewer/ConfidenceLevelSelector.tsx`

**Props:**
```typescript
interface ConfidenceLevelSelectorProps {
  value: "High" | "Moderate" | "Limited" | null;
  onChange: (level: ConfidenceLevel) => void;
}
```

**Renders:**
- Section header: "Confidence Level"
- 3 radio buttons:
  - "High" (green) - Strong evidence, multiple sources
  - "Moderate" (yellow) - Single study, clinical evidence
  - "Limited" (red) - Weak evidence, needs escalation
- For each option: badge + description (1 sentence each)
- Help text: "How confident are you in this validation?"

**Acceptance Criteria:**
- [ ] Radio buttons mutually exclusive
- [ ] Default value is null (no selection)
- [ ] Badges are color-coded (green/yellow/red)
- [ ] Descriptions are clear and concise
- [ ] Help text visible
- [ ] Responds to onChange
- [ ] Accessible with keyboard

#### Task 1.14: Create `VerdictSelector` Component
**Priority:** 🔴 Critical  
**Effort:** 1.5 hours  
**File:** `src/components/reviewer/VerdictSelector.tsx`

**Props:**
```typescript
interface VerdictSelectorProps {
  value: "confirm" | "correct" | "escalate" | null;
  onChange: (verdict: Verdict) => void;
}
```

**Renders:**
- Section header: "Verdict"
- 3 radio buttons:
  - "Confirm" (green checkmark) - Evidence supports AI claim
  - "Correct" (yellow pencil) - Evidence requires a correction
  - "Escalate" (red warning) - Insufficient or conflicting evidence
- For each option: icon + description
- Help text: "Does peer-reviewed evidence support the AI claim?"

**Acceptance Criteria:**
- [ ] Radio buttons mutually exclusive
- [ ] Default is null (no selection)
- [ ] Icons visible next to each option
- [ ] Descriptions are clear
- [ ] Help text visible
- [ ] Responds to onChange
- [ ] Accessible with keyboard

#### Task 1.15: Create `CorrectionInput` Component
**Priority:** 🟡 Important  
**Effort:** 1.5 hours  
**File:** `src/components/reviewer/CorrectionInput.tsx`

**Props:**
```typescript
interface CorrectionInputProps {
  value: string;
  onChange: (text: string) => void;
  isVisible: boolean; // Only show if verdict = "correct"
}
```

**Renders:**
- Section header: "Specific Correction Needed"
- Textarea with placeholder: "What does the evidence say instead of the AI claim?"
- Instructions: "Be specific. Example: 'AI said safe for all skin types, but evidence shows it irritates sensitive skin at >2% concentration.'"
- Character count
- Only render if isVisible is true

**Acceptance Criteria:**
- [ ] Only visible when verdict = "correct"
- [ ] Required when visible
- [ ] Accepts long-form text
- [ ] Shows character count
- [ ] Clear instructions
- [ ] Smooth show/hide animation

#### Task 1.16: Create `IngredientValidationQueue` Component
**Priority:** 🔴 Critical  
**Effort:** 3 hours  
**File:** `src/components/reviewer/IngredientValidationQueue.tsx`

**Props:**
```typescript
interface IngredientValidationQueueProps {
  onSelectIngredient: (queueItem: ValidationQueueItem) => void;
}
```

**Renders:**
- Heading: "Validation Queue"
- Progress bar: "X of Y ingredients validated"
- Current queue item (if exists):
  - Product name + brand
  - Category
  - EpiQ score
  - List of ingredients to validate
  - "Select Ingredient" dropdown (from queue item)
- If queue empty: "No ingredients to validate!"
- Pagination buttons (previous / next)
- Loading skeleton while fetching

**Functionality:**
1. On mount: fetch next 10 unvalidated ingredients via `get-validation-queue`
2. Show current item
3. On "Select Ingredient": call `onSelectIngredient` with full product + ingredient context
4. Support pagination
5. Show progress count

**Acceptance Criteria:**
- [ ] Fetches queue on mount
- [ ] Shows current queue item with product context
- [ ] Allows selecting which ingredient in product to validate
- [ ] Shows progress (X of Y)
- [ ] Pagination works (next/previous)
- [ ] Shows loading state
- [ ] Shows empty state when queue empty
- [ ] Responsive on mobile

#### Task 1.17: Update `IngredientValidationPanel` Component
**Priority:** 🔴 Critical  
**Effort:** 4 hours  
**File:** `src/components/reviewer/IngredientValidationPanel.tsx` (EXPAND)

**Current state:** Basic yes/no checkboxes for PubChem and AI accuracy

**Changes needed:**
1. Replace checkbox-based validation with OEW workflow
2. Import all new sub-components:
   - OEWObservationPanel
   - OEWEvidencePanel
   - OEWWritingPanel
   - ConfidenceLevelSelector
   - VerdictSelector
   - CorrectionInput
3. Add step-by-step form state management
4. Add submit handler that:
   - Validates all fields
   - Calls `validate-ingredient` edge function
   - Shows success/error toast
   - Calls `onValidationComplete()`
5. Update props to accept OEW workflow data

**New Props:**
```typescript
interface IngredientValidationPanelProps {
  analysisId: string;
  ingredientName: string;
  aiClaimSummary: string;
  aiExplanation?: string;
  aiRole?: string;
  aiSafetyLevel?: string;
  pubchemCid?: string;
  institution: string;
  onValidationComplete: () => void;
}
```

**Acceptance Criteria:**
- [ ] All OEW sub-components render in sequence
- [ ] Form state tracks all fields (observation, citations, explanation, confidence, verdict, correction)
- [ ] Citations minimum 1 validation works
- [ ] Explanation word count validation (150–300) works
- [ ] Submit button disabled until all fields valid
- [ ] Submit calls `validate-ingredient` edge function
- [ ] Success toast shows on completion
- [ ] Error toast shows on failure
- [ ] `onValidationComplete()` called on success
- [ ] Can edit fields after initial input
- [ ] No data loss on re-render

#### Task 1.18: Update `StudentReviewer` Dashboard Page
**Priority:** 🔴 Critical  
**Effort:** 3 hours  
**File:** `src/pages/dashboard/StudentReviewer.tsx` (UPDATE)

**Changes needed:**
1. Add access check for apprentice certification
   - Check user has `moderator` role
   - Check user has active `student_certifications`
   - Show "Access Denied" if missing either
2. Replace product list with queue-based workflow:
   - Remove static product list
   - Add `<IngredientValidationQueue />`
   - Trigger validation panel when ingredient selected
3. Update layout:
   - Left side: Queue with pagination
   - Right side: OEW Validation Panel
4. Update state management to track:
   - Current queue item
   - Current ingredient selected
   - Validation progress
5. Add reviewer stats card:
   - Validations completed
   - Accuracy %
   - Institution
   - Certification level

**Acceptance Criteria:**
- [ ] Access check works (shows "Access Denied" if not certified)
- [ ] Queue loads on mount
- [ ] Can select ingredient from queue
- [ ] Validation panel shows for selected ingredient
- [ ] After validation, loads next ingredient in queue
- [ ] Progress updates (X of Y validated)
- [ ] Reviewer stats display correctly
- [ ] Responsive on mobile and desktop
- [ ] No data loss on navigation

#### Task 1.19: Update `ValidationProgressBar` Component
**Priority:** 🟡 Important  
**Effort:** 1.5 hours  
**File:** `src/components/reviewer/ValidationProgressBar.tsx` (UPDATE)

**Current state:** Shows validation count

**Changes needed:**
1. Replace simple count with step indicators
2. Show 6 steps:
   1. Observation (read AI claim)
   2. Evidence (link sources)
   3. Writing (explain in plain language)
   4. Confidence (choose level)
   5. Verdict (confirm/correct/escalate)
   6. Save (submit validation)
3. Mark completed steps with checkmarks
4. Highlight current step
5. Show progress % at bottom

**Acceptance Criteria:**
- [ ] Shows 6 steps in order
- [ ] Completed steps have checkmarks
- [ ] Current step is highlighted
- [ ] Progress % calculated correctly
- [ ] Responsive on mobile
- [ ] Colors match design system

---

### Integration & Testing

#### Task 1.20: Integration Testing
**Priority:** 🟡 Important  
**Effort:** 4 hours  
**File:** `tests/e2e.spec.ts` (ADD)

**Test scenarios:**
1. ✅ Full OEW workflow: Observation → Evidence → Writing → Confidence → Verdict → Save
2. ✅ Citation validation: Add valid and invalid citations
3. ✅ Form validation: Required fields, word count, URL validation
4. ✅ Access control: Non-certified users blocked
5. ✅ Database persistence: Validation saved correctly with citations
6. ✅ Queue workflow: Select ingredient → complete validation → load next ingredient

**Acceptance Criteria:**
- [ ] All scenarios pass
- [ ] Tests cover happy path and error cases
- [ ] No flaky tests
- [ ] Execution time < 5 minutes

#### Task 1.21: Manual QA Checklist
**Priority:** 🟡 Important  
**Effort:** 3 hours  
**File:** docs/quality/QA-Testing-SOPs.md (UPDATE)

**QA Tests:**
- [ ] Can access StudentReviewer page as certified reviewer
- [ ] Cannot access as non-certified user
- [ ] Queue loads with unvalidated ingredients
- [ ] Can select ingredient to validate
- [ ] OEW workflow displays correctly
- [ ] Can add 1+ citations with valid DOI/PMID
- [ ] Citation URL validation works
- [ ] Public explanation word count enforced (150–300)
- [ ] Confidence levels selectable
- [ ] Verdicts (confirm/correct/escalate) work
- [ ] Correction input only visible if verdict = "correct"
- [ ] Submit button disabled until form complete
- [ ] Submit saves validation to database
- [ ] Citations saved with correct foreign keys
- [ ] Next ingredient loads after submission
- [ ] Progress updates correctly
- [ ] Mobile responsive layout
- [ ] No console errors

---

## Phase 2: Post-MVP Features (Week 6–8)

### Task 2.1: Auto-Calculate Confidence Level
**Priority:** 🟢 Nice-to-have  
**Effort:** 2 hours  
**File:** `src/components/reviewer/ConfidenceLevelSelector.tsx` (ENHANCE)

- Analyze evidence count + quality
- Show recommended confidence level
- Allow manual override with explanation
- Track when reviewer disagrees with recommendation

### Task 2.2: Accuracy Metrics Dashboard
**Priority:** 🟢 Nice-to-have  
**Effort:** 4 hours  
**File:** `src/components/reviewer/ReviewerAccuracyCard.tsx` (NEW)

- Show reviewer stats: validations count, accuracy %
- Track when moderators approve/reject verdicts
- Display improvement over time
- Leaderboard of top reviewers

### Task 2.3: Escalation Workflow
**Priority:** 🟢 Nice-to-have  
**Effort:** 3 hours  
**File:** `src/pages/dashboard/ModeratorReview.tsx` (NEW)

- Moderator dashboard for escalated validations
- Review apprentice work with feedback UI
- Approve/reject verdicts
- Provide corrections and learning feedback

---

## Phase 3: Advanced Features (Week 9+)

### Task 3.1: Ingredient Research Library
**Priority:** 🟢 Future  
**Effort:** 8 hours  

- Searchable database of reviewed ingredients
- Show all validations + consensus confidence
- Track ingredient updates (re-review when new evidence)
- Public API for ingredient data

### Task 3.2: Peer Review System
**Priority:** 🟢 Future  
**Effort:** 6 hours  

- Moderators review apprentice validations
- Feedback system for calibration
- Accuracy scoring
- Certification progression (apprentice → associate → senior)

---

## Deployment Checklist

### Pre-Launch

- [ ] All database migrations deployed to production
- [ ] All edge functions tested and deployed
- [ ] RLS policies verified on production
- [ ] UI components tested on multiple browsers
- [ ] Accessibility audit completed (WCAG 2.1 AA)
- [ ] Performance tested (< 2 second load times)
- [ ] Error handling comprehensive
- [ ] Documentation complete and reviewed
- [ ] QA test cases all passed
- [ ] Training documentation for reviewers ready

### Launch Day

- [ ] Invite first cohort of apprentices
- [ ] Monitor error logs
- [ ] Collect feedback on workflow
- [ ] Track validation completion rates
- [ ] Support team on standby

### Post-Launch (Week 1–2)

- [ ] Review feedback from first cohort
- [ ] Iterate on UX based on usage
- [ ] Optimize query performance if needed
- [ ] Add additional guidance if reviewers stuck
- [ ] Plan Phase 2 implementation

---

## Summary

**Total MVP Effort:** 80–120 hours  
**Team Size:** 2 engineers  
**Timeline:** 5–8 weeks  
**Critical Path:** Database schema → Edge functions → UI components → Integration  

**Success Criteria:**
- ✅ Reviewers can complete full OEW workflow
- ✅ All validations saved to database with citations
- ✅ Access control works (only certified reviewers)
- ✅ Queue system delivers ingredients for validation
- ✅ < 2 second load times
- ✅ 0 console errors
- ✅ Mobile responsive
- ✅ First 10 validations completed with < 3 hours per ingredient

---

**Maintained by:** Engineering Team  
**Last Updated:** February 21, 2026  
**Next Review:** March 7, 2026
