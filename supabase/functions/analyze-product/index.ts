import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_name, barcode, brand, category, ingredients_list, user_id } = await req.json();
    
    if (!product_name || !ingredients_list || !user_id) {
      return new Response(
        JSON.stringify({ error: 'product_name, ingredients_list, and user_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Analyzing product:', product_name);

    // Get user profile for personalized scoring
    const { data: profile } = await supabase
      .from('profiles')
      .select('skin_type, skin_concerns')
      .eq('id', user_id)
      .maybeSingle();

    console.log('User profile:', profile);

    // Helper: Detect product category from OBF tags
    const detectCategoryFromTags = (tags: string[]): string | null => {
      const tagString = tags.join(' ').toLowerCase();
      if (tagString.includes('cleanser')) return 'cleanser';
      if (tagString.includes('serum')) return 'serum';
      if (tagString.includes('moisturizer') || tagString.includes('cream')) return 'moisturizer';
      if (tagString.includes('sunscreen') || tagString.includes('spf')) return 'sunscreen';
      if (tagString.includes('toner')) return 'toner';
      if (tagString.includes('treatment')) return 'treatment';
      if (tagString.includes('mask')) return 'mask';
      if (tagString.includes('eye')) return 'eye-cream';
      return null;
    };

    // Extract brand/category from Open Beauty Facts if not provided
    let extractedBrand = brand;
    let extractedCategory = category;

    // Check product_cache if barcode provided
    let cachedProductData = null;
    if (barcode) {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: cachedProduct } = await supabase
        .from('product_cache')
        .select('obf_data_json')
        .eq('barcode', barcode)
        .gte('cached_at', thirtyDaysAgo)
        .maybeSingle();

      if (cachedProduct) {
        console.log('Product cache HIT for barcode:', barcode);
        cachedProductData = cachedProduct.obf_data_json;
      } else {
        console.log('Product cache MISS for barcode:', barcode);
        // Query Open Beauty Facts and cache result
        const obfResponse = await fetch(
          `${supabaseUrl}/functions/v1/query-open-beauty-facts`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({ barcode })
          }
        );
        const obfData = await obfResponse.json();
        if (obfData.product) {
          cachedProductData = obfData;
        }
      }
    }

    // Extract brand/category from cached data if not manually provided
    if (cachedProductData?.product) {
      if (!extractedBrand && cachedProductData.product.brands) {
        extractedBrand = cachedProductData.product.brands.split(',')[0].trim();
      }
      
      if (!extractedCategory && cachedProductData.product.categories_tags) {
        const obfCategories = cachedProductData.product.categories_tags;
        extractedCategory = detectCategoryFromTags(obfCategories);
      }
    }

    // Parse ingredients list
    const ingredientsArray = ingredients_list
      .split(/[,\n]/)
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 0);

    // Query PubChem for ingredient data (this will use caching)
    const pubchemResponse = await fetch(
      `${supabaseUrl}/functions/v1/query-pubchem`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({ ingredients: ingredientsArray })
      }
    );

    const pubchemData = await pubchemResponse.json();
    const ingredientResults = pubchemData.results || [];

    // Personalized rule-based analysis with skin profile
    const concerns = [];
    const safe = [];
    const warnings = [];
    
    // Common ingredient classifications (expanded)
    const beneficialIngredients: Record<string, string[]> = {
      oily: ['salicylic acid', 'niacinamide', 'zinc', 'tea tree'],
      dry: ['hyaluronic acid', 'ceramide', 'glycerin', 'squalane', 'shea butter'],
      sensitive: ['centella', 'aloe', 'oat', 'chamomile', 'allantoin'],
      aging: ['retinol', 'vitamin c', 'peptide', 'niacinamide', 'aha'],
      acne: ['salicylic acid', 'benzoyl peroxide', 'niacinamide', 'azelaic acid'],
    };

    const problematicIngredients: Record<string, string[]> = {
      sensitive: ['fragrance', 'alcohol denat', 'essential oil', 'citrus', 'menthol'],
      oily: ['coconut oil', 'palm oil', 'heavy oils'],
      acne: ['coconut oil', 'isopropyl myristate', 'lauric acid'],
    };

    for (const result of ingredientResults) {
      const ingredientLower = result.name.toLowerCase();
      
      if (result.data) {
        safe.push(result.name);
        
        // Check if beneficial for user's skin type/concerns
        if (profile) {
          if (profile.skin_type) {
            const beneficial = beneficialIngredients[profile.skin_type] || [];
            if (beneficial.some(b => ingredientLower.includes(b))) {
              safe.push(`${result.name} (beneficial for ${profile.skin_type} skin)`);
            }
          }
          
          if (profile.skin_concerns && Array.isArray(profile.skin_concerns)) {
            for (const concern of profile.skin_concerns) {
              const beneficial = beneficialIngredients[concern] || [];
              if (beneficial.some(b => ingredientLower.includes(b))) {
                safe.push(`${result.name} (targets ${concern})`);
              }
            }
          }
        }
      } else {
        concerns.push(result.name);
      }

      // Check for problematic ingredients based on profile
      if (profile) {
        if (profile.skin_type) {
          const problematic = problematicIngredients[profile.skin_type] || [];
          if (problematic.some(p => ingredientLower.includes(p))) {
            warnings.push(`⚠️ ${result.name} may not suit ${profile.skin_type} skin`);
          }
        }
        
        if (profile.skin_concerns && Array.isArray(profile.skin_concerns)) {
          for (const concern of profile.skin_concerns) {
            const problematic = problematicIngredients[concern] || [];
            if (problematic.some(p => ingredientLower.includes(p))) {
              warnings.push(`⚠️ ${result.name} may worsen ${concern}`);
            }
          }
        }
      }
    }

    // Calculate personalized EpiQ score (0-100)
    const totalIngredients = ingredientsArray.length;
    const safeCount = safe.length;
    let epiqScore = totalIngredients > 0 
      ? Math.round((safeCount / totalIngredients) * 100) 
      : 50;

    // Apply skin profile modifiers
    if (profile) {
      // Deduct points for warnings
      epiqScore = Math.max(0, epiqScore - (warnings.length * 5));
      
      // Bonus points for matching beneficial ingredients
      const beneficialMatches = safe.filter(s => s.includes('beneficial') || s.includes('targets'));
      epiqScore = Math.min(100, epiqScore + (beneficialMatches.length * 3));
    }

    // Ingredient knowledge base
    const ingredientKnowledge: Record<string, any> = {
      'retinol': {
        timing: 'PM only',
        concerns: ['aging', 'acne'],
        conflicts: ['vitamin c', 'aha', 'bha'],
        tips: ['Start 2-3x/week and build tolerance', 'Apply to completely dry skin', 'Wait 20 minutes before moisturizer'],
        sunSensitivity: true,
        category: 'active'
      },
      'vitamin c': {
        timing: 'AM preferred',
        concerns: ['aging', 'hyperpigmentation'],
        conflicts: ['retinol'],
        tips: ['Apply to clean skin first', 'Always follow with SPF 30+', 'Store in dark, cool place'],
        sunSensitivity: true,
        category: 'active'
      },
      'salicylic acid': {
        timing: 'PM preferred',
        concerns: ['acne', 'oily'],
        conflicts: ['retinol'],
        tips: ['Use on clean, dry skin', 'Start 2x/week if new to acids', 'Avoid eye area'],
        sunSensitivity: true,
        category: 'active'
      },
      'hyaluronic acid': {
        timing: 'AM & PM',
        concerns: ['dry', 'aging'],
        conflicts: [],
        tips: ['Apply to damp skin for best absorption', 'Follow with moisturizer to seal', 'Use in humid environments or mist face first'],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'niacinamide': {
        timing: 'AM & PM',
        concerns: ['acne', 'hyperpigmentation', 'oily'],
        conflicts: [],
        tips: ['Great layering ingredient', 'Can be used with most actives', 'Safe for all skin types'],
        sunSensitivity: false,
        category: 'active'
      },
      'aha': {
        timing: 'PM only',
        concerns: ['aging', 'hyperpigmentation'],
        conflicts: ['retinol', 'bha'],
        tips: ['Use on alternating nights with retinol', 'Must use SPF next morning', 'Start with low concentration'],
        sunSensitivity: true,
        category: 'active'
      },
      'bha': {
        timing: 'PM preferred',
        concerns: ['acne', 'oily'],
        conflicts: ['retinol', 'aha'],
        tips: ['Can penetrate oil in pores', 'Use 2-3x per week maximum', 'Don\'t combine with other exfoliants'],
        sunSensitivity: true,
        category: 'active'
      },
      'peptide': {
        timing: 'AM & PM',
        concerns: ['aging'],
        conflicts: [],
        tips: ['Works well with niacinamide', 'Apply before heavier creams', 'Consistent use shows results in 8-12 weeks'],
        sunSensitivity: false,
        category: 'active'
      },
      'ceramide': {
        timing: 'AM & PM',
        concerns: ['dry', 'sensitive'],
        conflicts: [],
        tips: ['Essential for barrier repair', 'Best used in moisturizers', 'Safe for sensitive skin'],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'benzoyl peroxide': {
        timing: 'AM or PM',
        concerns: ['acne'],
        conflicts: ['retinol'],
        tips: ['Use in AM, retinol in PM to avoid interaction', 'Can bleach fabrics', 'Start with 2.5% concentration'],
        sunSensitivity: false,
        category: 'active'
      }
    };

    // Helper: Detect active ingredients
    const detectActives = (ingredients: string[]): Array<{name: string, info: any}> => {
      const detected = [];
      for (const ingredient of ingredients) {
        const ingredientLower = ingredient.toLowerCase();
        for (const [key, info] of Object.entries(ingredientKnowledge)) {
          if (ingredientLower.includes(key)) {
            detected.push({ name: key, info });
            break;
          }
        }
      }
      return detected;
    };

    // Helper: Generate timing recommendations
    const getTimingRecommendations = (actives: Array<{name: string, info: any}>): string[] => {
      const suggestions = [];
      const pmOnly = actives.filter(a => a.info.timing === 'PM only');
      const amPreferred = actives.filter(a => a.info.timing === 'AM preferred');
      const sunSensitive = actives.filter(a => a.info.sunSensitivity);

      if (pmOnly.length > 0) {
        suggestions.push(`🌙 Use in PM only - contains ${pmOnly.map(a => a.name).join(', ')}`);
      }
      if (amPreferred.length > 0) {
        suggestions.push(`☀️ Best used in AM - ${amPreferred.map(a => a.name).join(', ')} works well in morning routine`);
      }
      if (sunSensitive.length > 0 && !pmOnly.length) {
        suggestions.push(`⚠️ Increases sun sensitivity - always follow with SPF 30+ the next morning`);
      }
      
      return suggestions;
    };

    // Helper: Generate concern-specific guidance
    const getConcernGuidance = (skinConcerns: string[], actives: Array<{name: string, info: any}>): string[] => {
      const suggestions = [];
      const concernMap: Record<string, string> = {
        'acne': 'Apply to problem areas after cleansing. Avoid over-layering multiple acne treatments.',
        'aging': 'Consistency is key - use nightly for best results. Pair with SPF during day.',
        'hyperpigmentation': 'Target dark spots directly. Results typically visible in 8-12 weeks with consistent use.',
        'dryness': 'Apply on damp skin to maximize hydration. Follow with occlusive moisturizer.',
        'redness': 'Introduce slowly - start 2x/week. Avoid mixing with other actives initially.'
      };

      for (const concern of skinConcerns) {
        if (concernMap[concern]) {
          // Check if actives target this concern
          const targetingActives = actives.filter(a => a.info.concerns?.includes(concern));
          if (targetingActives.length > 0) {
            suggestions.push(`✓ ${concernMap[concern]}`);
            break; // Only add one concern-specific tip to avoid overwhelming
          }
        }
      }

      return suggestions;
    };

    // Helper: Detect product category from cached data
    const detectCategory = (cachedData: any): string => {
      if (!cachedData?.product) return 'unknown';
      const categories = cachedData.product.categories_tags || [];
      return detectCategoryFromTags(categories) || 'unknown';
    };

    // Helper: Get application technique
    const getApplicationTechnique = (category: string, skinType: string): string[] => {
      const suggestions = [];
      const techniques: Record<string, string> = {
        'cleanser': '💧 Massage for 60 seconds, rinse with lukewarm water. Use AM + PM.',
        'serum': '💧 Apply 3-5 drops after cleansing. Pat gently, wait 1-2 min before next step.',
        'moisturizer': '💧 Warm between palms, press into skin. Apply as final step (or before SPF in AM).',
        'sunscreen': '☀️ Apply 1/4 tsp for face. Reapply every 2 hours. Use as final AM step.',
        'treatment': '🎯 Apply only to affected areas after serums, before moisturizer.'
      };

      if (techniques[category]) {
        suggestions.push(techniques[category]);
      }

      return suggestions;
    };

    // Helper: Get interaction warnings
    const getInteractionWarnings = (actives: Array<{name: string, info: any}>): string[] => {
      const suggestions = [];
      const activeNames = actives.map(a => a.name);

      // Check for conflicts
      if (activeNames.includes('retinol') && (activeNames.includes('aha') || activeNames.includes('bha'))) {
        suggestions.push('⚠️ Contains retinol + acids - use on alternating nights to prevent irritation');
      }
      if (activeNames.includes('benzoyl peroxide') && activeNames.includes('retinol')) {
        suggestions.push('⚠️ Benzoyl peroxide can inactivate retinol - use BP in AM, retinol in PM');
      }
      if (activeNames.includes('vitamin c') && activeNames.includes('retinol')) {
        suggestions.push('💡 Use vitamin C in AM, retinol in PM for optimal results without interaction');
      }

      // Positive synergies
      if (activeNames.includes('niacinamide') && activeNames.includes('peptide')) {
        suggestions.push('✨ Great combo! Niacinamide + peptides work synergistically for anti-aging');
      }

      return suggestions;
    };

    // Helper: Get skin type tips
    const getSkinTypeTips = (skinType: string, actives: Array<{name: string, info: any}>): string[] => {
      const suggestions = [];
      const tips: Record<string, string> = {
        'sensitive': '🧴 Patch test on inner arm for 24-48 hours before facial use',
        'oily': '🎯 Apply to clean, dry skin. No need for heavy moisturizer on top',
        'dry': '💧 Layer over hydrating toner. Seal with rich moisturizer to prevent water loss',
        'combination': '⚖️ Apply to entire face, but reduce frequency in oily zones if needed',
        'normal': '✓ Use consistently morning and/or evening based on product type'
      };

      if (tips[skinType]) {
        suggestions.push(tips[skinType]);
      }

      // Add sensitive skin warning if actives present
      if (skinType === 'sensitive' && actives.length > 0) {
        suggestions.push('⏱️ Start 2x/week, gradually increase as tolerated');
      }

      return suggestions;
    };

    // Generate dynamic routine suggestions
    const detectedActives = detectActives(ingredientsArray);
    const productCategory = detectCategory(cachedProductData);
    
    const routineSuggestions = [
      ...getTimingRecommendations(detectedActives),
      ...getConcernGuidance(profile?.skin_concerns || [], detectedActives),
      ...getApplicationTechnique(productCategory, profile?.skin_type || 'normal'),
      ...getInteractionWarnings(detectedActives),
      ...getSkinTypeTips(profile?.skin_type || 'normal', detectedActives),
    ].slice(0, 5); // Return top 5 most relevant

    // Add specific active tips if detected
    for (const active of detectedActives.slice(0, 2)) { // Add tips from up to 2 main actives
      if (active.info.tips && routineSuggestions.length < 5) {
        routineSuggestions.push(...active.info.tips.slice(0, 1));
      }
    }

    const recommendations = {
      safe_ingredients: safe,
      concern_ingredients: concerns,
      warnings: warnings,
      summary: epiqScore >= 70 
        ? `Great match for your ${profile?.skin_type || ''} skin! This product has a strong ingredient profile.` 
        : epiqScore >= 50 
          ? `Decent option. Some ingredients may need attention for your ${profile?.skin_type || ''} skin.` 
          : `Not ideal for your skin profile. Consider alternatives with safer formulations.`,
      routine_suggestions: routineSuggestions,
      personalized: !!profile,
      product_metadata: {
        brand: extractedBrand,
        category: extractedCategory
      }
    };

    // Check if product exists in database
    let productId = null;
    if (barcode) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('barcode', barcode)
        .maybeSingle();
      
      productId = existingProduct?.id || null;
    }

    // Store analysis
    const { data: analysis, error: analysisError } = await supabase
      .from('user_analyses')
      .insert({
        user_id,
        product_id: productId,
        product_name,
        brand: extractedBrand,
        category: extractedCategory,
        ingredients_list,
        epiq_score: epiqScore,
        recommendations_json: recommendations
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Error storing analysis:', analysisError);
      throw analysisError;
    }

    console.log('Analysis complete for:', product_name, 'EpiQ Score:', epiqScore);

    return new Response(
      JSON.stringify({
        analysis_id: analysis.id,
        epiq_score: epiqScore,
        recommendations,
        ingredient_data: ingredientResults
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-product:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
