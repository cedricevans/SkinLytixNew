import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Paginate to get ALL rows
    const allRows: unknown[] = [];
    let offset = 0;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      const { data, error: fetchError } = await supabase
        .from("user_analyses")
        .select("id, user_id, product_name, brand, category, epiq_score, product_price, ingredients_list, analyzed_at")
        .order("analyzed_at", { ascending: true })
        .range(offset, offset + pageSize - 1);

      if (fetchError) {
        return new Response(JSON.stringify({ error: fetchError.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      allRows.push(...(data || []));
      hasMore = (data?.length || 0) === pageSize;
      offset += pageSize;
    }

    const error = null;
    const data = allRows;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(data, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
