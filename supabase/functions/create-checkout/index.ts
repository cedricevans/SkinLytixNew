import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const KIOSK_EMAIL = "kiosk@skinlytix.com";

// Stripe price IDs for SkinLytix subscription tiers (PRODUCTION)
const PRICE_IDS = {
  premium_monthly: "price_1ScXKURVBtzyxfn0XLp1QfCr",
  premium_annual: "price_1ScXKyRVBtzyxfn0V0g7e97r",
  pro_monthly: "price_1ScXLqRVBtzyxfn09S325eaE",
  pro_annual: "price_1ScXM5RVBtzyxfn0ZoRS6LY5",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

type WaitlistOffer = {
  id: string;
  user_id: string | null;
  email: string;
  promo_code: string;
  tier_offering: "premium" | "pro";
  billing_cycle: "monthly" | "annual" | null;
  discount_percentage: number;
  valid_from: string;
  valid_until: string;
  status: "pending" | "sent" | "activated" | "expired" | "cancelled";
  original_price: number | null;
  discounted_price: number | null;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const isOfferActiveForCheckout = (
  offer: WaitlistOffer,
  plan: "premium" | "pro",
  billingCycle: "monthly" | "annual",
) => {
  if (!offer) return false;
  // "activated" can be set by auth-linking flow before checkout completion.
  if (!["pending", "sent", "activated"].includes(offer.status)) return false;
  if (offer.tier_offering !== plan) return false;
  if (offer.billing_cycle && offer.billing_cycle !== billingCycle) return false;

  const now = Date.now();
  const validFrom = new Date(offer.valid_from).getTime();
  const validUntil = new Date(offer.valid_until).getTime();
  if (Number.isFinite(validFrom) && validFrom > now) return false;
  if (!Number.isFinite(validUntil) || validUntil <= now) return false;
  return true;
};

const pickBestOffer = (offers: WaitlistOffer[]) =>
  [...offers].sort((a, b) => b.discount_percentage - a.discount_percentage)[0] ?? null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }
    if (user.email.toLowerCase() === KIOSK_EMAIL) {
      return new Response(JSON.stringify({ error: "Kiosk account cannot access checkout." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { plan, billingCycle, promoCode } = await req.json();
    logStep("Request params", { plan, billingCycle, hasPromoCode: Boolean(promoCode) });

    // Determine the correct price ID
    const priceKey = `${plan}_${billingCycle}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];
    
    if (!priceId) {
      throw new Error(`Invalid plan or billing cycle: ${plan}, ${billingCycle}`);
    }
    logStep("Price ID resolved", { priceKey, priceId });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Resolve any active waitlist special-pricing offer for this user.
    const normalizedEmail = normalizeEmail(user.email);
    const promoCodeNormalized =
      typeof promoCode === "string" && promoCode.trim().length > 0
        ? promoCode.trim().toUpperCase()
        : null;
    let selectedOffer: WaitlistOffer | null = null;

    try {
      if (promoCodeNormalized) {
        const { data: promoOffer, error: promoError } = await supabaseAdmin
          .from("waitlist_special_pricing")
          .select("*")
          .eq("promo_code", promoCodeNormalized)
          .maybeSingle();

        if (promoError) {
          logStep("Promo lookup error", { message: promoError.message });
        } else if (promoOffer) {
          const ownedByUser =
            promoOffer.user_id === user.id ||
            normalizeEmail(promoOffer.email || "") === normalizedEmail;
          if (ownedByUser && isOfferActiveForCheckout(promoOffer as WaitlistOffer, plan, billingCycle)) {
            selectedOffer = promoOffer as WaitlistOffer;
          }
        }
      }

      if (!selectedOffer) {
        const { data: userOffers, error: userOffersError } = await supabaseAdmin
          .from("waitlist_special_pricing")
          .select("*")
          .eq("user_id", user.id)
          .in("status", ["pending", "sent", "activated"])
          .limit(10);

        if (userOffersError) {
          logStep("User offer lookup error", { message: userOffersError.message });
        } else {
          const eligible = (userOffers || []).filter((offer) =>
            isOfferActiveForCheckout(offer as WaitlistOffer, plan, billingCycle)
          ) as WaitlistOffer[];
          selectedOffer = pickBestOffer(eligible);
        }
      }

      if (!selectedOffer) {
        const { data: emailOffers, error: emailOffersError } = await supabaseAdmin
          .from("waitlist_special_pricing")
          .select("*")
          .ilike("email", normalizedEmail)
          .in("status", ["pending", "sent", "activated"])
          .limit(10);

        if (emailOffersError) {
          logStep("Email offer lookup error", { message: emailOffersError.message });
        } else {
          const eligible = (emailOffers || []).filter((offer) =>
            isOfferActiveForCheckout(offer as WaitlistOffer, plan, billingCycle)
          ) as WaitlistOffer[];
          selectedOffer = pickBestOffer(eligible);
        }
      }
    } catch (lookupError) {
      const message = lookupError instanceof Error ? lookupError.message : String(lookupError);
      logStep("Special pricing lookup failed", { message });
      selectedOffer = null;
    }

    let discounts: Array<{ coupon: string }> | undefined;
    if (selectedOffer) {
      const couponId = `waitlist_${selectedOffer.promo_code}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .slice(0, 40);

      try {
        await stripe.coupons.retrieve(couponId);
      } catch {
        await stripe.coupons.create({
          id: couponId,
          percent_off: selectedOffer.discount_percentage,
          duration: "once",
          name: `Waitlister ${selectedOffer.promo_code}`,
        });
      }

      discounts = [{ coupon: couponId }];
      logStep("Special pricing applied", {
        offerId: selectedOffer.id,
        promoCode: selectedOffer.promo_code,
        discountPercentage: selectedOffer.discount_percentage,
      });

      // Bind the offer to the authenticated user for future lookups.
      await supabaseAdmin
        .from("waitlist_special_pricing")
        .update({
          user_id: user.id,
          status: selectedOffer.status === "pending" ? "sent" : selectedOffer.status,
        })
        .eq("id", selectedOffer.id);
    }

    // Check if a Stripe customer already exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create during checkout");
    }

    const origin = req.headers.get("origin") || "https://yflbjaetupvakadqjhfb.lovableproject.com";
    
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      discounts,
      mode: "subscription",
      success_url: `${origin}/profile?subscription=success`,
      cancel_url: `${origin}/profile?subscription=canceled`,
      metadata: {
        user_id: user.id,
        plan: plan,
        billing_cycle: billingCycle,
        waitlist_special_pricing_id: selectedOffer?.id || "",
        waitlist_promo_code: selectedOffer?.promo_code || "",
        waitlist_discount_percentage: selectedOffer?.discount_percentage?.toString() || "",
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({
      url: session.url,
      specialPricingApplied: Boolean(selectedOffer),
      specialPricing: selectedOffer
        ? {
            promoCode: selectedOffer.promo_code,
            discountPercentage: selectedOffer.discount_percentage,
            tier: selectedOffer.tier_offering,
            billingCycle: selectedOffer.billing_cycle,
            validUntil: selectedOffer.valid_until,
          }
        : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
