/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * This rewritten version of the "find dupes" endpoint addresses a few pain points
 * observed in the original implementation:
 *
 * - Candidate products are no longer discarded solely because their ingredient
 *   overlap with the source product falls below a fixed threshold.  Instead, the
 *   match percentage is returned as an annotation so the client can decide
 *   whether a product is relevant.
 * - Lookups against Open Beauty Facts (OBF) are treated as an enrichment step.
 *   If the OBF API is unavailable (for example, due to proof‑of‑work challenges),
 *   the dupe is still returned with whatever data is available.
 * - Ingredient names from both the source and candidate products are normalised
 *   more aggressively to increase hit rates for common actives.
 * - The endpoint consistently returns a well‑formed JSON response, even when
 *   unexpected input or downstream services cause errors.
 */

// CORS configuration. Adjust to your own origins if needed.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const aiCache = new Map<string, { value: any[]; expiresAt: number }>();
const obfCache = new Map<string, { value: { imageUrl: string | null; productUrl: string | null; ingredients: string[] | null } | null; expiresAt: number }>();

const getCache = <T>(cache: Map<string, { value: T; expiresAt: number }>, key: string): T | undefined => {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
};

const setCache = <T>(cache: Map<string, { value: T; expiresAt: number }>, key: string, value: T, ttlMs: number) => {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
};

serve(async (req: Request): Promise<Response> => {
  // Handle pre-flight requests quickly.
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brand, ingredients, category, skinType, concerns } = await req.json();

    // Validate required fields early.
    if (!productName || typeof productName !== 'string') {
      return new Response(JSON.stringify({ error: 'productName is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }
    // Normalise the user‑supplied ingredient list to at most 40 items.
    const promptIngredients: string[] = Array.isArray(ingredients)
      ? ingredients.slice(0, 40)
      : [];

    const isScentFocused = `${category || ''} ${productName}`.toLowerCase().includes('body')
      || `${category || ''} ${productName}`.toLowerCase().includes('lotion')
      || `${category || ''} ${productName}`.toLowerCase().includes('butter')
      || `${category || ''} ${productName}`.toLowerCase().includes('cream')
      || `${category || ''} ${productName}`.toLowerCase().includes('mist');

    // System and user prompts for the AI.
    const systemPrompt = `
You are a skincare expert that finds real, existing product dupes. You MUST return valid JSON only, no markdown or explanation.

Return ONLY a JSON array of 12 real skincare products that are dupes/alternatives. Each object must have:
- "name": string (exact product name as sold in stores)
- "brand": string (brand name)
- "imageUrl": string (MUST be a real product image URL from one of these sources, or null if unavailable:
  * Target: https://target.scene7.com/is/image/Target/[product-id]
  * Ulta: https://media.ulta.com/i/ulta/[product-id]
  * Sephora: https://www.sephora.com/productimages/[product-id]
  * Amazon: https://m.media-amazon.com/images/I/[product-id])
- "reasons": array of 2-3 strings explaining why it's a dupe
- "sharedIngredients": array of 2-4 key shared ingredients
- "priceEstimate": string (e.g., "$15-25")
- "profileMatch": boolean (true if suits the user's skin type/concerns)
- "category": string (face, body, hair, or scalp)
- "whereToBuy": string (retailer name like "Target", "Ulta", "Amazon", "Sephora")
Optional fields if relevant:
- "scentNotes": array of 2-4 scent notes (for fragranced body products)

Focus on REAL products from brands like CeraVe, La Roche-Posay, The Ordinary, Neutrogena, Cetaphil, Paula's Choice, Olay, Aveeno, Eucerin, Vanicream, First Aid Beauty, Kiehl's, Drunk Elephant, Sunday Riley, Tatcha, etc.`;

    const userPrompt = `
Find 5 real skincare product dupes for:

Product: ${productName}${brand ? ` by ${brand}` : ''}
Category: ${category || 'face'}
Key Ingredients: ${promptIngredients.join(', ') || 'Not specified'}
User Profile: ${skinType || 'normal'} skin${Array.isArray(concerns) && concerns.length ? `, concerns: ${concerns.join(', ')}` : ''}

Return products that:
1. Have similar key active ingredients
2. Serve the same skincare function
3. Are widely available for purchase
4. Match the user's skin profile when possible
${isScentFocused ? '5. Match the scent profile when relevant (vanilla, coconut, shea, etc.)' : ''}

Return ONLY the JSON array, no other text.`;

    console.log('Finding dupes for:', productName, 'Category:', category);

    const aiCacheKey = JSON.stringify({
      productName,
      brand,
      category,
      skinType,
      concerns,
      ingredients: promptIngredients,
    });
    const cachedDupes = getCache(aiCache, aiCacheKey);

    let dupes: any[] = [];
    if (cachedDupes) {
      dupes = cachedDupes;
    } else {
      // Call the AI API to get candidate products.
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt.trim() },
            { role: 'user', content: userPrompt.trim() },
          ],
          temperature: 0.7,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        console.error('AI Gateway error:', aiResponse.status, errorText);
        // Map common status codes to friendly messages.
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: 'Service temporarily unavailable.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const aiContent = aiData.choices?.[0]?.message?.content ?? '[]';

      // Parse the AI response, stripping away any accidental Markdown formatting.
      try {
        const cleanContent = (aiContent as string)
          .replace(/```json\n?/gi, '')
          .replace(/```\n?/g, '')
          .trim();
        const match = cleanContent.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(match ? match[0] : cleanContent);
        dupes = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.dupes) ? parsed.dupes : []);
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        dupes = [];
      }

      setCache(aiCache, aiCacheKey, dupes, 10 * 60 * 1000);
    }

    // Helper: normalise ingredient names for better matching.
    const normaliseIngredient = (value: string): string => {
      return value
        .toLowerCase()
        .replace(/\(.*?\)/g, ' ')
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const normaliseIngredientList = (items: string[]): string[] => {
      const seen = new Set<string>();
      for (const item of items) {
        const normalised = normaliseIngredient(item);
        if (normalised.length > 2) {
          seen.add(normalised);
        }
      }
      return Array.from(seen);
    };

    // Compute overlap statistics between source and candidate ingredients.
    const computeOverlapStats = (sourceList: string[], targetList: string[]) => {
      const sourceIngredients = normaliseIngredientList(sourceList);
      const targetIngredients = normaliseIngredientList(targetList);
      if (!sourceIngredients.length || !targetIngredients.length) return null;

      let matched = 0;
      for (const sourceItem of sourceIngredients) {
        const isMatch = targetIngredients.some(
          (targetItem) => targetItem.includes(sourceItem) || sourceItem.includes(targetItem),
        );
        if (isMatch) matched += 1;
      }
      if (matched === 0) return null;
      return {
        percent: Math.round((matched / sourceIngredients.length) * 100),
        matchedCount: matched,
        sourceCount: sourceIngredients.length,
      };
    };

    const normaliseText = (value: string): string => {
      return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const buildTokenSet = (value: string): Set<string> => {
      const tokens = normaliseText(value)
        .split(' ')
        .filter((token) => token.length > 1);
      return new Set(tokens);
    };

    const computeTokenSimilarity = (left: string, right: string): number => {
      if (!left || !right) return 0;
      const leftTokens = buildTokenSet(left);
      const rightTokens = buildTokenSet(right);
      if (!leftTokens.size || !rightTokens.size) return 0;
      let intersection = 0;
      for (const token of leftTokens) {
        if (rightTokens.has(token)) intersection += 1;
      }
      const union = new Set([...leftTokens, ...rightTokens]).size;
      if (!union) return 0;
      return intersection / union;
    };

    const scentKeywords = [
      'vanilla',
      'coconut',
      'shea',
      'cocoa',
      'chocolate',
      'almond',
      'honey',
      'oat',
      'oatmeal',
      'lavender',
      'rose',
      'jasmine',
      'citrus',
      'orange',
      'lemon',
      'grapefruit',
      'bergamot',
      'sandalwood',
      'musk',
      'amber',
      'cherry',
      'berry',
      'mint',
      'eucalyptus',
      'tea tree',
      'chamomile',
      'aloe',
      'argan',
      'jojoba',
      'cinnamon',
      'caramel',
      'sugar',
      'butter',
    ];

    const extractScentTokens = (value: string): string[] => {
      const text = normaliseText(value);
      const tokens: string[] = [];
      for (const keyword of scentKeywords) {
        if (text.includes(keyword)) tokens.push(keyword);
      }
      return Array.from(new Set(tokens));
    };

    const computeScentSimilarity = (sourceTokens: string[], targetText: string): number => {
      if (!sourceTokens.length) return 0;
      const targetTokens = extractScentTokens(targetText);
      if (!targetTokens.length) return 0;
      let matched = 0;
      for (const token of sourceTokens) {
        if (targetTokens.includes(token)) matched += 1;
      }
      return matched / sourceTokens.length;
    };

    // Extract ingredients from an Open Beauty Facts (OBF) record.
    const extractObfIngredients = (product: any): string[] | null => {
      if (!product) return null;
      if (Array.isArray(product.ingredients) && product.ingredients.length > 0) {
        const list = product.ingredients
          .map((ing: any) => ing?.text)
          .filter((text: string | undefined): text is string => Boolean(text));
        if (list.length) return normaliseIngredientList(list);
      }
      const text =
        product.ingredients_text_en ||
        product.ingredients_text ||
        product.ingredients_text_fr ||
        product.ingredients_text_es;
      if (typeof text === 'string' && text.trim().length > 2) {
        return normaliseIngredientList(text.split(/[,;]+/));
      }
      return null;
    };

    // Look up a product on OBF by name/brand to enrich ingredients and images.
    const lookupOpenBeautyFacts = async (
      name: string,
      brandName: string | undefined,
      sourceList: string[],
    ): Promise<{
      imageUrl: string | null;
      productUrl: string | null;
      ingredients: string[] | null;
    } | null> => {
      const terms = `${brandName ? `${brandName} ` : ''}${name}`.trim();
      if (!terms) return null;
      const cacheKey = `obf:${terms.toLowerCase()}`;
      const cached = getCache(obfCache, cacheKey);
      if (cached !== undefined) return cached;
      const params = new URLSearchParams({
        search_terms: terms,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: '10',
      });
      try {
        const response = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?${params.toString()}`);
        if (!response.ok) {
          console.warn('Open Beauty Facts lookup failed with status', response.status);
          return null;
        }
        const data = await response.json();
        const products: any[] = Array.isArray(data?.products) ? data.products : [];
        if (!products.length) return null;
        let chosen = products[0];
        let chosenIngredients = extractObfIngredients(chosen);
        let chosenScore = -1;

        for (const candidate of products) {
          const candidateName =
            candidate.product_name ||
            candidate.product_name_en ||
            candidate.product_name_fr ||
            candidate.product_name_es ||
            candidate.product_name_it ||
            '';
          const candidateBrands = candidate.brands || candidate.brands_tags?.join(' ') || '';
          const candidateIngredients = extractObfIngredients(candidate);
          const overlapStats = candidateIngredients && sourceList.length
            ? computeOverlapStats(sourceList, candidateIngredients)
            : null;
          const nameScore = computeTokenSimilarity(name, candidateName);
          const brandScore = brandName
            ? computeTokenSimilarity(brandName, candidateBrands)
            : 0;
          const overlapScore = overlapStats ? overlapStats.percent / 100 : 0;
          const candidateScore = overlapScore * 2 + nameScore * 1.2 + brandScore * 0.8;

          if (candidateScore > chosenScore) {
            chosenScore = candidateScore;
            chosen = candidate;
            chosenIngredients = candidateIngredients;
          }
        }
        const imageUrl =
          chosen.image_url ||
          chosen.image_front_url ||
          chosen.image_front_small_url ||
          chosen.image_small_url ||
          null;
        const productUrl = chosen.url || null;
        const result = { imageUrl, productUrl, ingredients: chosenIngredients ?? null };
        setCache(obfCache, cacheKey, result, 6 * 60 * 60 * 1000);
        return result;
      } catch (error) {
        // The OBF site may present proof‑of‑work challenges, causing fetch to fail.
        console.error('Failed to query Open Beauty Facts:', error);
        setCache(obfCache, cacheKey, null, 15 * 60 * 1000);
        return null;
      }
    };

    // Utility to check if an image is a placeholder.
    const isPlaceholderImage = (url?: string): boolean => {
      if (!url) return true;
      return url.includes('images.unsplash.com');
    };

    // Normalise the source ingredients once.
    const sourceIngredients = Array.isArray(ingredients) && ingredients.length > 0
      ? normaliseIngredientList(ingredients)
      : normaliseIngredientList(promptIngredients);
    const sourceScentTokens = extractScentTokens(`${productName} ${(Array.isArray(ingredients) ? ingredients.join(' ') : '')}`);

    const scoredDupes = dupes.map((dupe, index) => {
      const name = dupe?.name || dupe?.productName || dupe?.product_name || '';
      const dupeBrand = dupe?.brand || dupe?.brandName || dupe?.brand_name || '';
      const sharedIngredients = Array.isArray(dupe?.sharedIngredients) ? dupe.sharedIngredients : [];
      const ingredientSignal = sharedIngredients.length
        ? computeOverlapStats(sourceIngredients, sharedIngredients)?.percent ?? 0
        : 0;
      const nameScore = computeTokenSimilarity(productName, name);
      const brandScore = brand ? computeTokenSimilarity(brand, dupeBrand) : 0;
      const scentText = [name, dupeBrand, ...(dupe?.reasons ?? []), ...(sharedIngredients ?? [])].join(' ');
      const scentScore = computeScentSimilarity(sourceScentTokens, scentText);
      const preScore = ingredientSignal / 100 + nameScore * 0.8 + brandScore * 0.5 + scentScore * 0.7;
      return { index, preScore, nameScore, brandScore, scentScore };
    });

    const enrichIndexes = new Set(scoredDupes.map((item) => item.index));

    // Process each AI‑returned dupe. We do not filter out dupes based on match
    // percentage; instead we annotate overlap statistics.
    const finalDupes = await Promise.all(
      dupes.map(async (dupe, index) => {
        const name = dupe?.name || dupe?.productName || dupe?.product_name;
        const dupeBrand = dupe?.brand || dupe?.brandName || dupe?.brand_name;
        if (!name || typeof name !== 'string') {
          return null;
        }

        // Enrich with OBF data when available.
        const obf = enrichIndexes.has(index)
          ? await lookupOpenBeautyFacts(name, dupeBrand, sourceIngredients)
          : null;

        // Determine target ingredients.
        let targetIngredients: string[] | null = null;
        if (obf?.ingredients && obf.ingredients.length > 0) {
          targetIngredients = obf.ingredients;
        } else if (Array.isArray(dupe?.sharedIngredients) && dupe.sharedIngredients.length > 0) {
          targetIngredients = normaliseIngredientList(dupe.sharedIngredients);
        } else if (Array.isArray(dupe?.ingredients) && dupe.ingredients.length > 0) {
          targetIngredients = normaliseIngredientList(dupe.ingredients);
        } else if (typeof dupe?.ingredients === 'string') {
          targetIngredients = normaliseIngredientList(dupe.ingredients.split(/[,;]+/));
        } else {
          targetIngredients = null;
        }

        // Compute match statistics.
        const overlapStats = targetIngredients && sourceIngredients.length > 0
          ? computeOverlapStats(sourceIngredients, targetIngredients)
          : null;

        // Choose the best image: use the existing image if it's not a placeholder or OBF image.
        const currentImage: string | undefined = dupe?.imageUrl || dupe?.image_url;
        let imageUrl: string | undefined = obf?.imageUrl ?? currentImage;
        if (isPlaceholderImage(imageUrl)) {
          imageUrl = undefined;
        }

        // Determine where to buy.
        let whereToBuy: string | undefined = dupe?.whereToBuy;
        if (!whereToBuy && obf?.productUrl) {
          whereToBuy = 'Open Beauty Facts';
        }

        const scoreMeta = scoredDupes.find((item) => item.index === index);
        const matchScore = overlapStats?.percent ? overlapStats.percent / 100 : 0;
        const finalScore = matchScore * 1.6
          + (scoreMeta?.preScore ?? 0);

        return {
          ...dupe,
          name,
          brand: dupeBrand,
          imageUrl: imageUrl ?? null,
          productUrl: obf?.productUrl ?? dupe?.productUrl ?? null,
          whereToBuy: whereToBuy ?? null,
          matchPercent: overlapStats?.percent ?? null,
          matchedCount: overlapStats?.matchedCount ?? null,
          sourceCount: overlapStats?.sourceCount ?? null,
          _score: finalScore,
        };
      }),
    );

    // Remove any null results.
    const filteredDupes = finalDupes
      .filter(Boolean)
      .sort((a: any, b: any) => (b?._score ?? 0) - (a?._score ?? 0))
      .slice(0, 5)
      .map((dupe: any) => {
        const { _score, ...rest } = dupe;
        return rest;
      });

    return new Response(JSON.stringify({ dupes: filteredDupes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in find-dupes:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
