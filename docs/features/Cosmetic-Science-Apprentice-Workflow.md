# Cosmetic Science Apprentice Reviewer Workflow

**Document Version:** 1.0  
**Last Updated:** February 21, 2026  
**Owner:** Product & Cosmetic Science Team  
**Status:** Implementation Guide

---

## Table of Contents

1. [Workflow Overview](#workflow-overview)
2. [OEW Framework (Observation, Evidence, Writing)](#oew-framework)
3. [Reviewer Role & Access Control](#reviewer-role--access-control)
4. [Workflow Steps (Non-Negotiable)](#workflow-steps-non-negotiable)
5. [JSON Output Format](#json-output-format)
6. [Validation Rules & Guardrails](#validation-rules--guardrails)
7. [Evidence & Citations](#evidence--citations)
8. [Reviewer Voice & Tone](#reviewer-voice--tone)
9. [Confidence Assessment Matrix](#confidence-assessment-matrix)
10. [Implementation Checklist](#implementation-checklist)
11. [UI Component Mapping](#ui-component-mapping)
12. [Database Schema Requirements](#database-schema-requirements)

---

## Workflow Overview

### Purpose

The Cosmetic Science Apprentice Reviewer is a certified student contributor within the Reviewer Dashboard. Their role is to validate AI-generated ingredient claims through evidence-based peer-reviewed research, ensuring accuracy and consumer safety.

### Key Goals

- ✅ Verify AI-generated ingredient claims against peer-reviewed sources
- ✅ Correct AI output when evidence contradicts the AI claim
- ✅ Provide transparent, consumer-friendly explanations
- ✅ Maintain high evidence standards (peer-reviewed journals, clinical studies)
- ✅ Flag weak evidence or conflicting research for escalation

### Work Unit

**One ingredient validation request** = One complete OEW workflow

### Access Requirements

- ✅ User has `moderator` role in `user_roles` table
- ✅ User has active `student_certifications` record
- ✅ Certification level: "apprentice" or higher
- ✅ Associated institution exists

---

## OEW Framework

### Observation (O)

**What you observe from the AI:**

1. **AI Generated Claim Summary** - The specific ingredient claim being validated
   - Example: "Salicylic acid is a beta hydroxy acid that exfoliates by breaking down sebum"
   
2. **AI Explanation** - Full AI-generated text explanation
   
3. **AI Classification** (from original analysis):
   - Ingredient role/function
   - Safety level (if assigned)
   - Recommended skin types
   - Concentration context

### Evidence (E)

**What you find in peer-reviewed sources:**

1. **Source Verification** (minimum 1 required per submission)
   - PubMed article with PMID
   - Journal with DOI
   - Systematic review
   - Clinical study
   - Reputable dermatology textbook
   
2. **Evidence Quality Assessment**:
   - ✅ **Strong**: Multiple independent studies, meta-analyses, systematic reviews
   - ⚠️ **Moderate**: Single peer-reviewed study, clinical evidence
   - ❌ **Limited**: Anecdotal, single case studies, manufacturer claims only
   
3. **Comparison to AI Claim**:
   - Does evidence **confirm** the AI claim?
   - Does evidence **contradict** the AI claim?
   - Is evidence **inconclusive** (conflicting studies)?

### Writing (W)

**How you communicate findings:**

1. **Public Consumer Explanation** (150-300 words)
   - Plain language (no jargon or technical terms)
   - Explain what the ingredient does
   - Note skin type considerations
   - Highlight irritation risk if applicable
   - Include concentration context if relevant
   - Lead with the most important safety information
   
2. **Verdict Statement** (5-15 words)
   - Confirm AI output
   - Correct specific AI errors
   - Flag for escalation if needed
   
3. **Internal Notes** (for moderators)
   - Why you chose this confidence level
   - What evidence was missing
   - Reasoning for any correction

---

## Reviewer Role & Access Control

### Database Requirements

```sql
-- Reviewers must have BOTH of these records:

-- 1. User must have moderator or admin role
SELECT * FROM user_roles
WHERE user_id = '...'
AND role IN ('moderator', 'admin');

-- 2. User must have student certification
SELECT * FROM student_certifications
WHERE user_id = '...'
AND certification_level IN ('apprentice', 'associate', 'senior')
AND active = true;
```

### Access Check Code (TypeScript)

```typescript
export async function checkApprenticeAccess(
  supabase: SupabaseClient,
  userId: string
): Promise<{ hasAccess: boolean; institution?: string; level?: string }> {
  // Check user_roles
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);

  const hasModeratorRole = roles?.some(r => 
    r.role === 'moderator' || r.role === 'admin'
  );

  // Check student_certifications
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

---

## Workflow Steps (Non-Negotiable)

### Step 1: Receive Validation Request from Queue

**System Action:**
- Display next unvalidated ingredient from `ingredient_validations` queue
- Show: ingredient name, AI claim, AI safety level, product context
- Load any previous validation attempts (if exists)

**Reviewer Action:**
- ✅ Read entire AI claim and explanation (do not skip)
- ✅ Note the AI's classification (role, safety level, skin type recommendations)

**Data Model:**
```typescript
interface ValidationQueueItem {
  analysis_id: string;
  ingredient_name: string;
  ai_role_classification: string;
  ai_safety_level: string;
  ai_explanation: string;
  pubchem_cid: string | null;
  molecular_weight: number | null;
  created_at: string;
  previous_validation: IngredientValidation | null;
}
```

---

### Step 2: Verify Against Peer-Reviewed Source (REQUIRED)

**Reviewer Action:**

1. Search for ingredient in **at least one** of these sources:
   - **PubMed.gov** (filter: "Review" or "Systematic Review" for stronger evidence)
   - **Google Scholar** (scholar.google.com)
   - **Dermatology journals**: Journal of Cosmetic Dermatology, Dermatologic Clinics
   - **CIR monographs** (cosmetic ingredient review)
   - **EWG Skin Deep** (for safety compilation of multiple sources)

2. Document findings:
   - ✅ Does evidence **support** the AI claim?
   - ⚠️ Does evidence **partially contradict** the AI claim?
   - ❌ Does evidence **fully contradict** the AI claim?
   - ❓ Is evidence **inconclusive** (conflicting studies)?

3. If evidence is **weak or missing**:
   - Set confidence to `"Limited"`
   - Mark as `"escalate"` in verdict
   - Document what evidence would strengthen the claim

**Required Citation Fields:**
```typescript
interface Citation {
  type: "peer_reviewed" | "clinical_study" | "systematic_review" | "dermatology_textbook";
  title: string;
  authors: string; // "Last, F.; Last, F.; et al."
  journal: string; // Or "textbook name" for books
  year: number;
  doi_or_pmid: string; // Either DOI or PubMed ID
  url: string; // Full link to source
}
```

---

### Step 3: Write Consumer-Friendly Explanation (PUBLIC)

**Tone & Voice Requirements:**
- ✅ Plain language (high school reading level)
- ✅ No marketing claims or overclaiming
- ✅ Transparent about limitations
- ✅ Mention irritation risk or cautions
- ✅ Include concentration/context when relevant
- ✅ Lead with safety-critical information

**Structure (recommended):**
1. **What it is** (2 sentences): What is this ingredient and where does it come from?
2. **What it does** (2-3 sentences): How does it work on skin? What's the mechanism?
3. **Who it's for** (2 sentences): Best skin types, concerns it addresses
4. **Cautions** (1-2 sentences): Irritation risk, contraindications, concentration matters
5. **Bottom line** (1 sentence): Summary recommendation

**Example (Salicylic Acid):**
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

**Length:** 150–300 words (aim for clarity, not length)

---

### Step 4: Assign Confidence Level

**Confidence Matrix:**

| Level | Definition | When to Use | Example |
|-------|------------|------------|---------|
| **High** | ✅ Strong peer-reviewed evidence from multiple sources; AI claim is accurate | - Multiple independent studies support the claim<br>- Systematic reviews confirm mechanism<br>- Clinical evidence is robust | Salicylic acid for acne; retinol for wrinkles |
| **Moderate** | ⚠️ Single solid study or clinical evidence; AI claim is mostly accurate but nuance missing | - One peer-reviewed study confirms claim<br>- Clinical consensus supports it<br>- No contradicting evidence found | Niacinamide for pore appearance; hyaluronic acid for hydration |
| **Limited** | ❌ Weak evidence, conflicting studies, or missing peer-reviewed data; needs escalation | - Only anecdotal evidence available<br>- Single case study, no RCT<br>- Manufacturer claims only<br>- Conflicting peer-reviewed sources | Proprietary "complexes" with no published research; very new ingredients |

**Assigning Confidence:**

```typescript
type ConfidenceLevel = "High" | "Moderate" | "Limited";

function assignConfidence(
  evidenceCount: number,        // Number of peer-reviewed sources
  evidenceQuality: "strong" | "moderate" | "weak",
  conflictingEvidence: boolean,
  aiClaimAccuracy: "accurate" | "partial" | "incorrect"
): ConfidenceLevel {
  // High: Multiple strong sources + accurate AI claim
  if (evidenceCount >= 2 && evidenceQuality === "strong" && !conflictingEvidence) {
    return "High";
  }

  // Moderate: Single study + accurate or minor correction needed
  if (evidenceCount === 1 && evidenceQuality !== "weak" && !conflictingEvidence) {
    return "Moderate";
  }

  // Limited: Weak evidence, conflicting, or missing data
  return "Limited";
}
```

---

### Step 5: Confirm or Correct AI Output

**Decision Tree:**

```
┌─────────────────────────────────────────┐
│ Does peer-reviewed evidence SUPPORT     │
│ the AI claim exactly as stated?         │
└──────┬──────────────────────────────────┘
       │
       ├─ YES (100% match) → VERDICT: "confirm"
       │                     Go to Step 6 with no corrections
       │
       ├─ PARTIALLY (claim is mostly right but missing nuance)
       │  → VERDICT: "correct"
       │    Provide specific correction
       │    Example: "AI said 'humectant' but should be 'humectant + 
       │             emollient' at this concentration"
       │
       └─ NO (conflicting or weak evidence)
          → VERDICT: "escalate"
             Describe what evidence is missing
             Recommend what would confirm the claim
```

### Verdict Options

| Verdict | Meaning | What to Do |
|---------|---------|-----------|
| `"confirm"` | Evidence fully supports AI claim | Set all correction fields to null. Save validation as `validated` |
| `"correct"` | Evidence requires a correction | Fill in `correction_if_any` field with specific change needed |
| `"escalate"` | Evidence is insufficient or conflicting | Set confidence to `"Limited"`. Describe missing evidence in notes_for_internal_use |

---

### Step 6: Save Validation with Citations (Database)

**Required Fields (all must be filled):**

```typescript
interface ValidationSubmission {
  // Metadata
  analysis_id: string;
  ingredient_name: string;
  reviewer_id: string;
  institution: string;
  submitted_at: string; // ISO 8601 timestamp

  // AI Claim Reference
  ai_claim_summary: string; // Brief summary of what AI said
  
  // Reviewer Verdict
  verdict: "confirm" | "correct" | "escalate";
  correction_if_any: string; // Only fill if verdict is "correct"
  
  // Consumer Explanation
  public_explanation: string; // 150–300 word plain language explanation
  
  // Confidence
  confidence: "High" | "Moderate" | "Limited";
  
  // Evidence
  citations: Citation[]; // Array of peer-reviewed sources
  
  // Internal Notes
  notes_for_internal_use: string; // Why this confidence level? What's missing?
}
```

---

## JSON Output Format

**Every validation submission must return exactly this JSON structure:**

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

**Schema Notes:**
- `ingredient`: String (exact name from analysis)
- `ai_claim_summary`: String (1-2 sentences of what AI said)
- `verdict`: One of `"confirm"`, `"correct"`, `"escalate"`
- `correction_if_any`: String if verdict is "correct", null otherwise
- `public_explanation`: String, 150–300 words, plain language
- `confidence`: One of `"High"`, `"Moderate"`, `"Limited"`
- `citations`: Array of citation objects (minimum 1)
  - `type`: One of `"peer_reviewed"`, `"clinical_study"`, `"systematic_review"`, `"dermatology_textbook"`
  - `doi_or_pmid`: Include DOI (10.xxxx) OR PubMed ID (PMID:xxxxx)
- `notes_for_internal_use`: String explaining confidence and any escalation reasons

---

## Validation Rules & Guardrails

### Non-Negotiable Rules

1. **Peer-Reviewed Source Required**
   - ❌ Do NOT accept manufacturer claims as evidence
   - ❌ Do NOT accept beauty influencer anecdotes
   - ✅ DO require PubMed, DOI, or journal citations
   - ✅ DO accept clinical studies from dermatology clinics
   - ✅ DO accept CIR monographs (peer-reviewed by expert panel)

2. **No Medical Diagnosis or Treatment Claims**
   - ❌ Do NOT say an ingredient "treats" rosacea, eczema, psoriasis, acne (medical condition)
   - ✅ DO say it may "reduce breakouts" or "help oily skin" (cosmetic benefit)
   - ❌ Do NOT recommend dosage or prescription advice
   - ✅ DO mention concentration ranges from peer-reviewed sources

3. **Pregnancy & Breastfeeding**
   - ❌ Do NOT confirm safety in pregnancy/breastfeeding without specific evidence
   - ✅ DO flag as "Limited" confidence if evidence is missing
   - ✅ DO recommend consulting a dermatologist if concerned

4. **Conflict of Interest**
   - ❌ Do NOT validate ingredients you have financial interest in
   - ✅ DO disclose if you're affiliated with a competing brand
   - Report to institution/moderator if unsure

### Evidence Quality Hierarchy

**Tier 1 - Strongest (accept for "High" confidence):**
1. Systematic reviews or meta-analyses
2. Multiple independent RCTs (randomized controlled trials)
3. CIR expert panel monograph

**Tier 2 - Moderate (accept for "Moderate" confidence):**
1. Single peer-reviewed RCT
2. Clinical study from reputable dermatology clinic
3. Multiple in vitro studies with consistent mechanism

**Tier 3 - Weak (only with "Limited" confidence + escalation):**
1. Single case study
2. In vitro only (no human studies)
3. Manufacturer-funded study without independent replication
4. Anecdotal reports in forums

**NOT ACCEPTABLE (reject entirely):**
- ❌ Influencer reviews
- ❌ Blog posts (even if well-written)
- ❌ Manufacturer marketing claims
- ❌ Wikipedia or unvetted websites

---

## Evidence & Citations

### Finding Peer-Reviewed Sources

**Step 1: Search PubMed**
- Go to **pubmed.ncbi.nlm.nih.gov**
- Search: `[ingredient name] cosmetic dermatology`
- Filter: "Review" articles for systematic reviews
- Copy PubMed ID (PMID) from URL

**Step 2: Search Google Scholar**
- Go to **scholar.google.com**
- Search: `[ingredient name] cosmetic skin safety`
- Look for PDFs or DOI links
- Filter by recent years (last 5–10 years for established ingredients)

**Step 3: Search CIR Monographs**
- Go to **www.cir-safety.org**
- Search ingredient by name
- Read expert panel conclusion
- Document with CIR reference

**Step 4: Check Dermatology Journal Websites**
- Journal of Cosmetic Dermatology
- Dermatologic Clinics
- Journal of the American Academy of Dermatology
- British Journal of Dermatology

### Citation Format Requirements

```typescript
interface Citation {
  // Type of source (required)
  type: "peer_reviewed" | "clinical_study" | "systematic_review" | "dermatology_textbook";
  
  // Paper/article details (required)
  title: string;        // Full title of paper
  authors: string;      // "Last, F.; Last, F.; et al." format
  journal: string;      // "Journal of Cosmetic Dermatology" or textbook name
  year: number;         // Publication year (4-digit)
  
  // Unique identifier (required - choose one)
  doi_or_pmid: string;  // "10.1111/jocd.13452" OR "PMID:34567890"
  
  // Direct link (required)
  url: string;          // Full URL to source (pubmed.ncbi.nlm.nih.gov or doi.org link)
}
```

**Example Citations:**

```json
[
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
    "type": "systematic_review",
    "title": "Retinoids in the treatment of photoaging: a systematic review",
    "authors": "Smith, J.A.; Johnson, M.B.; et al.",
    "journal": "American Journal of Clinical Dermatology",
    "year": 2022,
    "doi_or_pmid": "10.1007/s40257-022-00678-z",
    "url": "https://doi.org/10.1007/s40257-022-00678-z"
  },
  {
    "type": "dermatology_textbook",
    "title": "Dermatology Essentials",
    "authors": "Goldman, M.P.; Fitzpatrick, R.E.",
    "journal": "Cosmetic Dermatology Textbook",
    "year": 2019,
    "doi_or_pmid": "ISBN:978-0-323-65125-4",
    "url": "https://www.elsevier.com/books/dermatology-essentials/goldman/978-0-323-65125-4"
  }
]
```

---

## Reviewer Voice & Tone

### Core Principles

✅ **Be Clear**
- Use short sentences
- Define any technical terms before using them
- Lead with the most important information

✅ **Be Honest**
- Acknowledge limitations in evidence
- Don't overclaim safety or efficacy
- Mention when research is new or limited

✅ **Be Cautious**
- Highlight irritation risks
- Mention concentration matters
- Note special populations (pregnant, sensitive skin, etc.)

✅ **Be Helpful**
- Provide actionable context (e.g., "start at 2–3x per week")
- Explain why an ingredient is or isn't right for specific skin types
- Give clear bottom-line recommendation

### Voice Examples

**DON'T write this:**
> "Retinol is a powerful anti-aging ingredient that everyone should use. It's completely safe and will transform your skin."

**Write this instead:**
> "Retinol is a vitamin A derivative that's clinically proven to reduce the appearance of fine lines and improve skin texture. It's most effective for mature and combination skin. However, retinol can cause irritation, redness, and peeling—especially in first-time users or those with sensitive skin. Start with a low concentration (0.3%) once or twice weekly and gradually increase frequency as your skin adjusts. Avoid using with other exfoliants (AHAs, BHAs, vitamin C). Do not use during pregnancy without consulting a dermatologist, as high-dose systemic retinoids pose risks. Bottom line: Retinol is a proven anti-aging ingredient when introduced slowly and used consistently."

---

## Confidence Assessment Matrix

### Decision Framework

```
START: Reviewing Ingredient X
│
├─ Question 1: Did you find peer-reviewed evidence?
│  ├─ NO → Set Confidence to "Limited" → ESCALATE
│  │       Explain what evidence is needed
│  │
│  └─ YES → Go to Question 2
│
├─ Question 2: How many independent sources confirmed the AI claim?
│  ├─ 0 sources = conflicting evidence → "Limited" + ESCALATE
│  ├─ 1 source = single study → "Moderate" (if high quality)
│  └─ 2+ sources = multiple confirmation → "High" (if consistent)
│
├─ Question 3: Does the evidence QUALITY match the claim?
│  ├─ Systematic review/meta-analysis → "High"
│  ├─ RCT or clinical trial → "Moderate" to "High"
│  ├─ In vitro or animal studies only → "Moderate" with caveats
│  └─ Single case study → "Limited"
│
└─ Question 4: Is the AI claim 100% accurate?
   ├─ Yes, perfectly stated → VERDICT: "confirm"
   ├─ Mostly right, minor nuance needed → VERDICT: "correct"
   └─ Missing critical context or conflicting → VERDICT: "escalate"
```

### Confidence Examples

**High Confidence Example:**
```
Ingredient: Hyaluronic Acid
AI Claim: "Humectant that draws water into the skin"

Evidence Found:
1. Systematic review (J Cosmet Dermatol, 2021): "HA is effective humectant, increases skin hydration by 30%"
2. RCT (Dermatol Res Practice, 2020): "HA 1% serum increased skin moisture in all skin types"
3. CIR Monograph: "GRAS (Generally Recognized as Safe)"

Verdict: CONFIRM
Confidence: HIGH (3 sources, consistent, mechanism confirmed, safety established)
Notes: Strong evidence for humectant function across all skin types
```

**Moderate Confidence Example:**
```
Ingredient: Niacinamide
AI Claim: "Reduces sebum production and minimizes pore appearance"

Evidence Found:
1. RCT (J Am Acad Dermatol, 2006): "5% niacinamide reduced sebum by 25%"
2. Limited evidence on pore size (mostly visual improvement, no histological study)

Verdict: CORRECT (partially accurate, sebum reduction confirmed but pore size claims overstated)
Confidence: MODERATE (single RCT for sebum, no strong pore size evidence)
Notes: Sebum reduction is well-established, but pore appearance claims need more research
```

**Limited Confidence Example:**
```
Ingredient: Bakuchiol
AI Claim: "Plant-based retinol alternative with retinol-like benefits"

Evidence Found:
1. Small RCT (Cosmetics, 2021): 8 subjects, "improved fine lines vs placebo"
2. Some conflicting studies on efficacy
3. Very new ingredient (limited long-term data)

Verdict: ESCALATE
Confidence: LIMITED (single small study, limited evidence base, newer ingredient)
Notes: While promising, bakuchiol lacks the robust clinical evidence of retinol. 
       Recommend waiting for larger RCTs before high-confidence recommendation. 
       Mark for re-review in 2–3 years as more data emerges.
```

---

## Implementation Checklist

### Phase 1: Core Workflow (MVP)

- [ ] **Database Schema**
  - [ ] Expand `ingredient_validations` table with new fields (see schema section)
  - [ ] Create `ingredient_validation_citations` join table
  - [ ] Add `ingredient_validation_queue` view for reviewer workflow
  - [ ] Add `confidence_level` enum type
  - [ ] Add `verdict_type` enum type

- [ ] **UI Components**
  - [ ] **IngredientValidationPanel.tsx** (EXPAND)
    - [ ] Add "Observation" section displaying AI claim
    - [ ] Add "Evidence" section for researcher to link peer-reviewed sources
    - [ ] Add Citation input form (title, authors, journal, DOI/PMID, URL)
    - [ ] Add "Writing" section for public explanation textarea
    - [ ] Add Confidence level selector (High/Moderate/Limited with radio buttons)
    - [ ] Add Verdict selector (Confirm/Correct/Escalate)
    - [ ] Add Correction field (visible only when verdict = "correct")
    - [ ] Add Internal Notes textarea for moderator review
  
  - [ ] **IngredientValidationQueue.tsx** (NEW)
    - [ ] Display next unvalidated ingredient from queue
    - [ ] Show product context (product name, brand, category)
    - [ ] Show validation progress (X of Y ingredients completed)
    - [ ] Display "Skip" button to defer to next ingredient
    - [ ] Show previous validation attempts (if any)
  
  - [ ] **ValidationProgressBar.tsx** (UPDATE)
    - [ ] Show step indicators: Observation → Evidence → Writing → Confidence → Save
    - [ ] Track completion percentage per ingredient
    - [ ] Show which steps are complete vs. pending
  
  - [ ] **IngredientSourcePanel.tsx** (EXPAND)
    - [ ] Add multi-source citation builder
    - [ ] Add PubMed/DOI link validator
    - [ ] Show citation preview before saving
    - [ ] Add "Add Another Source" button
    - [ ] Show minimum citation requirement (1 required)

- [ ] **Edge Functions**
  - [ ] **validate-ingredient** (NEW)
    - [ ] Accept validation JSON from frontend
    - [ ] Validate all required fields present
    - [ ] Verify user has apprentice role
    - [ ] Check citation URLs are valid
    - [ ] Save to `ingredient_validations` table
    - [ ] Create citation records in `ingredient_validation_citations`
    - [ ] Return 200 OK with validation ID
  
  - [ ] **get-validation-queue** (NEW)
    - [ ] Return next N unvalidated ingredients
    - [ ] Exclude already-validated ingredients
    - [ ] Include product context for each
    - [ ] Filter by institution if multi-tenant
    - [ ] Return with pagination
  
  - [ ] **validate-citation-url** (NEW)
    - [ ] Accept DOI or PMID
    - [ ] Verify URL is accessible
    - [ ] Extract title/authors from PubMed API if available
    - [ ] Return validation status + metadata

- [ ] **Role Gating**
  - [ ] Update `StudentReviewer.tsx` to check for apprentice certification
  - [ ] Show "Access Denied" message if missing role or certification
  - [ ] Display reviewer stats (validations completed, accuracy rating)

### Phase 2: Enhanced Validation (Post-MVP)

- [ ] **Confidence Scoring Algorithm**
  - [ ] Auto-calculate recommended confidence based on evidence count + quality
  - [ ] Show recommendation to reviewer
  - [ ] Allow override with explanation required

- [ ] **Citation Quality Checker**
  - [ ] Flag if citation is from manufacturer (potential bias)
  - [ ] Warn if evidence is >10 years old for new ingredients
  - [ ] Highlight if citation is from CIR (trusted source)

- [ ] **Accuracy Metrics Dashboard**
  - [ ] Track reviewer accuracy (verdicts that were overturned by moderators)
  - [ ] Show reviewer improvement over time
  - [ ] Display most-validated ingredients (leaderboard)

- [ ] **Escalation Workflow**
  - [ ] Send escalated validations to moderator queue
  - [ ] Track escalation reasons (limited evidence, conflicting sources, etc.)
  - [ ] Collect moderator feedback on escalations

### Phase 3: Advanced Features

- [ ] **Ingredient Research Library**
  - [ ] Build searchable database of reviewed ingredients
  - [ ] Show all validations for each ingredient
  - [ ] Display consensus confidence level
  - [ ] Track updates over time (re-review when new evidence emerges)

- [ ] **Peer Review System**
  - [ ] Allow moderators to review apprentice validations
  - [ ] Provide feedback with suggested corrections
  - [ ] Track reviewer calibration (how often do moderators agree?)

- [ ] **Certification Progression**
  - [ ] Unlock "Associate" level after 50 validations with >90% accuracy
  - [ ] Unlock "Senior" level after 200 validations with >95% accuracy
  - [ ] Show progression path in dashboard

---

## UI Component Mapping

### Current Components (Status: Exists)

| Component | File | Current Function | Needs Enhancement |
|-----------|------|------------------|-------------------|
| **IngredientValidationPanel** | `src/components/reviewer/IngredientValidationPanel.tsx` | Basic yes/no checkboxes for AI claim and PubChem accuracy | Yes - needs full OEW workflow |
| **IngredientSourcePanel** | `src/components/reviewer/IngredientSourcePanel.tsx` | Displays reference sources list | Yes - needs citation builder form |
| **ValidationProgressBar** | `src/components/reviewer/ValidationProgressBar.tsx` | Shows validation count | Yes - needs step-by-step progress indicator |
| **StudentReviewer** | `src/pages/dashboard/StudentReviewer.tsx` | Main dashboard, loads products | Yes - needs queue system + workflow integration |

### Required New Components

| Component | Purpose | File Path | Priority |
|-----------|---------|-----------|----------|
| **IngredientValidationQueue** | Display next unvalidated ingredient + load product context | `src/components/reviewer/IngredientValidationQueue.tsx` | 🔴 MVP |
| **OEWObservationPanel** | Show AI claim, role, safety level from analysis | `src/components/reviewer/OEWObservationPanel.tsx` | 🔴 MVP |
| **OEWEvidencePanel** | Citation builder form with DOI/PMID validator | `src/components/reviewer/OEWEvidencePanel.tsx` | 🔴 MVP |
| **OEWWritingPanel** | Public explanation textarea with word count | `src/components/reviewer/OEWWritingPanel.tsx` | 🔴 MVP |
| **ConfidenceLevelSelector** | Radio buttons for High/Moderate/Limited with explanations | `src/components/reviewer/ConfidenceLevelSelector.tsx` | 🔴 MVP |
| **VerdictSelector** | Radio buttons for Confirm/Correct/Escalate | `src/components/reviewer/VerdictSelector.tsx` | 🔴 MVP |
| **CorrectionInput** | Text area for correction details (hidden unless verdict = "correct") | `src/components/reviewer/CorrectionInput.tsx` | 🟡 MVP |
| **CitationForm** | Add/edit individual citation record | `src/components/reviewer/CitationForm.tsx` | 🔴 MVP |
| **CitationList** | Display added citations with remove option | `src/components/reviewer/CitationList.tsx` | 🔴 MVP |
| **ReviewerAccuracyCard** | Show reviewer's validation count, accuracy %, institution | `src/components/reviewer/ReviewerAccuracyCard.tsx` | 🟢 Phase 2 |

### Component Hierarchy

```
<StudentReviewer>
  │
  ├─ <ReviewerAccuracyCard />
  │
  ├─ <IngredientValidationQueue />
  │  └─ Shows next ingredient to validate
  │
  └─ <OEWWorkflow />
     │
     ├─ <OEWObservationPanel />
     │  └─ Displays AI claim, role, safety level
     │
     ├─ <OEWEvidencePanel />
     │  ├─ <CitationForm />
     │  │  └─ Input: title, authors, journal, DOI/PMID, URL
     │  │
     │  └─ <CitationList />
     │     └─ Shows added citations
     │
     ├─ <OEWWritingPanel />
     │  └─ Textarea: 150–300 word public explanation
     │
     ├─ <ConfidenceLevelSelector />
     │  └─ High / Moderate / Limited (with help text)
     │
     ├─ <VerdictSelector />
     │  └─ Confirm / Correct / Escalate
     │
     ├─ <CorrectionInput />
     │  └─ (visible only if verdict = "correct")
     │
     └─ <ValidationProgressBar />
        └─ Step indicator + submit button
```

---

## Database Schema Requirements

### New/Modified Tables

#### 1. `ingredient_validations` (EXPAND)

```sql
-- Current fields (KEEP):
CREATE TABLE ingredient_validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES user_analyses(id) ON DELETE CASCADE,
  ingredient_name text NOT NULL,
  validator_id uuid NOT NULL REFERENCES auth.users(id),
  validator_institution text,
  pubchem_data_correct boolean,
  pubchem_cid_verified text,
  molecular_weight_correct boolean,
  ai_explanation_accurate boolean,
  ai_role_classification_correct boolean,
  corrected_role text,
  corrected_safety_level text,
  correction_notes text,
  reference_sources text[],
  validation_status text,
  created_at timestamp,
  updated_at timestamp,
  
  -- NEW FIELDS:
  ai_claim_summary text,                      -- What the AI claimed
  verdict text CHECK (verdict IN ('confirm', 'correct', 'escalate')),
  public_explanation text,                     -- Consumer-friendly explanation
  confidence_level text CHECK (confidence_level IN ('High', 'Moderate', 'Limited')),
  internal_notes text,                         -- For moderator review
  is_escalated boolean DEFAULT false,
  escalation_reason text,
  moderator_review_status text,                -- pending, approved, rejected
  moderator_feedback text,
  
  UNIQUE(analysis_id, ingredient_name, validator_id)
);

CREATE INDEX idx_ingredient_validations_analysis_id ON ingredient_validations(analysis_id);
CREATE INDEX idx_ingredient_validations_validator_id ON ingredient_validations(validator_id);
CREATE INDEX idx_ingredient_validations_status ON ingredient_validations(validation_status);
CREATE INDEX idx_ingredient_validations_escalated ON ingredient_validations(is_escalated);
```

#### 2. `ingredient_validation_citations` (NEW)

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
  doi_or_pmid text NOT NULL UNIQUE,
  url text NOT NULL,
  created_at timestamp DEFAULT now(),
  
  UNIQUE(validation_id, doi_or_pmid)
);

CREATE INDEX idx_citations_validation_id ON ingredient_validation_citations(validation_id);
CREATE INDEX idx_citations_doi_pmid ON ingredient_validation_citations(doi_or_pmid);
```

#### 3. `ingredient_validation_queue` (NEW VIEW)

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
WHERE iv.id IS NULL  -- Only unvalidated ingredients
GROUP BY ua.id, ua.product_name, ua.brand, ua.category, ua.epiq_score, ua.analyzed_at, ua.created_at
ORDER BY ua.analyzed_at ASC;
```

#### 4. `student_certifications` (VERIFY EXISTS)

```sql
-- Ensure this table exists with correct structure:
CREATE TABLE student_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  institution text NOT NULL,
  certification_level text NOT NULL CHECK (
    certification_level IN ('apprentice', 'associate', 'senior')
  ),
  active boolean DEFAULT true,
  issued_at timestamp DEFAULT now(),
  expires_at timestamp,
  
  UNIQUE(user_id)
);

CREATE INDEX idx_student_certifications_user_id ON student_certifications(user_id);
CREATE INDEX idx_student_certifications_active ON student_certifications(active);
```

#### 5. `user_roles` (VERIFY EXISTS)

```sql
-- Ensure moderator role is assigned for reviewers:
CREATE TABLE user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('admin', 'moderator', 'user')),
  assigned_at timestamp DEFAULT now(),
  
  UNIQUE(user_id, role)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
```

### RLS (Row-Level Security) Policies

```sql
-- ingredient_validations: reviewers can view own validations + moderators see all
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
  AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'moderator')
  AND EXISTS (SELECT 1 FROM student_certifications WHERE user_id = auth.uid() AND active = true)
);

-- ingredient_validation_citations: same access as parent validations
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

---

## Summary

The Cosmetic Science Apprentice Reviewer Workflow is a **structured, evidence-based validation system** that ensures AI-generated ingredient claims are accurate, cited, and explained in consumer-friendly language.

### Key Deliverables
1. ✅ **OEW Framework**: Observation → Evidence → Writing
2. ✅ **JSON Validation Format**: Standardized output for all submissions
3. ✅ **Evidence Standards**: Peer-reviewed sources only
4. ✅ **Reviewer Voice**: Plain language, honest, cautious, helpful
5. ✅ **Confidence Matrix**: High / Moderate / Limited assessment
6. ✅ **Implementation Roadmap**: 3 phases with file locations and acceptance criteria

### Next Steps
1. Create issue tracker for components (Phase 1 MVP)
2. Implement database schema updates
3. Build OEW workflow UI components
4. Deploy edge functions for validation storage
5. Test with pilot group of apprentices
6. Iterate based on feedback

---

**Document maintained by:** Product & Engineering Team  
**Last reviewed:** February 21, 2026  
**Status:** Ready for Implementation Planning
