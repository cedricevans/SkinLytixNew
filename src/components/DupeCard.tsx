import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heart, ChevronDown, ChevronUp, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import noImageFound from "@/assets/no_image_found.png";

type DupeBadges = {
  bestMatch?: boolean;
  bestValue?: boolean;
};

type DupeCardProps = {
  dupe: any;
  isSaved?: boolean;
  onToggleSave?: () => void;
  defaultExpanded?: boolean;
  badges?: DupeBadges;
};

const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

const toTitle = (v: string) =>
  v
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const pickFirstImage = (dupe: any) => {
  if (dupe?.imageUrl) return dupe.imageUrl;
  if (Array.isArray(dupe?.images) && dupe.images[0]) return dupe.images[0];
  if (dupe?.obf?.imageUrl) return dupe.obf.imageUrl;
  if (Array.isArray(dupe?.obf?.images) && dupe.obf.images[0]) return dupe.obf.images[0];
  return null;
};

const detectFlagsFromIngredients = (ingredients: string[]) => {
  const joined = ingredients.join(" ").toLowerCase();

  const flags: string[] = [];

  if (joined.includes("fragrance") || joined.includes("parfum")) flags.push("Fragrance");
  if (joined.includes("limonene")) flags.push("Potential allergens");
  if (joined.includes("linalool")) flags.push("Potential allergens");
  if (joined.includes("citral")) flags.push("Potential allergens");
  if (joined.includes("eugenol")) flags.push("Potential allergens");
  if (joined.includes("benzyl alcohol")) flags.push("Potential allergens");

  return uniq(flags);
};

const deriveHighlights = (dupe: any) => {
  const list = Array.isArray(dupe?.highlights) ? dupe.highlights : [];
  if (list.length) return list;

  const fallback: string[] = [];
  const mp = dupe?.matchPercent;

  if (typeof mp === "number") {
    if (mp >= 60) fallback.push("Solid ingredient overlap");
    else if (mp >= 40) fallback.push("Moderate ingredient overlap");
    else fallback.push("Low ingredient overlap");
  }

  const ingredients = Array.isArray(dupe?.ingredientList)
    ? dupe.ingredientList
    : Array.isArray(dupe?.obf?.ingredients)
      ? dupe.obf.ingredients
      : [];

  const joined = ingredients.join(" ").toLowerCase();
  if (joined.includes("glycerin") || joined.includes("ceramide") || joined.includes("hyaluron"))
    fallback.push("Barrier support");

  const flags = detectFlagsFromIngredients(ingredients);
  if (flags.includes("Fragrance")) fallback.push("Contains fragrance");

  return fallback.length ? fallback : ["Good routine fit"];
};

const deriveKeyIngredients = (dupe: any) => {
  const list = Array.isArray(dupe?.keyIngredients) ? dupe.keyIngredients : [];
  if (list.length) return uniq(list);

  const ingredientList = Array.isArray(dupe?.ingredientList)
    ? dupe.ingredientList
    : Array.isArray(dupe?.obf?.ingredients)
      ? dupe.obf.ingredients
      : [];

  const cleaned = ingredientList
    .map((v: any) => String(v || "").trim())
    .filter(Boolean);

  // Pick a useful slice. You can tune this later.
  return uniq(cleaned).slice(0, 8);
};

const deriveIngredientList = (dupe: any) => {
  const list = Array.isArray(dupe?.ingredientList)
    ? dupe.ingredientList
    : Array.isArray(dupe?.obf?.ingredients)
      ? dupe.obf.ingredients
      : [];

  return list.map((v: any) => String(v || "").trim()).filter(Boolean);
};

const formatScore = (v: any) => {
  if (v === null || v === undefined) return "N/A";
  const num = Number(v);
  if (Number.isNaN(num)) return "N/A";
  return num.toFixed(2);
};

export const DupeCard = ({
  dupe,
  isSaved = false,
  onToggleSave,
  defaultExpanded = false,
  badges = {},
}: DupeCardProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const displayImageRaw = pickFirstImage(dupe);
  const displayImage = !imageError && displayImageRaw ? displayImageRaw : noImageFound;

  const brand = dupe?.brand || dupe?.obf?.brand || "Unknown brand";
  const name = dupe?.name || dupe?.productName || dupe?.obf?.productName || "Unknown product";

  const priceText = dupe?.priceEstimate || dupe?.price || "Price unavailable";
  const categoryText = dupe?.category || dupe?.obf?.categories || "Moisturizer";

  const matchLabel =
    dupe?.matchPercent === null || dupe?.matchPercent === undefined
      ? "Match N/A"
      : `${dupe.matchPercent}% match`;

  const ingredientList = useMemo(() => deriveIngredientList(dupe), [dupe]);
  const highlights = useMemo(() => deriveHighlights(dupe), [dupe]);
  const keyIngredients = useMemo(() => deriveKeyIngredients(dupe), [dupe]);
  const flags = useMemo(() => {
    const explicit = Array.isArray(dupe?.flags) ? dupe.flags.filter(Boolean) : [];
    if (explicit.length) return uniq(explicit);
    return detectFlagsFromIngredients(ingredientList);
  }, [dupe, ingredientList]);

  const ingredientsCount =
    typeof dupe?.ingredientsCount === "number"
      ? dupe.ingredientsCount
      : ingredientList.length
        ? ingredientList.length
        : null;

  const ingredientCountText = typeof ingredientsCount === "number" ? `${ingredientsCount} ingredients` : null;

  const showBestMatch = Boolean(badges?.bestMatch);
  const showBestValue = Boolean(badges?.bestValue);

  // Everything under "More"
  const expandedDetails = useMemo(() => {
    const matchedCount = dupe?.matchedCount ?? dupe?.matchMeta?.matchedCount ?? null;
    const sourceCount = dupe?.sourceCount ?? dupe?.matchMeta?.sourceCount ?? null;

    return [
      { label: "Description", value: dupe?.description || dupe?.obf?.generic_name || "Not provided" },
      { label: "Store", value: dupe?.storeLocation || dupe?.obf?.storeLocation || "Not provided" },
      { label: "Where to buy", value: dupe?.whereToBuy || "Not provided" },
      { label: "Ingredient match", value: matchedCount && sourceCount ? `${matchedCount} of ${sourceCount}` : "Not provided" },
      { label: "Match score", value: formatScore(dupe?.matchScore) },
      { label: "Name score", value: formatScore(dupe?.nameScore) },
      { label: "Brand score", value: formatScore(dupe?.brandScore) },
      { label: "Scent score", value: formatScore(dupe?.scentScore) },
      { label: "Composite score", value: formatScore(dupe?.compositeScore) },
    ];
  }, [dupe]);

  return (
    <Card
      className={cn(
        "group relative overflow-hidden bg-card border-border transition-all hover:shadow-lg hover:-translate-y-0.5",
        showBestMatch && "ring-1 ring-primary/40",
        showBestValue && "ring-1 ring-emerald-500/30",
      )}
    >
      {/* Save */}
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
            isSaved ? "fill-rose-500 text-rose-500" : "text-muted-foreground hover:text-rose-500",
          )}
        />
      </button>

      {/* Badges */}
      <div className="absolute top-2 left-2 z-10 flex gap-1">
        <Badge className="bg-primary/90 text-primary-foreground text-[10px]">{matchLabel}</Badge>
        {showBestMatch && (
          <Badge className="bg-primary text-primary-foreground text-[10px]">Best match</Badge>
        )}
        {showBestValue && (
          <Badge className="bg-emerald-600 text-white text-[10px]">Best value</Badge>
        )}
      </div>

      {/* Image */}
      <div className="aspect-square bg-muted/30 relative">
        {!imageLoaded && !imageError && <div className="absolute inset-0 animate-pulse bg-muted" />}
        <img
          src={displayImage}
          alt={`${brand} ${name}`}
          className={cn(
            "w-full h-full transition-all",
            displayImage === noImageFound ? "object-contain p-6" : "object-cover",
            imageLoaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </div>

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Brand */}
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground truncate">{brand}</p>

        {/* Name */}
        <h3 className="text-sm font-semibold line-clamp-2 min-h-[2.5rem]">{name}</h3>

        {/* Price + Toggle */}
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

        {/* Category */}
        <p className="text-[10px] text-muted-foreground">{String(categoryText)}</p>

        {/* Why it fits (always visible) */}
        <div>
          <p className="text-[10px] uppercase font-medium text-muted-foreground">Why it fits</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {highlights.slice(0, 3).map((h: string, i: number) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>

        {/* Expanded: show everything */}
        {expanded && (
          <div className="space-y-3 pt-1">
            {/* Extra detail rows */}
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

            {/* Key ingredients */}
            <div>
              <p className="text-[10px] uppercase font-medium text-muted-foreground">Key ingredients</p>
              {keyIngredients.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {keyIngredients.map((k: string, i: number) => (
                    <span key={i} className="bg-muted px-1.5 py-0.5 rounded text-[10px] max-w-full truncate" title={k}>
                      {k}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Not provided</p>
              )}
            </div>

            {/* Watch outs */}
            <div>
              <div className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-yellow-600" />
                <p className="text-[10px] uppercase font-medium text-muted-foreground">Watch outs</p>
              </div>

              {flags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {flags.map((f: string, i: number) => (
                    <span key={i} className="bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                      {toTitle(String(f))}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">None detected</p>
              )}
            </div>

            {/* Ingredient count */}
            {ingredientCountText && (
              <p className="text-[10px] text-muted-foreground">{ingredientCountText}</p>
            )}

            {/* Full ingredient list */}
            <div>
              <p className="text-[10px] uppercase font-medium text-muted-foreground">Full ingredient list</p>

              {ingredientList.length > 0 ? (
                <div className="max-h-40 overflow-auto rounded-md border border-border bg-background p-2">
                  <ul className="text-xs text-muted-foreground space-y-0.5">
                    {ingredientList.map((ing: string, i: number) => (
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