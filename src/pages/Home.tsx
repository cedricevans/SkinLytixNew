import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, Sparkles, ArrowRight, TrendingUp, History } from "lucide-react";

type AnalysisSummary = {
  id: string;
  product_name: string;
  brand?: string | null;
  category?: string | null;
  epiq_score?: number | null;
  created_at?: string | null;
  recommendations_json?: any;
};

const formatDate = (dateString?: string | null) => {
  if (!dateString) return "Recent";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Recent";
  return date.toLocaleDateString();
};

const Home = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [recentAnalyses, setRecentAnalyses] = useState<AnalysisSummary[]>([]);
  const [totalAnalyses, setTotalAnalyses] = useState(0);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        const { data: analyses } = await supabase
          .from("user_analyses")
          .select("id, product_name, brand, category, epiq_score, created_at, recommendations_json")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(6);

        const { count } = await supabase
          .from("user_analyses")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        setRecentAnalyses(analyses || []);
        setTotalAnalyses(count || 0);
      } catch (error: any) {
        toast({
          title: "Dashboard unavailable",
          description: error?.message || "Please try again in a moment.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, [navigate, toast]);

  const averageScore = useMemo(() => {
    const scores = recentAnalyses
      .map((item) => item.epiq_score)
      .filter((score): score is number => typeof score === "number");
    if (!scores.length) return null;
    const total = scores.reduce((sum, score) => sum + score, 0);
    return Math.round(total / scores.length);
  }, [recentAnalyses]);

  const suggestions = useMemo(() => {
    return recentAnalyses.slice(0, 3).map((analysis) => ({
      id: analysis.id,
      title: analysis.product_name,
      tag: analysis.category ? analysis.category.replace(/-/g, " ") : "Routine match",
      description: `Complements your recent scan and keeps your routine balanced.`,
    }));
  }, [recentAnalyses]);

  return (
    <AppShell showNavigation showBottomNav contentClassName="px-4 py-6 md:py-10">
      <PageHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Dashboard</p>
            <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Your SkinLytix Home</h1>
          </div>
          <Button variant="cta" className="gap-2" onClick={() => navigate("/upload")}>
            <ScanLine className="h-4 w-4" />
            Scan a Product
          </Button>
        </div>
      </PageHeader>

      <div className="max-w-5xl mx-auto space-y-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card className="p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Total scans</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{totalAnalyses}</p>
            <p className="mt-1 text-xs text-muted-foreground">Across all your products</p>
          </Card>
          <Card className="p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Avg EpiQ</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{averageScore ?? "—"}</p>
            <p className="mt-1 text-xs text-muted-foreground">Based on recent scans</p>
          </Card>
          <Card className="p-4 md:p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Latest scan</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatDate(recentAnalyses[0]?.created_at)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Most recent product update</p>
          </Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[2fr,1fr]">
          <Card className="p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-foreground">
                <History className="h-4 w-4" />
                <h2 className="font-semibold">Recent scans</h2>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                View all
              </Button>
            </div>

            {isLoading && (
              <p className="text-sm text-muted-foreground">Loading your scans…</p>
            )}

            {!isLoading && recentAnalyses.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No scans yet. Start by analyzing your first product.
              </div>
            )}

            <div className="space-y-3">
              {recentAnalyses.map((analysis) => (
                <button
                  key={analysis.id}
                  onClick={() => navigate(`/analysis/${analysis.id}`)}
                  className="w-full text-left rounded-lg border border-border bg-background/80 p-3 transition hover:bg-accent/10"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">{analysis.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {analysis.brand || "Brand pending"} · {formatDate(analysis.created_at)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">
                        {analysis.epiq_score ?? "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">EpiQ</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-4 md:p-6 space-y-4">
            <div className="flex items-center gap-2 text-foreground">
              <TrendingUp className="h-4 w-4" />
              <h2 className="font-semibold">Quick actions</h2>
            </div>
            <div className="grid gap-2">
              <Button variant="outline" onClick={() => navigate("/upload")} className="justify-between">
                Scan a new product
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/compare")} className="justify-between">
                Find dupes
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/favorites")} className="justify-between">
                Review favorites
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/routine")} className="justify-between">
                Optimize routine
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("/profile")} className="justify-between">
                View profile
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-4 w-4" />
            <h2 className="font-semibold">Suggested matches</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {suggestions.length > 0 ? (
              suggestions.map((suggestion) => (
                <Card key={suggestion.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Sponsored</Badge>
                    <Badge variant="secondary">{suggestion.tag}</Badge>
                  </div>
                  <p className="font-medium text-foreground">{suggestion.title}</p>
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                  <Button variant="ghost" size="sm" className="px-0">
                    View details
                  </Button>
                </Card>
              ))
            ) : (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">
                  Run a scan to unlock tailored product matches.
                </p>
              </Card>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
};

export default Home;
