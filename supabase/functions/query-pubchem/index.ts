import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { COMMON_INGREDIENTS } from "../_shared/common-ingredients.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMITS = {
  requestsPerMinute: 20,    // Max 20 requests per minute per IP
  maxIngredientsPerRequest: 50,  // Max 50 ingredients per request
  maxIngredientNameLength: 200,  // Max 200 chars per ingredient name
  maxPayloadSize: 50000  // 50KB max payload
};

// Rate limiting: keep requests paced while avoiding long serial delays
const RATE_LIMIT_DELAY = 300; // 0.3 seconds between PubChem batches
const PUBCHEM_BATCH_SIZE = 4; // number of concurrent PubChem lookups per batch

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Step 1: Check payload size
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > RATE_LIMITS.maxPayloadSize) {
      return new Response(
        JSON.stringify({ 
          error: 'Request payload too large',
          max_size_bytes: RATE_LIMITS.maxPayloadSize 
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Extract IP address for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0].trim() 
      || req.headers.get('x-real-ip') 
      || 'unknown';
    
    // Initialize Supabase client early for rate limit check
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 3: Check rate limit
    const { data: rateLimitCheck, error: rateLimitError } = await supabase
      .rpc('check_rate_limit', {
        _endpoint: 'query-pubchem',
        _identifier: clientIp,
        _max_requests: RATE_LIMITS.requestsPerMinute,
        _window_minutes: 1
      });
    
    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      // Fail open - allow request if rate limit check fails
    } else if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.error('RATE_LIMIT_EXCEEDED', {
        endpoint: 'query-pubchem',
        ip: clientIp,
        current_count: rateLimitCheck.current_count,
        max_allowed: rateLimitCheck.max_requests,
        timestamp: new Date().toISOString()
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded. Please try again later.',
          retry_after_seconds: rateLimitCheck.retry_after_seconds,
          current_count: rateLimitCheck.current_count,
          max_requests: rateLimitCheck.max_requests
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': rateLimitCheck.retry_after_seconds.toString()
          } 
        }
      );
    }

    // Step 4: Parse and validate request body
    const { ingredients, force_pubchem } = await req.json();
    
    // Validation checks
    if (!Array.isArray(ingredients) || ingredients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Ingredients array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (ingredients.length > RATE_LIMITS.maxIngredientsPerRequest) {
      return new Response(
        JSON.stringify({ 
          error: `Too many ingredients. Maximum ${RATE_LIMITS.maxIngredientsPerRequest} per request.`,
          provided: ingredients.length,
          max_allowed: RATE_LIMITS.maxIngredientsPerRequest
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate each ingredient name
    for (const ingredient of ingredients) {
      if (typeof ingredient !== 'string') {
        return new Response(
          JSON.stringify({ error: 'All ingredients must be strings' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (ingredient.length > RATE_LIMITS.maxIngredientNameLength) {
        return new Response(
          JSON.stringify({ 
            error: `Ingredient name too long. Maximum ${RATE_LIMITS.maxIngredientNameLength} characters.`,
            ingredient: ingredient.substring(0, 50) + '...'
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Common ingredient aliases (cosmetic names → scientific names)
    const INGREDIENT_ALIASES: Record<string, string> = {
      // Water variations
      'eau': 'water',
      'aqua': 'water',
      'agua': 'water',
      
      // Common oils
      'huile': 'oil',
      'aceite': 'oil',
      
      // Glycerin variations
      'glycérine': 'glycerin',
      'glicerina': 'glycerin',
      
      // Alcohol variations
      'alcool': 'alcohol',
      
      // Fragrance variations
      'parfum': 'fragrance',
      'perfume': 'fragrance',
      
      // Common botanical aliases
      'shea butter': 'butyrospermum parkii',
      'cocoa butter': 'theobroma cacao',
      'coconut oil': 'cocos nucifera',
      'jojoba oil': 'simmondsia chinensis',
      'argan oil': 'argania spinosa',
      'aloe vera': 'aloe barbadensis',
      'green tea': 'camellia sinensis',
      'vitamin b3': 'niacinamide',
      'vitamin b-3': 'niacinamide',
      'vitamin c': 'ascorbic acid',
    };

    // Normalize ingredient name
    const normalizeIngredient = (name: string): string => {
      let cleaned = name.trim().toLowerCase();
      cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
      cleaned = cleaned.replace(/\b\d+(\.\d+)?\s*%\b/g, ' ');
      cleaned = cleaned.replace(/\b\d+(\.\d+)?\s*percent\b/g, ' ');
      cleaned = cleaned.replace(/^\s*\d+\s*(types?|forms?)\s+of\s+/i, '');
      cleaned = cleaned.replace(/^\s*(types?|forms?)\s+of\s+/i, '');
      cleaned = cleaned.replace(/\b(types?|forms?)\s+of\b/g, ' ');
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      return INGREDIENT_ALIASES[cleaned] || cleaned;
    };

    const commonSet = new Set(COMMON_INGREDIENTS.map((item: string) => normalizeIngredient(item)));

    const ingredientsList = ingredients.map((ingredientName: string) => ({
      original: ingredientName,
      clean: normalizeIngredient(ingredientName),
    }));

    const uniqueIngredients = new Map<string, string[]>();
    ingredientsList.forEach(({ original, clean }: { original: string; clean: string }) => {
      const existing = uniqueIngredients.get(clean) || [];
      existing.push(original);
      uniqueIngredients.set(clean, existing);
    });

    const uniqueResults = new Map<string, { data: any; source: string; message?: string }>();

    const fetchWithRetry = async (url: string, attempts = 2): Promise<Response> => {
      let lastError: unknown;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        try {
          const response = await fetch(url);
          if (response.status === 429 && attempt < attempts - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200));
            continue;
          }
          return response;
        } catch (error) {
          lastError = error;
          await new Promise(resolve => setTimeout(resolve, 400));
        }
      }
      throw lastError || new Error('PubChem request failed');
    };

    const uniqueNames = Array.from(uniqueIngredients.keys());

    if (!force_pubchem) {
      uniqueNames.forEach((cleanName) => {
        if (!commonSet.has(cleanName)) return;
        uniqueResults.set(cleanName, {
          data: null,
          source: "local",
        });
      });
    }

    const cacheCandidates = uniqueNames.filter((name) => !uniqueResults.has(name));
    if (cacheCandidates.length > 0) {
      const { data: cachedRows } = await supabase
        .from('ingredient_cache')
        .select('*')
        .in('ingredient_name', cacheCandidates);

      (cachedRows || []).forEach((cached: any) => {
        console.log('Cache hit for ingredient:', cached.ingredient_name);
        uniqueResults.set(cached.ingredient_name, {
          data: {
            pubchem_cid: cached.pubchem_cid,
            molecular_weight: cached.molecular_weight,
            properties: cached.properties_json,
          },
          source: 'cache',
        });
      });
    }

    const missingNames = cacheCandidates.filter((name) => !uniqueResults.has(name));

    const fetchPubchem = async (cleanName: string) => {
      console.log('Cache miss, querying PubChem for:', cleanName);
      try {
        const searchResponse = await fetchWithRetry(
          `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(cleanName)}/JSON`
        );

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const compound = searchData.PC_Compounds?.[0];

          if (compound) {
            const cid = compound.id?.id?.cid;
            const molecularWeight = compound.props?.find((p: any) =>
              p.urn?.label === 'Molecular Weight'
            )?.value?.fval;

            await supabase
              .from('ingredient_cache')
              .insert({
                ingredient_name: cleanName,
                pubchem_cid: cid?.toString(),
                molecular_weight: molecularWeight,
                properties_json: { compound },
              });

            uniqueResults.set(cleanName, {
              data: {
                pubchem_cid: cid?.toString(),
                molecular_weight: molecularWeight,
                properties: { compound },
              },
              source: 'api',
            });
          } else {
            uniqueResults.set(cleanName, {
              data: null,
              source: 'api',
              message: 'Not found in PubChem',
            });
          }
        } else {
          uniqueResults.set(cleanName, {
            data: null,
            source: 'api',
            message: 'Not found in PubChem',
          });
        }
      } catch (error) {
        console.error(`Error querying PubChem for ${cleanName}:`, error);
        uniqueResults.set(cleanName, {
          data: null,
          source: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    };

    for (let i = 0; i < missingNames.length; i += PUBCHEM_BATCH_SIZE) {
      const batch = missingNames.slice(i, i + PUBCHEM_BATCH_SIZE);
      await Promise.all(batch.map(fetchPubchem));
      if (i + PUBCHEM_BATCH_SIZE < missingNames.length) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY));
      }
    }

    const results = ingredientsList.map(({ original, clean }) => {
      const result = uniqueResults.get(clean);
      return {
        name: original,
        searched_name: clean,
        data: result?.data ?? null,
        source: result?.source ?? 'error',
        message: result?.message,
      };
    });

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in query-pubchem:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
