import { supabase } from "@/integrations/supabase/client";

export type IngredientExplanationInput = {
  name: string;
  category?: "safe" | "beneficial" | "problematic" | "unverified";
};

export type IngredientExplanationResult = {
  name: string;
  category: string;
  role: string;
  explanation: string;
  molecular_weight: number | null;
};

export const fetchIngredientExplanations = async (ingredients: IngredientExplanationInput[]) => {
  const isEnabled = import.meta.env.VITE_ENABLE_EXPLAIN_INGREDIENTS === "true";
  if (!isEnabled || ingredients.length === 0) {
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke("explain-ingredients", {
      body: { ingredients },
    });

    if (error) {
      return [];
    }

    return (data?.results || []) as IngredientExplanationResult[];
  } catch {
    return [];
  }
};
