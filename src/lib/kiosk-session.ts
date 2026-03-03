import { supabase } from "@/integrations/supabase/client";
import invokeFunction from "@/lib/functions-client";

type KioskPurgeResult = {
  total: number;
  deleted: number;
  failed: number;
};

export const purgeCurrentKioskSessionData = async (): Promise<KioskPurgeResult> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { total: 0, deleted: 0, failed: 0 };
  }

  const { data: analyses, error } = await supabase
    .from("user_analyses")
    .select("id")
    .eq("user_id", user.id);

  if (error) throw error;

  const analysisIds = (analyses || []).map((row) => row.id).filter(Boolean);
  let deleted = 0;
  let failed = 0;

  for (const analysisId of analysisIds) {
    try {
      await invokeFunction("delete-analysis", { analysisId });
      deleted += 1;
    } catch {
      failed += 1;
    }
  }

  return {
    total: analysisIds.length,
    deleted,
    failed,
  };
};

export const clearKioskBrowserState = () => {
  if (typeof window === "undefined") return;

  const removeByPrefix = (storage: Storage, prefix: string) => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  };

  removeByPrefix(window.localStorage, "sl_");
  removeByPrefix(window.sessionStorage, "sl_");
};
