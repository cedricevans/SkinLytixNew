import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

/**
 * OPTIMIZED FIND-DUPES EDGE FUNCTION
 *
 * Key fixes:
 * 1. Better request deduplication to prevent multiple simultaneous calls
 * 2. Smarter caching with request fingerprinting
 * 3. Reduced OBF calls with batch limiting
 * 4. Early return optimization
 * 5. Request coalescing for identical queries
 */

// ============================================================================
// CORS HEADERS
// ============================================================================

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================================
// TYPES
// ============================================================================

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

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type PendingRequest = {
  promise: Promise<any>;
  timestamp: number;
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class CacheManager {
  private static aiCache = new Map<string, CacheEntry<any[]>>();
  private static obfCache = new Map<string, CacheEntry<ObfEnriched | null>>();
  private static pendingRequests = new Map<string, PendingRequest>();

  // Cache TTLs
  private static readonly AI_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  private static readonly OBF_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
  private static readonly PENDING_REQUEST_TIMEOUT = 30 * 1000; // 30 seconds

  static get<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  static set<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T, ttlMs: number): void {
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  static getAI(key: string): any[] | undefined {
    return this.get(this.aiCache, key);
  }

  static setAI(key: string, value: any[]): void {
    this.set(this.aiCache, key, value, this.AI_CACHE_TTL);
  }

  static getOBF(key: string): ObfEnriched | null | undefined {
    return this.get(this.obfCache, key);
  }

  static setOBF(key: string, value: ObfEnriched | null): void {
    this.set(this.obfCache, key, value, this.OBF_CACHE_TTL);
  }

  // Request deduplication
  static getPendingRequest(key: string): Promise<any> | undefined {
    const pending = this.pendingRequests.get(key);
    if (!pending) return undefined;

    // Check if request has timed out
    if (Date.now() - pending.timestamp > this.PENDING_REQUEST_TIMEOUT) {
      this.pendingRequests.delete(key);
      return undefined;
    }

    return pending.promise;
  }

  static setPendingRequest(key: string, promise: Promise<any>): void {
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });
  }

  static removePendingRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  // Periodic cleanup
  static cleanup(): void {
    const now = Date.now();

    // Clean expired AI cache
    for (const [key, entry] of this.aiCache.entries()) {
      if (now > entry.expiresAt) this.aiCache.delete(key);
    }

    // Clean expired OBF cache
    for (const [key, entry] of this.obfCache.entries()) {
      if (now > entry.expiresAt) this.obfCache.delete(key);
    }

    // Clean stale pending requests
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > this.PENDING_REQUEST_TIMEOUT) {
        this.pendingRequests.delete(key);
      }
    }
  }
}

// Run cleanup every 5 minutes
setInterval(() => CacheManager.cleanup(), 5 * 60 * 1000);

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  MAX_DUPES_TO_RETURN: 5,
  MAX_DUPES_TO_ENRICH: 3,
  MAX_PROMPT_INGREDIENTS: 40,
  AI_TIMEOUT: 15000,

  OBF_TIMEOUT_FULL: 5000,
  OBF_TIMEOUT_IMAGE: 2000,

  OBF_PAGE_SIZE_FULL: 3,
  OBF_PAGE_SIZE_IMAGE: 3,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const Utils = {
  normalizeIngredient(value: string): string {
    return (value || "")
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  normalizeIngredientList(items: string[]): string[] {
    const seen = new Set<string>();
    for (const item of items) {
      const norm = this.normalizeIngredient(item);
      if (norm.length > 2) seen.add(norm);
    }
    return Array.from(seen);
  },

  normalizeText(value: string): string {
    return (value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  sanitizePromptText(value: string): string {
    const normalized = (value || "").normalize("NFKD");
    const filtered = Array.from(normalized)
      .filter((char) => {
        const code = char.charCodeAt(0);
        if (code < 32 || code === 127) return false;
        if (code >= 0xd800 && code <= 0xdfff) return false;
        return true;
      })
      .join("");
    return filtered
      .replace(/[^a-zA-Z0-9\s.,'&%\-()/]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  },

  buildTokenSet(value: string): Set<string> {
    const tokens = this.normalizeText(value)
      .split(" ")
      .filter((t) => t.length > 1);
    return new Set(tokens);
  },

  computeTokenSimilarity(left: string, right: string): number {
    if (!left || !right) return 0;
    const leftTokens = this.buildTokenSet(left);
    const rightTokens = this.buildTokenSet(right);
    if (!leftTokens.size || !rightTokens.size) return 0;

    let intersection = 0;
    for (const t of leftTokens) {
      if (rightTokens.has(t)) intersection += 1;
    }

    const union = new Set([...leftTokens, ...rightTokens]).size;
    return union ? intersection / union : 0;
  },

  computeOverlapStats(sourceList: string[], targetList: string[]) {
    const sourceIngredients = this.normalizeIngredientList(sourceList);
    const targetIngredients = this.normalizeIngredientList(targetList);

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
  },

  isPlaceholderImage(url?: string): boolean {
    if (!url) return true;
    return url.includes("images.unsplash.com");
  },

  stableHash(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
      hash = hash & 0xffffffff;
    }
    return Math.abs(hash).toString(36);
  },

  createRequestFingerprint(body: any): string {
    const normIngs = Utils.normalizeIngredientList(Array.isArray(body?.ingredients) ? body.ingredients : []);
    const ingHash = Utils.stableHash(normIngs.sort().join("|"));

    return Utils.stableHash(
      JSON.stringify({
        sourceProductId: body?.sourceProductId || "",
        scanKey: body?.scanKey || "",
        productName: body?.productName || "",
        brand: body?.brand || "",
        category: body?.category || "",
        ingredientsHash: ingHash,
      }),
    );
  },
};

// ============================================================================
// SCENT ANALYSIS
// ============================================================================

const ScentAnalyzer = {
  keywords: [
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
  ],

  extractTokens(value: string): string[] {
    const text = Utils.normalizeText(value);
    const tokens: string[] = [];
    for (const keyword of this.keywords) {
      if (text.includes(keyword)) tokens.push(keyword);
    }
    return Array.from(new Set(tokens));
  },

  computeSimilarity(sourceTokens: string[], targetText: string): number {
    if (!sourceTokens.length) return 0;
    const targetTokens = this.extractTokens(targetText);
    if (!targetTokens.length) return 0;

    let matched = 0;
    for (const token of sourceTokens) {
      if (targetTokens.includes(token)) matched += 1;
    }

    return matched / sourceTokens.length;
  },

  isScentFocused(category: string, productName: string): boolean {
    const context = `${category} ${productName}`.toLowerCase();
    return (
      context.includes("body") ||
      context.includes("lotion") ||
      context.includes("butter") ||
      context.includes("cream") ||
      context.includes("mist")
    );
  },
};

// ============================================================================
// AI PROVIDER
// ============================================================================

class AIProvider {
  private static async callWithTimeout(fetchPromise: Promise<Response>, timeoutMs: number): Promise<Response> {
    const timeoutPromise = new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs),
    );
    return Promise.race([fetchPromise, timeoutPromise]);
  }

  private static async safeReadText(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return "";
    }
  }

  private static parseAIArray(content: string | null): any[] {
    if (!content) return [];

    const clean = content
      .replace(/```json\n?/gi, "")
      .replace(/```\n?/g, "")
      .trim();

    const match = clean.match(/\[[\s\S]*\]/);

    try {
      const parsed = JSON.parse(match ? match[0] : clean);
      if (Array.isArray(parsed)) return parsed;
      if (Array.isArray(parsed?.dupes)) return parsed.dupes;
      return [];
    } catch {
      return [];
    }
  }

  static async getDupes(
    params: {
      productName: string;
      brand: string;
      ingredients: string[];
      category: string;
      skinType: string;
      concerns: string;
    },
    options: { preferredProvider?: "gemini" } = {},
  ): Promise<any[]> {
    const { productName, brand, ingredients, category, skinType, concerns } = params;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      throw new Error("AI provider is not configured");
    }

    const promptIngredients = ingredients.slice(0, CONFIG.MAX_PROMPT_INGREDIENTS);
    const isScentFocused = ScentAnalyzer.isScentFocused(category, productName);

    const systemPrompt = `
You are a skincare expert that finds REAL, existing product dupes.
Return VALID JSON ONLY. No markdown. No commentary.

Return ONLY a JSON array of 12 products.

Each product object MUST include:
- "name": string
- "brand": string
- "category": string | null
- "priceEstimate": string | null
- "highlights": string[] (2-4 short bullets)
- "keyIngredients": string[] (5-10)
- "flags": string[] (0-6)
- "whereToBuy": string | null
- "productUrl": string | null
- "sharedIngredients": string[] | null

Rules:
- Brand is REQUIRED. If you are not sure of brand, do not include that product.
- Do NOT return fake products. Only real products.
- Keep strings short.
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

    const errorLog: string[] = [];
    let aiContent: string | null = null;

    const tryGemini = async () => {
      if (!GEMINI_API_KEY || aiContent) return;
      try {
        const prompt = `${systemPrompt}\n\n${userPrompt}`;
        const response = await this.callWithTimeout(
          fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.7 },
              }),
            },
          ),
          CONFIG.AI_TIMEOUT,
        );

        if (response.ok) {
          const data = await response.json();
          aiContent = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
        } else {
          const err = await this.safeReadText(response);
          errorLog.push(`Gemini ${response.status}: ${err}`);
        }
      } catch (e) {
        errorLog.push(`Gemini error: ${(e as Error)?.message || String(e)}`);
      }
    };

    await tryGemini();

    const dupes = this.parseAIArray(aiContent);

    if (!dupes.length && errorLog.length) {
      console.warn("AI failed:", errorLog.join(" | "));
    }

    return Array.isArray(dupes) ? dupes : [];
  }
}

// ============================================================================
// OPEN BEAUTY FACTS
// ============================================================================

class OpenBeautyFacts {
  private static extractIngredients(product: any): string[] | null {
    if (!product) return null;

    if (Array.isArray(product.ingredients) && product.ingredients.length > 0) {
      const list = product.ingredients
        .map((ing: any) => ing?.text)
        .filter((text: string | undefined): text is string => Boolean(text));
      if (list.length) return Utils.normalizeIngredientList(list);
    }

    const text =
      product.ingredients_text_en ||
      product.ingredients_text ||
      product.ingredients_text_fr ||
      product.ingredients_text_es;

    if (typeof text === "string" && text.trim().length > 2) {
      return Utils.normalizeIngredientList(text.split(/[,;]+/));
    }

    return null;
  }

  private static buildSearchTerms(name: string, brandName?: string): string[] {
    const normalized = Utils.normalizeText(name);
    const core = this.coreName(name);

    const tokens = normalized.split(" ").filter((t) => t.length > 2);
    const firstTwo = tokens.slice(0, 2).join(" ");
    const topTokens = tokens.slice(0, 3).join(" ");

    const terms = new Set<string>();

    if (brandName) {
      const b = Utils.normalizeText(brandName);

      // Always lead with brand + full name.
      terms.add(`${b} ${normalized}`.trim());

      // Add a core variant so "daily hydration lotion" maps to "hydration lotion".
      if (core && core !== normalized) terms.add(`${b} ${core}`.trim());

      // Add lighter variants.
      if (topTokens) terms.add(`${b} ${topTokens}`.trim());
      if (firstTwo) terms.add(`${b} ${firstTwo}`.trim());

      // No generic non brand terms when brand exists.
      return Array.from(terms).filter((t) => t.length > 2);
    }

    // No brand. Fall back to generic terms.
    terms.add(normalized);
    if (core && core !== normalized) terms.add(core);
    if (topTokens) terms.add(topTokens);
    if (firstTwo) terms.add(firstTwo);

    return Array.from(terms).filter((t) => t.length > 2);
  }

  private static brandTokens(value: string): string[] {
    return Utils.normalizeText(value)
      .split(" ")
      .filter((t) => t.length > 1);
  }

  private static hasAllBrandTokens(candidate: string, expected: string): boolean {
    const expectedTokens = this.brandTokens(expected);
    const candidateTokens = new Set(this.brandTokens(candidate));
    if (!expectedTokens.length || candidateTokens.size === 0) return false;
    return expectedTokens.every((t) => candidateTokens.has(t));
  }

  private static readonly STOP_WORDS = new Set([
    "daily",
    "everyday",
    "day",
    "night",
    "intense",
    "extra",
    "ultimate",
    "advanced",
    "hydration",
    "hydrating",
    "moisture",
    "moisturizing",
    "moisturiser",
    "moisturizer",
    "lotion",
    "cream",
    "butter",
    "gel",
    "serum",
    "mist",
    "wash",
    "cleanser",
    "body",
    "face",
    "hand",
    "feet",
    "foot",
    "skin",
    "with",
    "and",
    "for",
    "to",
    "of",
    "the",
    "a",
    "an",
    "spf",
    "uv",
    "broad",
    "spectrum",
  ]);

  private static coreName(value: string): string {
    const tokens = Utils.normalizeText(value)
      .split(" ")
      .filter((t) => t.length > 2);

    const kept = tokens.filter((t) => !this.STOP_WORDS.has(t));
    const out = kept.length ? kept : tokens;

    return out.slice(0, 4).join(" ").trim();
  }

  private static isBrandMatchStrict(
    obfBrand: string | null | undefined,
    obfName: string | null | undefined,
    expectedBrand: string,
  ): boolean {
    if (!expectedBrand) return false;
    if (!obfBrand && !obfName) return false;

    if (obfBrand && this.hasAllBrandTokens(obfBrand, expectedBrand)) return true;
    if (obfName && this.hasAllBrandTokens(obfName, expectedBrand)) return true;

    return false;
  }

  private static getCandidateImages(product: any): string[] {
    const out: string[] = [];

    const front = typeof product?.image_front_url === "string" ? product.image_front_url : "";
    const main = typeof product?.image_url === "string" ? product.image_url : "";
    const other = typeof product?.image_small_url === "string" ? product.image_small_url : "";

    for (const u of [front, main, other]) {
      if (u && !Utils.isPlaceholderImage(u) && !out.includes(u)) out.push(u);
    }

    return out;
  }

  private static scoreCandidate(params: { expectedName: string; expectedBrand: string; product: any }): number {
    const { expectedName, expectedBrand, product } = params;

    const obfBrand = typeof product?.brands === "string" ? product.brands : "";
    const obfName = typeof product?.product_name === "string" ? product.product_name : "";

    const images = this.getCandidateImages(product);
    const hasFront =
      typeof product?.image_front_url === "string" &&
      product.image_front_url &&
      !Utils.isPlaceholderImage(product.image_front_url);

    const nameScore = Utils.computeTokenSimilarity(expectedName, obfName);
    const brandScore = Utils.computeTokenSimilarity(expectedBrand, obfBrand);

    let score = 0;

    score += nameScore * 2.0;
    score += brandScore * 1.5;

    if (images.length) score += 1.0;
    if (hasFront) score += 0.5;

    if (typeof product?.ingredients_text === "string" && product.ingredients_text.trim().length > 10) score += 0.2;
    if (Array.isArray(product?.ingredients) && product.ingredients.length > 3) score += 0.2;

    return score;
  }

  private static async fetchCandidates(params: { term: string; timeoutMs: number; pageSize: number }): Promise<any[]> {
    const { term, timeoutMs, pageSize } = params;

    const encoded = encodeURIComponent(term);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encoded}&search_simple=1&action=process&json=1&page_size=${pageSize}`,
        {
          headers: { "User-Agent": "SkinLytix/1.0" },
          signal: controller.signal,
        },
      );

      if (!response.ok) return [];

      const data = await response.json();
      const products = data?.products;
      if (!Array.isArray(products) || products.length === 0) return [];

      return products;
    } catch {
      return [];
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private static pickBestMatch(params: {
    products: any[];
    expectedName: string;
    expectedBrand: string;
    requireImage: boolean;
    strictBrand: boolean;
  }): any | null {
    const { products, expectedName, expectedBrand, requireImage, strictBrand } = params;

    let best: any | null = null;
    let bestScore = -1;

    for (const p of products) {
      const obfBrand = typeof p?.brands === "string" ? p.brands : null;
      const obfName = typeof p?.product_name === "string" ? p.product_name : null;

      if (expectedBrand && strictBrand) {
        if (!this.isBrandMatchStrict(obfBrand, obfName, expectedBrand)) continue;
      }

      const images = this.getCandidateImages(p);
      if (requireImage && images.length === 0) continue;

      const s = this.scoreCandidate({ expectedName, expectedBrand, product: p });
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }

    return best;
  }

  static async lookupFull(name: string, expectedBrand: string): Promise<ObfEnriched | null> {
    const cacheKey = `full:${name}:${expectedBrand}`;

    const cached = CacheManager.getOBF(cacheKey);
    if (cached !== undefined) return cached;

    if (!expectedBrand) {
      CacheManager.setOBF(cacheKey, null);
      return null;
    }

    const searchTerms = this.buildSearchTerms(name, expectedBrand);

    for (const term of searchTerms.slice(0, 4)) {
      const products = await this.fetchCandidates({
        term,
        timeoutMs: CONFIG.OBF_TIMEOUT_FULL,
        pageSize: CONFIG.OBF_PAGE_SIZE_FULL,
      });

      if (!products.length) continue;

      const best = this.pickBestMatch({
        products,
        expectedName: name,
        expectedBrand,
        requireImage: true,
        strictBrand: true,
      });

      if (!best) continue;

      const images = this.getCandidateImages(best);
      const imageUrl = images[0] ?? null;

      const result: ObfEnriched = {
        imageUrl,
        productUrl: typeof best?.url === "string" ? best.url : null,
        ingredients: this.extractIngredients(best),
        brand: typeof best?.brands === "string" ? best.brands : null,
        productName: typeof best?.product_name === "string" ? best.product_name : null,
        images: images.length ? images : undefined,
        price: best?.price ?? null,
        description: best?.description ?? null,
        generic_name: best?.generic_name ?? null,
        categories: best?.categories ?? null,
        barcode: best?.code ?? null,
        packaging: best?.packaging ?? null,
        storeLocation:
          typeof best?.purchase_places === "string" && best.purchase_places.trim()
            ? best.purchase_places.trim()
            : typeof best?.stores === "string" && best.stores.trim()
              ? best.stores.trim()
              : null,
      };

      CacheManager.setOBF(cacheKey, result);
      return result;
    }

    CacheManager.setOBF(cacheKey, null);
    return null;
  }

  static async lookupImageOnly(name: string, expectedBrand: string): Promise<ObfEnriched | null> {
    const cacheKey = `img:${name}:${expectedBrand}`;

    const cached = CacheManager.getOBF(cacheKey);
    if (cached !== undefined) return cached;

    if (!expectedBrand) {
      CacheManager.setOBF(cacheKey, null);
      return null;
    }

    const searchTerms = this.buildSearchTerms(name, expectedBrand);

    for (const term of searchTerms.slice(0, 4)) {
      const products = await this.fetchCandidates({
        term,
        timeoutMs: CONFIG.OBF_TIMEOUT_IMAGE,
        pageSize: CONFIG.OBF_PAGE_SIZE_IMAGE,
      });

      if (!products.length) continue;

      const best = this.pickBestMatch({
        products,
        expectedName: name,
        expectedBrand,
        requireImage: true,
        strictBrand: false,
      });

      if (!best) continue;

      const images = this.getCandidateImages(best);
      const imageUrl = images[0] ?? null;

      const result: ObfEnriched = {
        imageUrl,
        productUrl: typeof best?.url === "string" ? best.url : null,
        ingredients: null,
        brand: typeof best?.brands === "string" ? best.brands : null,
        productName: typeof best?.product_name === "string" ? best.product_name : null,
        images: images.length ? images : undefined,
      };

      CacheManager.setOBF(cacheKey, result);
      return result;
    }

    CacheManager.setOBF(cacheKey, null);
    return null;
  }
}

// ============================================================================
// DUPE PROCESSOR
// ============================================================================

class DupeProcessor {
  static async process(params: {
    dupes: any[];
    sourceIngredients: string[];
    sourceScentTokens: string[];
    productName: string;
    brand: string;
  }): Promise<any[]> {
    const { dupes, sourceIngredients, sourceScentTokens, productName, brand } = params;

    // Score all dupes first
    const scoredDupes = dupes.map((dupe, index) => {
      const name = dupe?.name || dupe?.productName || dupe?.product_name || "";
      const dupeBrand = dupe?.brand || dupe?.brandName || dupe?.brand_name || "";
      const sharedIngredients = Array.isArray(dupe?.sharedIngredients) ? dupe.sharedIngredients : [];

      const ingredientSignal = sharedIngredients.length
        ? (Utils.computeOverlapStats(sourceIngredients, sharedIngredients)?.percent ?? 0)
        : 0;

      const nameScore = Utils.computeTokenSimilarity(productName, name);
      const brandScore = brand ? Utils.computeTokenSimilarity(brand, dupeBrand) : 0;

      const scentText = [
        name,
        dupeBrand,
        ...(dupe?.highlights ?? []),
        ...(dupe?.reasons ?? []),
        ...(sharedIngredients ?? []),
      ].join(" ");
      const scentScore = ScentAnalyzer.computeSimilarity(sourceScentTokens, scentText);

      const preScore = ingredientSignal / 100 + nameScore * 0.8 + brandScore * 0.5 + scentScore * 0.7;

      return { index, preScore, nameScore, brandScore, scentScore };
    });

    // Sort by score and only enrich top N
    const sortedScores = scoredDupes.sort((a, b) => b.preScore - a.preScore);
    const topIndexes = new Set(sortedScores.slice(0, CONFIG.MAX_DUPES_TO_ENRICH).map((x) => x.index));

    // Process dupes with selective enrichment
    const finalDupes = await Promise.all(
      dupes.map(async (dupe, index) => {
        const name = dupe?.name || dupe?.productName || dupe?.product_name;
        const dupeBrand = dupe?.brand || dupe?.brandName || dupe?.brand_name;

        if (!name || typeof name !== "string") return null;

        // Only enrich top-scoring dupes
        const expectedBrand = typeof dupeBrand === "string" ? dupeBrand.trim() : "";

        const obf = topIndexes.has(index)
          ? await OpenBeautyFacts.lookupFull(name, expectedBrand)
          : await OpenBeautyFacts.lookupImageOnly(name, expectedBrand);

        // Determine ingredients priority
        let targetIngredients: string[] | null = null;

        if (obf?.ingredients?.length) {
          targetIngredients = obf.ingredients;
        } else if (Array.isArray(dupe?.sharedIngredients) && dupe.sharedIngredients.length) {
          targetIngredients = Utils.normalizeIngredientList(dupe.sharedIngredients);
        } else if (Array.isArray(dupe?.ingredients) && dupe.ingredients.length) {
          targetIngredients = Utils.normalizeIngredientList(dupe.ingredients);
        } else if (typeof dupe?.ingredients === "string") {
          targetIngredients = Utils.normalizeIngredientList(dupe.ingredients.split(/[,;]+/));
        }

        const overlapStats =
          targetIngredients && sourceIngredients.length
            ? Utils.computeOverlapStats(sourceIngredients, targetIngredients)
            : null;

        // Build images array
        const images: string[] = [];

        if (Array.isArray(obf?.images)) {
          for (const img of obf.images) {
            if (typeof img === "string" && img && !images.includes(img) && !Utils.isPlaceholderImage(img)) {
              images.push(img);
            }
          }
        }

        if (obf?.imageUrl && !Utils.isPlaceholderImage(obf.imageUrl) && !images.includes(obf.imageUrl)) {
          images.push(obf.imageUrl);
        }

        // Extract other fields
        const productUrl: string | null =
          (dupe?.productUrl && typeof dupe.productUrl === "string" ? dupe.productUrl : null) ?? obf?.productUrl ?? null;

        const whereToBuy: string | null =
          (dupe?.whereToBuy && typeof dupe.whereToBuy === "string" ? dupe.whereToBuy : null) ??
          (obf?.productUrl ? "Open Beauty Facts" : null);

        const priceEstimate: string | null =
          (dupe?.priceEstimate && typeof dupe.priceEstimate === "string" ? dupe.priceEstimate : null) ??
          (dupe?.price_range && typeof dupe.price_range === "string" ? dupe.price_range : null) ??
          (dupe?.price && typeof dupe.price === "string" ? dupe.price : null) ??
          (typeof dupe?.price === "number" ? `$${dupe.price}` : null) ??
          (typeof obf?.price === "string" ? obf.price : null) ??
          (typeof obf?.price === "number" ? `$${obf.price}` : null);

        const description: string | null =
          (dupe?.description && typeof dupe.description === "string" ? dupe.description : null) ??
          obf?.description ??
          obf?.generic_name ??
          null;

        const resolvedCategory: string | null =
          (dupe?.category && typeof dupe.category === "string" ? dupe.category : null) ?? obf?.categories ?? null;

        const highlights: string[] = Array.isArray(dupe?.highlights) ? dupe.highlights.filter(Boolean).slice(0, 8) : [];
        const keyIngredients: string[] = Array.isArray(dupe?.keyIngredients)
          ? dupe.keyIngredients.filter(Boolean).slice(0, 15)
          : [];
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
          priceEstimate,
          description,
          category: resolvedCategory,
          storeLocation: obf?.storeLocation ?? dupe?.storeLocation ?? null,
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

    return finalDupes
      .filter(Boolean)
      .sort((a: any, b: any) => (b?._score ?? 0) - (a?._score ?? 0))
      .slice(0, CONFIG.MAX_DUPES_TO_RETURN);
  }
}

// ============================================================================
// UI MAPPER
// ============================================================================

class UIMapper {
  static cleanIngredients(list: any): string[] {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list
      .map((x: string) => (x || "").trim())
      .filter((x: string) => x.length > 2)
      .map((x: string) => x.toLowerCase())
      .filter((x: string) => (!seen.has(x) ? (seen.add(x), true) : false));
  }

  static extractKeyIngredients(list: string[], aiKeys?: string[]): string[] {
    const cleaned = this.cleanIngredients(list);
    const fromAi = Array.isArray(aiKeys) ? aiKeys.map((x) => (x || "").trim()).filter(Boolean) : [];
    const merged = [...fromAi, ...cleaned];
    const seen = new Set<string>();
    const deduped = merged
      .map((x) => x.toLowerCase())
      .filter((x) => x.length > 2)
      .filter((x) => (!seen.has(x) ? (seen.add(x), true) : false));
    return deduped.slice(0, 10);
  }

  static extractFlags(ingredients: string[], aiFlags?: string[]): string[] {
    const fromAi = Array.isArray(aiFlags) ? aiFlags.map((x) => (x || "").trim()).filter(Boolean) : [];
    const autoFlags: string[] = [];
    const lower = ingredients.map((x) => x.toLowerCase());

    if (lower.some((x) => x.includes("fragrance") || x.includes("parfum"))) {
      autoFlags.push("Fragrance");
    }
    if (
      lower.some(
        (x) => x.includes("limonene") || x.includes("linalool") || x.includes("citral") || x.includes("eugenol"),
      )
    ) {
      autoFlags.push("Potential allergens");
    }
    if (lower.some((x) => x.includes("essential oil"))) {
      autoFlags.push("Essential oils");
    }
    if (lower.some((x) => x.includes("alcohol denat"))) {
      autoFlags.push("Drying alcohol");
    }

    const merged = [...fromAi, ...autoFlags];
    const seen = new Set<string>();
    return merged
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => (!seen.has(x.toLowerCase()) ? (seen.add(x.toLowerCase()), true) : false))
      .slice(0, 8);
  }

  static extractHighlights(dupe: any): string[] {
    const fromAi = Array.isArray(dupe?.highlights)
      ? dupe.highlights.map((x: any) => (x || "").trim()).filter(Boolean)
      : [];

    const derived: string[] = [];
    if (typeof dupe?.matchedCount === "number" && typeof dupe?.sourceCount === "number") {
      derived.push("Solid ingredient overlap");
    }

    if (Array.isArray(dupe?.ingredientList)) {
      const ing = dupe.ingredientList.map((x: string) => x.toLowerCase());
      if (ing.some((x: string) => x.includes("ceramide") || x.includes("cholesterol"))) {
        derived.push("Barrier support");
      }
      if (ing.some((x: string) => x.includes("fragrance") || x.includes("parfum"))) {
        derived.push("Contains fragrance");
      }
    }

    const merged = [...fromAi, ...derived];
    const seen = new Set<string>();
    return merged
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => (!seen.has(x.toLowerCase()) ? (seen.add(x.toLowerCase()), true) : false))
      .slice(0, 6);
  }

  static extractPriceEstimate(dupe: any): string | null {
    const v =
      (typeof dupe?.priceEstimate === "string" && dupe.priceEstimate.trim() ? dupe.priceEstimate.trim() : null) ??
      (typeof dupe?.price_range === "string" && dupe.price_range.trim() ? dupe.price_range.trim() : null) ??
      (typeof dupe?.price === "string" && dupe.price.trim() ? dupe.price.trim() : null) ??
      (typeof dupe?.price === "number" ? `$${dupe.price}` : null) ??
      (typeof dupe?.obf?.price === "string" && dupe.obf.price.trim() ? dupe.obf.price.trim() : null) ??
      (typeof dupe?.obf?.price === "number" ? `$${dupe.obf.price}` : null);

    if (!v) return null;
    if (/^\d+(\.\d+)?$/.test(v)) return `$${v}`;
    return v;
  }

  static pickImage(dupe: any): string | null {
    if (Array.isArray(dupe.images) && dupe.images.length > 0 && dupe.images[0]) {
      return dupe.images[0];
    }
    if (dupe.imageUrl) return dupe.imageUrl;
    if (dupe.obf && dupe.obf.imageUrl) return dupe.obf.imageUrl;
    return null;
  }

  static mapToUI(dupes: any[]): any[] {
    return dupes.map((dupe: any) => {
      const name = dupe?.name || "";
      const brandName = dupe?.brand || "";
      const id = Utils.stableHash(`${name}::${brandName}`);

      const ingredientsList = this.cleanIngredients(dupe?.ingredientList || []);
      const keyIngredients = this.extractKeyIngredients(ingredientsList, dupe?.keyIngredients);
      const flags = this.extractFlags(ingredientsList, dupe?.flags);
      const highlights = this.extractHighlights(dupe);
      const priceEstimate = this.extractPriceEstimate(dupe);

      const productUrl = typeof dupe?.productUrl === "string" && dupe.productUrl.trim() ? dupe.productUrl.trim() : null;
      const internalLink = `/dupes/${id}`;

      return {
        id,
        internalLink,
        name,
        brand: brandName || null,
        imageUrl: this.pickImage(dupe),
        images: Array.isArray(dupe?.images) ? dupe.images : [],
        matchPercent: typeof dupe?.matchPercent === "number" ? dupe.matchPercent : null,
        priceEstimate,
        category: dupe?.category || null,
        highlights,
        keyIngredients,
        flags,
        ingredientsCount: ingredientsList.length,
        description: dupe?.description || null,
        whereToBuy: dupe?.whereToBuy || null,
        storeLocation: dupe?.storeLocation || null,
        productUrl,
        ingredientList: ingredientsList,
        meta: {
          barcode: dupe?.obf?.barcode ?? null,
          packaging: dupe?.obf?.packaging ?? null,
          categoriesRaw: dupe?.obf?.categories ?? null,
        },
      };
    });
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    // Validate required fields (allow partial OCR output)
    const rawProductName = typeof body?.productName === "string" ? body.productName.trim() : "";
    const rawBrand = typeof body?.brand === "string" ? body.brand.trim() : "";
    const rawCategory = typeof body?.category === "string" ? body.category.trim() : "";
    const rawSkinType = typeof body?.skinType === "string" ? body.skinType.trim() : "";
    const rawConcerns = Array.isArray(body?.concerns)
      ? body.concerns
          .map((x: any) => String(x ?? "").trim())
          .filter(Boolean)
          .join(", ")
      : typeof body?.concerns === "string"
        ? body.concerns.trim()
        : "";
    const rawIngredients = Array.isArray(body?.ingredients) ? body.ingredients : [];
    const sourceProductId = typeof body?.sourceProductId === "string" ? body.sourceProductId.trim() : "";
    const scanKey = typeof body?.scanKey === "string" ? body.scanKey.trim() : "";

    const cleanedProductName = Utils.sanitizePromptText(rawProductName);
    const cleanedBrand = Utils.sanitizePromptText(rawBrand);
    const cleanedCategory = Utils.sanitizePromptText(rawCategory);
    const cleanedSkinType = Utils.sanitizePromptText(rawSkinType);
    const cleanedConcerns = Utils.sanitizePromptText(rawConcerns);
    const cleanedIngredients = rawIngredients
      .map((ing: any) => Utils.sanitizePromptText(String(ing ?? "")))
      .filter(Boolean);

    const hasAnyInput = Boolean(cleanedProductName || cleanedBrand || cleanedIngredients.length || cleanedCategory);

    if (!hasAnyInput) {
      return new Response(JSON.stringify({ dupes: [], error: "productName or ingredients are required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const productNameForAI = cleanedProductName || cleanedBrand || cleanedIngredients[0] || "Unknown product";
    const productNameForResponse = rawProductName || productNameForAI;

    // Create request fingerprint for deduplication
    const requestFingerprint = Utils.createRequestFingerprint({
      sourceProductId,
      scanKey,
      productName: productNameForAI,
      brand: cleanedBrand,
      category: cleanedCategory,
      ingredients: cleanedIngredients,
    });

    // Check if there's a pending request with the same fingerprint
    const pendingRequest = CacheManager.getPendingRequest(requestFingerprint);
    if (pendingRequest) {
      console.log("Returning pending request for:", productNameForResponse);
      return pendingRequest;
    }

    // Create cache key
    const normIngs = Utils.normalizeIngredientList(cleanedIngredients);
    const ingredientsHash = Utils.stableHash(normIngs.sort().join("|"));

    const aiCacheKey = JSON.stringify({
      sourceProductId,
      scanKey,
      productName: productNameForAI,
      brand: cleanedBrand,
      category: cleanedCategory,
      skinType: cleanedSkinType,
      concerns: cleanedConcerns,
      ingredientsHash,
    });

    // Check AI cache
    const cachedDupes = CacheManager.getAI(aiCacheKey);
    if (cachedDupes && cachedDupes.length > 0) {
      console.log("Returning cached dupes for:", productNameForResponse);

      const sourceIngredients = Utils.normalizeIngredientList(cleanedIngredients);
      const sourceScentTokens = ScentAnalyzer.extractTokens(`${productNameForAI} ${cleanedIngredients.join(" ")}`);

      const processedDupes = await DupeProcessor.process({
        dupes: cachedDupes,
        sourceIngredients,
        sourceScentTokens,
        productName: productNameForAI,
        brand: cleanedBrand,
      });

      let uiDupes = UIMapper.mapToUI(processedDupes);
      const hasAnyImages = uiDupes.some(
        (dupe) => (Array.isArray(dupe.images) && dupe.images.length > 0) || dupe.imageUrl,
      );

      if (!hasAnyImages) {
        console.warn("Cached dupes missing images. Returning without image enrichment.");
      }

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
          name: productNameForResponse,
          brand: rawBrand || cleanedBrand || null,
          category: rawCategory || cleanedCategory || null,
        },
        summary: {
          bestMatchId,
          bestValueId,
        },
        dupes: uiDupes,
      };

      return new Response(JSON.stringify(response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create the actual processing promise
    const processingPromise = (async () => {
      try {
        // Get AI dupes
        const rawDupes = await AIProvider.getDupes({
          productName: productNameForAI,
          brand: cleanedBrand,
          ingredients: cleanedIngredients,
          category: cleanedCategory,
          skinType: cleanedSkinType,
          concerns: cleanedConcerns,
        });

        // Cache the raw AI response
        CacheManager.setAI(aiCacheKey, rawDupes);

        // Process dupes
        const sourceIngredients = Utils.normalizeIngredientList(cleanedIngredients);
        const sourceScentTokens = ScentAnalyzer.extractTokens(`${productNameForAI} ${cleanedIngredients.join(" ")}`);

        const processedDupes = await DupeProcessor.process({
          dupes: rawDupes,
          sourceIngredients,
          sourceScentTokens,
          productName: productNameForAI,
          brand: cleanedBrand,
        });

        let uiDupes = UIMapper.mapToUI(processedDupes);
        const hasAnyImages = uiDupes.some(
          (dupe) => (Array.isArray(dupe.images) && dupe.images.length > 0) || dupe.imageUrl,
        );

        if (!hasAnyImages) {
          console.warn("No dupe images found from primary provider. Returning without image enrichment.");
        }

        // Calculate summary
        let bestMatchId: string | null = null;
        let bestValueId: string | null = null;

        if (uiDupes.length) {
          const bestMatch = uiDupes.reduce(
            (a, b) => ((b.matchPercent || 0) > (a.matchPercent || 0) ? b : a),
            uiDupes[0],
          );
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
            name: productNameForResponse,
            brand: rawBrand || cleanedBrand || null,
            category: rawCategory || cleanedCategory || null,
          },
          summary: {
            bestMatchId,
            bestValueId,
          },
          dupes: uiDupes,
        };

        return new Response(JSON.stringify(response), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } finally {
        // Remove from pending requests
        CacheManager.removePendingRequest(requestFingerprint);
      }
    })();

    // Store the pending request
    CacheManager.setPendingRequest(requestFingerprint, processingPromise);

    return processingPromise;
  } catch (error) {
    console.error("Error in find-dupes:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ dupes: [], error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
