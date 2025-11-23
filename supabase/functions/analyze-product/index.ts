import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SkinLytix GPT System Prompt - AI Explanation Engine
const SKINLYTIX_SYSTEM_PROMPT = `You are SkinLytix GPT, an AI explanation engine inside the SkinLytix web app.

You do NOT talk to users directly or ask follow-up questions.  
You receive a single JSON object that contains the result of a SkinLytix product analysis (name, brand, ingredients, flags, scores, etc.), and your ONLY job is to turn that analysis into a clear, friendly explanation for the user.

You are not a doctor, esthetician, dermatologist, or pharmacist, and you must never give medical advice, diagnosis, or treatment.

──────────────── INPUT FORMAT ────────────────
You will receive ONE input object that represents the analysis output from SkinLytix. It may include fields such as (names may vary):

- productName: string
- brand: string | null
- ingredients: array of ingredient objects (e.g., name, role, category, comedogenic_rating, irritation_flag, notes)
- score or epiqScore: number | string (an overall SkinLytix-style score)
- scoreLabel: string (e.g., "low risk", "moderate risk", "high risk", etc.)
- flags: array of strings or objects indicating potential concerns (e.g., "fragrance", "essential oils", "high-strength acids", "occlusives", "pore-clogging risk")
- skinConcernsMatched or tags: arrays that describe potential matches (e.g., "hydration", "barrier support", "brightening")
- routines or usageSuggestions: information about where the product fits in a routine (if provided)
- any other fields that the SkinLytix analyzer may compute

The exact schema may change over time. You must be flexible and infer meaning from field names and values. Do NOT assume fields will always be present.

You must treat this analysis as the source of truth. Do not invent additional flags, scores, or ingredients that are not present in the input.

──────────────── PURPOSE ────────────────
Your purpose is to help the user understand:
1. What this product appears to do from an ingredient perspective.
2. Why SkinLytix scored or flagged it the way it did.
3. What the main ingredient "themes" are (e.g., hydration, exfoliation, barrier support).
4. What kinds of skin or routines this product might be better suited for or require more caution with, from a general, non-medical standpoint.
5. When it may be wise to check in with a licensed esthetician or dermatologist for more personalized guidance.

You are explaining the analysis, not changing it. You must never contradict the analyzer's scores or flags.

──────────────── SCOPE & LIMITATIONS ────────────────
You ARE allowed to:
- Explain the roles of ingredients by category (e.g., humectants, emollients, occlusives, exfoliating acids, retinoids, antioxidants).
- Describe general pros/cons of ingredient types (e.g., fragrance, essential oils, strong acids, retinoids).
- Highlight which ingredients or flags likely influenced the score or risk assessment.
- Suggest high-level routine placement (e.g., "This looks like a serum you'd typically use after cleansing and before moisturizer") IF the product type or category is clear from the analysis.
- Provide general safety awareness from an ingredient perspective only (e.g., "strong acids can be irritating if overused").

You are NOT allowed to:
- Diagnose conditions (e.g., fungal acne, rosacea, eczema, dermatitis, psoriasis, infections, "rash types").
- Provide treatment plans for medical issues.
- Advise on starting, stopping, or changing prescription medications.
- Confirm safety in pregnancy, breastfeeding, or complex medical situations.
- Give urgent medical instructions.

If the analysis or context implies medical-level concerns or persistent/worsening issues, you must gently recommend talking with a licensed esthetician or dermatologist.

──────────────── PROFESSIONAL REFERRAL RULES ────────────────
You must set a professional referral when ANY of the following are implied by the analysis or by any metadata included in the input:

- The analysis mentions diagnosed or suspected conditions ("rosacea", "psoriasis", "eczema", "melasma", "dermatitis", "infection", etc.).
- The analysis includes notes about severe irritation, burning, blistering, swelling, or other concerning reactions (if such fields exist).
- Any metadata or flags suggest the user should get in-person evaluation.

In those cases:
1. Still provide a high-level ingredient explanation if it is safe to do so.
2. Clearly recommend checking in with a licensed esthetician or dermatologist for personalized advice.
3. Use calm, supportive language.

Example phrases:
- "Based on this analysis, there are some considerations that are best discussed with a licensed esthetician or dermatologist."
- "For medical-level or persistent concerns, in-person guidance from a professional is important."

──────────────── HALLUCINATION & ACCURACY RULES ────────────────
Your highest priority is safety, honesty, and consistency with the input analysis.

You must NOT:
- Invent ingredients that are not present in the input.
- Change or fabricate numerical scores.
- Add extra flags or "risks" that are not supported by the analysis data.
- Fabricate clinical study names, percentages, or highly specific statistics.
- Make medical or guaranteed outcome claims (e.g., "will cure," "will fix," "will erase").

You MUST:
- Base all reasoning on the ingredients, flags, and scores given.
- When something is unclear, say so in debug_notes but keep user-facing content confident yet cautious.
- Prefer general phrasing over specific unverified claims:
  - "This type of ingredient is commonly used for…"
  - "Some people may find this irritating, especially with frequent use or sensitive skin."
  - "Results can vary a lot from person to person."

If there is not enough information to assess risk, use safety_level: "unknown".

──────────────── TONE & VOICE ────────────────
Tone:
- Warm, clear, and non-judgmental.
- Science-informed but easy to understand.
- Respectful of different budgets and routines.

Voice:
- Sound like a knowledgeable friend with ingredient literacy and a science lens.
- Reassure users that skincare is personal and that this is educational help, not a diagnosis.

Avoid:
- Overhyped language ("miracle," "magic cure," "game-changing").
- Fear-based messaging or shaming.
- Overpromising results or timelines.

──────────────── OUTPUT FORMAT (REQUIRED JSON) ────────────────
You MUST respond with a single valid JSON object.  
Do NOT include any text outside of the JSON.  
Do NOT include comments.

The JSON MUST match this structure:

{
  "answer_markdown": string,
  "summary_one_liner": string,
  "ingredient_focus": boolean,
  "epiQ_or_score_used": boolean,
  "professional_referral": {
    "needed": boolean,
    "reason": string,
    "suggested_professional_type": "none" | "esthetician" | "dermatologist" | "either"
  },
  "safety_level": "low" | "moderate" | "high" | "unknown",
  "sources_used": string[],
  "debug_notes": string
}

Field guidance:

- answer_markdown:
  - A clear, friendly explanation of the analysis in markdown.
  - Organize it with short headings and bullet points when helpful, for example:
    - "Overall Snapshot"
    - "Key Ingredients and What They Do"
    - "Why SkinLytix Flagged This"
    - "How It Might Fit Into a Routine"
  - Focus on explaining what's already in the analysis rather than adding new ideas.

- summary_one_liner:
  - One concise sentence that captures the main takeaway.
  - Example: "This product focuses on hydration and barrier support, with a few ingredients that may be irritating for sensitive skin."

- ingredient_focus:
  - true if the explanation is primarily about the ingredient list and formulation.
  - false if the explanation is primarily about general routine or usage concepts.

- epiQ_or_score_used:
  - true if you referenced the analyzer's overall score, score label, or specific flags in your reasoning.
  - false if you only described ingredients at a very general level.

- professional_referral:
  - needed:
    - true if, based on the analysis context, a licensed esthetician or dermatologist should be recommended.
    - false otherwise.
  - reason:
    - Short explanation for why you did or did not recommend a referral.
  - suggested_professional_type:
    - "none" if referral is not needed.
    - "esthetician" when routine/product-level guidance may be beneficial.
    - "dermatologist" when issues or products feel more medical/complex.
    - "either" when both could reasonably help.

- safety_level:
  - A high-level indication of risk, based ONLY on the analysis input:
    - "low"      = mostly gentle/low-risk ingredients, recognizing individual variability.
    - "moderate" = some notable actives or potential irritants; caution for sensitive users.
    - "high"     = strong actives, multiple potential irritants, or combination that clearly warrants caution.
    - "unknown"  = not enough info (e.g., incomplete ingredients, missing fields, unclear context).

- sources_used:
  - A short list of strings indicating where your reasoning conceptually came from, for logging/debugging only.
  - Examples:
    - ["analysis:score_and_flags", "analysis:ingredients"]
    - ["analysis:ingredients_only"]

- debug_notes:
  - Brief internal notes about how you interpreted the analysis.
  - Do NOT include any user-identifying data.
  - Keep it short, or use an empty string if nothing special is needed.

──────────────── BEHAVIOR SUMMARY ────────────────
- Do NOT ask the user questions.
- Do NOT refer to yourself as a chatbot or mention system prompts.
- Do NOT modify the underlying analysis; only explain it.
- Always respond with valid JSON in the required format.
- Always prioritize user safety, clarity, and honesty over sounding certain or complete.`;

type SkinLytixGptResponse = {
  answer_markdown: string;
  summary_one_liner: string;
  ingredient_focus: boolean;
  epiQ_or_score_used: boolean;
  professional_referral: {
    needed: boolean;
    reason: string;
    suggested_professional_type: "none" | "esthetician" | "dermatologist" | "either";
  };
  safety_level: "low" | "moderate" | "high" | "unknown";
  sources_used: string[];
  debug_notes: string;
};

// Generate AI explanation for individual ingredient
async function generateIngredientExplanation(
  ingredientName: string,
  category: 'safe' | 'beneficial' | 'problematic' | 'unverified',
  pubchemData: any,
  lovableApiKey: string
): Promise<string> {
  try {
    const systemPrompt = `You are an ingredient expert. Explain this skincare ingredient in 2-3 friendly sentences for consumers.
Focus on: what it does (role/function), why it's used, and any key safety notes.
Keep it conversational and non-technical. No medical claims.`;

    const context = pubchemData ? `Molecular weight: ${pubchemData.molecular_weight || 'unknown'}` : 'Limited scientific data available';
    const userMessage = `Explain ${ingredientName} (category: ${category}) for a consumer. ${context}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return 'No detailed information available.';
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error generating explanation for ${ingredientName}:`, error);
    return 'No detailed information available.';
  }
}

async function generateGptExplanation(
  analysisData: {
    productName: string;
    brand: string | null;
    category: string | null;
    ingredients: string[];
    epiqScore: number;
    scoreLabel: string;
    recommendations: any;
  },
  lovableApiKey: string
): Promise<SkinLytixGptResponse | null> {
  try {
    console.log('Generating GPT explanation for:', analysisData.productName);

    const formattedAnalysis = {
      productName: analysisData.productName,
      brand: analysisData.brand,
      category: analysisData.category,
      epiqScore: analysisData.epiqScore,
      scoreLabel: analysisData.scoreLabel,
      ingredients: analysisData.ingredients.map((ing: string) => ({ name: ing })),
      flags: [
        ...(analysisData.recommendations.problematic_ingredients || []).map((p: any) => ({
          type: 'problematic',
          ingredient: p.name,
          reason: p.reason
        })),
        ...(analysisData.recommendations.concern_ingredients || []).map((c: any) => ({
          type: 'concern',
          ingredient: c.name,
          concern: c.concern
        }))
      ],
      warnings: analysisData.recommendations.warnings || [],
      beneficialIngredients: analysisData.recommendations.beneficial_ingredients || [],
      routineSuggestions: analysisData.recommendations.routine_suggestions || [],
      summary: analysisData.recommendations.summary || '',
      personalized: analysisData.recommendations.personalized || false
    };

    const userMessage = `Explain this SkinLytix analysis in clear, friendly language for the user. Keep it non-medical and follow the system rules.

Analysis Data:
${JSON.stringify(formattedAnalysis, null, 2)}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: SKINLYTIX_SYSTEM_PROMPT },
          { role: 'user', content: userMessage }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.warn('Lovable AI rate limit exceeded - skipping GPT explanation');
        return null;
      }
      if (response.status === 402) {
        console.warn('Lovable AI credits depleted - skipping GPT explanation');
        return null;
      }
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    const gptContent = data.choices[0].message.content;
    const gptResponse = JSON.parse(gptContent) as SkinLytixGptResponse;
    
    if (!gptResponse.answer_markdown || !gptResponse.summary_one_liner) {
      console.error('Invalid GPT response structure:', gptResponse);
      return null;
    }

    console.log('✓ GPT explanation generated successfully');
    console.log('  - Safety level:', gptResponse.safety_level);
    console.log('  - Professional referral needed:', gptResponse.professional_referral.needed);

    return gptResponse;

  } catch (error) {
    console.error('Error generating GPT explanation:', error);
    return null;
  }
}

function generateSummary(score: number, profile: any, productType: 'face' | 'body' | 'hair' | 'other'): string {
  if (score >= 70) {
    return `This ${productType} product shows excellent ingredient safety and quality. Most ingredients are safe and beneficial${profile ? ' for your skin profile' : ''}.`;
  } else if (score >= 50) {
    return `This ${productType} product has decent ingredient quality with some room for improvement${profile ? ' based on your skin concerns' : ''}.`;
  } else {
    return `This ${productType} product contains several concerning ingredients that may not be ideal${profile ? ' for your skin type and concerns' : ''}.`;
  }
}

function generatePersonalizedSummary(
  score: number, 
  profile: any, 
  productType: 'face' | 'body' | 'hair' | 'other',
  productName: string,
  problematicIngredients: Array<{name: string, reason: string}>,
  beneficialIngredients: Array<{name: string, benefit: string}>
): string {
  if (!profile) return generateSummary(score, profile, productType);
  
  const skinType = profile.skin_type || 'not specified';
  const skinConcerns = Array.isArray(profile.skin_concerns) && profile.skin_concerns.length > 0 ? profile.skin_concerns : [];
  let summary = '';
  
  if (productType === 'face') {
    summary += `For your ${skinType} skin`;
    if (skinConcerns.length > 0) summary += ` with ${skinConcerns.join(', ')} concerns`;
    summary += ', ';
  } else if (productType === 'body' && profile.body_concerns?.length > 0) {
    summary += `For your body care needs (${profile.body_concerns.join(', ')}), `;
  } else if (productType === 'hair' && profile.scalp_type) {
    summary += `For your ${profile.scalp_type} scalp, `;
  }
  
  if (score >= 70) {
    summary += 'this product aligns well with your needs. ';
    if (beneficialIngredients.length > 0) {
      const topBeneficial = beneficialIngredients.slice(0, 2).map(i => i.name).join(' and ');
      summary += `The ${topBeneficial} can help address your concerns. `;
    }
    summary += 'Continue using as directed for best results.';
  } else if (score >= 50) {
    summary += 'this product offers decent compatibility but has room for improvement. ';
    if (problematicIngredients.length > 0) {
      const concern = problematicIngredients[0];
      summary += `Watch for ${concern.name} as it ${concern.reason.toLowerCase()}. `;
    }
    summary += 'Consider monitoring how your skin responds.';
  } else {
    summary += '⚠️ this product may not be ideal for you. ';
    if (problematicIngredients.length > 0) {
      const topConcerns = problematicIngredients.slice(0, 2);
      summary += `It contains ${topConcerns.map(c => c.name).join(' and ')} which ${topConcerns[0].reason.toLowerCase()}. `;
    }
    if (productType === 'face') {
      if (skinType === 'dry' || skinType === 'sensitive') {
        summary += 'Consider products with ceramides, hyaluronic acid, or niacinamide instead.';
      } else if (skinType === 'oily') {
        summary += 'Look for lightweight, non-comedogenic formulas with salicylic acid or niacinamide.';
      } else if (skinConcerns.includes('acne')) {
        summary += 'Seek products with salicylic acid, benzoyl peroxide, or tea tree oil for better results.';
      } else if (skinConcerns.includes('aging')) {
        summary += 'Look for retinol, peptides, or vitamin C for anti-aging benefits.';
      } else {
        summary += 'Consider products specifically formulated for your skin type and concerns.';
      }
    } else if (productType === 'hair') {
      summary += 'Look for gentler, sulfate-free alternatives for your scalp type.';
    } else {
      summary += 'Consider alternatives better suited to your specific needs.';
    }
  }
  return summary;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { product_name, barcode, brand, category, ingredients_list, product_price, user_id } = await req.json();
    
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
      if (tagString.includes('body spray') || tagString.includes('body mist')) return 'body-spray';
      if (tagString.includes('cologne') || tagString.includes('eau de toilette')) return 'fragrance';
      
      // HAIR
      if (tagString.includes('shampoo')) return 'shampoo';
      if (tagString.includes('conditioner')) return 'conditioner';
      if (tagString.includes('hair mask')) return 'hair-mask';
      if (tagString.includes('scalp treatment') || tagString.includes('anti-dandruff')) return 'scalp-treatment';
      if (tagString.includes('hair oil')) return 'hair-oil';
      if (tagString.includes('hair gel') || tagString.includes('styling gel')) return 'hair-gel';
      if (tagString.includes('pomade') || tagString.includes('hair wax')) return 'pomade';
      if (tagString.includes('hair spray') || tagString.includes('hairspray')) return 'hair-spray';
      if (tagString.includes('mousse') || tagString.includes('styling foam')) return 'mousse';
      if (tagString.includes('leave-in')) return 'leave-in-treatment';
      if (tagString.includes('scalp serum')) return 'scalp-serum';
      if (tagString.includes('hair growth') || tagString.includes('hair thickening')) return 'hair-growth';
      
      // BEARD CARE
      if (tagString.includes('beard wash') || tagString.includes('beard cleanser')) return 'beard-wash';
      if (tagString.includes('beard oil')) return 'beard-oil';
      if (tagString.includes('beard balm')) return 'beard-balm';
      if (tagString.includes('beard conditioner') || tagString.includes('beard softener')) return 'beard-conditioner';
      if (tagString.includes('beard wax') || tagString.includes('mustache wax')) return 'beard-wax';
      
      // SHAVING
      if (tagString.includes('shaving cream') || tagString.includes('shaving foam')) return 'shaving-cream';
      if (tagString.includes('pre-shave')) return 'pre-shave';
      if (tagString.includes('aftershave')) return 'aftershave';
      if (tagString.includes('razor bump') || tagString.includes('ingrown hair treatment')) return 'razor-treatment';
      if (tagString.includes('shaving')) return 'shaving';
      
      return null;
    };

    // Helper: Get product type from category
    const getProductType = (category: string): 'face' | 'body' | 'hair' | 'other' => {
      const lowerCategory = category.toLowerCase().trim();
      
      // FACE
      if (['face-cleanser', 'serum', 'face-moisturizer', 'sunscreen', 'toner', 'mask', 'eye-cream'].includes(lowerCategory)) {
        return 'face';
      }
      
      // BODY (including shaving products and fragrances)
      if (['body-wash', 'body-lotion', 'hand-cream', 'foot-cream', 'deodorant', 'body-oil', 
           'body-scrub', 'body-sunscreen', 'body-spray', 'fragrance',
           'shaving', 'shaving-cream', 'pre-shave', 'aftershave', 'razor-treatment'].includes(lowerCategory)) {
        return 'body';
      }
      
      // HAIR (including beard care, styling products, scalp care)
      if (['shampoo', 'conditioner', 'hair-mask', 'scalp-treatment', 'hair-oil',
           'beard-wash', 'beard-oil', 'beard-balm', 'beard-conditioner', 'beard-wax',
           'hair-gel', 'pomade', 'hair-spray', 'mousse', 'leave-in-treatment',
           'scalp-serum', 'hair-growth'].includes(lowerCategory)) {
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
    const detectionSource = category ? 'user-provided' : cachedProductData ? 'OBF-cache' : 'auto-detected';
    console.log(`Product categorization: "${extractedCategory}" (${extractedBrand}) → productType: "${productType}" | Source: ${detectionSource}`);

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

    // Analyze ingredients with new categorization
    const safe = [];              // Ingredients that are verified AND not problematic
    const problematic = [];       // Ingredients that ARE in PubChem but bad for user
    const concerns = [];          // Ingredients NOT in PubChem (unverified)
    const warnings = [];          // Personalized warning messages
    const beneficial = [];        // Ingredients that target user's specific concerns

    for (const result of ingredientResults) {
      const ingredientLower = result.name.toLowerCase();
      
      if (result.data) {
        // Ingredient IS in PubChem - now check if it's problematic for THIS user
        let isProblematic = false;
        
        if (profile) {
          const allConcerns = [...(profile.skin_concerns || []), ...(profile.body_concerns || [])];
          
          // Check if problematic for skin type
          if (productType === 'face' && profile.skin_type) {
            const problematicList = problematicIngredients[profile.skin_type] || [];
            if (problematicList.some(p => ingredientLower.includes(p))) {
              isProblematic = true;
              problematic.push({
                name: result.name,
                reason: `May not suit ${profile.skin_type} skin`
              });
              warnings.push(`⚠️ ${result.name} may not suit ${profile.skin_type} skin`);
            }
          }
          
          // Check if problematic for concerns
          for (const concern of allConcerns) {
            const problematicList = problematicIngredients[concern] || [];
            if (problematicList.some(p => ingredientLower.includes(p))) {
              if (!isProblematic) { // Avoid duplicate entries
                isProblematic = true;
                const concernLabel = concern.replace(/-/g, ' ');
                problematic.push({
                  name: result.name,
                  reason: `May worsen ${concernLabel}`
                });
                warnings.push(`⚠️ ${result.name} may worsen ${concernLabel}`);
              }
            }
          }
        }
        
        // Only add to "safe" if NOT problematic
        if (!isProblematic) {
          safe.push(result.name);
          
          // Check if it's BENEFICIAL (targets user's concerns)
          if (profile) {
            const allConcerns = [...(profile.skin_concerns || []), ...(profile.body_concerns || [])];
            
            // Check beneficial for skin type
            if (productType === 'face' && profile.skin_type) {
              const beneficialList = beneficialIngredients[profile.skin_type] || [];
              if (beneficialList.some(b => ingredientLower.includes(b))) {
                beneficial.push({
                  name: result.name,
                  benefit: `Beneficial for ${profile.skin_type} skin`
                });
              }
            }
            
            // Check beneficial for concerns
            for (const concern of allConcerns) {
              const beneficialList = beneficialIngredients[concern] || [];
              if (beneficialList.some(b => ingredientLower.includes(b))) {
                const concernLabel = concern.replace(/-/g, ' ');
                beneficial.push({
                  name: result.name,
                  benefit: `Targets ${concernLabel}`
                });
                break; // Only add once per ingredient
              }
            }
          }
        }
        
      } else {
        // NOT in PubChem - check if it's a commonly safe ingredient
        if (!isCommonSafeIngredient(result.name)) {
          concerns.push(result.name);
        } else {
          safe.push(result.name);
          console.log(`Whitelisted safe ingredient: ${result.name}`);
        }
      }
    }

    // Calculate personalized EpiQ score with new logic
    const totalIngredients = ingredientsArray.length;
    const safeCount = safe.length;
    const problematicCount = problematic.length;
    const beneficialCount = beneficial.length;

    // Base score: percentage of safe ingredients
    let epiqScore = totalIngredients > 0 
      ? Math.round((safeCount / totalIngredients) * 100) 
      : 50;

    // Heavy penalty for problematic ingredients (more severe than just warnings)
    epiqScore = Math.max(0, epiqScore - (problematicCount * 10));  // -10 points per problematic ingredient

    // Bonus for beneficial ingredients
    epiqScore = Math.min(100, epiqScore + (beneficialCount * 5));  // +5 points per beneficial ingredient

    // Apply product type modifiers
    if (productType === 'face') {
      epiqScore = Math.min(100, epiqScore + 5); // Face products get slight bonus
    }

    console.log('EpiQ Score calculation:', {
      totalIngredients,
      safeCount,
      problematicCount,
      beneficialCount,
      baseScore: Math.round((safeCount / totalIngredients) * 100),
      finalScore: epiqScore
    });

    // Expanded ingredient knowledge base
    const ingredientKnowledge: Record<string, any> = {
      // FACE ACTIVES
      'retinol': {
        timing: 'PM only',
        concerns: ['aging', 'acne'],
        conflicts: ['vitamin c', 'aha', 'bha'],
        tips: ['Start 2-3x/week and build tolerance', 'Apply to completely dry skin', 'Wait 20 minutes before moisturizer'],
        product_types: ['face'],
        sunSensitivity: true,
        category: 'active'
      },
      'vitamin c': {
        timing: 'AM preferred',
        concerns: ['aging', 'hyperpigmentation'],
        conflicts: ['retinol'],
        tips: ['Apply to clean skin first', 'Always follow with SPF 30+', 'Store in dark, cool place'],
        product_types: ['face'],
        sunSensitivity: true,
        category: 'active'
      },
      'salicylic acid': {
        timing: 'PM preferred',
        concerns: ['acne', 'oily', 'body-acne', 'oily-scalp'],
        conflicts: ['retinol'],
        tips: ['Use on clean, dry skin', 'Start 2x/week if new to acids', 'Avoid eye area'],
        product_types: ['face', 'body'],
        sunSensitivity: true,
        category: 'active'
      },
      'hyaluronic acid': {
        timing: 'AM & PM',
        concerns: ['dry', 'aging', 'dry-scalp'],
        conflicts: [],
        tips: ['Apply to damp skin for best absorption', 'Follow with moisturizer to seal', 'Use in humid environments or mist face first'],
        product_types: [],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'niacinamide': {
        timing: 'AM & PM',
        concerns: ['acne', 'hyperpigmentation', 'oily', 'eczema'],
        conflicts: [],
        tips: ['Great layering ingredient', 'Can be used with most actives', 'Safe for all skin types'],
        product_types: [],
        sunSensitivity: false,
        category: 'active'
      },
      'aha': {
        timing: 'PM only',
        concerns: ['aging', 'hyperpigmentation'],
        conflicts: ['retinol', 'bha'],
        tips: ['Use on alternating nights with retinol', 'Must use SPF next morning', 'Start with low concentration'],
        product_types: ['face'],
        sunSensitivity: true,
        category: 'active'
      },
      'bha': {
        timing: 'PM preferred',
        concerns: ['acne', 'oily'],
        conflicts: ['retinol', 'aha'],
        tips: ['Can penetrate oil in pores', 'Use 2-3x per week maximum', 'Don\'t combine with other exfoliants'],
        product_types: ['face'],
        sunSensitivity: true,
        category: 'active'
      },
      'peptide': {
        timing: 'AM & PM',
        concerns: ['aging', 'hair-thinning'],
        conflicts: [],
        tips: ['Works well with niacinamide', 'Apply before heavier creams', 'Consistent use shows results in 8-12 weeks'],
        product_types: ['face'],
        sunSensitivity: false,
        category: 'active'
      },
      'ceramide': {
        timing: 'AM & PM',
        concerns: ['dry', 'sensitive', 'eczema'],
        conflicts: [],
        tips: ['Essential for barrier repair', 'Best used in moisturizers', 'Safe for sensitive skin'],
        product_types: [],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'benzoyl peroxide': {
        timing: 'AM or PM',
        concerns: ['acne', 'body-acne'],
        conflicts: ['retinol'],
        tips: ['Use in AM, retinol in PM to avoid interaction', 'Can bleach fabrics', 'Start with 2.5% concentration'],
        product_types: ['face', 'body'],
        sunSensitivity: false,
        category: 'active'
      },
      
      // BODY ACTIVES
      'urea': {
        timing: 'AM & PM',
        concerns: ['keratosis-pilaris', 'dry-hands-feet', 'eczema'],
        conflicts: [],
        tips: ['Especially effective at 10%+ concentration', 'Apply to rough patches (elbows, knees, feet)', 'Can sting on broken skin'],
        product_types: ['body'],
        sunSensitivity: false,
        category: 'exfoliant'
      },
      'lactic acid': {
        timing: 'PM preferred',
        concerns: ['keratosis-pilaris', 'body-texture'],
        conflicts: ['retinol'],
        tips: ['Apply after shower on damp skin', 'Start with 5% concentration', 'Must use SPF on treated areas'],
        product_types: ['face', 'body'],
        sunSensitivity: true,
        category: 'exfoliant'
      },
      'glycolic acid': {
        timing: 'PM preferred',
        concerns: ['keratosis-pilaris', 'ingrown-hairs'],
        conflicts: ['retinol'],
        tips: ['Powerful exfoliant - start slowly', 'Great for rough body areas', 'Always follow with moisturizer'],
        product_types: ['face', 'body'],
        sunSensitivity: true,
        category: 'exfoliant'
      },
      'aluminum': {
        timing: 'AM',
        concerns: ['body-odor'],
        conflicts: [],
        tips: ['Apply to completely dry skin', 'Most effective antiperspirant ingredient', 'Some prefer aluminum-free alternatives'],
        product_types: ['body'],
        sunSensitivity: false,
        category: 'active'
      },
      
      // HAIR ACTIVES
      'zinc pyrithione': {
        timing: 'As needed',
        concerns: ['dandruff', 'scalp-sensitivity'],
        conflicts: [],
        tips: ['Lather and leave on scalp for 3-5 minutes', 'Use 2-3x/week for active dandruff', 'Safe for daily use once controlled'],
        product_types: ['hair'],
        sunSensitivity: false,
        category: 'active'
      },
      'tea tree oil': {
        timing: 'PM preferred',
        concerns: ['body-acne', 'dandruff', 'oily-scalp'],
        conflicts: [],
        tips: ['May cause sensitivity - patch test first', 'Dilute if using pure oil (1-2 drops in shampoo)'],
        product_types: ['body', 'hair'],
        sunSensitivity: false,
        category: 'active'
      },
      'biotin': {
        timing: 'AM & PM',
        concerns: ['hair-thinning'],
        conflicts: [],
        tips: ['Strengthens hair follicles over time', 'Safe for daily use in shampoos and conditioners'],
        product_types: ['hair'],
        sunSensitivity: false,
        category: 'active'
      },
      'caffeine': {
        timing: 'AM preferred',
        concerns: ['hair-thinning'],
        conflicts: [],
        tips: ['Stimulates scalp circulation', 'Leave on for 2-3 minutes', 'Best in shampoos and scalp treatments'],
        product_types: ['hair'],
        sunSensitivity: false,
        category: 'active'
      },
      'panthenol': {
        timing: 'AM & PM',
        concerns: ['dry-scalp', 'hair-thinning'],
        conflicts: [],
        tips: ['Deeply moisturizing for hair and scalp', 'Great for damaged or color-treated hair'],
        product_types: ['hair'],
        sunSensitivity: false,
        category: 'hydrator'
      },
      'sulfates': {
        timing: 'As needed',
        concerns: ['cleansing'],
        conflicts: [],
        tips: ['Consider sulfate-free if you have dry/sensitive scalp', 'Use less frequently if experiencing dryness'],
        product_types: ['hair'],
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
        const isBeardProduct = extractedCategory?.toLowerCase().includes('beard');
        context = profile?.scalp_type 
          ? `your ${profile.scalp_type} ${isBeardProduct ? 'beard/skin' : 'scalp/hair'}` 
          : `your ${isBeardProduct ? 'beard' : 'hair'}`;
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
    const getGeneralProductGuidance = (category: string, prodType: string, profile: any, productName: string, detectedActives: Array<{name: string, info: any}>): string[] => {
      const suggestions = [];
      const lowerCategory = category?.toLowerCase() || '';
      const activesText = detectedActives.length > 0 ? detectedActives.slice(0, 2).map(a => a.name).join(' and ') : '';
      
      if (prodType === 'body') {
        if (lowerCategory.includes('oil')) {
          suggestions.push(`💧 Use ${productName} on damp skin right after showering for maximum absorption`);
          suggestions.push(`🌙 ${productName} works best in evening routine—can be mixed with lotion for lighter texture`);
          suggestions.push('⏱️ A little goes a long way. Start with 3-4 pumps and increase as needed');
        } else if (lowerCategory.includes('lotion') || lowerCategory.includes('cream')) {
          suggestions.push(`🚿 Apply ${productName} within 3 minutes of showering to lock in moisture`);
          suggestions.push('💪 Reapply to dry areas (elbows, knees, hands) throughout the day');
          suggestions.push('🌡️ Store in cool, dry place. Body products last 12-18 months after opening');
        } else if (lowerCategory.includes('deodorant')) {
          suggestions.push(`✨ Apply ${productName} to clean, completely dry skin for best results`);
          suggestions.push('🌙 Consider applying at night—antiperspirants work better on inactive sweat glands');
          suggestions.push('⚠️ Wait 2-3 minutes before dressing to prevent transfer to clothing');
        } else if (lowerCategory.includes('scrub') || lowerCategory.includes('exfoliant')) {
          suggestions.push(`📅 Use ${productName} 2-3 times per week, not daily, to avoid over-exfoliation`);
          suggestions.push('💦 Apply to damp skin in circular motions. Rinse thoroughly');
          suggestions.push('🧴 Follow immediately with moisturizer or body oil');
        } else if (lowerCategory.includes('shaving') || lowerCategory.includes('razor')) {
          if (lowerCategory.includes('pre-shave')) {
            suggestions.push(`🚿 Apply ${productName} to clean, damp skin before shaving cream`);
            suggestions.push('💧 Softens hair and creates protective barrier');
            suggestions.push('⏱️ Let sit for 30 seconds before applying shaving cream');
          } else if (lowerCategory.includes('aftershave') || lowerCategory.includes('razor bump')) {
            suggestions.push(`✨ Apply ${productName} to clean skin immediately after shaving`);
            suggestions.push('🧊 Splash with cold water first to close pores');
            suggestions.push('⚠️ Avoid products with alcohol if you have sensitive skin');
          } else {
            suggestions.push(`🔥 Let ${productName} sit for 30-60 seconds before shaving`);
            suggestions.push('🪒 Shave with the grain first, against grain only for closer shave');
            suggestions.push('💧 Use warm water to soften hair before applying');
          }
        } else {
          suggestions.push(`💧 Apply ${productName} to clean, damp skin for best absorption`);
          suggestions.push('🧴 Use consistently for 4-6 weeks to see full benefits');
        }
      } else if (prodType === 'hair') {
        if (lowerCategory.includes('shampoo') || lowerCategory.includes('beard wash')) {
          suggestions.push(`🚿 Use ${productName} on scalp/skin, not lengths. Massage with fingertips (not nails)`);
          suggestions.push('💧 Double cleanse if you use heavy styling products or beard balms');
          suggestions.push('⏱️ Adjust frequency: oily (daily), normal (2-3x/week), dry (1-2x/week)');
        } else if (lowerCategory.includes('conditioner') || lowerCategory.includes('beard conditioner')) {
          suggestions.push(`📏 Apply ${productName} from mid-length to ends, avoiding scalp unless very dry`);
          suggestions.push('⏱️ Leave on for 2-3 minutes minimum for best softening results');
          suggestions.push('🧊 Finish with cool water rinse to seal cuticles and add shine');
        } else if (lowerCategory.includes('beard oil')) {
          suggestions.push(`💧 Apply ${productName} to damp beard for easier distribution`);
          suggestions.push('🌙 Can be used as overnight treatment. Wash out in morning if needed');
          suggestions.push('⚠️ Start with 2-3 drops for short beards, 4-6 for longer. Less is more');
        } else if (lowerCategory.includes('hair oil') || lowerCategory.includes('serum')) {
          suggestions.push(`💧 Use ${productName} on damp hair for easier distribution and better absorption`);
          suggestions.push('🌙 Can be used as overnight treatment. Shampoo out in morning');
          suggestions.push('⚠️ Start with 1-2 drops. Fine hair needs less than thick/coarse hair');
        } else if (lowerCategory.includes('beard balm') || lowerCategory.includes('beard wax')) {
          suggestions.push(`🔥 Warm ${productName} between palms until melted before applying`);
          suggestions.push('💨 Apply to towel-dried beard. Style while damp for best hold');
          suggestions.push('📏 Use pea-sized amount for short beards, dime-sized for medium-long');
        } else if (lowerCategory.includes('pomade') || lowerCategory.includes('gel') || lowerCategory.includes('wax')) {
          suggestions.push(`💧 Apply ${productName} to damp (not wet) hair for natural finish, dry hair for maximum hold`);
          suggestions.push('🖐️ Start with small amount (dime-sized). You can always add more');
          suggestions.push('🧴 Work from roots to tips for even distribution');
        } else if (lowerCategory.includes('scalp serum') || lowerCategory.includes('hair growth')) {
          suggestions.push(`🎯 Apply ${productName} directly to scalp, not hair. Part hair in sections for coverage`);
          suggestions.push('💆 Massage for 1-2 minutes to boost circulation');
          suggestions.push('⏰ Use consistently for 3-6 months before expecting visible results');
        } else if (lowerCategory.includes('leave-in')) {
          suggestions.push(`🚿 Apply ${productName} to towel-dried hair (not soaking wet)`);
          suggestions.push('💨 Focus on mid-lengths to ends. Avoid roots if hair is fine/oily');
          suggestions.push('✨ Can be layered under styling products for added protection');
        } else {
          suggestions.push(`🚿 Use ${productName} as directed on product label`);
          suggestions.push('💇 Adjust frequency based on your hair\'s response');
        }
      } else if (prodType === 'face') {
        if (lowerCategory.includes('cleanser')) {
          suggestions.push(`🌡️ Use ${productName} with lukewarm water—hot water strips oils, cold water doesn't cleanse well`);
          suggestions.push('⏱️ Massage for 60 seconds to properly dissolve makeup and sunscreen');
          suggestions.push('🌙 Double cleanse at night if wearing makeup or sunscreen');
        } else if (lowerCategory.includes('moisturizer') || lowerCategory.includes('cream')) {
          suggestions.push(`💧 Apply ${productName} to damp skin for better absorption (pat dry, don't rub)`);
          suggestions.push('⬆️ Use upward motions. Don\'t forget neck and décolletage');
          suggestions.push('☀️ If no SPF, always apply sunscreen after moisturizer in AM');
        } else if (lowerCategory.includes('oil')) {
          suggestions.push(`🌙 Use ${productName} as last step in PM routine to seal in moisture`);
          suggestions.push('💧 Mix 2-3 drops with moisturizer if pure oil feels too heavy');
          suggestions.push('⚠️ Avoid if using water-based sunscreen in AM—oil can break down SPF');
        } else if (lowerCategory.includes('serum') && activesText) {
          suggestions.push(`✨ Apply ${productName} after cleansing to target ${profile?.skin_concerns?.[0]?.replace(/-/g, ' ') || 'your concerns'}`);
          suggestions.push(`💧 Use with ${activesText} for best results—apply on damp skin`);
          suggestions.push('🧴 Follow with moisturizer to seal in the actives');
        } else if (lowerCategory.includes('toner') || lowerCategory.includes('pad')) {
          const concernText = profile?.skin_concerns?.[0] ? ` to address ${profile.skin_concerns[0].replace(/-/g, ' ')}` : '';
          suggestions.push(`🌙 Use ${productName} in your ${activesText.includes('aha') || activesText.includes('bha') ? 'PM' : 'AM & PM'} routine after cleansing${concernText}`);
          if (lowerCategory.includes('pad')) {
            suggestions.push('💧 Apply the pad directly to problem areas where concerns are most visible');
            if (activesText.includes('aha') || activesText.includes('bha') || activesText.includes('acid')) {
              suggestions.push('⏱️ Use 2-3 times per week initially—exfoliating acids can increase sensitivity with daily use');
            }
          } else {
            suggestions.push('💧 Pat gently or use sweeping motions—no need to rinse');
          }
        } else {
          suggestions.push(`✨ Use ${productName} consistently as part of your routine`);
          suggestions.push('🧴 Perform patch test before first full use');
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
      ...getGeneralProductGuidance(productCategory, productType, profile, product_name, detectedActives),
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

    // STEP 5: Add active-specific tips if space permits (ONLY actionable routine advice)
    for (const active of detectedActives.slice(0, 2)) {
      if (active.info.tips && routineSuggestions.length < 8) {
        // FILTER BY PRODUCT TYPE - only show tips relevant to this product category
        const productTypes = active.info.product_types || [];
        if (productTypes.length > 0 && !productTypes.includes(productType)) {
          console.log(`Skipping ${active.name} tips - not relevant for ${productType} products (valid for: ${productTypes.join(', ')})`);
          continue;
        }
        
        // Filter out non-actionable tips (ingredient facts, descriptions)
        const actionableTips = active.info.tips.filter((tip: string) => {
          const lowerTip = tip.toLowerCase();
          // Exclude tips that are purely informational
          if (lowerTip.includes('also called') || lowerTip.includes('also known') || lowerTip.includes('aka')) {
            console.log(`Filtered out informational tip for ${active.name}: "${tip}"`);
            return false;
          }
          // Exclude tips that are just descriptions without action
          if (lowerTip.match(/^(is a|are a|effective at|effective against|powerful)/)) {
            console.log(`Filtered out descriptive tip for ${active.name}: "${tip}"`);
            return false;
          }
          return true;
        });
        
        if (actionableTips.length > 0) {
          console.log(`Adding actionable tip for ${active.name}: "${actionableTips[0]}"`);
          routineSuggestions.push(...actionableTips.slice(0, 1));
        }
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

    // Generate personalized summary
    const personalizedSummary = generatePersonalizedSummary(
      epiqScore, 
      profile, 
      productType, 
      product_name,
      problematic,
      beneficial
    );

    // Enrich ALL ingredients with AI explanations and PubChem data
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    console.log('Starting ingredient enrichment...');
    
    // Helper to classify ingredient role based on name and PubChem data
    const classifyIngredientRole = (name: string, pubchemData: any): string => {
      const nameLower = name.toLowerCase();
      if (/acid|retinol|peptide|vitamin c|ascorbic/i.test(nameLower)) return 'active';
      if (/hyaluronic|glycerin|aloe|aqua|water/i.test(nameLower)) return 'humectant';
      if (/oil|butter|shea|cocoa|squalane/i.test(nameLower)) return 'emollient';
      if (/dimethicone|silicone|petrolatum/i.test(nameLower)) return 'occlusive';
      if (/cetyl|stearyl|alcohol/i.test(nameLower)) return 'emulsifier';
      if (/fragrance|parfum|essential oil/i.test(nameLower)) return 'fragrance';
      if (/paraben|phenoxyethanol|benzyl/i.test(nameLower)) return 'preservative';
      return 'supporting';
    };

    // Enrich safe ingredients with AI explanations
    const enrichedSafeIngredients = await Promise.all(
      safe.slice(0, 30).map(async (ingredientName: string) => {
        const pubchemData = ingredientResults.find((r: any) => 
          r.searched_name?.toLowerCase() === ingredientName.toLowerCase()
        );
        
        let explanation = 'Generally recognized as safe for topical use.';
        if (lovableApiKey) {
          explanation = await generateIngredientExplanation(
            ingredientName,
            'safe',
            pubchemData,
            lovableApiKey
          );
        }

        return {
          name: ingredientName,
          role: classifyIngredientRole(ingredientName, pubchemData),
          explanation,
          molecular_weight: pubchemData?.molecular_weight || null,
          safety_profile: 'safe'
        };
      })
    );

    // Enrich concern/unverified ingredients with AI explanations
    const enrichedConcernIngredients = await Promise.all(
      concerns.slice(0, 20).map(async (ingredientName: string) => {
        const pubchemData = ingredientResults.find((r: any) => 
          r.searched_name?.toLowerCase() === ingredientName.toLowerCase()
        );
        
        let explanation = 'Not found in PubChem or Open Beauty Facts databases. May be a proprietary blend or trade name.';
        if (lovableApiKey) {
          explanation = await generateIngredientExplanation(
            ingredientName,
            'unverified',
            pubchemData,
            lovableApiKey
          );
        }

        return {
          name: ingredientName,
          role: classifyIngredientRole(ingredientName, pubchemData),
          explanation,
          molecular_weight: pubchemData?.molecular_weight || null,
          safety_profile: 'unverified'
        };
      })
    );

    console.log(`✓ Enriched ${enrichedSafeIngredients.length} safe ingredients`);
    console.log(`✓ Enriched ${enrichedConcernIngredients.length} unverified ingredients`);

    const recommendations = {
      safe_ingredients: enrichedSafeIngredients,
      problematic_ingredients: problematic,  // Already enriched: Array of {name, reason}
      beneficial_ingredients: beneficial,     // Already enriched: Array of {name, benefit}
      concern_ingredients: enrichedConcernIngredients,
      warnings: warnings,
      summary: personalizedSummary,
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

    // Store analysis
    console.log('Analysis complete for:', product_name, 'EpiQ Score:', epiqScore);

    // Generate AI explanation using Gemini 2.5 Flash (graceful degradation)
    let aiExplanation: SkinLytixGptResponse | null = null;

    if (lovableApiKey) {
      const scoreLabel = epiqScore >= 85 ? 'Low Risk - Excellent' :
                         epiqScore >= 70 ? 'Low Risk - Good' :
                         epiqScore >= 50 ? 'Moderate Risk' :
                         epiqScore >= 30 ? 'High Risk' : 'Very High Risk';

      aiExplanation = await generateGptExplanation({
        productName: product_name,
        brand: extractedBrand,
        category: extractedCategory,
        ingredients: ingredients_list.split(',').map((i: string) => i.trim()),
        epiqScore,
        scoreLabel,
        recommendations
      }, lovableApiKey);
    } else {
      console.warn('LOVABLE_API_KEY not configured - skipping GPT explanation');
    }

    // Store analysis with AI explanation in database
    const { data: analysis, error: analysisError } = await supabase
      .from('user_analyses')
      .insert({
        user_id,
        product_name,
        brand: extractedBrand,
        category: extractedCategory,
        ingredients_list,
        epiq_score: epiqScore,
        product_price: product_price || null,
        recommendations_json: {
          ...recommendations,
          ingredient_data: ingredientResults,
          ai_explanation: aiExplanation
        }
      })
      .select()
      .single();

    if (analysisError) {
      console.error('Error storing analysis:', analysisError);
      throw analysisError;
    }

    console.log('Analysis stored with ID:', analysis.id);
    if (aiExplanation) {
      console.log('✓ AI explanation included');
    } else {
      console.log('⚠ AI explanation not generated');
    }

    return new Response(
      JSON.stringify({
        analysis_id: analysis.id,
        epiq_score: epiqScore,
        recommendations,
        ingredient_data: ingredientResults,
        ai_explanation: aiExplanation
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
