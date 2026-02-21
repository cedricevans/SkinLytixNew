# Complete Remaining Work Breakdown
**Date:** February 21, 2026  
**Status:** 8/10 Components Built (80% complete)  
**Estimated Time:** 5-7 hours to completion

---

## 📋 Executive Summary

| # | Task | Time | Priority | Status |
|---|------|------|----------|--------|
| 1 | Build InternalNotesPanel | 30 min | Medium | ⏳ Ready |
| 2 | Build ReviewerAccuracyCard | 45 min | Medium | ⏳ Ready |
| 3 | Refactor IngredientValidationPanel | 2-3 hrs | **CRITICAL** | ⏳ Ready |
| 4 | Update StudentReviewer page | 1 hr | High | ⏳ Dependent on #3 |
| 5 | Complete integration testing | 1-2 hrs | High | ⏳ Dependent on #3-4 |

**Total Effort:** 5-7 hours (doable in one focused session)

---

## 🔧 Task #1: Build InternalNotesPanel Component
**File:** `src/components/reviewer/InternalNotesPanel.tsx`  
**Time:** 30 minutes  
**Priority:** Medium (optional but helpful)

### What It Does
Simple textarea component for reviewers to add internal notes for moderators (e.g., "This needs expert review" or "Conflicting studies found").

### Requirements

```tsx
interface InternalNotesPanelProps {
  value: string;
  onChange: (value: string) => void;
  maxLength?: number; // Default 500
}
```

### Features Needed
- [ ] Textarea input (500 character limit)
- [ ] Word count display
- [ ] Placeholder: "Add internal notes for moderators (optional)"
- [ ] Help text: "Use this to flag concerns, conflicting evidence, or specific guidance for moderator review"
- [ ] Character counter (X/500)
- [ ] Optional field (not required for save)

### Example Structure
```tsx
export function InternalNotesPanel({
  value,
  onChange,
  maxLength = 500
}: InternalNotesPanelProps) {
  return (
    <Card className="border-blue-200">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          Internal Notes for Moderators
        </CardTitle>
        <CardDescription>
          Optional: Add context, concerns, or guidance for the review team
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={maxLength}
          placeholder="e.g., 'Found conflicting studies on concentration', 'May need expert dermatologist review'"
          className="w-full min-h-[100px] p-3 border rounded-md"
        />
        <div className="text-sm text-gray-500">
          {value.length}/{maxLength} characters
        </div>
      </CardContent>
    </Card>
  );
}
```

### Integration
Used in refactored `IngredientValidationPanel` between `VerdictSelector` and save button.

---

## 🎨 Task #2: Build ReviewerAccuracyCard Component
**File:** `src/components/reviewer/ReviewerAccuracyCard.tsx`  
**Time:** 45 minutes  
**Priority:** Medium (stats display)

### What It Does
Displays reviewer performance metrics at top of StudentReviewer dashboard.

### Requirements

```tsx
interface ReviewerAccuracyCardProps {
  userId: string;
}
```

### Data to Display
- [ ] Validations completed (count)
- [ ] Accuracy rate (%)
- [ ] Confidence level distribution (High %, Moderate %, Limited %)
- [ ] Escalation rate (%)
- [ ] Last validation date

### Database Query
Query the `reviewer_stats` view (created in migration):
```sql
SELECT
  reviewer_id,
  validations_completed,
  accuracy_percentage,
  high_confidence_count,
  moderate_confidence_count,
  limited_confidence_count,
  escalation_count,
  last_validation_at
FROM reviewer_stats
WHERE reviewer_id = $1
```

### Example Structure
```tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function ReviewerAccuracyCard({ userId }: ReviewerAccuracyCardProps) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['reviewer-stats', userId],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviewer_stats')
        .select('*')
        .eq('reviewer_id', userId)
        .single();
      return data;
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (!stats) return <div>No data</div>;

  return (
    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader>
        <CardTitle>Your Performance</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Stat cards */}
        <StatBox label="Validated" value={stats.validations_completed} />
        <StatBox label="Accuracy" value={`${stats.accuracy_percentage}%`} />
        <StatBox label="High Confidence" value={stats.high_confidence_count} />
        <StatBox label="Escalations" value={stats.escalation_count} />
        <StatBox label="Last Updated" value={formatDate(stats.last_validation_at)} />
      </CardContent>
    </Card>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-3 bg-white rounded-lg border">
      <div className="text-2xl font-bold text-blue-600">{value}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  );
}
```

### Integration
Placed at top of `StudentReviewer.tsx` page, above the ingredient list.

---

## 🎯 Task #3: Refactor IngredientValidationPanel Component
**File:** `src/components/reviewer/IngredientValidationPanel.tsx`  
**Current Size:** 365 lines (REPLACE ENTIRELY)  
**Time:** 2-3 hours  
**Priority:** 🔴 **CRITICAL** - Main component integrating all 8 OEW components

### What This Component Does
Complete ingredient validation workflow using the 6-step OEW framework.

### Current State
Old component with yes/no validation buttons:
```tsx
// OLD (to be replaced):
export function IngredientValidationPanel() {
  // Simple yes/no for pubchem
  // Simple yes/no for explanation
  // Corrections dropdown + textarea
  // Source checkboxes
  // Save button
}
```

### New Architecture Required

```tsx
// NEW (what we're building):
interface IngredientValidationPanelProps {
  ingredientId: string;
  validationId?: string;
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
  correction?: string; // If verdict = 'correct'
  escalationReason?: string; // If verdict = 'escalate'
  internalNotes?: string;
  moderatorReviewStatus: 'pending' | 'approved' | 'rejected';
}

export function IngredientValidationPanel({
  ingredientId,
  validationId,
  onSave,
  onCancel
}: IngredientValidationPanelProps) {
  const [step, setStep] = useState(1); // Step 1-6
  const [formData, setFormData] = useState<ValidationData>({...});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Render 6-step workflow
}
```

### Step-by-Step Implementation

#### **Step 1: Load Ingredient Data**
```tsx
useEffect(() => {
  async function loadData() {
    // Get ingredient_validations row
    const { data: validation } = await supabase
      .from('ingredient_validations')
      .select('*')
      .eq('id', validationId)
      .single();

    // Get ingredient_validation_citations
    const { data: citations } = await supabase
      .from('ingredient_validation_citations')
      .select('*')
      .eq('validation_id', validationId);

    // Populate formData state
  }
}, [ingredientId, validationId]);
```

#### **Step 2: Step 1 - Observation (Read-Only)**
```tsx
{step === 1 && (
  <>
    <OEWObservationPanel
      ingredientName={formData.observations.ingredientName}
      aiClaimSummary={formData.observations.aiClaimSummary}
      aiRoleClassification={formData.observations.aiRoleClassification}
      aiSafetyLevel={formData.observations.aiSafetyLevel}
      aiExplanation={formData.observations.aiExplanation}
    />
    <button onClick={() => setStep(2)}>Next: Find Evidence</button>
  </>
)}
```

#### **Step 3: Step 2 - Evidence (Citations)**
```tsx
{step === 2 && (
  <>
    <OEWEvidencePanel
      citations={formData.citations}
      onAddCitation={(citation) => {
        setFormData({
          ...formData,
          citations: [...formData.citations, citation]
        });
      }}
      onRemoveCitation={(index) => {
        setFormData({
          ...formData,
          citations: formData.citations.filter((_, i) => i !== index)
        });
      }}
    />
    <div className="flex gap-2">
      <button onClick={() => setStep(1)}>Back</button>
      <button 
        onClick={() => setStep(3)}
        disabled={formData.citations.length === 0}
      >
        Next: Write Explanation
      </button>
    </div>
  </>
)}
```

#### **Step 4: Step 3 - Writing**
```tsx
{step === 3 && (
  <>
    <OEWWritingPanel
      value={formData.publicExplanation}
      onChange={(value) => setFormData({ ...formData, publicExplanation: value })}
    />
    <div className="flex gap-2">
      <button onClick={() => setStep(2)}>Back</button>
      <button 
        onClick={() => setStep(4)}
        disabled={
          formData.publicExplanation.length < 150 ||
          formData.publicExplanation.length > 300
        }
      >
        Next: Rate Confidence
      </button>
    </div>
  </>
)}
```

#### **Step 5: Step 4 - Confidence**
```tsx
{step === 4 && (
  <>
    <ConfidenceLevelSelector
      value={formData.confidenceLevel}
      citationCount={formData.citations.length}
      onChange={(level) => setFormData({ ...formData, confidenceLevel: level })}
    />
    <div className="flex gap-2">
      <button onClick={() => setStep(3)}>Back</button>
      <button 
        onClick={() => setStep(5)}
        disabled={!formData.confidenceLevel}
      >
        Next: Make Verdict
      </button>
    </div>
  </>
)}
```

#### **Step 6: Step 5 - Verdict**
```tsx
{step === 5 && (
  <>
    <VerdictSelector
      value={formData.verdict}
      confidenceLevel={formData.confidenceLevel}
      onChange={(verdict) => setFormData({ ...formData, verdict })}
    />
    {formData.verdict === 'correct' && (
      <CorrectionInput
        value={formData.correction || ''}
        onChange={(value) => setFormData({ ...formData, correction: value })}
      />
    )}
    {formData.verdict === 'escalate' && (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-800 font-semibold">⚠️ Escalation Required</p>
        <p className="text-sm text-red-700 mt-2">
          This validation will be flagged for moderator review.
        </p>
      </div>
    )}
    <InternalNotesPanel
      value={formData.internalNotes || ''}
      onChange={(value) => setFormData({ ...formData, internalNotes: value })}
    />
    <div className="flex gap-2">
      <button onClick={() => setStep(4)}>Back</button>
      <button onClick={handleSave} disabled={isLoading}>
        {isLoading ? 'Saving...' : 'Save Validation'}
      </button>
    </div>
  </>
)}
```

### Save Logic

```tsx
async function handleSave() {
  try {
    setIsLoading(true);
    setError(null);

    // 1. Update/insert ingredient_validations row
    const { data: validation, error: valError } = await supabase
      .from('ingredient_validations')
      .upsert({
        id: formData.validationId || generateUUID(),
        ingredient_id: ingredientId,
        ai_claim_summary: formData.observations.aiClaimSummary,
        public_explanation: formData.publicExplanation,
        confidence_level: formData.confidenceLevel,
        verdict: formData.verdict,
        correction: formData.correction,
        escalation_reason: formData.escalationReason,
        internal_notes: formData.internalNotes,
        is_escalated: formData.verdict === 'escalate',
        moderator_review_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (valError) throw valError;

    // 2. Insert citations
    if (formData.citations.length > 0) {
      const citationRows = formData.citations.map(citation => ({
        validation_id: validation.id,
        type: citation.type,
        title: citation.title,
        authors: citation.authors,
        journal: citation.journal,
        year: citation.year,
        doi_or_pmid: citation.doiOrPmid,
        url: citation.url,
        created_at: new Date().toISOString()
      }));

      const { error: citError } = await supabase
        .from('ingredient_validation_citations')
        .insert(citationRows);

      if (citError) throw citError;
    }

    // 3. Call parent callback
    onSave(formData);

    // 4. Show success message
    toast.success('Validation saved successfully!');
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to save validation');
    toast.error('Error saving validation');
  } finally {
    setIsLoading(false);
  }
}
```

### Validation Rules
- [ ] Step 1: Always proceed (read-only)
- [ ] Step 2: Require minimum 1 citation before proceeding
- [ ] Step 3: Require 150-300 word explanation
- [ ] Step 4: Require confidence level selected
- [ ] Step 5: Require verdict selected
- [ ] If verdict='correct': Require correction text (10+ words)
- [ ] If verdict='escalate': Require escalation reason
- [ ] Allow optional internal notes

### Error Handling
```tsx
// Validation errors shown immediately
// Database errors show toast + logged
// Network errors retry or show fallback
// RLS errors caught and reported
```

### Testing Checklist
- [ ] Can navigate all 6 steps
- [ ] Cannot skip required fields
- [ ] Citations display correctly
- [ ] Word count works
- [ ] Saves to database
- [ ] Citations saved to table
- [ ] Escalations flagged
- [ ] Corrections stored
- [ ] Internal notes optional
- [ ] Can edit existing validations

---

## 📄 Task #4: Update StudentReviewer Page
**File:** `src/pages/dashboard/StudentReviewer.tsx`  
**Current Size:** 497 lines (MODIFY to integrate new components)  
**Time:** 1 hour  
**Priority:** High (integrate everything together)

### Changes Required

#### **Change 1: Add ReviewerAccuracyCard at top**
```tsx
// Around line 150, after page header:

export function StudentReviewer() {
  const { user } = useUser();
  
  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader title="Ingredient Reviews" description="Validate and explain ingredients" />
      
      {/* NEW: Add stats card */}
      <ReviewerAccuracyCard userId={user.id} />
      
      {/* EXISTING: Rest of page */}
      <div className="grid grid-cols-3 gap-4">
        {/* ... */}
      </div>
    </div>
  );
}
```

#### **Change 2: Update props to IngredientValidationPanel**
```tsx
// Find where IngredientValidationPanel is used (around line 350):

// OLD:
<IngredientValidationPanel />

// NEW:
<IngredientValidationPanel
  ingredientId={selectedIngredientId}
  validationId={currentValidation?.id}
  onSave={handleValidationSave}
  onCancel={handleCancel}
/>
```

#### **Change 3: Add save handler**
```tsx
async function handleValidationSave(data: ValidationData) {
  // Refresh the validation list
  await refetchValidations();
  
  // Show success message
  toast.success('Validation saved! Moving to next ingredient...');
  
  // Reset selection
  setSelectedIngredientId(null);
  
  // Optionally auto-select next ingredient
  selectNextIngredient();
}
```

#### **Change 4: Update stats cards**
```tsx
// The existing stats cards should auto-update via React Query refetch
// Just make sure they query the updated data:

const { data: stats } = useQuery({
  queryKey: ['reviewer-stats', user.id],
  queryFn: fetchReviewerStats,
  // Refetch on window focus to stay current
  refetchOnWindowFocus: true
});
```

### Full Integration Flow
```
StudentReviewer Page
├── ReviewerAccuracyCard (top stats)
├── Stats Cards (validations completed, accuracy %, escalations)
├── Ingredients List (left sidebar)
└── IngredientValidationPanel (right main area)
    ├── Step 1: OEWObservationPanel (read-only)
    ├── Step 2: OEWEvidencePanel (citations)
    ├── Step 3: OEWWritingPanel (explanation)
    ├── Step 4: ConfidenceLevelSelector (confidence)
    ├── Step 5: VerdictSelector (verdict)
    ├── Step 5b: CorrectionInput (if needed)
    ├── InternalNotesPanel (optional)
    └── Save Button → Database
```

---

## 🧪 Task #5: Complete Integration Testing
**Time:** 1-2 hours  
**Priority:** High (ensure everything works)

### Test Scenario 1: Simple Confirmation
- [ ] Load ingredient with AI claim
- [ ] Find 2-3 peer-reviewed citations
- [ ] Write 200-word explanation
- [ ] Select "High Confidence"
- [ ] Select "Confirm" verdict
- [ ] Save validation
- [ ] Check database: ingredient_validations row created
- [ ] Check database: citations inserted in ingredient_validation_citations
- [ ] Check StudentReviewer: stats updated

### Test Scenario 2: Correction Workflow
- [ ] Load ingredient
- [ ] Find citations (but evidence is incomplete)
- [ ] Write explanation
- [ ] Select "Moderate Confidence"
- [ ] Select "Correct" verdict
- [ ] Enter correction details
- [ ] Add internal notes
- [ ] Save validation
- [ ] Check database: correction_statement saved
- [ ] Check database: internal_notes saved

### Test Scenario 3: Escalation Workflow
- [ ] Load ingredient
- [ ] Try to find citations (none available or conflicting)
- [ ] Write minimal explanation
- [ ] Select "Limited Confidence"
- [ ] Select "Escalate" verdict
- [ ] Add escalation reason
- [ ] Save validation
- [ ] Check database: is_escalated = true
- [ ] Check: escalation appears in moderator queue

### Test Scenario 4: Edit Existing Validation
- [ ] Load previously validated ingredient
- [ ] Validation data pre-fills correctly
- [ ] Can modify explanation
- [ ] Can add more citations
- [ ] Can change verdict
- [ ] Save updates database
- [ ] Old citations preserved + new ones added

### Test Scenario 5: Error Cases
- [ ] Try to proceed without citations → blocked
- [ ] Try to proceed without explanation → blocked
- [ ] Try to save with invalid explanation length → blocked
- [ ] Network error during save → retry shown
- [ ] Database error → user-friendly message shown

### Test Scenario 6: UI/UX
- [ ] Step indicators visible and correct
- [ ] Buttons enable/disable properly
- [ ] Word counter updates in real-time
- [ ] Confidence icons show correctly
- [ ] Verdict color coding matches design
- [ ] Mobile responsive layout works
- [ ] Form validation messages clear

### Test Data Setup
```sql
-- Create test ingredient if needed:
INSERT INTO ingredients (name, pubchem_cid, description)
VALUES ('Test Ingredient', '1234', 'For testing OEW workflow')
ON CONFLICT DO NOTHING;
```

### Manual Testing Checklist
```
Frontend:
☐ All 6 steps render correctly
☐ Navigation between steps works
☐ Form data persists when navigating back
☐ Validation errors show at right time
☐ Success message shows after save
☐ Loading state shows during save

Backend:
☐ Data saves to ingredient_validations table
☐ Citations save to ingredient_validation_citations table
☐ Fields match schema exactly
☐ Timestamps set correctly
☐ User ID associated correctly
☐ Escalations flagged in database

Database:
☐ No orphaned citations
☐ No duplicate data
☐ Updated_at timestamp current
☐ All required fields populated
☐ Verdicts correct values
☐ RLS policies allow operations
```

---

## 📊 Work Estimates & Timeline

### If done sequentially (recommended):

```
Task 1: InternalNotesPanel
└─ 30 min
   └─ Task 2: ReviewerAccuracyCard
      └─ 45 min
         └─ Task 3: Refactor IngredientValidationPanel
            └─ 2-3 hours (CRITICAL PATH)
               └─ Task 4: Update StudentReviewer
                  └─ 1 hour
                     └─ Task 5: Integration Testing
                        └─ 1-2 hours

Total: 5.5 - 7.5 hours
```

### If done in parallel:

```
Task 1 & 2 (InternalNotesPanel + ReviewerAccuracyCard)
└─ 75 min (parallel)
   └─ Task 3 (Refactor IngredientValidationPanel)
      └─ 2-3 hours
         └─ Task 4 (Update StudentReviewer) 
            └─ 1 hour
               └─ Task 5 (Testing)
                  └─ 1-2 hours

Total: Still ~5.5 - 7.5 hours (Task 3 is critical path)
```

---

## 🚀 Dependencies & Order

```
Dependency Graph:

    Task 1              Task 2
(InternalNotes)  (ReviewerAccuracy)
        ↓                  ↓
        ├──────┬───────────┘
                ↓
          Task 3 (CRITICAL)
      (Refactor Panel)
                ↓
          Task 4
       (Update Page)
                ↓
          Task 5
         (Testing)
```

**Recommended Order:**
1. Start Task 1 & 2 in parallel (both small)
2. Move to Task 3 (largest, critical)
3. Then Task 4 (quick integration)
4. Finally Task 5 (validation)

---

## ✅ Definition of Done

When complete, the system will have:

- ✅ 8 OEW workflow components (already built)
- ✅ 2 utility components (Tasks 1-2)
- ✅ 1 refactored main panel (Task 3)
- ✅ 1 updated page (Task 4)
- ✅ Full end-to-end tested workflow (Task 5)
- ✅ Database validated
- ✅ UI responsive
- ✅ Error handling complete
- ✅ Ready for production deployment

---

## 📝 Notes & Reminders

### Code Quality
- Use TypeScript strictly (no `any` types)
- Follow existing component patterns
- Add error handling everywhere
- Include loading states
- Add success/error toast messages

### Testing During Build
- Test each step before moving to next
- Use browser DevTools to check data
- Check Supabase console for database state
- Test on mobile too

### Common Pitfalls to Avoid
- ❌ Forgetting to handle RLS in queries
- ❌ Not validating before save
- ❌ Missing error handling
- ❌ Not refetching stats after save
- ❌ Form data not persisting between steps

### Helpful Resources in Codebase
- `src/integrations/supabase/client.ts` - Supabase client setup
- `src/components/ui/*` - Shadcn UI components
- `src/hooks/*` - Custom React hooks
- `src/lib/*` - Utility functions

---

## 🎯 Success Criteria

When all 5 tasks are complete, you will be able to:

1. ✅ Open StudentReviewer page
2. ✅ See your performance stats at top
3. ✅ Select an ingredient to validate
4. ✅ Walk through 6-step OEW workflow
5. ✅ Add citations with validation
6. ✅ Write consumer explanation
7. ✅ Rate confidence based on evidence
8. ✅ Make professional verdict (confirm/correct/escalate)
9. ✅ Add correction details if needed
10. ✅ Add internal notes for moderators
11. ✅ Save everything to database
12. ✅ See stats update immediately
13. ✅ Escalations flag for moderator review

**Result:** Complete, production-ready Cosmetic Science Apprentice Reviewer system 🎉

---

## 📞 Questions?

Refer back to:
- **OEW-COMPONENTS-BUILD-SUMMARY.md** - Component details
- **OEW-INTEGRATION-GUIDE.md** - Architecture & data flow
- **WORKFLOW-DEEP-DIVE.md** - Workflow specification

Good luck! You're in the final stretch. 🚀
