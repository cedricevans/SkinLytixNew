import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { ResponsiveBottomNav } from "@/components/ResponsiveBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, Sparkles, FlaskConical, Package, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { DupeCard } from "@/components/DupeCard";
import { toast } from "@/hooks/use-toast";

interface Analysis {
  id: string;
  product_name: string;
  brand: string | null;
  epiq_score: number | null;
  product_price: number | null;
  ingredients_list: string;
  category: string | null;
}

interface MarketDupe {
  name: string;
  brand: string;
  imageUrl: string;
  reasons: string[];
  sharedIngredients: string[];
  priceEstimate: string;
  profileMatch: boolean;
  category: string;
  whereToBuy?: string;
}

interface SavedDupe {
  id: string;
  product_name: string;
  brand: string | null;
}

const CATEGORY_FILTERS = ['all', 'face', 'body', 'hair'] as const;
type CategoryFilter = typeof CATEGORY_FILTERS[number];

export default function Compare() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [findingDupes, setFindingDupes] = useState(false);
  const [marketDupes, setMarketDupes] = useState<MarketDupe[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [savedDupes, setSavedDupes] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [skinProfile, setSkinProfile] = useState<{ skinType: string; concerns: string[] }>({ skinType: 'normal', concerns: [] });
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
          .select("id, product_name, brand, epiq_score, product_price, ingredients_list, category")
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
        setAnalyses(analysesRes.data);
        if (analysesRes.data.length > 0) setSelectedProductId(analysesRes.data[0].id);
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

  const selectedProduct = useMemo(() => 
    analyses.find(a => a.id === selectedProductId), 
    [analyses, selectedProductId]
  );

  const findMarketDupes = async () => {
    if (!selectedProduct) return;
    
    setFindingDupes(true);
    setMarketDupes([]);

    try {
      const ingredients = selectedProduct.ingredients_list
        .split(',')
        .map(i => i.trim())
        .filter(Boolean);

      const { data, error } = await supabase.functions.invoke('find-dupes', {
        body: {
          productName: selectedProduct.product_name,
          brand: selectedProduct.brand,
          ingredients,
          category: selectedProduct.category || 'face',
          skinType: skinProfile.skinType,
          concerns: skinProfile.concerns,
        }
      });

      if (error) throw error;
      
      if (data?.dupes && Array.isArray(data.dupes)) {
        setMarketDupes(data.dupes);
      }
    } catch (error) {
      console.error('Error finding dupes:', error);
      toast({
        title: 'Error finding dupes',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setFindingDupes(false);
    }
  };

  const parseIngredients = (list: string): string[] => {
    return list.toLowerCase()
      .split(/[,;]/)
      .map(i => i.trim())
      .filter(i => i.length > 2);
  };

  // My Products comparison (existing logic)
  const myProductMatches = useMemo(() => {
    if (!selectedProduct || analyses.length < 2) return [];

    const sourceIngredients = parseIngredients(selectedProduct.ingredients_list);
    const sourcePrice = selectedProduct.product_price;

    return analyses
      .filter(a => a.id !== selectedProductId)
      .map(product => {
        const targetIngredients = parseIngredients(product.ingredients_list);
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
      .filter(m => m.overlapPercent >= 30)
      .sort((a, b) => b.overlapPercent - a.overlapPercent);
  }, [selectedProduct, analyses, selectedProductId]);

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
          source_product_id: selectedProductId
        });

      if (!error) {
        setSavedDupes(prev => new Set(prev).add(key));
        toast({ title: "Saved to favorites ❤️" });
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
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
          <Skeleton className="h-10 w-48 mb-6" />
          <Skeleton className="h-12 w-full mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-[3/4] w-full" />)}
          </div>
        </div>
        <ResponsiveBottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-6 pb-24 lg:pb-8">
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
            Find affordable alternatives to your products
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
          <>
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
                    onClick={findMarketDupes} 
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
              <Tabs defaultValue="market" className="space-y-6">
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
                      <p className="text-muted-foreground">🔍 Searching the market for dupes...</p>
                    </div>
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
                              matchPercentage={dupe.profileMatch ? 95 : 80}
                              reasons={dupe.reasons}
                              sharedIngredients={dupe.sharedIngredients}
                              isSaved={savedDupes.has(key)}
                              onToggleSave={() => toggleSaveMarketDupe(dupe)}
                              whereToBuy={dupe.whereToBuy}
                              category={dupe.category}
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : marketDupes.length === 0 ? (
                    <Card className="border-dashed">
                      <CardContent className="py-12 text-center">
                        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-lg font-medium mb-2">Ready to discover dupes?</h3>
                        <p className="text-muted-foreground text-sm max-w-md mx-auto">
                          Click "Find Market Dupes" to discover affordable alternatives from brands like CeraVe, The Ordinary, and more.
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
                              priceEstimate={match.product.product_price ? `$${match.product.product_price}` : undefined}
                              reasons={match.whyDupe}
                              sharedIngredients={match.sharedIngredients}
                              matchPercentage={match.overlapPercent}
                              isSaved={savedDupes.has(key)}
                              onToggleSave={() => toggleSaveMyProduct(match)}
                              category={match.product.category || 'face'}
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
                            : "No similar products found in your collection."}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </>
        )}
      </main>

      <ResponsiveBottomNav />
      
      <PaywallModal 
        open={showPaywall} 
        onOpenChange={setShowPaywall}
        feature="dupe_discovery"
        featureDescription="Unlock unlimited dupe discovery to find the best value products"
      />
    </div>
  );
}
