import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { userEmail, role } = await req.json();
    const normalizedRole = String(role || "").trim().toLowerCase();
    const allowedRoles = new Set(["admin", "moderator", "reviewer", "user"]);

    if (!userEmail || !normalizedRole || !allowedRoles.has(normalizedRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid payload. userEmail and a valid role are required." }),
        { status: 400, headers: corsHeaders }
      );
    }

    // Create Supabase client with service role (has full permissions)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data: callerData, error: callerError } = await supabase.auth.getUser(token);
    if (callerError || !callerData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const callerId = callerData.user.id;
    const callerEmail = String(callerData.user.email || "").trim().toLowerCase();
    const bootstrapAdmins = (
      Deno.env.get("ADMIN_BOOTSTRAP_EMAILS") || "cedric.evans@gmail.com,pte295@gmail.com"
    )
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);
    const isBootstrapAdmin = bootstrapAdmins.includes(callerEmail);

    const { data: callerRoles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const canManageRoles = isBootstrapAdmin || Boolean(
      callerRoles?.some((row) => row.role === "admin" || row.role === "moderator")
    );

    if (!canManageRoles) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    // Get user by email from profiles
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", userEmail);

    if (profileError || !profileData || profileData.length === 0) {
      return new Response(
        JSON.stringify({ error: `User not found with email: ${userEmail}` }),
        { status: 404, headers: corsHeaders }
      );
    }

    const userId = profileData[0].id;

    // Check if role already exists
    const { data: existing } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", normalizedRole);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: `User already has the ${normalizedRole} role` }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Insert the role (service role bypasses RLS)
    const { data, error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role: normalizedRole })
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
