import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL_OPENROUTER = "google/gemma-3-4b-it:free";

const jsonResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
};

const normalize = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const safeReadText = async (r: Response) => {
  try {
    return await r.text();
  } catch {
    return "";
  }
};

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

const isLowQualityIngredients = (ingredientsRaw: string) => {
  const v = normalize(ingredientsRaw);
  if (!v) return true;
  if (v.length < 25) return true;

  const parts = v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

  if (parts.length < 4) return true;

  const alphaCount = (v.match(/[A-Za-z]/g) || []).length;
  if (alphaCount < Math.max(10, Math.floor(v.length * 0.35))) return true;

  return false;
};

const parseAndValidate = (content: string) => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = tryParseJson(jsonMatch ? jsonMatch[0] : content);
  const extracted = parsed ?? extractFromText(content);

  const ingredients = normalize(extracted?.ingredients);
  const brand = normalize(extracted?.brand);
  const category = normalize(extracted?.category);
  const productName = normalize(extracted?.productName);

  if (isLowQualityIngredients(ingredients)) {
    throw new Error("Low quality AI extraction");
  }

  return { ingredients, brand, category, productName };
};

function getProductTypeContext(productType: string | null): string {
  if (productType === "body") {
    return "This is a BODY CARE product (body wash, lotion, deodorant, hand cream, etc.).";
  }
  if (productType === "hair") {
    return "This is a HAIR CARE product (shampoo, conditioner, scalp treatment, hair mask, etc.).";
  }
  if (productType === "face") {
    return "This is a FACIAL SKINCARE product (cleanser, serum, moisturizer, sunscreen, etc.).";
  }
  return "This is a PERSONAL CARE product (could be facial skincare, body care, or hair care).";
}

function getCategoryExamples(productType: string | null): string {
  if (productType === "body") {
    return "body-wash, body-lotion, hand-cream, foot-cream, deodorant, body-scrub, body-sunscreen, shaving";
  }
  if (productType === "hair") {
    return "shampoo, conditioner, hair-mask, scalp-treatment, hair-oil";
  }
  if (productType === "face") {
    return "cleanser, serum, moisturizer, toner, sunscreen, mask, eye-cream";
  }
  return "cleanser, serum, moisturizer, body-wash, shampoo, conditioner";
}

const buildPrompt = (productType: string | null) => `${getProductTypeContext(productType)}

Extract from this product label image:
1) Ingredients list only, comma-separated
2) Brand, if visible
3) Category, pick one: ${getCategoryExamples(productType)}
4) Product name, if visible

Return ONLY valid JSON:
{
  "ingredients": "ingredient1, ingredient2, ingredient3",
  "brand": "Brand Name",
  "category": "category",
  "productName": "Product Name"
}

Rules:
- Ingredients must come from the ingredients section only
- Keep commas, hyphens, parentheses, slashes, periods
- If not visible, use empty string
- Return JSON only`;

const validateImageInput = (image: unknown) => {
  if (!image || typeof image !== "string" || !image.trim()) return "Missing or invalid image input";
  if (image.startsWith("data:") && image.length > 6_000_000) return "Image too large. Please upload a smaller image.";
  return null;
};

type GeminiImageData = { mimeType: string; data: string };

const getImageData = async (image: string): Promise<GeminiImageData> => {
  if (!image || typeof image !== "string") return { mimeType: "image/jpeg", data: "" };

  if (image.startsWith("data:")) {
    const parts = image.split(",");
    const header = parts[0] || "";
    const base64Data = parts[1] || "";
    const mimeTypeMatch = header.match(/data:(.*?);base64/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/jpeg";
    return { mimeType, data: base64Data };
  }

  const response = await fetch(image);
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const buffer = await response.arrayBuffer();
  const data = arrayBufferToBase64(buffer);
  return { mimeType: contentType, data };
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const image = body?.image;
    const productType = normalize(body?.productType) || null;

    const imageError = validateImageInput(image);
    if (imageError) {
      const status = imageError.includes("too large") ? 413 : 400;
      return jsonResponse(
        { error: imageError, ingredients: "", brand: "", category: "", productName: "" },
        status,
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const prompt = buildPrompt(productType);

    const errors: string[] = [];

    const callOpenRouter = async (): Promise<string | null> => {
      if (!OPENROUTER_API_KEY) return null;

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://skin-lytix.vercel.app",
          "X-Title": "SkinLytix",
        },
        body: JSON.stringify({
          model: MODEL_OPENROUTER,
          messages: [
            { role: "system", content: "Return ONLY valid JSON. No extra text." },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 900,
        }),
      });

      if (!response.ok) {
        const err = await safeReadText(response);
        console.error("OpenRouter error:", response.status, err);
        errors.push(`OpenRouter ${response.status}: ${err.slice(0, 800)}`);
        return null;
      }

      const openrouterData = await response.json().catch(() => null);
      const content = openrouterData?.choices?.[0]?.message?.content ?? null;
      return typeof content === "string" ? content : null;
    };

    const callLovable = async (): Promise<string | null> => {
      if (!LOVABLE_API_KEY) return null;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: "Return ONLY valid JSON. No extra text." },
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 900,
        }),
      });

      if (!response.ok) {
        const err = await safeReadText(response);
        console.error("Lovable error:", response.status, err);
        errors.push(`Lovable ${response.status}: ${err.slice(0, 800)}`);
        return null;
      }

      const lovableData = await response.json().catch(() => null);
      const content = lovableData?.choices?.[0]?.message?.content ?? null;
      return typeof content === "string" ? content : null;
    };

    const callGeminiDirect = async (): Promise<string | null> => {
      if (!GEMINI_API_KEY) return null;

      const { mimeType, data: geminiImageData } = await getImageData(image);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: "Return ONLY valid JSON. No extra text." },
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: geminiImageData } },
                ],
              },
            ],
            generationConfig: { temperature: 0.2, maxOutputTokens: 900 },
          }),
        },
      );

      if (!response.ok) {
        const err = await safeReadText(response);
        console.error("Gemini direct error:", response.status, err);
        errors.push(`Gemini ${response.status}: ${err.slice(0, 800)}`);
        return null;
      }

      const dataJson = await response.json().catch(() => null);
      const content = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
      return typeof content === "string" ? content : null;
    };

    const tryCall = async (fn: () => Promise<string | null>, label: string) => {
      try {
        const content = await fn();
        if (!content) {
          errors.push(`${label} returned no content`);
          return null;
        }
        return parseAndValidate(content);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${label} parse/validate error: ${msg}`);
        return null;
      }
    };

    const result =
      (await tryCall(callOpenRouter, "OpenRouter")) ||
      (await tryCall(callLovable, "Lovable")) ||
      (await tryCall(callGeminiDirect, "Gemini"));

    if (!result) {
      return jsonResponse(
        {
          error: `No usable AI extraction. ${errors.join(" | ")}`,
          errors,
          ingredients: "",
          brand: "",
          category: "",
          productName: "",
        },
        500,
      );
    }

    return jsonResponse(result, 200);
  } catch (error) {
    console.error("Error in extract-ingredients:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        ingredients: "",
        brand: "",
        category: "",
        productName: "",
      },
      500,
    );
  }
});