import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  lookupIngredientKnowledge,
  normalizeIngredientName,
} from "../_shared/ingredient-knowledge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type IngredientInput = {
  name: string;
  category?: "safe" | "beneficial" | "problematic" | "unverified";
};

const classifyIngredientRole = (name: string, pubchemData: any): string => {
  const knowledge = lookupIngredientKnowledge(name);
  if (knowledge?.role) return knowledge.role;
  const nameLower = name.toLowerCase();
  if (/acid|retinol|peptide|vitamin c|ascorbic/i.test(nameLower)) return "active";
  if (/hyaluronic|glycerin|aloe|aqua|water/i.test(nameLower)) return "humectant";
  if (/oil|butter|shea|cocoa|squalane/i.test(nameLower)) return "emollient";
  if (/dimethicone|silicone|petrolatum/i.test(nameLower)) return "occlusive";
  if (/cetyl|stearyl|alcohol/i.test(nameLower)) return "emulsifier";
  if (/fragrance|parfum|essential oil/i.test(nameLower)) return "fragrance";
  if (/paraben|phenoxyethanol|benzyl/i.test(nameLower)) return "preservative";
  if (pubchemData?.molecular_weight) return "supporting";
  return "supporting";
};

const getFallbackIngredientExplanation = (name: string, role: string): string => {
  const knowledge = lookupIngredientKnowledge(name);
  if (knowledge?.description) return knowledge.description;
  if (role === "humectant") {
    return "Helps attract and hold water in the skin to support hydration.";
  }
  if (role === "emollient") {
    return "Softens and smooths the skin by filling in surface gaps.";
  }
  if (role === "occlusive") {
    return "Helps seal in moisture and reduce water loss.";
  }
  if (role === "preservative") {
    return "Helps keep the formula stable and prevents microbial growth.";
  }
  if (role === "fragrance") {
    return "Adds scent to the formula; some sensitive users may prefer fragrance-free options.";
  }
  if (role === "active") {
    return "Active ingredient used for targeted skin benefits.";
  }
  return "Supports the formula’s texture, stability, or overall performance.";
};

const isLowQualityExplanation = (value?: string | null): boolean => {
  if (!value) return true;
  return /supports the formula|no detailed information available|not found/i.test(value);
};

async function generateBatchExplanations(
  items: Array<{ name: string; role: string; context: string }>,
  lovableApiKey: string | null,
  geminiApiKey: string | null
): Promise<Record<string, string>> {
  const fallback: Record<string, string> = {};
  items.forEach((item) => {
    fallback[item.name] = getFallbackIngredientExplanation(item.name, item.role);
  });

  const systemPrompt = `You are an ingredient expert. Return ONLY valid JSON.
Each entry should explain what the ingredient does in 1-2 concise sentences, non-medical, consumer-friendly.`;

  const userMessage = `Explain these ingredients in JSON array format:
[
  { "name": "Ingredient Name", "role": "role", "explanation": "..." }
]
Ingredients:
${items.map((item) => `- ${item.name} (role: ${item.role}) ${item.context}` ).join("\n")}
`;

  const parseResponse = (content: string) => {
    const match = content.match(/\[.*\]/s);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return null;
    const mapped: Record<string, string> = { ...fallback };
    parsed.forEach((item: any) => {
      if (item?.name && item?.explanation) {
        mapped[item.name] = String(item.explanation).trim();
      }
    });
    return mapped;
  };

  if (geminiApiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  { text: systemPrompt },
                  { text: userMessage },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 600,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const content = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        const parsed = parseResponse(content);
        if (parsed) return parsed;
      }
    } catch (error) {
      console.error("Gemini batch explanation error:", error);
    }
  }

  if (lovableApiKey) {
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 600,
          temperature: 0.3,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content ?? "";
        const parsed = parseResponse(content);
        if (parsed) return parsed;
      }
    } catch (error) {
      console.error("Lovable batch explanation error:", error);
    }
  }

  return fallback;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const ingredientsInput = Array.isArray(body?.ingredients) ? body.ingredients : [];
    if (ingredientsInput.length === 0) {
      return new Response(JSON.stringify({ error: "ingredients array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ingredients: IngredientInput[] = ingredientsInput.map((item: any) =>
      typeof item === "string" ? { name: item } : { name: item.name, category: item.category }
    );

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");

    const normalizedInputs = ingredients.map((ingredient) => ({
      ...ingredient,
      normalized: normalizeIngredientName(ingredient.name),
    }));

    const uniqueNormalized = Array.from(
      new Set(normalizedInputs.map((item) => item.normalized))
    );

    const { data: cachedRows } = await supabase
      .from("ingredient_explanations_cache")
      .select("normalized_name, role, explanation, source, updated_at")
      .in("normalized_name", uniqueNormalized);

    const cachedMap = new Map<string, { role: string | null; explanation: string }>();
    (cachedRows || []).forEach((row: any) => {
      if (row?.normalized_name && row?.explanation && !isLowQualityExplanation(row.explanation)) {
        cachedMap.set(row.normalized_name, {
          role: row.role,
          explanation: row.explanation,
        });
      }
    });

    const missing = normalizedInputs.filter((item) => !cachedMap.has(item.normalized));

    let ingredientResults: any[] = [];
    if (missing.length > 0) {
      const pubchemResponse = await fetch(`${supabaseUrl}/functions/v1/query-pubchem`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ ingredients: missing.map((i) => i.name) }),
      });
      const pubchemData = await pubchemResponse.json();
      ingredientResults = pubchemData.results || [];
    }

    const batchSize = 8;
    const explanations: Record<string, string> = {};

    for (let i = 0; i < missing.length; i += batchSize) {
      const batch = missing.slice(i, i + batchSize);
      const items = batch.map((ingredient) => {
        const pubchemMatch = ingredientResults.find((r: any) => {
          const searched = r.searched_name?.toLowerCase();
          const original =
            typeof r.name === "string" ? normalizeIngredientName(r.name) : undefined;
          return searched === ingredient.normalized || original === ingredient.normalized;
        });
        const pubchemData = pubchemMatch?.data ?? null;
        const role = classifyIngredientRole(ingredient.name, pubchemData);
        const context = pubchemData?.molecular_weight
          ? `(molecular weight: ${pubchemData.molecular_weight})`
          : "";
        return { name: ingredient.name, role, context };
      });

      if (lovableApiKey || geminiApiKey) {
        const batchExplanations = await generateBatchExplanations(
          items,
          lovableApiKey,
          geminiApiKey
        );
        Object.assign(explanations, batchExplanations);
      } else {
        items.forEach((item) => {
          explanations[item.name] = getFallbackIngredientExplanation(item.name, item.role);
        });
      }
    }

    if (missing.length > 0) {
      const upserts = missing.map((ingredient) => {
        const knowledge = lookupIngredientKnowledge(ingredient.name);
        const pubchemMatch = ingredientResults.find((r: any) => {
          const searched = r.searched_name?.toLowerCase();
          const original =
            typeof r.name === "string" ? normalizeIngredientName(r.name) : undefined;
          return searched === ingredient.normalized || original === ingredient.normalized;
        });
        const pubchemData = pubchemMatch?.data ?? null;
        const role = knowledge?.role || classifyIngredientRole(ingredient.name, pubchemData);
        const explanation =
          knowledge?.description ||
          explanations[ingredient.name] ||
          getFallbackIngredientExplanation(ingredient.name, role);
        return {
          ingredient_name: ingredient.name,
          normalized_name: ingredient.normalized,
          role,
          explanation,
          source: knowledge?.description ? "knowledge" : (lovableApiKey || geminiApiKey) ? "ai" : "fallback",
          updated_at: new Date().toISOString(),
        };
      });

      if (upserts.length > 0) {
        await supabase
          .from("ingredient_explanations_cache")
          .upsert(upserts, { onConflict: "normalized_name" });
      }
    }

    const results = normalizedInputs.map((ingredient) => {
      const cached = cachedMap.get(ingredient.normalized);
      if (cached) {
        return {
          name: ingredient.name,
          category: ingredient.category || "unknown",
          role: cached.role || classifyIngredientRole(ingredient.name, null),
          explanation: cached.explanation,
          molecular_weight: null,
        };
      }

      const knowledge = lookupIngredientKnowledge(ingredient.name);
      const pubchemMatch = ingredientResults.find((r: any) => {
        const searched = r.searched_name?.toLowerCase();
        const original =
          typeof r.name === "string" ? normalizeIngredientName(r.name) : undefined;
        return searched === ingredient.normalized || original === ingredient.normalized;
      });
      const pubchemData = pubchemMatch?.data ?? null;
      const role = knowledge?.role || classifyIngredientRole(ingredient.name, pubchemData);
      return {
        name: ingredient.name,
        category: ingredient.category || "unknown",
        role,
        explanation:
          knowledge?.description ||
          explanations[ingredient.name] ||
          getFallbackIngredientExplanation(ingredient.name, role),
        molecular_weight: pubchemData?.molecular_weight || null,
      };
    });

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in explain-ingredients:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
