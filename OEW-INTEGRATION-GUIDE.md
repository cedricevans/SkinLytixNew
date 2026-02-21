# OEW Component Architecture & Integration Guide

## 🏗️ Component Hierarchy

```
<StudentReviewer> (main page)
  │
  ├─ <ReviewerAccuracyCard /> (to build)
  │  └─ Shows: validations completed, accuracy %, institution
  │
  ├─ <IngredientValidationQueue /> (existing, minimal changes)
  │  └─ Displays next unvalidated ingredient from queue
  │
  └─ <RefactoredIngredientValidationPanel /> (to build)
     │
     ├─ <OEWObservationPanel /> ✅ BUILT
     │  └─ Displays AI claim, role, safety level (read-only)
     │
     ├─ <OEWEvidencePanel /> ✅ BUILT
     │  ├─ <CitationForm /> ✅ BUILT
     │  │  └─ Input form for adding citations
     │  │
     │  └─ <CitationList /> ✅ BUILT
     │     └─ Display list of added citations
     │
     ├─ <OEWWritingPanel /> ✅ BUILT
     │  └─ Textarea for 150-300 word explanation
     │
     ├─ <ConfidenceLevelSelector /> ✅ BUILT
     │  └─ Radio buttons: High/Moderate/Limited
     │
     ├─ <VerdictSelector /> ✅ BUILT
     │  └─ Radio buttons: Confirm/Correct/Escalate
     │
     ├─ <CorrectionInput /> ✅ BUILT
     │  └─ Textarea (visible only if verdict='correct')
     │
     ├─ <InternalNotesPanel /> (to build)
     │  └─ Textarea for moderator notes
     │
     └─ <SubmitButton /> (to build)
        └─ Validates all fields and saves to database
```

---

## 📊 Data Flow Through Components

### Input State Management (In RefactoredIngredientValidationPanel)

```typescript
const [formState, setFormState] = useState({
  // Step 1: Observation (read-only, loaded from props)
  aiClaimSummary: string;
  aiRole: string;
  aiSafetyLevel: string;
  aiExplanation: string;
  
  // Step 2: Evidence
  citations: Citation[];
  
  // Step 3: Writing
  publicExplanation: string;
  
  // Step 4: Confidence
  confidenceLevel: 'High' | 'Moderate' | 'Limited';
  
  // Step 5: Verdict
  verdict: 'confirm' | 'correct' | 'escalate';
  
  // Step 5b: Correction (if verdict='correct')
  correction: string;
  
  // Internal Notes
  internalNotes: string;
  
  // Escalation (auto-set if verdict='escalate')
  isEscalated: boolean;
  escalationReason: string;
});
```

### Data Binding Example

```tsx
// Component receives state updaters
<OEWEvidencePanel
  citations={formState.citations}
  onCitationsChange={(citations) => 
    setFormState(prev => ({ ...prev, citations }))
  }
  ingredientName={ingredientName}
/>

<OEWWritingPanel
  value={formState.publicExplanation}
  onChange={(value) => 
    setFormState(prev => ({ ...prev, publicExplanation: value }))
  }
  ingredientName={ingredientName}
/>

<ConfidenceLevelSelector
  value={formState.confidenceLevel}
  onChange={(level) => 
    setFormState(prev => ({ ...prev, confidenceLevel: level }))
  }
  evidenceCount={formState.citations.length}
/>

<VerdictSelector
  value={formState.verdict}
  onChange={(v) => 
    setFormState(prev => ({ ...prev, verdict: v }))
  }
/>

<CorrectionInput
  value={formState.correction}
  onChange={(value) => 
    setFormState(prev => ({ ...prev, correction: value }))
  }
  isVisible={formState.verdict === 'correct'}
/>
```

---

## 💾 Save Logic (Pseudo-code)

```typescript
const handleSaveValidation = async () => {
  // 1. Validate all required fields
  if (!formState.citations.length) {
    toast.error("Minimum 1 citation required");
    return;
  }
  if (!formState.publicExplanation) {
    toast.error("Public explanation required");
    return;
  }
  if (!formState.confidenceLevel) {
    toast.error("Confidence level required");
    return;
  }
  if (!formState.verdict) {
    toast.error("Verdict required");
    return;
  }
  if (formState.verdict === 'correct' && !formState.correction) {
    toast.error("Correction details required");
    return;
  }

  // 2. Prepare validation record
  const validationRecord = {
    analysis_id: analysisId,
    ingredient_name: ingredientName,
    validator_id: userId,
    validator_institution: institution,
    
    // OEW Data
    ai_claim_summary: formState.aiClaimSummary,
    public_explanation: formState.publicExplanation,
    confidence_level: formState.confidenceLevel,
    verdict: formState.verdict,
    correction_if_any: formState.verdict === 'correct' ? formState.correction : null,
    internal_notes: formState.internalNotes,
    
    // Escalation
    is_escalated: formState.verdict === 'escalate',
    escalation_reason: formState.verdict === 'escalate' ? formState.internalNotes : null,
    moderator_review_status: formState.verdict === 'escalate' ? 'pending' : 'approved',
    
    // Legacy fields
    validation_status: 'validated',
    reference_sources: formState.citations.map(c => c.doi_or_pmid)
  };

  // 3. Save main validation record
  const { data: validation, error } = await supabase
    .from('ingredient_validations')
    .upsert(validationRecord, {
      onConflict: 'analysis_id,ingredient_name,validator_id'
    });

  if (error) throw error;

  // 4. Save citations (many-to-one relationship)
  const citationRecords = formState.citations.map(citation => ({
    validation_id: validation.id,
    citation_type: citation.type,
    title: citation.title,
    authors: citation.authors,
    journal_name: citation.journal_name,
    publication_year: citation.publication_year,
    doi_or_pmid: citation.doi_or_pmid,
    source_url: citation.source_url
  }));

  // Delete old citations first
  await supabase
    .from('ingredient_validation_citations')
    .delete()
    .eq('validation_id', validation.id);

  // Insert new citations
  const { error: citationError } = await supabase
    .from('ingredient_validation_citations')
    .insert(citationRecords);

  if (citationError) throw citationError;

  // 5. Success feedback
  toast.success('Validation saved!');
  if (formState.verdict === 'escalate') {
    toast.info('Escalated to moderator for review');
  }
  
  // 6. Move to next ingredient or return
  onValidationComplete();
};
```

---

## 🎯 Step-by-Step User Journey

### User starts validation:
```
1. Click "Validate" on product
   ↓
2. See IngredientValidationQueue (next ingredient loaded)
   ↓
3. STEP 1: OEWObservationPanel
   - Read AI claim
   - See role classification
   - See safety level
   - Understand what needs verification
   ↓
4. STEP 2: OEWEvidencePanel
   - Search for peer-reviewed sources
   - Use CitationForm to add each source
   - See CitationList showing added sources
   - Minimum 1 required
   ↓
5. STEP 3: OEWWritingPanel
   - Write 150-300 word explanation
   - Plain language (no jargon)
   - Follow suggested structure
   - See word count feedback
   ↓
6. STEP 4: ConfidenceLevelSelector
   - Based on evidence quality
   - Choose High/Moderate/Limited
   - See examples and indicators
   ↓
7. STEP 5: VerdictSelector
   - Confirm (AI was right)
   - Correct (AI needs changes)
   - Escalate (evidence unclear)
   ↓
8. IF CORRECT: CorrectionInput
   - Specify what needs changing
   - Cite which study contradicts
   - Explain the nuance
   ↓
9. InternalNotesPanel (if needed)
   - Add notes for moderator review
   ↓
10. SubmitButton
    - Validates all required fields
    - Saves to ingredient_validations + ingredient_validation_citations
    - Shows success message
    - Moves to next ingredient
    ↓
11. If escalated: Shows in moderator queue
```

---

## 📝 Required New Components to Build

### 1. InternalNotesPanel.tsx (Simple)
```tsx
interface InternalNotesProps {
  value: string;
  onChange: (value: string) => void;
}

// Just a textarea + label for moderator-visible notes
// Not required, optional for complex cases
```

### 2. ReviewerAccuracyCard.tsx (Stats Display)
```tsx
interface ReviewerAccuracyCardProps {
  userId: string;
}

// Query reviewer_stats view
// Display:
// - Validations completed
// - Accuracy percentage
// - Confidence distribution (High/Moderate/Limited counts)
// - Approval rate
// - Institution name
```

### 3. Refactored IngredientValidationPanel.tsx
```tsx
// Replace entire component with:
// - State management for OEW workflow
// - Embed all 8 OEW components
// - Handle save logic
// - Progress indicator
// - Validation of all fields
```

---

## 🔄 Component Reusability

These components can be reused:
- **CitationForm/CitationList:** For any peer-review task
- **OEWWritingPanel:** For any long-form text input
- **ConfidenceLevelSelector:** For confidence assessment anywhere
- **VerdictSelector:** For decision-making workflows

---

## 🧪 Testing Checklist

- [ ] OEWObservationPanel displays all data correctly
- [ ] CitationForm validates DOI/PMID format
- [ ] CitationForm validates URL format
- [ ] CitationList shows/removes citations
- [ ] OEWEvidencePanel minimum citation warning works
- [ ] OEWWritingPanel word count updates in real-time
- [ ] OEWWritingPanel shows 150-300 word indicators
- [ ] ConfidenceLevelSelector updates on selection
- [ ] VerdictSelector shows decision tree
- [ ] CorrectionInput appears only when verdict='correct'
- [ ] CorrectionInput hides when verdict changes to confirm/escalate
- [ ] All form validation works
- [ ] Save button properly formats data
- [ ] Citations save to database correctly
- [ ] Escalations go to moderator queue
- [ ] All error messages display clearly

---

## 📦 Component Imports (For New Refactored Panel)

```tsx
import { OEWObservationPanel } from '@/components/reviewer/OEWObservationPanel';
import { OEWEvidencePanel } from '@/components/reviewer/OEWEvidencePanel';
import { OEWWritingPanel } from '@/components/reviewer/OEWWritingPanel';
import { ConfidenceLevelSelector } from '@/components/reviewer/ConfidenceLevelSelector';
import { VerdictSelector } from '@/components/reviewer/VerdictSelector';
import { CorrectionInput } from '@/components/reviewer/CorrectionInput';
import type { Citation } from '@/components/reviewer/CitationForm';
```

---

## ⚡ Next Immediate Actions

1. **Create InternalNotesPanel.tsx** (30 min)
   - Simple textarea with label
   - Optional notes for moderators
   
2. **Create ReviewerAccuracyCard.tsx** (45 min)
   - Query reviewer_stats view
   - Display stats and accuracy
   
3. **Refactor IngredientValidationPanel.tsx** (2-3 hours)
   - Replace old yes/no validation
   - Integrate all 8 OEW components
   - Add form state management
   - Add save logic to database
   - Add validation logic
   
4. **Update StudentReviewer.tsx** (1 hour)
   - Pass new props to refactored panel
   - Add ReviewerAccuracyCard at top
   - Update completion handlers
   
5. **Test complete workflow** (1-2 hours)
   - Create test validations
   - Test escalation workflow
   - Verify database saving
   - Test moderator queue view

---

## 🎉 End Result

A complete, production-ready OEW workflow that:
- ✅ Guides reviewers through 6 non-negotiable steps
- ✅ Enforces peer-reviewed citations
- ✅ Produces consumer-friendly explanations
- ✅ Captures professional judgement (confidence + verdict)
- ✅ Handles corrections and escalations
- ✅ Integrates with database
- ✅ Provides educational guidance throughout
- ✅ Tracks reviewer accuracy and performance

**This is the complete Cosmetic Science Apprentice Reviewer system.**
