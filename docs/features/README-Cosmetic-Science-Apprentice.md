# Cosmetic Science Apprentice Reviewer Program

**Complete documentation for implementing the OEW (Observation, Evidence, Writing) evidence-based ingredient validation workflow.**

---

## 📚 Documentation Files

This program is fully documented in three companion guides. **Start with your role:**

### 1️⃣ **For Everybody: Start Here**
📄 **Cosmetic-Science-Apprentice-Summary.md** (614 lines, 18 KB)

- Quick overview of the entire program
- Core workflow (6 non-negotiable steps)
- JSON output format
- Access control and evidence standards
- Database and UI component inventory
- Timeline and success criteria
- Risk mitigation and next steps

**👥 Best for:** Product managers, designers, engineers, executives, stakeholders  
**⏱️ Read time:** 10–15 minutes

---

### 2️⃣ **For Reviewers: The Workflow**
📄 **Cosmetic-Science-Apprentice-Workflow.md** (1,068 lines, 39 KB)

- 📋 Complete OEW framework explained
- 🔬 How to find peer-reviewed evidence
- 📝 How to write consumer-friendly explanations
- 🎯 Confidence assessment rules
- ✅ Step-by-step validation process
- 🗣️ Reviewer voice and tone guidelines
- 🔐 Access control requirements
- 🗄️ Full database schema
- 🏗️ Implementation roadmap (3 phases)

**👥 Best for:** Cosmetic science apprentices, student reviewers, moderators  
**⏱️ Read time:** 20–30 minutes (reference document)

---

### 3️⃣ **For Engineers: The Implementation**
📄 **Cosmetic-Science-Apprentice-Implementation-Checklist.md** (881 lines, 27 KB)

- 21 prioritized, actionable tasks
- 4 database tasks with SQL examples
- 3 edge functions with signatures and responsibilities
- 12 React components with props and acceptance criteria
- Effort estimates (80–120 hours MVP)
- Phase 1 (MVP), Phase 2 (post-MVP), Phase 3 (advanced) roadmap
- Complete deployment checklist
- Testing and QA strategy
- Success criteria for each task

**👥 Best for:** Backend engineers, frontend engineers, technical leads  
**⏱️ Read time:** 25–35 minutes (reference document)

---

## 🎯 Quick Links by Role

### **Product Manager**
1. Read: Summary.md (skip Phase 2–3 if MVP focused)
2. Understand: Timeline (5–8 weeks, 2 engineers)
3. Define: Success metrics (100% validations have citations)
4. Plan: Launch date and first cohort size

### **Designer**
1. Read: Summary.md (UI Component Inventory section)
2. Read: Workflow.md (Reviewer Voice section)
3. Review: Implementation Checklist (Task 1.8–1.19 for component specs)
4. Create: Mockups for 10 new components and 4 enhancements

### **Backend Engineer**
1. Read: Summary.md (Database Schema section)
2. Read: Implementation Checklist (Tasks 1.1–1.7)
3. Build: Database migrations
4. Build: 3 edge functions

### **Frontend Engineer**
1. Read: Summary.md (UI Component Inventory)
2. Read: Implementation Checklist (Tasks 1.8–1.19)
3. Build: 10 new React components
4. Enhance: 4 existing components
5. Test: Integration and e2e tests

### **QA / Tester**
1. Read: Summary.md (Success Criteria)
2. Read: Implementation Checklist (Task 1.20–1.21)
3. Create: Test cases for all scenarios
4. Validate: Database, edge functions, UI components

### **Cosmetic Science Reviewer (Apprentice)**
1. Read: Workflow.md (Workflow Steps section)
2. Understand: Evidence standards (Tier 1/2/3)
3. Learn: Confidence assessment matrix
4. Practice: OEW framework on sample ingredients

---

## 🔍 What Problem Does This Solve?

**Current State:**
- ❌ Reviewers validate ingredients with basic yes/no checkboxes
- ❌ No evidence requirement
- ❌ No peer-reviewed source linking
- ❌ No confidence tracking
- ❌ No consumer education output

**After Implementation:**
- ✅ Structured 6-step OEW validation workflow
- ✅ Minimum 1 peer-reviewed citation required
- ✅ Citations verified with DOI/PMID
- ✅ Confidence level (High/Moderate/Limited) tracked
- ✅ 150–300 word consumer explanation for each validation
- ✅ Verdict tracked (Confirm/Correct/Escalate)
- ✅ Moderator review workflow for escalations

---

## 📊 The OEW Framework (Quick Overview)

### Observation (O)
Reviewer reads the AI-generated ingredient claim and classification

### Evidence (E)
Reviewer finds peer-reviewed sources (PubMed, journals, CIR) to verify or contradict the claim

### Writing (W)
Reviewer writes a 150–300 word plain-language explanation for consumers

**Result:** Validated ingredient data with traceable citations, consumer education, and confidence scoring

---

## 📅 Implementation Timeline

### Phase 1: MVP (5–8 weeks, 80–120 hours)
🔴 **Critical** for launch

- Database schema + edge functions
- 10 new React components + 4 enhancements
- Queue-based workflow
- Citation validation
- Access control

### Phase 2: Post-MVP (Optional, weeks 6–8)
🟡 **Important** but not blocking

- Confidence level auto-calculation
- Accuracy metrics dashboard
- Moderator escalation workflow

### Phase 3: Advanced (Future)
🟢 **Nice-to-have**

- Ingredient research library
- Peer review system
- Certification progression

---

## 🗄️ Database Changes

**Expanding existing tables:**
- `ingredient_validations` + 9 new fields
- Add `ingredient_validation_citations` join table
- Add `ingredient_validation_queue` view
- Verify `student_certifications` and `user_roles` tables

[See Implementation Checklist Task 1.1–1.4 for SQL]

---

## 🔧 Edge Functions Required

| Function | Purpose | Request | Response |
|----------|---------|---------|----------|
| `validate-ingredient` | Save validation with citations | JSON validation object | 201 Created + validation_id |
| `get-validation-queue` | Get next unvalidated ingredients | Pagination params | Queue items + product context |
| `validate-citation-url` | Verify DOI/PMID is accessible | DOI/PMID + URL | Valid status + metadata |

[See Implementation Checklist Tasks 1.5–1.7 for signatures]

---

## 🎨 UI Components Needed

### Enhance (4)
1. IngredientValidationPanel → Full OEW workflow
2. IngredientSourcePanel → Citation builder
3. ValidationProgressBar → 6-step indicator
4. StudentReviewer → Queue + access control

### Create (10)
1. IngredientValidationQueue
2. OEWObservationPanel
3. OEWEvidencePanel
4. OEWWritingPanel
5. ConfidenceLevelSelector
6. VerdictSelector
7. CorrectionInput
8. CitationForm
9. CitationList
10. ReviewerAccuracyCard (Phase 2)

[See Implementation Checklist Tasks 1.8–1.19 for full specs]

---

## ✅ Success Criteria

**Functional:**
- 100% of validations include peer-reviewed citations
- All validations include consumer explanation (150–300 words)
- Confidence and verdict captured for every validation
- Corrections tracked when verdict = "correct"

**Technical:**
- Load time < 2 seconds
- Zero console errors
- Mobile responsive
- WCAG 2.1 AA accessibility

**User Experience:**
- Clear step-by-step guidance
- Progress indicator shows current step
- Can review/edit before submitting
- Next ingredient loads automatically

---

## 📖 How to Use This Documentation

### Option 1: Quick Overview (15 min)
Read: **Summary.md** → Get the complete picture

### Option 2: For Implementation (3–5 hours)
1. Read: **Summary.md** (overview)
2. Read: **Workflow.md** (complete context)
3. Reference: **Implementation Checklist** (while building)

### Option 3: For Individual Contributors
**Backend Engineer:** Implementation Checklist (Tasks 1.1–1.7)  
**Frontend Engineer:** Implementation Checklist (Tasks 1.8–1.19)  
**Reviewer:** Workflow.md (Workflow Steps section)

---

## 🚀 Getting Started

### Step 1: Stakeholder Review
Share Summary.md with team, get alignment on timeline and scope

### Step 2: Engineering Planning
Review Implementation Checklist, create Jira/GitHub issues for 21 tasks

### Step 3: Design
Reference Workflow.md and Implementation Checklist for component specs

### Step 4: Development
Follow Implementation Checklist task sequence (database → functions → UI)

### Step 5: QA & Launch
Use deployment checklist and test cases

---

## 📝 Key Decisions Made

1. **Evidence = Peer-Reviewed Only** - No influencer claims or marketing
2. **Confidence = Mandatory** - Transparency about evidence strength
3. **Verdict = Tracked** - Confirm/Correct/Escalate for accountability
4. **Queue-Based = Fair Distribution** - Automatic ingredient assignment
5. **Consumer Explanation = Required** - 150–300 word plain language output

---

## 🔗 GitHub Commits

These documentation files were deployed in:
- `edbee01` - Cosmetic-Science-Apprentice-Workflow.md
- `67eb704` - Cosmetic-Science-Apprentice-Implementation-Checklist.md
- `cbaad9e` - Cosmetic-Science-Apprentice-Summary.md (this overview)

---

## 📞 Questions?

**"How do I validate an ingredient?"**  
→ Read: Workflow.md, Workflow Steps section

**"What components do I need to build?"**  
→ Read: Implementation Checklist, Tasks 1.8–1.19

**"What's the database schema?"**  
→ Read: Workflow.md, Database Schema section

**"How long will this take?"**  
→ Read: Implementation Checklist, Phase 1 section

**"What evidence is acceptable?"**  
→ Read: Workflow.md, Evidence & Citations section

**"What's the timeline?"**  
→ Read: Summary.md, Implementation Timeline section

---

## 📚 Document Structure

```
docs/features/
├── Cosmetic-Science-Apprentice-Summary.md (THIS FILE)
│   └── 614 lines | Quick reference for all stakeholders
├── Cosmetic-Science-Apprentice-Workflow.md
│   └── 1,068 lines | Complete OEW framework + standards
└── Cosmetic-Science-Apprentice-Implementation-Checklist.md
    └── 881 lines | 21 actionable tasks + SQL + component specs
```

**Total Documentation:** 2,563 lines, 84 KB  
**Effort to Read:** 45–75 minutes for complete understanding  
**Effort to Implement:** 80–120 hours (MVP only)  

---

**Status:** ✅ Ready for Implementation  
**Last Updated:** February 21, 2026  
**Maintained By:** Product & Engineering Team
