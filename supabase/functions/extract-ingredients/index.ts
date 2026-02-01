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

const emptyResult = () => ({
  brand: "",
  product_name: "",
  variant: null,
  size: null,
  ingredients: [],
  key_flags: [],
  skin_concerns: [],
  skin_types: [],
  why_it_fits: [],
  dupes: [],
  where_to_buy: [],
  confidence: 0,
  notes: null,
});

const normalizeText = (v: unknown) =>
  typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "";

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
  const brand = raw.match(/"brand"\s*:\s*"([^"]*)"/i)?.[1] ?? "";
  const productName = raw.match(/"product_name"\s*:\s*"([^"]*)"/i)?.[1]
    ?? raw.match(/"productName"\s*:\s*"([^"]*)"/i)?.[1]
    ?? "";
  const variant = raw.match(/"variant"\s*:\s*"([^"]*)"/i)?.[1] ?? "";
  const size = raw.match(/"size"\s*:\s*"([^"]*)"/i)?.[1] ?? "";
  const ingredients = raw.match(/"ingredients"\s*:\s*\[(.*?)\]/i)?.[1] ?? "";
  return { brand, productName, variant, size, ingredients };
};

const dedupeStrings = (values: string[]) => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const cleaned = normalizeText(value);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
  }
  return result;
};

const sanitizeBrand = (value: unknown) => {
  const text = normalizeText(value);
  if (!text) return "";
  if (text.includes(":")) return "";
  const lower = text.toLowerCase();
  const banned = [
    "ingredients",
    "where to buy",
    "why it fits",
    "routine",
    "analysis",
    "directions",
    "warning",
    "caution",
    "disclaimer",
  ];
  if (banned.some((label) => lower.startsWith(label))) return "";
  return text;
};

const normalizeIngredients = (value: unknown) => {
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => normalizeText(item))
      .map((item) => item.replace(/^[,;:.\\s]+|[,;:.\\s]+$/g, ""))
      .filter(Boolean)
      .filter((item) => item.toLowerCase() !== "ingredients");
    return dedupeStrings(cleaned);
  }

  if (typeof value === "string") {
    const parts = value
      .split(/[,;\\n]+/)
      .map((item) => normalizeText(item))
      .map((item) => item.replace(/^[,;:.\\s]+|[,;:.\\s]+$/g, ""))
      .filter(Boolean)
      .filter((item) => item.toLowerCase() !== "ingredients");
    return dedupeStrings(parts);
  }

  return [];
};

const normalizeStringArray = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return dedupeStrings(value.map((item) => normalizeText(item)).filter(Boolean));
};

const normalizeSkinTypes = (value: unknown) => {
  const allowed = new Set(["oily", "dry", "combination", "normal", "sensitive"]);
  return normalizeStringArray(value).filter((item) => allowed.has(item.toLowerCase()));
};

const normalizeDupes = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Array<{
    brand: string;
    product_name: string;
    variant: string | null;
    match_reason: string;
    match_score: number;
  }> = [];

  for (const item of value) {
    const brand = normalizeText(item?.brand);
    const productName = normalizeText(item?.product_name);
    if (!brand || !productName) continue;
    const variant = normalizeText(item?.variant) || null;
    const key = `${brand.toLowerCase()}::${productName.toLowerCase()}::${(variant || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const matchReason = normalizeText(item?.match_reason);
    const scoreRaw = typeof item?.match_score === "number" ? item.match_score : Number(item?.match_score);
    const matchScore = Number.isFinite(scoreRaw)
      ? Math.min(1, Math.max(0, scoreRaw))
      : 0;
    result.push({
      brand,
      product_name: productName,
      variant,
      match_reason: matchReason,
      match_score: matchScore,
    });
    if (result.length >= 8) break;
  }

  return result;
};

const normalizeWhereToBuy = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const result: Array<{ retailer_name: string; url: string | null }> = [];

  for (const item of value) {
    const retailerName = normalizeText(item?.retailer_name);
    if (!retailerName) continue;
    const key = retailerName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const url = normalizeText(item?.url);
    result.push({
      retailer_name: retailerName,
      url: url && /^https?:\/\//i.test(url) ? url : null,
    });
  }

  return result;
};

const parseAndValidate = (content: string) => {
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  const parsed = tryParseJson(jsonMatch ? jsonMatch[0] : content);
  const extracted = parsed ?? extractFromText(content);

  const brand = sanitizeBrand(extracted?.brand);
  const productName = normalizeText(extracted?.product_name ?? extracted?.productName ?? "");
  const variantRaw = normalizeText(extracted?.variant);
  const variant = variantRaw ? variantRaw.slice(0, 60) : null;
  const sizeRaw = normalizeText(extracted?.size);
  const size = sizeRaw || null;
  const ingredients = normalizeIngredients(extracted?.ingredients);
  const keyFlags = normalizeStringArray(extracted?.key_flags);
  const skinConcerns = normalizeStringArray(extracted?.skin_concerns);
  const skinTypes = normalizeSkinTypes(extracted?.skin_types);
  const whyItFits = normalizeStringArray(extracted?.why_it_fits).slice(0, 5);
  const dupes = normalizeDupes(extracted?.dupes);
  const whereToBuy = normalizeWhereToBuy(extracted?.where_to_buy);

  const confidenceRaw =
    typeof extracted?.confidence === "number" ? extracted.confidence : Number(extracted?.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(1, Math.max(0, confidenceRaw))
    : 0;

  let notes = normalizeText(extracted?.notes) || null;
  if (confidence >= 0.7) {
    notes = null;
  } else if (!notes) {
    notes = "Input was incomplete or unclear for full extraction.";
  }

  return {
    brand,
    product_name: productName,
    variant,
    size,
    ingredients,
    key_flags: keyFlags,
    skin_concerns: skinConcerns,
    skin_types: skinTypes,
    why_it_fits: whyItFits,
    dupes,
    where_to_buy: whereToBuy,
    confidence,
    notes,
  };
};

const buildPrompt = (labelText: string | null) => `You are SkinLytix OBF. You extract structured product facts from provided product label text, packaging copy, and OCR. Output strict JSON only. No markdown. No backticks. No extra text.

Goal
Produce clean, grounded, non-duplicative data for:
- Brand and product identification with variant handling
- Ingredient list
- Key flags derived only from ingredients
- Minimal, non-repetitive "why it fits"
- Dupes with de-duplication and scores
- Where-to-buy only when explicitly present in the input

Never guess
Do not invent brands, retailers, URLs, ingredient names, product names, claims, routines, benefits, or availability. If a value is not explicitly present in the input, leave it blank, null, or [] per the schema.

Output format
Return this exact JSON object with all keys present and in this order:
{
  "brand": "",
  "product_name": "",
  "variant": null,
  "size": null,
  "ingredients": [],
  "key_flags": [],
  "skin_concerns": [],
  "skin_types": [],
  "why_it_fits": [],
  "dupes": [],
  "where_to_buy": [],
  "confidence": 0.0,
  "notes": null
}

Global normalization rules
- Trim whitespace for all strings.
- Collapse multiple spaces into one space.
- Do not include headings as data values.
- Never output section labels as field values.
- Avoid duplicates in arrays using case-insensitive matching.
- Preserve original casing for proper nouns where possible.

Identity rules
brand
- Must be the brand name only.
- Must never contain ":" or any heading/label words.
- Must never equal or start with any of these labels (case-insensitive): ingredients, where to buy, why it fits, routine, analysis, directions, warning, caution, disclaimer.
- If brand is not explicitly present, set brand to "".

product_name
- Must be the base product name only.
- Do not include marketing sentences or benefit claims.
- If product name is not explicitly present, set to "".

variant
- Captures differentiators when present, including flavor, scent, fragrance name, shade, tint, color, SPF value, formula type, and "fragrance free" status.
- If any differentiator is present in the input, variant must not be null.
- If no differentiator is present, set variant to null.
- Keep variant under 60 characters.
- If multiple differentiators exist, combine them with comma plus space, for example: "strawberry, spf 30" or "fragrance free, tinted".
- Examples of valid variants: "strawberry", "banana", "spf 50", "fragrance free", "tinted", "gel", "cream", "serum", "kids", "original".
- Do not guess variant. Only use what appears in the input.

size
- If present, capture as a string exactly as shown, including unit pairs if available.
- Examples: "1.7 fl oz / 50 mL", "12 oz", "30 mL".
- If not explicitly present, set to null.

Ingredients rules
ingredients
- Must be an array of ingredient strings only.
- Must not include a heading like "Ingredients" or "Ingredients:".
- Preserve label order when possible.
- De-duplicate case-insensitively.
- Normalize:
  - Remove leading/trailing punctuation.
  - Convert multiple commas or spaces into single separators.
- If ingredients are not explicitly present, return [].

Key flags rules
key_flags
- Short labels derived only from ingredients list or explicit label statements in the input.
- Only include a flag if it is directly supported by ingredients or explicit packaging text.
- Do not guess concentration or strength.
- Allowed examples of flags:
  - "fragrance present" (if fragrance/parfum is present)
  - "essential oils present" (if specific essential oils are listed)
  - "denatured alcohol present" (if alcohol denat is present)
  - "retinoid present" (retinol/retinal/adapalene/tretinoin, only if explicitly listed)
  - "AHA present" (glycolic/lactic/mandelic, only if explicitly listed)
  - "BHA present" (salicylic acid, only if explicitly listed)
  - "benzoyl peroxide present" (only if explicitly listed)
  - "niacinamide present" (only if explicitly listed)
  - "vitamin C present" (ascorbic acid/derivatives, only if explicitly listed)
  - "SPF filters present" (only if explicit UV filters are listed)
- If unsure, do not include the flag.

Skin concerns rules
skin_concerns
- Use only when explicitly stated in the input or strongly supported by explicit actives.
- Use short labels only.
- Examples: "acne", "hyperpigmentation", "dryness", "redness", "aging", "sensitivity".
- If not supported, return [].

Skin types rules
skin_types
- Use only when explicitly stated in the input.
- Allowed values: "oily", "dry", "combination", "normal", "sensitive".
- If not supported, return [].

Why it fits rules
why_it_fits
- Up to 5 bullets, each a short sentence fragment.
- Each bullet must be unique in meaning. Do not repeat.
- Must reference explicit ingredients or explicit claims present in the input.
- No marketing tone. No hype words.
- If not grounded, return [].

Dupes rules
dupes
- Array of up to 8 items.
- Each item must be exactly:
{
  "brand": "",
  "product_name": "",
  "variant": null,
  "match_reason": "",
  "match_score": 0.0
}
- Requirements:
  - dupe brand and product_name must be non-empty.
  - dupe variant can be null or a short string if known, but do not guess.
  - match_reason must be one short sentence grounded in shared actives, category, or function as supported by the input.
  - match_score must be a number between 0.0 and 1.0.
  - De-duplicate dupes using (brand + product_name + variant), case-insensitive.
  - If input lacks enough detail to justify dupes, return [].
  - Never output duplicate dupes with minor wording changes.

Where to buy rules
where_to_buy
- Must be [] unless a retailer name is explicitly present in the input text.
- Each item must be exactly:
{
  "retailer_name": "",
  "url": null
}
- url must be null unless a full URL is explicitly present in the input.
- De-duplicate retailers by retailer_name, case-insensitive.
- Never invent retailer names or URLs.

Confidence rules
confidence
- Number from 0.0 to 1.0 based on input completeness and clarity.
- Use these anchors:
  - 0.90 to 1.00 when brand, product_name, and ingredients are clear and complete.
  - 0.70 to 0.89 when brand and product_name clear, ingredients partial or noisy.
  - 0.40 to 0.69 when only one of brand or product_name is clear, ingredients incomplete.
  - 0.00 to 0.39 when input is too incomplete to reliably extract.

Notes rules
notes
- If confidence < 0.70, briefly state what was missing or unclear in one sentence.
- If confidence >= 0.70, set notes to null.

Final validation gates before output
- Output must be valid JSON with no trailing commas.
- All top-level keys must exist even if blank, null, or [].
- brand must not be a label word, must not contain ":".
- ingredients array must not contain the word "Ingredients" as an item.
- dupes must contain no duplicates after de-duplication.
- where_to_buy must be empty unless retailer names appear in the input.

${labelText ? `Input text:\\n${labelText}` : "Now process the provided input and return only the JSON object."}`; 

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
    const labelText = normalizeText(body?.labelText) || null;

    const imageError = validateImageInput(image);
    if (imageError) {
      const status = imageError.includes("too large") ? 413 : 400;
      return jsonResponse(
        { ...emptyResult(), error: imageError },
        status,
      );
    }

    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const prompt = buildPrompt(labelText);

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
      (await tryCall(callGeminiDirect, "Gemini")) ||
      (await tryCall(callLovable, "Lovable")) ||
      (await tryCall(callOpenRouter, "OpenRouter"));

    if (!result) {
      return jsonResponse(
        {
          ...emptyResult(),
          error: `No usable AI extraction. ${errors.join(" | ")}`,
          errors,
        },
        500,
      );
    }

    return jsonResponse(result, 200);
  } catch (error) {
    console.error("Error in extract-ingredients:", error);
    return jsonResponse(
      {
        ...emptyResult(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
});
