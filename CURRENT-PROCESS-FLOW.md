# Current Process Flow & Architecture

**Date:** February 21, 2026  
**Purpose:** Map current workflow → explain changes → prepare for development

---

## 📊 Current User Flow (OLD - Being Replaced)

```
StudentReviewer Page
│
├─ Check Access (role + certification)
│
├─ Load Products List
│  └─ Query: user_analyses table
│  └─ Shows: product_name, brand, category, epiq_score
│
├─ Select Product
│  └─ Parse ingredients_list from product
│  └─ Display ingredients in left panel
│
├─ Select Ingredient
│  └─ Fetch PubChem data
│  └─ Fetch AI explanation from analysis
│  └─ Load existing validation (if any)
│
└─ IngredientValidationPanel (OLD)
   ├─ Section 1: PubChem Verification
   │  ├─ Display: ingredient_name, pubchem_cid, molecular_weight
   │  ├─ Ask: "PubChem data correct?" (YES/NO)
   │  └─ Show: PubChem link
   │
   ├─ Section 2: AI Explanation Verification
   │  ├─ Display: Full AI explanation
   │  ├─ Ask: "Explanation accurate?" (YES/NO)
   │  └─ Show: Role + Safety Level from AI
   │
   ├─ Section 3: Corrections (if needed)
   │  ├─ Corrected Role dropdown (13 options)
   │  ├─ Safety Level dropdown (safe/caution/avoid)
   │  ├─ Correction Notes textarea
   │  └─ Reference Sources checkboxes (7 options)
   │
   └─ Save Button
      └─ Insert into ingredient_validations table
      └─ Show success message
      └─ Return to ingredient list

Stats Tracked:
└─ productsToValidate (count of user_analyses)
└─ ingredientsValidated (count of validations completed)
└─ flaggedForCorrection (count of corrections made)
```

---

## 🔄 NEW Process Flow (OEW Framework)

```
StudentReviewer Page
│
├─ ReviewerAccuracyCard (NEW - TASK 2)
│  └─ Query: reviewer_stats view
│  └─ Display: validations_completed, accuracy_%, confidence_distribution
│
├─ Check Access (same as before)
│
├─ Load Products List (same as before)
│
├─ Select Product (same as before)
│
├─ Select Ingredient (same as before)
│
└─ IngredientValidationPanel (REFACTORED - TASK 3)
   └─ Multi-Step Workflow (6 Steps):
   │
   ├─ Step 1: OBSERVATION (Read-Only) ✓
   │  ├─ Component: OEWObservationPanel
   │  ├─ Display: 
   │  │  ├─ Ingredient name (large)
   │  │  ├─ AI claim summary
   │  │  ├─ Role classification badge
   │  │  ├─ Safety level badge
   │  │  ├─ Full AI explanation
   │  │  └─ PubChem reference (CID, molecular weight)
   │  ├─ User Action: Read & understand claim
   │  └─ Next Button: "Find Evidence"
   │
   ├─ Step 2: EVIDENCE (Citations) 📚
   │  ├─ Component: OEWEvidencePanel
   │  │  ├─ CitationForm (ADD)
   │  │  └─ CitationList (DISPLAY)
   │  ├─ Display:
   │  │  ├─ Citation form with fields:
   │  │  │  ├─ Type: peer_reviewed | clinical_study | systematic_review | dermatology_textbook | cir_monograph | other
   │  │  │  ├─ Title (required)
   │  │  │  ├─ Authors (required, format: Last, F.; Last, F.; et al.)
   │  │  │  ├─ Journal (required)
   │  │  │  ├─ Year (optional)
   │  │  │  ├─ DOI/PMID (validated format)
   │  │  │  └─ URL (validated)
   │  │  │
   │  │  ├─ Citation list showing:
   │  │  │  ├─ Color-coded type badges
   │  │  │  ├─ Title, authors, journal, year
   │  │  │  ├─ DOI/PMID display
   │  │  │  ├─ External link button
   │  │  │  └─ Remove button
   │  │  │
   │  │  ├─ Requirements checklist:
   │  │  │  ├─ Minimum 1 citation (enforced)
   │  │  │  ├─ Peer-reviewed only (shown)
   │  │  │  ├─ DOI/PMID required (shown)
   │  │  │  └─ URL required (shown)
   │  │  │
   │  │  └─ Sources guidance:
   │  │     ├─ PubMed with search tips
   │  │     ├─ Google Scholar
   │  │     ├─ CIR Database
   │  │     └─ Dermatology Journals
   │  │
   │  ├─ User Action: 
   │  │  ├─ Search for peer-reviewed sources
   │  │  ├─ Add 1+ citations
   │  │  └─ Verify citations are accessible
   │  │
   │  ├─ Validation:
   │  │  └─ CANNOT proceed without ≥1 citation
   │  │
   │  └─ Next Button: "Write Explanation" (enabled if citations ≥ 1)
   │
   ├─ Step 3: WRITING (Public Explanation) ✍️
   │  ├─ Component: OEWWritingPanel
   │  ├─ Display:
   │  │  ├─ Large textarea for consumer explanation
   │  │  ├─ Word count display (real-time)
   │  │  ├─ Word count indicators (too short/perfect/too long)
   │  │  ├─ Voice & tone requirements (5 rules)
   │  │  ├─ Suggested structure (5 sections):
   │  │  │  ├─ "What it is"
   │  │  │  ├─ "What it does"
   │  │  │  ├─ "Who it's for"
   │  │  │  ├─ "Cautions"
   │  │  │  └─ "Bottom line"
   │  │  ├─ Real example (Salicylic acid, 300+ words)
   │  │  └─ 7 writing tips
   │  │
   │  ├─ User Action:
   │  │  └─ Write 150-300 word plain-language explanation for consumers
   │  │
   │  ├─ Validation:
   │  │  └─ CANNOT proceed without 150-300 words
   │  │
   │  └─ Next Button: "Rate Confidence" (enabled if word count correct)
   │
   ├─ Step 4: CONFIDENCE (Evidence Quality) 📊
   │  ├─ Component: ConfidenceLevelSelector
   │  ├─ Display: 3 radio options
   │  │  ├─ 🟢 HIGH CONFIDENCE
   │  │  │  ├─ Description: Multiple sources, strong evidence
   │  │  │  ├─ Indicators: 
   │  │  │  │  ├─ Multiple independent peer-reviewed studies
   │  │  │  │  ├─ Systematic reviews support claim
   │  │  │  │  ├─ No conflicting evidence
   │  │  │  │  └─ Safety/efficacy well-established
   │  │  │  └─ Example: Retinol for wrinkles
   │  │  │
   │  │  ├─ 🟡 MODERATE CONFIDENCE
   │  │  │  ├─ Description: Single peer-reviewed RCT OR clinical consensus
   │  │  │  ├─ Indicators:
   │  │  │  │  ├─ One good peer-reviewed RCT
   │  │  │  │  ├─ Clinical consensus supports
   │  │  │  │  ├─ No conflicting evidence
   │  │  │  │  └─ Some nuance needed
   │  │  │  └─ Example: Niacinamide for sebum control
   │  │  │
   │  │  └─ 🔴 LIMITED CONFIDENCE
   │  │     ├─ Description: Weak, conflicting, or missing evidence
   │  │     ├─ Indicators:
   │  │     │  ├─ Only anecdotal evidence
   │  │     │  ├─ Single case study
   │  │     │  ├─ Conflicting sources
   │  │     │  ├─ New ingredient
   │  │     │  └─ Requires escalation
   │  │     └─ Example: New peptide complex
   │  │
   │  ├─ User Action:
   │  │  └─ Select confidence level based on evidence quality
   │  │
   │  ├─ Validation:
   │  │  └─ CANNOT proceed without selection
   │  │
   │  └─ Next Button: "Make Verdict" (enabled if selected)
   │
   ├─ Step 5: VERDICT (Professional Decision) ⚖️
   │  ├─ Component: VerdictSelector
   │  ├─ Display: 3 radio options
   │  │  ├─ ✓ CONFIRM (Green)
   │  │  │  ├─ Description: AI claim is 100% accurate
   │  │  │  ├─ When to choose:
   │  │  │  │  ├─ Evidence fully supports claim
   │  │  │  │  ├─ No corrections needed
   │  │  │  │  ├─ Safety/efficacy established
   │  │  │  └─ Example: "Retinol reduces wrinkles" + strong evidence = CONFIRM
   │  │  │
   │  │  ├─ ✏️ CORRECT (Amber)
   │  │  │  ├─ Description: AI needs specific revision
   │  │  │  ├─ When to choose:
   │  │  │  │  ├─ Mostly right but missing nuance
   │  │  │  │  ├─ Evidence contradicts part of claim
   │  │  │  ├─ Concentration differs
   │  │  │  │  ├─ AI overstated/understated
   │  │  │  │  └─ Cautions missing
   │  │  │  ├─ Shows: CorrectionInput (textarea) appears below
   │  │  │  └─ Example: "Niacinamide improves pore appearance (not size)" = CORRECT
   │  │  │
   │  │  └─ ⚠️ ESCALATE (Red)
   │  │     ├─ Description: Insufficient or conflicting evidence
   │  │     ├─ When to choose:
   │  │     │  ├─ No peer-reviewed evidence found
   │  │     │  ├─ Only conflicting studies
   │  │     │  ├─ Evidence too new
   │  │     │  ├─ Only manufacturer claims
   │  │     │  └─ Single small study
   │  │     ├─ Shows: "⚠️ Escalation Required" warning
   │  │     ├─ Behavior: Flags for moderator review
   │  │     └─ Example: "New ingredient with 1 small study" = ESCALATE
   │  │
   │  ├─ User Action:
   │  │  └─ Select verdict based on evidence & findings
   │  │
   │  ├─ Validation:
   │  │  └─ CANNOT proceed without selection
   │  │
   │  ├─ Conditional Step 5b: CORRECTION INPUT (if verdict = 'correct')
   │  │  ├─ Component: CorrectionInput (appears only if verdict='correct')
   │  │  ├─ Display:
   │  │  │  ├─ Textarea for correction details
   │  │  │  ├─ 4-step guidance:
   │  │  │  │  ├─ "1. Specify what's wrong"
   │  │  │  │  ├─ "2. Provide correct statement"
   │  │  │  │  ├─ "3. Cite supporting evidence"
   │  │  │  │  └─ "4. Explain nuance (if needed)"
   │  │  │  ├─ 3 good correction examples
   │  │  │  ├─ Bad example counter-examples
   │  │  │  └─ Tips for strong corrections
   │  │  │
   │  │  ├─ User Action:
   │  │  │  └─ Enter specific correction details (10+ words recommended)
   │  │  │
   │  │  └─ Validation:
   │  │     └─ Recommended but not required
   │  │
   │  └─ Next Button: "Add Internal Notes" (enabled if verdict selected)
   │
   ├─ Step 6: INTERNAL NOTES (Optional) 📝
   │  ├─ Component: InternalNotesPanel
   │  ├─ Display:
   │  │  ├─ Textarea for internal notes
   │  │  ├─ 500 character limit
   │  │  ├─ Character counter
   │  │  ├─ Help text: "Add context or concerns for moderator review"
   │  │  └─ Examples: conflicting evidence, expert guidance needed, etc.
   │  │
   │  ├─ User Action:
   │  │  └─ Optionally add internal notes for moderators
   │  │
   │  ├─ Validation:
   │  │  └─ OPTIONAL (not required for save)
   │  │
   │  └─ SAVE Button: "Save Validation" (final submit)
   │
   └─ Database Save (on submit):
      ├─ Insert/Update ingredient_validations:
      │  ├─ ingredientId
      │  ├─ aiClaimSummary
      │  ├─ publicExplanation
      │  ├─ confidenceLevel (high/moderate/limited)
      │  ├─ verdict (confirm/correct/escalate)
      │  ├─ correction (if verdict='correct')
      │  ├─ escalationReason (if verdict='escalate')
      │  ├─ internalNotes (if provided)
      │  ├─ isEscalated (true if verdict='escalate')
      │  ├─ moderatorReviewStatus (pending)
      │  └─ updatedAt (current timestamp)
      │
      ├─ Insert ingredient_validation_citations:
      │  └─ For each citation added:
      │     ├─ validationId (FK)
      │     ├─ type
      │     ├─ title
      │     ├─ authors
      │     ├─ journal
      │     ├─ year
      │     ├─ doiOrPmid
      │     └─ url
      │
      ├─ Show success toast
      ├─ Update stats on page
      └─ Move to next ingredient

New Stats Tracked:
├─ validationsCompleted
├─ accuracyPercentage (%)
├─ confidenceDistribution (high/moderate/limited counts)
├─ escalationCount
├─ lastValidationDate
└─ institutionName
```

---

## 📋 Data Model Changes

### OLD Data Structure (ingredient_validations table)
```
id
analysis_id
ingredient_name
pubchem_cid
pubchem_data_correct (boolean)
ai_explanation_accurate (boolean)
corrected_role (string)
corrected_safety_level (string)
correction_notes (text)
reference_sources (array)
validation_status (string)
created_at
updated_at
```

### NEW Data Structure (ingredient_validations table + additions)
```
ingredient_validations:
├─ id (PK)
├─ ingredient_id (FK)
├─ ai_claim_summary (text)
├─ public_explanation (text) ← NEW
├─ confidence_level (enum: high/moderate/limited) ← NEW
├─ verdict (enum: confirm/correct/escalate) ← NEW
├─ correction (text) ← NEW (only if verdict='correct')
├─ escalation_reason (text) ← NEW (only if verdict='escalate')
├─ internal_notes (text) ← NEW (optional)
├─ is_escalated (boolean) ← NEW
├─ moderator_review_status (enum: pending/approved/rejected) ← NEW
├─ created_at
├─ updated_at ← NEW

ingredient_validation_citations: ← NEW TABLE
├─ id (PK)
├─ validation_id (FK → ingredient_validations.id)
├─ type (enum: peer_reviewed/clinical_study/systematic_review/dermatology_textbook/cir_monograph/other)
├─ title (text)
├─ authors (text)
├─ journal (text)
├─ year (integer, optional)
├─ doi_or_pmid (text) ← validated format
├─ url (text) ← validated format
├─ created_at
```

---

## 🔀 Component Integration Architecture

```
StudentReviewer (Page)
│
├─ ReviewerAccuracyCard (NEW - TASK 2)
│  └─ Queries: reviewer_stats view
│
├─ Products List (unchanged)
│
├─ Ingredients List (unchanged)
│
└─ IngredientValidationPanel (REFACTORED - TASK 3)
   │
   ├─ State Management:
   │  ├─ currentStep (1-6)
   │  ├─ formData (all OEW data)
   │  ├─ isLoading
   │  └─ error
   │
   ├─ Step 1: OEWObservationPanel (imported component)
   │
   ├─ Step 2: OEWEvidencePanel (imported component)
   │  ├─ CitationForm (imported)
   │  └─ CitationList (imported)
   │
   ├─ Step 3: OEWWritingPanel (imported component)
   │
   ├─ Step 4: ConfidenceLevelSelector (imported component)
   │
   ├─ Step 5: VerdictSelector (imported component)
   │
   ├─ Step 5b: CorrectionInput (imported component) [conditional]
   │
   ├─ Step 6: InternalNotesPanel (NEW - TASK 1)
   │
   └─ Save Logic:
      └─ Saves to ingredient_validations + ingredient_validation_citations
```

---

## 🎯 Key Differences: Old vs New Process

| Aspect | OLD | NEW |
|--------|-----|-----|
| **Workflow** | Linear: Pubchem? → Accurate? → Correct | Multi-step: 6-step OEW framework |
| **Evidence** | Optional checkboxes (7 sources) | Mandatory peer-reviewed citations (≥1 required) |
| **Explanation** | Just correction notes | Full 150-300 word public explanation |
| **Assessment** | Binary (correct/incorrect) | Nuanced (High/Moderate/Limited confidence) |
| **Verdict** | Implicit (either correct or needs changes) | Explicit (Confirm/Correct/Escalate) |
| **Citations** | Checkbox list | Full citation metadata with DOI/PMID/URL |
| **Escalation** | Not structured | Explicit escalation workflow with reason |
| **Internal Notes** | "Correction notes" field | Separate internal notes (optional) |
| **Stats** | Basic (count of validations) | Rich (accuracy %, confidence distribution) |
| **User Education** | Minimal guidance | Extensive guidance, examples, tips at each step |
| **Steps** | 3 (PubChem, AI, Corrections) | 6 (Observation, Evidence, Writing, Confidence, Verdict, Notes) |

---

## ✅ Pre-Build Checklist

Before we start building Tasks 1-5, verify:

- [ ] All 8 OEW components are already built and exist in `src/components/reviewer/`
- [ ] Database migration has been applied (20260221_add_oew_workflow_columns.sql)
- [ ] Supabase view `reviewer_stats` exists
- [ ] Current StudentReviewer page is working
- [ ] Current IngredientValidationPanel is working
- [ ] No TypeScript errors in project
- [ ] React Query is available for data fetching
- [ ] Supabase client is configured
- [ ] Toast notifications are available

---

## 📞 Questions to Clarify Before Building

1. **Data Migration:** Do we need to migrate OLD validations to NEW schema?
   - OLD validations have: pubchem_data_correct, ai_explanation_accurate, corrected_role, etc.
   - NEW validations have: public_explanation, confidence_level, verdict, etc.
   - **Decision Needed:** Keep old data or start fresh?

2. **Escalation Flow:** When someone escalates, who sees it?
   - Moderators in a queue?
   - Flagged for manual review?
   - **Decision Needed:** Where do escalations appear in the UI?

3. **Moderator Review:** Is there a separate moderator dashboard?
   - Can they approve/reject validations?
   - Can they edit validations?
   - **Decision Needed:** Is this Phase 2 or already built?

4. **Stats View:** Does `reviewer_stats` view exist in database?
   - If not, we need to create it
   - **Decision Needed:** Create or already exists?

---

## 🚀 Ready to Build?

Once you confirm:
1. ✅ All 8 OEW components exist
2. ✅ Database migration applied
3. ✅ No conflicting data migration issues
4. ✅ Answers to above 4 questions

We can proceed with Tasks 1-5 simultaneously!

