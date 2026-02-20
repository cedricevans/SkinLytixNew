# Dev Mode Auto-Login Guide

## ✅ Database Verification

Your database is correctly configured:
```
Project ID:  mzprefkjpyavwbtkebqj ✅
Supabase URL: https://mzprefkjpyavwbtkebqj.supabase.co
Status:      Verified and active
```

---

## 🔐 Dev Mode Auto-Login (Development Only)

You can now bypass the login screen for testing by adding URL parameters.

### Quick Start (Fastest Method)

Simply add `?devMode=true` to the URL:

```
http://localhost:8080/?devMode=true
```

This will auto-login with the default credentials:
- Email: `cedric.evans@gmail.com`
- Password: `pa55word`

### Custom Credentials

You can specify different credentials:

```
http://localhost:8080/?devMode=true&devEmail=alyssa.gomez827@gmail.com&devPassword=pa55word
```

### Available Test Users

Any of these emails can be used with the password `pa55word`:

```
cedric.evans@gmail.com (primary test account - 3 products analyzed)
alyssa.gomez827@gmail.com
ameriewhiten@gmail.com
andrecosby87@gmail.com
anita.swift89@gmail.com
aricaratcliff@gmail.com
... (49 more accounts available)
```

---

## 📋 How Dev Mode Works

1. **Detection**: App checks URL for `?devMode=true`
2. **Authentication**: Automatically calls `supabase.auth.signInWithPassword()`
3. **Routing**: After login, redirects based on profile status:
   - If profile incomplete → `/onboarding`
   - If walkthrough not seen → `/walkthrough`
   - Otherwise → `/home`
4. **URL Cleanup**: URL parameters are removed for cleaner appearance

---

## 🚀 Usage Examples

### Example 1: Quick Test with Primary Account
```bash
# Start dev server
npm run dev

# Open in browser
# http://localhost:8080/?devMode=true

# ✅ Automatically logged in, no login form!
```

### Example 2: Test Different User
```
# Test with different account
http://localhost:8080/?devMode=true&devEmail=alyssa.gomez827@gmail.com

# ✅ Logged in as that user
```

### Example 3: Direct Test (JavaScript Console)
```javascript
// After loading the page, can also trigger login via console:
import { getDevLoginUrl } from "@/hooks/useDevModeLogin";
const url = getDevLoginUrl("cedric.evans@gmail.com", "pa55word");
window.location.href = url;
```

---

## ⚙️ Technical Details

### File Changes Made

**`src/hooks/useDevModeLogin.ts`** (NEW)
- React hook for dev mode authentication
- Checks URL parameters on mount
- Calls Supabase auth with credentials
- Only works in development (`import.meta.env.PROD` check)

**`src/App.tsx`** (UPDATED)
- Added import for `useDevModeLogin`
- Added `DevModeLoginGate` component
- Integrated into main route wrapper

### Implementation Details

```typescript
// Hook usage in App.tsx
const DevModeLoginGate = () => {
  const { isAttempting, error } = useDevModeLogin();
  if (error) console.error("Dev mode login error:", error);
  return null;
};
```

The hook:
- ✅ Only activates with `?devMode=true`
- ✅ Only works in development (blocked in production)
- ✅ Removes URL params after successful login
- ✅ Handles errors gracefully
- ✅ Respects existing session management

---

## 🔒 Security Notes

```
⚠️  IMPORTANT SECURITY REMINDERS:
```

1. **Production**: Dev mode is **completely disabled** in production builds
   ```javascript
   if (import.meta.env.PROD) {
     console.warn("⚠️ Dev mode login is disabled in production");
     return;
   }
   ```

2. **Never Hardcode**: URLs with credentials are local-only for testing
   - Only use on `localhost:8080`
   - Never commit URLs with passwords
   - Clear browser history when done

3. **Build Process**: Build for production uses `npm run build`
   - Production checks `import.meta.env.PROD`
   - Dev mode automatically disabled

4. **Environment**: Works ONLY when:
   - Running `npm run dev` (development mode)
   - `.env` files are loaded
   - Supabase client is initialized

---

## 🧪 Testing Workflow

### Scenario 1: Quick Feature Test (2-5 min)
```bash
# 1. Start dev server with auto-login enabled
npm run dev

# 2. In browser, visit
http://localhost:8080/?devMode=true

# 3. Automatically logged in to home page

# 4. Test feature (e.g., analyze product)

# 5. Done! No manual login needed
```

### Scenario 2: Test Multiple Accounts
```bash
# Test as User A
http://localhost:8080/?devMode=true&devEmail=cedric.evans@gmail.com

# Check results...

# Test as User B
http://localhost:8080/?devMode=true&devEmail=alyssa.gomez827@gmail.com

# Compare behavior across accounts
```

### Scenario 3: E2E Test + Dev Mode
```typescript
// In Playwright tests, can use:
await page.goto('http://localhost:8080/?devMode=true');
await page.waitForURL('**/home'); // Auto-login completes
// Now test features directly
```

---

## 🐛 Troubleshooting

### Dev Mode Not Working?

1. **Check URL Format**
   ```
   ❌ http://localhost:8080?devMode=true  (missing /)
   ✅ http://localhost:8080/?devMode=true (correct)
   ```

2. **Production Build?**
   ```bash
   # Make sure you're using dev server
   npm run dev  # ✅ Dev mode works here
   npm run preview  # ❌ Preview = production mode
   ```

3. **Check Console**
   ```javascript
   // Open DevTools (F12) → Console tab
   // Look for: "🔐 Dev Mode: Attempting auto-login..."
   // Or error: "❌ Dev login failed: [error message]"
   ```

4. **Credentials Wrong?**
   ```bash
   # Make sure user exists and password is correct
   # Default: cedric.evans@gmail.com / pa55word
   
   # Check .env file has Supabase keys
   cat .env | grep VITE_SUPABASE
   ```

### Still Not Working?

```bash
# 1. Clear browser cache
# Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)

# 2. Check .env file is loaded
# npm run dev should show "VITE_..." env vars

# 3. Verify Supabase is online
# Check: https://mzprefkjpyavwbtkebqj.supabase.co/

# 4. Check browser console for error messages
# F12 → Console → look for red errors
```

---

## 📊 Quick Reference

| Feature | URL | Result |
|---------|-----|--------|
| Manual login | `http://localhost:8080/` | Shows login form |
| Auto-login (default) | `?devMode=true` | Login as cedric.evans@gmail.com |
| Auto-login (custom) | `?devMode=true&devEmail=email@test.com` | Login as specified user |
| Production | (after `npm run build`) | Dev mode disabled ✅ |

---

## ✅ Verification Checklist

Before testing:

- [ ] Running `npm run dev` (not `npm run preview`)
- [ ] `.env` file has `VITE_SUPABASE_URL` set
- [ ] Database project ID is `mzprefkjpyavwbtkebqj`
- [ ] User account exists in Supabase (`cedric.evans@gmail.com`)
- [ ] Browser console shows: "🔐 Dev Mode: Attempting auto-login..."
- [ ] After login, redirects to `/home` or `/onboarding`

---

## 🎯 Next Steps

1. **Test Dev Mode**: 
   ```
   npm run dev
   # Then visit: http://localhost:8080/?devMode=true
   ```

2. **Run E2E Tests**:
   ```bash
   npx playwright test tests/e2e.spec.ts --headed
   ```

3. **Test Manual Features**:
   - Analyze a product
   - Find market dupes
   - Check ingredient info
   - Add to routine

4. **Deploy When Ready**:
   ```bash
   npm run build  # Dev mode will be disabled
   git push       # Deploy to Vercel
   ```

---

**You're all set! Dev mode is ready for testing. 🚀**
