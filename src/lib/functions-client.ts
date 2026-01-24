import { supabase } from '@/integrations/supabase/client';

type InvokeResult = any;

/**
 * Unified wrapper to invoke Supabase Edge Functions.
 * - In DEV with VITE_USE_FUNCTIONS_PROXY=true it calls the local dev proxy at /functions/<name>
 *   and forwards the anon key + access token header when available.
 * - Otherwise it calls `supabase.functions.invoke`.
 *
 * Throws on network or function-level errors. Returns the parsed JSON `data` on success.
 */
export async function invokeFunction(name: string, payload?: any): Promise<InvokeResult> {
  const useProxy = import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_PROXY === 'true';

  if (useProxy) {
    // Try to attach an access token if available
    let accessToken: string | undefined;
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      accessToken = (sessionData as any)?.session?.access_token;
    } catch (e) {
      // ignore
    }

    // prefer explicit anon key; fall back to publishable key if present
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

    try {
      const res = await fetch(`/functions/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(anonKey ? { apikey: anonKey } : {}),
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload ?? {}),
      });

      if (res.ok) {
        try {
          return await res.json();
        } catch (e) {
          return null;
        }
      }

      // If the dev proxy responds 404 (function not found locally), fall back to calling
      // the Supabase functions endpoint via the SDK. This helps when the local functions
      // server isn't running or the proxy is pointed elsewhere.
      if (res.status === 404) {
        // fallthrough to SDK-based invoke below
        console.warn(`Function proxy returned 404 for ${name}, falling back to SDK.invoke`);
      } else {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Function ${name} returned ${res.status}`);
      }
    } catch (fetchErr) {
      // Network errors or other failures — try SDK fallback
      console.warn('Function proxy request failed, attempting SDK.invoke fallback', fetchErr);
    }
  }

  // Either we're in production or the proxy path above indicated a fallback is needed.
  try {
    const { data, error } = await supabase.functions.invoke(name, { body: payload ?? {} });
    if (error) throw error;
    return data;
  } catch (sdkErr) {
    // Normalize SDK error to a thrown Error with usable message
    // SDK errors can be plain objects (e.g., { code, message })
    const msg = sdkErr && typeof sdkErr === 'object' && 'message' in sdkErr ? (sdkErr as any).message : String(sdkErr);
    throw new Error(msg || `Failed to invoke function ${name}`);
  }
}

export default invokeFunction;
