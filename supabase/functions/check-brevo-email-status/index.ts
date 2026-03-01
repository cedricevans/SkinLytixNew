import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  mode?: string;
  messageId?: string;
  email?: string;
  limit?: number;
  days?: number;
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
      { auth: { persistSession: false } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actorId = userData.user.id;
    const [{ data: roles }, { data: certs }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", actorId),
      supabase.from("student_certifications").select("id").eq("user_id", actorId).limit(1),
    ]);

    const canAccess = Boolean(
      roles?.some((r) => r.role === "admin" || r.role === "moderator") || (certs && certs.length > 0)
    );

    if (!canAccess) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => ({}))) as Payload;
    const mode = (body.mode || "").trim().toLowerCase();
    const messageId = (body.messageId || "").trim();
    const email = (body.email || "").trim();
    const limit = Math.min(100, Math.max(1, Number(body.limit || 20)));
    const days = Math.min(30, Math.max(1, Number(body.days || 3)));

    const brevoApiKey = Deno.env.get("BREVO_API_KEY");
    if (!brevoApiKey) {
      return new Response(JSON.stringify({ error: "Missing BREVO_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brevoHeaders = {
      "api-key": brevoApiKey,
      "accept": "application/json",
    };

    if (mode === "senders") {
      const response = await fetch("https://api.brevo.com/v3/senders", {
        method: "GET",
        headers: brevoHeaders,
      });
      const data = await response.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          ok: response.ok,
          status: response.status,
          mode: "senders",
          data,
        }),
        {
          status: response.ok ? 200 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!messageId && !email) {
      return new Response(JSON.stringify({ error: "Provide messageId or email (or mode=senders)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams();
    params.set("limit", String(limit));
    params.set("days", String(days));
    if (messageId) params.set("messageId", messageId);
    if (email) params.set("email", email);

    const url = `https://api.brevo.com/v3/smtp/statistics/events?${params.toString()}`;

    const response = await fetch(url, {
      method: "GET",
      headers: brevoHeaders,
    });

    const data = await response.json().catch(() => ({}));

    return new Response(
      JSON.stringify({
        ok: response.ok,
        status: response.status,
        query: { messageId: messageId || null, email: email || null, limit, days },
        data,
      }),
      {
        status: response.ok ? 200 : 502,
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
