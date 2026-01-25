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
  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');

    const buildPrompt = () => `${getProductTypeContext(productType)}

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
- Do not include product descriptions, warnings, or marketing text
- Return JSON only (no markdown, no extra text)`;

    const callLovable = async () => {
      if (!LOVABLE_API_KEY) return null;
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [
            {
              role: 'system',
              content: 'You are a precise extraction engine. Return ONLY valid JSON that matches the schema.',
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: buildPrompt() },
                { type: 'image_url', image_url: { url: image } },
              ],
            },
          ],
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        return null;
      }

  const lovableData = await response.json();
  return lovableData?.choices?.[0]?.message?.content ?? null;
    };

    const callGeminiDirect = async () => {
      if (!GEMINI_API_KEY) return null;
  const { mimeType, data: geminiImageData } = await getImageData(image);
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: "You are a precise extraction engine. Return ONLY valid JSON that matches the schema." },
              { text: buildPrompt() },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: geminiImageData,
                },
              },
            ],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 800,
          },
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

    // OpenRouter fallback (DeepSeek Chimera)

    const callOpenRouter = async () => {
      if (!OPENROUTER_API_KEY) return null;
      const { mimeType, data: openrouterImageData } = await getImageData(image);
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'tngtech/deepseek-r1t-chimera:free',
          messages: [
            {
              role: 'system',
              content: 'You are a precise extraction engine. Return ONLY valid JSON that matches the schema.'
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: buildPrompt() },
                // Use inline_data for OpenRouter if supported, else fallback to image_url
                { type: 'image_url', image_url: { url: image } },
                // Uncomment below if OpenRouter supports inline_data (base64):
                // { type: 'inline_data', inline_data: { mime_type: mimeType, data: openrouterImageData } },
              ],
            },
          ],
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouter error:', response.status, errorText);
        return null;
      }

      const openrouterData = await response.json();
      return openrouterData?.choices?.[0]?.message?.content ?? null;
    };


  // 3-level fallback: OpenRouter → Lovable → Gemini, with error logging
  let content = null;
  let aiErrorLog = [];

  try {
    content = await callOpenRouter();
    if (!content) aiErrorLog.push('OpenRouter returned no content');
  } catch (err) {
    aiErrorLog.push('OpenRouter error: ' + (err instanceof Error ? err.message : String(err)));
  }
  if (!content) {
    try {
      content = await callLovable();
      if (!content) aiErrorLog.push('Lovable returned no content');
    } catch (err) {
      aiErrorLog.push('Lovable error: ' + (err instanceof Error ? err.message : String(err)));
    }
  }
  if (!content) {
    try {
      content = await callGeminiDirect();
      if (!content) aiErrorLog.push('Gemini returned no content');
    } catch (err) {
      aiErrorLog.push('Gemini error: ' + (err instanceof Error ? err.message : String(err)));
    }
  }

    if (!content) {
      console.error('AI extraction failed. Fallback log:', aiErrorLog);
      throw new Error('No content returned from AI. Fallback log: ' + aiErrorLog.join(' | '));
    }

    const tryParseJson = (raw: string) => {
      try {
        return JSON.parse(raw);
      } catch {
        return null;
      }
    };

    const extractFromText = (raw: string) => {
      const ingredients = raw.match(/"ingredients"\s*:\s*"([^"]*)"/i)?.[1] ?? "";
      const brand = raw.match(/"brand"\s*:\s*"([^"]*)"/i)?.[1] ?? "";
      const category = raw.match(/"category"\s*:\s*"([^"]*)"/i)?.[1] ?? "";
      const productName = raw.match(/"productName"\s*:\s*"([^"]*)"/i)?.[1] ?? "";
      return { ingredients, brand, category, productName };
    };

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const parsed = tryParseJson(jsonMatch ? jsonMatch[0] : content);
    const extractedData = parsed ?? extractFromText(content);

    if (!extractedData || typeof extractedData !== 'object') {
      throw new Error('Could not parse JSON from AI response');
    }

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

const getImageData = async (image: string): Promise<{ mimeType: string; data: string }> => {
  if (image.startsWith('data:')) {
    const [header, base64Data] = image.split(',');
    const mimeTypeMatch = header.match(/data:(.*?);base64/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/jpeg';
    return { mimeType, data: base64Data };
  }

  const response = await fetch(image);
  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const buffer = await response.arrayBuffer();
  const data = arrayBufferToBase64(buffer);
  return { mimeType: contentType, data };
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

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
