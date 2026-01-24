import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, AlertTriangle, TrendingDown, DollarSign, CheckCircle, Info, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import AppShell from "@/components/AppShell";

interface OptimizationData {
  routineType?: string;
  productCounts?: {
    face: number;
    body: number;
    hair: number;
    unknown: number;
  };
  redundancies: Array<{
    ingredient: string;
    products: string[];
    recommendation: string;
    category?: string;
  }>;
  conflicts: Array<{
    actives: string[];
    risk: string;
    suggestion: string;
    category?: string;
  }>;
  formulationIssues: Array<{
    product: string;
    issue: string;
    impact: string;
    category?: string;
  }>;
  costOptimizations: Array<{
    product: string;
    currentPrice: number;
    keyIngredients: string[];
    suggestedAlternative: string;
    alternativePrice: number;
    potentialSavings: number;
    skinBenefits?: string;
    category?: string;
  }>;
  routineEfficiency: {
    canEliminate: string[];
    reasoning: string;
    category?: string;
  };
  outOfScope?: Array<{
    product: string;
    reason: string;
    suggestion: string;
  }>;
  overallScore: number;
  summary: string;
  totalRoutineCost: number;
  totalPotentialSavings?: number;
}

export default function RoutineOptimization() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<OptimizationData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOptimization();
  }, [id]);

  const loadOptimization = async () => {
    try {
      const { data: optimization, error } = await supabase
        .from("routine_optimizations")
        .select("optimization_data")
        .eq("id", id)
        .single();

      if (error) throw error;

      setData(optimization.optimization_data as unknown as OptimizationData);
    } catch (error) {
      console.error("Error loading optimization:", error);
      toast.error("Failed to load optimization");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Loading optimization...</p>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <p className="text-muted-foreground">Optimization not found</p>
        </div>
      </AppShell>
    );
  }

  const getCategoryBadge = (category?: string) => {
    if (!category) return null;
    const colors = {
      face: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      body: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      hair: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[category as keyof typeof colors] || 'bg-muted text-muted-foreground'}`}>
        {category.charAt(0).toUpperCase() + category.slice(1)}
      </span>
    );
  };

  return (
    <TooltipProvider>
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
      <div className="container mx-auto max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/routine")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Routine
        </Button>

        {/* Overall Score */}
        <Card className="p-6 mb-6 bg-gradient-to-br from-primary/10 to-primary/5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-3xl font-bold">
                Routine Optimization Score
                {data.routineType && data.routineType !== 'face' && (
                  <span className="text-base font-normal text-muted-foreground ml-2">
                    ({data.routineType === 'mixed' ? 'Mixed Routine' : `${data.routineType.charAt(0).toUpperCase() + data.routineType.slice(1)} Care`})
                  </span>
                )}
              </h1>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Your optimization score reflects how well-balanced and efficient your routine is. Scores consider ingredient conflicts, redundancies, and cost-effectiveness.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="text-6xl font-bold text-primary mb-2">
              {data.overallScore}
            </div>
            <p className="text-muted-foreground">{data.summary}</p>
            {data.productCounts && data.routineType === 'mixed' && (
              <div className="mt-4 flex gap-2 flex-wrap justify-center">
                {data.productCounts.face > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary/10 text-primary">
                    {data.productCounts.face} Face
                  </span>
                )}
                {data.productCounts.body > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                    {data.productCounts.body} Body
                  </span>
                )}
                {data.productCounts.hair > 0 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                    {data.productCounts.hair} Hair
                  </span>
                )}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              Total Routine Cost: ${data.totalRoutineCost?.toFixed(2) || "0.00"}
            </p>
          </div>
        </Card>

        {/* Total Potential Savings Card */}
        {data.totalPotentialSavings !== undefined && data.totalPotentialSavings > 0 && (
          <Card className="p-6 mb-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/20 dark:to-green-900/10 border-green-200 dark:border-green-800">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
                💰 Total Potential Savings
              </h2>
              <div className="text-5xl font-bold text-green-600 dark:text-green-400 mb-2">
                ${data.totalPotentialSavings.toFixed(2)}
              </div>
              <p className="text-sm text-green-700 dark:text-green-400">
                By switching to recommended alternatives
              </p>
              {data.totalRoutineCost > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Save {((data.totalPotentialSavings / data.totalRoutineCost) * 100).toFixed(0)}% on your routine cost
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Out of Scope Products */}
        {data.outOfScope && data.outOfScope.length > 0 && (
          <Card className="p-6 mb-6 bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-1" />
              <div className="flex-1">
                <h2 className="text-xl font-bold">Out of Scope Products</h2>
                <p className="text-sm text-muted-foreground">
                  These products don't match your profile preferences or have unclear categories
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {data.outOfScope.map((item, idx) => (
                <div key={idx} className="border-l-2 border-amber-500 pl-4">
                  <h3 className="font-semibold mb-2">{item.product}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{item.reason}</p>
                  <p className="text-sm text-primary font-medium">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Redundancies */}
        {data.redundancies && data.redundancies.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <TrendingDown className="w-5 h-5 text-orange-500 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Ingredient Redundancies</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>You're using the same active ingredient in multiple products. While not harmful, this may be unnecessary and costly—one product might be enough.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Duplicate ingredients across your products
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {data.redundancies.map((item, idx) => (
                <div key={idx} className="border-l-2 border-orange-500 pl-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{item.ingredient}</h3>
                    {getCategoryBadge(item.category)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Found in: {item.products.join(", ")}
                  </p>
                  <p className="text-sm">{item.recommendation}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Conflicts */}
        {data.conflicts && data.conflicts.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Conflicting Actives</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>These active ingredients may cause irritation, dryness, or reduced effectiveness when used together. Consider separating them (AM/PM) or choosing alternatives.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ingredients that may cause irritation together
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {data.conflicts.map((item, idx) => (
                <div key={idx} className="border-l-2 border-red-500 pl-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex gap-2 flex-wrap">
                      {item.actives.map((active, i) => (
                        <Badge key={i} variant="destructive">
                          {active}
                        </Badge>
                      ))}
                    </div>
                    {getCategoryBadge(item.category)}
                  </div>
                  <p className="text-sm font-semibold mb-1">Risk: {item.risk}</p>
                  <p className="text-sm">{item.suggestion}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Formulation Issues */}
        {data.formulationIssues && data.formulationIssues.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-500 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Formulation Issues</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>We've detected problematic ingredients or formulation concerns in these products that may affect their safety or effectiveness for your skin type.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Problematic ingredients in your products
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {data.formulationIssues.map((item, idx) => (
                <div key={idx} className="border-l-2 border-yellow-500 pl-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{item.product}</h3>
                    {getCategoryBadge(item.category)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-1">{item.issue}</p>
                  <p className="text-sm">{item.impact}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Cost Optimizations */}
        {data.costOptimizations && data.costOptimizations.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <DollarSign className="w-5 h-5 text-green-500 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Cost Optimization Opportunities</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>These alternatives are personalized for your skin type and concerns. They contain similar or better active ingredients at lower prices, and are specifically chosen to work better for your unique skin needs.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Save money with these alternatives
                </p>
              </div>
              {data.totalPotentialSavings !== undefined && data.totalPotentialSavings > 0 && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Potential Savings</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${data.totalPotentialSavings.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-4">
              {data.costOptimizations.map((item, idx) => (
                <div key={idx} className="border-l-2 border-green-500 pl-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold">{item.product}</h3>
                    {getCategoryBadge(item.category)}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    Key ingredients: {item.keyIngredients.join(", ")}
                  </p>
                  <div className="flex items-center gap-4 my-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Current</p>
                      <p className="text-lg font-semibold">
                        {item.currentPrice != null ? `$${item.currentPrice.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    <div className="text-muted-foreground">→</div>
                    <div>
                      <p className="text-xs text-muted-foreground">Alternative</p>
                      <p className="text-lg font-semibold">
                        {item.alternativePrice != null ? `$${item.alternativePrice.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-xs text-muted-foreground">You Save</p>
                      <p className="text-lg font-bold text-green-600">
                        {item.potentialSavings != null ? `$${item.potentialSavings.toFixed(2)}` : 'N/A'}
                      </p>
                      {item.potentialSavings != null && item.currentPrice != null && item.currentPrice > 0 && (
                        <p className="text-xs text-green-600">
                          ({((item.potentialSavings / item.currentPrice) * 100).toFixed(0)}% off)
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm">
                    <strong>Alternative:</strong> {item.suggestedAlternative}
                  </p>
                  {item.skinBenefits && (
                    <div className="mt-3 bg-primary/5 p-3 rounded-md border border-primary/10">
                      <p className="text-xs font-semibold text-primary mb-1">
                        Better for Your Skin
                      </p>
                      <p className="text-sm">{item.skinBenefits}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Routine Efficiency */}
        {data.routineEfficiency && data.routineEfficiency.canEliminate?.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-5 h-5 text-blue-500 mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold">Routine Efficiency</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>These products may be redundant in your routine. Our AI suggests products you could safely remove to simplify your routine without losing benefits.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Simplify your routine without losing benefits
                </p>
              </div>
            </div>
            <div className="border-l-2 border-blue-500 pl-4">
              <p className="font-semibold mb-2">
                Can potentially eliminate:{" "}
                {data.routineEfficiency.canEliminate.join(", ")}
              </p>
              <p className="text-sm">{data.routineEfficiency.reasoning}</p>
            </div>
          </Card>
        )}
      </div>
      </AppShell>
    </TooltipProvider>
  );
}
