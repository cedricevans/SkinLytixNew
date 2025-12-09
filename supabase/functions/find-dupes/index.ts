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
- "name": string (exact product name)
- "brand": string (brand name)
- "imageUrl": string (use format "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200" for skincare product placeholder)
- "reasons": array of 2-3 strings explaining why it's a dupe
- "sharedIngredients": array of 2-4 key shared ingredients
- "priceEstimate": string (e.g., "$15-25" or "Budget-friendly")
- "profileMatch": boolean (true if suits the user's skin type/concerns)
- "category": string (face, body, hair, or scalp)

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
      dupes = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      dupes = [];
    }

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
