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
      .select('skin_type, skin_concerns, body_concerns, scalp_type, product_preferences')
      .eq('id', user_id)
      .maybeSingle();

    console.log('User profile:', profile);

    // Helper: Detect product category from OBF tags
    const detectCategoryFromTags = (tags: string[]): string | null => {
      const tagString = tags.join(' ').toLowerCase();
      
      // FACE
      if (tagString.includes('cleanser')) return 'face-cleanser';
      if (tagString.includes('serum')) return 'serum';
      if (tagString.includes('moisturizer') || tagString.includes('face cream')) return 'face-moisturizer';
      if (tagString.includes('sunscreen') || tagString.includes('spf')) return 'sunscreen';
      if (tagString.includes('toner')) return 'toner';
      if (tagString.includes('mask')) return 'mask';
      if (tagString.includes('eye')) return 'eye-cream';
      
      // BODY
      if (tagString.includes('body wash') || tagString.includes('shower gel')) return 'body-wash';
      if (tagString.includes('body lotion') || tagString.includes('body cream')) return 'body-lotion';
      if (tagString.includes('hand cream')) return 'hand-cream';
      if (tagString.includes('foot cream')) return 'foot-cream';
      if (tagString.includes('deodorant') || tagString.includes('antiperspirant')) return 'deodorant';
      if (tagString.includes('body oil')) return 'body-oil';
      if (tagString.includes('body scrub')) return 'body-scrub';
      if (tagString.includes('body sunscreen')) return 'body-sunscreen';
      
      // HAIR
      if (tagString.includes('shampoo')) return 'shampoo';
      if (tagString.includes('conditioner')) return 'conditioner';
      if (tagString.includes('hair mask')) return 'hair-mask';
      if (tagString.includes('scalp treatment')) return 'scalp-treatment';
      if (tagString.includes('hair oil')) return 'hair-oil';
      
      // SHAVING
      if (tagString.includes('shaving') || tagString.includes('aftershave')) return 'shaving';
      
      return null;
    };

    // Helper: Get product type from category
    const getProductType = (category: string): 'face' | 'body' | 'hair' | 'other' => {
      const lowerCategory = category.toLowerCase().trim(); // NORMALIZE HERE
      
      if (['face-cleanser', 'serum', 'face-moisturizer', 'sunscreen', 'toner', 'mask', 'eye-cream'].includes(lowerCategory)) {
        return 'face';
      }
      if (['body-wash', 'body-lotion', 'hand-cream', 'foot-cream', 'deodorant', 'body-oil', 'body-scrub', 'body-sunscreen', 'shaving'].includes(lowerCategory)) {
        return 'body';
      }
      if (['shampoo', 'conditioner', 'hair-mask', 'scalp-treatment', 'hair-oil'].includes(lowerCategory)) {
        return 'hair';
      }
      return 'other';
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

    if (cachedProductData?.product) {
      if (!extractedBrand && cachedProductData.product.brands) {
        extractedBrand = cachedProductData.product.brands.split(',')[0].trim();
      }
      
      if (!extractedCategory && cachedProductData.product.categories_tags) {
        const obfCategories = cachedProductData.product.categories_tags;
        extractedCategory = detectCategoryFromTags(obfCategories);
      }
    }

    const productType = getProductType(extractedCategory || 'unknown');
    console.log(`Product categorization: "${extractedCategory}" (${extractedBrand}) → productType: "${productType}"`);

    // Parse ingredients list
    const ingredientsArray = ingredients_list
      .split(/[,\n]/)
      .map((i: string) => i.trim())
      .filter((i: string) => i.length > 0);

    // Query PubChem for ingredient data
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

    // Expanded ingredient classifications for face, body, and hair
    const beneficialIngredients: Record<string, string[]> = {
      // FACE
      oily: ['salicylic acid', 'niacinamide', 'zinc', 'tea tree'],
      dry: ['hyaluronic acid', 'ceramide', 'glycerin', 'squalane', 'shea butter'],
      sensitive: ['centella', 'aloe', 'oat', 'chamomile', 'allantoin'],
      aging: ['retinol', 'vitamin c', 'peptide', 'niacinamide', 'aha'],
      acne: ['salicylic acid', 'benzoyl peroxide', 'niacinamide', 'azelaic acid'],
      
      // BODY
      'body-acne': ['salicylic acid', 'tea tree', 'benzoyl peroxide', 'zinc'],
      'eczema': ['colloidal oatmeal', 'ceramide', 'niacinamide', 'shea butter', 'petrolatum'],
      'keratosis-pilaris': ['lactic acid', 'urea', 'salicylic acid', 'glycolic acid'],
      'dry-hands-feet': ['urea', 'glycerin', 'shea butter', 'lanolin', 'petroleum jelly'],
      'body-odor': ['zinc', 'baking soda', 'charcoal', 'tea tree'],
      'ingrown-hairs': ['salicylic acid', 'glycolic acid', 'tea tree'],
      
      // HAIR/SCALP
      'dandruff': ['zinc pyrithione', 'selenium sulfide', 'ketoconazole', 'tea tree', 'salicylic acid'],
      'oily-scalp': ['salicylic acid', 'tea tree', 'witch hazel', 'charcoal'],
      'dry-scalp': ['hyaluronic acid', 'glycerin', 'panthenol', 'argan oil'],
      'hair-thinning': ['biotin', 'caffeine', 'niacinamide', 'peptide'],
      'scalp-sensitivity': ['aloe', 'chamomile', 'oat', 'allantoin'],
    };

    const problematicIngredients: Record<string, string[]> = {
      // FACE
      sensitive: ['fragrance', 'alcohol denat', 'essential oil', 'citrus', 'menthol'],
      oily: ['coconut oil', 'palm oil', 'heavy oils'],
      acne: ['coconut oil', 'isopropyl myristate', 'lauric acid'],
      
      // BODY
      'eczema': ['fragrance', 'sulfates', 'dyes', 'formaldehyde', 'lanolin'],
      'body-odor': ['aluminum', 'parabens', 'triclosan'],
      'dry-hands-feet': ['alcohol denat', 'sulfates', 'fragrance'],
      
      // HAIR
      'dry-scalp': ['sulfates', 'alcohol denat', 'silicones'],
      'oily-scalp': ['heavy oils', 'silicones', 'waxes'],
      'dandruff': ['fragrance', 'dyes', 'harsh sulfates'],
    };

    // Universally safe/common ingredients - should never be flagged as concerns
    const SAFE_COMMON_INGREDIENTS = [
      'water', 'eau', 'aqua', 'agua',  // Water in all languages
      'glycerin', 'glycérine', 'glicerina',  // Humectant
      'sodium chloride',  // Salt
      'citric acid',  // pH adjuster
      'sodium hydroxide',  // pH adjuster
      'xanthan gum',  // Thickener
      'cellulose',  // Thickener
      'tocopherol',  // Vitamin E
      'ascorbic acid',  // Vitamin C
    ];

    // Check if ingredient is universally safe
    const isCommonSafeIngredient = (ingredientName: string): boolean => {
      const lower = ingredientName.toLowerCase();
      return SAFE_COMMON_INGREDIENTS.some(safe => lower.includes(safe));
    };

    // Analyze ingredients
    const concerns = [];
    const safe = [];
    const warnings = [];

    for (const result of ingredientResults) {
      const ingredientLower = result.name.toLowerCase();
      
      if (result.data) {
        safe.push(result.name);
        
        // Check beneficial for user's profile based on product type
        if (profile) {
          const allConcerns = [...(profile.skin_concerns || []), ...(profile.body_concerns || [])];
          
          // Face-specific checks
          if (productType === 'face' && profile.skin_type) {
            const beneficial = beneficialIngredients[profile.skin_type] || [];
            if (beneficial.some(b => ingredientLower.includes(b))) {
              safe.push(`${result.name} (beneficial for ${profile.skin_type} skin)`);
            }
          }
          
          // Check all concerns
          for (const concern of allConcerns) {
            const beneficial = beneficialIngredients[concern] || [];
            if (beneficial.some(b => ingredientLower.includes(b))) {
              safe.push(`${result.name} (targets ${concern})`);
            }
          }
        }
      } else {
        // Only flag as concern if NOT a commonly safe ingredient
        if (!isCommonSafeIngredient(result.name)) {
          concerns.push(result.name);
        } else {
          // Treat common safe ingredients as verified even without PubChem data
          safe.push(result.name);
          console.log(`Whitelisted safe ingredient: ${result.name}`);
        }
      }

      // Check for problematic ingredients
      if (profile) {
        const allConcerns = [...(profile.skin_concerns || []), ...(profile.body_concerns || [])];
        
        if (productType === 'face' && profile.skin_type) {
          const problematic = problematicIngredients[profile.skin_type] || [];
          if (problematic.some(p => ingredientLower.includes(p))) {
            warnings.push(`⚠️ ${result.name} may not suit ${profile.skin_type} skin`);
          }
        }
        
        for (const concern of allConcerns) {
          const problematic = problematicIngredients[concern] || [];
          if (problematic.some(p => ingredientLower.includes(p))) {
            warnings.push(`⚠️ ${result.name} may worsen ${concern}`);
          }
        }
      }
    }

    // Calculate personalized EpiQ score with product type modifiers
    const totalIngredients = ingredientsArray.length;
    const safeCount = safe.length;
    let epiqScore = totalIngredients > 0 
      ? Math.round((safeCount / totalIngredients) * 100) 
      : 50;

    // Product type modifiers
    if (productType === 'body') {
      const fragranceWarnings = warnings.filter(w => w.toLowerCase().includes('fragrance'));
      if (fragranceWarnings.length > 0) {
        epiqScore = Math.min(100, epiqScore + 5);
      }
    }

    if (productType === 'hair') {
      const sulfateWarnings = warnings.filter(w => w.toLowerCase().includes('sulfate'));
      if (sulfateWarnings.length > 0 && profile?.scalp_type !== 'dry') {
        epiqScore = Math.min(100, epiqScore + 3);
      }
    }

    // Apply profile modifiers
    if (profile) {
      epiqScore = Math.max(0, epiqScore - (warnings.length * 5));
      const beneficialMatches = safe.filter(s => s.includes('beneficial') || s.includes('targets'));
      epiqScore = Math.min(100, epiqScore + (beneficialMatches.length * 3));
    }

    // Expanded ingredient knowledge base
    const ingredientKnowledge: Record<string, any> = {
      // FACE ACTIVES
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
        concerns: ['acne', 'oily', 'body-acne', 'oily-scalp'],
        conflicts: ['retinol'],
        tips: ['Use on clean, dry skin', 'Start 2x/week if new to acids', 'Avoid eye area'],
        sunSensitivity: true,
        category: 'active'
      },
      'hyaluronic acid': {
        timing: 'AM & PM',
        concerns: ['dry', 'aging', 'dry-scalp'],
        conflicts: [],
        tips: ['Apply to damp skin for best absorption', 'Follow with moisturizer to seal', 'Use in humid environments or mist face first'],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'niacinamide': {
        timing: 'AM & PM',
        concerns: ['acne', 'hyperpigmentation', 'oily', 'eczema'],
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
        concerns: ['aging', 'hair-thinning'],
        conflicts: [],
        tips: ['Works well with niacinamide', 'Apply before heavier creams', 'Consistent use shows results in 8-12 weeks'],
        sunSensitivity: false,
        category: 'active'
      },
      'ceramide': {
        timing: 'AM & PM',
        concerns: ['dry', 'sensitive', 'eczema'],
        conflicts: [],
        tips: ['Essential for barrier repair', 'Best used in moisturizers', 'Safe for sensitive skin'],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'benzoyl peroxide': {
        timing: 'AM or PM',
        concerns: ['acne', 'body-acne'],
        conflicts: ['retinol'],
        tips: ['Use in AM, retinol in PM to avoid interaction', 'Can bleach fabrics', 'Start with 2.5% concentration'],
        sunSensitivity: false,
        category: 'active'
      },
      
      // BODY ACTIVES
      'urea': {
        timing: 'AM & PM',
        concerns: ['keratosis-pilaris', 'dry-hands-feet', 'eczema'],
        conflicts: [],
        tips: ['Especially effective at 10%+ concentration', 'Apply to rough patches (elbows, knees, feet)', 'Can sting on broken skin'],
        sunSensitivity: false,
        category: 'exfoliant'
      },
      'lactic acid': {
        timing: 'PM preferred',
        concerns: ['keratosis-pilaris', 'body-texture'],
        conflicts: ['retinol'],
        tips: ['Apply after shower on damp skin', 'Start with 5% concentration', 'Must use SPF on treated areas'],
        sunSensitivity: true,
        category: 'exfoliant'
      },
      'glycolic acid': {
        timing: 'PM preferred',
        concerns: ['keratosis-pilaris', 'ingrown-hairs'],
        conflicts: ['retinol'],
        tips: ['Powerful exfoliant - start slowly', 'Great for rough body areas', 'Always follow with moisturizer'],
        sunSensitivity: true,
        category: 'exfoliant'
      },
      'aluminum': {
        timing: 'AM',
        concerns: ['body-odor'],
        conflicts: [],
        tips: ['Apply to completely dry skin', 'Most effective antiperspirant ingredient', 'Some prefer aluminum-free alternatives'],
        sunSensitivity: false,
        category: 'active'
      },
      
      // HAIR ACTIVES
      'zinc pyrithione': {
        timing: 'As needed',
        concerns: ['dandruff', 'scalp-sensitivity'],
        conflicts: [],
        tips: ['Lather and leave on scalp for 3-5 minutes', 'Use 2-3x/week for active dandruff', 'Safe for daily use once controlled'],
        sunSensitivity: false,
        category: 'active'
      },
      'tea tree oil': {
        timing: 'PM preferred',
        concerns: ['body-acne', 'dandruff', 'oily-scalp'],
        conflicts: [],
        tips: ['May cause sensitivity - patch test first', 'Dilute if using pure oil', 'Effective against bacteria and fungi'],
        sunSensitivity: false,
        category: 'active'
      },
      'biotin': {
        timing: 'AM & PM',
        concerns: ['hair-thinning'],
        conflicts: [],
        tips: ['Strengthens hair follicles', 'Results take 3-6 months', 'Safe for daily use'],
        sunSensitivity: false,
        category: 'active'
      },
      'caffeine': {
        timing: 'AM preferred',
        concerns: ['hair-thinning'],
        conflicts: [],
        tips: ['Stimulates scalp circulation', 'Leave on for 2-3 minutes', 'Best in shampoos and scalp treatments'],
        sunSensitivity: false,
        category: 'active'
      },
      'panthenol': {
        timing: 'AM & PM',
        concerns: ['dry-scalp', 'hair-thinning'],
        conflicts: [],
        tips: ['Also called Pro-Vitamin B5', 'Deeply moisturizing', 'Great for damaged hair'],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'sulfates': {
        timing: 'As needed',
        concerns: ['cleansing'],
        conflicts: [],
        tips: ['Effective cleansers but can strip natural oils', 'Consider sulfate-free if you have dry/sensitive scalp', 'SLS more harsh than SLES'],
        sunSensitivity: false,
        category: 'surfactant'
      },
    };

    // Helper functions
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

    const getTimingRecommendations = (actives: Array<{name: string, info: any}>, prodType: string): string[] => {
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

    const getConcernGuidance = (concerns: string[], actives: Array<{name: string, info: any}>, prodType: string, profile: any): string[] => {
      const suggestions = [];
      
      // Add context intro based on product type
      if (prodType === 'body' && concerns.some(c => c.includes('body-') || c.includes('eczema') || c.includes('keratosis'))) {
        suggestions.push('💪 Body-specific optimization tips:');
      } else if (prodType === 'hair' && profile?.scalp_type) {
        suggestions.push(`🧴 Optimized for ${profile.scalp_type} scalp:`);
      }
      
      const concernMap: Record<string, string> = {
        // Face
        'acne': 'Apply to problem areas after cleansing. Avoid over-layering multiple acne treatments.',
        'aging': 'Consistency is key - use nightly for best results. Pair with SPF during day.',
        'hyperpigmentation': 'Target dark spots directly. Results typically visible in 8-12 weeks with consistent use.',
        'dryness': 'Apply on damp skin to maximize hydration. Follow with occlusive moisturizer.',
        'redness': 'Introduce slowly - start 2x/week. Avoid mixing with other actives initially.',
        
        // Body
        'body-acne': 'Focus on back and chest. Use after showering when pores are clean.',
        'keratosis-pilaris': 'Apply to bumpy areas (upper arms, thighs). Exfoliate regularly.',
        'eczema': 'Apply to damp skin immediately after bathing. Fragrance-free is essential.',
        'dry-hands-feet': 'Apply liberally before bed and wear cotton socks/gloves for intensive treatment.',
        
        // Hair
        'dandruff': 'Massage into scalp, leave for 3-5 minutes before rinsing. Use 2-3x/week.',
        'oily-scalp': 'Focus shampoo on scalp only. Avoid heavy conditioners on roots.',
        'dry-scalp': 'Apply treatments to scalp, not hair lengths. Leave on as directed.',
        'hair-thinning': 'Massage into scalp to improve circulation. Be consistent for 3+ months.',
      };

      for (const concern of concerns) {
        if (concernMap[concern]) {
          const targetingActives = actives.filter(a => a.info.concerns?.includes(concern));
          if (targetingActives.length > 0) {
            suggestions.push(`✓ ${concernMap[concern]}`);
            break;
          }
        }
      }

      return suggestions;
    };

    const getApplicationTechnique = (category: string, prodType: string): string[] => {
      const suggestions = [];
      const techniques: Record<string, string> = {
        // FACE
        'face-cleanser': '💧 Massage for 60 seconds, rinse with lukewarm water. Use AM + PM.',
        'serum': '💧 Apply 3-5 drops after cleansing. Pat gently, wait 1-2 min before next step.',
        'face-moisturizer': '💧 Warm between palms, press into skin. Apply as final step (or before SPF in AM).',
        'sunscreen': '☀️ Apply 1/4 tsp for face. Reapply every 2 hours. Use as final AM step.',
        'toner': '💧 Apply with cotton pad or pat in with hands after cleansing.',
        'mask': '🎭 Apply even layer, avoid eye area. Leave 10-15 min, rinse with lukewarm water.',
        'eye-cream': '👁️ Dab gently around orbital bone. Never pull or tug delicate skin.',
        
        // BODY
        'body-wash': '🚿 Apply to wet skin, massage for 30-60 seconds, rinse thoroughly.',
        'body-lotion': '💧 Apply to damp skin within 3 minutes of showering for best absorption.',
        'hand-cream': '🖐️ Apply after each hand washing. Focus on knuckles and cuticles.',
        'foot-cream': '🦶 Apply at night, wear cotton socks for intensive treatment.',
        'deodorant': '💨 Apply to clean, completely dry underarms. Wait before dressing.',
        'body-scrub': '🧂 Use 1-2x/week on damp skin. Massage in circular motions, rinse well.',
        'body-oil': '✨ Apply to damp skin after shower. Pat dry gently - don\'t rub off.',
        
        // HAIR
        'shampoo': '🚿 Massage into scalp, not hair lengths. Rinse thoroughly (2-3 minutes).',
        'conditioner': '💧 Apply mid-length to ends only. Leave 2-3 minutes, rinse cool water.',
        'scalp-treatment': '🎯 Apply to dry scalp, massage gently. Leave on as directed (usually 5-10 min).',
        'hair-mask': '💆 Apply to damp hair, avoid scalp. Cover with cap, leave 20-30 minutes.',
        'hair-oil': '✨ Use on damp or dry ends. Start with 1-2 drops to avoid greasiness.',
      };

      if (techniques[category]) {
        suggestions.push(techniques[category]);
      }

      return suggestions;
    };

    const getInteractionWarnings = (actives: Array<{name: string, info: any}>): string[] => {
      const suggestions = [];
      const activeNames = actives.map(a => a.name);

      if (activeNames.includes('retinol') && (activeNames.includes('aha') || activeNames.includes('bha'))) {
        suggestions.push('⚠️ Contains retinol + acids - use on alternating nights to prevent irritation');
      }
      if (activeNames.includes('benzoyl peroxide') && activeNames.includes('retinol')) {
        suggestions.push('⚠️ Benzoyl peroxide can inactivate retinol - use BP in AM, retinol in PM');
      }
      if (activeNames.includes('vitamin c') && activeNames.includes('retinol')) {
        suggestions.push('💡 Use vitamin C in AM, retinol in PM for optimal results without interaction');
      }
      if (activeNames.includes('niacinamide') && activeNames.includes('peptide')) {
        suggestions.push('✨ Great combo! Niacinamide + peptides work synergistically for anti-aging');
      }

      return suggestions;
    };

    const getProductTypeTips = (profile: any, actives: Array<{name: string, info: any}>, prodType: string): string[] => {
      const suggestions = [];
      
      if (prodType === 'face') {
        const skinType = profile?.skin_type || 'normal';
        const faceTips: Record<string, string> = {
          'sensitive': '🧴 Patch test on inner arm for 24-48 hours before facial use',
          'oily': '🎯 Apply to clean, dry skin. No need for heavy moisturizer on top',
          'dry': '💧 Layer over hydrating toner. Seal with rich moisturizer to prevent water loss',
          'combination': '⚖️ Apply to entire face, but reduce frequency in oily zones if needed',
          'normal': '✓ Use consistently morning and/or evening based on product type'
        };
        
        if (faceTips[skinType]) {
          suggestions.push(faceTips[skinType]);
        }
        
        if (skinType === 'sensitive' && actives.length > 0) {
          suggestions.push('⏱️ Start 2x/week, gradually increase as tolerated');
        }
      } 
      else if (prodType === 'body') {
        const bodyConcerns = profile?.body_concerns || [];
        
        if (bodyConcerns.includes('eczema') || bodyConcerns.includes('sensitive-skin')) {
          suggestions.push('🧴 Patch test on inner arm. Apply to damp skin within 3 min of showering');
        } else {
          suggestions.push('💧 Apply to damp skin after showering for maximum absorption');
        }
        
        if (bodyConcerns.includes('keratosis-pilaris')) {
          suggestions.push('🎯 Focus on rough areas (upper arms, thighs). Consistent use shows results in 4-6 weeks');
        }
        
        if (bodyConcerns.includes('body-acne')) {
          suggestions.push('🚿 Use after cleansing. Focus on back, chest, and shoulders');
        }
      } 
      else if (prodType === 'hair') {
        const scalpType = profile?.scalp_type;
        
        if (scalpType === 'oily') {
          suggestions.push('🚿 Focus on scalp, not hair lengths. Avoid heavy products on roots');
        } else if (scalpType === 'dry') {
          suggestions.push('💧 Apply to scalp and leave on as directed. Avoid over-washing');
        } else if (scalpType === 'sensitive') {
          suggestions.push('🧴 Patch test behind ear. Use lukewarm water (hot water increases sensitivity)');
        } else {
          suggestions.push('✓ Massage into scalp for 30-60 seconds for best absorption');
        }
      }

      return suggestions;
    };

    const generateSummary = (score: number, profile: any, prodType: string): string => {
      // Determine the context based on product type
      let context = '';
      if (prodType === 'face') {
        context = profile?.skin_type ? `your ${profile.skin_type} skin` : 'your facial skin';
      } else if (prodType === 'body') {
        const bodyConcerns = profile?.body_concerns || [];
        context = bodyConcerns.length > 0 
          ? `your body (addressing ${bodyConcerns.slice(0, 2).join(', ')})` 
          : 'your body';
      } else if (prodType === 'hair') {
        context = profile?.scalp_type 
          ? `your ${profile.scalp_type} scalp/hair` 
          : 'your hair';
      } else {
        context = 'your needs';
      }
      
      if (score >= 70) {
        return `Great match for ${context}! This product has a strong ingredient profile.`;
      } else if (score >= 50) {
        return `Decent option for ${context}. Some ingredients may need attention.`;
      } else {
        return `Not ideal for ${context}. Consider alternatives with safer formulations.`;
      }
    };

    // Fallback guidance for products without strong actives
    const getGeneralProductGuidance = (category: string, prodType: string, profile: any): string[] => {
      const suggestions = [];
      const lowerCategory = category?.toLowerCase() || '';
      
      if (prodType === 'body') {
        if (lowerCategory.includes('oil')) {
          suggestions.push('💧 Best applied to damp skin right after showering for maximum absorption');
          suggestions.push('🌙 Perfect for evening use. Can be mixed with body lotion for lighter texture');
          suggestions.push('⏱️ A little goes a long way. Start with 3-4 pumps and increase as needed');
        } else if (lowerCategory.includes('lotion') || lowerCategory.includes('cream')) {
          suggestions.push('🚿 Apply within 3 minutes of showering to lock in moisture');
          suggestions.push('💪 Reapply to dry areas (elbows, knees, hands) throughout the day');
          suggestions.push('🌡️ Store in cool, dry place. Body products last 12-18 months after opening');
        } else if (lowerCategory.includes('deodorant')) {
          suggestions.push('✨ Apply to clean, completely dry skin for best results');
          suggestions.push('🌙 Consider applying at night—antiperspirants work better on inactive sweat glands');
          suggestions.push('⚠️ Wait 2-3 minutes before dressing to prevent transfer to clothing');
        } else if (lowerCategory.includes('scrub') || lowerCategory.includes('exfoliant')) {
          suggestions.push('📅 Use 2-3 times per week, not daily, to avoid over-exfoliation');
          suggestions.push('💦 Apply to damp skin in circular motions. Rinse thoroughly');
          suggestions.push('🧴 Follow immediately with moisturizer or body oil');
        } else {
          suggestions.push('💧 Apply to clean, damp skin for best absorption');
          suggestions.push('🧴 Use consistently for 4-6 weeks to see full benefits');
        }
      } else if (prodType === 'hair') {
        if (lowerCategory.includes('shampoo')) {
          suggestions.push('🚿 Focus on scalp, not lengths. Use fingertips (not nails) to massage');
          suggestions.push('💧 Double cleanse if you use heavy styling products');
          suggestions.push('⏱️ Adjust frequency based on scalp type: oily (daily), normal (2-3x/week), dry (1-2x/week)');
        } else if (lowerCategory.includes('conditioner')) {
          suggestions.push('📏 Apply from mid-length to ends, avoiding scalp unless very dry');
          suggestions.push('⏱️ Leave on for 2-3 minutes minimum for best results');
          suggestions.push('🧊 Finish with cool water rinse to seal cuticles and add shine');
        } else if (lowerCategory.includes('oil') || lowerCategory.includes('serum')) {
          suggestions.push('💧 Use on damp hair for easier distribution and better absorption');
          suggestions.push('🌙 Can be used as overnight treatment. Shampoo out in morning');
          suggestions.push('⚠️ Start with 1-2 drops. Fine hair needs less than thick/coarse hair');
        } else {
          suggestions.push('🚿 Use as directed on product label');
          suggestions.push('💇 Adjust frequency based on your hair\'s response');
        }
      } else if (prodType === 'face') {
        if (lowerCategory.includes('cleanser')) {
          suggestions.push('🌡️ Use lukewarm water. Hot water strips natural oils, cold doesn\'t cleanse effectively');
          suggestions.push('⏱️ Massage for 60 seconds to properly dissolve makeup and sunscreen');
          suggestions.push('🌙 Double cleanse at night if wearing makeup or sunscreen');
        } else if (lowerCategory.includes('moisturizer') || lowerCategory.includes('cream')) {
          suggestions.push('💧 Apply to damp skin for better absorption (pat dry, don\'t rub)');
          suggestions.push('⬆️ Use upward motions. Don\'t forget neck and décolletage');
          suggestions.push('☀️ If no SPF, always apply sunscreen after moisturizer in AM');
        } else if (lowerCategory.includes('oil')) {
          suggestions.push('🌙 Oils work best as last step in PM routine to seal in moisture');
          suggestions.push('💧 Mix 2-3 drops with moisturizer if pure oil feels too heavy');
          suggestions.push('⚠️ Avoid if using water-based sunscreen in AM—oil can break down SPF');
        } else {
          suggestions.push('✨ Perform patch test before first full use');
          suggestions.push('🧴 Use consistently as part of your routine');
        }
      }
      
      return suggestions;
    };

    // Generate recommendations - REORDERED for better fallbacks
    const detectedActives = detectActives(ingredientsArray);
    const productCategory = extractedCategory || 'unknown';
    const allConcerns = [...(profile?.skin_concerns || []), ...(profile?.body_concerns || [])];

    // STEP 1: Start with general product guidance based on category (most reliable)
    let routineSuggestions = [
      ...getGeneralProductGuidance(productCategory, productType, profile),
    ];

    // STEP 2: Add active-specific guidance if available
    routineSuggestions.push(...getTimingRecommendations(detectedActives, productType));
    routineSuggestions.push(...getConcernGuidance(allConcerns, detectedActives, productType, profile));
    routineSuggestions.push(...getInteractionWarnings(detectedActives));

    // STEP 3: Add application technique if category is recognized
    const applicationTechniques = getApplicationTechnique(productCategory, productType);
    if (applicationTechniques.length > 0) {
      routineSuggestions.push(...applicationTechniques);
    }

    // STEP 4: Add profile-specific tips (skin type, body concerns, scalp type)
    routineSuggestions.push(...getProductTypeTips(profile, detectedActives, productType));

    // STEP 5: Add active-specific tips if space permits
    for (const active of detectedActives.slice(0, 2)) {
      if (active.info.tips && routineSuggestions.length < 8) {
        routineSuggestions.push(...active.info.tips.slice(0, 1));
      }
    }

    // STEP 6: Deduplicate suggestions (remove near-duplicates)
    const uniqueSuggestions = [];
    const seenKeywords = new Set();

    for (const suggestion of routineSuggestions) {
      // Extract key words (ignore emojis and common words)
      const keywords = suggestion
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 4 && !['apply', 'after', 'before', 'using'].includes(w))
        .slice(0, 3)
        .join('-');
      
      if (!seenKeywords.has(keywords)) {
        seenKeywords.add(keywords);
        uniqueSuggestions.push(suggestion);
      }
    }

    // Limit to 5-7 suggestions
    routineSuggestions = uniqueSuggestions.slice(0, 7);

    // SAFETY CHECK: Always have at least 2 suggestions
    if (routineSuggestions.length === 0) {
      console.warn(`No suggestions generated for ${product_name} (type: ${productType}, category: ${productCategory})`);
      routineSuggestions = [
        '✨ Use consistently as directed on product label',
        `📅 Track your ${productType === 'face' ? 'skin' : productType === 'hair' ? 'hair' : 'body'}'s response over 4-6 weeks`
      ];
    }

    console.log(`Generated ${routineSuggestions.length} routine suggestions for ${product_name}`);

    const recommendations = {
      safe_ingredients: safe,
      concern_ingredients: concerns,
      warnings: warnings,
      summary: generateSummary(epiqScore, profile, productType),
      routine_suggestions: routineSuggestions,
      personalized: !!profile,
      product_metadata: {
        brand: extractedBrand,
        category: extractedCategory,
        product_type: productType,
        product_type_label: productType === 'face' ? '👤 Facial Care' : 
                            productType === 'body' ? '💪 Body Care' : 
                            productType === 'hair' ? '💇 Hair/Scalp Care' : 
                            '🧴 Other'
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
        recommendations_json: {
          ...recommendations,
          ingredient_data: ingredientResults
        }
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
