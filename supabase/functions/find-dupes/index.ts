import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { productName, brand, ingredients, category, skinType, concerns } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const topIngredients = ingredients?.slice(0, 15) || [];
    
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
Key Ingredients: ${topIngredients.join(', ') || 'Not specified'}
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

    const getObfProductMatch = async (productName: string, brand?: string) => {
      const terms = `${brand ? `${brand} ` : ''}${productName}`.trim();
      if (!terms) return null;

      const params = new URLSearchParams({
        search_terms: terms,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: '1',
      });

      try {
        const obfResponse = await fetch(`https://world.openbeautyfacts.org/cgi/search.pl?${params.toString()}`);
        if (!obfResponse.ok) return null;
        const obfData = await obfResponse.json();
        const product = obfData?.products?.[0];
        if (!product) return null;
        const imageUrl =
          product.image_url ||
          product.image_front_url ||
          product.image_front_small_url ||
          product.image_small_url ||
          null;
        const productUrl = product.url || null;
        return { imageUrl, productUrl };
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

    dupes = await Promise.all(
      dupes.map(async (dupe: any) => {
        const name = dupe?.name || dupe?.productName || dupe?.product_name;
        const brand = dupe?.brand || dupe?.brandName || dupe?.brand_name;
        if (!name) return dupe;

        const currentUrl = dupe?.imageUrl;
        const shouldReplaceImage = isPlaceholderImage(currentUrl) || !isObfImageUrl(currentUrl);

        if (shouldReplaceImage || !dupe?.productUrl) {
          const obfMatch = await getObfProductMatch(name, brand);
          if (obfMatch?.imageUrl || obfMatch?.productUrl) {
            return {
              ...dupe,
              imageUrl: obfMatch?.imageUrl ?? dupe?.imageUrl ?? null,
              productUrl: obfMatch?.productUrl ?? dupe?.productUrl ?? null,
              whereToBuy: dupe?.whereToBuy || (obfMatch?.productUrl ? 'Open Beauty Facts' : undefined),
            };
          }
          return { ...dupe, imageUrl: null, productUrl: dupe?.productUrl ?? null, whereToBuy: dupe?.whereToBuy };
        }
        return dupe;
      })
    );

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
