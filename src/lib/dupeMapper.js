// src/lib/dupeMapper.js

const normaliseText = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const stableId = (name, brand) => {
  const s = normaliseText(`${brand || ""}|${name || ""}`);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `dupe_${(h >>> 0).toString(16)}`;
};

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const pickImageUrl = (raw) => {
  const obfImage = raw?.obf?.imageUrl;
  const directImage = raw?.imageUrl;
  const images0 = Array.isArray(raw?.images) ? raw.images[0] : null;

  const best = obfImage || directImage || images0 || null;
  return best && String(best).includes("images.unsplash.com") ? null : best;
};

const extractIngredients = (raw) => {
  const list =
    (Array.isArray(raw?.obf?.ingredients) && raw.obf.ingredients.length && raw.obf.ingredients) ||
    (Array.isArray(raw?.ingredientList) && raw.ingredientList.length && raw.ingredientList) ||
    [];

  return uniq(list.map((x) => String(x).trim()).filter((x) => x.length > 1));
};

const detectFlags = (ingredients) => {
  const t = ingredients.map(normaliseText).join(" ");
  const flags = [];

  const has = (s) => t.includes(s);

  if (has("fragrance") || has("parfum")) flags.push("fragrance");
  if (has("essential oil") || has("melaleuca") || has("lavandula") || has("citrus") || has("lemon") || has("limonene") || has("linalool") || has("citral"))
    flags.push("essential_oils");

  if (has("alcohol denat") || has("denatured alcohol")) flags.push("alcohol_denat");

  if (has("glycolic acid") || has("lactic acid") || has("salicylic") || has("aha") || has("bha")) flags.push("acids");

  if (has("retinol") || has("tretinoin") || has("adapalene") || has("retinal")) flags.push("retinoids");

  if (has("benzoyl peroxide")) flags.push("benzoyl_peroxide");

  return uniq(flags);
};

const pickKeyIngredients = (ingredients) => {
  const t = ingredients.map(normaliseText);

  const keywords = [
    "glycerin",
    "hyaluronic",
    "niacinamide",
    "panthenol",
    "ceramide",
    "cholesterol",
    "squalane",
    "dimethicone",
    "petrolatum",
    "she",
    "butyrospermum",
    "cocoa",
    "theobroma cacao",
    "aloe",
    "tocopherol",
    "beeswax",
    "lanolin",
    "sunflower",
    "helianthus",
    "jojoba",
    "argan",
    "avocado",
    "grape",
  ];

  const picks = [];
  for (let i = 0; i < t.length; i++) {
    const raw = ingredients[i];
    const n = t[i];
    if (keywords.some((k) => n.includes(k))) picks.push(raw);
  }

  // fallback if we found nothing
  const fallback = ingredients.slice(0, 6);
  return uniq((picks.length ? picks : fallback).slice(0, 8));
};

const buildHighlights = (raw, ui) => {
  const highlights = [];

  if (typeof ui.matchPercent === "number") {
    if (ui.matchPercent >= 65) highlights.push("High ingredient overlap");
    else if (ui.matchPercent >= 45) highlights.push("Solid ingredient overlap");
    else highlights.push("Low overlap, check details");
  }

  if (ui.keyIngredients.some((x) => normaliseText(x).includes("glycerin"))) highlights.push("Hydration support");
  if (ui.keyIngredients.some((x) => normaliseText(x).includes("shea") || normaliseText(x).includes("butyrospermum"))) highlights.push("Barrier moisturizers");

  if (ui.flags.includes("fragrance")) highlights.push("Contains fragrance");
  if (ui.flags.includes("essential_oils")) highlights.push("Contains essential oils");

  // keep it tight
  return uniq(highlights).slice(0, 4);
};

const parsePriceEstimate = (raw) => {
  // Preferred: AI returns priceEstimate on the dupe object
  if (raw?.priceEstimate && typeof raw.priceEstimate === "string") return raw.priceEstimate.trim();

  // If AI returns priceEstimate under another key, support it here
  if (raw?.price_estimate && typeof raw.price_estimate === "string") return raw.price_estimate.trim();

  // Some models return "price" as a string range. Your payload has price: null today.
  if (typeof raw?.price === "string" && raw.price.trim()) return raw.price.trim();

  return null;
};

export const toUIDupe = (raw) => {
  const name = raw?.name || raw?.productName || raw?.product_name || "Unknown product";
  const brand = raw?.brand || raw?.obf?.brand || "Unknown brand";

  const ingredients = extractIngredients(raw);
  const flags = detectFlags(ingredients);
  const keyIngredients = pickKeyIngredients(ingredients);

  const matchPercent =
    typeof raw?.matchPercent === "number"
      ? raw.matchPercent
      : typeof raw?.match_percent === "number"
      ? raw.match_percent
      : null;

  const ui = {
    id: stableId(name, brand),
    name,
    brand,
    imageUrl: pickImageUrl(raw),
    matchPercent,
    priceEstimate: parsePriceEstimate(raw),
    highlights: [],
    flags,
    keyIngredients,
    ingredientsCount: ingredients.length,
    category: raw?.category || raw?.obf?.categories || null,
    storeLocation: raw?.storeLocation || raw?.obf?.storeLocation || null,

    // keep for internal ranking or detail view if you want
    _raw: raw,
  };

  ui.highlights = buildHighlights(raw, ui);

  return ui;
};

export const pickBestIds = (uiDupes) => {
  const list = Array.isArray(uiDupes) ? uiDupes : [];
  if (!list.length) return { bestMatchId: null, bestValueId: null };

  // best match: highest matchPercent then fallback to compositeScore if present
  const bestMatch = [...list].sort((a, b) => {
    const ap = typeof a.matchPercent === "number" ? a.matchPercent : -1;
    const bp = typeof b.matchPercent === "number" ? b.matchPercent : -1;
    if (bp !== ap) return bp - ap;

    const as = typeof a?._raw?.compositeScore === "number" ? a._raw.compositeScore : 0;
    const bs = typeof b?._raw?.compositeScore === "number" ? b._raw.compositeScore : 0;
    return bs - as;
  })[0];

  // best value: if priceEstimate exists, prefer items with a numeric lower bound
  const parseLow = (s) => {
    if (!s) return null;
    const m = String(s).match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
    return m ? Number(m[1]) : null;
  };

  const bestValue = [...list].sort((a, b) => {
    const aLow = parseLow(a.priceEstimate);
    const bLow = parseLow(b.priceEstimate);

    // if both have price, lower is better
    if (typeof aLow === "number" && typeof bLow === "number") {
      if (aLow !== bLow) return aLow - bLow;
    }

    // if only one has price, it wins
    if (typeof aLow === "number" && typeof bLow !== "number") return -1;
    if (typeof aLow !== "number" && typeof bLow === "number") return 1;

    // fallback: higher matchPercent
    const ap = typeof a.matchPercent === "number" ? a.matchPercent : -1;
    const bp = typeof b.matchPercent === "number" ? b.matchPercent : -1;
    return bp - ap;
  })[0];

  return { bestMatchId: bestMatch?.id || null, bestValueId: bestValue?.id || null };
};