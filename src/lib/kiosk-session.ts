import { supabase } from "@/integrations/supabase/client";
import invokeFunction from "@/lib/functions-client";

type KioskPurgeResult = {
  total: number;
  deleted: number;
  failed: number;
  skippedProtected: number;
};

export const purgeCurrentKioskSessionData = async (): Promise<KioskPurgeResult> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { total: 0, deleted: 0, failed: 0, skippedProtected: 0 };
  }

  const { data: analyses, error } = await supabase
    .from("user_analyses")
    .select("id")
    .eq("user_id", user.id);

  if (error) throw error;

  const analysisIds = (analyses || []).map((row) => row.id).filter(Boolean);
  const nowIso = new Date().toISOString();
  const protectedAnalysisIds = new Set<string>();

  const { data: activeSessions, error: activeSessionError } = await (supabase as any)
    .from("kiosk_transfer_sessions")
    .select("id")
    .eq("kiosk_user_id", user.id)
    .in("status", ["created", "magic_link_sent"])
    .gt("expires_at", nowIso);

  if (activeSessionError) throw activeSessionError;

  const activeSessionIds = (activeSessions || []).map((session: { id: string }) => session.id);
  if (activeSessionIds.length > 0) {
    const { data: protectedItems, error: protectedItemsError } = await (supabase as any)
      .from("kiosk_transfer_items")
      .select("analysis_id")
      .in("session_id", activeSessionIds)
      .is("transferred_at", null);

    if (protectedItemsError) throw protectedItemsError;

    for (const item of protectedItems || []) {
      if (item.analysis_id) protectedAnalysisIds.add(item.analysis_id);
    }
  }

  const deletableAnalysisIds = analysisIds.filter((id) => !protectedAnalysisIds.has(id));
  let deleted = 0;
  let failed = 0;

  for (const analysisId of deletableAnalysisIds) {
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
    skippedProtected: analysisIds.length - deletableAnalysisIds.length,
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
