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
  "magnesium aluminum silicate": {
    description: "A mineral thickener that helps stabilize and suspend ingredients.",
    role: "thickener",
  },
  "sodium borate": {
    description: "A buffering agent that helps control pH and keep formulas stable.",
    role: "buffer",
  },
  "isopropyl myristate": {
    description: "An emollient that improves slip and leaves skin feeling smooth.",
    role: "emollient",
  },
  "dmdm hydantoin": {
    description: "A preservative that helps prevent microbial growth and keep products safe.",
    role: "preservative",
  },
  "red 4": {
    description: "A colorant used to tint the product for appearance.",
    role: "colorant",
  },
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

const getHeuristicKnowledge = (name: string): IngredientKnowledge | null => {
  const normalized = normalizeIngredientName(name);
  const lower = normalized.toLowerCase();

  if (/fragrance|parfum|perfume/.test(lower)) {
    return {
      description: "Adds scent to the formula; sensitive users may prefer fragrance-free options.",
      role: "fragrance",
    };
  }

  if (/ci\s*\d+|red\s*\d+|yellow\s*\d+|blue\s*\d+|colorant|colourant/.test(lower)) {
    return {
      description: "A colorant used to tint the formula for appearance.",
      role: "colorant",
    };
  }

  if (/silicate|bentonite|kaolin|clay/.test(lower)) {
    return {
      description: "A mineral thickener/absorber that improves texture and stability.",
      role: "thickener",
    };
  }

  if (/borate|boric/.test(lower)) {
    return {
      description: "A buffering agent that helps control pH and stabilize the formula.",
      role: "buffer",
    };
  }

  if (/paraben|benzoate|sorbate|phenoxyethanol|dmdm|imidazolidinyl|diazolidinyl/.test(lower)) {
    return {
      description: "A preservative that helps keep the product safe from microbial growth.",
      role: "preservative",
    };
  }

  if (/edta/.test(lower)) {
    return {
      description: "A chelating agent that improves stability and performance.",
      role: "chelating",
    };
  }

  if (/carbomer|cellulose|xanthan|gum|polymer/.test(lower)) {
    return {
      description: "A thickener that helps give the formula structure and stability.",
      role: "thickener",
    };
  }

  if (/sulfate|sulphate|glucoside|taurate|coco-betaine|cocamidopropyl/.test(lower)) {
    return {
      description: "A surfactant that helps cleanse by lifting oils and debris.",
      role: "surfactant",
    };
  }

  if (/myristate|palmitate|stearate|laurate/.test(lower)) {
    return {
      description: "An emollient or texture enhancer that improves slip and feel.",
      role: "emollient",
    };
  }

  if (/alcohol/.test(lower)) {
    return {
      description: "A solvent or texture agent that can improve feel and stability.",
      role: "supporting",
    };
  }

  return null;
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
  return getHeuristicKnowledge(normalized);
};
