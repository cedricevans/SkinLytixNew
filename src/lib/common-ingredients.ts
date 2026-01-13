export const COMMON_SAFE_INGREDIENTS = [
  "water",
  "aqua",
  "eau",
  "glycerin",
  "niacinamide",
  "hyaluronic acid",
  "sodium hyaluronate",
  "ceramide",
  "panthenol",
  "allantoin",
  "tocopherol",
  "ascorbic acid",
  "citric acid",
  "sodium chloride",
  "xanthan gum",
  "dimethicone",
  "squalane",
  "aloe",
];

export const COMMON_POTENTIAL_IRRITANTS = [
  "fragrance",
  "parfum",
  "essential oil",
  "alcohol denat",
  "menthol",
  "citrus",
  "linalool",
  "limonene",
  "eugenol",
];

export const BENEFICIAL_BY_PRODUCT_TYPE: Record<"face" | "body" | "hair", string[]> = {
  face: [
    "niacinamide",
    "hyaluronic acid",
    "salicylic acid",
    "glycolic acid",
    "lactic acid",
    "azelaic acid",
    "ceramide",
    "vitamin c",
    "retinol",
  ],
  body: [
    "urea",
    "lactic acid",
    "salicylic acid",
    "glycerin",
    "ceramide",
    "shea butter",
  ],
  hair: [
    "panthenol",
    "caffeine",
    "biotin",
    "niacinamide",
    "argan oil",
  ],
};

export const PROBLEMATIC_BY_PRODUCT_TYPE: Record<"face" | "body" | "hair", string[]> = {
  face: ["coconut oil", "isopropyl myristate", "lauric acid"],
  body: ["formaldehyde", "triclosan"],
  hair: ["sulfates", "alcohol denat"],
};
