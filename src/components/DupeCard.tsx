// DupeCard.jsx
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heart, ChevronDown, ChevronUp, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import noImageFound from "@/assets/no_image_found.png";

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const toTitle = (v) =>
  String(v || "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const toUrl = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") {
    const u = v.url || v.imageUrl || v.image_url || v.src || v.href;
    return typeof u === "string" ? (u.trim() || null) : null;
  }
  return null;
};

const scoreRetailer = (url) => {
  const u = String(url || "").toLowerCase();
  if (u.includes("sephora")) return 90;
  if (u.includes("ulta")) return 85;
  if (u.includes("target")) return 80;
  if (u.includes("walmart")) return 78;
  if (u.includes("amazon")) return 70;
  return 50;
};

const slugify = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const scoreBrandNameInUrl = (url, brand, name) => {
  const u = String(url || "").toLowerCase();
  const b = slugify(brand);
  const n = slugify(name);

  let score = 0;

  if (b) {
    const btoks = b.split(" ").filter(Boolean).slice(0, 2);
    if (btoks.some((t) => u.includes(t))) score += 20;
  }

  if (n) {
    const ntoks = n.split(" ").filter(Boolean).slice(0, 3);
    const hit = ntoks.filter((t) => u.includes(t)).length;
    score += Math.min(15, hit * 5);
  }

  return score;
};

const buildImageCandidates = (dupe) => {
  const brand = deriveBrand(dupe);
  const name = deriveName(dupe);

  const candidates = uniq([
    toUrl(dupe?.imageUrl),
    toUrl(dupe?.image_url),
    ...(Array.isArray(dupe?.imageUrls) ? dupe.imageUrls.map(toUrl) : []),
    ...(Array.isArray(dupe?.images) ? dupe.images.map(toUrl) : []),

    toUrl(dupe?.obf?.imageUrl),
    ...(Array.isArray(dupe?.obf?.imageUrls) ? dupe.obf.imageUrls.map(toUrl) : []),
    ...(Array.isArray(dupe?.obf?.images) ? dupe.obf.images.map(toUrl) : []),
  ]).filter(Boolean);

  return candidates
    .map((u) => ({
      u,
      s: scoreRetailer(u) + scoreBrandNameInUrl(u, brand, name),
    }))
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u);
};

const detectFlagsFromIngredients = (ingredients) => {
  const joined = (ingredients || []).join(" ").toLowerCase();
  const flags = [];

  if (joined.includes("fragrance") || joined.includes("parfum")) flags.push("Fragrance");
  if (joined.includes("limonene")) flags.push("Potential allergens");
  if (joined.includes("linalool")) flags.push("Potential allergens");
  if (joined.includes("citral")) flags.push("Potential allergens");
  if (joined.includes("eugenol")) flags.push("Potential allergens");
  if (joined.includes("benzyl alcohol")) flags.push("Potential allergens");

  return uniq(flags);
};

const deriveHighlights = (dupe) => {
  const list = Array.isArray(dupe?.highlights) ? dupe.highlights : [];
  if (list.length) return list;

  const fallback = [];
  const mp = dupe?.matchPercent;

  if (typeof mp === "number") {
    if (mp >= 60) fallback.push("High ingredient overlap");
    else if (mp >= 40) fallback.push("Medium ingredient overlap");
    else fallback.push("Low ingredient overlap");
  }

  const ingredients = Array.isArray(dupe?.ingredientList)
    ? dupe.ingredientList
    : Array.isArray(dupe?.obf?.ingredients)
      ? dupe.obf.ingredients
      : [];

  const joined = ingredients.join(" ").toLowerCase();
  if (joined.includes("glycerin") || joined.includes("ceramide") || joined.includes("hyaluron")) {
    fallback.push("Barrier support");
  }

  const flags = detectFlagsFromIngredients(ingredients);
  if (flags.includes("Fragrance")) fallback.push("Contains fragrance");

  return fallback.length ? fallback : ["Good routine fit"];
};

const deriveKeyIngredients = (dupe) => {
  const list = Array.isArray(dupe?.keyIngredients) ? dupe.keyIngredients : [];
  if (list.length) return uniq(list);

  const ingredientList = Array.isArray(dupe?.ingredientList)
    ? dupe.ingredientList
    : Array.isArray(dupe?.obf?.ingredients)
      ? dupe.obf.ingredients
      : [];

  const cleaned = (ingredientList || []).map((v) => String(v || "").trim()).filter(Boolean);
  return uniq(cleaned).slice(0, 8);
};

const deriveIngredientList = (dupe) => {
  const list = Array.isArray(dupe?.ingredientList)
    ? dupe.ingredientList
    : Array.isArray(dupe?.obf?.ingredients)
      ? dupe.obf.ingredients
      : [];

  return (list || []).map((v) => String(v || "").trim()).filter(Boolean);
};

const POSITIVE_FLAG_PATTERNS = [
  /fragrance\s*-?\s*free/i,
  /non\s*-?\s*comedogenic/i,
  /noncomedogenic/i,
  /hypoallergenic/i,
  /dermatologist\s*tested/i,
  /oil\s*-?\s*free/i,
  /paraben\s*-?\s*free/i,
  /sulfate\s*-?\s*free/i,
  /silicone\s*-?\s*free/i,
  /phthalate\s*-?\s*free/i,
  /mineral\s*oil\s*-?\s*free/i,
  /dye\s*-?\s*free/i,
  /soap\s*-?\s*free/i,
  /cruelty\s*-?\s*free/i,
  /vegan/i,
  /gluten\s*-?\s*free/i,
  /no\s*fragrance/i,
  /without\s*fragrance/i,
];

const PRICE_FLAG_PATTERNS = [
  /\bexpensive\b/i,
  /\baffordable\b/i,
];

const splitFlags = (rawFlags) => {
  const watchOuts = [];
  const claims = [];

  for (const flag of rawFlags || []) {
    const text = String(flag || "").trim();
    if (!text) continue;
    const lower = text.toLowerCase();

    if (PRICE_FLAG_PATTERNS.some((p) => p.test(lower))) {
      continue;
    }

    if (POSITIVE_FLAG_PATTERNS.some((p) => p.test(lower)) || /\bfree\b/.test(lower)) {
      claims.push(text);
      continue;
    }

    watchOuts.push(text);
  }

  return {
    watchOuts: uniq(watchOuts),
    claims: uniq(claims),
  };
};

const formatScore = (v) => {
  if (v === null || v === undefined) return "N/A";
  const num = Number(v);
  if (Number.isNaN(num)) return "N/A";
  return num.toFixed(2);
};

const deriveBrand = (dupe) => {
  return (
    dupe?.obf?.brand ||
    dupe?.brand ||
    dupe?.brandName ||
    dupe?.brand_name ||
    dupe?.obf?.brandName ||
    dupe?.obf?.brand_name ||
    "Unknown brand"
  );
};

const deriveName = (dupe) => {
  return (
    dupe?.name ||
    dupe?.productName ||
    dupe?.product_name ||
    dupe?.obf?.productName ||
    dupe?.obf?.product_name ||
    "Unknown product"
  );
};

export const DupeCard = ({
  dupe,
  isSaved = false,
  onToggleSave,
  defaultExpanded = false,
  badges = {},
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);

  const brand = deriveBrand(dupe);
  const name = deriveName(dupe);

  const imageCandidates = useMemo(() => buildImageCandidates(dupe), [dupe]);

  useEffect(() => {
    setImgIdx(0);
    setImageLoaded(false);
  }, [dupe]);

  const displayImageRaw = imageCandidates[imgIdx] || null;
  const displayImage = displayImageRaw || noImageFound;
  const showSkeleton = !imageLoaded && Boolean(displayImageRaw);

  const priceText = dupe?.priceEstimate || dupe?.price || "Price unavailable";
  const categoryText = dupe?.category || dupe?.obf?.categories || "Moisturizer";

  const matchLabel =
    dupe?.matchPercent === null || dupe?.matchPercent === undefined
      ? "Ingredient match N/A"
      : `Ingredient match ${dupe.matchPercent}%`;

  const ingredientList = useMemo(() => deriveIngredientList(dupe), [dupe]);
  const highlights = useMemo(() => deriveHighlights(dupe), [dupe]);
  const keyIngredients = useMemo(() => deriveKeyIngredients(dupe), [dupe]);

  const flags = useMemo(() => {
    const explicit = Array.isArray(dupe?.flags) ? dupe.flags.filter(Boolean) : [];
    if (explicit.length) return uniq(explicit);
    return detectFlagsFromIngredients(ingredientList);
  }, [dupe, ingredientList]);
  const { watchOuts, claims } = useMemo(() => splitFlags(flags), [flags]);

  const ingredientsCount =
    typeof dupe?.ingredientsCount === "number"
      ? dupe.ingredientsCount
      : ingredientList.length
        ? ingredientList.length
        : null;

  const ingredientCountText = typeof ingredientsCount === "number" ? `${ingredientsCount} ingredients` : null;

  const showBestMatch = Boolean(badges?.bestMatch);
  const showBestValue = Boolean(badges?.bestValue);

  const expandedDetails = useMemo(() => {
    const matchedCount = dupe?.matchedCount ?? dupe?.matchMeta?.matchedCount ?? null;
    const sourceCount = dupe?.sourceCount ?? dupe?.matchMeta?.sourceCount ?? null;

    const rows = [
      { label: "Description", value: dupe?.description || dupe?.obf?.generic_name || null },
      { label: "Store", value: dupe?.storeLocation || dupe?.obf?.storeLocation || null },
      { label: "Where to buy", value: dupe?.whereToBuy || dupe?.obf?.whereToBuy || null },
      {
        label: "Ingredient match",
        value: matchedCount && sourceCount ? `${matchedCount} of ${sourceCount}` : null,
      },
      { label: "Match score", value: dupe?.matchScore ?? null },
      { label: "Name score", value: dupe?.nameScore ?? null },
      { label: "Brand score", value: dupe?.brandScore ?? null },
      { label: "Scent score", value: dupe?.scentScore ?? null },
      { label: "Composite score", value: dupe?.compositeScore ?? null },
    ];

    const clean = (v) => {
      if (v === null || v === undefined) return null;
      const s = String(v).trim();
      if (!s) return null;
      if (s.toLowerCase() === "not provided") return null;
      if (s.toLowerCase() === "n/a") return null;
      return s;
    };

    const filtered = rows
      .map((r) => ({ ...r, value: clean(r.value) }))
      .filter((r) => r.value);

    return filtered.length ? filtered : [{ label: "Details", value: "Limited data returned for this item" }];
  }, [dupe]);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden bg-card border-border transition-all hover:shadow-lg hover:-translate-y-0.5",
        showBestMatch && "ring-1 ring-primary/40",
        showBestValue && "ring-1 ring-emerald-500/30"
      )}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.();
        }}
        className="absolute top-2 right-2 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm"
        aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
      >
        <Heart
          className={cn(
            "w-4 h-4",
            isSaved ? "fill-rose-500 text-rose-500" : "text-muted-foreground hover:text-rose-500"
          )}
        />
      </button>

      <div className="absolute top-2 left-2 z-10 flex gap-1">
        <Badge className="bg-primary/90 text-primary-foreground text-[10px]">{matchLabel}</Badge>
        {showBestMatch && <Badge className="bg-primary text-primary-foreground text-[10px]">Best match</Badge>}
        {showBestValue && <Badge className="bg-emerald-600 text-white text-[10px]">Best value</Badge>}
      </div>

      <div className="aspect-square bg-muted/30 relative">
        {showSkeleton && <div className="absolute inset-0 animate-pulse bg-muted" />}

        <img
          src={displayImage}
          alt={`${brand} ${name}`}
          className={cn(
            "w-full h-full transition-all",
            displayImage === noImageFound ? "object-contain p-6" : "object-cover",
            imageLoaded || !displayImageRaw ? "opacity-100" : "opacity-0"
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            // silently try next candidate
            if (imgIdx < imageCandidates.length - 1) {
              setImgIdx((v) => v + 1);
              return;
            }

            // fall back
            setImgIdx(imageCandidates.length);
            setImageLoaded(true);
          }}
        />
      </div>

      <div className="p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{brand}</p>

        <h3 className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{name}</h3>

        <div className="flex justify-between items-end gap-2">
          <p className="text-base font-bold text-primary truncate">{String(priceText)}</p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            aria-expanded={expanded}
          >
            {expanded ? "Less" : "More"}
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
 
        <p className="text-[10px] text-muted-foreground">{String(categoryText)}</p>

        <div>
          <p className="text-[10px] uppercase font-medium text-muted-foreground">Why it fits</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {highlights.slice(0, 3).map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>

        {expanded && (
          <div className="space-y-3 pt-1">
            <div className="rounded-md border border-border bg-muted/10 p-2 space-y-1">
              <div className="flex items-center gap-1.5 mb-1">
                <Info className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase font-medium text-muted-foreground">Details</p>
              </div>

              <div className="space-y-1">
                {expandedDetails.map((row, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3">
                    <p className="text-[10px] text-muted-foreground shrink-0">{row.label}</p>
                    <p className="text-[11px] text-foreground text-right break-words">{String(row.value)}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] uppercase font-medium text-muted-foreground">Key ingredients</p>
              {keyIngredients.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {keyIngredients.map((k, i) => (
                    <span
                      key={i}
                      className="bg-muted px-1.5 py-0.5 rounded text-[10px] max-w-full truncate"
                      title={k}
                    >
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not provided</p>
              )}
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-yellow-600" />
                <p className="text-[10px] uppercase font-medium text-muted-foreground">Potential sensitivities</p>
              </div>

              {watchOuts.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {watchOuts.map((f, i) => (
                    <span
                      key={i}
                      className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    >
                      {toTitle(f)}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None detected</p>
              )}
            </div>

            {claims.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[10px] uppercase font-medium text-muted-foreground">Claims</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {claims.map((f, i) => (
                    <span
                      key={i}
                      className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-semibold"
                    >
                      {toTitle(f)}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {ingredientCountText && <p className="text-[10px] text-muted-foreground">{ingredientCountText}</p>}

            <div>
              <p className="text-[10px] uppercase font-medium text-muted-foreground">Full ingredient list</p>

              {ingredientList.length > 0 ? (
                <div className="max-h-40 overflow-auto rounded-md border border-border bg-background p-2">
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {ingredientList.map((ing, i) => (
                      <li key={i} className="leading-4">
                        {ing}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not provided</p>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
