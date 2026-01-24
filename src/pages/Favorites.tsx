import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Heart, Search, Sparkles } from "lucide-react";
import { DupeCard } from "@/components/DupeCard";
import { toast } from "@/hooks/use-toast";

interface SavedDupe {
  id: string;
  product_name: string;
  brand: string | null;
  image_url: string | null;
  reasons: string[] | null;
  shared_ingredients: string[] | null;
  price_estimate: string | null;
  where_to_buy?: string | null;
  purchase_url?: string | null;
  source_product_id?: string | null;
  saved_at: string | null;
}

type SortOption = 'recent' | 'price-low' | 'price-high' | 'brand-az';
type CategoryFilter = 'all' | 'face' | 'body' | 'hair';
type PriceFilter = 'all' | 'under15' | '15-30' | '30-50' | '50plus';

export default function Favorites() {
  const navigate = useNavigate();
  const [savedDupes, setSavedDupes] = useState<SavedDupe[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');

  useEffect(() => {
    const fetchSavedDupes = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data, error } = await supabase
          .from("saved_dupes")
          .select("*")
          .eq("user_id", user.id)
          .order("saved_at", { ascending: false });

        if (!error && data) {
          setSavedDupes(data);
        }
      } catch (error: any) {
        console.error("Unable to load favorites:", error);
        toast({
          title: "Favorites unavailable",
          description: error?.message || "Please try again later.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSavedDupes();
  }, [navigate, toast]);

  const handleUnsave = async (dupeId: string) => {
    const { error } = await supabase
      .from("saved_dupes")
      .delete()
      .eq("id", dupeId);

    if (!error) {
      setSavedDupes(prev => prev.filter(d => d.id !== dupeId));
      toast({ title: "Removed from favorites" });
    } else {
      console.error('Error removing favorite:', error);
      toast({ title: 'Failed to remove favorite', description: error.message || 'Please try again later.', variant: 'destructive' });
    }
  };

  const parsePrice = (priceStr: string | null): number | null => {
    if (!priceStr) return null;
    const match = priceStr.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : null;
  };

  const filteredAndSortedDupes = useMemo(() => {
    let result = [...savedDupes];

    // Price filter
    if (priceFilter !== 'all') {
      result = result.filter(dupe => {
        const price = parsePrice(dupe.price_estimate);
        if (!price) return false;
        switch (priceFilter) {
          case 'under15': return price < 15;
          case '15-30': return price >= 15 && price < 30;
          case '30-50': return price >= 30 && price < 50;
          case '50plus': return price >= 50;
          default: return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case 'recent':
        result.sort((a, b) => 
          new Date(b.saved_at || 0).getTime() - new Date(a.saved_at || 0).getTime()
        );
        break;
      case 'price-low':
        result.sort((a, b) => (parsePrice(a.price_estimate) || 999) - (parsePrice(b.price_estimate) || 999));
        break;
      case 'price-high':
        result.sort((a, b) => (parsePrice(b.price_estimate) || 0) - (parsePrice(a.price_estimate) || 0));
        break;
      case 'brand-az':
        result.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''));
        break;
    }

    return result;
  }, [savedDupes, sortBy, priceFilter]);

  const brandOptions = useMemo(() => {
    const brands = savedDupes
      .map(d => d.brand)
      .filter((b): b is string => !!b);
    return [...new Set(brands)].sort();
  }, [savedDupes]);

  if (loading) {
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
        <div className="container mx-auto pb-24 lg:pb-8">
          <Skeleton className="h-10 w-48 mb-6" />
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
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500" />
            Saved Favorites
          </h1>
          <p className="text-muted-foreground mt-1">
            {savedDupes.length} saved {savedDupes.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {savedDupes.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold text-lg mb-2">No saved favorites yet</h3>
              <p className="text-muted-foreground mb-4">
                Find dupes and save your favorites to view them here
              </p>
              <Button onClick={() => navigate("/compare")} className="gap-2">
                <Sparkles className="w-4 h-4" />
                Find Dupes
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
            <div className="space-y-6">
              {/* Filters and Sort */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Recently Saved</SelectItem>
                    <SelectItem value="price-low">Price: Low to High</SelectItem>
                    <SelectItem value="price-high">Price: High to Low</SelectItem>
                    <SelectItem value="brand-az">Brand A-Z</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={priceFilter} onValueChange={(v) => setPriceFilter(v as PriceFilter)}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Price range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Prices</SelectItem>
                    <SelectItem value="under15">Under $15</SelectItem>
                    <SelectItem value="15-30">$15 - $30</SelectItem>
                    <SelectItem value="30-50">$30 - $50</SelectItem>
                    <SelectItem value="50plus">$50+</SelectItem>
                  </SelectContent>
                </Select>

                <Button 
                  variant="outline" 
                  onClick={() => navigate("/compare")}
                  className="gap-2 ml-auto sm:ml-0 flex-shrink-0"
                >
                  <Search className="w-4 h-4" />
                  Find More Dupes
                </Button>
              </div>

              {/* Grid of saved dupes */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAndSortedDupes.map((dupe, idx) => (
                  <div 
                    key={dupe.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <DupeCard
                      name={dupe.product_name}
                      brand={dupe.brand || "Unknown"}
                      imageUrl={dupe.image_url || undefined}
                      reasons={dupe.reasons || []}
                      sharedIngredients={dupe.shared_ingredients || []}
                      priceEstimate={dupe.price_estimate || undefined}
                      whereToBuy={dupe.where_to_buy || undefined}
                      purchaseUrl={dupe.purchase_url || undefined}
                      isSaved={true}
                      onToggleSave={() => handleUnsave(dupe.id)}
                      category="skincare"
                      showPlaceholder={true}
                    />
                    <Button
                      variant="link"
                      className="mt-2 px-0 text-xs"
                      onClick={() => {
                        if (dupe.source_product_id) {
                          navigate(`/compare?productId=${dupe.source_product_id}`);
                        } else {
                          navigate("/compare");
                        }
                      }}
                    >
                      Find more dupes like this
                    </Button>
                  </div>
                ))}
              </div>

              {filteredAndSortedDupes.length === 0 && savedDupes.length > 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No favorites match the current filters
                  </p>
                  <Button 
                    variant="link" 
                    onClick={() => {
                      setSortBy('recent');
                      setPriceFilter('all');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-base font-medium">Favorites Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Total saved</p>
                    <p className="font-semibold">{savedDupes.length}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">Brands saved</p>
                    <p className="font-semibold">{brandOptions.length}</p>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={() => navigate("/compare")}>
                    Find more dupes
                  </Button>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="space-y-3">
                  <h4 className="text-sm font-semibold">Need to organize?</h4>
                  <p className="text-xs text-muted-foreground">
                    Rate your favorites or export your list to share.
                  </p>
                  <Button variant="outline" className="w-full">
                    Export List
                  </Button>
                </CardContent>
              </Card>
            </aside>
          </div>
        )}
      </main>
    </AppShell>
  );
}
