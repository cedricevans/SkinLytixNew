import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KIOSK_EMAIL = "kiosk@skinlytix.com";

type Payload = {
  email?: string;
  expiresInMinutes?: number;
  redirectBaseUrl?: string;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

const normalizeBaseUrl = (raw: string) => {
  const value = raw.trim();
  if (!value.startsWith("http://") && !value.startsWith("https://")) return "";

  try {
    const url = new URL(value);
    if (url.hostname.toLowerCase() === "skinlytix.com") {
      url.hostname = "www.skinlytix.com";
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
};

const resolveClaimUrl = (params: {
  token: string;
  redirectBaseUrl?: string;
  requestOrigin?: string | null;
  siteUrl?: string | null;
}) => {
  const candidate = normalizeBaseUrl(params.redirectBaseUrl || "");
  if (candidate) {
    return `${candidate}/kiosk/claim?token=${encodeURIComponent(params.token)}`;
  }

  // Prefer the active request origin so generated links match the current environment.
  const requestOrigin = normalizeBaseUrl(params.requestOrigin || "");
  const siteUrl = normalizeBaseUrl(params.siteUrl || "");
  const base = requestOrigin || siteUrl || "https://www.skinlytix.com";
  return `${base}/kiosk/claim?token=${encodeURIComponent(params.token)}`;
};

const buildTransferEmailHtml = (params: {
  claimUrl: string;
  scansCount: number;
  expiresInMinutes: number;
}) => `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111827;">
    <p>Your SkinLytix kiosk session is ready to claim.</p>
    <p>
      Captured scans: <strong>${params.scansCount}</strong><br />
      Link expires in: <strong>${params.expiresInMinutes} minutes</strong>
    </p>
    <p style="margin: 20px 0;">
      <a href="${params.claimUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#111827;color:#ffffff;padding:12px 16px;border-radius:8px;text-decoration:none;">
        Claim My Kiosk Session
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">
      If the button does not work, copy this link into your browser:
    </p>
    <p style="word-break:break-all;font-size:12px;color:#374151;">${params.claimUrl}</p>
  </div>
`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const accessToken = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: userData, error: userError } = await supabaseAuth.auth.getUser(accessToken);
    if (userError || !userData.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actor = userData.user;
    if (normalizeEmail(actor.email) !== KIOSK_EMAIL) {
      return new Response(JSON.stringify({ error: "Only kiosk account can create kiosk transfers." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = (await req.json().catch(() => ({}))) as Payload;
    const recipientEmail = payload.email ? normalizeEmail(payload.email) : "";
    const expiresInMinutes = Math.min(120, Math.max(5, Number(payload.expiresInMinutes || 30)));

    const { data: analyses, error: analysesError } = await supabaseAdmin
      .from("user_analyses")
      .select("id")
      .eq("user_id", actor.id);

    if (analysesError) throw analysesError;

    const analysisIds = (analyses || []).map((row) => row.id).filter(Boolean);
    if (analysisIds.length === 0) {
      return new Response(JSON.stringify({ error: "No kiosk scans found to transfer." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transferToken = `${crypto.randomUUID().replace(/-/g, "")}${crypto.randomUUID().replace(/-/g, "")}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInMinutes * 60 * 1000).toISOString();
    const claimUrl = resolveClaimUrl({
      token: transferToken,
      redirectBaseUrl: payload.redirectBaseUrl,
      requestOrigin: req.headers.get("origin"),
      siteUrl: Deno.env.get("SITE_URL") || Deno.env.get("PUBLIC_SITE_URL"),
    });

    const { data: sessionRow, error: sessionError } = await supabaseAdmin
      .from("kiosk_transfer_sessions")
      .insert({
        kiosk_user_id: actor.id,
        recipient_email: recipientEmail || null,
        transfer_token: transferToken,
        status: "created",
        claim_url: claimUrl,
        expires_at: expiresAt,
      })
      .select("id")
      .single();

    if (sessionError || !sessionRow?.id) {
      throw sessionError || new Error("Failed to create transfer session");
    }

    const transferItems = analysisIds.map((analysisId) => ({
      session_id: sessionRow.id,
      analysis_id: analysisId,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("kiosk_transfer_items")
      .insert(transferItems);

    if (itemsError) throw itemsError;

    let messageId: string | null = null;

    if (recipientEmail) {
      const brevoApiKey = Deno.env.get("BREVO_API_KEY");
      const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL");
      const senderName = Deno.env.get("BREVO_SENDER_NAME") || "SkinLytix";

      if (!brevoApiKey || !senderEmail) {
        return new Response(JSON.stringify({ error: "Missing BREVO_API_KEY or BREVO_SENDER_EMAIL secret." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: recipientEmail,
        options: { redirectTo: claimUrl },
      });

      if (linkError) {
        return new Response(JSON.stringify({ error: `Magic link generation failed: ${linkError.message}` }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const actionLink = linkData?.properties?.action_link || claimUrl;
      const htmlContent = buildTransferEmailHtml({
        claimUrl: actionLink,
        scansCount: analysisIds.length,
        expiresInMinutes,
      });

      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "api-key": brevoApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sender: { email: senderEmail, name: senderName },
          to: [{ email: recipientEmail }],
          subject: "Claim your SkinLytix kiosk session",
          htmlContent,
        }),
      });

      const brevoData = await brevoResponse.json().catch(() => ({}));
      if (!brevoResponse.ok) {
        return new Response(JSON.stringify({ error: `Brevo send failed (${brevoResponse.status})` }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      messageId = (brevoData as Record<string, unknown>)?.messageId as string | null;
      await supabaseAdmin
        .from("kiosk_transfer_sessions")
        .update({
          status: "magic_link_sent",
          magic_link_sent_at: now.toISOString(),
          metadata: {
            brevo_message_id: messageId,
            claim_action_link: actionLink,
          },
        })
        .eq("id", sessionRow.id);
    }

    await supabaseAdmin.from("user_events").insert({
      user_id: actor.id,
      event_name: recipientEmail ? "kiosk_magic_link_sent" : "kiosk_transfer_created",
      event_category: "kiosk",
      event_properties: {
        transfer_session_id: sessionRow.id,
        scans_count: analysisIds.length,
        recipient_email: recipientEmail || null,
        expires_in_minutes: expiresInMinutes,
      },
      page_url: req.headers.get("origin") || null,
      user_agent: req.headers.get("user-agent") || null,
    });

    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(claimUrl)}`;

    return new Response(
      JSON.stringify({
        ok: true,
        sessionId: sessionRow.id,
        scansCount: analysisIds.length,
        claimUrl,
        qrUrl,
        expiresAt,
        recipientEmail: recipientEmail || null,
        emailSent: Boolean(recipientEmail),
        messageId,
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
