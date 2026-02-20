# Exiting Dev Mode - Complete Guide

## 3 Ways to Exit Dev Mode

### Method 1: Remove URL Parameters (Easiest)
```
Current: http://localhost:8080/?devMode=true&devEmail=test.user@skinlytix.dev
Change to: http://localhost:8080/
or just:  http://localhost:8080
```

**What happens:**
- ✅ Dev mode hook checks for `?devMode=true`
- ✅ Since it's missing, dev mode is skipped
- ✅ You're shown the normal login form
- ✅ Can login manually or stay logged out

---

### Method 2: Sign Out / Logout
```
While logged in:
1. Go to any page
2. Click: Settings → Sign Out (or equivalent logout button)
3. You're logged out
4. Dev mode is disabled (no auto-login on next visit)
```

**What happens:**
- ✅ Your session is cleared
- ✅ Next page load shows login form
- ✅ Dev mode parameters ignored while logged out

---

### Method 3: Clear Browser Storage
```
Manual approach:
1. Open DevTools (F12)
2. Go to: Application tab
3. Click: Local Storage
4. Select: http://localhost:8080
5. Delete all entries
6. Close tab and reopen
```

**Or use keyboard shortcut:**
```
Windows/Linux: Ctrl + Shift + Delete
Mac: Cmd + Shift + Delete
→ Clear all browsing data
→ Focus on: Cookies and cached data
→ Click: Clear
```

---

## When Dev Mode is Automatically Disabled

Dev mode is **automatically disabled** in these cases:

### 1. In Production Build
```bash
npm run build
# Dev mode COMPLETELY disabled ✅
# Never accessible in production
```

### 2. When URL is Cleaned
```
Before: http://localhost:8080/?devMode=true&devEmail=test@test.com
After login, auto-cleaned to: http://localhost:8080/

# Refresh page → dev mode won't trigger again
```

### 3. When Session is Established
```
If already logged in:
http://localhost:8080/?devMode=true
→ Skips dev mode (already has session)
→ Shows home page
```

---

## Dev Mode Status Check

### How to Know if Dev Mode is Active

**In Browser Console (F12 → Console):**
```javascript
// Look for this message when dev mode activates:
"🔐 Dev Mode: Attempting auto-login..."

// If you don't see it, dev mode is NOT active
```

**Check URL:**
```
✅ Dev mode active:    http://localhost:8080/?devMode=true
✅ Dev mode active:    http://localhost:8080/?devMode=true&devEmail=...
❌ Dev mode inactive:  http://localhost:8080/
❌ Dev mode inactive:  http://localhost:8080/auth
❌ Dev mode inactive:  http://localhost:8080/home
```

---

## Switching Between Dev Mode and Normal Login

### Scenario: Test Dev Mode, Then Manual Login

```
Step 1: Test dev mode
URL: http://localhost:8080/?devMode=true
✅ Auto-logged in

Step 2: Sign out
Click: Settings → Sign Out

Step 3: Normal login
URL: http://localhost:8080/auth
Fill in: Email and Password
Click: Sign In

Step 4: Back to dev mode
URL: http://localhost:8080/?devMode=true
✅ Auto-logged in again
```

---

## Completely Disable Dev Mode Feature

If you want to disable the dev mode feature entirely (not just exit it):

### Option 1: Modify the Hook
Edit `src/hooks/useDevModeLogin.ts`:

```typescript
// Add this at the start of useDevModeLogin function:
export const useDevModeLogin = () => {
  const [searchParams] = useSearchParams();
  
  // Disable dev mode
  return { isAttempting: false, error: null };
  
  // ... rest of code never runs
};
```

### Option 2: Remove from App.tsx
Edit `src/App.tsx`:

```typescript
// Remove this line:
<DevModeLoginGate />

// Dev mode won't run anymore
```

### Option 3: Delete Hook File
```bash
rm src/hooks/useDevModeLogin.ts
```

---

## Testing Scenarios

### Test 1: Use Dev Mode, Then Exit
```
1. Visit: http://localhost:8080/?devMode=true
   ✅ Auto-logged in
   
2. Click: Settings → Sign Out
   ✅ Logged out
   
3. Visit: http://localhost:8080/
   ✅ Shows login form
   
4. Manual login with different user
   ✅ Works normally
```

### Test 2: Multiple Dev Mode Users
```
1. Visit: http://localhost:8080/?devMode=true&devEmail=test.user@skinlytix.dev
   ✅ Logged in as test.user
   
2. Visit: http://localhost:8080/?devMode=true&devEmail=test.user2@skinlytix.dev
   ✅ Logged in as test.user2
   
3. Sign out and visit: http://localhost:8080/
   ✅ Shows login form (dev mode exited)
```

### Test 3: Refresh Page
```
1. Visit: http://localhost:8080/?devMode=true
   ✅ Auto-logged in
   
2. Press: F5 (refresh)
   ✅ Still logged in (session persisted)
   ✅ Dev mode doesn't re-trigger (already logged in)
   
3. Visit: http://localhost:8080/
   ✅ Shows home (still logged in)
```

---

## Quick Reference

| Action | Result |
|--------|--------|
| Remove `?devMode=true` from URL | Dev mode disabled |
| Sign out / Logout | Dev mode disabled |
| Refresh page after logout | Back to login form |
| Clear browser storage | Session cleared |
| Build for production | Dev mode auto-disabled |
| Already logged in | Dev mode skipped |

---

## Summary

**To exit dev mode:**
1. **Easiest**: Just remove `?devMode=true` from URL
2. **Normal**: Click Sign Out to logout
3. **Clear**: Use DevTools to clear storage

**Dev mode is automatically:**
- ✅ Disabled in production (`npm run build`)
- ✅ Skipped if already logged in
- ✅ Cleaned from URL after login
- ✅ Bypassed if `devMode=true` is missing

**You can always:**
- ✅ Switch between dev mode and manual login
- ✅ Test different users
- ✅ Exit dev mode instantly

---

**Dev mode is designed to be temporary for testing. Exiting is always one click away!** 🚀
