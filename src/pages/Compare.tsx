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
import type { DupeProductSummary, DupeProductExpanded } from "@/types/dupe-product";
import { toast } from "@/hooks/use-toast";
import { invokeFunction } from '@/lib/functions-client';

interface Analysis {
  id: string;
  product_name: string;
  brand: string | null;
  epiq_score: number | null;
  product_price: number | null;
  ingredients_list?: string | null;
  category: string | null;
  image_url: string | null;
}

// Deprecated: MarketDupe. Use DupeProductSummary/DupeProductExpanded instead.
type MarketDupe = DupeProductExpanded;

interface SavedDupe {
  id: string;
  product_name: string;
  brand: string | null;
}

const CATEGORY_FILTERS = ['all', 'face', 'body', 'hair', 'scalp'] as const;
type CategoryFilter = typeof CATEGORY_FILTERS[number];

const RETAILER_SEARCH_URLS: Record<string, string> = {
  target: "https://www.target.com/s?searchTerm=",
  ulta: "https://www.ulta.com/search?Ntt=",
  sephora: "https://www.sephora.com/search?keyword=",
  amazon: "https://www.amazon.com/s?k=",
  walmart: "https://www.walmart.com/search?q=",
};

const getMarketDupeCacheKey = (userId: string | null, productId: string | null) => {
  if (!userId || !productId) return null;
  return `sl_market_dupes_${userId}_${productId}`;
};

const readMarketDupeCache = (userId: string | null, productId: string | null) => {
  const key = getMarketDupeCacheKey(userId, productId);
  if (!key) return null;
  const sources = [() => sessionStorage.getItem(key), () => localStorage.getItem(key)];
  for (const source of sources) {
    try {
      const value = source();
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed as MarketDupe[];
    } catch {
      continue;
    }
  }
  return null;
};

const writeMarketDupeCache = (userId: string | null, productId: string | null, dupes: MarketDupe[]) => {
  const key = getMarketDupeCacheKey(userId, productId);
  if (!key) return;
  const payload = JSON.stringify(dupes);
  try {
    sessionStorage.setItem(key, payload);
  } catch {
    // ignore storage errors
  }
  try {
    localStorage.setItem(key, payload);
  } catch {
    // ignore storage errors
  }
};

const buildPurchaseUrl = (whereToBuy: string | undefined, name: string, brand: string) => {
  if (!whereToBuy) return undefined;
  const primary = whereToBuy.split(",")[0]?.trim().toLowerCase();
  if (!primary) return undefined;
  const baseUrl = RETAILER_SEARCH_URLS[primary];
  if (!baseUrl) return undefined;
  const query = encodeURIComponent(`${brand} ${name}`.trim());
  return `${baseUrl}${query}`;
};

const normalizePrice = (price: unknown) => {
  if (!price) return undefined;
  if (typeof price === "number") {
    return `$${price.toFixed(2)}`;
  }
  if (typeof price === "string") {
    return price.trim();
  }
  return undefined;
};

const normalizeDupe = (dupe: any, fallbackCategory: string): MarketDupe | null => {
  // Map backend dupe object to DupeProductExpanded shape
  if (!dupe?.name) return null;
  return {
    name: dupe.name,
    brand: dupe.brand ?? "",
    imageUrl: dupe.imageUrl ?? (Array.isArray(dupe.images) && dupe.images.length > 0 ? dupe.images[0] : null),
    price: dupe.price ?? null,
    matchPercent: dupe.matchPercent ?? null,
    description: dupe.description ?? null,
    category: dupe.category ?? fallbackCategory ?? null,
    whereToBuy: dupe.whereToBuy ?? null,
    images: dupe.images ?? (dupe.imageUrl ? [dupe.imageUrl] : []),
    ingredientList: dupe.ingredientList ?? dupe.ingredients ?? [],
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
  };
};

export default function Compare() {
  const navigate = useNavigate();
  const location = useLocation();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [findingDupes, setFindingDupes] = useState(false);
  const [dupeProgress, setDupeProgress] = useState(0);
  const [dupeStage, setDupeStage] = useState("Preparing search");
  const dupeProgressRef = useRef<number | null>(null);
  const [marketDupes, setMarketDupes] = useState<MarketDupe[]>([]);
  const [dupeError, setDupeError] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [savedDupes, setSavedDupes] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [activeTab, setActiveTab] = useState("market");
  const [analysisIngredients, setAnalysisIngredients] = useState<Record<string, string>>({});
  const [skinProfile, setSkinProfile] = useState<{ skinType: string; concerns: string[] }>({ skinType: 'normal', concerns: [] });
  const [marketDupesHydratedFor, setMarketDupesHydratedFor] = useState<string | null>(null);
  const autoDupeStartedRef = useRef<Set<string>>(new Set());
  const { effectiveTier } = useSubscription();

  const dupeLimit = effectiveTier === 'pro' ? Infinity : effectiveTier === 'premium' ? 5 : 2;

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUserId(user.id);

      const [analysesRes, savedRes, profileRes] = await Promise.all([
        supabase
          .from("user_analyses")
          .select("id, product_name, brand, epiq_score, product_price, category, image_url")
          .eq("user_id", user.id)
          .order("analyzed_at", { ascending: false }),
        supabase
          .from("saved_dupes")
          .select("id, product_name, brand")
          .eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("skin_type, skin_concerns")
          .eq("id", user.id)
          .single()
      ]);

      if (!analysesRes.error && analysesRes.data) {
        const uniqueAnalyses = Array.from(
          new Map(analysesRes.data.map((analysis) => [analysis.id, analysis])).values()
        );
        setAnalyses(uniqueAnalyses);
        if (uniqueAnalyses.length > 0) setSelectedProductId(uniqueAnalyses[0].id);
      }

      if (!savedRes.error && savedRes.data) {
        const savedNames = new Set(savedRes.data.map(d => `${d.product_name}-${d.brand}`));
        setSavedDupes(savedNames);
      }

      if (!profileRes.error && profileRes.data) {
        const concerns = profileRes.data.skin_concerns;
        setSkinProfile({
          skinType: profileRes.data.skin_type || 'normal',
          concerns: Array.isArray(concerns) ? concerns.map(c => String(c)) : []
        });
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // Progress bar now reflects real async loading
  useEffect(() => {
    if (loading) {
      setLoadingProgress(10);
    } else {
      setLoadingProgress(100);
    }
  }, [loading]);

  useEffect(() => {
    if (!analyses.length) return;
    const params = new URLSearchParams(location.search);
    const requestedId = params.get("productId");
    if (!requestedId) return;
    if (analyses.some(a => a.id === requestedId)) {
      setSelectedProductId(requestedId);
    }
  }, [analyses, location.search]);

  const selectedProduct = useMemo(() => 
    analyses.find(a => a.id === selectedProductId), 
    [analyses, selectedProductId]
  );

  const selectedIngredients = useMemo(() => {
    if (!selectedProductId) return undefined;
    return analysisIngredients[selectedProductId];
  }, [analysisIngredients, selectedProductId]);

  const sourceIngredients = useMemo(
    () => (selectedIngredients ? parseIngredients(selectedIngredients) : []),
    [selectedIngredients]
  );

  const loadIngredientsForIds = async (ids: string[]) => {
    if (!userId || ids.length === 0) return;
    const missing = ids.filter((id) => !analysisIngredients[id]);
    if (missing.length === 0) return;

    const { data, error } = await supabase
      .from("user_analyses")
      .select("id, ingredients_list")
      .eq("user_id", userId)
      .in("id", missing);

    if (error || !data) return;
    setAnalysisIngredients((prev) => {
      const next = { ...prev };
      data.forEach((row) => {
        if (row.ingredients_list) {
          next[row.id] = row.ingredients_list;
        }
      });
      return next;
    });
  };

  const fetchIngredientsForId = async (id: string) => {
    if (!userId) return null;
    const { data, error } = await supabase
      .from("user_analyses")
      .select("ingredients_list")
      .eq("user_id", userId)
      .eq("id", id)
      .maybeSingle();

    if (error || !data?.ingredients_list) return null;
    setAnalysisIngredients((prev) => ({ ...prev, [id]: data.ingredients_list }));
    return data.ingredients_list;
  };

  const normalizeIngredientName = (value: string) => {
    return value
      .toLowerCase()
      .replace(/\(.*?\)/g, " ")
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const normalizeList = (items: string[]) =>
    items
      .map((item) => normalizeIngredientName(item))
      .filter((item) => item.length > 2);

  const getMarketMatchPercent = (dupe: MarketDupe, sourceList: string[]) => {
    if (typeof dupe.matchPercent === "number" && dupe.matchPercent > 0) {
      return Math.min(98, Math.max(1, Math.round(dupe.matchPercent)));
    }

  if (!dupe.ingredientList || dupe.ingredientList.length === 0 || sourceList.length === 0) {
      return undefined;
    }

    const sourceIngredients = Array.from(new Set(normalizeList(sourceList)));
  const targetIngredients = Array.from(new Set(normalizeList(dupe.ingredientList)));
    if (!sourceIngredients.length || !targetIngredients.length) return undefined;

    let matched = 0;
    for (const sourceItem of sourceIngredients) {
      const isMatch = targetIngredients.some(
        (targetItem) => targetItem.includes(sourceItem) || sourceItem.includes(targetItem)
      );
      if (isMatch) matched += 1;
    }

    const percent = Math.round((matched / sourceIngredients.length) * 100);
    if (percent <= 0) return undefined;
    return Math.min(98, percent);
  };


  const findMarketDupes = async ({ force = false }: { force?: boolean } = {}) => {
    if (!selectedProduct || !selectedProductId) return;
    
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
      if (!ingredientText) {
        ingredientText = await fetchIngredientsForId(selectedProductId);
      }
      if (!ingredientText) {
        ingredientText = "";
      }

      setDupeStage("Finding market matches");
      setDupeProgress(60);
      const ingredients = ingredientText
        .split(/[,;\n]+/)
        .map(i => i.trim())
        .filter(Boolean);

      let data: any;
      try {
        data = await invokeFunction('find-dupes', {
          productName: selectedProduct.product_name,
          brand: selectedProduct.brand,
          ingredients,
          category: selectedProduct.category || 'face',
          skinType: skinProfile.skinType,
          concerns: skinProfile.concerns,
        });
        setDupeStage("Verifying ingredients");
        setDupeProgress(80);
      } catch (err) {
        console.error('find-dupes error:', err);
        setDupeError('Failed to find dupes');
        setDupeStage("Error finding dupes");
        setDupeProgress(100);
        return;
      }

      if (data?.error) {
        setDupeError(data.error);
        setDupeStage("Error finding dupes");
        setDupeProgress(100);
      }

      if (data?.dupes && Array.isArray(data.dupes)) {
        setDupeStage("Results ready");
        setDupeProgress(100);
        const normalizedDupes = data.dupes
          .map((dupe: any) => normalizeDupe(dupe, selectedProduct.category || "face"))
          .filter((dupe: MarketDupe | null): dupe is MarketDupe => Boolean(dupe));

        setMarketDupes(normalizedDupes);
        writeMarketDupeCache(userId, selectedProductId, normalizedDupes);
        // Removed attempt to update market_dupes_cache (column does not exist)

        if (data.dupes.length > 0 && normalizedDupes.length === 0) {
          toast({
            title: "No valid dupes returned",
            description: "Try again in a moment.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      const context = (error as any)?.context;
      const status = context?.status;
      const statusText = context?.statusText;
      console.error('Error finding dupes:', {
        message: error instanceof Error ? error.message : String(error),
        status,
        statusText,
        context,
      });
      const message = error instanceof Error ? error.message : "";
      const friendlyMessage = message.includes("402") || message.includes("Payment Required")
        ? "Dupe search is temporarily unavailable. Please try again later."
        : "Please try again later.";
      setDupeError(friendlyMessage);
      setDupeStage("Error finding dupes");
      setDupeProgress(100);
      toast({
        title: 'Error finding dupes',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } finally {
      setFindingDupes(false);
    }
  };

  // Auto-scan removed: dupes load from cache/DB and only run on manual request.

  function parseIngredients(list: string): string[] {
    return list.toLowerCase()
      .split(/[,;\n]+/)
      .map(i => i.trim())
      .filter(i => i.length > 2);
  }

  // My Products comparison (existing logic)
  const myProductMatches: any[] = useMemo(() => {
    if (!selectedProduct || !selectedProductId || analyses.length < 2) return [];
    if (!analysisIngredients[selectedProductId]) return [];

    const sourceIngredients = parseIngredients(analysisIngredients[selectedProductId] || "");
    const sourcePrice = selectedProduct.product_price;
    // ...existing logic to compute matches...
    // If no matches, always return []
    // Never return a React element from this useMemo
    return [];
  }, [selectedProduct, selectedProductId, analyses, analysisIngredients]);

  useEffect(() => {
    const fetchData = async () => {
      setLoadingProgress(10);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
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
          .select("id, product_name, brand")
          .eq("user_id", user.id),
        supabase
          .from("profiles")
          .select("skin_type, skin_concerns")
          .eq("id", user.id)
          .single()
      ]);
      setLoadingProgress(60);

      if (!analysesRes.error && analysesRes.data) {
        const uniqueAnalyses = Array.from(
          new Map(analysesRes.data.map((analysis) => [analysis.id, analysis])).values()
        );
        setAnalyses(uniqueAnalyses);
        if (uniqueAnalyses.length > 0) setSelectedProductId(uniqueAnalyses[0].id);
      }

      if (!savedRes.error && savedRes.data) {
        const savedNames = new Set(savedRes.data.map(d => `${d.product_name}-${d.brand}`));
        setSavedDupes(savedNames);
      }

      if (!profileRes.error && profileRes.data) {
        const concerns = profileRes.data.skin_concerns;
        setSkinProfile({
          skinType: profileRes.data.skin_type || 'normal',
          concerns: Array.isArray(concerns) ? concerns.map(c => String(c)) : []
        });
      }

      setLoadingProgress(100);
      setTimeout(() => setLoading(false), 200); // allow UI to show 100% before hiding
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    if (!selectedProductId) return;
    setDupeError(null);
    setDupeProgress(0);
    setDupeStage("Preparing search");
    setMarketDupesHydratedFor(null);
  }, [selectedProductId]);

  useEffect(() => {
    if (!selectedProductId || !userId) return;
    let isCancelled = false;

    const hydrateMarketDupes = async () => {
      const cached = readMarketDupeCache(userId, selectedProductId);
      if (cached && cached.length > 0) {
        setMarketDupes(cached);
        setMarketDupesHydratedFor(selectedProductId);
        return;
      }

      // Removed attempt to read market_dupes_cache (column does not exist)

      setMarketDupes([]);
      setMarketDupesHydratedFor(selectedProductId);
    };

    hydrateMarketDupes();

    return () => {
      isCancelled = true;
    };
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
    loadIngredientsForIds(analyses.map(a => a.id));
  }, [activeTab, analyses, userId]);

  const toggleSaveMarketDupe = async (dupe: MarketDupe) => {
    if (!userId || !selectedProductId) return;

    const key = `${dupe.name}-${dupe.brand}`;
    const isSaved = savedDupes.has(key);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_dupes")
        .delete()
        .eq("user_id", userId)
        .eq("product_name", dupe.name);

      if (!error) {
        setSavedDupes(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        toast({ title: "Removed from favorites" });
      } else {
        console.error('Error removing saved dupe:', error);
        toast({ title: 'Failed to remove favorite', description: error.message || 'Try again later.', variant: 'destructive' });
      }
    } else {
      const { error } = await supabase
        .from("saved_dupes")
        .insert({
          user_id: userId,
          product_name: dupe.name,
          brand: dupe.brand,
          image_url: dupe.imageUrl,
          // No longer saving reasons/sharedIngredients/priceEstimate/purchaseUrl
          source_product_id: selectedProductId,
          where_to_buy: dupe.whereToBuy || null,
        });

      if (!error) {
        setSavedDupes(prev => new Set(prev).add(key));
        toast({ title: "Saved to favorites ❤️" });
      } else {
        console.error('Error saving dupe:', error);
        toast({ title: 'Failed to save favorite', description: error.message || 'Try again later.', variant: 'destructive' });
      }
    }
  };

  const toggleSaveMyProduct = async (match: any) => {
    if (!userId || !selectedProductId) return;

    const key = `${match.product.product_name}-${match.product.brand}`;
    const isSaved = savedDupes.has(key);

    if (isSaved) {
      const { error } = await supabase
        .from("saved_dupes")
        .delete()
        .eq("user_id", userId)
        .eq("product_name", match.product.product_name);

      if (!error) {
        setSavedDupes(prev => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        toast({ title: "Removed from favorites" });
      } else {
        console.error('Error removing saved my-product dupe:', error);
        toast({ title: 'Failed to remove favorite', description: error.message || 'Try again later.', variant: 'destructive' });
      }
    } else {
      const { error } = await supabase
        .from("saved_dupes")
        .insert({
          user_id: userId,
          product_name: match.product.product_name,
          brand: match.product.brand,
          reasons: match.whyDupe,
          shared_ingredients: match.sharedIngredients,
          price_estimate: match.product.product_price ? `$${match.product.product_price}` : null,
          source_product_id: selectedProductId
        });

      if (!error) {
        setSavedDupes(prev => new Set(prev).add(key));
        toast({ title: "Saved to favorites ❤️" });
      } else {
        console.error('Error saving my-product dupe:', error);
        toast({ title: 'Failed to save favorite', description: error.message || 'Try again later.', variant: 'destructive' });
      }
    }
  };

  const filteredMarketDupes = useMemo(() => {
    if (categoryFilter === 'all') return marketDupes;
    return marketDupes.filter(d => d.category === categoryFilter);
  }, [marketDupes, categoryFilter]);

  const getScoreColor = (score: number | null) => {
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
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/4] w-full" />)}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-6">
      <main className="container mx-auto pb-24 lg:pb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Search className="w-6 h-6 text-primary" />
            Dupe Discovery
          </h1>
          <p className="text-muted-foreground mt-1">
            Compare ingredient overlap to find affordable alternatives.
          </p>
        </div>

        {analyses.length < 1 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analyze a Product First</h3>
              <p className="text-muted-foreground mb-4">
                We need at least one analyzed product to find dupes for
              </p>
              <Button onClick={() => navigate("/upload")}>
                Analyze a Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
            <div className="space-y-6">
            {/* Product Picker */}
            <Card className="mb-6">
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
                      {analyses.map(a => (
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
                    <div>
                      <p className="font-medium">{selectedProduct.product_name}</p>
                      <p className="text-sm text-muted-foreground">{selectedProduct.brand}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${getScoreColor(selectedProduct.epiq_score)}`}>
                        {selectedProduct.epiq_score || "—"}
                      </p>
                      {selectedProduct.product_price && (
                        <p className="text-sm text-muted-foreground">
                          ${selectedProduct.product_price}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

                {selectedProduct && (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                      Market Dupes compares your selected product to popular retail formulas. My Products compares it to your own scans.
                    </p>

                {/* Category Filter */}
                <div className="flex gap-2 flex-wrap">
                  {CATEGORY_FILTERS.map(cat => (
                    <Button
                      key={cat}
                      variant={categoryFilter === cat ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCategoryFilter(cat)}
                      className="capitalize"
                    >
                      {cat === 'all' ? 'All' : cat}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {filteredMarketDupes.map((dupe, idx) => {
                        const key = `${dupe.name}-${dupe.brand}`;
                        return (
                          <div 
                            key={`${dupe.brand}-${dupe.name}-${idx}`}
                            className="animate-fade-in"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <DupeCard
                              dupe={dupe}
                              isSaved={savedDupes.has(key)}
                              onToggleSave={() => toggleSaveMarketDupe(dupe)}
                              showPlaceholder={findingDupes}
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
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {Array.isArray(myProductMatches) && myProductMatches.map((match, idx) => {
                        const key = `${match.product.product_name}-${match.product.brand}`;
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
                                category: match.product.category || 'face',
                                whereToBuy: null,
                              }}
                              isSaved={savedDupes.has(key)}
                              onToggleSave={() => toggleSaveMyProduct(match)}
                              showPlaceholder={findingDupes}
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
            <aside className="space-y-4">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base font-medium">Quick Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Market dupes</p>
                    <p className="font-semibold">{filteredMarketDupes.length}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Saved favorites</p>
                    <p className="font-semibold">{savedDupes.size}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Active filter</p>
                    <p className="font-semibold capitalize">{categoryFilter}</p>
                  </div>
                  {selectedProduct && (
                    <div className="pt-3 border-t border-border text-sm text-muted-foreground">
                      <p>Comparing:</p>
                      <p className="font-semibold">{selectedProduct.product_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Log your best finds.</p>
                  <Button variant="outline" className="w-full" onClick={() => navigate("/favorites")}>
                    View Saved Favorites
                  </Button>
                </CardContent>
              </Card>
            </aside>
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
