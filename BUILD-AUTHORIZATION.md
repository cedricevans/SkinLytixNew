# 🎯 Complete Current Process & Build Authorization

**Date:** February 21, 2026  
**Time:** Ready to Build  
**Status:** ✅ ALL PREREQUISITES MET

---

## 📊 Current Process Overview

### **BEFORE (What StudentReviewer Page Does Now)**

```
1. User logs in
2. Check: Has 'moderator' OR 'admin' role + active certification
3. Load: All products from user_analyses table
4. User picks a product
5. System: Parses ingredients_list string into array
6. User picks an ingredient
7. Load: PubChem data, AI explanation, existing validation
8. Display: IngredientValidationPanel (OLD)
   - Ask: "PubChem data correct?" (YES/NO button)
   - Ask: "AI explanation accurate?" (YES/NO button)
   - If NO: Show correction form
     - Corrected role dropdown (13 options)
     - Safety level dropdown (safe/caution/avoid)
     - Notes textarea
     - Source checkboxes (7 options)
   - Save button
9. Save to database: INSERT ingredient_validations
10. Show success toast
11. Return to ingredient list
```

### **AFTER (What We're Building)**

```
1. User logs in (same)
2. Check access (same)
3. Load products (same)
4. User picks product (same)
5. System parses ingredients (same)
6. User picks ingredient (same)
7. Load ingredient data (same)
8. Display NEW IngredientValidationPanel with 6-STEP WORKFLOW:

   STEP 1: OBSERVATION (Read-Only)
   └─ Display ingredient name, AI claim, role, safety level, full explanation
   └─ Next button

   STEP 2: EVIDENCE (Required ≥1 citation)
   └─ Citation form: add peer-reviewed sources
   └─ Citation list: display what's been added
   └─ Sources guidance: where to find citations
   └─ Next button (disabled until ≥1 citation)

   STEP 3: WRITING (Required 150-300 words)
   └─ Textarea for public explanation
   └─ Real-time word counter
   └─ Examples and guidance
   └─ Next button (disabled until word count correct)

   STEP 4: CONFIDENCE (Required selection)
   └─ Radio: High 🟢 / Moderate 🟡 / Limited 🔴
   └─ Explanations for each
   └─ Next button

   STEP 5: VERDICT (Required selection)
   └─ Radio: Confirm ✓ / Correct ✏️ / Escalate ⚠️
   └─ If Correct: Show CorrectionInput textarea (TASK 1-8 DONE)
   └─ If Escalate: Show escalation warning

   STEP 6: INTERNAL NOTES (Optional)
   └─ Textarea for moderator notes
   └─ Save button

9. Save to database:
   └─ INSERT ingredient_validations (all OEW fields)
   └─ INSERT ingredient_validation_citations (one per citation)
10. Show success toast
11. Update stats at top (ReviewerAccuracyCard)
12. Return to ingredient list
```

---

## 🔄 Process Differences

### Old Workflow (Still in Code, Being Replaced)
- Linear: 3 sections (PubChem? AI? Corrections?)
- Binary verdicts (right/wrong)
- Optional citations (checkboxes)
- No structured escalation
- Minimal guidance
- Basic stats

### New Workflow (Building Now)
- Multi-step: 6-step OEW framework
- Nuanced verdicts (Confirm/Correct/Escalate)
- Mandatory peer-reviewed citations (with full metadata)
- Structured escalation workflow
- Extensive inline guidance + examples
- Rich stats (accuracy %, confidence distribution)

---

## 📋 What's Built vs What's Left

### ✅ Already Built (8/10 Components)

```
src/components/reviewer/
├─ OEWObservationPanel.tsx (180 lines) ✅
├─ CitationForm.tsx (220 lines) ✅
├─ CitationList.tsx (160 lines) ✅
├─ OEWEvidencePanel.tsx (150 lines) ✅
├─ OEWWritingPanel.tsx (210 lines) ✅
├─ ConfidenceLevelSelector.tsx (220 lines) ✅
├─ VerdictSelector.tsx (240 lines) ✅
├─ CorrectionInput.tsx (210 lines) ✅
```

**Total:** ~1,390 lines of production-ready code

### ⏳ Ready to Build (2/2 Components)

```
src/components/reviewer/
├─ InternalNotesPanel.tsx (NEW - TASK 1) ⏳
└─ ReviewerAccuracyCard.tsx (NEW - TASK 2) ⏳
```

### 🔄 Ready to Refactor (1 component)

```
src/components/reviewer/
└─ IngredientValidationPanel.tsx (REFACTOR - TASK 3) ⏳
   Replace 365 lines with ~400-500 lines that integrate all 8 components
```

### 📄 Ready to Update (1 page)

```
src/pages/dashboard/
└─ StudentReviewer.tsx (UPDATE - TASK 4) ⏳
   Add ReviewerAccuracyCard
   Update IngredientValidationPanel props
```

### 🧪 Ready to Test

```
Manual Testing (TASK 5) ⏳
└─ Test all 6 scenarios + 20-item checklist
```

---

## 🗂️ File Organization

**Current Structure:**
```
src/
├─ pages/
│  └─ dashboard/
│     └─ StudentReviewer.tsx (main page) ← TASK 4 updates here
├─ components/
│  └─ reviewer/
│     ├─ OEWObservationPanel.tsx ✅
│     ├─ CitationForm.tsx ✅
│     ├─ CitationList.tsx ✅
│     ├─ OEWEvidencePanel.tsx ✅
│     ├─ OEWWritingPanel.tsx ✅
│     ├─ ConfidenceLevelSelector.tsx ✅
│     ├─ VerdictSelector.tsx ✅
│     ├─ CorrectionInput.tsx ✅
│     ├─ InternalNotesPanel.tsx ← TASK 1 creates here
│     ├─ ReviewerAccuracyCard.tsx ← TASK 2 creates here
│     └─ IngredientValidationPanel.tsx ← TASK 3 refactors here
└─ integrations/
   └─ supabase/
      └─ client.ts (already configured)
```

---

## 🗄️ Database Schema

### ingredient_validations table (EXISTING, columns added by migration)
```
id (PK)
ingredient_id (FK)
validator_id (user auth)
validator_institution
ai_claim_summary (text)
public_explanation (text) ← NEW (TASK 3 fills)
confidence_level (High/Moderate/Limited) ← NEW (TASK 3 fills)
verdict (confirm/correct/escalate) ← NEW (TASK 3 fills)
correction (text) ← NEW (TASK 3 fills if verdict='correct')
escalation_reason (text) ← NEW (TASK 3 fills if verdict='escalate')
internal_notes (text) ← NEW (TASK 6/InternalNotesPanel fills)
is_escalated (boolean) ← NEW (TASK 3 sets true if verdict='escalate')
moderator_review_status (pending/approved/rejected) ← NEW
created_at
updated_at (updated automatically by trigger)
```

### ingredient_validation_citations table (NEW - created by migration)
```
id (PK)
validation_id (FK → ingredient_validations.id)
citation_type (peer_reviewed/clinical_study/systematic_review/dermatology_textbook/cir_monograph/other)
title (text) ← CitationForm provides
authors (text) ← CitationForm provides
journal_name (text) ← CitationForm provides
publication_year (int) ← CitationForm provides
doi_or_pmid (text) ← CitationForm validates & provides
source_url (text) ← CitationForm validates & provides
created_at
```

### reviewer_stats view (created by migration, used by TASK 2)
```
Queries: ingredient_validations table
Returns: user_id, institution, total_validations, confirmed_validations, corrected_validations, 
         escalated_validations, high_confidence_count, moderate_confidence_count, 
         limited_confidence_count, approved_count, rejected_count, approval_rate, last_validation_date
```

---

## 🎯 Tasks Breakdown

### TASK 1: Build InternalNotesPanel (30 min)
**File:** Create `src/components/reviewer/InternalNotesPanel.tsx`

**What it does:**
- Simple optional textarea for moderator notes
- 500 character limit
- Character counter
- Used in Step 6 of refactored IngredientValidationPanel

**Props:**
```tsx
interface InternalNotesPanelProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number; // default 500
}
```

**Import in TASK 3:**
```tsx
import { InternalNotesPanel } from '@/components/reviewer/InternalNotesPanel';
```

---

### TASK 2: Build ReviewerAccuracyCard (45 min)
**File:** Create `src/components/reviewer/ReviewerAccuracyCard.tsx`

**What it does:**
- Display reviewer performance stats at top of StudentReviewer page
- Queries reviewer_stats view from Supabase
- Shows: validations completed, accuracy %, confidence distribution

**Props:**
```tsx
interface ReviewerAccuracyCardProps {
  userId: string;
}
```

**Data to fetch:**
```tsx
const { data: stats } = useQuery({
  queryKey: ['reviewer-stats', userId],
  queryFn: async () => {
    const { data } = await supabase
      .from('reviewer_stats')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }
});
```

**Display:**
- Validations Completed: [count]
- Accuracy Rate: [%]
- High Confidence: [count]
- Moderate Confidence: [count]
- Limited Confidence: [count]
- Last Validated: [date]

**Import in TASK 4:**
```tsx
import { ReviewerAccuracyCard } from '@/components/reviewer/ReviewerAccuracyCard';
```

---

### TASK 3: Refactor IngredientValidationPanel (2-3 hours)
**File:** Rewrite `src/components/reviewer/IngredientValidationPanel.tsx`

**New props:**
```tsx
interface IngredientValidationPanelProps {
  ingredientId: string;
  validationId?: string; // for editing existing
  onSave: (data: ValidationData) => void;
  onCancel?: () => void;
}

interface ValidationData {
  ingredientId: string;
  validationId?: string;
  observations: {
    ingredientName: string;
    aiClaimSummary: string;
    aiRoleClassification: string;
    aiSafetyLevel: string;
    aiExplanation: string;
  };
  citations: Citation[];
  publicExplanation: string;
  confidenceLevel: 'high' | 'moderate' | 'limited';
  verdict: 'confirm' | 'correct' | 'escalate';
  correction?: string;
  escalationReason?: string;
  internalNotes?: string;
  moderatorReviewStatus: 'pending' | 'approved' | 'rejected';
}

interface Citation {
  type: string;
  title: string;
  authors: string;
  journal: string;
  year?: number;
  doiOrPmid: string;
  url: string;
}
```

**Architecture:**
- State: `currentStep` (1-6), `formData`, `isLoading`, `error`
- Load ingredient data on mount
- Render appropriate step based on state
- Validate before allowing next step
- Save on final submit
- Show toast notifications

**Imports needed:**
```tsx
import { OEWObservationPanel } from '@/components/reviewer/OEWObservationPanel';
import { OEWEvidencePanel } from '@/components/reviewer/OEWEvidencePanel';
import { OEWWritingPanel } from '@/components/reviewer/OEWWritingPanel';
import { ConfidenceLevelSelector } from '@/components/reviewer/ConfidenceLevelSelector';
import { VerdictSelector } from '@/components/reviewer/VerdictSelector';
import { CorrectionInput } from '@/components/reviewer/CorrectionInput';
import { InternalNotesPanel } from '@/components/reviewer/InternalNotesPanel'; // from TASK 1
```

**Save logic:**
```tsx
async function handleSave() {
  // 1. Insert/update ingredient_validations
  const { data: validation } = await supabase
    .from('ingredient_validations')
    .upsert({
      id: formData.validationId,
      ingredient_id: ingredientId,
      ai_claim_summary: formData.observations.aiClaimSummary,
      public_explanation: formData.publicExplanation,
      confidence_level: formData.confidenceLevel,
      verdict: formData.verdict,
      correction: formData.correction,
      escalation_reason: formData.escalationReason,
      internal_notes: formData.internalNotes,
      is_escalated: formData.verdict === 'escalate',
      moderator_review_status: 'pending'
    })
    .select()
    .single();

  // 2. Insert citations
  if (formData.citations.length > 0) {
    await supabase
      .from('ingredient_validation_citations')
      .insert(formData.citations.map(c => ({
        validation_id: validation.id,
        citation_type: c.type,
        title: c.title,
        authors: c.authors,
        journal_name: c.journal,
        publication_year: c.year,
        doi_or_pmid: c.doiOrPmid,
        source_url: c.url
      })));
  }

  onSave(formData);
  toast.success('Validation saved!');
}
```

**Validation rules:**
- Step 1: Always allow next (read-only)
- Step 2: Require ≥1 citation to proceed
- Step 3: Require 150-300 words to proceed
- Step 4: Require confidence selection to proceed
- Step 5: Require verdict selection to proceed
- If verdict='correct': Optional correction (recommended 10+ words)
- If verdict='escalate': Optional escalation reason
- Step 6: Internal notes optional

---

### TASK 4: Update StudentReviewer.tsx (1 hour)
**File:** Modify `src/pages/dashboard/StudentReviewer.tsx`

**Changes:**

**Change 1:** Import ReviewerAccuracyCard
```tsx
import { ReviewerAccuracyCard } from '@/components/reviewer/ReviewerAccuracyCard';
```

**Change 2:** Add ReviewerAccuracyCard at top of page (after header)
```tsx
<ReviewerAccuracyCard userId={userId} />
```

**Change 3:** Update IngredientValidationPanel usage
```tsx
// Replace old:
<IngredientValidationPanel
  analysisId={selectedProduct.id}
  ingredientName={selectedIngredient}
  // ... other old props
  onValidationComplete={handleValidationComplete}
/>

// With new:
<IngredientValidationPanel
  ingredientId={selectedIngredient}
  validationId={currentValidation?.id}
  onSave={handleValidationSave}
  onCancel={handleCancel}
/>
```

**Change 4:** Update save handler
```tsx
async function handleValidationSave(data: ValidationData) {
  // Refetch stats to update ReviewerAccuracyCard
  await refetchStats();
  
  // Move to next ingredient
  selectNextIngredient();
  
  // Show success
  toast.success('Validation saved!');
}
```

**Change 5:** Update stats queries to use new schema
```tsx
// The existing stats cards should still work
// Just make sure they're querying new verdict-based data
```

---

### TASK 5: Integration Testing (1-2 hours)
**No code** - Manual testing in the app

**Test Scenario 1: Simple Confirmation**
- [ ] Open StudentReviewer page
- [ ] See ReviewerAccuracyCard at top
- [ ] Select a product with ingredients
- [ ] Select an ingredient
- [ ] Step 1: See observation panel
- [ ] Step 2: Add 2 citations with valid DOI/PMID/URL
- [ ] Step 3: Write 200-word explanation
- [ ] Step 4: Select "High Confidence"
- [ ] Step 5: Select "Confirm" verdict
- [ ] Step 6: Skip internal notes
- [ ] Save validation
- [ ] Check database: row in ingredient_validations table
- [ ] Check database: 2 rows in ingredient_validation_citations table
- [ ] Check UI: ReviewerAccuracyCard updated with new count
- [ ] Check UI: Success toast shown

**Test Scenario 2: Correction Workflow**
- [ ] Select ingredient
- [ ] Step 2: Add 1 citation
- [ ] Step 3: Write 200-word explanation
- [ ] Step 4: Select "Moderate Confidence"
- [ ] Step 5: Select "Correct" verdict
- [ ] CorrectionInput appears: Enter correction details
- [ ] Step 6: Add internal note
- [ ] Save validation
- [ ] Check database: correction field populated
- [ ] Check database: internal_notes populated
- [ ] Check database: verdict='correct'

**Test Scenario 3: Escalation Workflow**
- [ ] Select ingredient with unclear evidence
- [ ] Step 2: Add only 1 weak citation
- [ ] Step 3: Write 200-word explanation
- [ ] Step 4: Select "Limited Confidence"
- [ ] Step 5: Select "Escalate" verdict
- [ ] See escalation warning message
- [ ] Step 6: Add escalation reason in internal notes
- [ ] Save validation
- [ ] Check database: is_escalated=true
- [ ] Check database: moderator_review_status='pending'
- [ ] Check database: escalation appears in escalated_validations_queue view

**Test Scenario 4: Edit Existing Validation**
- [ ] Open existing validation
- [ ] Data pre-fills in form
- [ ] Modify explanation
- [ ] Add another citation
- [ ] Save updates database
- [ ] Check database: updated_at timestamp changed
- [ ] Check database: old citations preserved, new one added

**Test Scenario 5: Validation Rules Enforced**
- [ ] Step 2: Try to proceed without citations → blocked
- [ ] Step 3: Try with 140 words → blocked (too short)
- [ ] Step 3: Try with 310 words → blocked (too long)
- [ ] Step 4: Try to proceed without selection → blocked
- [ ] Step 5: Try to proceed without verdict → blocked
- [ ] Correct verdict without correction text → still allows save

**Test Scenario 6: UI/UX**
- [ ] All steps have visible buttons (Back/Next/Save)
- [ ] Word counter updates in real-time
- [ ] Citation badges show correct colors
- [ ] Confidence icons show correct emoji
- [ ] Verdict icons show correct emoji + color
- [ ] Mobile layout responsive
- [ ] No console errors
- [ ] No TypeScript errors

---

## 📈 Timeline

```
START: Now (Ready to build)
│
├─ TASK 1 (30 min)
│  └─ InternalNotesPanel created
│
├─ TASK 2 (45 min)
│  └─ ReviewerAccuracyCard created
│
├─ TASK 3 (2.5-3 hours) ← CRITICAL PATH
│  └─ IngredientValidationPanel refactored
│
├─ TASK 4 (1 hour)
│  └─ StudentReviewer updated
│
└─ TASK 5 (1-2 hours)
   └─ System tested end-to-end

TOTAL: 5.5-7.5 hours

END: System complete & ready for production ✅
```

---

## ✅ Success Criteria

When complete, you can:

1. ✅ Open StudentReviewer dashboard
2. ✅ See your performance stats at top (ReviewerAccuracyCard)
3. ✅ Select a product to validate
4. ✅ Walk through 6-step OEW workflow
5. ✅ Add peer-reviewed citations with full metadata
6. ✅ Write consumer-friendly explanation
7. ✅ Rate confidence based on evidence quality
8. ✅ Make professional verdict (Confirm/Correct/Escalate)
9. ✅ Add correction details if needed
10. ✅ Add internal notes for moderators
11. ✅ Save everything to database
12. ✅ See stats update immediately
13. ✅ Escalations flag for moderator review

---

## 🎉 Ready to Build!

**All prerequisites met:**
- ✅ 8 OEW components built
- ✅ Database schema ready
- ✅ Migration applied
- ✅ Views created
- ✅ Architecture clear
- ✅ Data flow mapped
- ✅ Timeline planned
- ✅ Success criteria defined

**Authorization: ✅ PROCEED WITH TASKS 1-5**

---

**Next Step:** Shall we start with Task 1 (InternalNotesPanel)? 🚀
