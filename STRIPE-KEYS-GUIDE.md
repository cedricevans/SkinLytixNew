# 🔑 Stripe Keys Configuration Guide

**Last Updated:** February 20, 2026  
**Status:** Configuration Required for Production

---

## 📋 Summary: Which Keys You Need

| Key | Purpose | Type | Where to Use | Status |
|-----|---------|------|--------------|--------|
| **`STRIPE_SECRET_KEY`** | Server-side API calls | Secret Key | Backend Functions | ✅ **REQUIRED** |
| **`STRIPE_PUBLISHABLE_KEY`** | Client-side payments | Publishable Key | Frontend/UI | ✅ **REQUIRED** |

---

## 🔍 Where Each Key Is Used

### 1. **STRIPE_SECRET_KEY** (Server-Side - Backend)

**This is the SECRET key - handle with care!**

**Used in:**
- ✅ `check-subscription` Edge Function
  - Lookup Stripe customer by email
  - Retrieve subscriptions
  - Map tiers (free/premium/pro)
  
- ✅ `create-checkout` Edge Function
  - Create Stripe checkout sessions
  - Link checkout to Stripe customer
  
- ✅ `customer-portal` Edge Function
  - Create customer portal sessions
  - Allow users to manage billing

**Format:** Starts with `sk_test_` (test) or `sk_live_` (production)

**Example:**
```
STRIPE_SECRET_KEY=sk_test_51234567890abcdefghijklmnop
```

**Location in Code:**
```typescript
// supabase/functions/check-subscription/index.ts
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20" });
```

---

### 2. **STRIPE_PUBLISHABLE_KEY** (Client-Side - Frontend)

**This is the PUBLIC key - safe to expose in frontend**

**Used in:**
- ✅ Frontend code for payment forms
- ✅ Stripe Elements/Payment Element
- ✅ Redirect to checkout

**Format:** Starts with `pk_test_` (test) or `pk_live_` (production)

**Example:**
```
STRIPE_PUBLISHABLE_KEY=pk_test_51234567890abcdefghijklmnop
```

**Location in Environment:**
```bash
# In .env.local or Supabase secrets
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # For Vite frontend
```

---

## 🚀 How to Get Your Stripe Keys

### Step 1: Go to Stripe Dashboard
1. Visit https://dashboard.stripe.com/
2. Log in to your Stripe account
3. Click on **Developers** in the left sidebar

### Step 2: Find Your Keys
1. Click **API Keys** from the Developers menu
2. You'll see:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

### Step 3: Copy the Keys
- Copy each key and keep it safe
- **NEVER** commit the secret key to git
- **NEVER** share the secret key

---

## 🔧 Configuration Steps

### For Local Development

**1. Create/Update `.env.local`:**
```bash
# Backend (Supabase Edge Functions)
STRIPE_SECRET_KEY=sk_test_YOUR_SECRET_KEY_HERE

# Frontend (Vite)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_PUBLISHABLE_KEY_HERE
```

**2. For Supabase Edge Functions:**
Add to Supabase project secrets:
```bash
supabase secrets set STRIPE_SECRET_KEY sk_test_YOUR_SECRET_KEY_HERE
```

### For Production

**1. Replace test keys with live keys:**
```bash
STRIPE_SECRET_KEY=sk_live_YOUR_LIVE_SECRET_KEY
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_LIVE_PUBLISHABLE_KEY
```

**2. Set in Supabase production environment:**
```bash
supabase secrets set --env production STRIPE_SECRET_KEY sk_live_...
```

---

## 🔐 Security Best Practices

### ✅ DO:
- ✅ Keep `STRIPE_SECRET_KEY` secret (never expose in code)
- ✅ Use environment variables for all keys
- ✅ Never commit `.env.local` to git
- ✅ Use different keys for test vs. production
- ✅ Rotate keys periodically

### ❌ DON'T:
- ❌ Hardcode keys in source code
- ❌ Commit keys to git repository
- ❌ Share secret keys with anyone
- ❌ Use production keys in development
- ❌ Log or expose keys in console/errors

---

## 🧪 Test vs. Production Keys

### Test Keys (for development)
- Publishable: `pk_test_...`
- Secret: `sk_test_...`
- ✅ Safe to use during development
- ✅ Creates test transactions only
- ✅ Use for testing checkout flow

### Production Keys (for live)
- Publishable: `pk_live_...`
- Secret: `sk_live_...`
- ⚠️ Real transactions occur
- ⚠️ Only deploy after full testing
- ⚠️ Requires PCI compliance

---

## 📍 Which Functions Need Which Key

```
check-subscription
├─ Needs: STRIPE_SECRET_KEY ✅
├─ Purpose: Check user subscription status
└─ Called by: Frontend when checking account status

create-checkout
├─ Needs: STRIPE_SECRET_KEY ✅
├─ Purpose: Create checkout session
└─ Called by: Frontend when user clicks "Upgrade"

customer-portal
├─ Needs: STRIPE_SECRET_KEY ✅
├─ Purpose: Create customer portal link
└─ Called by: Frontend for billing management

Stripe Elements (Frontend)
├─ Needs: STRIPE_PUBLISHABLE_KEY ✅
├─ Purpose: Render payment form
└─ Called by: React component in browser
```

---

## ✅ Verification Checklist

After adding your Stripe keys:

```
[ ] STRIPE_SECRET_KEY set in Supabase secrets
[ ] VITE_STRIPE_PUBLISHABLE_KEY set in .env.local
[ ] Test keys being used (sk_test_, pk_test_)
[ ] check-subscription endpoint responds with 200
[ ] No "STRIPE_SECRET_KEY is not set" errors
[ ] Create checkout button works
[ ] Payment form renders correctly
[ ] Test transaction completes
```

---

## 🔗 References

- **Stripe Dashboard:** https://dashboard.stripe.com/
- **API Keys Documentation:** https://stripe.com/docs/keys
- **Test Data:** https://stripe.com/docs/testing
- **Stripe API Version:** 2024-11-20

---

## 🆘 Troubleshooting

### Error: "STRIPE_SECRET_KEY is not set"
- ✅ Add key to Supabase secrets
- ✅ Restart dev server
- ✅ Verify key starts with `sk_test_` or `sk_live_`

### Error: "Invalid Publishable Key"
- ✅ Verify key starts with `pk_test_` or `pk_live_`
- ✅ Check .env.local is being read
- ✅ Ensure VITE prefix for Vite variables

### Checkout not working
- ✅ Check both keys are set
- ✅ Verify keys are from same account
- ✅ Confirm API version is correct (2024-11-20)

---

**Status:** Ready for configuration  
**Next Step:** Get your Stripe keys and configure environment

