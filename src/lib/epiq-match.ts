export type EpiqMatchInput = {
  epiq_score?: number | null;
  epiq_match_tier?: string | null;
  epiq_match_pct?: number | null;
  epiq_match_color?: string | null;
  melanin_alert?: boolean | null;
};

export type EpiqMatchView = {
  score: number;
  pct: number;
  tier: string;
  color: string;
  isMelaninAlert: boolean;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const deriveTierFromPct = (pct: number): string => {
  if (pct >= 90) return "Excellent Match";
  if (pct >= 75) return "Strong Match";
  if (pct >= 55) return "Moderate Match";
  if (pct >= 30) return "Low Match";
  return "Not a Match";
};

const tierColor = (tier: string, melaninAlert: boolean): string => {
  if (melaninAlert) return "#A855F7";
  switch (tier) {
    case "Excellent Match":
      return "#22C55E";
    case "Strong Match":
      return "#84CC16";
    case "Moderate Match":
      return "#EAB308";
    case "Low Match":
      return "#F97316";
    case "Not a Match":
      return "#EF4444";
    default:
      return "#94A3B8";
  }
};

export const hasEpiqMatchData = (value: EpiqMatchInput | null | undefined): boolean => {
  const hasScore = Number.isFinite(Number(value?.epiq_score));
  const hasPct = Number.isFinite(Number(value?.epiq_match_pct));
  const hasTier = typeof value?.epiq_match_tier === "string" && value.epiq_match_tier.trim().length > 0;
  const hasAlert = Boolean(value?.melanin_alert);
  return hasScore || hasPct || hasTier || hasAlert;
};

export const getEpiqMatchView = (value: EpiqMatchInput | null | undefined): EpiqMatchView => {
  const rawScore = Number.isFinite(Number(value?.epiq_score)) ? Number(value?.epiq_score) : 0;
  const score = clamp(Math.round(rawScore), 0, 100);
  const rawPct = Number.isFinite(Number(value?.epiq_match_pct)) ? Number(value?.epiq_match_pct) : score;
  const pct = clamp(Math.round(rawPct), 0, 100);
  const isMelaninAlert = Boolean(value?.melanin_alert);
  const tier =
    (isMelaninAlert ? "Melanin Alert" : value?.epiq_match_tier) ||
    (isMelaninAlert ? "Melanin Alert" : deriveTierFromPct(pct));
  const color = value?.epiq_match_color || tierColor(tier, isMelaninAlert);
  return { score, pct, tier, color, isMelaninAlert };
};

export const getEpiqTierBadgeClass = (value: EpiqMatchInput | null | undefined): string => {
  const match = getEpiqMatchView(value);
  if (match.isMelaninAlert) {
    return "bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700";
  }
  if (match.pct >= 90) {
    return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700";
  }
  if (match.pct >= 75) {
    return "bg-lime-100 text-lime-800 border-lime-300 dark:bg-lime-900/30 dark:text-lime-300 dark:border-lime-700";
  }
  if (match.pct >= 55) {
    return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
  }
  if (match.pct >= 30) {
    return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700";
  }
  return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700";
};

export const getEpiqBucket = (
  value: EpiqMatchInput | null | undefined,
): "excellent" | "good" | "attention" => {
  const match = getEpiqMatchView(value);
  if (match.isMelaninAlert) return "attention";
  if (match.pct >= 75) return "excellent";
  if (match.pct >= 55) return "good";
  return "attention";
};
