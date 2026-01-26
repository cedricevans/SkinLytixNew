import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Search, Sparkles, FlaskConical, Package, Loader2, AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { DupeCard } from "@/components/DupeCard";
import { toast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/functions-client";

const CATEGORY_FILTERS = ["all", "face", "body", "hair", "scalp"];

const norm = (v) => String(v || "").trim();

const getMarketDupeCacheKey = (userId, productId) => {
  if (!userId || !productId) return null;
  return `sl_market_dupes_${userId}_${productId}`;
};

const readMarketDupeCache = (userId, productId) => {
  const key = getMarketDupeCacheKey(userId, productId);
  if (!key) return null;

  const sources = [() => sessionStorage.getItem(key), () => localStorage.getItem(key)];
  for (const source of sources) {
    try {
      const value = source();
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      continue;
    }
  }
  return null;
};

const writeMarketDupeCache = (userId, productId, dupes) => {
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

const pickImageWithSource = (dupe) => {
  const top = dupe?.imageUrl || (Array.isArray(dupe?.images) && dupe.images[0]) || null;
  if (top) return { url: top, from: "top" };

  const obf = dupe?.obf?.imageUrl || (Array.isArray(dupe?.obf?.images) && dupe.obf.images[0]) || null;
  if (obf) return { url: obf, from: "obf" };

  return { url: null, from: "none" };
};

const normalizeDupe = (dupe, fallbackCategory) => {
  if (!dupe) return null;

  const picked = pickImageWithSource(dupe);

  const topName = dupe.name || dupe.productName || dupe.product_name || "";
  const topBrand = dupe.brand ?? dupe.brandName ?? dupe.brand_name ?? "";

  const obfName = dupe?.obf?.productName || dupe?.obf?.name || dupe?.obf?.product_name || "";
  const obfBrand = dupe?.obf?.brand ?? dupe?.obf?.brandName ?? dupe?.obf?.brand_name ?? "";

  const name = picked.from === "obf" ? (obfName || topName) : (topName || obfName);
  const brand = picked.from === "obf" ? (obfBrand || topBrand) : (topBrand || obfBrand);

  if (!name) return null;

  const price = dupe.priceEstimate ?? dupe.price ?? null;

  const ingredientsFromLists = Array.isArray(dupe.ingredientList)
    ? dupe.ingredientList
    : Array.isArray(dupe.ingredients)
      ? dupe.ingredients
      : [];

  const ingredientsFromString =
    typeof dupe.ingredients === "string"
      ? dupe.ingredients.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
      : [];

  const ingredientList = ingredientsFromLists.length ? ingredientsFromLists : ingredientsFromString;

  const images = Array.isArray(dupe.images)
    ? dupe.images
    : dupe.imageUrl
      ? [dupe.imageUrl]
      : picked.url
        ? [picked.url]
        : [];

  return {
    name: norm(name),
    brand: norm(brand),
    imageUrl: picked.url,
    price,
    matchPercent: typeof dupe.matchPercent === "number" ? dupe.matchPercent : null,
    description: dupe.description ?? null,
    category: dupe.category ?? fallbackCategory ?? null,
    whereToBuy: dupe.whereToBuy ?? null,
    images,
    ingredientList,
    storeLocation: dupe.storeLocation ?? null,
    matchedCount: dupe.matchedCount ?? null,
    sourceCount: dupe.sourceCount ?? null,
    matchScore: dupe.matchScore ?? null,
    nameScore: dupe.nameScore ?? null,
    brandScore: dupe.brandScore ?? null,
    scentScore: dupe.scentScore ?? null,
    compositeScore: dupe.compositeScore ?? null,
    obf: dupe.obf ?? {},
    productUrl: dupe.productUrl ?? null,
    highlights: Array.isArray(dupe.highlights) ? dupe.highlights : undefined,
    keyIngredients: Array.isArray(dupe.keyIngredients) ? dupe.keyIngredients : undefined,
    flags: Array.isArray(dupe.flags) ? dupe.flags : undefined,
    ingredientsCount: typeof dupe.ingredientsCount === "number" ? dupe.ingredientsCount : undefined,
    internalLink: dupe.internalLink ?? undefined,
  };
};

const savedKeyFor = ({ product_name, brand, source_product_id }) => {
  return `${norm(source_product_id)}::${norm(product_name)}::${norm(brand)}`;
};

const savedKeyForMarketDupe = ({ name, brand }, sourceProductId) => {
  return `${norm(sourceProductId)}::${norm(name)}::${norm(brand)}`;
};

export default function Compare() {
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [userId, setUserId] = useState(null);

  const [analyses, setAnalyses] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const [savedDupes, setSavedDupes] = useState(new Set());
  const [showPaywall, setShowPaywall] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("market");

  const [skinProfile, setSkinProfile] = useState({ skinType: "normal", concerns: [] });

  const [findingDupes, setFindingDupes] = useState(false);
  const [dupeProgress, setDupeProgress] = useState(0);
  const [dupeStage, setDupeStage] = useState("Ready");
  const [dupeError, setDupeError] = useState(null);

  const [marketDupes, setMarketDupes] = useState([]);

  const ingredientsCacheRef = useRef({});
  const inflightRef = useRef(new Map());
  const latestRequestKeyRef = useRef(null);

  const { effectiveTier } = useSubscription();
  const dupeLimit = effectiveTier === "pro" ? Infinity : effectiveTier === "premium" ? 5 : 2;

  const selectedProduct = useMemo(
    () => analyses.find((a) => a.id === selectedProductId) || null,
    [analyses, selectedProductId],
  );

  const filteredMarketDupes = useMemo(() => {
    if (categoryFilter === "all") return marketDupes;
    return marketDupes.filter((d) => d.category === categoryFilter);
  }, [marketDupes, categoryFilter]);

  const myProductMatches = useMemo(() => {
    return [];
  }, []);

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

    if (error) {
      console.error("loadIngredientsForId error:", error);
      return "";
    }

    const text = data?.ingredients_list || "";
    ingredientsCacheRef.current[id] = text;
    return text;
  };

  const hydrateCachedDupesForSelection = (uid, pid) => {
    if (!uid || !pid) return;
    setDupeError(null);

    const cached = readMarketDupeCache(uid, pid);
    if (cached && cached.length > 0) {
      setMarketDupes(cached);
      setDupeStage("Showing your last results");
      setDupeProgress(100);
      return;
    }

    setMarketDupes([]);
    setDupeStage("No saved results yet. Tap Find Market Dupes.");
    setDupeProgress(0);
  };

  const findMarketDupes = async ({ force = false } = {}) => {
    if (!userId || !selectedProductId || !selectedProduct) return;

    setDupeError(null);
    setFindingDupes(true);
    setDupeProgress(10);
    setDupeStage("Preparing");

    const requestKey = `${userId}:${selectedProductId}:${force ? "refresh" : "cache-ok"}`;
    latestRequestKeyRef.current = requestKey;

    if (!force) {
      const cached = readMarketDupeCache(userId, selectedProductId);
      if (cached && cached.length > 0) {
        setMarketDupes(cached);
        setDupeStage("Loaded saved results");
        setDupeProgress(100);
        setFindingDupes(false);
        return;
      }
    }

    const inflightExisting = inflightRef.current.get(requestKey);
    if (inflightExisting) {
      try {
        const dupes = await inflightExisting;
        if (latestRequestKeyRef.current !== requestKey) return;
        setMarketDupes(dupes);
        setDupeStage("Results ready");
        setDupeProgress(100);
      } catch (e) {
        if (latestRequestKeyRef.current !== requestKey) return;
        setDupeError("Failed to find dupes");
        setDupeStage("Error");
        setDupeProgress(100);
      } finally {
        if (latestRequestKeyRef.current === requestKey) setFindingDupes(false);
      }
      return;
    }

    const promise = (async () => {
      setDupeStage("Loading ingredients");
      setDupeProgress(30);

      const ingredientText = await loadIngredientsForId(userId, selectedProductId);

      const ingredients = String(ingredientText || "")
        .split(/[,;\n]+/)
        .map((i) => i.trim())
        .filter(Boolean);

      setDupeStage("Finding market matches");
      setDupeProgress(60);

      const data = await invokeFunction("find-dupes", {
        productName: selectedProduct.product_name,
        brand: selectedProduct.brand,
        ingredients,
        category: selectedProduct.category || "face",
        skinType: skinProfile.skinType,
        concerns: skinProfile.concerns,
      });

      if (data?.error) {
        throw new Error(String(data.error));
      }

      const rawDupes = Array.isArray(data?.dupes) ? data.dupes : [];
      const normalizedDupes = rawDupes
        .map((d) => normalizeDupe(d, selectedProduct.category || "face"))
        .filter(Boolean);

      writeMarketDupeCache(userId, selectedProductId, normalizedDupes);

      return normalizedDupes;
    })();

    inflightRef.current.set(requestKey, promise);

    try {
      const dupes = await promise;
      if (latestRequestKeyRef.current !== requestKey) return;

      if (!dupes || dupes.length === 0) {
        setMarketDupes([]);
        setDupeStage("No results found. Try again.");
        setDupeProgress(100);
        return;
      }

      setMarketDupes(dupes);
      setDupeStage("Results ready");
      setDupeProgress(100);
    } catch (error) {
      console.error("findMarketDupes error:", error);

      const message = error instanceof Error ? error.message : "";
      const friendlyMessage =
        message.includes("402") || message.includes("Payment Required")
          ? "Dupe search is temporarily unavailable. Try again later."
          : "Failed to find dupes. Try again.";

      if (latestRequestKeyRef.current !== requestKey) return;

      setDupeError(friendlyMessage);
      setDupeStage("Error");
      setDupeProgress(100);

      toast({
        title: "Error finding dupes",
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      inflightRef.current.delete(requestKey);
      if (latestRequestKeyRef.current === requestKey) setFindingDupes(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setLoadingProgress(10);

        const { data: auth, error: authErr } = await supabase.auth.getUser();
        if (authErr) console.error("auth.getUser error:", authErr);

        const user = auth?.user;
        if (!user) {
          navigate("/auth");
          return;
        }

        if (cancelled) return;

        setUserId(user.id);
        setLoadingProgress(30);

        const [analysesRes, savedRes, profileRes] = await Promise.all([
          supabase
            .from("user_analyses")
            .select("id, product_name, brand, epiq_score, product_price, category, image_url")
            .eq("user_id", user.id)
            .order("analyzed_at", { ascending: false }),
          supabase
            .from("saved_dupes")
            .select("id, product_name, brand, source_product_id")
            .eq("user_id", user.id),
          supabase.from("profiles").select("skin_type, skin_concerns").eq("id", user.id).single(),
        ]);

        if (cancelled) return;

        setLoadingProgress(70);

        const list = Array.isArray(analysesRes.data) ? analysesRes.data : [];
        const unique = Array.from(new Map(list.map((a) => [a.id, a])).values());
        setAnalyses(unique);

        const initialId = readUrlSelectedId(unique);
        setSelectedProductId(initialId);

        if (!savedRes.error && Array.isArray(savedRes.data)) {
          setSavedDupes(new Set(savedRes.data.map(savedKeyFor)));
        } else if (savedRes.error) {
          console.error("saved_dupes fetch error:", savedRes.error);
        }

        if (!profileRes.error && profileRes.data) {
          const concerns = profileRes.data.skin_concerns;
          setSkinProfile({
            skinType: profileRes.data.skin_type || "normal",
            concerns: Array.isArray(concerns) ? concerns.map((c) => String(c)) : [],
          });
        }

        setLoadingProgress(100);
        setTimeout(() => {
          if (!cancelled) setLoading(false);
        }, 150);
      } catch (e) {
        console.error("Compare init fatal:", e);
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.search]);

  useEffect(() => {
    if (!userId || !selectedProductId) return;

    setDupeError(null);
    setDupeProgress(0);
    setDupeStage("Ready");
    hydrateCachedDupesForSelection(userId, selectedProductId);

    loadIngredientsForId(userId, selectedProductId).catch(() => {});
  }, [userId, selectedProductId]);

  if (loading) {
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
        <div className="container mx-auto pb-24 lg:pb-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-8" />
          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Loading your comparisons</span>
              <span>{loadingProgress}%</span>
            </div>
            <Progress value={loadingProgress} className="h-2" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="aspect-[3/4] w-full" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-6">
      <main className="container mx-auto pb-24 lg:pb-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 -ml-2">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            Dupe Discovery
          </h1>
          <p className="text-muted-foreground mt-1">Compare ingredient overlap to find affordable alternatives.</p>
        </div>

        <div>
          {analyses.length < 1 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold text-lg mb-2">Analyze a Product First</h3>
                <p className="text-muted-foreground mb-4">We need at least one analyzed product to find dupes for</p>
                <Button onClick={() => navigate("/upload")}>Analyze a Product</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-6 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
                <div className="min-w-0 space-y-6">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-medium">Select a product to find dupes for</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <Select value={selectedProductId || ""} onValueChange={setSelectedProductId}>
                          <SelectTrigger className="w-full sm:flex-1">
                            <SelectValue placeholder="Choose a product" />
                          </SelectTrigger>
                          <SelectContent>
                            {analyses.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                <span className="flex items-center gap-2">
                                  {a.product_name}
                                  {a.epiq_score && (
                                    <Badge variant="secondary" className="text-xs">
                                      {a.epiq_score}
                                    </Badge>
                                  )}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <Button
                          onClick={() => findMarketDupes({ force: true })}
                          disabled={findingDupes || !selectedProduct}
                          className="gap-2"
                        >
                          {findingDupes ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Refreshing...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Find Market Dupes
                            </>
                          )}
                        </Button>
                      </div>

                      {selectedProduct && (
                        <div className="p-3 bg-muted/50 rounded-lg flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{selectedProduct.product_name}</p>
                            <p className="text-sm text-muted-foreground truncate">{selectedProduct.brand}</p>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold text-lg ${getScoreColor(selectedProduct.epiq_score)}`}>
                              {selectedProduct.epiq_score || "—"}
                            </p>
                            {selectedProduct.product_price && (
                              <p className="text-sm text-muted-foreground">${selectedProduct.product_price}</p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="text-sm text-muted-foreground">
                        <span className="mr-2">Status:</span>
                        <span>{dupeStage}</span>
                      </div>

                      {findingDupes && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>Searching</span>
                            <span>{dupeProgress}%</span>
                          </div>
                          <Progress value={dupeProgress} className="h-2" />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="hidden lg:block min-w-0 space-y-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium">Quick Overview</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-sm text-muted-foreground">Market dupes</p>
                        <p className="text-2xl font-semibold">{filteredMarketDupes.length}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-sm text-muted-foreground">Saved favorites</p>
                        <p className="text-2xl font-semibold">{savedDupes.size}</p>
                      </div>
                      <div className="rounded-lg border border-border p-3">
                        <p className="text-sm text-muted-foreground">Active filter</p>
                        <p className="text-2xl font-semibold capitalize">{categoryFilter}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {selectedProduct && (
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 w-full">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="market" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Market Dupes
                    </TabsTrigger>
                    <TabsTrigger value="myproducts" className="gap-2">
                      <Package className="w-4 h-4" />
                      My Products
                    </TabsTrigger>
                  </TabsList>

                  <p className="text-sm text-muted-foreground">
                    Market Dupes shows your last results instantly. Tap Find Market Dupes to refresh.
                  </p>

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

                  <TabsContent value="market" className="space-y-6">
                    {dupeError ? (
                      <Card className="border-dashed">
                        <CardContent className="py-12 text-center space-y-2">
                          <AlertTriangle className="w-10 h-10 mx-auto text-muted-foreground/60" />
                          <p className="text-sm text-muted-foreground">{dupeError}</p>
                        </CardContent>
                      </Card>
                    ) : filteredMarketDupes.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {filteredMarketDupes.map((dupe, idx) => {
                          const key = savedKeyForMarketDupe(dupe, selectedProductId);
                          return (
                            <div
                              key={`${dupe.brand}-${dupe.name}-${idx}`}
                              className={`animate-fade-in${idx === filteredMarketDupes.length - 1 ? " mb-5 sm:mb-0" : ""}`}
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <DupeCard
                                dupe={dupe}
                                isSaved={savedDupes.has(key)}
                                onToggleSave={async () => {
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
                                    } else {
                                      console.error("Error removing saved dupe:", error);
                                      toast({
                                        title: "Failed to remove favorite",
                                        description: error.message || "Try again later.",
                                        variant: "destructive",
                                      });
                                    }
                                  } else {
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
                                      toast({ title: "Saved to favorites ❤️" });
                                    } else {
                                      console.error("Error saving dupe:", error);
                                      toast({
                                        title: "Failed to save favorite",
                                        description: error.message || "Try again later.",
                                        variant: "destructive",
                                      });
                                    }
                                  }
                                }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-medium mb-2">No saved dupes yet</h3>
                          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                            Tap Find Market Dupes to run a fresh search. Next time, results show instantly here.
                          </p>
                          <Button onClick={() => findMarketDupes({ force: true })} disabled={findingDupes} className="gap-2">
                            {findingDupes ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Searching...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Find Market Dupes
                              </>
                            )}
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="myproducts" className="space-y-6">
                    {Array.isArray(myProductMatches) && myProductMatches.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {myProductMatches.map((match, idx) => {
                          const productName = norm(match?.product?.product_name);
                          const brand = norm(match?.product?.brand || "");
                          const key = `${norm(selectedProductId)}::${productName}::${brand}`;

                          return (
                            <div
                              key={match.product.id}
                              className="animate-fade-in"
                              style={{ animationDelay: `${idx * 50}ms` }}
                            >
                              <DupeCard
                                dupe={{
                                  name: match.product.product_name,
                                  brand: match.product.brand || "Unknown Brand",
                                  imageUrl: match.product.image_url || null,
                                  price: match.product.product_price ? `$${match.product.product_price}` : null,
                                  matchPercent: match.overlapPercent ?? null,
                                  description: null,
                                  category: match.product.category || "face",
                                  whereToBuy: null,
                                }}
                                isSaved={savedDupes.has(key)}
                                onToggleSave={() => {}}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                          <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                          <p className="text-muted-foreground">
                            Analyze at least 2 products to compare your collection.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </div>
          )}
        </div>
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