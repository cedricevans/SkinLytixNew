import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  const top =
    dupe?.imageUrl ||
    (Array.isArray(dupe?.images) && dupe.images[0]) ||
    null;

  if (top) return { url: top, from: "top" };

  const obf =
    dupe?.obf?.imageUrl ||
    (Array.isArray(dupe?.obf?.images) && dupe.obf.images[0]) ||
    null;

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

  const [analyses, setAnalyses] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  const [findingDupes, setFindingDupes] = useState(false);
  const [dupeProgress, setDupeProgress] = useState(0);
  const [dupeStage, setDupeStage] = useState("Preparing search");

  const [marketDupes, setMarketDupes] = useState([]);
  const [dupeError, setDupeError] = useState(null);

  const [showPaywall, setShowPaywall] = useState(false);
  const [savedDupes, setSavedDupes] = useState(new Set());
  const [userId, setUserId] = useState(null);

  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("market");

  const [analysisIngredients, setAnalysisIngredients] = useState({});
  const [skinProfile, setSkinProfile] = useState({ skinType: "normal", concerns: [] });

  const [marketDupesHydratedFor, setMarketDupesHydratedFor] = useState(null);
  const autoDupeStartedRef = useRef(new Set());

  const { effectiveTier } = useSubscription();
  const dupeLimit = effectiveTier === "pro" ? Infinity : effectiveTier === "premium" ? 5 : 2;

  function parseIngredients(list) {
    if (!list || typeof list !== "string") return [];
    return list
      .toLowerCase()
      .split(/[,;\n]+/)
      .map((i) => i.trim())
      .filter((i) => i.length > 2);
  }

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        setLoading(true);
        setLoadingProgress(10);

        const { data: auth, error: authErr } = await supabase.auth.getUser();
        const user = auth?.user;

        if (authErr) console.error("auth.getUser error:", authErr);

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

        if (!analysesRes.error && Array.isArray(analysesRes.data)) {
          const unique = Array.from(new Map(analysesRes.data.map((a) => [a.id, a])).values());
          setAnalyses(unique);

          const params = new URLSearchParams(location.search);
          const requestedId = params.get("productId");
          const initialId =
            requestedId && unique.some((a) => a.id === requestedId) ? requestedId : unique[0]?.id ?? null;
          setSelectedProductId((prev) => prev ?? initialId);
        } else if (analysesRes.error) {
          console.error("analyses fetch error:", analysesRes.error);
        }

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
        console.error("Compare fetchData fatal:", e);
        setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [navigate, location.search]);

  useEffect(() => {
    setLoadingProgress((p) => (loading ? Math.min(p || 0, 10) : 100));
  }, [loading]);

  const selectedProduct = useMemo(
    () => analyses.find((a) => a.id === selectedProductId),
    [analyses, selectedProductId],
  );

  const selectedIngredients = useMemo(() => {
    if (!selectedProductId) return undefined;
    return analysisIngredients[selectedProductId];
  }, [analysisIngredients, selectedProductId]);

  const sourceIngredients = useMemo(
    () => (selectedIngredients ? parseIngredients(selectedIngredients) : []),
    [selectedIngredients],
  );

  const loadIngredientsForIds = async (ids) => {
    if (!userId || !ids || ids.length === 0) return;

    const missing = ids.filter((id) => !analysisIngredients[id]);
    if (missing.length === 0) return;

    const { data, error } = await supabase
      .from("user_analyses")
      .select("id, ingredients_list")
      .eq("user_id", userId)
      .in("id", missing);

    if (error) {
      console.error("loadIngredientsForIds error:", error);
      return;
    }

    if (!Array.isArray(data)) return;

    setAnalysisIngredients((prev) => {
      const next = { ...prev };
      data.forEach((row) => {
        if (row.ingredients_list) next[row.id] = row.ingredients_list;
      });
      return next;
    });
  };

  const fetchIngredientsForId = async (id) => {
    if (!userId) return null;

    const { data, error } = await supabase
      .from("user_analyses")
      .select("ingredients_list")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("fetchIngredientsForId error:", error);
      return null;
    }

    if (!data?.ingredients_list) return null;

    setAnalysisIngredients((prev) => ({ ...prev, [id]: data.ingredients_list }));
    return data.ingredients_list;
  };

  const findMarketDupes = async ({ force = false } = {}) => {
    if (!selectedProduct || !selectedProductId || !userId) return;

    setFindingDupes(true);
    setMarketDupes([]);
    setDupeError(null);
    setDupeProgress(10);
    setDupeStage("Analyzing ingredients");

    try {
      if (!force) {
        const cached = readMarketDupeCache(userId, selectedProductId);
        if (cached && cached.length > 0) {
          setMarketDupes(cached);
          setDupeStage("Loaded from cache");
          setDupeProgress(100);
          return;
        }
      }

      setDupeStage("Loading ingredients");
      setDupeProgress(30);

      await loadIngredientsForIds([selectedProductId]);

      let ingredientText = analysisIngredients[selectedProductId];
      if (!ingredientText) ingredientText = await fetchIngredientsForId(selectedProductId);
      if (!ingredientText) ingredientText = "";

      setDupeStage("Finding market matches");
      setDupeProgress(60);

      const ingredients = ingredientText
        .split(/[,;\n]+/)
        .map((i) => i.trim())
        .filter(Boolean);

      let data;
      try {
        data = await invokeFunction("find-dupes", {
          productName: selectedProduct.product_name,
          brand: selectedProduct.brand,
          ingredients,
          category: selectedProduct.category || "face",
          skinType: skinProfile.skinType,
          concerns: skinProfile.concerns,
        });

        setDupeStage("Verifying ingredients");
        setDupeProgress(80);
      } catch (err) {
        console.error("find-dupes error:", err);
        setDupeError("Failed to find dupes");
        setDupeStage("Error finding dupes");
        setDupeProgress(100);
        return;
      }

      if (data?.error) {
        setDupeError(data.error);
        setDupeStage("Error finding dupes");
        setDupeProgress(100);
        return;
      }

      const rawDupes = Array.isArray(data?.dupes) ? data.dupes : [];
      const normalizedDupes = rawDupes
        .map((d) => normalizeDupe(d, selectedProduct.category || "face"))
        .filter(Boolean);

      setDupeStage("Results ready");
      setDupeProgress(100);

      setMarketDupes(normalizedDupes);
      writeMarketDupeCache(userId, selectedProductId, normalizedDupes);

      if (rawDupes.length > 0 && normalizedDupes.length === 0) {
        toast({
          title: "No valid dupes returned",
          description: "Try again in a moment.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error finding dupes:", error);

      const message = error instanceof Error ? error.message : "";
      const friendlyMessage =
        message.includes("402") || message.includes("Payment Required")
          ? "Dupe search is temporarily unavailable. Please try again later."
          : "Please try again later.";

      setDupeError(friendlyMessage);
      setDupeStage("Error finding dupes");
      setDupeProgress(100);

      toast({
        title: "Error finding dupes",
        description: friendlyMessage,
        variant: "destructive",
      });
    } finally {
      setFindingDupes(false);
    }
  };

  const myProductMatches = useMemo(() => {
    if (!selectedProduct || !selectedProductId || analyses.length < 2) return [];
    if (!analysisIngredients[selectedProductId]) return [];
    return [];
  }, [selectedProduct, selectedProductId, analyses, analysisIngredients]);

  useEffect(() => {
    if (!selectedProductId || !userId) return;
    setDupeError(null);
    setDupeProgress(0);
    setDupeStage("Preparing search");
    setMarketDupesHydratedFor(null);
  }, [selectedProductId, userId]);

  useEffect(() => {
    if (!selectedProductId || !userId) return;

    const cached = readMarketDupeCache(userId, selectedProductId);
    if (cached && cached.length > 0) {
      setMarketDupes(cached);
      setMarketDupesHydratedFor(selectedProductId);
      return;
    }

    setMarketDupes([]);
    setMarketDupesHydratedFor(selectedProductId);
  }, [selectedProductId, userId]);

  useEffect(() => {
    if (!selectedProductId || !userId) return;
    if (marketDupesHydratedFor !== selectedProductId) return;
    if (findingDupes || dupeError) return;
    if (marketDupes.length > 0) return;
    if (autoDupeStartedRef.current.has(selectedProductId)) return;

    autoDupeStartedRef.current.add(selectedProductId);
    findMarketDupes();
  }, [selectedProductId, userId, marketDupesHydratedFor, marketDupes.length, findingDupes, dupeError]);

  useEffect(() => {
    if (!selectedProductId || !userId) return;
    loadIngredientsForIds([selectedProductId]);
  }, [selectedProductId, userId]);

  useEffect(() => {
    if (activeTab !== "myproducts") return;
    if (!userId || analyses.length === 0) return;
    loadIngredientsForIds(analyses.map((a) => a.id));
  }, [activeTab, analyses, userId]);

  const toggleSaveMarketDupe = async (dupe) => {
    if (!userId || !selectedProductId) return;

    const safeName = norm(dupe?.name);
    const safeBrand = norm(dupe?.brand);

    const key = savedKeyForMarketDupe({ name: safeName, brand: safeBrand }, selectedProductId);
    const isSaved = savedDupes.has(key);

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
          next.delete(key);
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
        setSavedDupes((prev) => new Set(prev).add(key));
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
  };

  const toggleSaveMyProduct = async (match) => {
    if (!userId || !selectedProductId) return;

    const productName = norm(match?.product?.product_name);
    const brand = norm(match?.product?.brand || "");

    const key = `${norm(selectedProductId)}::${productName}::${brand}`;
    const isSaved = savedDupes.has(key);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_dupes")
        .delete()
        .eq("user_id", userId)
        .eq("source_product_id", selectedProductId)
        .eq("product_name", productName)
        .eq("brand", brand);

      if (!error) {
        setSavedDupes((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        toast({ title: "Removed from favorites" });
      } else {
        console.error("Error removing saved my-product dupe:", error);
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
        product_name: productName,
        brand,
        reasons: match?.whyDupe ?? null,
        shared_ingredients: match?.sharedIngredients ?? null,
        price_estimate: match?.product?.product_price ? `$${match.product.product_price}` : null,
        image_url: match?.product?.image_url ?? null,
        saved_at: new Date().toISOString(),
      });

      if (!error) {
        setSavedDupes((prev) => new Set(prev).add(key));
        toast({ title: "Saved to favorites ❤️" });
      } else {
        console.error("Error saving my-product dupe:", error);
        toast({
          title: "Failed to save favorite",
          description: error.message || "Try again later.",
          variant: "destructive",
        });
      }
    }
  };

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
                              Finding...
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
                    Market Dupes compares your selected product to popular retail formulas. My Products compares it to
                    your own scans.
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
                    {findingDupes ? (
                      <div className="text-center py-12 space-y-4">
                        <div className="relative w-20 h-20 mx-auto">
                          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                          <Search className="absolute inset-0 m-auto w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-muted-foreground">🔍 {dupeStage}...</p>
                          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                            <span>{dupeProgress}%</span>
                            <div className="w-48">
                              <Progress value={dupeProgress} className="h-2" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : dupeError ? (
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
                                onToggleSave={() => toggleSaveMarketDupe(dupe)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : marketDupes.length === 0 ? (
                      <Card className="border-dashed">
                        <CardContent className="py-12 text-center">
                          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                          <h3 className="text-lg font-medium mb-2">Finding dupes for your selection</h3>
                          <p className="text-muted-foreground text-sm max-w-md mx-auto">
                            We’re searching for similar formulas now. If this takes too long, try again.
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-dashed">
                        <CardContent className="py-8 text-center">
                          <p className="text-muted-foreground">No dupes found in this category.</p>
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
                                onToggleSave={() => toggleSaveMyProduct(match)}
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
                            {analyses.length < 2
                              ? "Analyze at least 2 products to compare your collection."
                              : activeTab === "myproducts" && !analysisIngredients[selectedProductId || ""]
                                ? "Loading ingredients to compare your collection..."
                                : "No similar products found in your collection."}
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