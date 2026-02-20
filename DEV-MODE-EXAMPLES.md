# Dev Mode Login - Real World Examples

Quick copy-paste examples for common testing scenarios.

---

## Example 1: Quick Test (No Login Form)

**Scenario**: You want to test a feature without typing login credentials

```bash
# Step 1: Start dev server
npm run dev

# Step 2: Open browser and paste this URL
http://localhost:8080/?devMode=true

# Result: Automatically logged in as cedric.evans@gmail.com
# You're now on /home or /onboarding (redirected automatically)
```

**Time saved**: ~30 seconds per test ✨

---

## Example 2: Test Different User Account

**Scenario**: You want to verify that different users see different data

```
# Test Account A (3 products analyzed)
http://localhost:8080/?devMode=true&devEmail=cedric.evans@gmail.com

# Wait for page to load and log the products...

# Test Account B (different products)
http://localhost:8080/?devMode=true&devEmail=alyssa.gomez827@gmail.com

# Compare the two accounts' data
```

**Use case**: Verify data isolation between users ✅

---

## Example 3: E2E Test with Auto-Login

**Scenario**: Speed up your Playwright tests by skipping manual login

**File: `tests/e2e.spec.ts`**

```typescript
import { test, expect } from '@playwright/test';

test('Quick feature test with dev mode login', async ({ page }) => {
  // Use dev mode auto-login instead of manual login steps
  await page.goto('http://localhost:8080/?devMode=true');
  
  // Wait for redirect to home page
  await page.waitForURL('**/home', { waitUntil: 'networkidle' });
  
  // Now directly test features
  const analyzeButton = page.getByRole('button', { name: /analyze/i });
  await expect(analyzeButton).toBeVisible();
  
  await analyzeButton.click();
  // ... continue testing feature
});
```

**Benefits**:
- ✅ No manual login steps needed
- ✅ Tests run faster
- ✅ Fewer login-related test flakes
- ✅ Focus on feature testing

---

## Example 4: Test Multiple Features Fast

**Scenario**: You want to quickly test 5 different features

**Process**:
```
1. http://localhost:8080/?devMode=true
   → Test "Analyze Product" (1 min)
   
2. Refresh page (same URL, still logged in)
   → Test "Find Market Dupes" (1 min)
   
3. Refresh page again
   → Test "Ingredient Search" (1 min)
   
4. etc...
```

**Total time**: ~5 minutes for 5 features
**Without dev mode**: ~15+ minutes (including 5x login times)

**Time saved**: ~10 minutes ✨

---

## Example 5: Debug Data Issues

**Scenario**: You're investigating why a user's data doesn't display

```bash
# 1. Open dev mode as the problematic user
http://localhost:8080/?devMode=true&devEmail=cedric.evans@gmail.com

# 2. Open browser DevTools (F12)

# 3. Go to Console tab

# 4. Check what data is loaded
// In console, check:
console.log(user); // Current user info
// See what's in localStorage
console.log(localStorage);

# 5. Check Network tab to see API responses
// Look at /rest/v1/profiles and /rest/v1/user_analyses calls
```

**Advantage**: Instantly in the user's session without needing their password

---

## Example 6: Mobile/Responsive Testing

**Scenario**: You want to test the app on different screen sizes

```bash
# 1. Start dev server
npm run dev

# 2. Open in browser with dev mode
http://localhost:8080/?devMode=true

# 3. Open DevTools (F12)

# 4. Click device toggle (Ctrl+Shift+M on Chrome)

# 5. Select device (iPhone 12, iPad, etc.)

# 6. App auto-logs you in, now test responsive design
```

**No manual login needed on each device test!** ✨

---

## Example 7: Test JavaScript Console Features

**Scenario**: You want to test features that require console access

```bash
# 1. Open dev mode
http://localhost:8080/?devMode=true

# 2. Open DevTools console (F12 → Console)

# 3. Get dev mode helper function
import { getDevLoginUrl } from "@/hooks/useDevModeLogin";

# 4. Generate custom URL
const url = getDevLoginUrl("alyssa.gomez827@gmail.com", "pa55word");
console.log(url);
// Output: http://localhost:8080/?devMode=true&devEmail=alyssa.gomez827@gmail.com&devPassword=pa55word

# 5. Use it
window.location.href = url;
```

**Power user tip**: Programmatically switch users in console! 🚀

---

## Example 8: Recording Session for Bug Report

**Scenario**: You found a bug and want to record it for the team

```bash
# 1. Open dev mode
http://localhost:8080/?devMode=true

# 2. Start screen recording (built into Mac/Windows)

# 3. Perform steps to reproduce bug (no login delay!)

# 4. Share recording with specific reproduction steps
```

**Faster recording** = clearer bug reports ✅

---

## Example 9: Demo to Stakeholders

**Scenario**: You want to show the app features without setup delays

```bash
# Setup (before demo)
npm run dev
# Keep this tab open: http://localhost:8080/?devMode=true

# During demo
# Just refresh the page to reset
# No login needed, always ready
# Can jump between different user accounts instantly
```

**Impression**: App launches instantly ✨

---

## Example 10: Batch Testing Multiple Scenarios

**Scenario**: You have a checklist of features to test

```
Feature Test Checklist:
□ Login (✅ Already logged in with ?devMode=true)
□ View Profile
□ Analyze Product
□ Find Dupes
□ Check Ingredients
□ Add to Routine
□ View Routine
□ Edit Routine
□ Delete from Routine
```

**Without dev mode**: Each test = login + feature test
**With dev mode**: Just feature tests (login is skipped)

**Result**: Complete testing in half the time ⏱️

---

## Quick Copy-Paste URLs

Just copy these and modify as needed:

```
Default User:
http://localhost:8080/?devMode=true

Custom User Template:
http://localhost:8080/?devMode=true&devEmail=USERNAME&devPassword=PASSWORD

Multiple Users (Open in multiple tabs):
http://localhost:8080/?devMode=true&devEmail=cedric.evans@gmail.com
http://localhost:8080/?devMode=true&devEmail=alyssa.gomez827@gmail.com
http://localhost:8080/?devMode=true&devEmail=andrecosby87@gmail.com
```

---

## Pro Tips

```
💡 Tab 1: http://localhost:8080/?devMode=true&devEmail=user1@test.com
💡 Tab 2: http://localhost:8080/?devMode=true&devEmail=user2@test.com
💡 Compare side-by-side how different users see the app

💡 Bookmark the URL for quick access
💡 Share the format with your team
💡 Works in all browsers (Chrome, Safari, Firefox)
💡 Parameters auto-cleanup after login (clean history)
```

---

## Troubleshooting Quick Examples

### "Dev mode not working?"

```bash
# ❌ Wrong: Using preview instead of dev
npm run preview
http://localhost:8080/?devMode=true  # Won't work in preview

# ✅ Right: Using dev server
npm run dev
http://localhost:8080/?devMode=true  # Works! Dev mode active
```

### "Console shows error"

```javascript
// Check browser console (F12 → Console tab)
// Should see: "🔐 Dev Mode: Attempting auto-login..."
// If error appears: "❌ Dev login failed: [error message]"

// Check:
1. User email is correct
2. User exists in database
3. Password is correct (should be: pa55word)
4. Running npm run dev (not npm run preview)
```

### "URL didn't auto-cleanup"

```javascript
// Manual cleanup if needed:
// Replace full URL with: http://localhost:8080/

// Or in console:
window.history.replaceState({}, document.title, '/');
```

---

## Summary Table

| Scenario | URL | Time Saved |
|----------|-----|-----------|
| Quick test | `?devMode=true` | 30 sec/test |
| Different user | `?devEmail=...` | 30 sec/test |
| E2E tests | Use in playwright | 5 min/suite |
| Demo | Zero login time | 2 min/demo |
| Debug | Instant access | 5 min/bug |

---

**Ready to speed up your testing? Use dev mode for instant access!** 🚀
