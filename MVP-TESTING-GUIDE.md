# SkinLytix MVP Testing Guide

**Last Updated**: February 18, 2026  
**Status**: ✅ Ready for MVP Testing  
**Database**: ✅ 817 records imported and verified

---

## Quick Start - Running Tests

### 1. **Start the Development Server**

```bash
npm run dev
# Server runs on http://localhost:8080
```

### 2. **Run End-to-End Tests (Playwright)**

```bash
# Install playwright if not already installed
npm install -D @playwright/test

# Run e2e tests
npx playwright test tests/e2e.spec.ts

# Run in headed mode (see browser)
npx playwright test tests/e2e.spec.ts --headed

# Run single test
npx playwright test tests/e2e.spec.ts -g "Sign up, login"
```

### 3. **Run Linting**

```bash
npm run lint
```

---

## Manual Testing Checklist

### ✅ **Phase 1: Authentication & User Setup**

- [ ] Navigate to `/auth`
- [ ] **Sign In with existing user**: cedric.evans@gmail.com / pa55word
  - Test profile: cedric.evans@gmail.com (Profile ID in database)
- [ ] Verify you're redirected to `/onboarding` or `/home`
- [ ] Check that user profile is loaded correctly
- [ ] Verify subscription status displays (e.g., "Premium", "Free Trial")
- [ ] Test "Forgot Password" flow (if implemented)

**Test Users Available** (from imported profiles):
```
cedric.evans@gmail.com          → Premium subscriber
alyssa.gomez827@gmail.com       → Premium subscriber
ameriewhiten@gmail.com          → Trial user
... (54 total imported profiles)
```

### ✅ **Phase 2: Product Analysis**

- [ ] Click "Analyze a Product"
- [ ] **Test Manual Entry**:
  - Enter Product Name: "Test Serum"
  - Enter Ingredients: "Water, Glycerin, Niacinamide"
  - Click "Analyze"
  - Verify analysis result displays (EPIQ score, recommendations, etc.)
  
- [ ] **Test Barcode Scan** (if implemented):
  - Use barcode scanner to capture product
  - Verify ingredients are auto-populated
  - Verify analysis completes successfully

- [ ] **Test OCR** (if implemented):
  - Upload product image
  - Verify ingredients extracted via OCR
  - Verify accuracy

### ✅ **Phase 3: Product Comparison**

- [ ] From an analyzed product, click "Find Market Dupes"
- [ ] Verify system returns similar products
- [ ] Check that comparison displays:
  - Price differences
  - Ingredient similarities
  - Brand alternatives
  - EPIQ score comparison

**Sample Data to Test**:
```
Product: "LUME whole body deodorant Soft Powder"
  User: alicia@xiosolutionsllc.com
  Ingredients: Check database
  Should find similar deodorants and alternatives
```

### ✅ **Phase 4: Skincare Routine Management**

- [ ] Navigate to "My Routine" section
- [ ] Verify current routine displays
- [ ] **Add a Product to Routine**:
  - Click "Add Product"
  - Search for "Hyaluronic Acid 2% + B5 Hydrating Serum with Ceramides"
  - Add to Morning or Evening routine
  - Save

- [ ] **Reorder Routine** (drag and drop if implemented):
  - Verify order persists after refresh

- [ ] **Remove Product from Routine**:
  - Click remove/delete button
  - Verify removal is immediate and persists

### ✅ **Phase 5: Ingredient Information & Explanations**

- [ ] Search for ingredient: "Niacinamide"
- [ ] Verify detailed explanation displays:
  - What it does
  - Safety profile
  - Compatible ingredients
  - Percentage in products

**Sample Ingredients to Test**:
```
- Salicylic Acid        → BHA exfoliant (52 explanations in DB)
- Glycerin              → Humectant
- Panthenol             → Conditioning agent
- Ethylhexylglycerin    → Preservative
```

### ✅ **Phase 6: Dashboard & Analytics**

- [ ] Dashboard displays user stats:
  - Total products analyzed
  - Routine completion %
  - Skin improvements tracked
  - Streaks

- [ ] Verify analytics charts render correctly
- [ ] Check that data is accurate (matches database)

### ✅ **Phase 7: Subscription & Billing** (if applicable)

- [ ] Navigate to "Settings" → "Subscription"
- [ ] Verify current subscription tier displays
- [ ] Check billing period and renewal date
- [ ] Test "Upgrade/Downgrade" flow (if implemented)

### ✅ **Phase 8: Data Persistence**

- [ ] Add a product analysis
- [ ] Close browser and reopen
- [ ] Verify analysis still exists in your account
- [ ] Verify it's in "My Analyses" list

---

## Database Verification Tests

### Test Data Available

```sql
-- Check user profiles
SELECT email, subscription_tier, created_at 
FROM profiles 
LIMIT 5;
-- Expected: 58 profiles with correct UUIDs

-- Check user analyses
SELECT product_name, user_id, epiq_score 
FROM user_analyses 
LIMIT 5;
-- Expected: 139 analyses with valid user_ids

-- Check ingredient cache
SELECT name, safety_profile 
FROM ingredient_cache 
LIMIT 5;
-- Expected: 423 ingredients with metadata

-- Check ingredient explanations
SELECT ingredient_name, explanation, safety_rating 
FROM ingredient_explanations_cache 
LIMIT 5;
-- Expected: 52 explanations with detailed info

-- Verify FK relationships
SELECT COUNT(*) FROM user_analyses 
WHERE user_id NOT IN (SELECT id FROM profiles);
-- Expected: 0 (all FKs valid)
```

### Run Verification Script

```bash
# Quick data verification
node verify-database.js

# Check import status
cat DATA_IMPORT_COMPLETE.md
```

---

## Automated Testing Setup

### Option 1: Playwright (E2E) - Recommended ✅

```bash
# Install
npm install -D @playwright/test

# Configure (already has e2e.spec.ts)
npx playwright install

# Run tests
npx playwright test tests/e2e.spec.ts

# Generate HTML report
npx playwright show-report
```

### Option 2: Vitest + React Testing Library (Unit)

```bash
# Install
npm install -D vitest @testing-library/react @testing-library/jest-dom

# Create test file
# src/__tests__/Auth.spec.tsx

# Run
npm run test
```

### Option 3: Cypress (Alternative E2E)

```bash
# Install
npm install -D cypress

# Setup
npx cypress open

# Or headless
npm run cypress:run
```

---

## Key Test Scenarios

### Scenario 1: New User Sign In → Onboarding
```
1. Navigate to /auth
2. Sign in with cedric.evans@gmail.com
3. Should redirect to /onboarding or /home
4. Profile should load with correct data
✅ Expected: User sees personalized dashboard
```

### Scenario 2: Product Analysis Workflow
```
1. Click "Analyze a Product"
2. Enter: Name="Rose Petal Toner", Ingredients="Rose Water, Glycerin"
3. System calls API → analyze-product function
4. Receives EPIQ score and recommendations
✅ Expected: Full analysis result displays
```

### Scenario 3: Market Dupe Finding
```
1. From analyzed product, click "Find Market Dupes"
2. System calls API → find-dupes function
3. Returns list of similar products with prices
✅ Expected: See 3-5 market alternatives
```

### Scenario 4: Ingredient Lookup
```
1. Search for "Hyaluronic Acid"
2. System loads from ingredient_cache (423 records)
3. Shows detailed explanation from ingredient_explanations_cache (52 records)
✅ Expected: Full ingredient info page
```

### Scenario 5: Routine Management
```
1. Navigate to /my-routine
2. Add "Hyaluronic Acid 2% + B5 Serum" to routine
3. Verify saved in database
4. Close and reopen → still there
✅ Expected: Data persists across sessions
```

---

## Deployment Testing

### Pre-Deployment Checklist

- [ ] All tests pass locally
- [ ] Lint errors resolved (`npm run lint`)
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables configured in `.env.local`:
  ```
  VITE_SUPABASE_URL=https://mzprefkjpyavwbtkebqj.supabase.co
  VITE_SUPABASE_PUBLISHABLE_KEY=...
  VITE_USE_FUNCTIONS_PROXY=true  (for dev)
  ```

### Build & Preview

```bash
# Build for production
npm run build

# Preview the build locally
npm run preview
# Open http://localhost:4173

# Verify it works on your machine before deploying
```

### Deployment Command

```bash
# Deploy to Vercel (if configured)
npm run deploy

# Or manually:
# git push to main branch
# Vercel auto-deploys (if connected)
```

---

## Known Test Data

### Sample Analyses in Database

```
1. "LUME whole body deodorant Soft Powder"
   User: alicia@xiosolutionsllc.com
   EPIQ Score: (check database)
   Product Price: (from product data)

2. "Rose Petal Toner"
   User: alicia@xiosolutionsllc.com
   Category: Toner
   
3. "Hyaluronic Acid 2% + B5 Hydrating Serum with Ceramides"
   User: test_d67f@test.com
   Active Ingredients: Hyaluronic Acid, Ceramides
```

### Sample Ingredients (52 total explanations)

```
- Water           → Solvent, hydration
- Salicylic Acid  → BHA exfoliant, acne-fighting
- Glycerin        → Humectant, moisture-binding
- Niacinamide     → Skin barrier support
- Panthenol       → Conditioning, soothing
- Ethylhexylglycerin → Preservative, fragrance
```

---

## Troubleshooting

### Login Fails
```
✓ Verify user exists in profiles table
✓ Check auth.users table for matching email
✓ Check .env.local has correct Supabase credentials
✓ Verify session refresh logic in AppProtectedRoute.tsx
```

### API Calls Fail
```
✓ Check VITE_USE_FUNCTIONS_PROXY=true in .env.local
✓ Verify Edge Functions deployed to Supabase
✓ Check browser console for CORS errors
✓ Verify /functions endpoint responds
```

### Database Queries Return No Data
```
✓ Verify profiles table has 58 records
✓ Verify user_analyses has 139 records
✓ Check FK relationships: 
  SELECT COUNT(*) FROM user_analyses 
  WHERE user_id NOT IN (SELECT id FROM profiles);
  -- Should return 0
✓ Check that user is authenticated (session.user exists)
```

### Styling/UI Issues
```
✓ npm run dev → clear browser cache
✓ Check that Tailwind config is correct
✓ Verify shadcn components imported properly
✓ Check lovable-tagger plugin in vite.config.ts
```

---

## Performance Testing

### Lighthouse Testing

```bash
# Run Lighthouse in Chrome DevTools
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Generate report
4. Check scores:
   - Performance: > 80
   - Accessibility: > 90
   - Best Practices: > 90
   - SEO: > 90
```

### Load Testing

```bash
# Test with 139 user analyses
1. Login
2. Navigate to analyses list
3. Verify renders in < 2 seconds
4. Scroll through all 139 records
5. Check Network tab for bundle size
```

---

## Acceptance Criteria

### Core Features ✅ Ready
- [x] User authentication (95 auth users)
- [x] Profile management (58 profiles)
- [x] Product analysis storage (139 analyses)
- [x] Ingredient database (423 ingredients)
- [x] Ingredient explanations (52 detailed explanations)

### Data Integrity ✅ Verified
- [x] All foreign key relationships valid
- [x] No orphaned records
- [x] User data persists across sessions
- [x] Analysis history preserved

### Testing ✅ Complete
- [x] Database tests passing
- [x] E2E test framework ready
- [x] Manual test checklist provided
- [x] Test data populated and verified

---

## Next Steps

1. **Run Dev Server**: `npm run dev`
2. **Login**: cedric.evans@gmail.com / pa55word
3. **Test Core Flows**: Follow manual testing checklist above
4. **Run E2E Tests**: `npx playwright test tests/e2e.spec.ts`
5. **Deploy**: `npm run build` then deploy to Vercel

---

## Support & Documentation

- **Copilot Instructions**: `.github/copilot-instructions.md`
- **Data Import Summary**: `DATA_IMPORT_COMPLETE.md`
- **Database Status**: `DATABASE_IMPORT_STATUS.md`
- **API Functions**: `supabase/functions/` directory
- **Edge Function Docs**: Check each function's index.ts

**You're ready to test! 🚀**
