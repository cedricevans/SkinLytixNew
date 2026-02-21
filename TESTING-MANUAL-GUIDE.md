# 🎯 Step-by-Step Manual Testing Guide
**Build:** OEW Workflow Complete  
**Date:** 2026-02-21  
**Environment:** localhost:8081

---

## 📌 QUICK START - What to Test First

### Before You Start:
1. ✅ **Browser open:** http://localhost:8081/
2. ✅ **Dev server running:** localhost:8081 (Vite ready)
3. ✅ **Console open:** Press F12 to see any errors

### What You'll See:
- Login screen (if not logged in)
- Dashboard with StudentReviewer option
- Product list with ingredients
- 6-step validation workflow

---

## 🔑 STEP 1: LOGIN & NAVIGATE

### Action 1: Click StudentReviewer
**What to look for:**
- ✓ Page loads without errors
- ✓ "Welcome" header appears
- ✓ Product list shows items
- ✓ No error messages in console

**If you see an error:**
- Check browser console (F12)
- Note the exact error message
- Document in TEST-EXECUTION-RESULTS.md

---

## 📦 STEP 2: SELECT A PRODUCT

### Action 2: Click any product in the list
**What to look for:**
- ✓ Product expands to show ingredients
- ✓ Ingredient names display
- ✓ No loading errors
- ✓ "ReviewerAccuracyCard" stats visible at top

### ReviewerAccuracyCard Verification:
**Should show 6 stat boxes:**
1. ✓ Total Validations (number)
2. ✓ Approval Rate (%)
3. ✓ High Confidence (count)
4. ✓ Moderate Confidence (count)
5. ✓ Limited Confidence (count)
6. ✓ Last Validated (date/time)

**If stats don't show:**
- Document in Issues section
- Check browser console
- This is React Query auto-fetch

---

## 🧪 STEP 3: START VALIDATION - Scenario 1 (Confirmation)

### Action 3: Click an ingredient name
**What appears:**
- ✓ "IngredientValidationPanel" modal/card
- ✓ Step indicator (e.g., "Step 1 of 6")
- ✓ "Observation" panel visible

---

## 📖 STEP 1: OBSERVATION PANEL

**What you should see:**
```
Observation (Step 1)
├─ Ingredient Name: [ingredient name]
├─ AI Claim Summary: [text]
├─ Role: [e.g., "Emollient"]
├─ Safety Level: [e.g., "Generally Recognized as Safe"]
├─ AI Explanation: [paragraph of text]
└─ [Next] button
```

### Checklist:
- [ ] Ingredient name displays
- [ ] AI claim summary visible
- [ ] Role classification shows
- [ ] Safety level displayed
- [ ] AI explanation readable (multiple lines OK)
- [ ] "Next" button present and clickable
- [ ] No error messages

**Test:** Click "Next" button → should proceed to Step 2

---

## 📚 STEP 2: EVIDENCE PANEL

**What you should see:**
```
Evidence (Step 2)
├─ Citation Form:
│  ├─ DOI or PubMed ID: [input field]
│  ├─ Journal Name: [input field]
│  ├─ Year: [input field]
│  ├─ Authors: [input field]
│  ├─ URL: [input field]
│  └─ [Add Citation] button
├─ Citation List:
│  ├─ Citation 1 (if added)
│  └─ [Remove] button
└─ [Next] button (enabled only after 1+ citation)
```

### Test: Add a Citation
1. **Enter a valid DOI:** (example: `10.1021/j100279a049`)
   - [ ] Input accepts text
   - [ ] No error validation yet
2. **Enter journal name:** (example: `Journal of Chemical Education`)
   - [ ] Input accepts text
3. **Enter year:** (example: `2023`)
   - [ ] Input accepts 4 digits
4. **Enter authors:** (example: `Smith, J. et al.`)
   - [ ] Input accepts text
5. **Click "Add Citation"**
   - [ ] Citation appears in list below
   - [ ] Form clears for next citation
   - [ ] "Next" button becomes enabled

### Checklist:
- [ ] Citation form inputs work
- [ ] Can add multiple citations
- [ ] Citation list displays added items
- [ ] "Next" button disabled until 1+ citation
- [ ] No validation errors on add

**Test:** Click "Next" → should proceed to Step 3

---

## ✍️ STEP 3: WRITING PANEL

**What you should see:**
```
Writing (Step 3)
├─ Instruction: "Write a consumer-friendly explanation (150-300 words)"
├─ Textarea: [large text input]
├─ Word Counter: "0 / 300 words"
└─ [Next] button (disabled until 150-300 words)
```

### Test: Enter Explanation
1. **Copy this sample text** (exactly 165 words):
```
This ingredient serves as an emollient, helping to soften and smooth the skin surface. 
The scientific evidence suggests it works by forming a protective barrier that reduces 
water loss from the skin. Multiple peer-reviewed studies have documented its effectiveness 
in improving skin hydration and reducing dryness. It's generally recognized as safe for 
cosmetic use by regulatory agencies worldwide. The ingredient works particularly well when 
combined with other humectants that draw moisture into the skin. Consumers typically see 
benefits within days of regular application. It has been used safely in cosmetic formulations 
for decades without significant adverse effects. The concentration used in this product falls 
well within established safety guidelines.
```

2. **Paste into textarea**
   - [ ] Text appears in field
   - [ ] Word counter updates to ~165
   - [ ] "Next" button becomes enabled

### Test: Word Count Validation
3. **Delete most of the text** (leave ~50 words)
   - [ ] Word counter shows <150
   - [ ] "Next" button becomes disabled
   - [ ] See error message? Document it

4. **Add more text** (reach 150 words)
   - [ ] "Next" button re-enables
   - [ ] No error message

5. **Continue adding** (exceed 300 words)
   - [ ] Word counter shows >300
   - [ ] "Next" button becomes disabled
   - [ ] See error message? Document it

6. **Delete to 300 exactly**
   - [ ] "Next" button re-enables

### Checklist:
- [ ] Textarea accepts text input
- [ ] Word counter real-time and accurate
- [ ] <150 words → button disabled
- [ ] 150-300 words → button enabled
- [ ] >300 words → button disabled
- [ ] Error messages clear (if any)

**Test:** With 150-300 words, click "Next" → should proceed to Step 4

---

## 💪 STEP 4: CONFIDENCE SELECTOR

**What you should see:**
```
Confidence (Step 4)
├─ High Confidence
│  └─ Multiple peer-reviewed sources with consistent findings
├─ Moderate Confidence
│  └─ Limited sources or some conflicting evidence
├─ Limited Confidence
│  └─ Weak evidence or single source only
└─ [Next] button (disabled until selection)
```

### Test: Select Confidence
1. **Click "High Confidence"**
   - [ ] Option highlights/selects
   - [ ] "Next" button becomes enabled

2. **Click "Moderate Confidence"**
   - [ ] Previous selection deselects
   - [ ] New option highlights
   - [ ] Button stays enabled

3. **Click "Limited Confidence"**
   - [ ] Previous selection deselects
   - [ ] New option highlights
   - [ ] Button stays enabled

### Checklist:
- [ ] All 3 options clickable
- [ ] Only 1 selection at a time
- [ ] Visual feedback on selection
- [ ] "Next" enabled after selection
- [ ] Can change selection

**Test:** Select one option, click "Next" → should proceed to Step 5

---

## ✅ STEP 5: VERDICT SELECTOR (Confirmation Flow)

**What you should see:**
```
Verdict (Step 5)
├─ Confirm
│  └─ The ingredient's AI classification is accurate
├─ Correct
│  └─ The ingredient data needs correction [correction input appears]
├─ Escalate
│  └─ This needs expert review [reason input appears]
└─ [Next] button (disabled until selection)
```

### Test: Select "Confirm"
1. **Click "Confirm" option**
   - [ ] Option highlights
   - [ ] NO correction input appears
   - [ ] NO escalation reason input appears
   - [ ] "Next" button becomes enabled

2. **Click "Correct" option**
   - [ ] "Confirm" deselects
   - [ ] "Correct" highlights
   - [ ] ✓ **CorrectionInput field APPEARS**
   - [ ] Input says "Enter correction details..."
   - [ ] "Next" button becomes disabled (waiting for correction text)

3. **Click "Escalate" option**
   - [ ] "Correct" deselects
   - [ ] "Escalate" highlights
   - [ ] ✓ **EscalationInput field APPEARS**
   - [ ] Input says "Enter escalation reason..."
   - [ ] "Next" button becomes disabled (waiting for reason text)

4. **Click back to "Confirm"**
   - [ ] Both conditional inputs disappear
   - [ ] "Next" button re-enables

### Checklist:
- [ ] All 3 verdicts clickable
- [ ] Only 1 selection at a time
- [ ] "Correct" shows CorrectionInput conditionally
- [ ] "Escalate" shows EscalationInput conditionally
- [ ] "Confirm" shows no conditional inputs
- [ ] Conditional inputs disappear when unselected
- [ ] "Next" enabled only when ready

**Test:** Select "Confirm", click "Next" → should proceed to Step 6

---

## 📝 STEP 6: INTERNAL NOTES PANEL

**What you should see:**
```
Internal Notes (Step 6 - Optional)
├─ Textarea: [text input]
├─ Character Counter: "0 / 500"
└─ [Save Validation] button
```

### Test: Notes Entry
1. **Click textarea**
   - [ ] Cursor appears
   - [ ] Ready for input

2. **Type some notes:** "This ingredient is well-studied and safe."
   - [ ] Text appears
   - [ ] Character counter updates (e.g., "45 / 500")
   - [ ] Counter is blue (not red/amber)

3. **Add more notes** (500+ characters total)
   - [ ] Text continues to accept input until 500
   - [ ] At 500 characters → text stops accepting input
   - [ ] Counter shows red color (warning)

4. **Test optional nature**
   - [ ] Clear all notes
   - [ ] "Save Validation" button should still be clickable
   - [ ] Notes field is optional

### Checklist:
- [ ] Textarea accepts text
- [ ] Character counter real-time and accurate
- [ ] Counter color: blue (0-400), amber (400-500), red (500+)
- [ ] 500 character limit enforced
- [ ] Field is optional (can skip)
- [ ] "Save Validation" button present

---

## 💾 SAVE ACTION - Scenario 1 Complete

**Test: Click "Save Validation"**

### During Save:
- [ ] Loading spinner appears
- [ ] Button becomes disabled
- [ ] No user interaction possible

### After Save:
- [ ] Spinner disappears
- [ ] ✓ **SUCCESS TOAST appears:**
   - Message: "Your validation has been recorded and stats updated"
   - Green color (success)
   - Auto-dismisses after 3-5 seconds
- [ ] Form resets (all fields cleared)
- [ ] Validation panel closes
- [ ] Back to product list view
- [ ] ✓ **ReviewerAccuracyCard stats UPDATE**
   - Total Validations increases by 1
   - Approval Rate updates
   - "High Confidence" count increases

### Database Verification:
1. **Open browser console** (F12 → Network tab)
2. **Look for POST request to `/functions/` or `supabase`**
   - Should show ingredient_validations
   - Response should be 200 OK
   - No 4xx or 5xx errors

### Checklist:
- [ ] Save completes without error
- [ ] Success toast appears
- [ ] Form resets
- [ ] Stats update
- [ ] ReviewerAccuracyCard refreshes
- [ ] No console errors

**Scenario 1 Status: ✅ COMPLETE (assuming all above pass)**

---

## 🔄 SCENARIO 2: CORRECTION FLOW

**Quick Version - Repeat Scenario 1 Steps 1-4, then:**

### Step 5: Select "Correct"
1. Click "Correct" option
   - [ ] CorrectionInput appears
2. Enter correction: "Role should be 'Humectant' not 'Emollient'"
   - [ ] Text appears
   - [ ] "Next" button enables

### Step 6: Add optional notes
1. Optional - add notes or skip
2. Click "Save Validation"
   - [ ] Success toast
   - [ ] Stats update

### Database Check:
- [ ] Verdict = "correct"
- [ ] Correction field populated
- [ ] Stats show correction count increased

**Scenario 2 Status: ✅ COMPLETE (assuming all pass)**

---

## 🚨 SCENARIO 3: ESCALATION FLOW

**Quick Version - Repeat Scenario 1 Steps 1-4, then:**

### Step 5: Select "Escalate"
1. Click "Escalate" option
   - [ ] EscalationInput appears
2. Enter reason: "Conflicting evidence in literature. Needs expert analysis."
   - [ ] Text appears
   - [ ] "Next" button enables

### Step 6: Add optional notes
1. Optional - add notes or skip
2. Click "Save Validation"
   - [ ] Success toast
   - [ ] Stats update

### Database Check:
- [ ] Verdict = "escalate"
- [ ] is_escalated flag = true
- [ ] Escalation reason stored
- [ ] Stats show escalation count

**Scenario 3 Status: ✅ COMPLETE (assuming all pass)**

---

## 📝 SUMMARY CHECKLIST

### After All Scenarios Complete:
- [ ] Scenario 1 (Confirm) - PASS
- [ ] Scenario 2 (Correct) - PASS
- [ ] Scenario 3 (Escalate) - PASS
- [ ] Validation rules working
- [ ] UI responsive and clean
- [ ] Success toasts appear
- [ ] Stats updating correctly
- [ ] No console errors
- [ ] Database saving data

### Final Notes:
- Document any failures in TEST-EXECUTION-RESULTS.md
- Note timestamps for each scenario
- Record any error messages exactly
- Test on mobile (F12 → Responsive Design Mode)

---

## 🎯 Expected Outcomes

### ✅ PASS Means:
- All fields work as designed
- Data saves to database
- Stats update automatically
- No console errors
- UI is responsive
- Form resets after save
- Success messages appear

### ❌ FAIL Means:
- Fields don't respond to input
- Save produces error
- Stats don't update
- Console shows error messages
- Data not in database
- UI looks broken/misaligned

### 🚧 BLOCKED Means:
- Cannot access page
- Cannot select product
- Cannot open validation form
- Prerequisite step failed

---

**Now: Go to http://localhost:8081/ and start testing!**
