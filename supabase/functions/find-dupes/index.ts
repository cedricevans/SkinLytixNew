/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/**
 * Goals in this version
 * 1. Keep AI + OBF together. OBF enriches, AI proposes.
 * 2. Always return usable UI fields, even when OBF is blocked.
 * 3. Price estimate should show up when AI provides it.
 * 4. Everything “linked”: include productUrl (if available) plus an internalLink you control.
 * 5. Never force the UI to send users back to OBF. Your UI can use productUrl, but it does not have to.
 */

// CORS configuration
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const aiCache = new Map<string, { value: any[]; expiresAt: number }>();

type ObfEnriched = {
  imageUrl: string | null;
  productUrl: string | null;
  ingredients: string[] | null;
  brand: string | null;
  productName: string | null;
  images?: string[];
  price?: string | number | null;
  description?: string | null;
  generic_name?: string | null;
  categories?: string | null;
  barcode?: string | null;
  packaging?: string | null;
  storeLocation?: string | null;
};

const obfCache = new Map<string, { value: ObfEnriched | null; expiresAt: number }>();

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { productName, brand, ingredients, category, skinType, concerns } = await req.json();

    if (!productName || typeof productName !== "string") {
      return new Response(JSON.stringify({ dupes: [], error: "productName is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!LOVABLE_API_KEY && !GEMINI_API_KEY && !OPENROUTER_API_KEY) {
      return new Response(JSON.stringify({ dupes: [], error: "AI provider is not configured" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const promptIngredients: string[] = Array.isArray(ingredients) ? ingredients.slice(0, 40) : [];

    const scentContext = `${category || ""} ${productName}`.toLowerCase();
    const isScentFocused =
      scentContext.includes("body") ||
      scentContext.includes("lotion") ||
      scentContext.includes("butter") ||
      scentContext.includes("cream") ||
      scentContext.includes("mist");

    // AI prompt
    // IMPORTANT: we ask for priceEstimate explicitly and allow estimates (not “guaranteed store prices”).
    const systemPrompt = `
You are a skincare expert that finds REAL, existing product dupes.
Return VALID JSON ONLY. No markdown. No commentary.

Return ONLY a JSON array of 12 products.

Each product object MUST include:
- "name": string (exact product name)
- "brand": string | null
- "category": string | null (example: "Moisturizer", "Cleanser", "Body lotion")
- "priceEstimate": string | null (example: "$8-12", "$15", "Under $20". You are allowed to estimate.)
- "highlights": string[] (2-4 short bullets, plain language)
- "keyIngredients": string[] (5-10 ingredient names, lower effort list is fine)
- "flags": string[] (0-6 short watchouts, example: "Fragrance", "Potential allergens", "Essential oils", "Drying alcohol")
- "whereToBuy": string | null (example: "Target", "Ulta", "Amazon", "Sephora", "Drugstore", "Online")
- "productUrl": string | null (official brand page or major retailer when you know it, else null)
- "sharedIngredients": string[] | null (ingredient strings if you can infer them, else null)

Rules:
- Do NOT invent brand if you are unsure. Use null.
- Do NOT return fake products. Only real products.
- Keep strings short. No long paragraphs.
`.trim();

    const userPrompt = [
      `Product: ${productName}`,
      brand ? `Brand: ${brand}` : null,
      promptIngredients.length ? `Ingredients: ${promptIngredients.join(", ")}` : null,
      category ? `Category: ${category}` : null,
      skinType ? `Skin type: ${skinType}` : null,
      concerns ? `Concerns: ${concerns}` : null,
      isScentFocused ? "Focus more on scent profile and texture match." : null,
    ]
      .filter(Boolean)
      .join("\n");

    const aiCacheKey = JSON.stringify({ productName, brand, promptIngredients, category, skinType, concerns });
    let dupes: any[] = [];

    const cachedDupes = getCache(aiCache, aiCacheKey);
    if (cachedDupes) {
      dupes = cachedDupes;
    } else {
      let aiContent: string | null = null;
      let fallbackLevel = 0;

      // Lovable gateway
      if (LOVABLE_API_KEY) {
        try {
          const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
            }),
          });

          if (aiResponse.ok) {
            const aiData = await aiResponse.json();
            aiContent = aiData.choices?.[0]?.message?.content ?? null;
          } else {
            console.warn("AI Gateway error:", aiResponse.status);
            fallbackLevel = 1;
          }
        } catch (e) {
          console.warn("AI Gateway fetch error:", e);
          fallbackLevel = 1;
        }
      } else {
        fallbackLevel = 1;
      }

      // Gemini direct
      if (!aiContent && GEMINI_API_KEY && fallbackLevel >= 1) {
        try {
          const prompt = `${systemPrompt}\n\n${userPrompt}`;
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 },
              }),
            },
          );

          if (response.ok) {
            const dataJson = await response.json();
            aiContent = dataJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
          } else {
            console.warn("Gemini direct error:", response.status);
            fallbackLevel = 2;
          }
        } catch (e) {
          console.warn("Gemini fetch error:", e);
          fallbackLevel = 2;
        }
      }

      // OpenRouter fallback
      if (!aiContent && OPENROUTER_API_KEY && fallbackLevel >= 2) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "tngtech/deepseek-r1t-chimera:free",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              temperature: 0.7,
            }),
          });

          if (response.ok) {
            const aiData = await response.json();
            aiContent = aiData.choices?.[0]?.message?.content ?? null;
          } else {
            console.error("OpenRouter fallback failed:", response.status);
            return new Response(
              JSON.stringify({
                dupes: [],
                error: "All AI models are currently unavailable. Please try again later.",
              }),
              {
                status: 503,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              },
            );
          }
        } catch (e) {
          console.error("OpenRouter fetch error:", e);
        }
      }

      if (!aiContent) aiContent = "[]";

      // Parse AI response
      try {
        const cleanContent = aiContent.replace(/```json\n?/gi, "").replace(/```\n?/g, "").trim();
        const match = cleanContent.match(/\[[\s\S]*\]/);
        const parsed = JSON.parse(match ? match[0] : cleanContent);
        dupes = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.dupes) ? parsed.dupes : [];
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError);
        dupes = [];
      }

      setCache(aiCache, aiCacheKey, dupes, 10 * 60 * 1000);
    }

    // ---------------- Helpers ----------------
    const normaliseIngredient = (value: string): string =>
      value
        .toLowerCase()
        .replace(/\(.*?\)/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const normaliseIngredientList = (items: string[]): string[] => {
      const seen = new Set<string>();
      for (const item of items) {
        const norm = normaliseIngredient(item);
        if (norm.length > 2) seen.add(norm);
      }
      return Array.from(seen);
    };

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

    const normaliseText = (value: string): string =>
      value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    const buildTokenSet = (value: string): Set<string> => {
      const tokens = normaliseText(value)
        .split(" ")
        .filter((t) => t.length > 1);
      return new Set(tokens);
    };

    const computeTokenSimilarity = (left: string, right: string): number => {
      if (!left || !right) return 0;
      const leftTokens = buildTokenSet(left);
      const rightTokens = buildTokenSet(right);
      if (!leftTokens.size || !rightTokens.size) return 0;

      let intersection = 0;
      for (const t of leftTokens) if (rightTokens.has(t)) intersection += 1;

      const union = new Set([...leftTokens, ...rightTokens]).size;
      return union ? intersection / union : 0;
    };

    const scentKeywords = [
      "vanilla",
      "coconut",
      "shea",
      "cocoa",
      "chocolate",
      "almond",
      "honey",
      "oat",
      "oatmeal",
      "lavender",
      "rose",
      "jasmine",
      "citrus",
      "orange",
      "lemon",
      "grapefruit",
      "bergamot",
      "sandalwood",
      "musk",
      "amber",
      "cherry",
      "berry",
      "mint",
      "eucalyptus",
      "tea tree",
      "chamomile",
      "aloe",
      "argan",
      "jojoba",
      "cinnamon",
      "caramel",
      "sugar",
      "butter",
    ];

    const extractScentTokens = (value: string): string[] => {
      const text = normaliseText(value);
      const tokens: string[] = [];
      for (const k of scentKeywords) if (text.includes(k)) tokens.push(k);
      return Array.from(new Set(tokens));
    };

    const computeScentSimilarity = (sourceTokens: string[], targetText: string): number => {
      if (!sourceTokens.length) return 0;
      const targetTokens = extractScentTokens(targetText);
      if (!targetTokens.length) return 0;
      let matched = 0;
      for (const t of sourceTokens) if (targetTokens.includes(t)) matched += 1;
      return matched / sourceTokens.length;
    };

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

      if (typeof text === "string" && text.trim().length > 2) {
        return normaliseIngredientList(text.split(/[,;]+/));
      }

      return null;
    };

    const buildSearchTerms = (name: string, brandName?: string): string[] => {
      const normalized = normaliseText(name);
      const tokens = normalized.split(" ").filter((t) => t.length > 2);
      const topTokens = tokens.slice(0, 3).join(" ");
      const firstTwo = tokens.slice(0, 2).join(" ");
      const terms = new Set<string>();

      if (brandName) {
        const b = normaliseText(brandName);
        terms.add(`${b} ${normalized}`.trim());
        if (topTokens) terms.add(`${b} ${topTokens}`.trim());
        if (firstTwo) terms.add(`${b} ${firstTwo}`.trim());
      }

      terms.add(normalized);
      if (topTokens) terms.add(topTokens);
      if (firstTwo) terms.add(firstTwo);

      return Array.from(terms).filter((t) => t.length > 2);
    };

    const isPlaceholderImage = (url?: string): boolean => {
      if (!url) return true;
      return url.includes("images.unsplash.com");
    };

    const brandTokens = (value: string) => normaliseText(value).split(" ").filter((t) => t.length > 1);

    const hasAllBrandTokens = (candidate: string, expected: string) => {
      const expectedTokens = brandTokens(expected);
      const candidateTokens = new Set(brandTokens(candidate));
      if (!expectedTokens.length || candidateTokens.size === 0) return false;
      return expectedTokens.every((t) => candidateTokens.has(t));
    };

    const isBrandMatch = (
      obfBrand: string | null | undefined,
      obfName: string | null | undefined,
      dupeBrand: string | null | undefined,
    ) => {
      if (!obfBrand || !dupeBrand) return false;
      if (hasAllBrandTokens(obfBrand, dupeBrand)) return true;
      if (obfName && hasAllBrandTokens(obfName, dupeBrand)) return true;
      return false;
    };

    // OBF lookup
    const lookupOpenBeautyFacts = async (
      name: string,
      dupeBrand: string | undefined,
    ): Promise<ObfEnriched | null> => {
      const cacheKey = `${name}:${dupeBrand || ""}`;
      const cached = getCache(obfCache, cacheKey);
      if (cached !== undefined) return cached;

      const searchTerms = buildSearchTerms(name, dupeBrand);

      for (const term of searchTerms) {
        try {
          const encoded = encodeURIComponent(term);
          const response = await fetch(
            `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=5`,
            { headers: { "User-Agent": "SkinLytix/1.0" } },
          );

          if (!response.ok) continue;

          const data = await response.json();
          const products = data?.products;
          if (!Array.isArray(products) || products.length === 0) continue;

          for (const product of products) {
            const obfBrand = product.brands || null;
            const obfName = product.product_name || null;

            if (dupeBrand && obfBrand && !isBrandMatch(obfBrand, obfName, dupeBrand)) continue;

            const imageUrl = product.image_front_url || product.image_url || null;
            const productUrl = product.url || null;
            const obfIngredients = extractObfIngredients(product);

            const images: string[] = [];
            if (typeof product.image_front_url === "string") images.push(product.image_front_url);
            if (typeof product.image_url === "string" && !images.includes(product.image_url)) images.push(product.image_url);

            // NOTE: OBF often does NOT have price. Keep it as-is if present.
            const price = product.price ?? null;
            const description = product.description ?? null;
            const generic_name = product.generic_name ?? null;
            const categories = product.categories ?? null;
            const barcode = product.code ?? null;
            const packaging = product.packaging ?? null;

            let storeLocation: string | null = null;
            if (typeof product.purchase_places === "string" && product.purchase_places.trim()) {
              storeLocation = product.purchase_places.trim();
            } else if (typeof product.stores === "string" && product.stores.trim()) {
              storeLocation = product.stores.trim();
            }

            const result: ObfEnriched = {
              imageUrl,
              productUrl,
              ingredients: obfIngredients,
              brand: obfBrand,
              productName: obfName,
              images: images.length ? images : undefined,
              price,
              description,
              generic_name,
              categories,
              barcode,
              packaging,
              storeLocation,
            };

            setCache(obfCache, cacheKey, result, 30 * 60 * 1000);
            return result;
          }
        } catch (e) {
          console.warn("OBF lookup error:", e);
        }
      }

      setCache(obfCache, cacheKey, null, 10 * 60 * 1000);
      return null;
    };

    // Source ingredients
    const sourceIngredients =
      Array.isArray(ingredients) && ingredients.length > 0
        ? normaliseIngredientList(ingredients)
        : normaliseIngredientList(promptIngredients);

    const sourceScentTokens = extractScentTokens(
      `${productName} ${(Array.isArray(ingredients) ? ingredients.join(" ") : "")}`,
    );

    // Score AI dupes
    const scoredDupes = dupes.map((dupe, index) => {
      const name = dupe?.name || dupe?.productName || dupe?.product_name || "";
      const dupeBrand = dupe?.brand || dupe?.brandName || dupe?.brand_name || "";
      const sharedIngredients = Array.isArray(dupe?.sharedIngredients) ? dupe.sharedIngredients : [];
      const ingredientSignal = sharedIngredients.length
        ? computeOverlapStats(sourceIngredients, sharedIngredients)?.percent ?? 0
        : 0;

      const nameScore = computeTokenSimilarity(productName, name);
      const brandScore = brand ? computeTokenSimilarity(brand, dupeBrand) : 0;

      const scentText = [name, dupeBrand, ...(dupe?.highlights ?? []), ...(dupe?.reasons ?? []), ...(sharedIngredients ?? [])].join(
        " ",
      );
      const scentScore = computeScentSimilarity(sourceScentTokens, scentText);

      const preScore = ingredientSignal / 100 + nameScore * 0.8 + brandScore * 0.5 + scentScore * 0.7;
      return { index, preScore, nameScore, brandScore, scentScore };
    });

    const enrichIndexes = new Set(scoredDupes.map((x) => x.index));

    // Build final dupes
    const finalDupes = await Promise.all(
      dupes.map(async (dupe, index) => {
        const name = dupe?.name || dupe?.productName || dupe?.product_name;
        const dupeBrand = dupe?.brand || dupe?.brandName || dupe?.brand_name;

        if (!name || typeof name !== "string") return null;

        // OBF enrichment
        const obf = enrichIndexes.has(index) ? await lookupOpenBeautyFacts(name, dupeBrand) : null;

        // Ingredients priority: OBF -> AI sharedIngredients -> AI ingredients string/array
        let targetIngredients: string[] | null = null;

        if (obf?.ingredients?.length) {
          targetIngredients = obf.ingredients;
        } else if (Array.isArray(dupe?.sharedIngredients) && dupe.sharedIngredients.length) {
          targetIngredients = normaliseIngredientList(dupe.sharedIngredients);
        } else if (Array.isArray(dupe?.ingredients) && dupe.ingredients.length) {
          targetIngredients = normaliseIngredientList(dupe.ingredients);
        } else if (typeof dupe?.ingredients === "string") {
          targetIngredients = normaliseIngredientList(dupe.ingredients.split(/[,;]+/));
        } else {
          targetIngredients = null;
        }

        const overlapStats =
          targetIngredients && sourceIngredients.length ? computeOverlapStats(sourceIngredients, targetIngredients) : null;

        // Images
        let images: string[] = [];

        if (Array.isArray(obf?.images)) {
          for (const img of obf!.images!) {
            if (typeof img === "string" && img && !images.includes(img) && !isPlaceholderImage(img)) images.push(img);
          }
        }

        if (obf?.imageUrl && !isPlaceholderImage(obf.imageUrl) && !images.includes(obf.imageUrl)) images.push(obf.imageUrl);
        if (dupe?.imageUrl && !isPlaceholderImage(dupe.imageUrl) && !images.includes(dupe.imageUrl)) images.push(dupe.imageUrl);
        if (!images.length) images = [];

        // URL and whereToBuy (AI first, else OBF)
        const productUrl: string | null = (dupe?.productUrl && typeof dupe.productUrl === "string" ? dupe.productUrl : null) ??
          (obf?.productUrl ?? null);

        const whereToBuy: string | null =
          (dupe?.whereToBuy && typeof dupe.whereToBuy === "string" ? dupe.whereToBuy : null) ??
          (obf?.productUrl ? "Open Beauty Facts" : null);

        // Price and description and category
        // IMPORTANT: priceEstimate is expected from AI.
        const priceEstimate: string | null =
          (dupe?.priceEstimate && typeof dupe.priceEstimate === "string" ? dupe.priceEstimate : null) ??
          (dupe?.price_range && typeof dupe.price_range === "string" ? dupe.price_range : null) ??
          (dupe?.price && typeof dupe.price === "string" ? dupe.price : null) ??
          (typeof dupe?.price === "number" ? `$${dupe.price}` : null) ??
          (typeof obf?.price === "string" ? obf.price : null) ??
          (typeof obf?.price === "number" ? `$${obf.price}` : null);

        const description: string | null =
          (dupe?.description && typeof dupe.description === "string" ? dupe.description : null) ??
          (obf?.description ?? obf?.generic_name ?? null);

        const resolvedCategory: string | null =
          (dupe?.category && typeof dupe.category === "string" ? dupe.category : null) ??
          (obf?.categories ?? null);

        // Highlights, keyIngredients, flags from AI when present
        const highlights: string[] =
          Array.isArray(dupe?.highlights) ? dupe.highlights.filter(Boolean).slice(0, 8) : [];

        const keyIngredients: string[] =
          Array.isArray(dupe?.keyIngredients) ? dupe.keyIngredients.filter(Boolean).slice(0, 15) : [];

        const flags: string[] = Array.isArray(dupe?.flags) ? dupe.flags.filter(Boolean).slice(0, 12) : [];

        const ingredientList = targetIngredients ?? [];

        const scoreMeta = scoredDupes.find((x) => x.index === index);
        const matchScore = overlapStats?.percent ? overlapStats.percent / 100 : 0;
        const finalScore = matchScore * 1.6 + (scoreMeta?.preScore ?? 0);

        const fullName = obf?.productName || name;
        const normalizedBrand = obf?.brand || dupeBrand || dupe?.brand || null;

        return {
          ...dupe,
          name: fullName,
          brand: normalizedBrand,
          images,
          imageUrl: images[0] ?? null,
          productUrl,
          whereToBuy,
          priceEstimate, // keep as a top-level field for UI
          description,
          category: resolvedCategory,
          storeLocation: (obf?.storeLocation ?? dupe?.storeLocation ?? null),
          matchPercent: overlapStats?.percent ?? null,
          matchedCount: overlapStats?.matchedCount ?? null,
          sourceCount: overlapStats?.sourceCount ?? null,
          matchScore,
          nameScore: scoreMeta?.nameScore ?? null,
          brandScore: scoreMeta?.brandScore ?? null,
          scentScore: scoreMeta?.scentScore ?? null,
          compositeScore: finalScore,
          ingredientList,
          highlights,
          keyIngredients,
          flags,
          obf: obf ? { ...obf } : null,
          _score: finalScore,
        };
      }),
    );

    const filteredDupes = finalDupes
      .filter(Boolean)
      .sort((a: any, b: any) => (b?._score ?? 0) - (a?._score ?? 0))
      .slice(0, 5)
      .map((d: any) => {
        const { _score, ...rest } = d;
        return rest;
      });

    // ---------------- UI mapping layer ----------------
    function stableHash(str: string): string {
      let hash = 5381;
      for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) + hash + str.charCodeAt(i);
        hash = hash & 0xffffffff;
      }
      return Math.abs(hash).toString(36);
    }

    function pickImage(dupe: any): string | null {
      if (Array.isArray(dupe.images) && dupe.images.length > 0 && dupe.images[0]) return dupe.images[0];
      if (dupe.imageUrl) return dupe.imageUrl;
      if (dupe.obf && dupe.obf.imageUrl) return dupe.obf.imageUrl;
      return null;
    }

    function cleanIngredients(list: any): string[] {
      if (!Array.isArray(list)) return [];
      const seen = new Set<string>();
      return list
        .map((x: string) => (x || "").trim())
        .filter((x: string) => x.length > 2)
        .map((x: string) => x.toLowerCase())
        .filter((x: string) => (!seen.has(x) ? (seen.add(x), true) : false));
    }

    function extractKeyIngredients(list: string[], aiKeys?: string[]): string[] {
      const cleaned = cleanIngredients(list);
      const fromAi = Array.isArray(aiKeys) ? aiKeys.map((x) => (x || "").trim()).filter(Boolean) : [];
      const merged = [...fromAi, ...cleaned];
      const seen = new Set<string>();
      const deduped = merged
        .map((x) => x.toLowerCase())
        .filter((x) => x.length > 2)
        .filter((x) => (!seen.has(x) ? (seen.add(x), true) : false));
      return deduped.slice(0, 10);
    }

    function extractFlags(ingredients: string[], aiFlags?: string[]): string[] {
      const fromAi = Array.isArray(aiFlags) ? aiFlags.map((x) => (x || "").trim()).filter(Boolean) : [];
      const autoFlags: string[] = [];
      const lower = ingredients.map((x) => x.toLowerCase());

      if (lower.some((x) => x.includes("fragrance") || x.includes("parfum"))) autoFlags.push("Fragrance");
      if (lower.some((x) => x.includes("limonene") || x.includes("linalool") || x.includes("citral") || x.includes("eugenol")))
        autoFlags.push("Potential allergens");
      if (lower.some((x) => x.includes("essential oil"))) autoFlags.push("Essential oils");
      if (lower.some((x) => x.includes("alcohol denat"))) autoFlags.push("Drying alcohol");

      const merged = [...fromAi, ...autoFlags];
      const seen = new Set<string>();
      return merged
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => (!seen.has(x.toLowerCase()) ? (seen.add(x.toLowerCase()), true) : false))
        .slice(0, 8);
    }

    function extractHighlights(dupe: any): string[] {
      // Prefer AI highlights. Fallback to short, useful derived highlights.
      const fromAi = Array.isArray(dupe?.highlights) ? dupe.highlights.map((x: any) => (x || "").trim()).filter(Boolean) : [];

      const derived: string[] = [];
      if (typeof dupe?.matchedCount === "number" && typeof dupe?.sourceCount === "number") {
        derived.push(`Solid ingredient overlap`);
      }
      if (Array.isArray(dupe?.ingredientList)) {
        const ing = dupe.ingredientList.map((x: string) => x.toLowerCase());
        if (ing.some((x) => x.includes("ceramide") || x.includes("cholesterol"))) derived.push("Barrier support");
      }
      if (Array.isArray(dupe?.ingredientList)) {
        const ing = dupe.ingredientList.map((x: string) => x.toLowerCase());
        if (ing.some((x) => x.includes("fragrance") || x.includes("parfum"))) derived.push("Contains fragrance");
      }

      const merged = [...fromAi, ...derived];
      const seen = new Set<string>();
      return merged
        .map((x) => x.trim())
        .filter(Boolean)
        .filter((x) => (!seen.has(x.toLowerCase()) ? (seen.add(x.toLowerCase()), true) : false))
        .slice(0, 6);
    }

    function extractPriceEstimate(dupe: any): string | null {
      // This is the missing piece in your current output.
      // Your UI expects dupe.priceEstimate, but your earlier pipeline often only set dupe.price.
      // We prioritize AI priceEstimate first.
      const v =
        (typeof dupe?.priceEstimate === "string" && dupe.priceEstimate.trim() ? dupe.priceEstimate.trim() : null) ??
        (typeof dupe?.price_range === "string" && dupe.price_range.trim() ? dupe.price_range.trim() : null) ??
        (typeof dupe?.price === "string" && dupe.price.trim() ? dupe.price.trim() : null) ??
        (typeof dupe?.price === "number" ? `$${dupe.price}` : null) ??
        (typeof dupe?.obf?.price === "string" && dupe.obf.price.trim() ? dupe.obf.price.trim() : null) ??
        (typeof dupe?.obf?.price === "number" ? `$${dupe.obf.price}` : null);

      if (!v) return null;

      // normalize common cases: "15" -> "$15"
      if (/^\d+(\.\d+)?$/.test(v)) return `$${v}`;
      return v;
    }

    const uiDupes = filteredDupes.map((dupe: any) => {
      const name = dupe?.name || "";
      const brandName = dupe?.brand || "";
      const id = stableHash(`${name}::${brandName}`);

      const ingredientsList = cleanIngredients(dupe?.ingredientList || []);
      const keyIngredients = extractKeyIngredients(ingredientsList, dupe?.keyIngredients);
      const flags = extractFlags(ingredientsList, dupe?.flags);
      const highlights = extractHighlights(dupe);
      const priceEstimate = extractPriceEstimate(dupe);

      const productUrl =
        typeof dupe?.productUrl === "string" && dupe.productUrl.trim() ? dupe.productUrl.trim() : null;

      // This is the internal link you control. Your UI should route to a details page/modal using this.
      const internalLink = `/dupes/${id}`;

      return {
        id,
        internalLink,
        name,
        brand: brandName || null,
        imageUrl: pickImage(dupe),
        images: Array.isArray(dupe?.images) ? dupe.images : [],
        matchPercent: typeof dupe?.matchPercent === "number" ? dupe.matchPercent : null,

        // UI fields you want visible above "More"
        priceEstimate,
        category: dupe?.category || null,
        highlights,
        keyIngredients,
        flags,
        ingredientsCount: ingredientsList.length,

        // UI fields you want available under "More"
        description: dupe?.description || null,
        whereToBuy: dupe?.whereToBuy || null,
        storeLocation: dupe?.storeLocation || null,
        productUrl,

        // Full ingredient list for your own details view (still not forcing OBF)
        ingredientList: ingredientsList,

        // Optional meta for deeper views
        meta: {
          barcode: dupe?.obf?.barcode ?? null,
          packaging: dupe?.obf?.packaging ?? null,
          categoriesRaw: dupe?.obf?.categories ?? null,
        },
      };
    });

    // Summary ids
    let bestMatchId: string | null = null;
    let bestValueId: string | null = null;

    if (uiDupes.length) {
      const bestMatch = uiDupes.reduce((a, b) => ((b.matchPercent || 0) > (a.matchPercent || 0) ? b : a), uiDupes[0]);
      bestMatchId = bestMatch.id;

      const priceVals = uiDupes
        .map((d) => {
          const p = typeof d.priceEstimate === "string" ? d.priceEstimate : "";
          const n = p ? parseFloat(p.replace(/[^\d.]/g, "")) : NaN;
          return Number.isFinite(n) ? { id: d.id, price: n } : null;
        })
        .filter(Boolean) as Array<{ id: string; price: number }>;

      bestValueId = priceVals.length
        ? priceVals.reduce((a, b) => (b.price < a.price ? b : a), priceVals[0]).id
        : bestMatchId;
    }

    const response = {
      sourceProduct: {
        name: productName,
        brand: brand || null,
        category: category || null,
      },
      summary: {
        bestMatchId,
        bestValueId,
      },
      dupes: uiDupes,

      // Keep raw only if you actively use it in the app.
      // If you do not need it, delete this to reduce payload.
      dupesRaw: filteredDupes,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in find-dupes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ dupes: [], error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});