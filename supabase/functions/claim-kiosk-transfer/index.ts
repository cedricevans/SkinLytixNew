import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KIOSK_EMAIL = "kiosk@skinlytix.com";

type Payload = {
  token?: string;
};

const normalizeEmail = (value: string) => value.trim().toLowerCase();

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

    const claimant = userData.user;
    if (normalizeEmail(claimant.email) === KIOSK_EMAIL) {
      return new Response(JSON.stringify({ error: "Kiosk account cannot claim transfer sessions." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const token = (body.token || "").trim();
    if (!token) {
      return new Response(JSON.stringify({ error: "Transfer token is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();

    await supabaseAdmin
      .from("kiosk_transfer_sessions")
      .update({ status: "expired" })
      .in("status", ["created", "magic_link_sent"])
      .lt("expires_at", nowIso);

    const { data: session, error: sessionError } = await supabaseAdmin
      .from("kiosk_transfer_sessions")
      .select("id,kiosk_user_id,recipient_email,recipient_user_id,status,expires_at,claimed_at")
      .eq("transfer_token", token)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return new Response(JSON.stringify({ error: "Transfer session not found." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(session.expires_at).getTime() <= Date.now()) {
      await supabaseAdmin
        .from("kiosk_transfer_sessions")
        .update({ status: "expired" })
        .eq("id", session.id);
      return new Response(JSON.stringify({ error: "Transfer session expired." }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.status === "claimed") {
      if (session.recipient_user_id === claimant.id) {
        return new Response(JSON.stringify({
          ok: true,
          alreadyClaimed: true,
          transferredCount: 0,
          sessionId: session.id,
        }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ error: "Transfer session already claimed by another account." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.recipient_email && normalizeEmail(session.recipient_email) !== normalizeEmail(claimant.email)) {
      return new Response(JSON.stringify({ error: "This transfer link was issued to a different email." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items, error: itemsError } = await supabaseAdmin
      .from("kiosk_transfer_items")
      .select("analysis_id")
      .eq("session_id", session.id)
      .is("transferred_at", null);

    if (itemsError) throw itemsError;

    const analysisIds = (items || []).map((item) => item.analysis_id).filter(Boolean);
    if (analysisIds.length === 0) {
      return new Response(JSON.stringify({ error: "No transferable scans were found for this session." }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: movedRows, error: moveError } = await supabaseAdmin
      .from("user_analyses")
      .update({ user_id: claimant.id })
      .in("id", analysisIds)
      .eq("user_id", session.kiosk_user_id)
      .select("id");

    if (moveError) throw moveError;

    const movedIds = (movedRows || []).map((row) => row.id);

    if (movedIds.length > 0) {
      await supabaseAdmin
        .from("kiosk_transfer_items")
        .update({
          transferred_to_user_id: claimant.id,
          transferred_at: nowIso,
        })
        .eq("session_id", session.id)
        .in("analysis_id", movedIds);
    }

    await supabaseAdmin
      .from("kiosk_transfer_sessions")
      .update({
        recipient_user_id: claimant.id,
        status: "claimed",
        claimed_at: nowIso,
      })
      .eq("id", session.id);

    await supabaseAdmin.from("user_events").insert([
      {
        user_id: claimant.id,
        event_name: "kiosk_transfer_claimed",
        event_category: "kiosk",
        event_properties: {
          transfer_session_id: session.id,
          transferred_count: movedIds.length,
        },
        page_url: req.headers.get("origin") || null,
        user_agent: req.headers.get("user-agent") || null,
      },
      {
        user_id: session.kiosk_user_id,
        event_name: "kiosk_transfer_completed",
        event_category: "kiosk",
        event_properties: {
          transfer_session_id: session.id,
          transferred_count: movedIds.length,
          recipient_user_id: claimant.id,
        },
        page_url: req.headers.get("origin") || null,
        user_agent: req.headers.get("user-agent") || null,
      },
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        sessionId: session.id,
        transferredCount: movedIds.length,
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
