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
      return new Response(JSON.stringify({ dupes: [], error: 'productName is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      return new Response(JSON.stringify({ dupes: [], error: 'AI provider is not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    const aiCacheKey = JSON.stringify({
      let dupes: any[] = [];
      if (cachedDupes) {
        dupes = cachedDupes;
      } else {
        // Robust fallback logic: Lovable -> Gemini -> Gemma
        let aiContent = null;
        let fallbackLevel = 0;
        // 0 = Lovable, 1 = Gemini, 2 = Gemma

        // Try Lovable
        if (LOVABLE_API_KEY) {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                { role: 'system', content: systemPrompt.trim() },
                { role: 'user', content: userPrompt.trim() },
              ],
              temperature: 0.7,
            }),
          });
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiContent = aiData.choices?.[0]?.message?.content ?? null;
          } else {
            const errorText = await aiResponse.text();
            console.warn('AI Gateway error:', aiResponse.status, errorText);
            fallbackLevel = 1;
          }
        } else {
          fallbackLevel = 1;
        }

        // Try Gemini direct if Lovable failed
        if (!aiContent && GEMINI_API_KEY) {
          const prompt = `${systemPrompt.trim()}\n\n${userPrompt.trim()}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: prompt }],
              }],
              generationConfig: { temperature: 0.7 },
            }),
          });
          if (response.ok) {
            const dataJson = await response.json();
            aiContent = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          } else {
            const errorText = await response.text();
            console.warn('Gemini direct error:', response.status, errorText);
            fallbackLevel = 2;
          }
        }

        // Try Gemma if both above failed
        if (!aiContent && GEMINI_API_KEY) {
          const prompt = `${systemPrompt.trim()}\n\n${userPrompt.trim()}`;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: prompt }],
              }],
              generationConfig: { temperature: 0.7 },
            }),
          });
          if (response.ok) {
            const dataJson = await response.json();
            aiContent = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          } else {
            const errorText = await response.text();
            console.error('Gemma fallback failed:', response.status, errorText);
            // All models failed: likely out of credits/quota everywhere
            return new Response(JSON.stringify({
              dupes: [],
              error: 'All AI models are currently unavailable due to quota or credit exhaustion. Please try again later or contact support if this persists.'
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Track which fallback was used
        if (fallbackLevel > 0) {
          let fallbackName = fallbackLevel === 1 ? 'Gemini' : 'Gemma';
          console.warn(`AI fallback triggered: ${fallbackName} used for find-dupes`);
          // Optionally: send alert/notification here (e.g., webhook, email, etc.)
        }

        if (!aiContent) aiContent = '[]';

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

      const callGeminiDirect = async () => {
        if (!GEMINI_API_KEY) return null;
        const prompt = `${systemPrompt.trim()}\n\n${userPrompt.trim()}`;
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: prompt }],
            }],
            generationConfig: { temperature: 0.7 },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Gemini direct error:', response.status, errorText);
          return null;
        }

        const dataJson = await response.json();
        return dataJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      };

      const aiContent = (await callLovable()) ?? (await callGeminiDirect()) ?? '[]';

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

    const buildSearchTerms = (name: string, brandName?: string): string[] => {
      const normalized = normaliseText(name);
      const tokens = normalized.split(' ').filter((token) => token.length > 2);
      const topTokens = tokens.slice(0, 3).join(' ');
      const firstTwo = tokens.slice(0, 2).join(' ');
      const terms = new Set<string>();

      if (brandName) {
        const brand = normaliseText(brandName);
        terms.add(`${brand} ${normalized}`.trim());
        if (topTokens) terms.add(`${brand} ${topTokens}`.trim());
        if (firstTwo) terms.add(`${brand} ${firstTwo}`.trim());
      }

      terms.add(normalized);
      if (topTokens) terms.add(topTokens);
      if (firstTwo) terms.add(firstTwo);

      return Array.from(terms).filter((term) => term.length > 2);
    };

    const selectBestObfProduct = (
      products: any[],
      name: string,
      brandName: string | undefined,
      sourceList: string[],
    ) => {
      let chosen = products[0];
      let chosenIngredients = extractObfIngredients(chosen);
      let chosenScore = -1;

      for (const candidate of products) {
      name: string,
      brandName: string | undefined,

        // Robust fallback logic: Lovable -> Gemini -> Gemma
        let aiContent = null;
        let fallbackLevel = 0;
        // 0 = Lovable, 1 = Gemini, 2 = Gemma

        // Try Lovable
        if (LOVABLE_API_KEY) {
          const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'google/gemini-2.5-flash-lite',
              messages: [
                { role: 'system', content: systemPrompt.trim() },
                { role: 'user', content: userPrompt.trim() },
              ],
              temperature: 0.7,
            }),
          });
          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiContent = aiData.choices?.[0]?.message?.content ?? null;
          } else {
            const errorText = await aiResponse.text();
            console.warn('AI Gateway error:', aiResponse.status, errorText);
            fallbackLevel = 1;
          }
        } else {
          fallbackLevel = 1;
        }

        // Try Gemini direct if Lovable failed
        if (!aiContent && GEMINI_API_KEY) {
          const prompt = `${systemPrompt.trim()}
              bestResult = cached;
            }
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: prompt }],
              }],
              generationConfig: { temperature: 0.7 },
            }),
          });
          if (response.ok) {
            const dataJson = await response.json();
            aiContent = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          } else {
            const errorText = await response.text();
            console.warn('Gemini direct error:', response.status, errorText);
            fallbackLevel = 2;
          }
        }

        // Try Gemma if both above failed
        if (!aiContent && GEMINI_API_KEY) {
          const prompt = `${systemPrompt.trim()}
          }
          continue;
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemma-3-4b:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                role: 'user',
                parts: [{ text: prompt }],
              }],
              generationConfig: { temperature: 0.7 },
            }),
          });
          if (response.ok) {
            const dataJson = await response.json();
            aiContent = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          } else {
            const errorText = await response.text();
            console.error('Gemma fallback failed:', response.status, errorText);
            // All models failed: likely out of credits/quota everywhere
            return new Response(JSON.stringify({
              dupes: [],
              error: 'All AI models are currently unavailable due to quota or credit exhaustion. Please try again later or contact support if this persists.'
            }), {
              status: 503,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
        }

        // Track which fallback was used
        if (fallbackLevel > 0) {
          let fallbackName = fallbackLevel === 1 ? 'Gemini' : 'Gemma';
          console.warn(`AI fallback triggered: ${fallbackName} used for find-dupes`);
          // Optionally: send alert/notification here (e.g., webhook, email, etc.)
        }

        if (!aiContent) aiContent = '[]';
        }

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
            setCache(obfCache, cacheKey, null, 15 * 60 * 1000);
            continue;
          }
          const data = await response.json();
          const products: any[] = Array.isArray(data?.products) ? data.products : [];
          if (!products.length) {
            setCache(obfCache, cacheKey, null, 15 * 60 * 1000);
            continue;
          }

          const { chosen, chosenIngredients } = selectBestObfProduct(products, name, brandName, sourceList);
          const imageUrl =
            chosen.image_url ||
            chosen.image_front_url ||
            chosen.image_front_small_url ||
            chosen.image_small_url ||
            null;
          const productUrl = chosen.url || null;
          const chosenBrand = chosen.brands || chosen.brands_tags?.join(' ') || null;
          const chosenName =
            chosen.product_name ||
            chosen.product_name_en ||
            chosen.product_name_fr ||
            chosen.product_name_es ||
            chosen.product_name_it ||
            null;
          const result = {
            imageUrl,
            productUrl,
            ingredients: chosenIngredients ?? null,
            brand: chosenBrand,
            productName: chosenName,
          };
          setCache(obfCache, cacheKey, result, 6 * 60 * 60 * 1000);

          const overlapStats = chosenIngredients ? computeOverlapStats(sourceList, chosenIngredients) : null;
          const score = overlapStats ? overlapStats.percent : 0;
          if (score > bestScore) {
            bestScore = score;
            bestResult = result;
          }
        } catch (error) {
          console.error('Failed to query Open Beauty Facts:', error);
          setCache(obfCache, cacheKey, null, 15 * 60 * 1000);
        }
      }

      return bestResult;
    };

    // Utility to check if an image is a placeholder.
    const isPlaceholderImage = (url?: string): boolean => {
      if (!url) return true;
      return url.includes('images.unsplash.com');
    };

    const brandTokens = (value: string) =>
      normaliseText(value)
        .split(' ')
        .filter((token) => token.length > 1);

    const hasAllBrandTokens = (candidate: string, expected: string) => {
      const expectedTokens = brandTokens(expected);
      const candidateTokens = new Set(brandTokens(candidate));
      if (!expectedTokens.length || candidateTokens.size === 0) return false;
      return expectedTokens.every((token) => candidateTokens.has(token));
    };

    const isBrandMatch = (
      obfBrand: string | null | undefined,
      obfName: string | null | undefined,
      dupeBrand: string | null | undefined
    ) => {
      if (!obfBrand || !dupeBrand) return false;
      if (hasAllBrandTokens(obfBrand, dupeBrand)) return true;
      if (obfName && hasAllBrandTokens(obfName, dupeBrand)) return true;
      return false;
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

        // Strict mode: only use OBF images to avoid mismatches.
        let imageUrl: string | undefined = obf?.imageUrl ?? undefined;
        if (isPlaceholderImage(imageUrl)) {
          imageUrl = undefined;
        }
        const obfName = obf?.productName ?? null;
        if (!isBrandMatch(obf?.brand, obfName, dupeBrand)) {
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
    return new Response(JSON.stringify({ dupes: [], error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
