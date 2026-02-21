# SkinLytix Cosmetic Science Apprentice Reviewer Workflow
## What We Are Building — Deep Dive

**Last Updated:** February 21, 2026  
**Status:** Implementation Planning  
**Owner:** Product & Cosmetic Science Team

---

## 🎯 Executive Summary

We're building a **6-step peer-review system** where certified apprentices (called "Reviewers") validate AI-generated ingredient claims against peer-reviewed scientific evidence. The workflow ensures all ingredient information is accurate, consumer-safe, and backed by credible sources.

### The Core Problem We're Solving

- **Current state:** AI generates ingredient explanations automatically
- **Issue:** AI claims must be fact-checked by humans with cosmetic science knowledge
- **Solution:** Certified apprentice reviewers validate each claim via structured OEW workflow (Observation → Evidence → Writing)

---

## 🔄 The 6-Step Non-Negotiable Workflow

### **Step 1: Receive Validation Request from Queue**

**What happens:**
1. Reviewer loads next unvalidated ingredient from queue
2. System displays:
   - Ingredient name
   - AI-generated claim (summary + full explanation)
   - AI classification (role, safety level, skin type recommendations)
   - Product context (brand, product name, category)
   - Any previous validation attempts (if exists)

**Reviewer's job:** Read the entire AI claim carefully. Don't skip any part.

**Data structure:**
```typescript
interface ValidationQueueItem {
  analysis_id: string;           // Unique validation request ID
  ingredient_name: string;       // "Salicylic Acid"
  ai_role_classification: string; // "Exfoliant"
  ai_safety_level: string;       // "Generally Safe"
  ai_explanation: string;        // Full AI-generated text (500+ words)
  pubchem_cid: string | null;    // Chemical ID
  molecular_weight: number | null;
  created_at: string;            // When request was added
  previous_validation: ValidationData | null; // Re-validation?
}
```

---

### **Step 2: Verify Against Peer-Reviewed Source (REQUIRED)**

**The 6-Word Rule:** "At least ONE peer-reviewed source required."

**Where to search:**
- ✅ **PubMed.gov** (filter: "Review" or "Systematic Review")
- ✅ **Google Scholar** (scholar.google.com)
- ✅ **CIR Monographs** (cosmetic ingredient review — www.cir-safety.org)
- ✅ **Dermatology Journals:**
  - Journal of Cosmetic Dermatology
  - Dermatologic Clinics
  - Journal of the American Academy of Dermatology
  - British Journal of Dermatology
- ❌ **NOT acceptable:** Influencer blogs, brand websites, Wikipedia, TikTok

**What the reviewer must assess:**
1. Does evidence **confirm** the AI claim exactly?
2. Does evidence **partially contradict** the AI claim (needs nuance)?
3. Does evidence **fully contradict** the AI claim?
4. Is evidence **inconclusive** (conflicting studies)?

**Citation requirements** (minimum 1, more is better):
```typescript
interface Citation {
  type: "peer_reviewed" | "clinical_study" | "systematic_review" | "dermatology_textbook";
  title: string;                    // Full paper title
  authors: string;                  // "Last, F.; Last, F.; et al." format
  journal: string;                  // Journal or textbook name
  year: number;                     // Publication year
  doi_or_pmid: string;              // Either DOI (10.xxxx) OR PMID (PMID:xxxxx)
  url: string;                      // Direct link to source
}
```

**Quality hierarchy** (what counts as "evidence quality"):

| Tier | Type | Strength | Confidence |
|------|------|----------|-----------|
| **Strongest** | Systematic review / Meta-analysis | Multiple studies synthesized | 🟢 High |
| **Strong** | Multiple independent RCTs | Several randomized trials | 🟢 High |
| **Moderate** | Single peer-reviewed RCT | One rigorous study | 🟡 Moderate |
| **Moderate** | Clinical evidence from dermatology clinic | Real-world data | 🟡 Moderate |
| **Weak** | Single case study | Only 1–2 subjects | 🔴 Limited |
| **Weak** | In vitro only (no human studies) | Lab data, no humans | 🔴 Limited |
| **REJECTED** | Influencer reviews, blogs, marketing claims | No scientific basis | ❌ Don't use |

---

### **Step 3: Write Consumer-Friendly Explanation (PUBLIC)**

**The Challenge:** Translate jargon into plain English a high school student can understand.

**Tone requirements:**
- ✅ Plain language (no jargon or define terms before using)
- ✅ Honest about limitations
- ✅ Lead with safety-critical information
- ✅ Mention irritation risks if applicable
- ✅ Include concentration context when relevant
- ❌ No marketing claims or overclaiming

**Recommended structure (5 parts):**

1. **What it is** (2 sentences)
   - Origin, basic definition
   - Example: "Salicylic acid is a beta hydroxy acid (BHA) derived from willow bark and wintergreen."

2. **What it does** (2–3 sentences)
   - Mechanism of action in plain terms
   - Example: "It works by dissolving the sebum and dead skin cells that build up in pores."

3. **Who it's for** (2 sentences)
   - Best skin types and concerns
   - Example: "Best for oily, combination, and acne-prone skin types."

4. **Cautions** (1–2 sentences)
   - Irritation risk, concentration matters, special populations
   - Example: "Can irritate sensitive skin—start low, use 2–3x per week."

5. **Bottom line** (1 sentence)
   - Clear, actionable summary
   - Example: "Proven safe exfoliant for oily skin when used gradually at low-to-moderate concentration."

**Length:** 150–300 words (quality > length)

**Example (Real):**
```
Salicylic acid is a beta hydroxy acid (BHA) derived from willow bark and wintergreen. 
It works by dissolving the sebum and dead skin cells that build up in pores, making it 
especially effective for acne-prone and oily skin types.

This ingredient is best suited for oily, combination, and acne-prone skin. It helps clear 
clogged pores and can reduce breakouts when used regularly at 0.5–2% concentration. 
However, salicylic acid can be irritating—especially for sensitive skin, first-time users, 
or those using other exfoliants (like retinol or AHAs). Start with low concentration and 
use only 2–3 times per week, or less if irritation occurs.

Pregnant or breastfeeding individuals should use cautiously, as systemic absorption is 
possible with high concentrations (>20%).

Bottom line: Salicylic acid is a proven, safe exfoliant for oily and acne-prone skin when 
used at low-to-moderate concentrations and introduced gradually.
```

---

### **Step 4: Assign Confidence Level**

**The 3-Level Scale:**

| Level | Definition | When to Use |
|-------|-----------|------------|
| **🟢 High** | Strong peer-reviewed evidence from multiple sources; AI claim is accurate | Multiple independent studies confirm + systematic reviews + clinical consensus |
| **🟡 Moderate** | Single solid study or clinical evidence; AI claim mostly accurate but nuance missing | One peer-reviewed RCT OR clinical consensus but no conflicting evidence |
| **🔴 Limited** | Weak evidence, conflicting studies, or missing peer-reviewed data; needs escalation | Only anecdotal, single case study, OR conflicting peer-reviewed sources |

**Decision algorithm:**
```
1. Did you find peer-reviewed evidence?
   ├─ NO → Limited (MUST ESCALATE)
   └─ YES → Question 2

2. How many independent sources confirm the AI claim?
   ├─ 0 sources = conflicting → Limited
   ├─ 1 source = single study → Moderate
   └─ 2+ sources = multiple confirmation → High

3. Does evidence QUALITY match the claim?
   ├─ Systematic review/meta-analysis → High
   ├─ RCT or clinical trial → Moderate to High
   ├─ In vitro or animal only → Moderate with caveats
   └─ Single case study → Limited

4. Is the AI claim 100% accurate?
   ├─ YES → Verdict: "confirm"
   ├─ MOSTLY (needs nuance) → Verdict: "correct"
   └─ NO/CONFLICTING → Verdict: "escalate"
```

**Real examples:**

**High Confidence Example:**
```
Ingredient: Hyaluronic Acid
AI Claim: "Humectant that draws water into the skin"

Evidence:
1. Systematic review (J Cosmet Dermatol, 2021): HA increases skin hydration by 30%
2. RCT (Dermatol Res Practice, 2020): 1% HA serum worked in all skin types
3. CIR Monograph: "GRAS (Generally Recognized as Safe)"

→ CONFIDENCE: HIGH
   Reason: 3 credible sources, consistent findings, mechanism confirmed, safety established
```

**Moderate Confidence Example:**
```
Ingredient: Niacinamide
AI Claim: "Reduces sebum production and minimizes pore appearance"

Evidence:
1. RCT (J Am Acad Dermatol, 2006): 5% niacinamide reduced sebum by 25%
2. Limited data on pore size (mostly visual, no histological study)

→ CONFIDENCE: MODERATE
   Reason: Sebum reduction is confirmed by RCT, but pore claims lack strong evidence
   Verdict: CORRECT (revise pore claim to be more cautious)
```

**Limited Confidence Example:**
```
Ingredient: Bakuchiol
AI Claim: "Plant-based retinol alternative with retinol-like benefits"

Evidence:
1. Small RCT (8 subjects): showed improvement vs placebo
2. Conflicting data on efficacy
3. Very new ingredient (limited long-term data)

→ CONFIDENCE: LIMITED
   Reason: Only small single study, newer ingredient, lacks robust clinical evidence
   Verdict: ESCALATE (recommend waiting for larger RCTs before high-confidence claims)
```

---

### **Step 5: Confirm or Correct AI Output (Decision Tree)**

**Three possible verdicts:**

```
┌──────────────────────────────────────────────────┐
│ Does peer-reviewed evidence SUPPORT              │
│ the AI claim exactly as stated?                  │
└──────┬──────────────────────────────────────────┘
       │
       ├─ YES (100% match)
       │  → VERDICT: "confirm"
       │  → Leave all correction fields null
       │  → Mark validation as complete
       │
       ├─ PARTIALLY (claim is mostly right but missing nuance)
       │  → VERDICT: "correct"
       │  → Fill in correction_if_any field with specific change
       │  → Example: "AI said 'humectant' but should be 'humectant + emollient'"
       │
       └─ NO (conflicting or weak evidence)
          → VERDICT: "escalate"
          → Set confidence to Limited
          → Describe what evidence is missing
          → Flag for moderator review
```

**Verdict details:**

| Verdict | Meaning | What to Do | Example |
|---------|---------|-----------|---------|
| `"confirm"` | Evidence fully supports AI claim | Save with no corrections | AI said "BHA exfoliates by breaking down sebum" + study confirms = Confirm |
| `"correct"` | Evidence requires specific correction | Fill `correction_if_any` field | AI overstated pore benefits → provide accurate statement |
| `"escalate"` | Evidence insufficient or conflicting | Set to Limited, describe missing evidence | New ingredient with only 1 small study → Escalate for review |

---

### **Step 6: Save Validation with Citations (Database)**

**The complete submission object:**

```typescript
interface ValidationSubmission {
  // Metadata
  analysis_id: string;              // From the validation queue item
  ingredient_name: string;          // e.g., "Salicylic Acid"
  reviewer_id: string;              // User ID of reviewer
  institution: string;              // Their institution (from certification)
  submitted_at: string;             // ISO 8601 timestamp

  // Reference to AI claim
  ai_claim_summary: string;         // 1–2 sentence summary of what AI said
  
  // Reviewer's verdict & corrections
  verdict: "confirm" | "correct" | "escalate";
  correction_if_any: string | null; // Only filled if verdict = "correct"
  
  // Consumer explanation
  public_explanation: string;       // 150–300 words, plain language
  
  // Confidence & evidence
  confidence: "High" | "Moderate" | "Limited";
  citations: Citation[];            // Array of peer-reviewed sources (min 1)
  
  // Internal review
  notes_for_internal_use: string;   // Why this confidence? What's missing?
}
```

**JSON output format (exact structure):**

```json
{
  "ingredient": "Salicylic Acid",
  "ai_claim_summary": "Beta hydroxy acid that exfoliates by breaking down sebum in pores",
  "verdict": "confirm",
  "correction_if_any": null,
  "public_explanation": "Salicylic acid is a beta hydroxy acid (BHA) derived from willow bark and wintergreen. It works by dissolving the sebum and dead skin cells that build up in pores, making it especially effective for acne-prone and oily skin types. This ingredient is best suited for oily, combination, and acne-prone skin. It helps clear clogged pores and can reduce breakouts when used regularly at 0.5–2% concentration. However, salicylic acid can be irritating—especially for sensitive skin, first-time users, or those using other exfoliants (like retinol or AHAs). Start with low concentration and use only 2–3 times per week, or less if irritation occurs. Pregnant or breastfeeding individuals should use cautiously, as systemic absorption is possible with high concentrations (>20%). Bottom line: Salicylic acid is a proven, safe exfoliant for oily and acne-prone skin when used at low-to-moderate concentrations and introduced gradually.",
  "confidence": "High",
  "citations": [
    {
      "type": "peer_reviewed",
      "title": "Efficacy and safety of salicylic acid chemical peels in darker skin types",
      "authors": "Castillo, D.E.; Obayan, B.O.; Okafor, C.H.",
      "journal": "Journal of Cosmetic Dermatology",
      "year": 2020,
      "doi_or_pmid": "10.1111/jocd.13452",
      "url": "https://doi.org/10.1111/jocd.13452"
    },
    {
      "type": "peer_reviewed",
      "title": "Salicylic acid in acne treatment: a systematic review and meta-analysis",
      "authors": "Del Rosario Hernandez-Blanco, A.; Last, F.",
      "journal": "Dermatologic Clinics",
      "year": 2021,
      "doi_or_pmid": "PMID:34567890",
      "url": "https://pubmed.ncbi.nlm.nih.gov/34567890"
    }
  ],
  "notes_for_internal_use": "Multiple peer-reviewed sources confirm the mechanism and safety profile. AI claim is accurate. No corrections needed. High confidence due to robust clinical evidence and multiple independent studies."
}
```

---

## 🔐 Access Control & Role Requirements

### Who Can Validate?

**Requirements (both must be true):**

1. **User has `moderator` role** in `user_roles` table:
   ```sql
   SELECT role FROM user_roles 
   WHERE user_id = '...' 
   AND role IN ('moderator', 'admin');  -- moderator is the "Reviewer" role
   ```

2. **User has active student certification**:
   ```sql
   SELECT * FROM student_certifications
   WHERE user_id = '...'
   AND certification_level IN ('apprentice', 'associate', 'senior')
   AND active = true;
   ```

**TypeScript access check:**
```typescript
async function checkApprenticeAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<{ hasAccess: boolean; institution?: string; level?: string }> {
  // Must have moderator or admin role
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const hasModeratorRole = roles?.some(r => 
    r.role === 'moderator' || r.role === 'admin'
  );

  // Must have active student certification
  const { data: cert } = await supabase
    .from('student_certifications')
    .select('institution, certification_level, active')
    .eq('user_id', userId)
    .eq('active', true)
    .single();

  return {
    hasAccess: hasModeratorRole && !!cert,
    institution: cert?.institution,
    level: cert?.certification_level
  };
}
```

**Terminology Note:**
- **Database:** Role is called `"moderator"` in enum (for RLS policies)
- **UI/Docs:** Displayed as "Reviewer" (Cosmetic Science Apprentice Reviewer)
- Both refer to the same thing — the validation/review role

---

## ⚠️ Non-Negotiable Rules & Guardrails

### Rule 1: Peer-Reviewed Source Required
- ✅ Accept: PubMed articles, DOI links, clinical studies, CIR monographs
- ❌ Reject: Influencer blogs, brand websites, TikTok, anecdotes, Wikipedia

### Rule 2: No Medical Diagnosis Claims
- ❌ Don't say: "This ingredient **treats** rosacea" or "**cures** acne"
- ✅ Do say: "May **reduce** breakouts" or "**help** oily skin"
- ✅ Do mention: Concentration ranges from peer-reviewed sources
- ❌ Don't give: Prescription or dosage advice

### Rule 3: Pregnancy & Breastfeeding
- ❌ Don't confirm safety without specific evidence
- ✅ Do flag as "Limited" if evidence is missing
- ✅ Do recommend: "Consult dermatologist if concerned"

### Rule 4: Conflict of Interest
- ❌ Don't validate ingredients you have financial interest in
- ✅ Do disclose: Any affiliation with competing brands
- Report to institution/moderator if unsure

---

## 📊 UI Components We Need to Build

### Component Architecture

```
<StudentReviewer> (main page)
  │
  ├─ <ReviewerAccuracyCard />
  │  └─ Shows: validations completed, accuracy %, institution
  │
  ├─ <IngredientValidationQueue />
  │  └─ Displays next unvalidated ingredient from queue
  │     Shows: product context, validation progress (X of Y)
  │
  └─ <OEWWorkflow /> (6-step form)
     │
     ├─ <OEWObservationPanel />
     │  └─ Read-only display of AI claim, role, safety level
     │
     ├─ <OEWEvidencePanel />
     │  ├─ <CitationForm /> (add/edit citations)
     │  │  └─ Inputs: title, authors, journal, DOI/PMID, URL
     │  │
     │  └─ <CitationList /> (show added citations)
     │     └─ Each citation with remove button
     │
     ├─ <OEWWritingPanel />
     │  └─ Textarea for 150–300 word public explanation
     │
     ├─ <ConfidenceLevelSelector />
     │  └─ Radio buttons: High / Moderate / Limited
     │     (with help text for each)
     │
     ├─ <VerdictSelector />
     │  └─ Radio buttons: Confirm / Correct / Escalate
     │
     ├─ <CorrectionInput />
     │  └─ Text area (visible only when verdict = "correct")
     │
     ├─ <InternalNotesPanel />
     │  └─ Text area for moderator review notes
     │
     └─ <ValidationProgressBar />
        └─ Step indicators + Submit button
```

### New Components to Create

| Component | Purpose | Priority | Status |
|-----------|---------|----------|--------|
| **IngredientValidationQueue.tsx** | Display next unvalidated ingredient | 🔴 MVP | Not started |
| **OEWObservationPanel.tsx** | Show AI claim details | 🔴 MVP | Not started |
| **OEWEvidencePanel.tsx** | Citation builder | 🔴 MVP | Not started |
| **OEWWritingPanel.tsx** | Public explanation textarea | 🔴 MVP | Not started |
| **ConfidenceLevelSelector.tsx** | High/Moderate/Limited selector | 🔴 MVP | Not started |
| **VerdictSelector.tsx** | Confirm/Correct/Escalate selector | 🔴 MVP | Not started |
| **CorrectionInput.tsx** | Conditional correction field | 🟡 MVP | Not started |
| **CitationForm.tsx** | Add/edit individual citation | 🔴 MVP | Not started |
| **CitationList.tsx** | Display citations with remove option | 🔴 MVP | Not started |
| **ReviewerAccuracyCard.tsx** | Stats card (completions, accuracy) | 🟢 Phase 2 | Not started |

---

## 💾 Database Schema

### Modified Table: `ingredient_validations`

**New fields to add:**

```sql
ALTER TABLE ingredient_validations ADD COLUMN (
  ai_claim_summary text,                      -- What the AI claimed
  verdict text CHECK (verdict IN ('confirm', 'correct', 'escalate')),
  public_explanation text,                     -- 150–300 word consumer explanation
  confidence_level text CHECK (confidence_level IN ('High', 'Moderate', 'Limited')),
  internal_notes text,                         -- For moderator review
  is_escalated boolean DEFAULT false,
  escalation_reason text,
  moderator_review_status text                 -- pending, approved, rejected
);
```

### New Table: `ingredient_validation_citations`

```sql
CREATE TABLE ingredient_validation_citations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id uuid NOT NULL REFERENCES ingredient_validations(id) ON DELETE CASCADE,
  citation_type text CHECK (citation_type IN ('peer_reviewed', 'clinical_study', 'systematic_review', 'dermatology_textbook')),
  title text NOT NULL,
  authors text NOT NULL,
  journal_name text NOT NULL,
  publication_year integer,
  doi_or_pmid text NOT NULL,
  source_url text,
  created_at timestamp DEFAULT now(),
  
  UNIQUE(validation_id, doi_or_pmid)
);
```

### New View: `ingredient_validation_queue`

```sql
CREATE VIEW ingredient_validation_queue AS
SELECT 
  ua.id as analysis_id,
  ia.ingredient_name,
  ia.ai_role_classification,
  ia.ai_safety_level,
  ia.ai_explanation,
  ia.pubchem_cid,
  ia.molecular_weight,
  ua.created_at,
  CASE WHEN iv.id IS NOT NULL THEN iv.* ELSE NULL END as previous_validation
FROM user_analyses ua
JOIN ingredient_analyses ia ON ua.id = ia.analysis_id
LEFT JOIN ingredient_validations iv ON ia.id = iv.analysis_id
WHERE iv.id IS NULL  -- Only unvalidated ingredients
ORDER BY ua.created_at ASC;
```

---

## 🚀 Implementation Phases

### Phase 1: MVP (Core Workflow)
- [x] Database schema (tables + enums)
- [ ] IngredientValidationQueue component
- [ ] OEW workflow components (6-step form)
- [ ] Citation builder form
- [ ] Edge functions (validate-ingredient, get-validation-queue)
- [ ] Role gating (check apprentice access)

### Phase 2: Enhanced Validation
- [ ] Confidence scoring algorithm
- [ ] Citation quality checker
- [ ] Accuracy metrics dashboard
- [ ] Escalation workflow

### Phase 3: Advanced Features
- [ ] Ingredient research library
- [ ] Peer review system (moderator feedback)
- [ ] Certification progression system

---

## 📝 Summary: What This Means

**The 6-step workflow ensures:**
1. ✅ Every ingredient claim is checked against science
2. ✅ Evidence is peer-reviewed (not influencer blogs)
3. ✅ Explanations are consumer-friendly (plain language)
4. ✅ Confidence is honest (High/Moderate/Limited)
5. ✅ Corrections are tracked (Confirm/Correct/Escalate)
6. ✅ Everything is documented for moderator review

**In one sentence:**
> A certified apprentice reads the AI's ingredient claim, finds peer-reviewed evidence to support or correct it, writes a plain-language explanation for consumers, rates their confidence level, submits their verdict (confirm/correct/escalate), and saves everything with citations for audit.

---

## 🔗 Related Documentation

- `docs/features/Cosmetic-Science-Apprentice-Summary.md` — Implementation overview
- `docs/features/Cosmetic-Science-Apprentice-Implementation-Checklist.md` — Detailed tasks
- `docs/features/Cosmetic-Science-Apprentice-Workflow.md` — Full specification (1,069 lines)
