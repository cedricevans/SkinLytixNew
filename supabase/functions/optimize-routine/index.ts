// @ts-expect-error - Deno edge runtime import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-expect-error - Deno edge runtime import
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Declare variables for AI response and fallback tracking at the top of the try block
    let optimizationData;
    let fallbackLevel = 0;
    const { routineId } = await req.json();
    console.log('Optimizing routine:', routineId);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
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
  const productsData = routineProducts.map((rp: any) => ({
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
  const faceProducts = productsData.filter((p: any) => p.productType === 'face');
  const bodyProducts = productsData.filter((p: any) => p.productType === 'body');
  const hairProducts = productsData.filter((p: any) => p.productType === 'hair');
  const unknownProducts = productsData.filter((p: any) => p.productType === 'unknown');

    // Determine routine type
    const routineType = faceProducts.length > 0 && bodyProducts.length === 0 && hairProducts.length === 0 ? 'face' :
                        bodyProducts.length > 0 && faceProducts.length === 0 && hairProducts.length === 0 ? 'body' :
                        hairProducts.length > 0 && faceProducts.length === 0 && bodyProducts.length === 0 ? 'hair' :
                        'mixed';

    // Add default values if profile fields are missing
    const skinType = userProfile?.skin_type || 'not specified';
    const skinConcerns = Array.isArray(userProfile?.skin_concerns) && userProfile.skin_concerns.length > 0 
      ? userProfile.skin_concerns 
      : ['none specified'];
    const bodyConcerns = Array.isArray(userProfile?.body_concerns) && userProfile.body_concerns.length > 0 
      ? userProfile.body_concerns 
      : ['none specified'];
    const scalpType = userProfile?.scalp_type || 'not specified';

    // Build context-aware AI prompt based on product types
    let aiPrompt = '';
    
    if (routineType === 'face' || (routineType === 'mixed' && faceProducts.length > 0)) {
      aiPrompt += `You are a skincare routine optimization expert. Analyze this ${routineType === 'mixed' ? 'FACIAL' : ''} routine and provide detailed insights:

USER FACIAL SKIN PROFILE:
- Skin Type: ${skinType}
- Facial Concerns: ${skinConcerns.join(', ')}

${routineType === 'mixed' ? 'FACIAL ' : ''}PRODUCTS IN ROUTINE:
${faceProducts.map((p: any, i: number) => `
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
      aiPrompt += `${routineType === 'mixed' ? '\n\n---\n\n' : ''}You are a body care product optimization expert. Analyze this ${routineType === 'mixed' ? 'BODY CARE' : ''} routine:

USER BODY PROFILE:
- Body Concerns: ${bodyConcerns.join(', ')}

${routineType === 'mixed' ? 'BODY CARE ' : ''}PRODUCTS IN ROUTINE:
${bodyProducts.map((p: any, i: number) => `
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
- Scalp Type: ${scalpType}

${routineType === 'mixed' ? 'HAIR CARE ' : ''}PRODUCTS IN ROUTINE:
${hairProducts.map((p: any, i: number) => `
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
   
   **CRITICAL REQUIREMENT FOR COST OPTIMIZATIONS:**
   - "potentialSavings" MUST be a numeric value (e.g., 20.00, 35.50, 150.00)
   - DO NOT use text descriptions like "High", "Significant", "potentially hundreds"
   - Calculate as: currentPrice - alternativePrice
   - If exact price is unknown, estimate a realistic numeric value
   - Examples:
     ✅ CORRECT: "potentialSavings": 25.00
     ✅ CORRECT: "potentialSavings": 150.00
     ❌ WRONG: "potentialSavings": "Significant, potentially hundreds of dollars"
     ❌ WRONG: "potentialSavings": "High"

5. ROUTINE EFFICIENCY: Recommend which products could be eliminated

${unknownProducts.length > 0 ? `
6. OUT OF SCOPE PRODUCTS: The following products have unclear categories:
${unknownProducts.map((p: any) => `- ${p.name}`).join('\n')}
Please note these in the "outOfScope" section.
` : ''}

**CRITICAL: Your summary MUST be personalized based on the user's profile:**
${routineType === 'face' || (routineType === 'mixed' && faceProducts.length > 0) ? `
- Reference their ${skinType} skin type
- Address their specific facial concerns: ${skinConcerns.join(', ')}
` : ''}
${routineType === 'body' || (routineType === 'mixed' && bodyProducts.length > 0) ? `
- Address their body concerns: ${bodyConcerns.join(', ')}
` : ''}
${routineType === 'hair' || (routineType === 'mixed' && hairProducts.length > 0) ? `
- Reference their ${scalpType} scalp type
` : ''}

The summary should:
- Start by acknowledging their specific skin/body/hair profile
- Explain what the score means FOR THEIR SPECIFIC NEEDS
- Mention 1-2 key insights relevant to their concerns
- Be encouraging and actionable (2-3 sentences max)

Example for oily skin with acne concerns:
"For your oily, acne-prone skin, this routine shows good ingredient balance but has room for improvement. Your products contain effective acne-fighting actives, but we've identified some cost savings and a potential ingredient conflict that could be irritating your skin."

Example for dry skin with aging concerns:
"Your dry skin routine lacks sufficient moisturizing layers for anti-aging benefits. We've identified hydrating alternatives that address fine lines while saving you $25/month."

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

    const parseJsonContent = (raw?: string) => {
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const callGemini = async () => {
      if (!geminiApiKey) return null;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: aiPrompt }] }],
            generationConfig: {
              response_mime_type: 'application/json',
              temperature: 0.7,
              maxOutputTokens: 2048
            }
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn('Gemini API failed:', response.status, errText);
        return null;
      }

      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text
        || data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
        || "";
      return parseJsonContent(content);
    };

    const callLovable = async () => {
      if (!lovableApiKey) return null;
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

      if (!response.ok) {
        const errText = await response.text().catch(() => '');
        console.warn('Lovable API failed:', response.status, errText);
        return null;
      }

      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content ?? "";
      return parseJsonContent(content);
    };

    optimizationData = await callGemini();
    if (!optimizationData) {
      fallbackLevel = 1;
      optimizationData = await callLovable();
    }

    if (!optimizationData) {
      return new Response(
        JSON.stringify({
          error: 'All AI models are currently unavailable. Please try again later or contact support if this persists.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Track which fallback was used
    // fallbackLevel: 0 = Gemini, 1 = Lovable
    optimizationData.fallbackLevel = fallbackLevel;
    if (fallbackLevel > 0) {
      console.warn(`AI fallback triggered: Lovable used for routineId ${routineId}`);
    }

    // Calculate total cost and add metadata
    const totalCost = productsData.reduce((sum: number, p: any) => sum + (p.price || 0), 0);
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
