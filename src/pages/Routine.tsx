import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Sparkles, DollarSign, AlertTriangle } from "lucide-react";

interface Analysis {
  id: string;
  product_name: string;
  epiq_score: number;
  analyzed_at: string;
}

interface RoutineProduct {
  id: string;
  analysis_id: string;
  usage_frequency: string;
  product_price: number | null;
  user_analyses: {
    product_name: string;
    brand?: string;
    category?: string;
    epiq_score: number;
  };
}

export default function Routine() {
  const navigate = useNavigate();
  const [routineName, setRoutineName] = useState("My Skincare Routine");
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [routineProducts, setRoutineProducts] = useState<RoutineProduct[]>([]);
  const [availableAnalyses, setAvailableAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => {
    loadRoutineAndAnalyses();
  }, []);

  const loadRoutineAndAnalyses = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      // Load or create routine
      const { data: routines } = await supabase
        .from("routines")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      let currentRoutineId: string;

      if (routines && routines.length > 0) {
        currentRoutineId = routines[0].id;
        setRoutineName(routines[0].routine_name);
      } else {
        const { data: newRoutine } = await supabase
          .from("routines")
          .insert({ user_id: user.id, routine_name: "My Skincare Routine" })
          .select()
          .single();
        currentRoutineId = newRoutine!.id;
      }

      setRoutineId(currentRoutineId);

      // Load routine products
      const { data: products } = await supabase
        .from("routine_products")
        .select(`
          *,
          user_analyses (
            product_name,
            brand,
            category,
            epiq_score
          )
        `)
        .eq("routine_id", currentRoutineId);

      setRoutineProducts(products || []);

      // Load available analyses
      const { data: analyses } = await supabase
        .from("user_analyses")
        .select("id, product_name, epiq_score, analyzed_at")
        .eq("user_id", user.id)
        .order("analyzed_at", { ascending: false });

      setAvailableAnalyses(analyses || []);
    } catch (error) {
      console.error("Error loading routine:", error);
      toast.error("Failed to load routine");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (analysisId: string) => {
    if (!routineId) return;

    try {
      const { error } = await supabase
        .from("routine_products")
        .insert({
          routine_id: routineId,
          analysis_id: analysisId,
          usage_frequency: "Both",
          product_price: 0,
        });

      if (error) throw error;

      toast.success("Product added to routine");
      loadRoutineAndAnalyses();
    } catch (error) {
      console.error("Error adding product:", error);
      toast.error("Failed to add product");
    }
  };

  const handleOptimizeRoutine = async () => {
    if (!routineId || routineProducts.length === 0) {
      toast.error("Add products to your routine first");
      return;
    }

    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-routine", {
        body: { routineId },
      });

      if (error) throw error;

      toast.success("Routine optimized!");
      navigate(`/routine/optimization/${data.optimizationId}`);
    } catch (error) {
      console.error("Error optimizing routine:", error);
      toast.error("Failed to optimize routine");
    } finally {
      setOptimizing(false);
    }
  };

  const totalCost = routineProducts.reduce(
    (sum, p) => sum + (p.product_price || 0),
    0
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading routine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{routineName}</h1>
          <p className="text-muted-foreground">
            Build and optimize your skincare routine
          </p>
        </div>

        {/* Routine Summary */}
        {routineProducts.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Routine Summary</h3>
                <p className="text-sm text-muted-foreground">
                  {routineProducts.length} products • Total Cost: ${totalCost.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleOptimizeRoutine}
                  disabled={optimizing}
                  className="bg-primary"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {optimizing ? "Optimizing..." : "Optimize Routine"}
                </Button>
                <Button variant="outline">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Cost Analysis
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Current Routine Products */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Current Routine</h2>
          {routineProducts.length === 0 ? (
            <Card className="p-8 text-center">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-2">No products in routine yet</p>
              <p className="text-sm text-muted-foreground">
                Add analyzed products below to build your routine
              </p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {routineProducts.map((rp) => (
                <Card key={rp.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{rp.user_analyses.product_name}</h3>
                      {rp.user_analyses.brand && (
                        <p className="text-sm text-muted-foreground">
                          {rp.user_analyses.brand}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        {rp.user_analyses.category && (
                          <Badge variant="outline" className="text-xs">
                            {rp.user_analyses.category}
                          </Badge>
                        )}
                        <span className="text-sm text-muted-foreground">
                          EpiQ: {rp.user_analyses.epiq_score}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          {rp.usage_frequency}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          ${rp.product_price || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Available Products to Add */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Add Products</h2>
          <div className="grid gap-4">
            {availableAnalyses
              .filter(
                (a) => !routineProducts.some((rp) => rp.analysis_id === a.id)
              )
              .map((analysis) => (
                <Card key={analysis.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{analysis.product_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        EpiQ Score: {analysis.epiq_score}
                      </p>
                    </div>
                    <Button
                      onClick={() => handleAddProduct(analysis.id)}
                      size="sm"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Routine
                    </Button>
                  </div>
                </Card>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}