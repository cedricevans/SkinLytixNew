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
import { ArrowLeft, Search, Sparkles, DollarSign, Percent, FlaskConical } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { PaywallModal } from "@/components/paywall/PaywallModal";

interface Analysis {
  id: string;
  product_name: string;
  brand: string | null;
  epiq_score: number | null;
  product_price: number | null;
  ingredients_list: string;
  category: string | null;
}

interface DupeMatch {
  product: Analysis;
  overlapPercent: number;
  sharedIngredients: string[];
  priceDiff: number | null;
  whyDupe: string[];
}

export default function Compare() {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaywall, setShowPaywall] = useState(false);
  const { effectiveTier } = useSubscription();

  const dupeLimit = effectiveTier === 'pro' ? Infinity : effectiveTier === 'premium' ? 5 : 2;

  useEffect(() => {
    const fetchAnalyses = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_analyses")
        .select("id, product_name, brand, epiq_score, product_price, ingredients_list, category")
        .eq("user_id", user.id)
        .order("analyzed_at", { ascending: false });

      if (!error && data) {
        setAnalyses(data);
        if (data.length > 0) setSelectedProductId(data[0].id);
      }
      setLoading(false);
    };

    fetchAnalyses();
  }, [navigate]);

  const selectedProduct = useMemo(() => 
    analyses.find(a => a.id === selectedProductId), 
    [analyses, selectedProductId]
  );

  const parseIngredients = (list: string): string[] => {
    return list.toLowerCase()
      .split(/[,;]/)
      .map(i => i.trim())
      .filter(i => i.length > 2);
  };

  const dupeMatches = useMemo((): DupeMatch[] => {
    if (!selectedProduct) return [];

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

        if (shared.length > 0) {
          const topShared = shared.slice(0, 3).join(", ");
          whyDupe.push(`Shares: ${topShared}`);
        }

        if (priceDiff !== null && priceDiff > 0) {
          whyDupe.push(`💰 $${priceDiff.toFixed(2)} cheaper`);
        }

        const scoreDiff = Math.abs((selectedProduct.epiq_score || 0) - (product.epiq_score || 0));
        if (scoreDiff <= 10) {
          whyDupe.push("Similar EpiQ score tier");
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

  const visibleMatches = dupeMatches.slice(0, dupeLimit);
  const hasMoreMatches = dupeMatches.length > dupeLimit;

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
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
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
            Find similar products with better value
          </p>
        </div>

        {analyses.length < 2 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <FlaskConical className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">Analyze More Products</h3>
              <p className="text-muted-foreground mb-4">
                You need at least 2 analyzed products to find dupes
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
              <CardContent>
                <Select value={selectedProductId || ""} onValueChange={setSelectedProductId}>
                  <SelectTrigger className="w-full">
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

                {selectedProduct && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-center justify-between">
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

            {/* Dupe Matches */}
            <div className="space-y-4">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                {dupeMatches.length > 0 
                  ? `Found ${dupeMatches.length} potential dupe${dupeMatches.length > 1 ? 's' : ''}`
                  : "No dupes found"}
              </h2>

              {visibleMatches.map((match, idx) => (
                <Card 
                  key={match.product.id} 
                  className="overflow-hidden hover:shadow-md transition-shadow animate-fade-in"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge 
                            variant={match.overlapPercent >= 70 ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            <Percent className="w-3 h-3 mr-1" />
                            {match.overlapPercent}% match
                          </Badge>
                          {match.priceDiff !== null && match.priceDiff > 0 && (
                            <Badge variant="outline" className="text-emerald-600 border-emerald-200 shrink-0">
                              <DollarSign className="w-3 h-3 mr-0.5" />
                              Save ${match.priceDiff.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold truncate">{match.product.product_name}</h3>
                        <p className="text-sm text-muted-foreground">{match.product.brand}</p>
                        
                        {/* Why it's a dupe */}
                        <ul className="mt-3 space-y-1">
                          {match.whyDupe.map((reason, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary">•</span>
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="text-right shrink-0">
                        <p className={`font-bold text-xl ${getScoreColor(match.product.epiq_score)}`}>
                          {match.product.epiq_score || "—"}
                        </p>
                        <p className="text-xs text-muted-foreground">EpiQ</p>
                        {match.product.product_price && (
                          <p className="text-sm font-medium mt-1">
                            ${match.product.product_price}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {dupeMatches.length === 0 && selectedProduct && (
                <Card className="border-dashed">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No similar products found. Analyze more products to discover dupes!
                    </p>
                  </CardContent>
                </Card>
              )}

              {hasMoreMatches && (
                <Card 
                  className="border-dashed cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setShowPaywall(true)}
                >
                  <CardContent className="py-6 text-center">
                    <p className="text-muted-foreground mb-2">
                      +{dupeMatches.length - dupeLimit} more dupes found
                    </p>
                    <Button variant="outline" size="sm">
                      Upgrade to see all
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
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
