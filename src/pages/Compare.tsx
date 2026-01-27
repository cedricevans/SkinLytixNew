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

const CATEGORY_FILTERS = ["all", "face", "body", "hair", "scalp"];
const norm = (v) => String(v || "").trim();

const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

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
const normalizeDupe = (dupe) => {
  if (!dupe) return null;

  return {
    id: dupe.id || null,
    name: dupe.name || "",
    brand: dupe.brand || null,
    imageUrl: dupe.imageUrl || null,
    images: Array.isArray(dupe.images) ? dupe.images : [],
    price: dupe.priceEstimate || dupe.price || null,
    matchPercent: dupe.matchPercent ?? null,
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
    productUrl: dupe.productUrl ?? null,

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

// ---------- local cache ----------
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

// ---------- Supabase cache ----------
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

  const findMarketDupes = async ({ force = false, productId } = {}) => {
    const pid = productId || selectedIdRef.current;
    const product = analyses.find((a) => a.id === pid) || null;

    if (!userId || !pid || !product) return;

    setDupeError(null);
    setFindingDupes(true);
    setDupeProgress(10);
    setDupeStage("Preparing search");

    const inflightKey = `${userId}:${pid}`;
    const requestId = `${inflightKey}:${Date.now()}`;
    latestRequestKeyRef.current = requestId;

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
        const dupes = await inflightExisting;
        if (latestRequestKeyRef.current !== requestId) return;
        if (selectedIdRef.current !== pid) return;

        setMarketDupes(dupes);
        setHasCachedResults(dupes?.length > 0);
        setCacheMeta({ source: "fresh", updatedAt: new Date().toISOString() });
        setDupeStage("Results ready");
        setDupeProgress(100);
      } catch {
        if (latestRequestKeyRef.current !== requestId) return;
        if (selectedIdRef.current !== pid) return;

        setDupeError("Failed to find dupes");
        setDupeStage("Error");
        setDupeProgress(100);
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

      setDupeStage("Searching for dupes");
      setDupeProgress(60);

      const data = await invokeFunction("find-dupes", {
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

      return normalizedDupes;
    })();

    inflightRef.current.set(inflightKey, promise);

    try {
      const dupes = await promise;
      if (latestRequestKeyRef.current !== requestId) return;
      if (selectedIdRef.current !== pid) return;

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
        autoRanRef.current.add(id);
        await findMarketDupes({ force: true, productId: id });
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

        const { data: analysesData } = await supabase
          .from("user_analyses")
          .select("id, product_name, brand, epiq_score, product_price, category, analyzed_at")
          .eq("user_id", uid)
          .order("analyzed_at", { ascending: false })
          .limit(50);

        if (cancelled) return;

        const list = Array.isArray(analysesData) ? analysesData : [];
        const unique = Array.from(new Map(list.map((a) => [a.id, a])).values());
        setAnalyses(unique);

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
            autoRanRef.current.add(initialId);
            await findMarketDupes({ force: true, productId: initialId });
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
    if (pid === selectedProductId) return;
    if (!analyses.some((a) => a.id === pid)) return;

    selectProduct(pid, { skipUrl: true });
  }, [location.search, analyses, selectedProductId]);

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
          <p className="text-muted-foreground mt-1">Find lookalike products by ingredient overlap.</p>
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
                        Refresh results
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
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="market" className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Market Dupes
                </TabsTrigger>
                <TabsTrigger value="myproducts" className="gap-2">
                  <Package className="w-4 h-4" />
                  My Scanned Matches
                </TabsTrigger>
              </TabsList>

              {activeTab === "market" ? (
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
                          Showing market alternatives compared to:{" "}
                          <span className="text-foreground font-medium">{baseName}</span>
                        </div>
                        <div>Ingredient match shows overlap with your base product.</div>
                        <div>Open a card and review the ingredients before you buy.</div>
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
                      <h3 className="text-lg font-medium mb-2">No results yet</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                        Pick a base product, then tap Refresh results.
                      </p>
                      <Button
                        onClick={async () => {
                          await findMarketDupes({ force: true, productId: selectedIdRef.current });
                        }}
                        disabled={findingDupes || !selectedProduct}
                      >
                        Search dupes
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="myproducts" className="space-y-6">
                <Card className="border-dashed">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">What this tab shows</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground space-y-2">
                    <div>
                      Based on your base product, these are your scanned products with the most similar ingredient lists.
                    </div>
                    <div>Ingredient match shows overlap with your base product.</div>
                    <div>Tap Set as base to compare everything to that product.</div>
                    <div>Tap Set base and search dupes to jump to Market Dupes.</div>

                    <div className="flex gap-2 flex-wrap pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      >
                        Change base product
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setActiveTab("market");
                          topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                        }}
                      >
                        Go to Market Dupes
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {analyses.length < 2 ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Analyze at least 2 products.</p>
                    </CardContent>
                  </Card>
                ) : !selectedProduct ? (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <AlertTriangle className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">Pick a base product first.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-medium">Filters</CardTitle>
                      </CardHeader>
                      <CardContent className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
                        <div className="flex gap-2 flex-wrap">
                          <Button size="sm" variant="outline" onClick={() => setOnlySameCategory((v) => !v)}>
                            {onlySameCategory ? "Same category" : "All categories"}
                          </Button>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                          <input
                            value={mySearch}
                            onChange={(e) => setMySearch(e.target.value)}
                            placeholder="Search your scans"
                            className="w-full md:w-[280px] h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
                          />
                          <Button variant="outline" onClick={() => setMySearch("")} className="whitespace-nowrap">
                            Clear
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    {myProductMatches.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {myProductMatches.map((m, idx) => {
                          const k = `${selectedProductId}:${m.id}:${idx}`;

                          return (
                            <Card key={k} className="overflow-hidden">
                              <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium truncate">{m.product_name}</CardTitle>
                                <p className="text-xs text-muted-foreground truncate">{m.brand || "Unknown brand"}</p>
                              </CardHeader>

                              <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-xs">
                                    Ingredient match {m.similarity}%
                                  </Badge>
                                  <span className="text-xs text-muted-foreground">Shared {m.sharedCount}</span>
                                </div>

                                <Progress value={m.similarity} className="h-2" />

                                {m.sharedSample?.length ? (
                                  <div className="flex flex-wrap gap-2">
                                    {m.sharedSample.slice(0, 6).map((x, i) => (
                                      <Badge key={`${k}:ing:${i}`} variant="outline" className="text-[10px]">
                                        {x}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : null}

                                <div className="flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      await selectProduct(m.id, { goToMarket: false, scrollTop: true });
                                      toast({ title: "Base product updated", description: "Now review your matches." });
                                    }}
                                  >
                                    Set as base
                                  </Button>

                                  <Button
                                    size="sm"
                                    onClick={async () => {
                                      await selectProduct(m.id, {
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
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">
                            No matches yet. Scan more products with full ingredient lists.
                          </p>
                        </CardContent>
                      </Card>
                    )}
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