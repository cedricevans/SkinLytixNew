import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTracking, trackEvent } from "@/hooks/useTracking";
import { ScanLine, ArrowRight, History, TrendingUp } from "lucide-react";
import heroBg from "@/assets/landing/hero-background.jpg";

type Analysis = {
  id: string;
  product_name: string;
  brand: string | null;
  epiq_score: number | null;
  analyzed_at: string | null;
  category: string | null;
  recommendations_json?: unknown;
};

type Favorite = {
  id: string;
  product_name: string;
  brand: string | null;
  price_estimate: string | null;
};

type RoutineProduct = {
  id: string;
  product_name: string;
  epiq_score: number | null;
  product_price: number | null;
  category: string | null;
};

type HomeCachePayload = {
  timestamp: number;
  recentAnalyses: Analysis[];
  totalAnalyses: number;
  favorites: Favorite[];
  routineProducts: RoutineProduct[];
};

const HOME_CACHE_TTL_MS = 30 * 60 * 1000;

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const formatCurrency = (value?: number | null) => {
  if (value == null) return "—";
  return `$${value.toFixed(2)}`;
};

const Home = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  useTracking("home");
  const [recentAnalyses, setRecentAnalyses] = useState<Analysis[]>([]);
  const [totalAnalyses, setTotalAnalyses] = useState(0);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [routineProducts, setRoutineProducts] = useState<RoutineProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const user = session?.user;
        if (!user) return;

        const cacheKey = `sl_home_cache_${user.id}`;
        let cached: HomeCachePayload | null = null;
        if (typeof window !== "undefined") {
          try {
            const cachedRaw = localStorage.getItem(cacheKey);
            cached = cachedRaw ? JSON.parse(cachedRaw) : null;
          } catch {
            cached = null;
          }
        }
        const isCacheFresh = cached && Date.now() - cached.timestamp < HOME_CACHE_TTL_MS;

        if (cached) {
          setRecentAnalyses(cached.recentAnalyses || []);
          setTotalAnalyses(cached.totalAnalyses || 0);
          setFavorites(cached.favorites || []);
          setRoutineProducts(cached.routineProducts || []);
          setIsLoading(false);
        } else {
          setIsLoading(true);
        }

        if (isCacheFresh) return;

        const [analysesRes, totalRes, favoritesRes, routineRes] = await Promise.all([
          supabase
            .from("user_analyses")
            .select("id, product_name, brand, epiq_score, analyzed_at, category, recommendations_json, image_url")
            .eq("user_id", user.id)
            .order("analyzed_at", { ascending: false })
            .limit(8),
          supabase
            .from("user_analyses")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("saved_dupes")
            .select("id, product_name, brand, price_estimate")
            .eq("user_id", user.id)
            .order("saved_at", { ascending: false })
            .limit(5),
          supabase
            .from("routine_products")
            .select("id, product_price, category, user_analyses (product_name, epiq_score, product_price)")
            .eq("user_analyses.user_id", user.id),
        ]);

        const nextRecentAnalyses = analysesRes.data || [];
        const nextTotal = totalRes.count ?? 0;
        const nextFavorites = favoritesRes.data || [];

        const routineEntries = (routineRes.data || []).map((entry: any) => ({
          id: entry.id,
          product_name: entry.user_analyses?.product_name,
          epiq_score: entry.user_analyses?.epiq_score ?? null,
          product_price: entry.user_analyses?.product_price ?? entry.product_price ?? null,
          category: entry.category ?? "Routine",
        }));
        const nextRoutineProducts = routineEntries;

        setRecentAnalyses(analysesRes.data || []);
        setTotalAnalyses(nextTotal);
        setFavorites(nextFavorites);
        setRoutineProducts(nextRoutineProducts);

        if (typeof window !== "undefined") {
          const payload: HomeCachePayload = {
            timestamp: Date.now(),
            recentAnalyses: (analysesRes.data || []),
            totalAnalyses: nextTotal,
            favorites: nextFavorites,
            routineProducts: nextRoutineProducts,
          };
          localStorage.setItem(cacheKey, JSON.stringify(payload));
        }
      } catch (error: any) {
        toast({
          title: "Unable to load dashboard",
          description: error?.message || "Please try again shortly.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [toast]);

  const latestAnalysis = recentAnalyses[0];

  const hydrationScore = useMemo(() => {
    const scores = recentAnalyses.map((analysis) => analysis.epiq_score || 0).filter(Boolean);
    if (!scores.length) return null;
    return Math.round(scores.reduce((acc, value) => acc + value, 0) / scores.length);
  }, [recentAnalyses]);

  const routineCost = useMemo(
    () => routineProducts.reduce((sum, product) => sum + (product.product_price || 0), 0),
    [routineProducts]
  );

  const highestEpiq = useMemo(
    () => Math.max(...routineProducts.map((p) => p.epiq_score || 0), 0),
    [routineProducts]
  );

  const lowestEpiq = useMemo(
    () => (routineProducts.length ? Math.min(...routineProducts.map((p) => p.epiq_score || 0)) : 0),
    [routineProducts]
  );

  const nextAction = useMemo(() => {
    if (!recentAnalyses.length) return "Start by scanning a product to populate this dashboard.";
    if (!routineProducts.length) return "Add scans to your routine to unlock balance insights.";
    if (hydrationScore !== null && hydrationScore < 70) return "Your hydration index is below 70—review your routine.";
    return "Keep scanning to unlock deeper ingredient insights.";
  }, [recentAnalyses.length, routineProducts.length, hydrationScore]);

  return (
    <AppShell
      showNavigation
      showBottomNav
      contentClassName="bg-[#f4f7fb] px-[5px] lg:px-4 py-8"
      loading={isLoading}
      loadingLabel="Loading your dashboard..."
    >
      <PageHeader>
        <div className="flex flex-col gap-2 md:flex-row md:justify-between md:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Dashboard</p>
            <h1 className="text-3xl font-semibold text-foreground">Your SkinLytix Home</h1>
          </div>
          <Button
            variant="cta"
            className="gap-2"
            onClick={() => {
              try { trackEvent({ eventName: 'home_scan_click', eventCategory: 'engagement', eventProperties: { location: 'home' } }); } catch (e) {}
              navigate('/upload');
            }}
          >
            <ScanLine className="h-4 w-4" />
            Scan a Product
          </Button>
        </div>
      </PageHeader>

      <section
        className="relative mx-auto max-w-6xl rounded-[28px] p-8 text-white shadow-[0_20px_60px_rgba(15,23,42,0.35)] overflow-hidden mb-10"
        style={{
          backgroundImage:
            "linear-gradient(135deg, rgba(215, 38, 86, 0.7) 0%, rgba(240, 73, 122, 0.45) 100%)",
        }}
      >
        <div className="absolute inset-0 bg-cover bg-center opacity-18" style={{ backgroundImage: `url(${heroBg})` }} />
        <div className="absolute inset-0 bg-gradient-to-r from-[#b01a4a]/65 via-[#d84572]/35 to-transparent" />
        <div className="absolute inset-0 bg-black/18" />
        <div className="relative z-10 grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-white/80 drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              Routine snapshot
            </p>
            <h2 className="text-3xl font-bold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]">
              Keep your routine balanced without the guesswork
            </h2>
            <p className="mt-3 text-sm text-white/85 max-w-xl drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">
              We analyze every product for safety, performance, and compatibility so you can confidently add only what your skin truly needs.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {["Pro insights", "Ingredients-first"].map((label) => (
                <span
                  key={label}
                  className="rounded-full border border-white/40 bg-black/30 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm"
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="grid gap-4">
            <Card className="bg-white/25 text-white p-4 rounded-2xl border border-white/40 shadow-lg">
              <p className="text-xs uppercase tracking-[0.4em] opacity-80">Hydration index</p>
              <p className="text-2xl font-bold">{hydrationScore ? `${hydrationScore}/100` : "—"}</p>
              <p className="text-xs text-white/80">Average EpiQ of recent scans</p>
            </Card>
            <Card className="bg-white/25 text-white p-4 rounded-2xl border border-white/40 shadow-lg">
              <p className="text-xs uppercase tracking-[0.4em] opacity-80">Routine balance</p>
              <p className="text-2xl font-bold">{routineProducts.length} products</p>
              <p className="text-xs text-white/80">Based on your routine data</p>
            </Card>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-8 pb-10">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="rounded-2xl border border-[#d7e3ee] bg-white shadow-[0_10px_25px_rgba(15,23,42,0.08)] px-5 py-6">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Total scans</p>
            <p className="mt-3 text-3xl font-semibold">{totalAnalyses}</p>
            <p className="text-xs text-muted-foreground mt-1">Across your entire history</p>
          </Card>
          <Card className="rounded-2xl border border-[#d7e3ee] bg-white shadow-[0_10px_25px_rgba(15,23,42,0.08)] px-5 py-6">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Latest EpiQ</p>
            <p className="mt-3 text-3xl font-semibold">{latestAnalysis?.epiq_score ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {latestAnalysis ? `${latestAnalysis.product_name} • ${formatDate(latestAnalysis.analyzed_at)}` : "Upload a product to see it here"}
            </p>
          </Card>
          <Card className="rounded-2xl border border-[#d7e3ee] bg-white shadow-[0_10px_25px_rgba(15,23,42,0.08)] px-5 py-6">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Latest scan</p>
            <p className="mt-3 text-3xl font-semibold">{latestAnalysis?.product_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground mt-1">Most recent product update</p>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <Card
            className="rounded-[22px] text-white shadow-[0_20px_45px_rgba(15,23,42,0.35)] p-6 space-y-4"
            style={{ backgroundColor: "#0f172a", borderColor: "#0f172a" }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Routine health summary</p>
              <Badge className="bg-white/15 text-white border-white/30">{routineProducts.length} products</Badge>
            </div>
            <h3 className="text-2xl font-semibold">Real-time routine insights</h3>
            <div className="text-sm text-white/80 space-y-2">
              <p>Total routine cost: {formatCurrency(routineCost)}</p>
              <p>Highest EpiQ product: {highestEpiq}</p>
              <p>Lowest EpiQ product: {lowestEpiq}</p>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              {routineProducts.slice(0, 3).map((product) => (
                <div key={product.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{product.product_name}</p>
                    <p className="text-xs text-white/60">{product.category}</p>
                  </div>
                  <span className="text-xs text-white/60">{product.epiq_score ?? "—"} EpiQ</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="rounded-[22px] border border-[#d7e3ee] bg-white shadow-[0_10px_25px_rgba(15,23,42,0.08)] p-6 space-y-4">
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">What to do next</p>
            <h3 className="text-2xl font-semibold text-foreground">Keep your routine moving</h3>
            <div className="rounded-2xl border border-slate-200 bg-[#f5f8fc] p-4 text-sm text-muted-foreground">
              {nextAction}
            </div>
            <Button
              variant="outline"
              className="w-fit border-[#0b5166] text-[#0b5166] hover:bg-[#e6f2f5]"
              onClick={() => {
                try { trackEvent({ eventName: 'home_review_routine_click', eventCategory: 'engagement', eventProperties: { location: 'home' } }); } catch (e) {}
                navigate('/routine');
              }}
            >
              Review routine
            </Button>
          </Card>
        </section>

        <section
          className="rounded-[22px] text-white shadow-[0_18px_35px_rgba(15,23,42,0.2)] p-6 space-y-4"
          style={{ backgroundColor: "#6b6b6b", borderColor: "#56606a" }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-white/70">Saved favorites</p>
              <h3 className="text-lg font-semibold">Continue where you left off</h3>
            </div>
            <span className="text-xs uppercase tracking-[0.4em] text-white/70">{favorites.length} saved</span>
          </div>
          <div className="space-y-2 text-sm text-white/80">
            {favorites.length ? (
              favorites.slice(0, 3).map((fav) => (
                <div key={fav.id} className="rounded-lg bg-white/15 px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{fav.product_name}</p>
                    <p className="text-xs text-white/60">{fav.brand || "Brand pending"} · {fav.price_estimate || "Price unknown"}</p>
                  </div>
                  <span className="text-xs text-white/60">Saved</span>
                </div>
              ))
            ) : (
              <p>No favorites yet. Save a dupe to see it here.</p>
            )}
          </div>
          <div className="flex justify-end">
            <Button
              variant="secondary"
              className="bg-[#fdf0f4] text-[#b01943] hover:bg-[#e6f2f5] hover:text-[#0b5166]"
              onClick={() => {
                try { trackEvent({ eventName: 'home_view_favorites_click', eventCategory: 'engagement', eventProperties: { location: 'home' } }); } catch (e) {}
                navigate('/favorites');
              }}
            >
              View favorites
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card
            className="rounded-[22px] text-white shadow-[0_20px_60px_rgba(236,72,153,0.35)] p-6 space-y-3"
            style={{ backgroundImage: "linear-gradient(135deg, #d72656 0%, #f0497a 100%)" }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/80">Community highlights</p>
            <h3 className="text-2xl font-semibold">Skin-care stories</h3>
            <p className="text-sm text-white/80">
              Insights from your latest scans and routines.
            </p>
            <Button
              variant="secondary"
              className="w-fit bg-[#fdf0f4] text-[#b01943] hover:bg-[#e6f2f5] hover:text-[#0b5166]"
              onClick={() => {
                try { trackEvent({ eventName: 'home_community_analyze_click', eventCategory: 'engagement', eventProperties: { location: 'home' } }); } catch (e) {}
                navigate('/upload');
              }}
            >
              Analyze now
            </Button>
          </Card>
          <Card
            className="rounded-[22px] text-white shadow-[0_20px_60px_rgba(14,165,233,0.25)] p-6 space-y-3"
            style={{ backgroundImage: "linear-gradient(135deg, #2f6f86 0%, #3f8aa6 100%)" }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-white/80">Routine gallery</p>
            <h3 className="text-xl font-semibold">Visual routine board</h3>
            <div className="space-y-3 text-sm">
              {routineProducts.length ? (
                routineProducts.slice(0, 3).map((product) => (
                  <div key={product.id} className="rounded-lg bg-white/10 p-3">
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-xs text-white/70">{product.category} • {product.epiq_score ?? "—"} EpiQ</p>
                  </div>
                ))
              ) : (
                <p>No routine products yet. Add scans to populate your board.</p>
              )}
            </div>
          </Card>
          <Card
            className="rounded-[22px] shadow-lg p-6 space-y-3"
            style={{ backgroundImage: "linear-gradient(135deg, #dbe9f0 0%, #f6fafc 100%)" }}
          >
            <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground">Visual cues</p>
            <h3 className="text-xl font-semibold text-foreground">Ingredient categories</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {["Actives", "Soothers", "Oils"].map((label) => (
                <span key={label} className="rounded-2xl border border-slate-300 px-2 py-1 text-xs font-semibold">
                  {label}
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Track how often each category appears in your uploads.
            </p>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card className="rounded-[22px] border border-[#d7e3ee] bg-white shadow-[0_10px_25px_rgba(15,23,42,0.08)] p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <History className="h-4 w-4" />
                <h2 className="font-semibold">Recent scans</h2>
              </div>
              <Button
                variant="secondary"
                size="sm"
                className="bg-[#e6f2f5] text-[#0b5166] hover:bg-[#d8edf2] hover:text-[#083c4d]"
                onClick={() => {
                  try { trackEvent({ eventName: 'home_view_all_scans_click', eventCategory: 'engagement', eventProperties: { location: 'home' } }); } catch (e) {}
                  navigate('/profile');
                }}
              >
                View all scans
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading your scans…</p>
            ) : !recentAnalyses.length ? (
              <p className="text-sm text-muted-foreground">No scans yet. Start by scanning a product.</p>
            ) : (
              <div className="space-y-3">
                {recentAnalyses.slice(0, 5).map((analysis) => (
                  <div key={analysis.id} className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 shadow-sm">
                    <div>
                      <p className="font-semibold text-foreground">{analysis.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.brand || "Brand pending"} · {formatDate(analysis.analyzed_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{analysis.epiq_score ?? "—"}</p>
                      <p className="text-[11px] uppercase text-muted-foreground tracking-[0.3em]">EpiQ</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="rounded-[22px] border border-[#d7e3ee] bg-white shadow-[0_10px_25px_rgba(15,23,42,0.08)] p-6 space-y-3">
            <div className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4" />
              <h2 className="font-semibold">Quick actions</h2>
            </div>
            <div className="space-y-2">
              {[
                { label: "Scan a new product", href: "/upload" },
                { label: "Find dupes", href: "/compare" },
                { label: "Review favorites", href: "/favorites" },
                { label: "Optimize routine", href: "/routine" },
                { label: "View profile", href: "/profile" },
              ].map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  className="w-full justify-between"
                  onClick={() => {
                    try {
                      trackEvent({ eventName: `home_quick_${action.label.toLowerCase().replace(/\s+/g, '_')}`, eventCategory: 'engagement', eventProperties: { label: action.label } });
                    } catch (e) {}
                    navigate(action.href);
                  }}
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ))}
            </div>
          </Card>
        </section>

        <section className="space-y-3">
          {/* Suggested matches removed per UX request */}
        </section>
      </div>
    </AppShell>
  );
};

export default Home;
