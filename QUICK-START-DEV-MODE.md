# Quick Commands - Dev Mode & Test User

## Test User Created ✅

```
Email:    test.user@skinlytix.dev
Password: Test123!@#
```

---

## 🚀 Start Testing Right Now

```bash
# 1. Make sure dev server is running
npm run dev

# 2. Open in browser
http://localhost:8080/?devMode=true&devEmail=test.user@skinlytix.dev

# 3. Automatically logged in! Test features 🎉
```

---

## 🔐 Dev Mode URLs

### Default (uses test.user@skinlytix.dev)
```
http://localhost:8080/?devMode=true
```

### With specific email
```
http://localhost:8080/?devMode=true&devEmail=test.user@skinlytix.dev
```

### With email and password
```
http://localhost:8080/?devMode=true&devEmail=test.user@skinlytix.dev&devPassword=Test123!@#
```

### Use different user
```
http://localhost:8080/?devMode=true&devEmail=alicia@xiosolutionsllc.com
```

---

## 🚪 Exit Dev Mode

### Option 1: Remove URL Parameter (Easiest)
```
Change: http://localhost:8080/?devMode=true
To:     http://localhost:8080/
```

### Option 2: Sign Out in App
```
Click: Settings → Sign Out → Shows login form
```

### Option 3: Clear Browser Storage
```
F12 → Application → Local Storage → Delete all
```

---

## 📝 Cheat Sheet

| Action | URL |
|--------|-----|
| Dev mode (test user) | `?devMode=true` |
| Dev mode (custom user) | `?devMode=true&devEmail=user@test.com` |
| Exit dev mode | Remove `?devMode=true` |
| Sign out | Click "Sign Out" in app |
| Manual login | Go to `/auth` page |

---

## 📚 Full Guides

- **Complete usage guide**: `DEV-MODE-USAGE.md`
- **Troubleshooting**: `AUTH_USER_IMPORT_GUIDE.md`
- **Dev mode details**: `DEV-MODE-LOGIN-GUIDE.md`

---

## ✅ Test User Details

Created via: `create-test-user.js` script

```javascript
{
  email: "test.user@skinlytix.dev",
  password: "Test123!@#",
  id: "14475cb2-1e28-4e14-a652-d710c9cac671",
  created_at: "2026-02-19T08:14:55.512671Z"
}
```

Can create more test users by running:
```bash
SUPABASE_SERVICE_ROLE_KEY="..." node create-test-user.js
```

---

**Everything ready! Start testing! 🚀**
