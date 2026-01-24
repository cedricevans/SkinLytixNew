import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const analysisId = body?.analysisId || body?.analysis_id;
    if (!analysisId) {
      return new Response(JSON.stringify({ error: 'Missing analysisId in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Extract bearer token from the incoming request to authenticate the caller
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Missing Authorization bearer token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('Missing SUPABASE env vars');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Use anon client to verify the bearer token and resolve the user
    const supabaseAuthClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: userResp, error: userErr } = await supabaseAuthClient.auth.getUser(token);
    if (userErr) {
      console.error('Failed to validate access token', userErr);
      return new Response(JSON.stringify({ error: 'Invalid access token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const user = (userResp as any)?.user;
    if (!user?.id) {
      return new Response(JSON.stringify({ error: 'Unable to determine user from token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Service-role client for privileged deletes (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Ensure the analysis belongs to the caller
    const { data: analysisRow, error: analysisError } = await supabase
      .from('user_analyses')
      .select('user_id')
      .eq('id', analysisId)
      .maybeSingle();

    if (analysisError) {
      console.error('Error fetching analysis row', analysisError);
      throw analysisError;
    }
    if (!analysisRow) {
      return new Response(JSON.stringify({ error: 'Analysis not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (analysisRow.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Collect chat conversation ids tied to this analysis
    const { data: conversations } = await supabase
      .from('chat_conversations')
      .select('id')
      .eq('analysis_id', analysisId);
    const conversationIds = (conversations || []).map((c: any) => c.id);

    // Run deletions in a sensible order to avoid FK constraint errors
    const deletionResults: Record<string, any> = {};

    if (conversationIds.length > 0) {
      const { error: msgErr } = await supabase
        .from('chat_messages')
        .delete()
        .in('conversation_id', conversationIds);
      deletionResults.chat_messages = msgErr || null;

      const { error: convErr } = await supabase
        .from('chat_conversations')
        .delete()
        .eq('analysis_id', analysisId);
      deletionResults.chat_conversations = convErr || null;
    }

    const { error: savedDupesErr } = await supabase
      .from('saved_dupes')
      .delete()
      .eq('source_product_id', analysisId);
    deletionResults.saved_dupes = savedDupesErr || null;

    const { error: routineProductsErr } = await supabase
      .from('routine_products')
      .delete()
      .eq('analysis_id', analysisId);
    deletionResults.routine_products = routineProductsErr || null;

    const { error: expertReviewsErr } = await supabase
      .from('expert_reviews')
      .delete()
      .eq('analysis_id', analysisId);
    deletionResults.expert_reviews = expertReviewsErr || null;

    const { error: validationsErr } = await supabase
      .from('ingredient_validations')
      .delete()
      .eq('analysis_id', analysisId);
    deletionResults.ingredient_validations = validationsErr || null;

    const { error: userAnalysisErr } = await supabase
      .from('user_analyses')
      .delete()
      .eq('id', analysisId);
    deletionResults.user_analyses = userAnalysisErr || null;

    // Check for any errors in deletionResults
    const errors = Object.entries(deletionResults).filter(([k, v]) => v);
    if (errors.length > 0) {
      console.error('One or more deletes failed', deletionResults);
      return new Response(JSON.stringify({ error: 'Failed to fully delete analysis', details: deletionResults }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error in delete-analysis:', error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
