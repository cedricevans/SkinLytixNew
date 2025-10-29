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

    // Get routine with user info
    const { data: routine, error: routineError } = await supabase
      .from('routines')
      .select('user_id')
      .eq('id', routineId)
      .single();

    if (routineError) throw routineError;

    // Get user profile data - fetch ALL profile fields for multi-type analysis
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('skin_type, skin_concerns, body_concerns, scalp_type, product_preferences')
      .eq('id', routine.user_id)
      .single();

    if (profileError) throw profileError;

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

    // Helper function to categorize products
    const categorizeProduct = (product: any): 'face' | 'body' | 'hair' | 'unknown' => {
      const category = product.category?.toLowerCase() || '';
      const name = product.product_name?.toLowerCase() || '';
      
      // Priority 1: Hair - Check first for hair-specific products (most distinct)
      if (category.includes('shampoo') || category.includes('conditioner') || 
          category.includes('hair') || category.includes('scalp') ||
          name.includes('shampoo') || name.includes('conditioner')) {
        return 'hair';
      }
      
      // Priority 2: Body - Check for body-specific indicators with explicit keywords
      if (category.includes('body') || category.includes('deodorant') || 
          category.includes('hand') || category.includes('foot') || 
          category.includes('scrub') || 
          name.includes('body wash') || name.includes('body lotion') || 
          name.includes('body cream') || name.includes('deodorant') || 
          name.includes('hand cream')) {
        return 'body';
      }
      
      // Priority 3: Face - Check face-specific with stricter matching
      if (category.includes('face') || category.includes('serum') || 
          category.includes('cleanser') || category.includes('sunscreen') || 
          category.includes('toner') || category.includes('eye') || 
          category.includes('mask') ||
          name.includes('face wash') || name.includes('face cream') || 
          name.includes('face serum') || name.includes('facial')) {
        return 'face';
      }
      
      // Priority 4: Ambiguous terms - check with context
      // "lotion" alone could be face or body - check name for additional context
      if (category.includes('lotion')) {
        if (name.includes('face') || name.includes('facial')) {
          return 'face';
        }
        // Default lotion to body since most lotions are for body
        return 'body';
      }
      
      // "moisturizer" or "cream" alone could be face or body
      if (category.includes('moisturizer') || category.includes('cream')) {
        if (name.includes('body')) {
          return 'body';
        }
        if (name.includes('hand')) {
          return 'body';
        }
        // Default moisturizer/cream to face (more common)
        return 'face';
      }
      
      return 'unknown';
    };

    // Prepare product data and categorize
    const productsData = routineProducts.map(rp => ({
      name: rp.user_analyses.product_name,
      brand: rp.user_analyses.brand,
      category: rp.user_analyses.category,
      ingredients: rp.user_analyses.ingredients_list,
      price: rp.product_price,
      frequency: rp.usage_frequency,
      epiqScore: rp.user_analyses.epiq_score,
      productType: categorizeProduct(rp.user_analyses),
    }));

    // Group products by type
    const faceProducts = productsData.filter(p => p.productType === 'face');
    const bodyProducts = productsData.filter(p => p.productType === 'body');
    const hairProducts = productsData.filter(p => p.productType === 'hair');
    const unknownProducts = productsData.filter(p => p.productType === 'unknown');

    // Determine routine type
    const routineType = faceProducts.length > 0 && bodyProducts.length === 0 && hairProducts.length === 0 ? 'face' :
                        bodyProducts.length > 0 && faceProducts.length === 0 && hairProducts.length === 0 ? 'body' :
                        hairProducts.length > 0 && faceProducts.length === 0 && bodyProducts.length === 0 ? 'hair' :
                        'mixed';

    // Build context-aware AI prompt based on product types
    let aiPrompt = '';
    
    if (routineType === 'face' || (routineType === 'mixed' && faceProducts.length > 0)) {
      const skinConcerns = userProfile?.skin_concerns || [];
      aiPrompt += `You are a skincare routine optimization expert. Analyze this ${routineType === 'mixed' ? 'FACIAL' : ''} routine and provide detailed insights:

USER FACIAL SKIN PROFILE:
- Skin Type: ${userProfile?.skin_type || 'unknown'}
- Facial Concerns: ${Array.isArray(skinConcerns) ? skinConcerns.join(', ') : 'none specified'}

${routineType === 'mixed' ? 'FACIAL ' : ''}PRODUCTS IN ROUTINE:
${faceProducts.map((p, i) => `
${i + 1}. ${p.name}${p.brand ? ` by ${p.brand}` : ''}
   Category: ${p.category || 'unknown'}
   Price: $${p.price || 'unknown'}
   Used: ${p.frequency}
   EpiQ Score: ${p.epiqScore}/100
   Full Ingredients: ${p.ingredients}
`).join('\n')}

`;
    }

    if (routineType === 'body' || (routineType === 'mixed' && bodyProducts.length > 0)) {
      const bodyConcerns = userProfile?.body_concerns || [];
      aiPrompt += `${routineType === 'mixed' ? '\n\n---\n\n' : ''}You are a body care product optimization expert. Analyze this ${routineType === 'mixed' ? 'BODY CARE' : ''} routine:

USER BODY PROFILE:
- Body Concerns: ${Array.isArray(bodyConcerns) ? bodyConcerns.join(', ') : 'none specified'}

${routineType === 'mixed' ? 'BODY CARE ' : ''}PRODUCTS IN ROUTINE:
${bodyProducts.map((p, i) => `
${i + 1}. ${p.name}${p.brand ? ` by ${p.brand}` : ''}
   Category: ${p.category || 'unknown'}
   Price: $${p.price || 'unknown'}
   Used: ${p.frequency}
   EpiQ Score: ${p.epiqScore}/100
   Full Ingredients: ${p.ingredients}
`).join('\n')}

Focus on body-specific concerns: fragrance content, skin irritation potential, moisturizing ingredients, deodorant effectiveness.

`;
    }

    if (routineType === 'hair' || (routineType === 'mixed' && hairProducts.length > 0)) {
      aiPrompt += `${routineType === 'mixed' ? '\n\n---\n\n' : ''}You are a hair care product optimization expert. Analyze this ${routineType === 'mixed' ? 'HAIR/SCALP CARE' : ''} routine:

USER SCALP/HAIR PROFILE:
- Scalp Type: ${userProfile?.scalp_type || 'unknown'}

${routineType === 'mixed' ? 'HAIR CARE ' : ''}PRODUCTS IN ROUTINE:
${hairProducts.map((p, i) => `
${i + 1}. ${p.name}${p.brand ? ` by ${p.brand}` : ''}
   Category: ${p.category || 'unknown'}
   Price: $${p.price || 'unknown'}
   Used: ${p.frequency}
   EpiQ Score: ${p.epiqScore}/100
   Full Ingredients: ${p.ingredients}
`).join('\n')}

Focus on hair-specific concerns: sulfates, silicones, scalp health ingredients, protein/moisture balance.

`;
    }

    aiPrompt += `
Provide a comprehensive analysis covering:

1. INGREDIENT REDUNDANCIES: Identify duplicate active ingredients across products
2. CONFLICTING ACTIVES: Flag combinations that may cause irritation or reduce effectiveness
3. FORMULATION ISSUES: Point out problematic ingredients
4. COST OPTIMIZATION: Suggest alternatives with NUMERIC savings
5. ROUTINE EFFICIENCY: Recommend which products could be eliminated

${unknownProducts.length > 0 ? `
6. OUT OF SCOPE PRODUCTS: The following products have unclear categories:
${unknownProducts.map(p => `- ${p.name}`).join('\n')}
Please note these in the "outOfScope" section.
` : ''}

Format your response as a structured JSON:
{
  "routineType": "${routineType}",
  "redundancies": [{ "ingredient": "", "products": [], "recommendation": "", "category": "face|body|hair" }],
  "conflicts": [{ "actives": [], "risk": "", "suggestion": "", "category": "face|body|hair" }],
  "formulationIssues": [{ "product": "", "issue": "", "impact": "", "category": "face|body|hair" }],
  "costOptimizations": [{ 
    "product": "", 
    "currentPrice": 45.00,
    "keyIngredients": [], 
    "suggestedAlternative": "", 
    "alternativePrice": 25.00,
    "potentialSavings": 20.00,
    "skinBenefits": "",
    "category": "face|body|hair"
  }],
  "routineEfficiency": { "canEliminate": [], "reasoning": "", "category": "face|body|hair" },
  ${unknownProducts.length > 0 ? `"outOfScope": [{ "product": "", "reason": "", "suggestion": "" }],` : ''}
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

    // Calculate total cost and add metadata
    const totalCost = productsData.reduce((sum, p) => sum + (p.price || 0), 0);
    optimizationData.totalRoutineCost = totalCost;
    optimizationData.routineType = routineType;
    optimizationData.productCounts = {
      face: faceProducts.length,
      body: bodyProducts.length,
      hair: hairProducts.length,
      unknown: unknownProducts.length
    };

    // Calculate total potential savings
    const totalPotentialSavings = optimizationData.costOptimizations?.reduce(
      (sum: number, opt: any) => sum + (opt.potentialSavings || 0),
      0
    ) || 0;
    optimizationData.totalPotentialSavings = totalPotentialSavings;

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