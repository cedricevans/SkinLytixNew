import {
  BENEFICIAL_BY_PRODUCT_TYPE,
  COMMON_POTENTIAL_IRRITANTS,
  COMMON_SAFE_INGREDIENTS,
  PROBLEMATIC_BY_PRODUCT_TYPE,
} from "@/lib/common-ingredients";

export type QuickScanSummary = {
  total: number;
  safeKnown: number;
  beneficial: number;
  potentialConcerns: number;
  unknown: number;
  matchedSafe: string[];
  matchedBeneficial: string[];
  matchedConcerns: string[];
};

const normalize = (value: string) => value.trim().toLowerCase();

export const getQuickScanSummary = (ingredientsList: string, productType: "face" | "body" | "hair") => {
  const ingredients = ingredientsList
    .split(/[,;\n]/)
    .map(normalize)
    .filter(Boolean);

  const safeMatches = new Set<string>();
  const beneficialMatches = new Set<string>();
  const concernMatches = new Set<string>();

  const beneficialKeywords = BENEFICIAL_BY_PRODUCT_TYPE[productType] || [];
  const problematicKeywords = PROBLEMATIC_BY_PRODUCT_TYPE[productType] || [];

  ingredients.forEach((ingredient) => {
    if (COMMON_SAFE_INGREDIENTS.some((safe) => ingredient.includes(safe))) {
      safeMatches.add(ingredient);
    }

    if (COMMON_POTENTIAL_IRRITANTS.some((irritant) => ingredient.includes(irritant))) {
      concernMatches.add(ingredient);
    }

    if (beneficialKeywords.some((benefit) => ingredient.includes(benefit))) {
      beneficialMatches.add(ingredient);
    }

    if (problematicKeywords.some((problem) => ingredient.includes(problem))) {
      concernMatches.add(ingredient);
    }
  });

  const total = ingredients.length;
  const safeKnown = safeMatches.size;
  const beneficial = beneficialMatches.size;
  const potentialConcerns = concernMatches.size;
  const unknown = Math.max(0, total - safeKnown - potentialConcerns);

  return {
    total,
    safeKnown,
    beneficial,
    potentialConcerns,
    unknown,
    matchedSafe: Array.from(safeMatches).slice(0, 6),
    matchedBeneficial: Array.from(beneficialMatches).slice(0, 6),
    matchedConcerns: Array.from(concernMatches).slice(0, 6),
  };
};
