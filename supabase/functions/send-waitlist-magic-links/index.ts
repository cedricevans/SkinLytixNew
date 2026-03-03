import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SendMode = "pending" | "single";

type Payload = {
  mode?: SendMode;
  email?: string;
  redirectTo?: string;
  limit?: number;
  dryRun?: boolean;
};

type WaitlistOffer = {
  id: string;
  email: string;
  promo_code: string;
  tier_offering: "premium" | "pro";
  billing_cycle: "monthly" | "annual" | null;
  discount_percentage: number;
  status: "pending" | "sent" | "activated" | "expired" | "cancelled";
  valid_from: string;
  valid_until: string;
  metadata: Record<string, unknown> | null;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const resolveRedirectTo = (provided: string | undefined, fallbackOrigin: string | null, siteUrl: string | undefined) => {
  const candidate = (provided || "").trim();
  if (candidate.startsWith("http://") || candidate.startsWith("https://")) return candidate;

  const base = (siteUrl || fallbackOrigin || "").replace(/\/$/, "");
  if (!base) return "https://app.skinlytix.com/home";
  return `${base}/home`;
};

const buildMagicLinkHtml = ({
  offer,
  magicLink,
}: {
  offer: WaitlistOffer;
  magicLink: string;
}) => {
  const cycleLabel = offer.billing_cycle ? ` (${offer.billing_cycle})` : "";
  const planLabel = `${offer.tier_offering}${cycleLabel}`;
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
      <p>Hi there,</p>
      <p>Your SkinLytix waitlist access is ready.</p>
      <p>
        You have a special offer for <strong>${planLabel}</strong>:
        <strong>${offer.discount_percentage}% off</strong>.
      </p>
      <p style="margin: 20px 0;">
        <a href="${magicLink}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none;">
          Activate Your Waitlist Access
        </a>
      </p>
      <p style="font-size:12px;color:#6b7280;">
        If the button does not work, copy this link into your browser:
      </p>
      <p style="word-break:break-all;font-size:12px;color:#374151;">${magicLink}</p>
      <p style="font-size:12px;color:#6b7280;">Promo code: ${offer.promo_code}</p>
    </div>
  `;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actor = userData.user;
    const { data: adminRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", actor.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const mode: SendMode = body.mode === "single" ? "single" : "pending";
    const limit = Math.min(100, Math.max(1, Number(body.limit || 25)));
    const dryRun = Boolean(body.dryRun);

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "SkinLytix";

    if (!brevoApiKey || !senderEmail) {
      return new Response(JSON.stringify({ error: "Missing BREVO_API_KEY or BREVO_SENDER_EMAIL secret" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const redirectTo = resolveRedirectTo(
      body.redirectTo,
      req.headers.get("origin"),
      Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL"),
    );

    let offersQuery = supabase
      .from("waitlist_special_pricing")
      .select("*")
      .gt("valid_until", new Date().toISOString())
      .limit(limit);

    if (mode === "single") {
      const email = normalizeEmail(body.email || "");
      if (!email) {
        return new Response(JSON.stringify({ error: "Email is required in single mode" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      offersQuery = offersQuery
        .ilike("email", email)
        .in("status", ["pending", "sent"])
        .order("updated_at", { ascending: false });
    } else {
      offersQuery = offersQuery
        .eq("status", "pending")
        .order("created_at", { ascending: true });
    }

    const { data: offers, error: offersError } = await offersQuery;
    if (offersError) {
      return new Response(JSON.stringify({ error: offersError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validOffers = (offers || []) as WaitlistOffer[];
    if (validOffers.length === 0) {
      return new Response(
        JSON.stringify({
          ok: true,
          mode,
          attempted: 0,
          sent: 0,
          failed: 0,
          redirectTo,
          results: [],
          message: "No eligible waitlist offers found for this request.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results: Array<{ email: string; offer_id: string; ok: boolean; message: string; message_id?: string | null }> = [];
    let sent = 0;
    let failed = 0;

    for (const offer of validOffers) {
      try {
        const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: offer.email,
          options: { redirectTo },
        });

        if (linkError) {
          failed += 1;
          results.push({
            email: offer.email,
            offer_id: offer.id,
            ok: false,
            message: `Magic link generation failed: ${linkError.message}`,
          });
          continue;
        }

        const magicLink = linkData?.properties?.action_link;
        if (!magicLink) {
          failed += 1;
          results.push({
            email: offer.email,
            offer_id: offer.id,
            ok: false,
            message: "Magic link generation returned no action_link",
          });
          continue;
        }

        if (dryRun) {
          sent += 1;
          results.push({
            email: offer.email,
            offer_id: offer.id,
            ok: true,
            message: "Dry run: magic link generated (not sent)",
            message_id: null,
          });
          continue;
        }

        const subject = "Your SkinLytix waitlist access is ready";
        const htmlContent = buildMagicLinkHtml({ offer, magicLink });

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
          method: "POST",
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sender: { email: senderEmail, name: senderName },
            to: [{ email: offer.email }],
            subject,
            htmlContent,
          }),
        });

        const brevoData = await brevoResponse.json().catch(() => ({}));
        if (!brevoResponse.ok) {
          failed += 1;
          results.push({
            email: offer.email,
            offer_id: offer.id,
            ok: false,
            message: `Brevo send failed (${brevoResponse.status})`,
          });
          continue;
        }

        const existingMetadata =
          offer.metadata && typeof offer.metadata === "object" && !Array.isArray(offer.metadata)
            ? offer.metadata
            : {};

        const previousCount = Number((existingMetadata as Record<string, unknown>).magic_link_send_count || 0);
        const nowIso = new Date().toISOString();
        const messageId = (brevoData as Record<string, unknown>)?.messageId as string | undefined;
        const mergedMetadata = {
          ...existingMetadata,
          last_magic_link_sent_at: nowIso,
          last_magic_link_message_id: messageId || null,
          magic_link_send_count: previousCount + 1,
          last_magic_link_redirect_to: redirectTo,
        };

        const { error: updateError } = await supabase
          .from("waitlist_special_pricing")
          .update({
            status: offer.status === "pending" ? "sent" : offer.status,
            email_sent_at: nowIso,
            metadata: mergedMetadata,
          })
          .eq("id", offer.id);

        if (updateError) {
          failed += 1;
          results.push({
            email: offer.email,
            offer_id: offer.id,
            ok: false,
            message: `Email sent but tracking update failed: ${updateError.message}`,
            message_id: messageId || null,
          });
          continue;
        }

        sent += 1;
        results.push({
          email: offer.email,
          offer_id: offer.id,
          ok: true,
          message: "Magic link sent",
          message_id: messageId || null,
        });
      } catch (error) {
        failed += 1;
        results.push({
          email: offer.email,
          offer_id: offer.id,
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    await supabase.from("audit_logs").insert({
      action: "send_waitlist_magic_links",
      admin_id: actor.id,
      admin_email: actor.email || null,
      details: {
        mode,
        dry_run: dryRun,
        limit,
        redirect_to: redirectTo,
        attempted: validOffers.length,
        sent,
        failed,
        sample_results: results.slice(0, 10),
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        mode,
        dryRun,
        attempted: validOffers.length,
        sent,
        failed,
        redirectTo,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
