export type IngredientKnowledge = {
  description: string;
  role?: string;
  aliases?: string[];
};

const INGREDIENT_ALIASES: Record<string, string> = {
  eau: "water",
  aqua: "water",
  agua: "water",
  huile: "oil",
  aceite: "oil",
  glycérine: "glycerin",
  glicerina: "glycerin",
  alcool: "alcohol",
  parfum: "fragrance",
  perfume: "fragrance",
  "shea butter": "butyrospermum parkii",
  "cocoa butter": "theobroma cacao",
  "coconut oil": "cocos nucifera",
  "jojoba oil": "simmondsia chinensis",
  "argan oil": "argania spinosa",
  "aloe vera": "aloe barbadensis",
  "green tea": "camellia sinensis",
  "vitamin b3": "niacinamide",
  "vitamin b-3": "niacinamide",
  "vitamin c": "ascorbic acid",
};

export const normalizeIngredientName = (name: string): string => {
  let cleaned = name.trim().toLowerCase();
  cleaned = cleaned.replace(/\([^)]*\)/g, " ");
  cleaned = cleaned.replace(/\b\d+(\.\d+)?\s*%\b/g, " ");
  cleaned = cleaned.replace(/\b\d+(\.\d+)?\s*percent\b/g, " ");
  cleaned = cleaned.replace(/^\s*\d+\s*(types?|forms?)\s+of\s+/i, "");
  cleaned = cleaned.replace(/^\s*(types?|forms?)\s+of\s+/i, "");
  cleaned = cleaned.replace(/\b(types?|forms?)\s+of\b/g, " ");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return INGREDIENT_ALIASES[cleaned] || cleaned;
};

export const INGREDIENT_KNOWLEDGE: Record<string, IngredientKnowledge> = {
  water: {
    description: "Primary solvent that helps dissolve and deliver other ingredients.",
    role: "supporting",
    aliases: ["aqua", "eau", "agua"],
  },
  glycerin: {
    description: "A humectant that draws water into the skin to support hydration.",
    role: "humectant",
    aliases: ["glycérine", "glicerina"],
  },
  "hyaluronic acid": {
    description: "A hydration-supporting ingredient that helps skin retain water.",
    role: "humectant",
    aliases: ["sodium hyaluronate"],
  },
  niacinamide: {
    description: "Vitamin B3 used to support tone, texture, and oil balance.",
    role: "active",
    aliases: ["vitamin b3", "vitamin b-3"],
  },
  "mineral oil": {
    description: "A purified oil that softens skin and reduces moisture loss.",
    role: "emollient",
  },
  petrolatum: {
    description: "An occlusive ingredient that seals in moisture and supports barrier protection.",
    role: "occlusive",
  },
  beeswax: {
    description: "A natural wax that thickens formulas and forms a light protective barrier.",
    role: "occlusive",
  },
  fragrance: {
    description: "Adds scent to the formula; sensitive users may prefer fragrance-free options.",
    role: "fragrance",
    aliases: ["parfum", "perfume"],
  },
  dimethicone: {
    description: "A silicone that smooths texture and helps reduce moisture loss.",
    role: "occlusive",
  },
  "cetearyl alcohol": {
    description: "A fatty alcohol that thickens and softens formulas without being drying.",
    role: "emulsifier",
  },
  "cetyl alcohol": {
    description: "A fatty alcohol that improves texture and helps stabilize emulsions.",
    role: "emulsifier",
  },
  "stearyl alcohol": {
    description: "A fatty alcohol that thickens and helps oil and water blend smoothly.",
    role: "emulsifier",
  },
  "shea butter": {
    description: "A rich emollient that softens skin and supports the moisture barrier.",
    role: "emollient",
    aliases: ["butyrospermum parkii"],
  },
  "squalane": {
    description: "A lightweight emollient that softens skin and supports barrier comfort.",
    role: "emollient",
  },
  "phenoxyethanol": {
    description: "A common preservative used at low levels to keep products stable.",
    role: "preservative",
  },
  "citric acid": {
    description: "A pH adjuster that helps keep formulas balanced and stable.",
    role: "supporting",
  },
  "sodium hydroxide": {
    description: "A pH adjuster used to balance acidity in skincare formulas.",
    role: "supporting",
  },
  "tocopherol": {
    description: "Vitamin E used for antioxidant support and formula stability.",
    role: "supporting",
    aliases: ["vitamin e"],
  },
};

const aliasLookup = new Map<string, string>();
Object.entries(INGREDIENT_KNOWLEDGE).forEach(([key, value]) => {
  aliasLookup.set(normalizeIngredientName(key), key);
  (value.aliases || []).forEach((alias) => {
    aliasLookup.set(normalizeIngredientName(alias), key);
  });
});

export const lookupIngredientKnowledge = (name: string): IngredientKnowledge | null => {
  const normalized = normalizeIngredientName(name);
  const key = aliasLookup.get(normalized);
  if (key && INGREDIENT_KNOWLEDGE[key]) {
    return INGREDIENT_KNOWLEDGE[key];
  }
  return null;
};
