import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMITS = {
  requestsPerMinute: 30,    // Max 30 requests per minute per IP
  barcodeLengthMin: 8,
  barcodeLengthMax: 14,
  maxPayloadSize: 50000  // 50KB max payload
};

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
        _endpoint: 'query-open-beauty-facts',
        _identifier: clientIp,
        _max_requests: RATE_LIMITS.requestsPerMinute,
        _window_minutes: 1
      });
    
    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      // Fail open - allow request if rate limit check fails
    } else if (rateLimitCheck && !rateLimitCheck.allowed) {
      console.error('RATE_LIMIT_EXCEEDED', {
        endpoint: 'query-open-beauty-facts',
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

    // Step 4: Parse and validate barcode
    const { barcode } = await req.json();
    
    if (!barcode) {
      return new Response(
        JSON.stringify({ error: 'Barcode is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate barcode format
    const barcodeStr = String(barcode).trim();
    const isValidBarcode = /^\d{8,14}$/.test(barcodeStr);
    
    if (!isValidBarcode) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid barcode format. Must be 8-14 digits.',
          provided: barcodeStr.substring(0, 20)
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (barcodeStr.length < RATE_LIMITS.barcodeLengthMin || 
        barcodeStr.length > RATE_LIMITS.barcodeLengthMax) {
      return new Response(
        JSON.stringify({ 
          error: `Barcode must be between ${RATE_LIMITS.barcodeLengthMin} and ${RATE_LIMITS.barcodeLengthMax} digits.`,
          provided_length: barcodeStr.length
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache first (30-day expiry)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: cached, error: cacheError } = await supabase
      .from('product_cache')
      .select('obf_data_json, cached_at')
      .eq('barcode', barcodeStr)
      .gte('cached_at', thirtyDaysAgo.toISOString())
      .maybeSingle();

    if (cached) {
      console.log('Cache hit for barcode:', barcodeStr);
      return new Response(
        JSON.stringify({ product: cached.obf_data_json, source: 'cache' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cache miss - query Open Beauty Facts API
    console.log('Cache miss, querying Open Beauty Facts for:', barcodeStr);
    const obfResponse = await fetch(
      `https://world.openbeautyfacts.org/api/v0/product/${barcodeStr}.json`
    );

    if (!obfResponse.ok) {
      return new Response(
        JSON.stringify({ product: null, source: 'api', message: 'Product not found in Open Beauty Facts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const obfData = await obfResponse.json();
    
    if (obfData.status !== 1 || !obfData.product) {
      return new Response(
        JSON.stringify({ product: null, source: 'api', message: 'Product not found in Open Beauty Facts' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Store in cache
    await supabase
      .from('product_cache')
      .upsert({
        barcode: barcodeStr,
        obf_data_json: obfData.product,
        cached_at: new Date().toISOString()
      }, { onConflict: 'barcode' });

    console.log('Cached new product:', barcodeStr);

    return new Response(
      JSON.stringify({ product: obfData.product, source: 'api' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in query-open-beauty-facts:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
