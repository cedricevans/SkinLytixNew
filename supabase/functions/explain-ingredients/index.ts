import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

const fallbackExplanation = (category?: IngredientInput["category"]) => {
  switch (category) {
    case "safe":
      return "Generally recognized as safe for topical use. Part of the product supporting formula.";
    case "beneficial":
      return "Often used for targeted skin benefits. Consider how it fits your skin goals.";
    case "problematic":
      return "May be irritating for some users or not ideal for certain skin concerns.";
    case "unverified":
      return "Not found in PubChem or Open Beauty Facts databases. May be a proprietary blend or trade name.";
    default:
      return "No detailed information available.";
  }
};

async function generateIngredientExplanation(
  ingredientName: string,
  category: IngredientInput["category"],
  pubchemData: any,
  lovableApiKey: string
): Promise<string> {
  try {
    const systemPrompt = `You are an ingredient expert. Explain this skincare ingredient in 2-3 friendly sentences for consumers.
Focus on: what it does (role/function), why it's used, and any key safety notes.
Keep it conversational and non-technical. No medical claims.`;

    const context = pubchemData ? `Molecular weight: ${pubchemData.molecular_weight || "unknown"}` : "Limited scientific data available";
    const userMessage = `Explain ${ingredientName} (category: ${category || "unknown"}) for a consumer. ${context}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) return fallbackExplanation(category);

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error(`Error generating explanation for ${ingredientName}:`, error);
    return fallbackExplanation(category);
  }
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

    const pubchemResponse = await fetch(`${supabaseUrl}/functions/v1/query-pubchem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ ingredients: ingredients.map((i) => i.name) }),
    });

    const pubchemData = await pubchemResponse.json();
    const ingredientResults = pubchemData.results || [];

    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const results = await Promise.all(
      ingredients.map(async (ingredient) => {
        const pubchemMatch = ingredientResults.find(
          (r: any) => r.searched_name?.toLowerCase() === ingredient.name.toLowerCase()
        );

        const role = classifyIngredientRole(ingredient.name, pubchemMatch);
        const explanation = lovableApiKey
          ? await generateIngredientExplanation(ingredient.name, ingredient.category, pubchemMatch, lovableApiKey)
          : fallbackExplanation(ingredient.category);

        return {
          name: ingredient.name,
          category: ingredient.category || "unknown",
          role,
          explanation,
          molecular_weight: pubchemMatch?.molecular_weight || null,
        };
      })
    );

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
