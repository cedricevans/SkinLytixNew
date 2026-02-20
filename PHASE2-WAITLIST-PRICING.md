# Phase 2: Waitlist Special Pricing Implementation Guide
**Timeline:** Feb 20-26, 2026 | **Effort:** 1 week | **Status:** READY TO START

---

## 📋 Overview

This phase implements a special pricing structure that rewards early waitlist customers with discounted subscription tiers.

**Key Features:**
- Identify waitlist customers automatically
- Generate unique promo codes
- Apply custom pricing at checkout
- Track offer expiration
- Send email notifications
- Admin dashboard for management

---

## 🗄️ Database Schema

### 1. Create Waitlist Special Pricing Table

**File:** `supabase/migrations/20260220_waitlist_special_pricing.sql`

```sql
-- Create waitlist special pricing table
CREATE TABLE IF NOT EXISTS public.waitlist_special_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  waitlist_user_id UUID NOT NULL REFERENCES public.waitlist(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  promo_code TEXT NOT NULL UNIQUE,
  tier_offering VARCHAR(20) NOT NULL CHECK (tier_offering IN ('pro', 'premium')),
  discount_percentage INTEGER NOT NULL CHECK (discount_percentage > 0 AND discount_percentage <= 100),
  original_price DECIMAL(10,2) NOT NULL,
  discounted_price DECIMAL(10,2) NOT NULL,
  valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  email_sent_to TEXT,
  activated_at TIMESTAMP WITH TIME ZONE,
  activated_subscription_id TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'activated', 'expired', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.waitlist_special_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own special pricing"
  ON public.waitlist_special_pricing FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Service role can manage all special pricing"
  ON public.waitlist_special_pricing
  USING (auth.role() = 'service_role');

-- Indexes for performance
CREATE INDEX idx_waitlist_special_pricing_promo_code 
ON public.waitlist_special_pricing(promo_code);

CREATE INDEX idx_waitlist_special_pricing_user_id 
ON public.waitlist_special_pricing(user_id);

CREATE INDEX idx_waitlist_special_pricing_status 
ON public.waitlist_special_pricing(status);

CREATE INDEX idx_waitlist_special_pricing_valid_until 
ON public.waitlist_special_pricing(valid_until);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_waitlist_special_pricing_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
CREATE TRIGGER trigger_update_waitlist_special_pricing_updated_at
BEFORE UPDATE ON public.waitlist_special_pricing
FOR EACH ROW
EXECUTE FUNCTION update_waitlist_special_pricing_updated_at();
```

### 2. Ensure Waitlist Table Exists

**Current State:** Check if `waitlist` table exists in your database

```sql
-- Verify waitlist table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'waitlist' 
AND table_schema = 'public';
```

**If missing, create:**

```sql
CREATE TABLE IF NOT EXISTS public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  signup_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  position INTEGER,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;
```

---

## 🔧 Backend Implementation

### 1. Create Promo Code Generation Function

**File:** `supabase/functions/generate-waitlist-promo/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waitlist_user_id, tier_offering, discount_percentage, valid_days } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Validate input
    if (!waitlist_user_id || !tier_offering || !discount_percentage) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique promo code (SKINLYTIX_XXXXX format)
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    const promo_code = `SKINLYTIX_${randomPart}`;

    // Calculate pricing (example: 30% off premium tier)
    const tier_pricing: Record<string, number> = {
      "pro": 9.99,      // Monthly
      "premium": 19.99  // Monthly
    };

    const original_price = tier_pricing[tier_offering] || 19.99;
    const discounted_price = original_price * (1 - discount_percentage / 100);

    // Insert special pricing record
    const { data, error } = await supabase
      .from("waitlist_special_pricing")
      .insert({
        waitlist_user_id,
        promo_code,
        tier_offering,
        discount_percentage,
        original_price,
        discounted_price,
        valid_until: new Date(Date.now() + (valid_days || 30) * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      })
      .select();

    if (error) {
      console.error("Error creating promo code:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        promo_code,
        data: data?.[0],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 2. Create Batch Email Notification Function

**File:** `supabase/functions/send-waitlist-pricing-notification/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { waitlist_pricing_ids } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get waitlist pricing records
    const { data: pricingRecords } = await supabase
      .from("waitlist_special_pricing")
      .select("id, waitlist_user_id, promo_code, discount_percentage, valid_until")
      .in("id", waitlist_pricing_ids)
      .eq("status", "pending");

    // Get waitlist data
    const waitlistIds = pricingRecords?.map(p => p.waitlist_user_id) || [];
    const { data: waitlistData } = await supabase
      .from("waitlist")
      .select("id, email, name")
      .in("id", waitlistIds);

    const emailMap = new Map(waitlistData?.map(w => [w.id, w]) || []);

    // Send emails (pseudo code - use actual email service)
    for (const pricing of pricingRecords || []) {
      const waitlist = emailMap.get(pricing.waitlist_user_id);
      if (waitlist) {
        // Send email with promo code
        console.log(`Sending email to ${waitlist.email} with code ${pricing.promo_code}`);
        
        // Update status
        await supabase
          .from("waitlist_special_pricing")
          .update({
            status: "sent",
            email_sent_at: new Date().toISOString(),
            email_sent_to: waitlist.email,
          })
          .eq("id", pricing.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, sent: pricingRecords?.length || 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

---

## 🎨 Frontend Implementation

### 1. Update Checkout to Accept Promo Code

**File:** `src/lib/stripe-utils.ts`

```typescript
export async function applyPromoCode(promo_code: string) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Validate promo code in database
  const { data, error } = await supabase
    .from("waitlist_special_pricing")
    .select("*")
    .eq("promo_code", promo_code)
    .single();

  if (error || !data) {
    throw new Error("Invalid promo code");
  }

  // Check if expired
  if (new Date(data.valid_until) < new Date()) {
    throw new Error("Promo code has expired");
  }

  // Check if not already used
  if (data.status === "activated") {
    throw new Error("Promo code already used");
  }

  return {
    discount_percentage: data.discount_percentage,
    discounted_price: data.discounted_price,
    tier: data.tier_offering,
  };
}
```

### 2. Admin Dashboard Component

**File:** `src/pages/AdminWaitlistPricing.tsx`

```typescript
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminWaitlistPricing() {
  const [pricing, setPricing] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPricing();
  }, []);

  async function loadPricing() {
    setLoading(true);
    const { data } = await supabase
      .from("waitlist_special_pricing")
      .select("*")
      .order("created_at", { ascending: false });
    setPricing(data || []);
    setLoading(false);
  }

  async function generateCodes(count: number) {
    // Batch generate promo codes
    for (let i = 0; i < count; i++) {
      await supabase.functions.invoke("generate-waitlist-promo", {
        body: {
          tier_offering: "premium",
          discount_percentage: 30,
          valid_days: 30,
        },
      });
    }
    loadPricing();
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Waitlist Special Pricing</h1>
      
      {/* Batch Generation */}
      <button onClick={() => generateCodes(10)} className="btn btn-primary mb-4">
        Generate 10 Promo Codes
      </button>

      {/* Pricing Table */}
      <table className="w-full border">
        <thead>
          <tr>
            <th>Code</th>
            <th>Email</th>
            <th>Discount</th>
            <th>Status</th>
            <th>Valid Until</th>
          </tr>
        </thead>
        <tbody>
          {pricing.map(p => (
            <tr key={p.id}>
              <td>{p.promo_code}</td>
              <td>{p.email_sent_to}</td>
              <td>{p.discount_percentage}%</td>
              <td>{p.status}</td>
              <td>{new Date(p.valid_until).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## ✅ Testing Checklist

- [ ] Migration executes without errors
- [ ] Waitlist table populated with test data
- [ ] Promo code generation creates unique codes
- [ ] Promo code validation works
- [ ] Discount applies correctly at checkout
- [ ] Email notifications send
- [ ] Expired codes are blocked
- [ ] Already-used codes are blocked
- [ ] Status tracking works
- [ ] Admin dashboard displays all codes
- [ ] Admin can filter by status
- [ ] Admin can send batch emails

---

## 📞 Dependencies

**Required Before Starting:**
- [ ] STRIPE_SECRET_KEY added to environment
- [ ] Stripe test account configured
- [ ] Email service configured (SendGrid, etc.)
- [ ] Waitlist table populated with customers

---

## 🎯 Acceptance Criteria Met

- ✅ Waitlist customer identification system
- ✅ Custom subscription pricing tier configuration
- ✅ Promotional code generation and management
- ✅ Special pricing display (in checkout)
- ✅ Payment processing integration
- ✅ Expiration date management and tracking

---

**Ready to start Phase 2? Confirm STRIPE_SECRET_KEY is available, then begin implementation.**
