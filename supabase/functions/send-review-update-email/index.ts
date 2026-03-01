import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  analysisId?: string;
  ingredientName?: string;
  validationStatus?: string;
  finalLabel?: string;
  verdict?: string;
};

const normalizeLabel = (value?: string | null) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "safe") return "Safe";
  if (normalized === "concern") return "Concern";
  if (normalized === "needs_more_data" || normalized === "needs more data") return "Needs More Data";
  return "Updated";
};

const escapeHtml = (input: string) =>
  input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

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

    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const reviewerId = userData.user.id;

    const body = (await req.json().catch(() => ({}))) as Payload;
    const analysisId = body.analysisId;
    if (!analysisId) {
      return new Response(JSON.stringify({ error: "analysisId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Gate: only reviewer/admin/moderator roles can send update emails.
    const [{ data: roles }, { data: certs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", reviewerId),
      supabase.from("student_certifications").select("id").eq("user_id", reviewerId).limit(1),
    ]);
    const hasPrivilegedRole = Boolean(
      roles?.some((row) => row.role === "admin" || row.role === "moderator")
    );
    const isCertifiedReviewer = Boolean(certs && certs.length > 0);
    if (!hasPrivilegedRole && !isCertifiedReviewer) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: analysis, error: analysisError } = await supabase
      .from("user_analyses")
      .select("id, user_id, product_name, brand, category, epiq_score")
      .eq("id", analysisId)
      .maybeSingle();

    if (analysisError || !analysis) {
      return new Response(JSON.stringify({ error: "Analysis not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ownerProfile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("id", analysis.user_id)
      .maybeSingle();

    let ownerEmail = ownerProfile?.email?.trim();
    let greetingName = ownerProfile?.display_name?.trim() || "there";

    // Fallback: use Auth user email if profile email is empty.
    if (!ownerEmail) {
      const { data: ownerAuthData } = await supabase.auth.admin.getUserById(analysis.user_id);
      ownerEmail = ownerAuthData?.user?.email?.trim();
      const authName =
        ownerAuthData?.user?.user_metadata?.display_name ||
        ownerAuthData?.user?.user_metadata?.full_name ||
        ownerAuthData?.user?.user_metadata?.name;
      if (!ownerProfile?.display_name && typeof authName === "string" && authName.trim()) {
        greetingName = authName.trim();
      }
    }

    if (!ownerEmail) {
      await supabase.from("user_events").insert({
        user_id: analysis.user_id,
        event_name: "review_update_email_skipped",
        event_category: "verification",
        event_properties: {
          analysis_id: analysisId,
          ingredient_name: body.ingredientName || null,
          skip_reason: "owner_email_missing",
        },
        page_url: `/analysis/${analysisId}`,
      });

      return new Response(JSON.stringify({ ok: true, skipped: "owner_email_missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ingredientName = body.ingredientName || "an ingredient";
    const statusText = normalizeLabel(body.finalLabel);
    const scoreText = typeof analysis.epiq_score === "number" ? String(analysis.epiq_score) : "Updated";
    const productName = analysis.product_name || "your product";
    const brandName = (analysis as any)?.brand ? String((analysis as any).brand) : "Not specified";
    const categoryName = (analysis as any)?.category ? String((analysis as any).category) : "Not specified";

    const { data: latestValidation } = await supabase
      .from("ingredient_validations")
      .select("updated_at")
      .eq("analysis_id", analysisId)
      .eq("ingredient_name", ingredientName)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const reviewedAtRaw = latestValidation?.updated_at || new Date().toISOString();
    const reviewedAtText = new Date(reviewedAtRaw).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "America/New_York",
    });

    const siteUrl = (Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL") || "").replace(/\/$/, "");
    const analysisPath = `/analysis/${analysisId}?reviewUpdate=1`;
    const reviewUrl = siteUrl ? `${siteUrl}${analysisPath}` : "";

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
    const senderName = Deno.env.get("BREVO_SENDER_NAME") || "SkinLytix";
    if (!brevoApiKey || !senderEmail) {
      return new Response(
        JSON.stringify({ error: "Missing BREVO_API_KEY or BREVO_SENDER_EMAIL secret" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const escapedName = escapeHtml(greetingName);
    const escapedProduct = escapeHtml(productName);
    const escapedIngredient = escapeHtml(ingredientName);
    const escapedStatus = escapeHtml(statusText);
    const escapedBrand = escapeHtml(brandName);
    const escapedCategory = escapeHtml(categoryName);
    const escapedReviewedAt = escapeHtml(reviewedAtText);

    const subject = `Your scan has an expert update: ${productName}`;
    const htmlContent = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
        <p>Hi ${escapedName},</p>
        <p>
          An ingredient in your recent scan has been reviewed by our Cosmetic Science Analysts and
          strengthened with peer-reviewed validation to ensure accuracy and clarity.
        </p>
        <p><strong>What was updated:</strong></p>
        <ul>
          <li><strong>Product:</strong> ${escapedProduct}</li>
          <li><strong>Brand:</strong> ${escapedBrand}</li>
          <li><strong>Category:</strong> ${escapedCategory}</li>
          <li><strong>Ingredient:</strong> ${escapedIngredient}</li>
          <li><strong>Updated expert label:</strong> ${escapedStatus}</li>
          <li><strong>Last reviewed:</strong> ${escapedReviewedAt} ET</li>
          <li><strong>Current EpiQ score:</strong> ${scoreText}</li>
        </ul>
        ${
          reviewUrl
            ? `<p><a href="${reviewUrl}" style="display:inline-block;background:#111827;color:#ffffff;padding:10px 14px;border-radius:8px;text-decoration:none;">View Updated Scan</a></p>`
            : `<p>Open SkinLytix to view your updated scan.</p>`
        }
        <p>Open your report to review the full expert update and latest recommendations.</p>
        <p style="color:#6b7280;font-size:12px;">This message was triggered by reviewer verification activity.</p>
      </div>
    `;

    const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": brevoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: ownerEmail }],
        subject,
        htmlContent,
      }),
    });

    const brevoData = await brevoResponse.json().catch(() => ({}));
    if (!brevoResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Brevo send failed",
          details: brevoData,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase.from("user_events").insert({
      user_id: analysis.user_id,
      event_name: "review_update_email_sent",
      event_category: "verification",
      event_properties: {
        analysis_id: analysisId,
        ingredient_name: ingredientName,
        validation_status: body.validationStatus || null,
        final_label: body.finalLabel || null,
        verdict: body.verdict || null,
        email_to: ownerEmail,
        channel: "brevo_api",
        review_url: reviewUrl || null,
        brevo_message_id: brevoData?.messageId || null,
      },
      page_url: `/analysis/${analysisId}`,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        email_to: ownerEmail,
        channel: "brevo_api",
        review_url: reviewUrl || null,
        provider_response: brevoData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
