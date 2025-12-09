import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import { ResponsiveBottomNav } from "@/components/ResponsiveBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
    fetchSavedDupes();
  }, []);

  const fetchSavedDupes = async () => {
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
    setLoading(false);
  };

  const handleUnsave = async (dupeId: string) => {
    const { error } = await supabase
      .from("saved_dupes")
      .delete()
      .eq("id", dupeId);

    if (!error) {
      setSavedDupes(prev => prev.filter(d => d.id !== dupeId));
      toast({ title: "Removed from favorites" });
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

  const uniqueBrands = useMemo(() => {
    const brands = savedDupes
      .map(d => d.brand)
      .filter((b): b is string => !!b);
    return [...new Set(brands)].sort();
  }, [savedDupes]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 pb-24 lg:pb-8">
          <Skeleton className="h-10 w-48 mb-6" />
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
          <>
            {/* Filters and Sort */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-full sm:w-[180px]">
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
                <SelectTrigger className="w-full sm:w-[160px]">
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
                className="gap-2 ml-auto"
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
                    isSaved={true}
                    onToggleSave={() => handleUnsave(dupe.id)}
                    category="skincare"
                  />
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
          </>
        )}
      </main>

      <ResponsiveBottomNav />
    </div>
  );
}
