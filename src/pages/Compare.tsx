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

interface MarketDupe {
  name: string;
  brand: string;
  imageUrl: string;
  reasons: string[];
  sharedIngredients: string[];
  ingredients?: string[];
  priceEstimate: string;
  profileMatch: boolean;
  category: string;
  whereToBuy?: string;
  purchaseUrl?: string;
  productUrl?: string;
  matchPercent?: number;
}

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
  const name = dupe?.name || dupe?.productName || dupe?.product_name;
  const brandRaw = dupe?.brand || dupe?.brandName || dupe?.brand_name;
  if (!name) return null;

  const imageUrl = dupe?.imageUrl || dupe?.image_url || dupe?.image || "";
  const normalizedImageUrl = typeof imageUrl === "string" && imageUrl.includes("images.unsplash.com")
    ? ""
    : imageUrl;
  const priceEstimate = normalizePrice(
    dupe?.priceEstimate || dupe?.price_estimate || dupe?.price || dupe?.priceRange || dupe?.price_range
  );
  const whereToBuy = dupe?.whereToBuy || dupe?.where_to_buy || dupe?.retailer || dupe?.retailers;
  const productUrl = dupe?.productUrl || dupe?.product_url || dupe?.url;
  const category = String(dupe?.category || fallbackCategory || "face").toLowerCase();
  const reasons = Array.isArray(dupe?.reasons) ? dupe.reasons : [];
  const sharedIngredients = Array.isArray(dupe?.sharedIngredients)
    ? dupe.sharedIngredients
    : Array.isArray(dupe?.shared_ingredients)
      ? dupe.shared_ingredients
      : [];
  const profileMatch = Boolean(dupe?.profileMatch ?? dupe?.profile_match);
  const matchPercentRaw = dupe?.matchPercent ?? dupe?.match_percent ?? dupe?.overlapPercent ?? dupe?.overlap_percent;
  const matchPercent = typeof matchPercentRaw === "number" ? matchPercentRaw : undefined;
  const ingredientsRaw = dupe?.ingredients ?? dupe?.ingredients_list ?? dupe?.ingredientsList ?? dupe?.ingredients_text;
  const ingredients = Array.isArray(ingredientsRaw)
    ? ingredientsRaw.filter(Boolean).map((item: string) => item.trim())
    : typeof ingredientsRaw === "string"
      ? ingredientsRaw.split(/[,;]+/).map((item) => item.trim()).filter((item) => item.length > 2)
      : undefined;

  const normalizedBrand = typeof brandRaw === "string" && /skinlytix/i.test(brandRaw)
    ? ""
    : brandRaw;

  return {
    name,
    brand: normalizedBrand || "",
    imageUrl: normalizedImageUrl,
    reasons,
    sharedIngredients,
    priceEstimate: priceEstimate || "",
    profileMatch,
    category,
    whereToBuy,
    purchaseUrl: productUrl || buildPurchaseUrl(whereToBuy, name, brand),
    productUrl,
    matchPercent,
    ingredients,
  };
};

export default function Compare() {
  const navigate = useNavigate();
  const location = useLocation();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(10);
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

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(10);
    let current = 10;
    const interval = window.setInterval(() => {
      current = Math.min(95, current + Math.floor(Math.random() * 8) + 3);
      setLoadingProgress(current);
    }, 350);

    return () => {
      window.clearInterval(interval);
    };
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

    if (!dupe.ingredients || dupe.ingredients.length === 0 || sourceList.length === 0) {
      return undefined;
    }

    const sourceIngredients = Array.from(new Set(normalizeList(sourceList)));
    const targetIngredients = Array.from(new Set(normalizeList(dupe.ingredients)));
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
    setDupeProgress(5);
    setDupeStage("Analyzing ingredients");

    if (dupeProgressRef.current) {
      window.clearInterval(dupeProgressRef.current);
    }

    let progressValue = 5;
    dupeProgressRef.current = window.setInterval(() => {
      progressValue = Math.min(95, progressValue + Math.floor(Math.random() * 6) + 3);
      setDupeProgress(progressValue);
      if (progressValue < 35) {
        setDupeStage("Analyzing ingredients");
      } else if (progressValue < 60) {
        setDupeStage("Finding market matches");
      } else if (progressValue < 80) {
        setDupeStage("Verifying ingredients");
      } else if (progressValue < 90) {
        setDupeStage("Finalizing results");
      } else {
        setDupeStage("Wrapping up results");
      }
    }, 500);

    try {
      if (!force) {
        const cached = readMarketDupeCache(userId, selectedProductId);
        if (cached && cached.length > 0) {
          setMarketDupes(cached);
          setDupeStage("Loaded from cache");
          return;
        }
      }

      await loadIngredientsForIds([selectedProductId]);
      let ingredientText = analysisIngredients[selectedProductId];
      if (!ingredientText) {
        ingredientText = await fetchIngredientsForId(selectedProductId);
      }
      if (!ingredientText) {
        ingredientText = "";
      }

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
      } catch (err) {
        console.error('find-dupes error:', err);
        setDupeError('Failed to find dupes');
        return;
      }

      if (data?.error) {
        setDupeError(data.error);
      }

      if (data?.dupes && Array.isArray(data.dupes)) {
        const normalizedDupes = data.dupes
          .map((dupe: any) => normalizeDupe(dupe, selectedProduct.category || "face"))
          .filter((dupe: MarketDupe | null): dupe is MarketDupe => Boolean(dupe));

        setMarketDupes(normalizedDupes);
        writeMarketDupeCache(userId, selectedProductId, normalizedDupes);

        if (userId && selectedProductId) {
          const { error: cacheError } = await supabase
            .from("user_analyses")
            .update({ market_dupes_cache: normalizedDupes })
            .eq("id", selectedProductId)
            .eq("user_id", userId);
          if (cacheError) {
            // Ignore if column does not exist or update fails.
          }
        }

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
      toast({
        title: 'Error finding dupes',
        description: friendlyMessage,
        variant: 'destructive',
      });
    } finally {
      if (dupeProgressRef.current) {
        window.clearInterval(dupeProgressRef.current);
        dupeProgressRef.current = null;
      }
      setDupeProgress(100);
      setDupeStage("Results ready");
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
  const myProductMatches = useMemo(() => {
    if (!selectedProduct || !selectedProductId || analyses.length < 2) return [];
    if (!analysisIngredients[selectedProductId]) return [];

    const sourceIngredients = parseIngredients(analysisIngredients[selectedProductId] || "");
    const sourcePrice = selectedProduct.product_price;

    const matches = analyses
      .filter(a => a.id !== selectedProductId)
      .map(product => {
        const ingredientText = analysisIngredients[product.id];
        if (!ingredientText) return null;
        const targetIngredients = parseIngredients(ingredientText);
        const shared = sourceIngredients.filter(i => 
          targetIngredients.some(t => t.includes(i) || i.includes(t))
        );
        const overlapPercent = Math.round((shared.length / Math.max(sourceIngredients.length, 1)) * 100);
        const priceDiff = sourcePrice && product.product_price 
          ? sourcePrice - product.product_price 
          : null;

        const whyDupe: string[] = [];
        
        if (overlapPercent >= 70) {
          whyDupe.push(`${overlapPercent}% ingredient overlap`);
        } else if (overlapPercent >= 50) {
          whyDupe.push(`${overlapPercent}% similar formula`);
        } else if (overlapPercent >= 30) {
          whyDupe.push(`${overlapPercent}% shared ingredients`);
        }

        if (priceDiff !== null && priceDiff > 0) {
          whyDupe.push(`$${priceDiff.toFixed(2)} cheaper`);
        }

        const scoreDiff = Math.abs((selectedProduct.epiq_score || 0) - (product.epiq_score || 0));
        if (scoreDiff <= 10) {
          whyDupe.push("Similar EpiQ score");
        }

        return {
          product,
          overlapPercent,
          sharedIngredients: shared.slice(0, 5),
          priceDiff,
          whyDupe
        };
      })
      .filter((m): m is NonNullable<typeof m> => Boolean(m))
      .filter(m => m.overlapPercent >= 30)
      .sort((a, b) => b.overlapPercent - a.overlapPercent);

    const uniqueMatches = Array.from(
      new Map(matches.map(match => [match.product.id, match])).values()
    );

    return uniqueMatches;
  }, [selectedProduct, analyses, selectedProductId, analysisIngredients]);

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

      const { data, error } = await supabase
        .from("user_analyses")
        .select("market_dupes_cache")
        .eq("user_id", userId)
        .eq("id", selectedProductId)
        .maybeSingle();

      if (isCancelled || error) return;
      const dbDupes = Array.isArray(data?.market_dupes_cache) ? data.market_dupes_cache : [];
      if (dbDupes.length > 0) {
        setMarketDupes(dbDupes);
        writeMarketDupeCache(userId, selectedProductId, dbDupes);
        setMarketDupesHydratedFor(selectedProductId);
        return;
      }

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
          reasons: dupe.reasons,
          shared_ingredients: dupe.sharedIngredients,
          price_estimate: dupe.priceEstimate,
          source_product_id: selectedProductId,
          where_to_buy: dupe.whereToBuy || null,
          purchase_url: dupe.purchaseUrl || null
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

  const toggleSaveMyProduct = async (match: typeof myProductMatches[0]) => {
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
                              name={dupe.name}
                              brand={dupe.brand}
                              imageUrl={dupe.imageUrl}
                              priceEstimate={dupe.priceEstimate}
                              matchPercentage={getMarketMatchPercent(dupe, sourceIngredients)}
                              reasons={dupe.reasons}
                              sharedIngredients={dupe.sharedIngredients}
                              isSaved={savedDupes.has(key)}
                              onToggleSave={() => toggleSaveMarketDupe(dupe)}
                              whereToBuy={dupe.whereToBuy}
                              purchaseUrl={dupe.purchaseUrl}
                              category={dupe.category}
                              showPlaceholder={true}
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
                  {myProductMatches.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {myProductMatches.map((match, idx) => {
                        const key = `${match.product.product_name}-${match.product.brand}`;
                        return (
                          <div 
                            key={match.product.id}
                            className="animate-fade-in"
                            style={{ animationDelay: `${idx * 50}ms` }}
                          >
                            <DupeCard
                              name={match.product.product_name}
                              brand={match.product.brand || "Unknown Brand"}
                              imageUrl={match.product.image_url || undefined}
                              priceEstimate={match.product.product_price ? `$${match.product.product_price}` : undefined}
                              reasons={match.whyDupe}
                              sharedIngredients={match.sharedIngredients}
                              matchPercentage={match.overlapPercent}
                              isSaved={savedDupes.has(key)}
                              onToggleSave={() => toggleSaveMyProduct(match)}
                              category={match.product.category || 'face'}
                              showPlaceholder={true}
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
