# 🚀 PHASE 2 QUICK START GUIDE
## Waitlist Special Pricing - Feb 20-26, 2026

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting Phase 2 implementation, verify:

- [ ] **STRIPE_SECRET_KEY** available (get from Stripe dashboard)
- [ ] **Email service configured** (SendGrid, Mailgun, or Resend)
- [ ] **Database migration from Phase 1** confirmed live
- [ ] **Test data in waitlist table** (at least 5 test records)
- [ ] **Development environment** set up locally (`npm install` complete)
- [ ] **dev server running** (`npm run dev`)

---

## ⚡ QUICK COMMANDS

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Create new migration
touch supabase/migrations/20260220_YYYYMMDD_description.sql

# Deploy migration to Supabase
supabase db push
```

---

## 🎯 IMPLEMENTATION STEPS

### Step 1: Database Setup (30 mins)
**File:** `supabase/migrations/20260220_waitlist_special_pricing.sql`

1. Copy migration content from `PHASE2-WAITLIST-PRICING.md`
2. Save to `supabase/migrations/` with timestamp filename
3. Run: `supabase db push`
4. Verify table created in Supabase dashboard

**Checklist:**
- [ ] Migration file created
- [ ] Migration executed successfully
- [ ] Table visible in Supabase dashboard
- [ ] Indexes created
- [ ] RLS policies enabled

### Step 2: Backend Functions (1-2 hours)

**Function 1:** Promo Code Generator
- **File:** `supabase/functions/generate-waitlist-promo/index.ts`
- **What it does:** Creates unique promo codes for waitlist customers
- **Test:** Use Supabase dashboard to invoke with test data

**Function 2:** Email Notifications
- **File:** `supabase/functions/send-waitlist-pricing-notification/index.ts`
- **What it does:** Sends email with promo code to customers
- **Test:** Mock email service first, then integrate real service

**Checklist:**
- [ ] Both functions created in correct directory
- [ ] Code copied from guide
- [ ] Deno syntax verified (`deno lint`)
- [ ] Functions can be invoked in Supabase dashboard
- [ ] Return values match expected format

### Step 3: Frontend Components (2-3 hours)

**Component 1:** Promo Code Input
- **File:** `src/components/PromoCodeInput.tsx`
- **Usage:** Add to checkout flow

**Component 2:** Admin Dashboard
- **File:** `src/pages/AdminWaitlistPricing.tsx`
- **Route:** `/admin/waitlist-pricing`
- **Protection:** Require admin role

**Component 3:** Update Stripe Integration
- **File:** `src/lib/stripe-utils.ts`
- **Function:** `applyPromoCode()`

**Checklist:**
- [ ] Components created and typed with TypeScript
- [ ] Promo code input validates format
- [ ] Admin dashboard displays all codes
- [ ] Discount calculation verified
- [ ] Stripe integration applied discount

### Step 4: Testing (1 hour)

**Database Testing:**
```sql
-- Test promo code creation
SELECT * FROM waitlist_special_pricing WHERE status = 'pending';

-- Test expiration check
SELECT * FROM waitlist_special_pricing WHERE valid_until < NOW();

-- Test usage tracking
SELECT * FROM waitlist_special_pricing WHERE status = 'activated';
```

**Function Testing:**
- Invoke promo generator in Supabase dashboard
- Verify unique code created
- Test with expired dates
- Test with duplicate promos

**UI Testing:**
- Input valid promo code
- Input invalid promo code
- Apply discount to cart
- Verify price reduction
- Complete test purchase

**Checklist:**
- [ ] All database queries return expected results
- [ ] Functions handle edge cases
- [ ] UI displays errors gracefully
- [ ] Price calculations accurate
- [ ] Email notifications send successfully

---

## 🎨 COMPONENT TEMPLATES

### PromoCodeInput Component

```tsx
// src/components/PromoCodeInput.tsx
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PromoCodeInput({ onApply }: { onApply: (discount: any) => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleApply() {
    setLoading(true);
    setError("");
    try {
      // Call your promo code validation API
      const response = await fetch("/api/validate-promo", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        onApply(data);
      }
    } catch (err) {
      setError("Failed to apply promo code");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label>Promo Code</label>
      <div className="flex gap-2">
        <Input 
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="SKINLYTIX_XXXXX"
        />
        <Button onClick={handleApply} disabled={loading}>
          {loading ? "Validating..." : "Apply"}
        </Button>
      </div>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
```

---

## 📊 DATABASE SCHEMA REFERENCE

**Table: waitlist_special_pricing**

| Column | Type | Purpose |
|--------|------|---------|
| id | UUID | Primary key |
| waitlist_user_id | UUID | FK to waitlist |
| user_id | UUID | FK to auth.users (nullable until signup) |
| promo_code | TEXT | Unique code (e.g., SKINLYTIX_ABC123) |
| tier_offering | VARCHAR | 'pro' or 'premium' |
| discount_percentage | INTEGER | 0-100 |
| original_price | DECIMAL | Full price |
| discounted_price | DECIMAL | Discounted price |
| valid_from | TIMESTAMP | Start date |
| valid_until | TIMESTAMP | Expiration date |
| email_sent_at | TIMESTAMP | When email was sent |
| status | VARCHAR | pending, sent, activated, expired, cancelled |
| created_at | TIMESTAMP | Record creation |
| updated_at | TIMESTAMP | Last updated |

---

## 🔄 DATA FLOW

```
Waitlist Customer
     ↓
[Promo Code Generated]
     ↓
[Email Sent with Code]
     ↓
[Customer Clicks Link]
     ↓
[Signs Up / Creates Account]
     ↓
[Enters Promo Code at Checkout]
     ↓
[Code Validated in Database]
     ↓
[Discount Applied]
     ↓
[Stripe Charged Discounted Amount]
     ↓
[Status Updated to 'activated']
     ↓
[Subscription Created]
```

---

## ✅ FINAL CHECKLIST

### Code Checklist
- [ ] Migration file created & deployed
- [ ] Edge functions created & tested
- [ ] React components created with TypeScript
- [ ] Stripe integration updated
- [ ] No TypeScript errors (`npm run lint`)
- [ ] All imports resolved

### Testing Checklist
- [ ] Database: Create promo code
- [ ] Database: Validate code format
- [ ] Database: Check expiration
- [ ] Database: Track usage
- [ ] API: Generate code endpoint works
- [ ] API: Validate code endpoint works
- [ ] UI: Promo input displays
- [ ] UI: Discount applied correctly
- [ ] Stripe: Discounted charge processed
- [ ] Email: Notifications sent

### UAT Checklist
- [ ] Customer receives email with promo code
- [ ] Customer can use code at checkout
- [ ] Discount appears on invoice
- [ ] Admin can view all codes in dashboard
- [ ] Admin can see usage statistics
- [ ] Expired codes are rejected
- [ ] Already-used codes are rejected

---

## 🆘 TROUBLESHOOTING

| Issue | Solution |
|-------|----------|
| Migration fails | Check SQL syntax, run in Supabase dashboard first |
| Function not invoking | Verify edge function directory name and format |
| Promo code not validating | Check valid_until date, status field |
| Email not sending | Configure email service, check API keys |
| Discount not applying | Verify Stripe integration, check tier_offering value |

---

## 📞 SUPPORT

**Questions about:**
- **Database schema** → Check PHASE2-WAITLIST-PRICING.md
- **Implementation flow** → Check SOW-GAME-PLAN.md
- **Stripe integration** → Check src/lib/stripe-utils.ts
- **TypeScript errors** → Run `npm run lint`

---

## 🎯 SUCCESS CRITERIA

Phase 2 is complete when:

✅ Promo codes generate with unique format  
✅ Codes validate against database  
✅ Discounts apply at checkout  
✅ Emails send to waitlist customers  
✅ Admin can track code usage  
✅ Expired codes are rejected  
✅ Already-used codes are rejected  
✅ All TypeScript types correct  
✅ No console errors in browser  
✅ Stripe charges discounted amount  

---

**Timeline:** Feb 20-26, 2026  
**Effort Estimate:** 5-6 development hours + testing  
**Next Phase:** Kiosk Mode (Feb 26 - Mar 5)

**Ready to start? Follow Step 1 above.** 🚀
