# 🎯 Visual Process Comparison

## CURRENT PROCESS (What Exists Now)

```
┌────────────────────────────────────────────────────────────────┐
│                    StudentReviewer Dashboard                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  [Products List]            [Ingredient Validation Form]      │
│  ┌──────────────┐          ┌─────────────────────────┐       │
│  │ Product 1    │          │ Ingredient: Salicylic   │       │
│  │ Product 2    │          │ Acid                    │       │
│  │ Product 3    │          │                         │       │
│  └──────────────┘          │ ✓ PubChem data?         │       │
│       ↓                    │   [YES] [NO]            │       │
│  [Ingredients List]         │                         │       │
│  ┌──────────────┐          │ ✓ Explanation?          │       │
│  │ Salicylic    │          │   [YES] [NO]            │       │
│  │ Acid         │          │                         │       │
│  │ Niacinamide  │          │ ✓ If NO, Corrections:   │       │
│  │ Retinol      │          │   Role: [dropdown]      │       │
│  └──────────────┘          │   Safety: [dropdown]    │       │
│                             │   Notes: [textarea]     │       │
│                             │   Sources: [checkboxes] │       │
│                             │   [Save]                │       │
│                             └─────────────────────────┘       │
│                                                                │
└────────────────────────────────────────────────────────────────┘

User Flow:
1. Pick product
2. Pick ingredient
3. Answer: PubChem correct?
4. Answer: Explanation accurate?
5. If NO: Enter corrections + select sources
6. Save → Done
```

---

## NEW PROCESS (What We're Building)

```
┌────────────────────────────────────────────────────────────────┐
│                    StudentReviewer Dashboard                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │ Your Performance Stats         (NEW - TASK 2)          │  │
│  │ Validations: 42 | Accuracy: 94% | High: 28 Mod: 10 Lim: 4 │
│  └────────────────────────────────────────────────────────┘  │
│                                                                │
│  [Products List]            [6-Step OEW Workflow]             │
│  ┌──────────────┐          ┌─────────────────────────┐       │
│  │ Product 1    │          │ ╔═════════════════════╗ │       │
│  │ Product 2    │          │ ║ Step 1: OBSERVATION ║ │       │
│  │ Product 3    │          │ ╚═════════════════════╝ │       │
│  └──────────────┘          │                         │       │
│       ↓                    │ Salicylic Acid          │       │
│  [Ingredients List]         │ Helps reduce acne      │       │
│  ┌──────────────┐          │ Role: Active Ingredient │       │
│  │ Salicylic ← ─┼─────────→│ Safety: Caution         │       │
│  │ Acid         │          │                         │       │
│  │ Niacinamide  │          │ [Next: Find Evidence]   │       │
│  │ Retinol      │          │                         │       │
│  └──────────────┘          ├─────────────────────────┤       │
│                             │ ╔═════════════════════╗ │       │
│                             │ ║ Step 2: EVIDENCE    ║ │       │
│                             │ ╚═════════════════════╝ │       │
│                             │                         │       │
│                             │ Add Citation:           │       │
│                             │ Type: [Peer-Reviewed]   │       │
│                             │ Title: [________]       │       │
│                             │ Authors: [________]     │       │
│                             │ Journal: [________]     │       │
│                             │ DOI: [________]         │       │
│                             │ URL: [________]         │       │
│                             │ [Add Citation]          │       │
│                             │                         │       │
│                             │ Citations Added: 1/∞    │       │
│                             │ ✓ Source 1              │       │
│                             │                         │       │
│                             │ [Back] [Next]           │       │
│                             │                         │       │
│                             ├─────────────────────────┤       │
│                             │ ╔═════════════════════╗ │       │
│                             │ ║ Step 3: WRITING     ║ │       │
│                             │ ╚═════════════════════╝ │       │
│                             │                         │       │
│                             │ Write explanation:      │       │
│                             │ [large textarea...]     │       │
│                             │                         │       │
│                             │ Word count: 187/300 ✓   │       │
│                             │                         │       │
│                             │ [Back] [Next]           │       │
│                             │                         │       │
│                             ├─────────────────────────┤       │
│                             │ ╔═════════════════════╗ │       │
│                             │ ║ Step 4: CONFIDENCE  ║ │       │
│                             │ ╚═════════════════════╝ │       │
│                             │                         │       │
│                             │ ○ 🟢 High Confidence    │       │
│                             │ ● 🟡 Moderate          │       │
│                             │ ○ 🔴 Limited           │       │
│                             │                         │       │
│                             │ [Back] [Next]           │       │
│                             │                         │       │
│                             ├─────────────────────────┤       │
│                             │ ╔═════════════════════╗ │       │
│                             │ ║ Step 5: VERDICT     ║ │       │
│                             │ ╚═════════════════════╝ │       │
│                             │                         │       │
│                             │ ● ✓ Confirm            │       │
│                             │ ○ ✏️ Correct            │       │
│                             │ ○ ⚠️ Escalate           │       │
│                             │                         │       │
│                             │ [Back] [Next]           │       │
│                             │                         │       │
│                             ├─────────────────────────┤       │
│                             │ ╔═════════════════════╗ │       │
│                             │ ║ Step 6: NOTES       ║ │       │
│                             │ ╚═════════════════════╝ │       │
│                             │ (NEW - TASK 1)          │       │
│                             │                         │       │
│                             │ Internal notes:         │       │
│                             │ [textarea]              │       │
│                             │ 0/500 chars             │       │
│                             │                         │       │
│                             │ [Back] [SAVE]           │       │
│                             └─────────────────────────┘       │
│                                                                │
└────────────────────────────────────────────────────────────────┘

User Flow:
1. Pick product
2. Pick ingredient
3. Step 1: Read observation (Next)
4. Step 2: Add citations (Next when ≥1 citation)
5. Step 3: Write explanation (Next when 150-300 words)
6. Step 4: Rate confidence (Next)
7. Step 5: Make verdict (Next)
8. Step 6: Optional notes (Save)
9. Save → Database updated → Stats refresh → Next ingredient
```

---

## Step-by-Step Detail: NEW PROCESS

### STEP 1: OBSERVATION (Read-Only)
```
┌─────────────────────────────────────────┐
│ STEP 1: OBSERVATION                     │
├─────────────────────────────────────────┤
│                                         │
│ Salicylic Acid                          │
│ (Large ingredient name)                 │
│                                         │
│ AI Claim:                               │
│ "Helps reduce acne by exfoliating       │
│  and unclogging pores"                  │
│                                         │
│ Role: Active Ingredient                 │
│ Safety Level: ⚠️ Caution                │
│                                         │
│ Full Explanation:                       │
│ [Full text from AI analysis]            │
│                                         │
│ Reference:                              │
│ PubChem CID: 2144                       │
│ Molecular Weight: 138.12 g/mol          │
│                                         │
│ [Next: Find Evidence →]                 │
│                                         │
└─────────────────────────────────────────┘
```

### STEP 2: EVIDENCE (Add Citations)
```
┌─────────────────────────────────────────┐
│ STEP 2: EVIDENCE (Citation Management)  │
├─────────────────────────────────────────┤
│                                         │
│ Add Citation:                           │
│ ┌─────────────────────────────────┐    │
│ │ Type: [▼ Peer-Reviewed Paper]   │    │
│ │ Title: [___________________]     │    │
│ │ Authors: [___________________]   │    │
│ │ Journal: [___________________]   │    │
│ │ Year: [____]                    │    │
│ │ DOI/PMID: [___________________] │    │
│ │ URL: [___________________]       │    │
│ │ [Add Citation]                  │    │
│ └─────────────────────────────────┘    │
│                                         │
│ Citations Added: 1 of ∞ ✓               │
│ ┌─────────────────────────────────┐    │
│ │ 🔵 Peer-Reviewed                │    │
│ │ "Salicylic Acid Efficacy in     │    │
│ │  Acne Treatment"                │    │
│ │ Smith, J.; Jones, M.; et al.    │    │
│ │ Journal of Dermatology, 2023    │    │
│ │ DOI: 10.1234/example            │    │
│ │ [🔗 Read] [✕ Remove]            │    │
│ └─────────────────────────────────┘    │
│                                         │
│ Requirements Checklist:                 │
│ ✓ ≥1 citation required                 │
│ ✓ Must be peer-reviewed                │
│ ✓ Must have DOI or PMID                │
│ ✓ Must have accessible URL             │
│                                         │
│ Where to Find Sources:                  │
│ • PubMed (pubmed.ncbi.nlm.nih.gov)     │
│ • Google Scholar (scholar.google.com)  │
│ • CIR Database                         │
│ • Dermatology journals                 │
│                                         │
│ [◀ Back] [Next: Write Explanation →]  │
│                                         │
└─────────────────────────────────────────┘
```

### STEP 3: WRITING (Consumer Explanation)
```
┌─────────────────────────────────────────┐
│ STEP 3: WRITING                         │
├─────────────────────────────────────────┤
│                                         │
│ Write a 150-300 word explanation for    │
│ consumers (not jargony, accessible):    │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ Salicylic acid is a beta-hydroxy│    │
│ │ acid (BHA) that works...        │    │
│ │                                 │    │
│ │                                 │    │
│ │ ✓ 187/300 words (Perfect!)      │    │
│ └─────────────────────────────────┘    │
│                                         │
│ Writing Tips:                           │
│ • Use plain language (no jargon)       │
│ • Keep it honest                       │
│ • Include who it's for                 │
│ • Mention cautions                     │
│ • Back up claims with evidence         │
│                                         │
│ Example Structure:                      │
│ 1. What it is                          │
│ 2. What it does                        │
│ 3. Who it's for                        │
│ 4. Cautions/side effects               │
│ 5. Bottom line                         │
│                                         │
│ [◀ Back] [Next: Rate Confidence →]    │
│                                         │
└─────────────────────────────────────────┘
```

### STEP 4: CONFIDENCE (Evidence Quality)
```
┌─────────────────────────────────────────┐
│ STEP 4: CONFIDENCE LEVEL                │
├─────────────────────────────────────────┤
│                                         │
│ Based on the evidence you found, rate   │
│ your confidence in the AI claim:        │
│                                         │
│ ○ 🟢 HIGH CONFIDENCE                   │
│   Multiple peer-reviewed sources,       │
│   strong evidence, no conflicts         │
│   Example: Retinol reduces wrinkles     │
│                                         │
│ ● 🟡 MODERATE CONFIDENCE                │
│   Single good peer-reviewed RCT or      │
│   clinical consensus                    │
│   Example: Niacinamide improves pores   │
│                                         │
│ ○ 🔴 LIMITED CONFIDENCE                │
│   Weak, conflicting, or missing         │
│   evidence (requires escalation)        │
│   Example: New peptide complex          │
│                                         │
│ Citations found: 1                      │
│ ✓ Evidence quality: Tier 2 (Good RCT)   │
│                                         │
│ [◀ Back] [Next: Make Verdict →]        │
│                                         │
└─────────────────────────────────────────┘
```

### STEP 5: VERDICT (Professional Decision)
```
┌─────────────────────────────────────────┐
│ STEP 5: VERDICT                         │
├─────────────────────────────────────────┤
│                                         │
│ Based on all evidence, what is your     │
│ professional verdict?                   │
│                                         │
│ ● ✓ CONFIRM (Green)                    │
│   The AI claim is 100% accurate         │
│   and well-supported by evidence        │
│   Use when: All evidence supports,      │
│   no corrections needed                 │
│                                         │
│ ○ ✏️ CORRECT (Amber)                    │
│   The claim needs specific revisions    │
│   Use when: Mostly right but missing    │
│   nuance or overstated                  │
│                                         │
│   [CorrectionInput appears if selected] │
│   What needs to be corrected?           │
│   [textarea for details]                │
│                                         │
│ ○ ⚠️ ESCALATE (Red)                    │
│   Insufficient or conflicting evidence  │
│   Use when: No peer-reviewed sources,   │
│   conflicting studies, requires review  │
│   ⚠️ This will be flagged for moderator │
│   review                                │
│                                         │
│ [◀ Back] [Next: Internal Notes →]      │
│                                         │
└─────────────────────────────────────────┘
```

### STEP 6: INTERNAL NOTES (Optional)
```
┌─────────────────────────────────────────┐
│ STEP 6: INTERNAL NOTES (Optional)       │
├─────────────────────────────────────────┤
│ (NEW - TASK 1)                          │
│                                         │
│ Add notes for moderators (optional):    │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ Found conflicting evidence on   │    │
│ │ concentration levels in 2023    │    │
│ │ study - may need expert review  │    │
│ │                                 │    │
│ │ 68/500 characters               │    │
│ └─────────────────────────────────┘    │
│                                         │
│ Use this for:                           │
│ • Flagging conflicting sources          │
│ • Requesting expert opinion             │
│ • Context for complex cases             │
│ • Questions for moderators              │
│                                         │
│ [◀ Back] [SAVE VALIDATION →]           │
│                                         │
└─────────────────────────────────────────┘

On Save:
├─ Insert ingredient_validations
├─ Insert ingredient_validation_citations (1 per citation)
├─ Show success toast
├─ Update ReviewerAccuracyCard stats
└─ Move to next ingredient
```

---

## Data Saved to Database

```
ingredient_validations table:
├─ id: UUID
├─ ingredient_id: string (FK)
├─ ai_claim_summary: "Helps reduce acne..."
├─ public_explanation: "Salicylic acid is a BHA..."
├─ confidence_level: "Moderate" ← from Step 4
├─ verdict: "confirm" ← from Step 5
├─ correction: null (not needed for confirm)
├─ escalation_reason: null
├─ internal_notes: "Found conflicting..." ← from Step 6
├─ is_escalated: false
├─ moderator_review_status: "pending"
├─ created_at: 2026-02-21T15:30:00Z
└─ updated_at: 2026-02-21T15:30:00Z

ingredient_validation_citations table:
├─ id: UUID
├─ validation_id: [FK to ingredient_validations]
├─ citation_type: "peer_reviewed"
├─ title: "Salicylic Acid Efficacy..."
├─ authors: "Smith, J.; Jones, M.; et al."
├─ journal_name: "Journal of Dermatology"
├─ publication_year: 2023
├─ doi_or_pmid: "10.1234/example"
├─ source_url: "https://doi.org/10.1234/example"
└─ created_at: 2026-02-21T15:30:00Z

reviewer_stats view (auto-updates):
├─ user_id: [user_id]
├─ institution: "Harvard"
├─ total_validations: 43 (incremented)
├─ confirmed_validations: 42
├─ approval_rate: 94.2%
├─ high_confidence_count: 28
├─ moderate_confidence_count: 11 (incremented)
├─ limited_confidence_count: 4
└─ last_validation_date: 2026-02-21T15:30:00Z
```

---

## Ready to Build?

This is what will change on the page when Tasks 1-5 are complete.

**Confirm and we'll start with Task 1! 🚀**
