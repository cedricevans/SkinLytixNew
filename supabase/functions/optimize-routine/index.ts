import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { routineId } = await req.json();
    console.log('Optimizing routine:', routineId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get routine products with full analysis data
    const { data: routineProducts, error: rpError } = await supabase
      .from('routine_products')
      .select(`
        *,
        user_analyses (
          product_name,
          brand,
          category,
          epiq_score,
          ingredients_list,
          recommendations_json
        )
      `)
      .eq('routine_id', routineId);

    if (rpError) throw rpError;
    if (!routineProducts || routineProducts.length === 0) {
      throw new Error('No products found in routine');
    }

    // Prepare product data for AI analysis
    const productsData = routineProducts.map(rp => ({
      name: rp.user_analyses.product_name,
      brand: rp.user_analyses.brand,
      category: rp.user_analyses.category,
      ingredients: rp.user_analyses.ingredients_list,
      price: rp.product_price,
      frequency: rp.usage_frequency,
      epiqScore: rp.user_analyses.epiq_score,
    }));

    // Call Lovable AI for routine optimization
    const aiPrompt = `You are a skincare routine optimization expert. Analyze this skincare routine and provide detailed insights:

PRODUCTS IN ROUTINE:
${productsData.map((p, i) => `
${i + 1}. ${p.name}${p.brand ? ` by ${p.brand}` : ''}
   Category: ${p.category || 'unknown'}
   Price: $${p.price || 'unknown'}
   Used: ${p.frequency}
   EpiQ Score: ${p.epiqScore}/100
   Full Ingredients: ${p.ingredients}
`).join('\n')}

Provide a comprehensive analysis covering:

1. INGREDIENT REDUNDANCIES: Identify duplicate active ingredients across products with specific percentages/concentrations
2. CONFLICTING ACTIVES: Flag combinations that may cause irritation or reduce effectiveness
3. FORMULATION ISSUES: Point out problematic ingredients like high fragrance content, lack of stabilizers
4. COST OPTIMIZATION: Suggest more cost-effective alternatives that provide the same key ingredients
5. ROUTINE EFFICIENCY: Recommend which products could be eliminated without losing benefits

Format your response as a structured JSON with these sections:
{
  "redundancies": [{ "ingredient": "", "products": [], "recommendation": "" }],
  "conflicts": [{ "actives": [], "risk": "", "suggestion": "" }],
  "formulationIssues": [{ "product": "", "issue": "", "impact": "" }],
  "costOptimizations": [{ "product": "", "keyIngredients": [], "suggestedAlternative": "", "potentialSavings": "" }],
  "routineEfficiency": { "canEliminate": [], "reasoning": "" },
  "overallScore": 85,
  "summary": ""
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a skincare formulation expert specializing in ingredient analysis and routine optimization.' },
          { role: 'user', content: aiPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const optimizationData = JSON.parse(aiData.choices[0].message.content);

    // Calculate total cost
    const totalCost = productsData.reduce((sum, p) => sum + (p.price || 0), 0);
    optimizationData.totalRoutineCost = totalCost;

    // Store optimization results
    const { data: optimization, error: optError } = await supabase
      .from('routine_optimizations')
      .insert({
        routine_id: routineId,
        optimization_data: optimizationData,
      })
      .select()
      .single();

    if (optError) throw optError;

    console.log('Routine optimization completed');
    
    return new Response(
      JSON.stringify({
        optimizationId: optimization.id,
        data: optimizationData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in optimize-routine:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});