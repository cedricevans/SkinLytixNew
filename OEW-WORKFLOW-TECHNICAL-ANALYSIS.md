# OEW Workflow - Technical Architecture & Data Flow

## 🎯 Overview

The StudentReviewer dashboard (`/dashboard/reviewer`) implements the **6-Step OEW (Observation, Evidence, Writing, Confidence, Verdict) Workflow** for ingredient validation. It connects directly to Supabase PostgreSQL database and uses ingredient data from the AI analysis system.

---

## 📊 Page Architecture

### Main Page: `StudentReviewer.tsx`
**Location:** `/src/pages/dashboard/StudentReviewer.tsx`
**Route:** `http://localhost:8081/dashboard/reviewer`

**Purpose:**
- Dashboard for student reviewers to validate product ingredients
- Shows products ready for validation
- Manages access control (requires moderator role or student certification)
- Displays validation statistics

---

## 🔐 Access Control & Authorization

```tsx
// 1. Check User Authentication
const { data: { user } } = await supabase.auth.getUser();

// 2. Check Moderator/Admin Role
const { data: roles } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', user.id);

const hasReviewerRole = roles?.some(r => 
  r.role === 'admin' || r.role === 'moderator'
);

// 3. OR Check Student Certification
const { data: certification } = await supabase
  .from('student_certifications')
  .select('institution, certification_level')
  .eq('user_id', user.id);

// Access granted if: hasReviewerRole OR certification exists
```

**Required Tables:**
- `user_roles` - Admin/moderator designation
- `student_certifications` - Student reviewer credentials

---

## 📦 Data Sources & API Integration

### 1. Products to Validate (Source Data)
```tsx
const { data: analyses } = await supabase
  .from('user_analyses')
  .select('id, product_name, brand, category, epiq_score, ingredients_list, analyzed_at')
  .order('analyzed_at', { ascending: false })
  .limit(50);
```

**Database Table:** `user_analyses`
**Fields Used:**
- `id` - Product ID
- `product_name` - Product name
- `brand` - Brand name
- `category` - Product category
- `epiq_score` - AI-generated quality score
- `ingredients_list` - Comma-separated ingredients
- `analyzed_at` - When product was analyzed

**Data Source:** Populated by Edge Function `/analyze-product` when users scan products in `/upload`

---

### 2. Ingredient Cache (AI Data)
```tsx
const { data: cacheData } = await supabase
  .from('ingredient_cache')
  .select('*')
  .in('ingredient_name', ingredients.map(i => i.toLowerCase()));
```

**Database Table:** `ingredient_cache`
**Fields:**
- `ingredient_name` - Ingredient name (lowercase)
- `pubchem_cid` - PubChem chemical ID
- `molecular_weight` - Molecular weight
- `properties_json` - JSON properties from PubChem API

**Data Source:** Populated by Edge Function `/query-pubchem` which queries the PubChem API for ingredient data

---

### 3. Ingredient Validations (OEW Workflow Data)
```tsx
const { data: validations } = await supabase
  .from('ingredient_validations')
  .select('*')
  .eq('analysis_id', product.id)
  .eq('validator_id', userId);
```

**Database Table:** `ingredient_validations`
**OEW Workflow Fields:**
- `ai_claim_summary` (Step 1) - AI's ingredient claim
- `public_explanation` (Step 3) - Reviewer's written analysis (150-300 words)
- `confidence_level` (Step 4) - High/Moderate/Limited
- `verdict` (Step 5) - confirm/correct/escalate
- `internal_notes` (Step 6) - Optional reviewer notes

**Additional Fields:**
- `pubchem_cid_verified` - Is PubChem data correct?
- `corrected_role` - If correcting, what's the correct role?
- `corrected_safety_level` - If correcting safety assessment
- `correction_notes` - Explanation of correction
- `is_escalated` - Flagged for higher review?
- `escalation_reason` - Why escalated?
- `moderator_review_status` - pending/approved/rejected

---

### 4. Citation Evidence (Step 2 Data)
```tsx
const { data: citations } = await supabase
  .from('ingredient_validation_citations')
  .select('*')
  .eq('validation_id', validationId);
```

**Database Table:** `ingredient_validation_citations`
**Fields:**
- `validation_id` - FK to ingredient_validations
- `citation_type` - journal/pubmed/scientific/other
- `title` - Citation title
- `authors` - Author list
- `journal_name` - Journal name
- `publication_year` - Year published
- `doi_or_pmid` - DOI or PubMed ID
- `source_url` - Direct URL to source

**Purpose:** Stores evidence citations for Step 2 of OEW workflow

---

## 🔄 Data Flow: The 6-Step OEW Workflow

### Step 1: **Observation** (Read-Only from AI)
```tsx
// Component: OEWObservationPanel
Displays:
- Ingredient name (from product)
- AI claim summary (from ingredient_validations.ai_claim_summary)
- AI role classification (from analyze-product function)
- AI safety assessment (from recommendations_json)
- PubChem data (from ingredient_cache via pubchem API)
- Molecular weight (from ingredient_cache)
```

**Data Source:** Combination of:
- `ingredient_validations` table
- `ingredient_cache` table (PubChem data)
- Original product analysis data

---

### Step 2: **Evidence** (User Adds Citations)
```tsx
// Component: OEWEvidencePanel + CitationForm
User adds citations with:
- Citation type (journal/pubmed/etc)
- Title
- Authors
- Journal
- Year
- DOI/PMID
- URL

Saves to: ingredient_validation_citations table
Requirement: ≥1 citation required to proceed
```

**Validation:**
- At least 1 citation must be added
- Required fields: type, title, journal, DOI/PMID, URL
- Stores in `ingredient_validation_citations` table

---

### Step 3: **Writing** (Reviewer's Analysis)
```tsx
// Component: OEWWritingPanel
User writes:
- Public explanation of ingredient analysis
- 150-300 words required
- Plain language explanation

Saves to: ingredient_validations.public_explanation
```

**Validation:**
- Minimum 150 words
- Maximum 300 words
- Required before proceeding to Step 4

---

### Step 4: **Confidence Level** (Reviewer's Assessment)
```tsx
// Component: ConfidenceLevelSelector
User selects:
- High (Very confident in verdict)
- Moderate (Reasonably confident)
- Limited (Uncertain, may need escalation)

Saves to: ingredient_validations.confidence_level
```

**Impact:** Used for quality scoring and filtering validations

---

### Step 5: **Verdict** (Final Decision)
```tsx
// Component: VerdictSelector + CorrectionInput
User selects one of three:

1. CONFIRM
   - AI analysis is correct
   - Saves verdict = 'confirm'

2. CORRECT
   - AI analysis has errors
   - Must provide correction
   - Specifies: corrected_role, corrected_safety_level
   - Saves to: ingredient_validations.correction_notes
   - Component: CorrectionInput

3. ESCALATE
   - Uncertainty or complexity
   - Flags for higher-level review
   - Sets is_escalated = true
   - Saves escalation_reason
   - Component: EscalationReasonInput

Saves to: ingredient_validations.verdict
```

---

### Step 6: **Internal Notes** (Optional)
```tsx
// Component: InternalNotesPanel
User can add:
- Private notes for other reviewers
- Max 500 characters
- Not visible to users

Saves to: ingredient_validations.internal_notes
```

---

## 💾 Database Write Operations

### Save Validation (IngredientValidationPanel.tsx)
```tsx
const saveValidation = async () => {
  // 1. Check if validation exists
  const existingValidation = await supabase
    .from('ingredient_validations')
    .select('id')
    .eq('analysis_id', analysisId)
    .eq('ingredient_id', ingredientId);

  // 2. Insert or update ingredient_validations
  const { data: validationData } = await supabase
    .from('ingredient_validations')
    .upsert({
      analysis_id: analysisId,
      ingredient_id: ingredientId,
      validator_id: userId,
      ingredient_name: ingredientName,
      ai_claim_summary: formData.observations.aiClaimSummary,
      public_explanation: formData.publicExplanation,
      confidence_level: formData.confidenceLevel,
      verdict: formData.verdict,
      corrected_role: formData.correction?.role,
      corrected_safety_level: formData.correction?.safety,
      correction_notes: formData.correction?.notes,
      internal_notes: formData.internalNotes,
      is_escalated: formData.verdict === 'escalate',
      escalation_reason: formData.escalationReason,
      moderator_review_status: 'pending'
    }, { onConflict: 'analysis_id,ingredient_id' });

  // 3. Save citations (from Step 2)
  for (const citation of formData.citations) {
    await supabase
      .from('ingredient_validation_citations')
      .insert({
        validation_id: validationData.id,
        citation_type: citation.type,
        title: citation.title,
        authors: citation.authors,
        journal_name: citation.journal,
        publication_year: citation.year,
        doi_or_pmid: citation.doi,
        source_url: citation.url
      });
  }
};
```

---

## 📈 Statistics & Tracking

### ReviewerAccuracyCard (Dashboard Stats)
```tsx
// Component: ReviewerAccuracyCard.tsx
Displays 6 metrics:
1. Total reviews (validations submitted)
2. Confirmed validations
3. Corrections made
4. Escalations flagged
5. Average confidence level
6. Accuracy rate

Query:
SELECT COUNT(*) as total,
       SUM(CASE WHEN verdict='confirm' THEN 1 END) as confirmed,
       SUM(CASE WHEN verdict='correct' THEN 1 END) as corrected,
       SUM(CASE WHEN is_escalated THEN 1 END) as escalated
FROM ingredient_validations
WHERE validator_id = current_user_id
```

---

## 🤖 AI Integration (Where is AI Used?)

### NOT in the OEW Workflow Itself
The 6-step workflow is **manual review** - no AI during the validation process.

### AI Used BEFORE the Workflow (in /upload and /analyze-product)
1. **Ingredient Analysis** - Edge Function `/analyze-product`
   - Uses AI to analyze ingredients
   - Creates `user_analyses` records
   - Generates `epiq_score`

2. **PubChem Data** - Edge Function `/query-pubchem`
   - Fetches chemical data from PubChem API
   - NOT AI, but scientific database

3. **Ingredient Explanations** - Edge Function (if exists)
   - May use AI to explain ingredients
   - Stored in recommendations_json

### AI NOT Used in StudentReviewer
- The workflow is human-driven validation
- Reviewers use their expertise
- They can disagree with AI analysis and mark as "correct"
- AI data is presented for reference only

---

## 🔗 API & Edge Functions Used

### Direct Database Queries (Supabase PostgREST)
- `user_analyses` - Get products to validate
- `ingredient_validations` - Read/write validation data
- `ingredient_validation_citations` - Store evidence citations
- `ingredient_cache` - Get PubChem data
- `user_roles` - Check authorization
- `student_certifications` - Check authorization

### Edge Functions Called (Indirectly)
- `/analyze-product` - Called by Upload page, results shown in StudentReviewer
- `/query-pubchem` - Called by analyze-product, data cached in ingredient_cache

### External APIs Used
- **PubChem API** - Chemical data (called by Edge Function, not directly by page)

---

## ✅ Connection Status

### Database Connections
- ✅ **Supabase PostgreSQL** - CONNECTED
  - `user_analyses` table - ✅ Data available
  - `ingredient_validations` table - ✅ Working
  - `ingredient_validation_citations` table - ✅ Working
  - `ingredient_cache` table - ✅ Data available
  - `user_roles` table - ✅ Authorization working
  - `student_certifications` table - ✅ Authorization working

### API Connections
- ✅ **PubChem API** - Via Edge Function (working if products were scanned)
- ✅ **Supabase Auth** - User authentication working

### Potential Issues
- ⚠️ No products will appear if:
  - No one has scanned products using `/upload` page yet
  - Products exist but user doesn't have moderator role or student certification

---

## 📋 Summary: How It Works

1. **Products Created** → User scans product in `/upload` page
2. **AI Analysis** → `/analyze-product` Edge Function analyzes ingredients
3. **Data Stored** → Results saved in `user_analyses` table
4. **Reviewer Access** → Moderator navigates to `/dashboard/reviewer`
5. **Authorization Check** → System verifies moderator role or certification
6. **Product List** → All scanned products displayed
7. **Ingredient Selection** → Click product → select ingredient
8. **6-Step Workflow** → Complete OEW validation form
9. **Save to Database** → Validation record created
10. **Stats Update** → ReviewerAccuracyCard refetches and updates

---

## 🎯 Is Everything Connected?

| Component | Connected? | Status |
|-----------|-----------|--------|
| Frontend UI | ✅ | Component structure complete |
| Supabase Database | ✅ | All tables set up with proper relationships |
| User Authentication | ✅ | Auth.getUser() working |
| Authorization (Roles) | ✅ | user_roles table checking works |
| Product Data | ⚠️ | Works IF products scanned in /upload |
| PubChem Data | ✅ | Cached via ingredient_cache table |
| Citation Storage | ✅ | ingredient_validation_citations working |
| Statistics | ✅ | ReviewerAccuracyCard querying correctly |
| Save Operations | ✅ | Upsert logic ready |

**Ready to Test?** YES, as long as there are products in the `user_analyses` table!
