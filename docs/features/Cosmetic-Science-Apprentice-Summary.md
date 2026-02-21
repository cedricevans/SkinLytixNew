# Cosmetic Science Apprentice Reviewer - Implementation Summary

**Document Version:** 1.0  
**Created:** February 21, 2026  
**Status:** Ready for Engineering Implementation  

---

## Overview

This document summarizes the **Cosmetic Science Apprentice Reviewer workflow** and provides a quick-reference guide for product managers, designers, engineers, and stakeholders.

## What We Just Built (Documentation)

Three comprehensive guides have been created and deployed to GitHub:

### 1. **Cosmetic-Science-Apprentice-Workflow.md** (1,068 lines)
**Purpose:** Define the complete OEW workflow and standards

**Key Sections:**
- 🎯 Workflow overview and purpose
- 📋 OEW Framework (Observation → Evidence → Writing)
- 👥 Reviewer role and access control requirements
- ✅ 6 non-negotiable workflow steps
- 📝 JSON output format (exact schema for validations)
- 🔬 Evidence & citation standards (peer-reviewed sources only)
- 🗣️ Reviewer voice & tone guidelines
- 📊 Confidence assessment matrix (High/Moderate/Limited)
- 🗄️ Database schema requirements (4 tables/views)

**Location:** `/docs/features/Cosmetic-Science-Apprentice-Workflow.md`

### 2. **Cosmetic-Science-Apprentice-Implementation-Checklist.md** (881 lines)
**Purpose:** Provide actionable implementation roadmap for engineers

**Key Sections:**
- 21 prioritized tasks broken by component
- 4 database tasks with SQL examples
- 3 edge functions with signatures and responsibilities
- 12 React components with props and acceptance criteria
- Phase 1 MVP (80–120 hours, 5–8 weeks)
- Phase 2 post-MVP features
- Phase 3 advanced features
- Deployment checklist
- Success criteria

**Location:** `/docs/features/Cosmetic-Science-Apprentice-Implementation-Checklist.md`

### 3. **This Summary** (You are here)
Quick reference for stakeholders, designers, and decision-makers

---

## Why This Matters

### The Problem

Currently, the Reviewer Dashboard has:
- ✅ Basic yes/no checkboxes for validation
- ✅ Product analysis display
- ❌ No structured validation workflow
- ❌ No evidence requirement
- ❌ No peer-reviewed source linking
- ❌ No confidence tracking
- ❌ No queue management
- ❌ No step-by-step guidance

This allows reviewers to approve or reject ingredient claims without evidence.

### The Solution

**OEW Workflow (Observation → Evidence → Writing):**

1. **Observation:** Read the AI claim
2. **Evidence:** Link peer-reviewed sources (minimum 1 required)
3. **Writing:** Explain in consumer-friendly language
4. **Confidence:** Assign High/Moderate/Limited
5. **Verdict:** Confirm, Correct, or Escalate
6. **Save:** Submit validated data with citations

**Result:**
- ✅ Evidence-based validation only
- ✅ Traceable citation trail
- ✅ Consumer-friendly explanations
- ✅ Confidence scoring
- ✅ Escalation for weak evidence
- ✅ Reviewer accountability

---

## Core Workflow (6 Non-Negotiable Steps)

### Step 1: Receive Queue Item
System delivers next unvalidated ingredient with product context

### Step 2: Observe AI Claim
Reviewer reads the AI-generated claim, explanation, and classification

### Step 3: Find Evidence
Reviewer searches for peer-reviewed sources (PubMed, journals, CIR)

### Step 4: Write Explanation
Reviewer writes 150–300 word consumer-friendly explanation

### Step 5: Assess & Verdict
- Choose confidence level (High/Moderate/Limited)
- Select verdict (Confirm/Correct/Escalate)
- If "correct": provide specific correction

### Step 6: Save
Submit validation with:
- AI claim summary
- Public explanation
- Confidence level
- Verdict
- 1+ citations with DOI/PMID and URL

---

## JSON Output Format (Validation Submission)

Every validation returns this exact structure:

```json
{
  "ingredient": "Salicylic Acid",
  "ai_claim_summary": "Beta hydroxy acid that exfoliates pores",
  "verdict": "confirm",
  "correction_if_any": null,
  "public_explanation": "[150-300 word explanation in plain language]",
  "confidence": "High",
  "citations": [
    {
      "type": "peer_reviewed",
      "title": "Efficacy and safety of salicylic acid...",
      "authors": "Castillo, D.E.; et al.",
      "journal": "Journal of Cosmetic Dermatology",
      "year": 2020,
      "doi_or_pmid": "10.1111/jocd.13452",
      "url": "https://doi.org/10.1111/jocd.13452"
    }
  ],
  "notes_for_internal_use": "Multiple peer-reviewed sources confirm..."
}
```

---

## Access Control

**Who can access the Reviewer Dashboard:**
- User has `moderator` role in `user_roles` table
- User has active `student_certifications` record
- Certification level: "apprentice" or higher
- Associated institution exists

**Implementation:**
```typescript
// Check these conditions
const hasRole = userRoles.includes('moderator');
const hasCert = studentCertifications?.active === true;
const canReview = hasRole && hasCert;
```

---

## Evidence Standards (Hierarchical)

### Tier 1: Strongest Evidence (Accept for "High" Confidence)
- ✅ Systematic reviews or meta-analyses
- ✅ Multiple independent RCTs
- ✅ CIR expert panel monographs

### Tier 2: Moderate Evidence ("Moderate" Confidence)
- ✅ Single peer-reviewed RCT
- ✅ Clinical studies from dermatology clinics
- ✅ Multiple in vitro studies

### Tier 3: Weak Evidence ("Limited" Confidence + Escalate)
- ⚠️ Single case study
- ⚠️ In vitro only
- ⚠️ Manufacturer-funded study
- ⚠️ Anecdotal reports

### NOT Acceptable (Reject)
- ❌ Influencer reviews
- ❌ Blog posts
- ❌ Manufacturer marketing claims
- ❌ Wikipedia

---

## Confidence Level Assessment

| Level | Definition | When to Use | Evidence Needed |
|-------|------------|------------|-----------------|
| **High** | Strong peer-reviewed evidence; AI accurate | Multiple independent studies confirm claim | 2+ sources, robust clinical evidence |
| **Moderate** | Single solid study; AI mostly accurate | One peer-reviewed study confirms; no contradictions | 1 strong source, clinical consensus |
| **Limited** | Weak/conflicting evidence; needs escalation | Anecdotal only, conflicting studies, missing data | Mark for escalation, flag missing evidence |

---

## Verdict Types

| Verdict | Meaning | Use Case | What to Do |
|---------|---------|----------|-----------|
| `"confirm"` | Evidence fully supports AI claim | AI claim is 100% accurate | Save with no corrections |
| `"correct"` | Evidence requires a correction | AI claim is partially wrong or missing nuance | Fill `correction_if_any` field |
| `"escalate"` | Evidence is insufficient/conflicting | Not enough sources or contradicting studies | Set confidence to "Limited" + internal notes |

---

## Reviewer Voice & Tone

### ✅ DO Write
> "Salicylic acid is a beta hydroxy acid that's clinically proven to reduce the appearance of acne. It's most effective for oily and acne-prone skin. However, salicylic acid can be irritating—especially for sensitive skin. Start with a low concentration (0.5%) and use 2–3 times per week. Avoid combining with other exfoliants. Do not use during pregnancy without consulting a dermatologist."

### ❌ DON'T Write
> "Salicylic acid is a powerful treatment that will cure your acne. It's completely safe for everyone and everyone should use it."

**Key Principles:**
- Plain language (high school reading level)
- No marketing or overclaiming
- Transparent about risks and limitations
- Mention concentration and skin type context
- Lead with safety-critical information

---

## Database Schema

### New/Modified Tables

#### `ingredient_validations` (EXPAND)
Add 9 new fields to track:
- `ai_claim_summary` - What the AI said
- `verdict` - Confirm/Correct/Escalate
- `public_explanation` - Consumer explanation
- `confidence_level` - High/Moderate/Limited
- `internal_notes` - For moderator review
- `is_escalated` - Boolean flag
- `escalation_reason` - Why escalated
- `moderator_review_status` - Pending/approved/rejected
- `moderator_feedback` - Moderator comments

#### `ingredient_validation_citations` (NEW)
Stores citations for each validation:
- `validation_id` - FK to ingredient_validations
- `citation_type` - peer_reviewed/clinical_study/systematic_review/dermatology_textbook
- `title`, `authors`, `journal`, `year`
- `doi_or_pmid` - Unique identifier
- `url` - Link to source

#### `ingredient_validation_queue` (NEW VIEW)
Query unvalidated ingredients with product context for queue display

#### `student_certifications` (VERIFY)
Already exists; just verify structure:
- `user_id` - FK to auth.users
- `institution` - University/institution name
- `certification_level` - apprentice/associate/senior
- `active` - Boolean flag

---

## UI Components Inventory

### Existing Components (Need Enhancement)
1. **IngredientValidationPanel** - Expand from checkboxes to full OEW workflow
2. **IngredientSourcePanel** - Add citation builder form
3. **ValidationProgressBar** - Add 6-step indicator
4. **StudentReviewer** - Add queue system + access control

### Required New Components (MVP)
1. **IngredientValidationQueue** - Display next unvalidated ingredient
2. **OEWObservationPanel** - Show AI claim and classification
3. **OEWEvidencePanel** - Citation linking interface
4. **OEWWritingPanel** - Public explanation textarea (150–300 words)
5. **ConfidenceLevelSelector** - High/Moderate/Limited radio buttons
6. **VerdictSelector** - Confirm/Correct/Escalate radio buttons
7. **CorrectionInput** - Correction text area (visible only if verdict = "correct")
8. **CitationForm** - Form to add individual citation (title, authors, journal, DOI/PMID, URL)
9. **CitationList** - Display and remove citations
10. **ReviewerAccuracyCard** - Stats display (Phase 2)

**Total: 4 enhance + 10 new components**

---

## Edge Functions Needed

### 1. `validate-ingredient` (POST)
**Request:**
```json
{
  "analysis_id": "uuid",
  "ingredient_name": "string",
  "ai_claim_summary": "string",
  "verdict": "confirm|correct|escalate",
  "correction_if_any": "string|null",
  "public_explanation": "string",
  "confidence": "High|Moderate|Limited",
  "citations": [...],
  "internal_notes": "string"
}
```

**Response:** `201 Created` with validation ID

**Responsibility:**
- Validate user auth + role + certification
- Validate JSON schema
- Verify citations have DOI/PMID
- Check citation URLs accessible
- Save to database with foreign keys
- Return validation ID

### 2. `get-validation-queue` (GET)
**Query params:** `limit=10&offset=0`

**Response:**
```json
{
  "queue": [
    {
      "analysis_id": "uuid",
      "product_name": "string",
      "brand": "string",
      "ingredients_to_validate": "string",
      "validated_count": 3,
      "ingredient_count": 5
    }
  ],
  "total_unvalidated": 47,
  "current_page": 1,
  "total_pages": 5
}
```

**Responsibility:**
- Query `ingredient_validation_queue` view
- Return unvalidated ingredients with product context
- Support pagination
- Return total count for progress tracking

### 3. `validate-citation-url` (POST)
**Request:**
```json
{
  "doi_or_pmid": "string",
  "url": "string"
}
```

**Response:**
```json
{
  "valid": true,
  "status_code": 200,
  "title": "string",
  "authors": "string"
}
```

**Responsibility:**
- Verify URL is accessible (HTTP HEAD request)
- Extract metadata from PubMed if PMID
- Return validation status + metadata for form prefill

---

## Implementation Timeline

### Phase 1: MVP (Weeks 1–5, 80–120 hours)
🔴 **Critical path for launch**

**Week 1–2: Database & Backend**
- [ ] Add 9 new fields to `ingredient_validations`
- [ ] Create `ingredient_validation_citations` table
- [ ] Create `ingredient_validation_queue` view
- [ ] Add RLS policies
- [ ] Deploy 3 edge functions
- [ ] Edge function testing

**Week 2–4: Frontend Components**
- [ ] Build 10 new UI components
- [ ] Enhance 4 existing components
- [ ] Integration of all components
- [ ] Form validation
- [ ] Error handling

**Week 4–5: Testing & Launch**
- [ ] End-to-end testing
- [ ] QA checklist
- [ ] Performance optimization
- [ ] Documentation for reviewers
- [ ] Launch with first cohort

### Phase 2: Post-MVP (Weeks 6–8)
🟡 **Important but not blocking**

- [ ] Auto-calculate confidence recommendation
- [ ] Accuracy metrics dashboard
- [ ] Escalation workflow for moderators

### Phase 3: Advanced (Weeks 9+)
🟢 **Future improvements**

- [ ] Ingredient research library
- [ ] Peer review system
- [ ] Certification progression (apprentice → associate → senior)

---

## Success Criteria

### Functional Requirements
- ✅ Reviewers can complete full OEW workflow
- ✅ All validations saved to database with citations
- ✅ Access control enforced (only certified reviewers)
- ✅ Queue system delivers ingredients
- ✅ Minimum 1 citation required
- ✅ Public explanation enforced (150–300 words)
- ✅ Confidence and verdict required
- ✅ Corrections tracked when verdict = "correct"

### Technical Requirements
- ✅ Load time < 2 seconds
- ✅ Zero console errors
- ✅ Mobile responsive
- ✅ Accessible (WCAG 2.1 AA)
- ✅ RLS policies working
- ✅ Database queries optimized

### User Experience
- ✅ Clear step-by-step guidance
- ✅ Helpful error messages
- ✅ Progress indicator shows current step
- ✅ Can review/edit before submitting
- ✅ Success feedback on completion
- ✅ Next ingredient loads automatically

---

## Key Decisions Made

### 1. **Evidence = Peer-Reviewed Only**
**Decision:** No influencer claims, blogs, or manufacturer marketing
**Rationale:** Consumer safety requires scientific evidence
**Implementation:** Validation requires DOI/PMID URL verification

### 2. **Confidence Level = Mandatory**
**Decision:** Every validation must specify High/Moderate/Limited
**Rationale:** Transparency about evidence strength
**Implementation:** Confidence selector is required field

### 3. **Verdict = Tracker**
**Decision:** Track whether claim is confirmed, corrected, or escalated
**Rationale:** Accountability and learning from moderator feedback
**Implementation:** Verdict enum with specific correction field

### 4. **Queue-Based Workflow**
**Decision:** Reviewers receive ingredients in priority order
**Rationale:** Distributes work fairly, prevents duplication
**Implementation:** `ingredient_validation_queue` view

### 5. **Public Explanation = Mandatory**
**Decision:** Every validation includes 150–300 word explanation for consumers
**Rationale:** Product enables consumer education, not just internal validation
**Implementation:** Textarea with word count and validation

---

## What's NOT Included

These features are out of scope for MVP but documented for future:

- ❌ Automated evidence quality scoring
- ❌ Ingredient research library (public API)
- ❌ Peer review system for apprentice validations
- ❌ Certification progression (apprentice → associate → senior)
- ❌ Leaderboards or gamification
- ❌ Email notifications on escalations
- ❌ Batch validation or CSV import

---

## Risk Mitigation

### Risk 1: Reviewers skip evidence checking
**Mitigation:**
- Form validation requires 1+ citations before submit
- Success toast only shows after database save
- Admin can review approval/rejection patterns

### Risk 2: Weak or fraudulent citations
**Mitigation:**
- `validate-citation-url` function checks URL accessibility
- Moderators review escalated validations
- Track when reviewers are overturned by moderators

### Risk 3: Inconsistent reviewer decisions
**Mitigation:**
- Written guidance in OEW Workflow doc
- Reviewer voice & tone guidelines
- Confidence matrix decision tree
- Moderator feedback on escalations

### Risk 4: Performance issues with large queue
**Mitigation:**
- Pagination in queue view
- Indexed database queries
- Edge functions cached responses
- Monitor load times

---

## Stakeholder Quick Reference

### For Product Managers
- **Launch date:** Aligned with implementation timeline (5–8 weeks MVP)
- **Feature flag:** No; workflow replaces existing validation UI
- **User impact:** Reviewers must follow OEW workflow for all validations
- **Success metric:** 100% of new validations include peer-reviewed citations

### For Designers
- **New layouts needed:** OEW step-by-step panel
- **Responsive:** Mobile-first for field researchers
- **Accessibility:** WCAG 2.1 AA minimum
- **Design system:** Leverage existing shadcn components

### For Engineers
- **Critical path:** Database → Edge functions → UI components
- **Effort:** 80–120 hours MVP
- **Team:** 2 engineers × 5–8 weeks
- **Dependencies:** None (standalone feature)

### For Legal/Compliance
- **Data retention:** Validations with citations are auditable
- **Accountability:** Reviewer ID tracked with every validation
- **Corrections:** Tracked when verdict = "correct"
- **Escalation:** Clear path for weak evidence

---

## Documentation Files

All guidance is contained in 2 files:

1. **Cosmetic-Science-Apprentice-Workflow.md**
   - For: Product managers, designers, reviewers
   - Contains: OEW framework, voice, confidence matrix, database schema
   - Length: 1,068 lines

2. **Cosmetic-Science-Apprentice-Implementation-Checklist.md**
   - For: Engineers and technical leads
   - Contains: 21 tasks, SQL examples, component specs, test cases
   - Length: 881 lines

3. **This Summary**
   - For: All stakeholders
   - Quick reference guide, decisions, timelines, risks

---

## Next Steps

### Immediate (Week 1)
- [ ] Share documentation with engineering team
- [ ] Review implementation checklist
- [ ] Estimate effort on your team
- [ ] Schedule kickoff meeting

### Planning (Week 1–2)
- [ ] Create Jira/GitHub issues for 21 tasks
- [ ] Assign tasks to engineers
- [ ] Design UI mockups
- [ ] Establish review/QA process

### Development (Week 2–5)
- [ ] Database migrations
- [ ] Edge functions
- [ ] React components
- [ ] Integration testing
- [ ] QA on staging

### Launch (Week 5–6)
- [ ] Deploy to production
- [ ] Invite first cohort of apprentices
- [ ] Monitor errors and usage
- [ ] Collect feedback

### Iterate (Week 6+)
- [ ] Phase 2 features based on usage
- [ ] Refinements from feedback
- [ ] Plan certification progression

---

## Questions?

Refer to:
1. **"How do I validate an ingredient?"** → Cosmetic-Science-Apprentice-Workflow.md, Workflow Steps section
2. **"What components do I need to build?"** → Implementation Checklist, Task 1.8–1.19
3. **"What's the database schema?"** → Workflow.md, Database Schema Requirements section
4. **"What evidence is acceptable?"** → Workflow.md, Evidence & Citations section
5. **"How long will this take?"** → Implementation Checklist, Phase 1 section

---

**Documentation Maintained By:** Product & Engineering Team  
**Last Updated:** February 21, 2026  
**Status:** ✅ Ready for Implementation  
**GitHub:** Commits edbee01 & 67eb704
