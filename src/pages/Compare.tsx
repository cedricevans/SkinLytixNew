// Compare.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Search,
  Sparkles,
  FlaskConical,
  Package,
  Loader2,
  AlertTriangle,
  Clock,
  Database,
  Smartphone,
} from "lucide-react";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { DupeCard } from "@/components/DupeCard";
import { toast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/functions-client";
import noImageFound from "@/assets/no_image_found.png";

const CATEGORY_FILTERS = ["all", "face", "body", "hair", "scalp"];
const norm = (v) => String(v || "").trim();

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const ANALYSES_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 2; // 2 days

// ---------- ingredient similarity (My Products Match) ----------
const normalizeIngredient = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[().]/g, "")
    .trim();

const toIngredientSet = (ingredientsText) => {
  return new Set(
    String(ingredientsText || "")
      .split(/[,;\n]+/)
      .map((x) => normalizeIngredient(x))
      .filter(Boolean)
  );
};

const jaccardScore = (setA, setB) => {
  if (!setA?.size || !setB?.size) return { score: 0, sharedCount: 0, sharedSample: [] };

  let shared = 0;
  const sharedSample = [];

  for (const v of setA) {
    if (setB.has(v)) {
      shared += 1;
      if (sharedSample.length < 10) sharedSample.push(v);
    }
  }

  const union = setA.size + setB.size - shared;
  const score = union ? Math.round((shared / union) * 100) : 0;

  return { score, sharedCount: shared, sharedSample };
};

// ---------- normalize dupe payload ----------
const toUrl = (v) => {
  if (!v) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "object") {
    const u = v.url || v.imageUrl || v.image_url || v.src || v.href;
    return typeof u === "string" ? (u.trim() || null) : null;
  }
  return null;
};

const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

const normalizeDupe = (dupe) => {
  if (!dupe) return null;

  const rawImages = Array.isArray(dupe.images) ? dupe.images : [];
  const rawObfImages = Array.isArray(dupe?.obf?.images) ? dupe.obf.images : [];
  const rawObfImageUrls = Array.isArray(dupe?.obf?.imageUrls) ? dupe.obf.imageUrls : [];

  const imageUrls = uniq([
    toUrl(dupe.imageUrl),
    toUrl(dupe.image_url),
    ...(Array.isArray(dupe.imageUrls) ? dupe.imageUrls.map(toUrl) : []),
    ...rawImages.map(toUrl),

    toUrl(dupe?.obf?.imageUrl),
    ...rawObfImageUrls.map(toUrl),
    ...rawObfImages.map(toUrl),
  ]).filter(Boolean);

  return {
    id: dupe.id || null,
    name: dupe.name || dupe.productName || dupe.product_name || "",
    brand: dupe.brand || dupe.brandName || dupe.brand_name || null,

    imageUrl: imageUrls[0] || null,
    imageUrls,
    images: imageUrls,

    price: dupe.priceEstimate || dupe.price || null,
    matchPercent: dupe.matchPercent ?? dupe.match_percent ?? null,
    description: dupe.description ?? null,
    category: dupe.category ?? null,
    whereToBuy: dupe.whereToBuy ?? null,
    storeLocation: dupe.storeLocation ?? null,
    highlights: Array.isArray(dupe.highlights) ? dupe.highlights : [],
    keyIngredients: Array.isArray(dupe.keyIngredients) ? dupe.keyIngredients : [],
    flags: Array.isArray(dupe.flags) ? dupe.flags : [],
    ingredientsCount: dupe.ingredientsCount ?? 0,
    ingredientList: Array.isArray(dupe.ingredientList) ? dupe.ingredientList : [],
    internalLink: dupe.internalLink ?? null,
    productUrl: dupe.productUrl ?? dupe.url ?? null,

    matchedCount: dupe.matchedCount ?? dupe.matchMeta?.matchedCount ?? null,
    sourceCount: dupe.sourceCount ?? dupe.matchMeta?.sourceCount ?? null,
  };
};

const savedKeyForMarketDupe = ({ name, brand }, sourceProductId) => {
  return `${norm(sourceProductId)}::${norm(name)}::${norm(brand)}`;
};

const savedKeyFor = ({ product_name, brand, source_product_id }) => {
  return `${norm(source_product_id)}::${norm(product_name)}::${norm(brand)}`;
};

// ---------- local cache (market dupes) ----------
const getMarketDupeCacheKey = (userId, productId) => {
  if (!userId || !productId) return null;
  return `sl_market_dupes_${userId}_${productId}`;
};

const readMarketDupeLocalCache = (userId, productId) => {
  const key = getMarketDupeCacheKey(userId, productId);
  if (!key) return null;

  const sources = [() => sessionStorage.getItem(key), () => localStorage.getItem(key)];
  for (const source of sources) {
    try {
      const value = source();
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return null;
};

const writeMarketDupeLocalCache = (userId, productId, dupes) => {
  const key = getMarketDupeCacheKey(userId, productId);
  if (!key) return;

  const payload = JSON.stringify(dupes);
  try {
    sessionStorage.setItem(key, payload);
  } catch {}
  try {
    localStorage.setItem(key, payload);
  } catch {}
};

// ---------- local cache (analyses list for Previous Scans) ----------
const getAnalysesCacheKey = (userId) => {
  if (!userId) return null;
  return `sl_user_analyses_${userId}`;
};

const readAnalysesLocalCache = (userId) => {
  const key = getAnalysesCacheKey(userId);
  if (!key) return null;

  const sources = [() => sessionStorage.getItem(key), () => localStorage.getItem(key)];
  for (const source of sources) {
    try {
      const raw = source();
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const updatedAt = parsed?.updatedAt || null;
      const items = Array.isArray(parsed?.items) ? parsed.items : null;

      if (!items?.length) continue;

      const t = updatedAt ? new Date(updatedAt).getTime() : 0;
      if (!t || !Number.isFinite(t)) return { items, updatedAt: null, fresh: false };

      const fresh = Date.now() - t < ANALYSES_CACHE_TTL_MS;
      return { items, updatedAt, fresh };
    } catch {}
  }

  return null;
};

const writeAnalysesLocalCache = (userId, items) => {
  const key = getAnalysesCacheKey(userId);
  if (!key) return;

  const payload = JSON.stringify({ updatedAt: new Date().toISOString(), items: Array.isArray(items) ? items : [] });

  try {
    sessionStorage.setItem(key, payload);
  } catch {}
  try {
    localStorage.setItem(key, payload);
  } catch {}
};

// ---------- Supabase cache (market dupes) ----------
const readMarketDupeCloudCache = async (userId, productId) => {
  if (!userId || !productId) return { dupes: null, updatedAt: null };

  const { data, error } = await supabase
    .from("market_dupe_cache")
    .select("dupes, updated_at")
    .eq("user_id", userId)
    .eq("source_product_id", productId)
    .maybeSingle();

  if (error) return { dupes: null, updatedAt: null };

  const raw = data?.dupes;
  const dupes = Array.isArray(raw) ? raw.map(normalizeDupe).filter(Boolean) : null;
  const updatedAt = data?.updated_at || null;

  if (!dupes?.length) return { dupes: null, updatedAt };
  return { dupes, updatedAt };
};

const writeMarketDupeCloudCache = async (userId, productId, dupes) => {
  if (!userId || !productId) return { ok: false };

  const safeDupes = Array.isArray(dupes) ? dupes.slice(0, 80) : [];
  const payload = {
    user_id: userId,
    source_product_id: productId,
    dupes: safeDupes,
    dupes_count: safeDupes.length,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("market_dupe_cache")
    .upsert(payload, { onConflict: "user_id,source_product_id" });

  if (error) return { ok: false };
  return { ok: true };
};

const isFreshEnough = (isoString) => {
  if (!isoString) return false;
  const t = new Date(isoString).getTime();
  if (!Number.isFinite(t)) return false;
  return Date.now() - t < CACHE_TTL_MS;
};

export default function Compare() {
  const navigate = useNavigate();
  const location = useLocation();

  const topRef = useRef(null);

  const [isInitializing, setIsInitializing] = useState(true);

  const [userId, setUserId] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const [savedDupes, setSavedDupes] = useState(new Set());
  const [skinProfile, setSkinProfile] = useState({ skinType: "normal", concerns: [] });

  const [showPaywall, setShowPaywall] = useState(false);

  // default to the OBF dupes tab so users actually see market dupes first
  const [activeTab, setActiveTab] = useState("market");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [findingDupes, setFindingDupes] = useState(false);
  const [dupeProgress, setDupeProgress] = useState(0);
  const [dupeStage, setDupeStage] = useState("Ready");
  const [dupeError, setDupeError] = useState(null);

  const [marketDupes, setMarketDupes] = useState([]);
  const [hasCachedResults, setHasCachedResults] = useState(false);
  const [cacheMeta, setCacheMeta] = useState({ source: null, updatedAt: null });

  const ingredientsCacheRef = useRef({});
  const inflightRef = useRef(new Map());
  const latestRequestKeyRef = useRef(null);
  const pendingSelectRef = useRef(null);

  const autoRanRef = useRef(new Set());

  const [myProductMatches, setMyProductMatches] = useState([]);
  const [mySearch, setMySearch] = useState("");
  const [onlySameCategory, setOnlySameCategory] = useState(true);

  const selectedIdRef = useRef(null);
  useEffect(() => {
    selectedIdRef.current = selectedProductId;
  }, [selectedProductId]);

  const selectedProduct = useMemo(
    () => analyses.find((a) => a.id === selectedProductId) || null,
    [analyses, selectedProductId]
  );

  const filteredMarketDupes = useMemo(() => {
    if (categoryFilter === "all") return marketDupes;
    return marketDupes.filter((d) => d.category === categoryFilter);
  }, [marketDupes, categoryFilter]);

  const filteredAnalyses = useMemo(() => {
    if (categoryFilter === "all") return analyses;
    const cat = categoryFilter.toLowerCase();
    return analyses.filter((a) => String(a?.category || "").toLowerCase().includes(cat));
  }, [analyses, categoryFilter]);

  const getScoreColor = (score) => {
    if (!score) return "text-muted-foreground";
    if (score >= 70) return "text-emerald-500";
    if (score >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const readUrlSelectedId = (list) => {
    const params = new URLSearchParams(location.search);
    const requestedId = params.get("productId");
    if (requestedId && list.some((a) => a.id === requestedId)) return requestedId;
    return list[0]?.id ?? null;
  };

  const syncUrlProductId = (id, { replace = true } = {}) => {
    const params = new URLSearchParams(location.search);
    params.set("productId", id);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace });
  };

  const loadIngredientsForId = async (uid, id) => {
    if (!uid || !id) return "";

    const cached = ingredientsCacheRef.current[id];
    if (typeof cached === "string") return cached;

    const { data, error } = await supabase
      .from("user_analyses")
      .select("ingredients_list")
      .eq("user_id", uid)
      .eq("id", id)
      .maybeSingle();

    if (error) return "";

    const text = data?.ingredients_list || "";
    ingredientsCacheRef.current[id] = text;
    return text;
  };

  const clearDupeState = () => {
    setDupeError(null);
    setDupeStage("Ready");
    setDupeProgress(0);
    setMarketDupes([]);
    setHasCachedResults(false);
    setCacheMeta({ source: null, updatedAt: null });
  };

  const loadCachedDupesForSelection = async (uid, pid) => {
    clearDupeState();
    setDupeStage("Checking cache");

    const local = readMarketDupeLocalCache(uid, pid);
    if (local?.length) {
      setMarketDupes(local);
      setHasCachedResults(true);
      setCacheMeta({ source: "local", updatedAt: null });
      setDupeStage("Loaded cached results");
      setDupeProgress(100);
      return { hit: true, source: "local" };
    }

    setDupeStage("Checking synced cache");
    const cloud = await readMarketDupeCloudCache(uid, pid);
    if (cloud?.dupes?.length && isFreshEnough(cloud.updatedAt)) {
      writeMarketDupeLocalCache(uid, pid, cloud.dupes);
      setMarketDupes(cloud.dupes);
      setHasCachedResults(true);
      setCacheMeta({ source: "cloud", updatedAt: cloud.updatedAt });
      setDupeStage("Loaded cached results");
      setDupeProgress(100);
      return { hit: true, source: "cloud" };
    }

    setDupeStage("No cached results");
    return { hit: false, source: null };
  };

  // OBF dupes fetch
  const findMarketDupes = async ({ force = false, productId } = {}) => {
    const pid = productId || selectedIdRef.current;
    const product = analyses.find((a) => a.id === pid) || null;

    if (!userId || !pid || !product) return;

    setDupeError(null);
    setFindingDupes(true);
    setDupeProgress(10);
    setDupeStage(force ? "Refreshing from OBF" : "Preparing search");

    const inflightKey = `${userId}:${pid}`;
    const requestId = `${inflightKey}:${Date.now()}`;
    latestRequestKeyRef.current = requestId;

    // If not forced, allow cache hits (fast)
    if (!force) {
      const local = readMarketDupeLocalCache(userId, pid);
      if (local?.length) {
        if (selectedIdRef.current !== pid) return;
        setMarketDupes(local);
        setHasCachedResults(true);
        setCacheMeta({ source: "local", updatedAt: null });
        setDupeStage("Loaded from cache");
        setDupeProgress(100);
        setFindingDupes(false);
        return;
      }

      const cloud = await readMarketDupeCloudCache(userId, pid);
      if (cloud?.dupes?.length && isFreshEnough(cloud.updatedAt)) {
        if (selectedIdRef.current !== pid) return;
        writeMarketDupeLocalCache(userId, pid, cloud.dupes);
        setMarketDupes(cloud.dupes);
        setHasCachedResults(true);
        setCacheMeta({ source: "cloud", updatedAt: cloud.updatedAt });
        setDupeStage("Loaded from cache");
        setDupeProgress(100);
        setFindingDupes(false);
        return;
      }
    }

    const inflightExisting = inflightRef.current.get(inflightKey);
    if (inflightExisting) {
      try {
        const result = await inflightExisting;
        if (latestRequestKeyRef.current !== requestId) return;
        if (selectedIdRef.current !== pid) return;

        if (result?.needsRetry) return result;

        const dupes = Array.isArray(result?.dupes) ? result.dupes : [];

        setMarketDupes(dupes);
        setHasCachedResults(dupes?.length > 0);
        setCacheMeta({ source: "fresh", updatedAt: new Date().toISOString() });
        setDupeStage("Results ready");
        setDupeProgress(100);
        return result?.ok ? result : { ok: true, needsRetry: false, dupesCount: dupes.length };
      } catch {
        if (latestRequestKeyRef.current !== requestId) return;
        if (selectedIdRef.current !== pid) return;

        setDupeError("Failed to find dupes");
        setDupeStage("Error");
        setDupeProgress(100);
        return { ok: false, needsRetry: false, reason: "error" };
      } finally {
        if (latestRequestKeyRef.current === requestId) setFindingDupes(false);
      }
      return;
    }

    const promise = (async () => {
      setDupeStage("Loading ingredients");
      setDupeProgress(30);

      const ingredientText = await loadIngredientsForId(userId, pid);
      const ingredients = String(ingredientText || "")
        .split(/[,;\n]+/)
        .map((i) => i.trim())
        .filter(Boolean);

      // Gate. No ingredients yet means scan still processing.
      if (ingredients.length < 5 && !product?.product_name) {
        setDupeStage("Scan still processing. Waiting for ingredients");
        setDupeProgress(35);
        setFindingDupes(false);
        return { ok: false, needsRetry: true, reason: "ingredients_not_ready" };
      }

      setDupeStage("Searching OBF dupes");
      setDupeProgress(60);

      const data = await invokeFunction("find-dupes", {
        sourceProductId: pid,
        scanKey: `${userId}:${pid}`,
        productName: product.product_name,
        brand: product.brand,
        ingredients,
        category: product.category || "face",
        skinType: skinProfile.skinType,
        concerns: skinProfile.concerns,
      });

      if (data?.error) throw new Error(String(data.error));

      const rawDupes = Array.isArray(data?.dupes) ? data.dupes : [];
      const normalizedDupes = rawDupes.map(normalizeDupe).filter(Boolean);

      writeMarketDupeLocalCache(userId, pid, normalizedDupes);
      await writeMarketDupeCloudCache(userId, pid, normalizedDupes);

      return { ok: true, needsRetry: false, dupesCount: normalizedDupes.length, dupes: normalizedDupes };
    })();

    inflightRef.current.set(inflightKey, promise);

    try {
      const result = await promise;
      if (latestRequestKeyRef.current !== requestId) return;
      if (selectedIdRef.current !== pid) return;

      if (result?.needsRetry) return result;

      const dupes = Array.isArray(result?.dupes) ? result.dupes : [];

      setMarketDupes(dupes);
      setHasCachedResults(Array.isArray(dupes) && dupes.length > 0);
      setCacheMeta({ source: "fresh", updatedAt: new Date().toISOString() });
      setDupeStage(dupes?.length ? "Results ready" : "No results found");
      setDupeProgress(100);

      if (!dupes?.length) {
        toast({ title: "No dupes found", description: "Try a different base product." });
      } else {
        toast({ title: "Dupes found", description: `Found ${dupes.length} similar products.` });
      }
      return result ?? { ok: true, needsRetry: false, dupesCount: dupes.length };
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const friendlyMessage =
        message.includes("402") || message.includes("Payment Required")
          ? "Dupe search is temporarily unavailable. Try again later."
          : "Failed to find dupes. Try again.";

      if (latestRequestKeyRef.current !== requestId) return;
      if (selectedIdRef.current !== pid) return;

      setDupeError(friendlyMessage);
      setDupeStage("Error");
      setDupeProgress(100);

      toast({ title: "Error finding dupes", description: friendlyMessage, variant: "destructive" });
      return { ok: false, needsRetry: false, reason: "error" };
    } finally {
      inflightRef.current.delete(inflightKey);
      if (latestRequestKeyRef.current === requestId) setFindingDupes(false);
    }
  };

  const selectProduct = async (id, opts = {}) => {
    if (!id) return;

    selectedIdRef.current = id;
    setSelectedProductId(id);

    if (!opts.skipUrl) syncUrlProductId(id, { replace: true });

    if (opts.goToMarket) setActiveTab("market");
    if (opts.scrollTop) topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (!userId) return;

    await loadCachedDupesForSelection(userId, id);
    loadIngredientsForId(userId, id).catch(() => {});

    if (opts.autoFindDupes) {
      await findMarketDupes({ force: false, productId: id });
    } else {
      const local = readMarketDupeLocalCache(userId, id);
      const cloud = await readMarketDupeCloudCache(userId, id);
      const hasAny = Boolean(local?.length) || Boolean(cloud?.dupes?.length);

      if (!hasAny && !autoRanRef.current.has(id)) {
        const res = await findMarketDupes({ force: true, productId: id });

        // Ingredients not ready. Do not lock out future auto runs.
        if (res?.needsRetry) {
          setTimeout(() => {
            // Try once more after DB finishes saving ingredients_list
            findMarketDupes({ force: true, productId: id });
          }, 1200);
          return;
        }

        // Mark as auto ran only after a real attempt
        autoRanRef.current.add(id);
      }
    }
  };

  const toggleSaveDupe = async (dupe) => {
    if (!userId || !selectedProductId) return;

    const safeName = norm(dupe?.name);
    const safeBrand = norm(dupe?.brand);
    const savedKey = savedKeyForMarketDupe({ name: safeName, brand: safeBrand }, selectedProductId);
    const isSaved = savedDupes.has(savedKey);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_dupes")
        .delete()
        .eq("user_id", userId)
        .eq("source_product_id", selectedProductId)
        .eq("product_name", safeName)
        .eq("brand", safeBrand);

      if (!error) {
        setSavedDupes((prev) => {
          const next = new Set(prev);
          next.delete(savedKey);
          return next;
        });
        toast({ title: "Removed from favorites" });
      }
      return;
    }

    const { error } = await supabase.from("saved_dupes").insert({
      user_id: userId,
      source_product_id: selectedProductId,
      product_name: safeName,
      brand: safeBrand,
      image_url: dupe?.imageUrl || null,
      price_estimate: dupe?.price ?? null,
      saved_at: new Date().toISOString(),
    });

    if (!error) {
      setSavedDupes((prev) => new Set(prev).add(savedKey));
      toast({ title: "Saved to favorites" });
    }
  };

  // ---------- INIT ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth?.user) {
          navigate("/auth");
          return;
        }
        if (cancelled) return;

        const uid = auth.user.id;
        setUserId(uid);

        // 1) Load Previous Scans from local cache first
        const cached = readAnalysesLocalCache(uid);
        if (cached?.items?.length) {
          const uniqueCached = Array.from(new Map(cached.items.map((a) => [a.id, a])).values());
          setAnalyses(uniqueCached);

          const initialIdFromCache = readUrlSelectedId(uniqueCached);
          selectedIdRef.current = initialIdFromCache;
          setSelectedProductId(initialIdFromCache);

          setIsInitializing(false);

          if (initialIdFromCache) {
            loadCachedDupesForSelection(uid, initialIdFromCache).catch(() => {});
            loadIngredientsForId(uid, initialIdFromCache).catch(() => {});
          }
        }

        // 2) Always refresh from Supabase after (source of truth)
        const { data: analysesData } = await supabase
          .from("user_analyses")
          .select("id, product_name, brand, epiq_score, product_price, category, analyzed_at, image_url")
          .eq("user_id", uid)
          .order("analyzed_at", { ascending: false })
          .limit(50);

        if (cancelled) return;

        const list = Array.isArray(analysesData) ? analysesData : [];
        const unique = Array.from(new Map(list.map((a) => [a.id, a])).values());

        setAnalyses(unique);
        writeAnalysesLocalCache(uid, unique);

        const initialId = readUrlSelectedId(unique);
        selectedIdRef.current = initialId;
        setSelectedProductId(initialId);

        setIsInitializing(false);

        Promise.all([
          supabase.from("saved_dupes").select("id, product_name, brand, source_product_id").eq("user_id", uid),
          supabase.from("profiles").select("skin_type, skin_concerns").eq("id", uid).single(),
        ]).then(([savedRes, profileRes]) => {
          if (cancelled) return;

          if (!savedRes.error && Array.isArray(savedRes.data)) {
            setSavedDupes(new Set(savedRes.data.map(savedKeyFor)));
          }

          if (!profileRes.error && profileRes.data) {
            const concerns = profileRes.data.skin_concerns;
            setSkinProfile({
              skinType: profileRes.data.skin_type || "normal",
              concerns: Array.isArray(concerns) ? concerns.map((c) => String(c)) : [],
            });
          }
        });

        if (initialId) {
          await loadCachedDupesForSelection(uid, initialId);
          loadIngredientsForId(uid, initialId).catch(() => {});

          const local = readMarketDupeLocalCache(uid, initialId);
          const cloud = await readMarketDupeCloudCache(uid, initialId);
          const hasAny = Boolean(local?.length) || Boolean(cloud?.dupes?.length);

          if (!hasAny && !autoRanRef.current.has(initialId)) {
            const res = await findMarketDupes({ force: true, productId: initialId });

            // Ingredients not ready. Do not lock out future auto runs.
            if (res?.needsRetry) {
              setTimeout(() => {
                // Try once more after DB finishes saving ingredients_list
                findMarketDupes({ force: true, productId: initialId });
              }, 1200);
              return;
            }

            // Mark as auto ran only after a real attempt
            autoRanRef.current.add(initialId);
          }
        }
      } catch {
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  // ---------- URL change handling ----------
  useEffect(() => {
    if (!analyses.length) return;

    const params = new URLSearchParams(location.search);
    const pid = params.get("productId");

    if (!pid) return;
    if (!analyses.some((a) => a.id === pid)) return;

    // user not ready yet, queue it
    if (!userId) {
      pendingSelectRef.current = pid;
      return;
    }

    if (pid === selectedProductId) return;

    selectProduct(pid, { skipUrl: true });
  }, [location.search, analyses, selectedProductId, userId]);

  useEffect(() => {
    if (!userId) return;
    const pid = pendingSelectRef.current;
    if (!pid) return;

    pendingSelectRef.current = null;

    if (pid !== selectedProductId) {
      selectProduct(pid, { skipUrl: true });
      return;
    }

    // pid already selected, but we still need to load dupes for it
    loadCachedDupesForSelection(userId, pid).then(async (res) => {
      if (!res?.hit && !autoRanRef.current.has(pid)) {
        const result = await findMarketDupes({ force: true, productId: pid });

        // Ingredients not ready. Do not lock out future auto runs.
        if (result?.needsRetry) {
          setTimeout(() => {
            // Try once more after DB finishes saving ingredients_list
            findMarketDupes({ force: true, productId: pid });
          }, 1200);
          return;
        }

        // Mark as auto ran only after a real attempt
        autoRanRef.current.add(pid);
      }
    });
  }, [userId, selectedProductId]);

  // ---------- My Products Match computation ----------
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!userId || !selectedProductId || analyses.length < 2) {
        setMyProductMatches([]);
        return;
      }

      const ids = analyses.map((a) => a.id).filter(Boolean);

      const { data, error } = await supabase
        .from("user_analyses")
        .select("id, ingredients_list")
        .eq("user_id", userId)
        .in("id", ids);

      if (cancelled) return;
      if (error) {
        setMyProductMatches([]);
        return;
      }

      const map = {};
      for (const row of data || []) map[row.id] = toIngredientSet(row.ingredients_list);

      const baseSet = map[selectedProductId];
      if (!baseSet?.size) {
        setMyProductMatches([]);
        return;
      }

      const baseCategory = analyses.find((a) => a.id === selectedProductId)?.category || null;

      const matches = analyses
        .filter((a) => a.id !== selectedProductId)
        .filter((a) => {
          if (!onlySameCategory) return true;
          if (!baseCategory) return true;
          return a.category === baseCategory;
        })
        .map((a) => {
          const otherSet = map[a.id];
          const { score, sharedCount, sharedSample } = jaccardScore(baseSet, otherSet);

          return {
            id: a.id,
            product_name: a.product_name,
            brand: a.brand,
            category: a.category,
            epiq_score: a.epiq_score,
            product_price: a.product_price,
            image_url: a.image_url,
            similarity: score,
            sharedCount,
            sharedSample,
          };
        })
        .filter((m) => m.similarity > 0)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 30);

      const q = mySearch.trim().toLowerCase();
      const filtered = q
        ? matches.filter((m) => `${m.product_name} ${m.brand || ""}`.toLowerCase().includes(q))
        : matches;

      setMyProductMatches(filtered);
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [userId, selectedProductId, analyses, mySearch, onlySameCategory]);

  if (isInitializing) {
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
        <div className="container mx-auto pb-24 lg:pb-8">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </AppShell>
    );
  }

  const CacheIndicator = () => {
    if (!hasCachedResults) {
      return (
        <div className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-muted-foreground">{dupeStage}</span>
        </div>
      );
    }

    const isCloud = cacheMeta.source === "cloud";
    const isLocal = cacheMeta.source === "local";
    const isFresh = cacheMeta.source === "fresh";

    return (
      <div className="flex items-center gap-2 text-sm">
        <Clock className="w-4 h-4 text-emerald-500" />
        <span className="text-emerald-600 dark:text-emerald-400">Cached results</span>

        {isLocal ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Smartphone className="w-4 h-4" />
            This device
          </span>
        ) : null}

        {isCloud ? (
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <Database className="w-4 h-4" />
            Synced
          </span>
        ) : null}

        {isFresh ? <span className="text-muted-foreground">Updated</span> : null}
      </div>
    );
  };

  const baseName = selectedProduct?.product_name || "Base product";

  return (
    <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-6">
      <main className="container mx-auto pb-24 lg:pb-8" ref={topRef}>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            Dupe Discovery
          </h1>
          <p className="text-muted-foreground mt-1">Find market dupes from OBF, then compare against your base scan.</p>
        </div>

        {analyses.length < 1 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analyze a Product First</h3>
              <p className="text-muted-foreground mb-4">You need at least one analyzed product.</p>
              <Button onClick={() => navigate("/upload")}>Analyze a Product</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6 w-full">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Base product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select
                    value={selectedProductId || ""}
                    onValueChange={async (id) => {
                      await selectProduct(id, { goToMarket: activeTab === "market" });
                    }}
                  >
                    <SelectTrigger className="w-full sm:flex-1">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {analyses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.product_name}
                          {a.epiq_score ? (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {a.epiq_score}
                            </Badge>
                          ) : null}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={async () => {
                      await findMarketDupes({ force: true, productId: selectedIdRef.current });
                      setActiveTab("market");
                      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    disabled={findingDupes || !selectedProduct}
                    className="gap-2 whitespace-nowrap"
                  >
                    {findingDupes ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Refreshing
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Refresh from OBF
                      </>
                    )}
                  </Button>
                </div>

                {selectedProduct ? (
                  <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{selectedProduct.product_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{selectedProduct.brand}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${getScoreColor(selectedProduct.epiq_score)}`}>
                        {selectedProduct.epiq_score || "—"}
                      </p>
                      {selectedProduct.product_price ? (
                        <p className="text-sm text-muted-foreground">${selectedProduct.product_price}</p>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                <CacheIndicator />

                {findingDupes ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{dupeStage}</span>
                      <span>{dupeProgress}%</span>
                    </div>
                    <Progress value={dupeProgress} className="h-2" />
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
              <TabsList className="h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground grid w-full max-w-lg grid-cols-2 gap-1 box-border overflow-hidden">
                <TabsTrigger value="market" className="gap-2 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Scanned matches
                </TabsTrigger>

                <TabsTrigger value="previous" className="gap-2 inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium">
                  <Database className="w-4 h-4" />
                  Previous scans
                </TabsTrigger>
              </TabsList>

              {activeTab === "market" || activeTab === "previous" ? (
                <div className="flex gap-2 flex-wrap">
                  {CATEGORY_FILTERS.map((cat) => (
                    <Button
                      key={cat}
                      variant={categoryFilter === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(cat)}
                      className="capitalize"
                    >
                      {cat === "all" ? "All" : cat}
                    </Button>
                  ))}
                </div>
              ) : null}

              <TabsContent value="market" className="space-y-6">
                {dupeError ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center space-y-2">
                      <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground/60" />
                      <p className="text-sm text-muted-foreground">{dupeError}</p>
                      <Button
                        onClick={async () => {
                          await findMarketDupes({ force: true, productId: selectedIdRef.current });
                        }}
                        disabled={findingDupes}
                        className="mt-4"
                      >
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                ) : filteredMarketDupes.length > 0 ? (
                  <div className="space-y-3">
                    <Card className="border-dashed">
                      <CardContent className="py-3 text-sm text-muted-foreground space-y-1">
                        <div>
                          Showing OBF market dupes compared to:{" "}
                          <span className="text-foreground font-medium">{baseName}</span>
                        </div>
                        <div>Match percent is ingredient overlap compared to your base scan.</div>
                        <div>Open a card and verify ingredients before you buy.</div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                      {filteredMarketDupes.map((dupe, idx) => {
                        const key = savedKeyForMarketDupe(dupe, selectedProductId);

                        const reactKey = dupe?.id
                          ? `${selectedProductId}:${dupe.id}`
                          : `${selectedProductId}:${norm(dupe.brand)}:${norm(dupe.name)}:${idx}`;

                        return (
                          <div key={reactKey} className="animate-fade-in" style={{ animationDelay: `${idx * 30}ms` }}>
                            <DupeCard
                              dupe={dupe}
                              isSaved={savedDupes.has(key)}
                              onToggleSave={() => toggleSaveDupe(dupe)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No market results yet</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                        Pick a base product, then tap Refresh from OBF.
                      </p>
                      <Button
                        onClick={async () => {
                          await findMarketDupes({ force: true, productId: selectedIdRef.current });
                        }}
                        disabled={findingDupes || !selectedProduct}
                      >
                        Search OBF dupes
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="previous" className="space-y-6">
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">Your previous scans</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <div>These are your base products you have scanned before.</div>
                    <div>We load from local cache first, then refresh from the database.</div>
                  </CardContent>
                </Card>

                {filteredAnalyses.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        {analyses.length === 0 ? "No previous scans yet." : "No scans match this category."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {filteredAnalyses.map((a) => (
                      <Card key={a.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium truncate">{a.product_name}</CardTitle>
                          <p className="text-xs text-muted-foreground truncate">{a.brand || "Unknown brand"}</p>
                        </CardHeader>

                        <CardContent className="space-y-3">
                          <div className="aspect-square rounded-lg overflow-hidden bg-muted/40">
                            <img
                              src={a.image_url || noImageFound}
                              alt={`${a.product_name} image`}
                              className={`w-full h-full ${a.image_url ? "object-cover" : "object-contain p-4"}`}
                              onError={(event) => {
                                event.currentTarget.src = noImageFound;
                                event.currentTarget.className = "w-full h-full object-contain p-4";
                              }}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="text-sm">EpiQ: {a.epiq_score ?? "—"}</div>
                            <div className="text-sm text-muted-foreground">{a.category || "—"}</div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                await selectProduct(a.id, { goToMarket: false, scrollTop: true });
                                toast({ title: "Base product updated", description: "Now review your matches." });
                              }}
                            >
                              Set as base
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                await selectProduct(a.id, {
                                  goToMarket: true,
                                  scrollTop: true,
                                  autoFindDupes: true,
                                });
                              }}
                            >
                              Set base and search dupes
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      <PaywallModal
        open={showPaywall}
        onOpenChange={setShowPaywall}
        feature="dupe_discovery"
        featureDescription="Unlock unlimited dupe discovery to find the best value products"
      />
    </AppShell>
  );
} 
