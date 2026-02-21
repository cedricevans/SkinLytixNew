# OEW Workflow Architecture Diagram

## 📊 System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        StudentReviewer Page                              │
│                      (src/pages/dashboard/)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
        │   Reviewer       │  │  Ingredient      │  │  Ingredient      │
        │   Accuracy Card  │  │  List            │  │  Source Panel    │
        │   (NEW - Task 2) │  │  (Selector)      │  │  (Existing)      │
        └──────────────────┘  └──────────────────┘  └──────────────────┘
                    │               │                   │
                    │               └───────────────────┴───────┐
                    │                                           │
                    ▼                                           ▼
        ┌──────────────────────────────────────┐  ┌──────────────────────┐
        │   React Query Hook                   │  │  Select Ingredient   │
        │   - Fetches reviewer_stats view      │  │  - Updates state     │
        │   - Auto-refreshes on validation    │  │  - Loads cache data  │
        │   - Shows performance metrics        │  └──────────────────────┘
        └──────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│           IngredientValidationPanel (Task 3 - NEW ARCHITECTURE)         │
│            src/components/reviewer/IngredientValidationPanel.tsx         │
│                            (450-500 lines)                               │
└─────────────────────────────────────────────────────────────────────────┘
    │
    ├─ State Management
    │  ├─ currentStep: 1-6
    │  ├─ formData: ValidationData
    │  ├─ loading: boolean
    │  └─ error: string | null
    │
    ├─ Effects
    │  └─ useEffect: Load existing validation on mount
    │
    └─ Conditional Rendering (based on currentStep)
       │
       ├─ [currentStep === 1]
       │  └─ OEWObservationPanel
       │     ├─ Ingredient name
       │     ├─ AI claim summary
       │     ├─ Role classification
       │     ├─ Safety level
       │     ├─ AI explanation
       │     ├─ PubChem CID
       │     └─ Molecular weight
       │     └─ [Always can proceed]
       │
       ├─ [currentStep === 2]
       │  └─ OEWEvidencePanel
       │     ├─ CitationForm
       │     │  └─ Citation type selector
       │     │  └─ Title input
       │     │  └─ Authors input
       │     │  └─ Journal name input
       │     │  └─ Year input
       │     │  └─ DOI/PMID input
       │     │  └─ URL input
       │     │  └─ Add button
       │     │
       │     └─ CitationList
       │        └─ Display citations
       │        └─ Remove buttons
       │     └─ [Requires ≥1 citation]
       │
       ├─ [currentStep === 3]
       │  └─ OEWWritingPanel
       │     ├─ Textarea for explanation
       │     ├─ Word counter
       │     │  ├─ Green (150-300 words) ✓
       │     │  ├─ Amber (<150 or >300)
       │     │  └─ Red (way off)
       │     └─ Help text
       │     └─ [Requires 150-300 words]
       │
       ├─ [currentStep === 4]
       │  └─ ConfidenceLevelSelector
       │     ├─ High (multiple sources)
       │     ├─ Moderate (single RCT)
       │     └─ Limited (weak evidence)
       │     └─ [Requires selection]
       │
       ├─ [currentStep === 5]
       │  └─ VerdictSelector
       │     ├─ Confirm (accurate)
       │     ├─ Correct (needs change)
       │     │  └─ [Shows CorrectionInput]
       │     │     └─ Textarea for correction
       │     └─ Escalate (insufficient evidence)
       │        └─ [Shows escalation reason field]
       │           └─ Textarea for reason
       │     └─ [Requires verdict selection]
       │
       └─ [currentStep === 6]
          └─ InternalNotesPanel
             ├─ Textarea for notes
             ├─ Character counter (500 limit)
             ├─ Help text
             └─ [Optional - always can save]
    │
    └─ Navigation & Save
       ├─ Back button (disabled on step 1)
       ├─ Next button (validates per step)
       ├─ Save button (on step 6)
       │  └─ Validates all required fields
       │  └─ Saves to ingredient_validations
       │  └─ Saves citations to ingredient_validation_citations
       │  └─ Shows success toast
       │  └─ Calls onValidationComplete()
       └─ Loading spinner during save


┌─────────────────────────────────────────────────────────────────────────┐
│                        Database Integration                              │
└─────────────────────────────────────────────────────────────────────────┘
    │
    ├─ Tables
    │  ├─ ingredient_validations
    │  │  ├─ id (UUID)
    │  │  ├─ ingredient_id (string)
    │  │  ├─ analysis_id (string)
    │  │  ├─ validator_id (UUID - user)
    │  │  ├─ ai_claim_summary (TEXT)
    │  │  ├─ public_explanation (TEXT)
    │  │  ├─ confidence_level ('High'|'Moderate'|'Limited')
    │  │  ├─ verdict ('confirm'|'correct'|'escalate')
    │  │  ├─ correction (TEXT)
    │  │  ├─ escalation_reason (TEXT)
    │  │  ├─ internal_notes (TEXT)
    │  │  ├─ is_escalated (BOOLEAN)
    │  │  ├─ moderator_review_status (VARCHAR)
    │  │  ├─ updated_at (TIMESTAMP)
    │  │  └─ created_at (TIMESTAMP)
    │  │
    │  └─ ingredient_validation_citations (NEW)
    │     ├─ id (UUID)
    │     ├─ validation_id (UUID - FK)
    │     ├─ citation_type (VARCHAR)
    │     ├─ title (VARCHAR)
    │     ├─ authors (VARCHAR)
    │     ├─ journal (VARCHAR)
    │     ├─ year (INTEGER)
    │     ├─ doi_or_pmid (VARCHAR)
    │     ├─ source_url (TEXT)
    │     ├─ created_at (TIMESTAMP)
    │     └─ updated_at (TIMESTAMP)
    │
    ├─ Views
    │  └─ reviewer_stats (used by ReviewerAccuracyCard)
    │     ├─ user_id
    │     ├─ institution
    │     ├─ total_validations
    │     ├─ confirmed_validations
    │     ├─ corrected_validations
    │     ├─ escalated_validations
    │     ├─ high_confidence_count
    │     ├─ moderate_confidence_count
    │     ├─ limited_confidence_count
    │     ├─ approved_count
    │     ├─ rejected_count
    │     ├─ approval_rate
    │     └─ last_validation_date
    │
    └─ RLS Policies
       ├─ Users can read own validations
       ├─ Moderators can read all validations
       ├─ Users can write own validations
       └─ Audit trail via updated_at


┌─────────────────────────────────────────────────────────────────────────┐
│                           Data Flow                                      │
└─────────────────────────────────────────────────────────────────────────┘

User selects ingredient
        │
        ▼
Load existing validation (if exists)
        │
        ├─ Query: SELECT * FROM ingredient_validations
        │         WHERE ingredient_id = X AND analysis_id = Y
        │
        └─ Query: SELECT * FROM ingredient_validation_citations
                  WHERE validation_id = existing.id
        │
        ▼
Display Step 1: Observation (read-only data)
        │
        ▼
User navigates through Steps 2-6
        │
        ├─ Step 2: Add citations (stored in formData.citations array)
        ├─ Step 3: Write explanation (stored in formData.publicExplanation)
        ├─ Step 4: Select confidence (stored in formData.confidenceLevel)
        ├─ Step 5: Select verdict (stored in formData.verdict)
        │           └─ If correct: store correction
        │           └─ If escalate: store escalation_reason
        └─ Step 6: Add notes (stored in formData.internalNotes)
        │
        ▼
User clicks "Save Validation"
        │
        ├─ Validate all required fields
        │
        ▼
Save to ingredient_validations table
        │
        ├─ INSERT new record if new validation
        ├─ UPDATE existing record if editing
        │
        ▼
Save citations (delete old, insert new)
        │
        ├─ DELETE FROM ingredient_validation_citations
        │  WHERE validation_id = X
        │
        ├─ INSERT INTO ingredient_validation_citations
        │  (For each citation in formData.citations)
        │
        ▼
Show success toast
        │
        ▼
Reset form
        │
        ▼
Call onValidationComplete()
        │
        ├─ Reload validations for current product
        ├─ Reload products list
        ├─ Trigger ReviewerAccuracyCard refetch via React Query
        │
        ▼
Update UI with new stats


┌─────────────────────────────────────────────────────────────────────────┐
│                     Component Integration Map                            │
└─────────────────────────────────────────────────────────────────────────┘

ReviewerAccuracyCard (NEW - Task 2)
    │
    └─ Queries: reviewer_stats view
       └─ Uses: React Query, Shadcn Card/Badge, Lucide icons

IngredientValidationPanel (REFACTOR - Task 3)
    ├─ OEWObservationPanel
    ├─ OEWEvidencePanel
    │  ├─ CitationForm (handles citation input)
    │  └─ CitationList (handles citation display/removal)
    ├─ OEWWritingPanel
    ├─ ConfidenceLevelSelector
    ├─ VerdictSelector
    ├─ CorrectionInput (conditional)
    └─ InternalNotesPanel (NEW - Task 1)

StudentReviewer (UPDATE - Task 4)
    ├─ Imports: IngredientValidationPanel, ReviewerAccuracyCard, IngredientSourcePanel
    ├─ Displays: ReviewerAccuracyCard at top
    └─ Manages: Product selection, ingredient list, validation state


┌─────────────────────────────────────────────────────────────────────────┐
│                        Validation Rules                                  │
└─────────────────────────────────────────────────────────────────────────┘

Step 1 (Observation)
    └─ Can Always Proceed
       └─ Read-only display

Step 2 (Evidence)
    └─ Requires: ≥1 Citation
       └─ Validation: citations.length > 0
       └─ Error: "Add at least one citation to proceed"

Step 3 (Writing)
    └─ Requires: 150-300 Words
       └─ Validation: wordCount >= 150 && wordCount <= 300
       └─ Error: "Explanation must be 150-300 words"

Step 4 (Confidence)
    └─ Requires: Selection
       └─ Validation: confidenceLevel !== ''
       └─ Error: "Select confidence level"
       └─ Options: 'High', 'Moderate', 'Limited'

Step 5 (Verdict)
    └─ Requires: Selection
       └─ Validation: verdict !== ''
       └─ Error: "Select a verdict"
       └─ Options: 'confirm', 'correct', 'escalate'
       └─ If 'correct': Shows CorrectionInput for feedback
       └─ If 'escalate': Shows escalation reason field

Step 6 (Internal Notes)
    └─ Optional
       └─ Can Always Save
       └─ Character Limit: 500 (optional)


┌─────────────────────────────────────────────────────────────────────────┐
│                          Error Handling                                  │
└─────────────────────────────────────────────────────────────────────────┘

User Actions:
    ├─ Missing required data
    │  └─ Show error toast with explanation
    │  └─ Keep user on current step
    ├─ Database error on save
    │  └─ Show error toast with message
    │  └─ Allow user to retry
    ├─ Network error
    │  └─ Show error toast
    │  └─ Allow user to retry
    └─ Unexpected error
       └─ Log to console
       └─ Show generic error message


┌─────────────────────────────────────────────────────────────────────────┐
│                       Loading & UI States                                │
└─────────────────────────────────────────────────────────────────────────┘

Loading Validation Data:
    └─ Component mounts
       └─ useEffect queries database
       └─ Populates formData with existing data
       └─ Display data in respective steps

Loading Stats (ReviewerAccuracyCard):
    └─ React Query hook
       └─ Shows "Loading stats..." message
       └─ Fetches when userId available
       └─ Auto-refetches on data change

Saving Validation:
    └─ User clicks "Save Validation" button
       └─ Button disabled
       └─ Show spinner + "Saving..." text
       └─ Execute validation
       └─ Save to database
       └─ On success:
       │  └─ Show success toast
       │  └─ Reset form
       │  └─ Trigger refetch
       └─ On error:
          └─ Show error toast
          └─ Enable button for retry


┌─────────────────────────────────────────────────────────────────────────┐
│                     Citation Type Support                                │
└─────────────────────────────────────────────────────────────────────────┘

CitationForm.Citation Interface:
    {
      type: 'peer_reviewed' | 'clinical_study' | 'systematic_review' |
            'dermatology_textbook' | 'cir_monograph' | 'other'
      title: string
      authors: string
      journal_name: string
      publication_year: number | null
      doi_or_pmid: string
      source_url: string
    }

Database Mapping:
    {
      citation_type: (from type)
      title: (title)
      authors: (authors)
      journal: (from journal_name)
      year: (from publication_year)
      doi_or_pmid: (doi_or_pmid)
      source_url: (source_url)
    }

Display Labels:
    ├─ peer_reviewed: "Peer-Reviewed Article"
    ├─ clinical_study: "Clinical Study"
    ├─ systematic_review: "Systematic Review"
    ├─ dermatology_textbook: "Textbook"
    ├─ cir_monograph: "CIR Monograph"
    └─ other: "Other Source"


┌─────────────────────────────────────────────────────────────────────────┐
│                        Mobile Responsiveness                             │
└─────────────────────────────────────────────────────────────────────────┘

Grid Layouts:
    Mobile (375px)    → 1 column
    Tablet (768px)    → 2 columns  
    Desktop (1024px)  → 3 columns
    Wide (1440px)     → 6 columns (ReviewerAccuracyCard)

Responsive Elements:
    ├─ ReviewerAccuracyCard: Grid responsive
    ├─ IngredientValidationPanel: Full width, readable
    ├─ Form inputs: Adjust to screen size
    ├─ Buttons: Touch-friendly sizes
    └─ Typography: Scales appropriately


===== END OF ARCHITECTURE DIAGRAM =====
```

## Summary

This diagram shows:
1. **Page Structure** - How StudentReviewer contains the new components
2. **Workflow Steps** - The 6-step OEW process with conditional rendering
3. **Database Integration** - Tables, views, and data flow
4. **Component Hierarchy** - How components nest and interact
5. **Validation Rules** - Requirements for each step
6. **Error Handling** - How errors are managed
7. **UI States** - Loading, saving, and display states
8. **Citation Support** - Citation data structure and mapping
9. **Responsive Design** - Breakpoints and layout adjustments

All components work together to create a professional, guided workflow for evidence-based ingredient validation with comprehensive data capture and reviewer metrics tracking.
