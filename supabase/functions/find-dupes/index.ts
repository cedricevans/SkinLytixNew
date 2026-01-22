/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brand, ingredients, category, skinType, concerns } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const promptIngredients = Array.isArray(ingredients)
      ? ingredients.slice(0, 40)
      : [];
    
    const systemPrompt = `You are a skincare expert that finds real, existing product dupes. You MUST return valid JSON only, no markdown or explanation.

Return ONLY a JSON array of 5 real skincare products that are dupes/alternatives. Each object must have:
- "name": string (exact product name as sold in stores)
- "brand": string (brand name)
- "imageUrl": string (MUST be a real product image URL from one of these sources:
  * Target: https://target.scene7.com/is/image/Target/[product-id]
  * Ulta: https://media.ulta.com/i/ulta/[product-id]
  * Sephora: https://www.sephora.com/productimages/[product-id]
  * Amazon: https://m.media-amazon.com/images/I/[product-id]
  If you cannot find a real URL, use: https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300 for serums, https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=300 for moisturizers, https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300 for cleansers)
- "reasons": array of 2-3 strings explaining why it's a dupe
- "sharedIngredients": array of 2-4 key shared ingredients
- "priceEstimate": string (e.g., "$15-25")
- "profileMatch": boolean (true if suits the user's skin type/concerns)
- "category": string (face, body, hair, or scalp)
- "whereToBuy": string (retailer name like "Target", "Ulta", "Amazon", "Sephora")

Focus on REAL products from brands like CeraVe, La Roche-Posay, The Ordinary, Neutrogena, Cetaphil, Paula's Choice, Olay, Aveeno, Eucerin, Vanicream, First Aid Beauty, Kiehl's, Drunk Elephant, Sunday Riley, Tatcha, etc.`;

    const userPrompt = `Find 5 real skincare product dupes for:

Product: ${productName}${brand ? ` by ${brand}` : ''}
Category: ${category || 'face'}
Key Ingredients: ${promptIngredients.join(', ') || 'Not specified'}
User Profile: ${skinType || 'normal'} skin${concerns?.length ? `, concerns: ${concerns.join(', ')}` : ''}

Return products that:
1. Have similar key active ingredients
2. Serve the same skincare function
3. Are widely available for purchase
4. Match the user's skin profile when possible

Return ONLY the JSON array, no other text.`;

    console.log('Finding dupes for:', productName, 'Category:', category);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '[]';
    
    console.log('AI Response:', content);

    // Parse the JSON response
    let dupes = [];
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanContent.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : cleanContent);
      dupes = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.dupes) ? parsed.dupes : []);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      dupes = [];
    }

    const normalizeIngredientName = (value: string) => {
      return value
        .toLowerCase()
        .replace(/\(.*?\)/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
    };

    const normalizeIngredientList = (items: string[]) => {
      return items
        .map((item) => normalizeIngredientName(item))
        .filter((item) => item.length > 2);
    };

    const computeOverlapStats = (sourceList: string[], targetList: string[]) => {
      const sourceIngredients = Array.from(new Set(normalizeIngredientList(sourceList)));
      const targetIngredients = Array.from(new Set(normalizeIngredientList(targetList)));
      if (!sourceIngredients.length || !targetIngredients.length) return null;

      let matched = 0;
      for (const sourceItem of sourceIngredients) {
        const isMatch = targetIngredients.some(
          (targetItem) => targetItem.includes(sourceItem) || sourceItem.includes(targetItem)
        );
        if (isMatch) matched += 1;
      }

      return {
        percent: Math.round((matched / sourceIngredients.length) * 100),
        matchedCount: matched,
        sourceCount: sourceIngredients.length,
      };
    };

    const extractObfIngredients = (product: any) => {
      if (!product) return null;
      if (Array.isArray(product.ingredients) && product.ingredients.length > 0) {
        const list = product.ingredients
          .map((ing: any) => ing?.text)
          .filter((text: string | undefined): text is string => Boolean(text));
        if (list.length) return normalizeIngredientList(list);
      }

      const text =
        product.ingredients_text_en ||
        product.ingredients_text ||
        product.ingredients_text_fr ||
        product.ingredients_text_es;

      if (typeof text === 'string' && text.trim().length > 2) {
        return normalizeIngredientList(text.split(/[,;]+/));
      }

      return null;
    };

    const getObfProductMatch = async (productName: string, brand?: string) => {
      const terms = `${brand ? `${brand} ` : ''}${productName}`.trim();
      if (!terms) return null;

      const params = new URLSearchParams({
        search_terms: terms,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: '10',
      });

      try {
        const obfResponse = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?${params.toString()}`);
        if (!obfResponse.ok) return null;
        const obfData = await obfResponse.json();
        const products = Array.isArray(obfData?.products) ? obfData.products : [];
        if (!products.length) return null;

        let bestMatch = products[0];
        let bestIngredients = extractObfIngredients(bestMatch);
        for (const candidate of products) {
          const candidateIngredients = extractObfIngredients(candidate);
          if (candidateIngredients && candidateIngredients.length >= 5) {
            bestMatch = candidate;
            bestIngredients = candidateIngredients;
            break;
          }
        }

        const imageUrl =
          bestMatch.image_url ||
          bestMatch.image_front_url ||
          bestMatch.image_front_small_url ||
          bestMatch.image_small_url ||
          null;
        const productUrl = bestMatch.url || null;
        return { imageUrl, productUrl, ingredients: bestIngredients };
      } catch (error) {
        console.error('OBF lookup failed:', error);
        return null;
      }
    };

    const isPlaceholderImage = (url?: string) => {
      if (!url) return true;
      return url.includes('images.unsplash.com');
    };

    const isObfImageUrl = (url?: string) => {
      if (!url) return false;
      try {
        const hostname = new URL(url).hostname.toLowerCase();
        return (
          hostname.endsWith('openbeautyfacts.org') ||
          hostname.endsWith('images.openbeautyfacts.org')
        );
      } catch (_error) {
        return false;
      }
    };

    const sourceIngredients = Array.isArray(ingredients) && ingredients.length > 0
      ? normalizeIngredientList(ingredients)
      : normalizeIngredientList(promptIngredients);
    const minMatchedCount = Math.max(3, Math.round(sourceIngredients.length * 0.15));

    dupes = await Promise.all(
      dupes.map(async (dupe: any) => {
        const name = dupe?.name || dupe?.productName || dupe?.product_name;
        const brand = dupe?.brand || dupe?.brandName || dupe?.brand_name;
        if (!name) return dupe;

        const currentUrl = dupe?.imageUrl;
        const shouldReplaceImage = isPlaceholderImage(currentUrl) || !isObfImageUrl(currentUrl);
        const obfMatch = await getObfProductMatch(name, brand);

        const obfIngredients = obfMatch?.ingredients ?? dupe?.ingredients ?? dupe?.ingredients_list ?? null;
        const overlapStats = obfIngredients
          ? computeOverlapStats(sourceIngredients, obfIngredients)
          : null;
        if (!overlapStats || overlapStats.matchedCount < minMatchedCount) {
          return null;
        }
        const matchPercent = overlapStats.percent;

        const nextImageUrl = shouldReplaceImage
          ? obfMatch?.imageUrl ?? dupe?.imageUrl ?? null
          : dupe?.imageUrl ?? obfMatch?.imageUrl ?? null;

        const nextProductUrl = obfMatch?.productUrl ?? dupe?.productUrl ?? null;
        const nextWhereToBuy = dupe?.whereToBuy || (obfMatch?.productUrl ? 'Open Beauty Facts' : undefined);

        return {
          ...dupe,
          imageUrl: nextImageUrl,
          productUrl: nextProductUrl,
          whereToBuy: nextWhereToBuy,
          ingredients: obfIngredients,
          matchPercent: matchPercent ?? dupe?.matchPercent ?? dupe?.match_percent ?? null,
          matchedCount: overlapStats.matchedCount,
          sourceCount: overlapStats.sourceCount,
        };
      })
    );

    dupes = dupes.filter((dupe) => Boolean(dupe));

    return new Response(JSON.stringify({ dupes }), {
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
