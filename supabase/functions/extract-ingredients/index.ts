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
    const { image, productType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `${getProductTypeContext(productType)}

Extract the following information from this personal care product image:
1. Ingredients list (comma-separated, clean format)
2. Brand name (if visible)
3. Product category (${getCategoryExamples(productType)})
4. Product name (if visible)

Return ONLY valid JSON in this exact format:
{
  "ingredients": "ingredient1, ingredient2, ingredient3",
  "brand": "Brand Name",
  "category": "category",
  "productName": "Product Name"
}

Important:
- Focus on extracting ONLY the ingredients list section
- Remove all special characters except commas, hyphens, and parentheses
- Separate ingredients with commas
- If a field is not visible, set it to empty string
- Do not include product descriptions, warnings, or marketing text`
            },
            {
              type: 'image_url',
              image_url: { url: image }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content returned from AI');
    }

    // Parse JSON from AI response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from AI response');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify(extractedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-ingredients:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        ingredients: '',
        brand: '',
        category: '',
        productName: ''
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

function getProductTypeContext(productType: string | null): string {
  if (productType === 'body') {
    return 'This is a BODY CARE product (body wash, lotion, deodorant, hand cream, etc.).';
  } else if (productType === 'hair') {
    return 'This is a HAIR CARE product (shampoo, conditioner, scalp treatment, hair mask, etc.).';
  } else if (productType === 'face') {
    return 'This is a FACIAL SKINCARE product (cleanser, serum, moisturizer, sunscreen, etc.).';
  }
  return 'This is a PERSONAL CARE product (could be facial skincare, body care, or hair care).';
}

function getCategoryExamples(productType: string | null): string {
  if (productType === 'body') {
    return 'body-wash, body-lotion, hand-cream, foot-cream, deodorant, body-scrub, body-sunscreen, or shaving';
  } else if (productType === 'hair') {
    return 'shampoo, conditioner, hair-mask, scalp-treatment, or hair-oil';
  } else if (productType === 'face') {
    return 'cleanser, serum, moisturizer, toner, sunscreen, mask, or eye-cream';
  }
  return 'cleanser, serum, moisturizer, body-wash, shampoo, conditioner, etc.';
}
