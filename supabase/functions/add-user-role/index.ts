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
    const { userEmail, role } = await req.json();

    // Create Supabase client with service role (has full permissions)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

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
      .eq("role", role);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ error: `User already has the ${role} role` }),
        { status: 409, headers: corsHeaders }
      );
    }

    // Insert the role (service role bypasses RLS)
    const { data, error } = await supabase
      .from("user_roles")
      .insert({ user_id: userId, role })
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
