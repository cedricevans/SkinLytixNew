import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const KIOSK_EMAIL = "kiosk@skinlytix.com";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

const DEFAULT_SITE_URL = "https://www.skinlytix.com";

const normalizeOrigin = (value: string | null | undefined): string | null => {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
};

const resolveRequestOrigin = (req: Request): string => {
  const configuredSite = normalizeOrigin(Deno.env.get("SITE_URL")) || DEFAULT_SITE_URL;
  const configuredAllowed = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((entry) => normalizeOrigin(entry.trim()))
    .filter((entry): entry is string => Boolean(entry));

  const allowedOrigins = new Set<string>([
    configuredSite,
    "https://www.skinlytix.com",
    "https://skinlytix.com",
    "http://localhost:5173",
    "http://localhost:3000",
    ...configuredAllowed,
  ]);

  const requestOrigin = normalizeOrigin(req.headers.get("origin"));
  if (requestOrigin && allowedOrigins.has(requestOrigin)) {
    return requestOrigin;
  }

  return configuredSite;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    if (user.email.toLowerCase() === KIOSK_EMAIL) {
      return new Response(JSON.stringify({ error: "Kiosk account cannot access customer portal." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for stored stripe_customer_id in profiles
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let customerId: string | null = null;

    // First, try the stored customer ID if available
    if (profile?.stripe_customer_id) {
      logStep("Found stored stripe_customer_id", { storedId: profile.stripe_customer_id });
      try {
        // Verify the customer still exists in Stripe
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id);
        if (customer && !customer.deleted) {
          customerId = profile.stripe_customer_id;
          logStep("Verified stored customer exists in Stripe", { customerId });
        } else {
          logStep("Stored customer was deleted in Stripe, will try email lookup");
        }
      } catch (e) {
        logStep("Stored customer ID invalid or not found, will try email lookup", { error: String(e) });
      }
    }

    // Fall back to email lookup if no valid stored customer
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        logStep("Found customer via email lookup", { customerId });
        
        // Update the profile with the found customer ID for future lookups
        await supabaseClient
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id);
        logStep("Updated profile with found customer ID");
      }
    }
    
    if (!customerId) {
      throw new Error("No Stripe customer found for this user. Please subscribe first.");
    }
    
    logStep("Using Stripe customer", { customerId });

    const origin = resolveRequestOrigin(req);
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/profile`,
    });
    
    logStep("Customer portal session created", { sessionId: portalSession.id, url: portalSession.url });

    return new Response(JSON.stringify({ url: portalSession.url }), {
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
