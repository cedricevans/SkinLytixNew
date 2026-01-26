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
} from "lucide-react";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { DupeCard } from "@/components/DupeCard";
import { toast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/functions-client";

const CATEGORY_FILTERS = ["all", "face", "body", "hair", "scalp"];
const norm = (v) => String(v || "").trim();

// ==============================
// CACHE
// ==============================

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
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {}
  }
  return null;
};

const writeMarketDupeCache = (userId, productId, dupes) => {
  const key = getMarketDupeCacheKey(userId, productId);
  if (!key) return;

  const payload = JSON.stringify(dupes);
  try { sessionStorage.setItem(key, payload); } catch {}
  try { localStorage.setItem(key, payload); } catch {}
};

// ==============================
// NORMALIZE
// ==============================

const normalizeDupe = (dupe) => {
  if (!dupe) return null;

  return {
    id: dupe.id,
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
  };
};

const savedKeyForMarketDupe = ({ name, brand }, sourceProductId) => {
  return `${norm(sourceProductId)}::${norm(name)}::${norm(brand)}`;
};

const savedKeyFor = ({ product_name, brand, source_product_id }) => {
  return `${norm(source_product_id)}::${norm(product_name)}::${norm(brand)}`;
};

// ==============================
// COMPONENT
// ==============================

export default function Compare() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isInitializing, setIsInitializing] = useState(true);

  const [userId, setUserId] = useState(null);
  const [analyses, setAnalyses] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const [savedDupes, setSavedDupes] = useState(new Set());
  const [skinProfile, setSkinProfile] = useState({ skinType: "normal", concerns: [] });

  const [showPaywall, setShowPaywall] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("market");

  const [findingDupes, setFindingDupes] = useState(false);
  const [dupeProgress, setDupeProgress] = useState(0);
  const [dupeStage, setDupeStage] = useState("Ready");
  const [dupeError, setDupeError] = useState(null);

  const [marketDupes, setMarketDupes] = useState([]);
  const [hasCachedResults, setHasCachedResults] = useState(false);

  const ingredientsCacheRef = useRef({});
  const inflightRef = useRef(new Map());
  const latestRequestKeyRef = useRef(null);

  // Prevent auto-run loops per product
  const autoRanRef = useRef(new Set());

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

  const loadCachedDupesForSelection = (uid, pid) => {
    const cached = readMarketDupeCache(uid, pid);

    if (cached && cached.length > 0) {
      setMarketDupes(cached);
      setHasCachedResults(true);
      setDupeStage("Showing cached results");
      setDupeProgress(100);
      setDupeError(null);
      return true;
    }

    setMarketDupes([]);
    setHasCachedResults(false);
    setDupeStage("No cached results");
    setDupeProgress(0);
    setDupeError(null);
    return false;
  };

  const findMarketDupes = async ({ force = false } = {}) => {
    if (!userId || !selectedProductId || !selectedProduct) return;

    setDupeError(null);
    setFindingDupes(true);
    setDupeProgress(10);
    setDupeStage("Preparing search");

    const inflightKey = `${userId}:${selectedProductId}`;
    const requestId = `${inflightKey}:${Date.now()}`;
    latestRequestKeyRef.current = requestId;

    if (!force) {
      const cached = readMarketDupeCache(userId, selectedProductId);
      if (cached && cached.length > 0) {
        setMarketDupes(cached);
        setHasCachedResults(true);
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
        setMarketDupes(dupes);
        setHasCachedResults(true);
        setDupeStage("Results ready");
        setDupeProgress(100);
      } catch {
        if (latestRequestKeyRef.current !== requestId) return;
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

      const ingredientText = await loadIngredientsForId(userId, selectedProductId);
      const ingredients = String(ingredientText || "")
        .split(/[,;\n]+/)
        .map((i) => i.trim())
        .filter(Boolean);

      setDupeStage("Searching for dupes");
      setDupeProgress(60);

      const data = await invokeFunction("find-dupes", {
        productName: selectedProduct.product_name,
        brand: selectedProduct.brand,
        ingredients,
        category: selectedProduct.category || "face",
        skinType: skinProfile.skinType,
        concerns: skinProfile.concerns,
      });

      if (data?.error) throw new Error(String(data.error));

      const rawDupes = Array.isArray(data?.dupes) ? data.dupes : [];
      const normalizedDupes = rawDupes.map(normalizeDupe).filter(Boolean);

      writeMarketDupeCache(userId, selectedProductId, normalizedDupes);

      return normalizedDupes;
    })();

    inflightRef.current.set(inflightKey, promise);

    try {
      const dupes = await promise;
      if (latestRequestKeyRef.current !== requestId) return;

      setMarketDupes(dupes);
      setHasCachedResults(Array.isArray(dupes) && dupes.length > 0);
      setDupeStage(dupes?.length ? "Results ready" : "No results found");
      setDupeProgress(100);

      if (!dupes?.length) {
        toast({ title: "No dupes found", description: "Try searching for a different product." });
      } else {
        toast({ title: "Dupes found!", description: `Found ${dupes.length} similar products.` });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const friendlyMessage =
        message.includes("402") || message.includes("Payment Required")
          ? "Dupe search is temporarily unavailable. Try again later."
          : "Failed to find dupes. Try again.";

      if (latestRequestKeyRef.current !== requestId) return;

      setDupeError(friendlyMessage);
      setDupeStage("Error");
      setDupeProgress(100);

      toast({ title: "Error finding dupes", description: friendlyMessage, variant: "destructive" });
    } finally {
      inflightRef.current.delete(inflightKey);
      if (latestRequestKeyRef.current === requestId) setFindingDupes(false);
    }
  };

  const handleSelectProduct = (id) => {
    setSelectedProductId(id);
    if (!userId) return;

    const hadCache = loadCachedDupesForSelection(userId, id);
    loadIngredientsForId(userId, id).catch(() => {});

    // If no cache, auto-run once for this product selection
    if (!hadCache && !autoRanRef.current.has(id)) {
      autoRanRef.current.add(id);
      // Force true ensures we do a real request
      findMarketDupes({ force: true });
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
      toast({ title: "Saved to favorites ❤️" });
    }
  };

  // ==============================
  // INIT
  // ==============================

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
          .select("id, product_name, brand, epiq_score, product_price, category")
          .eq("user_id", uid)
          .order("analyzed_at", { ascending: false })
          .limit(50);

        if (cancelled) return;

        const list = Array.isArray(analysesData) ? analysesData : [];
        const unique = Array.from(new Map(list.map((a) => [a.id, a])).values());
        setAnalyses(unique);

        const initialId = readUrlSelectedId(unique);
        setSelectedProductId(initialId);

        if (initialId) {
          // Load cache for initial selection
          const hadCache = loadCachedDupesForSelection(uid, initialId);
          loadIngredientsForId(uid, initialId).catch(() => {});

          // Auto-run once if no cache
          if (!hadCache && !autoRanRef.current.has(initialId)) {
            autoRanRef.current.add(initialId);
            findMarketDupes({ force: true });
          }
        }

        setIsInitializing(false);

        // Background loads
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
      } catch (e) {
        console.error("Init error:", e);
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.search]);

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

  // ==============================
  // RENDER
  // ==============================

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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Select a product to find dupes for</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select value={selectedProductId || ""} onValueChange={handleSelectProduct}>
                    <SelectTrigger className="w-full sm:flex-1">
                      <SelectValue placeholder="Choose a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {analyses.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.product_name}
                          {a.epiq_score && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              {a.epiq_score}
                            </Badge>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* ONE BUTTON ONLY */}
                  <Button
                    onClick={() => findMarketDupes({ force: true })}
                    disabled={findingDupes || !selectedProduct}
                    className="gap-2 whitespace-nowrap"
                  >
                    {findingDupes ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Refreshing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Refresh dupes
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

                <div className="flex items-center gap-2 text-sm">
                  {hasCachedResults ? (
                    <>
                      <Clock className="w-4 h-4 text-emerald-500" />
                      <span className="text-emerald-600 dark:text-emerald-400">Showing cached results</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="text-muted-foreground">{dupeStage}</span>
                    </>
                  )}
                </div>

                {findingDupes && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{dupeStage}</span>
                      <span>{dupeProgress}%</span>
                    </div>
                    <Progress value={dupeProgress} className="h-2" />
                  </div>
                )}
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
                  My Products
                </TabsTrigger>
              </TabsList>

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
                      <Button onClick={() => findMarketDupes({ force: true })} disabled={findingDupes} className="mt-4">
                        Try Again
                      </Button>
                    </CardContent>
                  </Card>
                ) : filteredMarketDupes.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {filteredMarketDupes.map((dupe, idx) => {
                      const key = savedKeyForMarketDupe(dupe, selectedProductId);

                      // FIX: always unique key
                      const reactKey = dupe?.id
                        ? `${selectedProductId}:${dupe.id}`
                        : `${selectedProductId}:${norm(dupe.brand)}:${norm(dupe.name)}:${idx}`;

                      return (
                        <div
                          key={reactKey}
                          className="animate-fade-in"
                          style={{ animationDelay: `${idx * 30}ms` }}
                        >
                          <DupeCard
                            dupe={dupe}
                            isSaved={savedDupes.has(key)}
                            onToggleSave={() => toggleSaveDupe(dupe)}
                          />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="py-12 text-center">
                      <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">No dupes yet</h3>
                      <p className="text-muted-foreground text-sm max-w-md mx-auto mb-4">
                        We will auto-run dupes when this product has no cached results.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="myproducts" className="space-y-6">
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-muted-foreground">Analyze at least 2 products to compare your collection.</p>
                  </CardContent>
                </Card>
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