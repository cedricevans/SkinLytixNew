import type { PostgrestError, PostgrestSingleResponse } from '@supabase/supabase-js';

// Normalize Supabase responses and throw on error to make callers' control flow simpler.
export function ensureNoError<T>(response: PostgrestSingleResponse<T> | { data?: T | null; error?: PostgrestError | null }): T | null {
  const err = (response as PostgrestSingleResponse<T>).error ?? (response as any).error ?? null;
  const data = (response as PostgrestSingleResponse<T>).data ?? (response as any).data ?? null;
  if (err) {
    throw err;
  }
  return typeof data === 'undefined' ? null : data;
}

export default ensureNoError;
