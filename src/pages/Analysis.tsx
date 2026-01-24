import { useParams, useNavigate, useLocation } from "react-router-dom";
import React, { useEffect, useState, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Sparkles, Home, ScanLine, Plus, Info, HelpCircle, AlertTriangle, Download, Loader2 } from "lucide-react";
import PostAnalysisFeedback from "@/components/PostAnalysisFeedback";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTracking, trackEvent } from "@/hooks/useTracking";
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SafetyLevelMeter } from "@/components/SafetyLevelMeter";
import { ProfessionalReferralBanner } from "@/components/ProfessionalReferralBanner";
// IngredientRiskHeatmap will be lazy-loaded below to reduce initial bundle
import { ScoreBreakdownAccordion } from "@/components/ScoreBreakdownAccordion";
import { AIExplanationLoader } from "@/components/AIExplanationLoader";
import { DemoModeToggle } from "@/components/DemoModeToggle";
import { ExportAnalysisButton } from "@/components/ExportAnalysisButton";
import { ExpertReviewBadge } from "@/components/ExpertReviewBadge";
import ChatPromoCard from "@/components/ChatPromoCard";
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchIngredientExplanations, IngredientExplanationInput } from "@/lib/ingredient-explanations";

// Lazy-load heavier, below-the-fold components
const AIExplanationAccordion = React.lazy(() => import('@/components/AIExplanationAccordion').then(m => ({ default: m.AIExplanationAccordion })));
const SkinLytixGPTChat = React.lazy(() => import('@/components/SkinLytixGPTChat').then(m => ({ default: m.SkinLytixGPTChat })));
const IngredientRiskHeatmap = React.lazy(() => import('@/components/IngredientRiskHeatmap').then(m => ({ default: m.IngredientRiskHeatmap })));

interface AnalysisData {
  id: string;
  product_name: string;
  brand?: string;
  category?: string;
  ingredients_list: string;
  epiq_score: number;
    recommendations_json: {
      safe_ingredients: Array<{ name: string; risk_score?: number; role?: string; explanation?: string; molecular_weight?: number; safety_profile?: string }>;
    problematic_ingredients?: Array<{
      name: string;
      reason: string;
      risk_score?: number;
    }>;
    beneficial_ingredients?: Array<{
      name: string;
      benefit: string;
      risk_score?: number;
    }>;
    concern_ingredients: Array<{ name: string; risk_score?: number; role?: string; explanation?: string; molecular_weight?: number; safety_profile?: string }>;
      warnings?: string[];
      summary: string;
      routine_suggestions: string[];
      personalized?: boolean;
      fast_mode?: boolean;
      sub_scores?: {
        ingredient_safety: number;
      skin_compatibility: number;
      active_quality: number;
      preservative_safety: number;
    };
    product_metadata?: {
      brand?: string;
      category?: string;
      product_type?: string;
      product_type_label?: string;
    };
    ingredient_data?: Array<{
      name: string;
      data?: {
        pubchem_cid?: string;
        [key: string]: any;
      };
    }>;
    ai_explanation?: {
      answer_markdown: string;
      summary_one_liner: string;
      ingredient_focus: boolean;
      epiQ_or_score_used: boolean;
      professional_referral: {
        needed: boolean;
        reason: string;
        suggested_professional_type: string;
      };
      safety_level: string;
      sources_used: string[];
      debug_notes: string;
    } | null;
  };
  analyzed_at: string;
}

const Analysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  useTracking('analysis');
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [addingToRoutine, setAddingToRoutine] = useState(false);
  const [showAllSafe, setShowAllSafe] = useState(false);
  const [showAllConcerns, setShowAllConcerns] = useState(false);
  const [showAllNeeds, setShowAllNeeds] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [loadingExplanationTab, setLoadingExplanationTab] = useState<"safe" | "concerns" | "needs" | null>(null);
  const [hasAutoLoadedInitial, setHasAutoLoadedInitial] = useState(false);
  const canLoadIngredientExplanations = import.meta.env.VITE_ENABLE_EXPLAIN_INGREDIENTS === "true";
  const [isUpgradingScan, setIsUpgradingScan] = useState(false);
  const [autoUpgradeTriggered, setAutoUpgradeTriggered] = useState(false);
  const [detailProgress, setDetailProgress] = useState(0);
  const [detailStatus, setDetailStatus] = useState("Preparing detailed scan...");

  const fetchAnalysis = async (options?: { silent?: boolean }) => {
    if (!id) return;
    const silent = options?.silent;

    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!silent) {
          navigate('/auth');
        }
        return;
      }

      const { data, error } = await supabase
        .from('user_analyses')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching analysis:', error);
        if (!silent) {
          toast({
            title: "Error loading analysis",
            description: "Could not load the analysis data.",
            variant: "destructive",
          });
          navigate('/home');
        }
        return;
      }

      setAnalysis(data as any);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  };

  const handleRunDetailedScan = async () => {
    if (!analysis || isUpgradingScan) return;
    setIsUpgradingScan(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please sign in to run a detailed scan.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        product_name: analysis.product_name,
        barcode: null,
        brand: analysis.brand || null,
        category: analysis.category || null,
        ingredients_list: analysis.ingredients_list,
        product_price: null,
        user_id: user.id,
        image_url: null,
        skip_ingredient_ai_explanations: false,
        scan_mode: "detailed",
      };

      const data: any = await (await import('@/lib/functions-client')).invokeFunction('analyze-product', payload);

      toast({
        title: "Detailed scan started",
        description: "We’re verifying more ingredients now.",
      });

      if (data?.analysis_id) {
        toast({
          title: "Detailed scan ready",
          description: "Loading your full report now.",
        });
        navigate(`/analysis/${data.analysis_id}`);
      } else {
        fetchAnalysis({ silent: true });
      }
    } catch (error) {
      console.error("Detailed scan error:", error);
      toast({
        title: "Detailed scan failed",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setIsUpgradingScan(false);
    }
  };

  useEffect(() => {
    if (!isUpgradingScan) {
      setDetailProgress(0);
      setDetailStatus("Preparing detailed scan...");
      return;
    }

    let progressValue = 5;
    setDetailProgress(progressValue);
    setDetailStatus("Running detailed verification...");

    const intervalId = window.setInterval(() => {
      if (progressValue < 85) {
        progressValue = Math.min(85, progressValue + Math.random() * 8 + 3);
      } else if (progressValue < 95) {
        progressValue = Math.min(95, progressValue + Math.random() * 2 + 1);
      }
      setDetailProgress(Math.round(progressValue));

      if (progressValue >= 95) {
        setDetailStatus("Finalizing detailed results...");
      } else {
        setDetailStatus("Verifying ingredients for the full report...");
      }
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [isUpgradingScan]);

  useEffect(() => {
    if (!analysis?.recommendations_json.fast_mode) return;
    if (isUpgradingScan || autoUpgradeTriggered) return;
    setAutoUpgradeTriggered(true);
    const timeoutId = window.setTimeout(() => {
      handleRunDetailedScan();
    }, 1500);

    return () => window.clearTimeout(timeoutId);
  }, [analysis, isUpgradingScan, autoUpgradeTriggered]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("chat") === "1") {
      setIsChatOpen(true);
    }
  }, [location.search]);


  const handleAddToRoutine = async () => {
    setAddingToRoutine(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to add to routine",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Get or create routine
      // Get or create routine (use helper to surface any Supabase errors)
      const { data: routines, error: routinesError } = await supabase
        .from("routines")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (routinesError) throw routinesError;

      let routineId: string;

      if (routines && routines.length > 0) {
        routineId = routines[0].id;
      } else {
        const { data: newRoutine, error: newRoutineError } = await supabase
          .from("routines")
          .insert({ user_id: user.id, routine_name: "My Skincare Routine" })
          .select("id")
          .single();

        if (newRoutineError) throw newRoutineError;
        routineId = (newRoutine as any).id;
      }

      // Add product to routine (no price needed - stored in user_analyses)
      const { error } = await supabase
        .from("routine_products")
        .insert({
          routine_id: routineId,
          analysis_id: id,
          usage_frequency: "Both",
        });

      if (error) throw error;

      trackEvent({
        eventName: 'product_added_to_routine_from_analysis',
        eventCategory: 'analysis',
        eventProperties: {
          epiq_score: analysis?.epiq_score
        }
      });

      toast({
        title: "Added to routine!",
        description: "View your routine to unlock cost optimization and savings",
      });
      navigate("/routine");
    } catch (error: any) {
      console.error("Error adding to routine:", error);
      toast({
        title: "Failed to add to routine",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAddingToRoutine(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  useEffect(() => {
    setRefreshAttempts(0);
  }, [id]);

  const maxRefreshAttempts = 12;
  const refreshIntervalMs = 10000;
  const isProcessingDetails =
    !!analysis &&
    !analysis.recommendations_json?.ai_explanation &&
    !analysis.recommendations_json?.fast_mode &&
    refreshAttempts < maxRefreshAttempts;
  const refreshProgress = Math.min(100, Math.round((refreshAttempts / maxRefreshAttempts) * 100));

  useEffect(() => {
    if (!analysis || !isProcessingDetails) return;
    const timeoutId = window.setTimeout(() => {
      setRefreshAttempts((prev) => prev + 1);
      fetchAnalysis({ silent: true });
    }, refreshIntervalMs);

    return () => window.clearTimeout(timeoutId);
  }, [analysis, isProcessingDetails, refreshAttempts, id]);

  const getIngredientName = (ingredient: any) => {
    return typeof ingredient === "string" ? ingredient : ingredient.name;
  };

  const getIngredientId = (name: string) => {
    return `ingredient-${name.replace(/\s+/g, '-')}`;
  };
  const getIngredientKey = (name: string) => name.trim().toLowerCase();
  const isEmptyIngredientDetail = (value?: string) =>
    !value || /no detailed information available/i.test(value);
  const normalizeIngredientDetail = (value: string | undefined, fallback: string) =>
    isEmptyIngredientDetail(value) ? fallback : value;
  const getAiExplanation = (name: string) => {
    const value = aiExplanations[getIngredientKey(name)];
    return isEmptyIngredientDetail(value) ? undefined : value;
  };

  const explanationBatchSize = 8;
  const loadIngredientExplanations = async (
    inputs: IngredientExplanationInput[],
    tab: "safe" | "concerns" | "needs"
  ) => {
    if (!canLoadIngredientExplanations) return;
    if (loadingExplanationTab) return;
    const missing = inputs.filter((item) => !aiExplanations[getIngredientKey(item.name)]);
    if (missing.length === 0) return;

    setLoadingExplanationTab(tab);
    try {
      const results = await fetchIngredientExplanations(missing.slice(0, explanationBatchSize));
      if (results.length === 0) return;
      setAiExplanations((prev) => {
        const next = { ...prev };
        results.forEach((result) => {
          next[getIngredientKey(result.name)] = result.explanation;
        });
        return next;
      });
    } catch (error) {
      console.error("Error loading ingredient explanations:", error);
    } finally {
      setLoadingExplanationTab(null);
    }
  };

  const safeInputs: IngredientExplanationInput[] = analysis
    ? (() => {
        const beneficial = analysis.recommendations_json.beneficial_ingredients || [];
        const safe = analysis.recommendations_json.safe_ingredients || [];
        const safeItems = [
          ...beneficial.map((item: any) => ({
            name: item.name,
            label: "Targeted",
          })),
          ...safe
            .filter((ing: any) => !beneficial.some((b: any) => b.name === getIngredientName(ing)))
            .map((ingredient: any) => ({
              name: getIngredientName(ingredient),
              label: "Safe",
            })),
        ];
        return safeItems.map((item) => ({
          name: item.name,
          category: item.label === "Targeted" ? "beneficial" : "safe",
        }));
      })()
    : [];

  const concernInputs: IngredientExplanationInput[] = analysis
    ? (analysis.recommendations_json.problematic_ingredients || []).map((item) => ({
        name: item.name,
        category: "problematic",
      }))
    : [];

  const needsInputs: IngredientExplanationInput[] = analysis
    ? (analysis.recommendations_json.concern_ingredients || []).map((item: any) => ({
        name: getIngredientName(item),
        category: "unverified",
      }))
    : [];

  useEffect(() => {
    if (!canLoadIngredientExplanations) return;
    if (!analysis || hasAutoLoadedInitial) return;
    setHasAutoLoadedInitial(true);
    const loadInitial = async () => {
      if (safeInputs.length > 0) {
        await loadIngredientExplanations(safeInputs, "safe");
      }
      if (concernInputs.length > 0) {
        await loadIngredientExplanations(concernInputs, "concerns");
      }
      if (needsInputs.length > 0) {
        await loadIngredientExplanations(needsInputs, "needs");
      }
    };
    loadInitial();
  }, [analysis, safeInputs, concernInputs, needsInputs, hasAutoLoadedInitial]);

  useEffect(() => {
    if (!canLoadIngredientExplanations) return;
    if (!showAllSafe || safeInputs.length === 0 || loadingExplanationTab) return;
    const remaining = safeInputs.filter((item) => !getAiExplanation(item.name));
    if (remaining.length > 0) {
      loadIngredientExplanations(remaining, "safe");
    }
  }, [showAllSafe, safeInputs, aiExplanations, loadingExplanationTab]);

  useEffect(() => {
    if (!canLoadIngredientExplanations) return;
    if (!showAllConcerns || concernInputs.length === 0 || loadingExplanationTab) return;
    const remaining = concernInputs.filter((item) => !getAiExplanation(item.name));
    if (remaining.length > 0) {
      loadIngredientExplanations(remaining, "concerns");
    }
  }, [showAllConcerns, concernInputs, aiExplanations, loadingExplanationTab]);

  useEffect(() => {
    if (!canLoadIngredientExplanations) return;
    if (!showAllNeeds || needsInputs.length === 0 || loadingExplanationTab) return;
    const remaining = needsInputs.filter((item) => !getAiExplanation(item.name));
    if (remaining.length > 0) {
      loadIngredientExplanations(remaining, "needs");
    }
  }, [showAllNeeds, needsInputs, aiExplanations, loadingExplanationTab]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your analysis...</p>
        </div>
      </main>
    );
  }

  if (!analysis) return null;

  const productMetadata = analysis.recommendations_json?.product_metadata as any;
  const productType = productMetadata?.product_type || 'face';

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-500 dark:text-emerald-400";
    if (score >= 50) return "text-amber-500 dark:text-amber-400";
    return "text-rose-500 dark:text-rose-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Good";
    return "Needs Attention";
  };

  return (
    <TooltipProvider>
      {analysis?.recommendations_json?.ai_explanation?.professional_referral?.needed && (
        <ProfessionalReferralBanner
          reason={analysis.recommendations_json.ai_explanation.professional_referral.reason}
          suggestedProfessionalType={analysis.recommendations_json.ai_explanation.professional_referral.suggested_professional_type}
        />
      )}
      <AppShell
        className="bg-gradient-to-b from-background to-muted"
        contentClassName="px-[5px] lg:px-4 py-6 md:py-10"
        showNavigation
        showBottomNav
        onAskGpt={() => setIsChatOpen(true)}
        bottomNavProps={{
          onAddToRoutine: handleAddToRoutine,
          showAddToRoutine: true,
          onChatOpen: () => {
            setIsChatOpen(true);
            trackEvent({
              eventName: 'chat_opened',
              eventCategory: 'chat',
              eventProperties: { analysisId: analysis.id, source: 'bottom_nav' }
            });
          },
        }}
        header={
          <PageHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button variant="ghost" onClick={() => navigate('/home')}>
                <Home className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
              <ExportAnalysisButton
                analysisId={analysis.id}
                productName={analysis.product_name}
                analysisData={analysis}
              />
            </div>
          </PageHeader>
        }
      >
      <div className="container max-w-4xl mx-auto">
        <div className="space-y-8 md:space-y-10">
        
        <section className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm font-subheading uppercase tracking-[0.3em] text-muted-foreground">
              Overview
            </p>
          </div>

        {isProcessingDetails && (
          <Card className="p-4 md:p-6 border-primary/20 bg-primary/5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-primary">Finishing your analysis…</p>
                <p className="text-sm text-muted-foreground">
                  Some AI insights can take up to 2 minutes to appear. This page updates automatically.
                </p>
              </div>
              <div className="w-full md:w-56">
                <Progress value={refreshProgress} />
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {refreshing ? "Refreshing..." : `Updating (${refreshAttempts}/${maxRefreshAttempts})`}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Dashboard Header */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-xl p-4 md:p-6 animate-fade-in shadow-soft border border-border/50">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-xl md:text-2xl lg:text-3xl font-bold">{analysis.product_name}</h1>
                <ExpertReviewBadge analysisId={analysis.id} />
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => navigate(`/compare?productId=${analysis.id}`)}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Find Dupes
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {analysis.brand && <span className="font-medium">{analysis.brand}</span>}
                {analysis.brand && analysis.category && <span>•</span>}
                {analysis.category && (
                  <span className="px-2 py-1 bg-primary/20 rounded-md capitalize font-medium">
                    {analysis.category}
                  </span>
                )}
                {productMetadata?.product_type_label && (
                  <>
                    <span>•</span>
                    <span className="px-2 py-1 bg-secondary/60 rounded-md capitalize font-medium">
                      {productMetadata.product_type_label}
                    </span>
                  </>
                )}
                <span>•</span>
                <span>Analyzed {new Date(analysis.analyzed_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-card rounded-lg shadow-md border border-border">
                <span className="text-lg md:text-xl mb-1">🧪</span>
                <span className="text-[10px] md:text-xs text-muted-foreground">Ingredients</span>
                <span className="text-lg md:text-2xl lg:text-3xl font-bold">
                  {(analysis.recommendations_json.safe_ingredients?.length || 0) +
                   (analysis.recommendations_json.problematic_ingredients?.length || 0) +
                   (analysis.recommendations_json.beneficial_ingredients?.length || 0) +
                   ((analysis.recommendations_json as any).concern_ingredients?.length || 0)}
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-card rounded-lg shadow-md border border-border">
                <span className="text-lg md:text-xl mb-1">✅</span>
                <span className="text-[10px] md:text-xs text-muted-foreground">Safe</span>
                <span className="text-lg md:text-2xl lg:text-3xl font-bold">{analysis.recommendations_json.safe_ingredients?.length || 0}</span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 md:p-3 bg-card rounded-lg shadow-md border border-border">
                <span className="text-lg md:text-xl mb-1">⚠️</span>
                <span className="text-[10px] md:text-xs text-muted-foreground">Concerns</span>
                <span className="text-lg md:text-2xl lg:text-3xl font-bold">{analysis.recommendations_json.problematic_ingredients?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <Card className="p-4 md:p-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="text-xl font-semibold">Quick Takeaways</h2>
            <Badge variant="secondary">{getScoreLabel(analysis.epiq_score)}</Badge>
          </div>
          <div className="space-y-3 text-sm text-muted-foreground">
            {analysis.recommendations_json.fast_mode && (
              <p className="text-xs font-medium text-amber-900/80">
                Quick scan preview shown first. We’re upgrading to a detailed scan in the background.
              </p>
            )}
            <p>
              <span className="font-semibold text-foreground">EpiQ Score:</span> {analysis.epiq_score}/100 — {analysis.recommendations_json.summary}
            </p>
            <p>
              <span className="font-semibold text-foreground">Ingredient profile:</span>{" "}
              {analysis.recommendations_json.safe_ingredients?.length || 0} safe,{" "}
              {analysis.recommendations_json.problematic_ingredients?.length || 0} concerns,{" "}
              {analysis.recommendations_json.concern_ingredients?.length || 0} unverified.
            </p>
            {analysis.recommendations_json.warnings?.length ? (
              <p>
                <span className="font-semibold text-foreground">Personalized warnings:</span>{" "}
                {analysis.recommendations_json.warnings.length} flag{analysis.recommendations_json.warnings.length === 1 ? "" : "s"} to review.
              </p>
            ) : null}
          </div>
          {analysis.recommendations_json.fast_mode && (
            <Alert className="mt-4 border-amber-200 bg-amber-50 text-amber-900">
              <AlertDescription>
                Quick scan results are shown first. We’re upgrading to a detailed scan in the background.
                For deeper insights, run a detailed scan.
              </AlertDescription>
              {isUpgradingScan && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">Detailed scan</span>
                    <span>{detailProgress}%</span>
                  </div>
                  <Progress value={detailProgress} />
                  <p className="text-xs text-amber-900">{detailStatus}</p>
                  <p className="text-xs text-amber-900/80">
                    Keep browsing—your full report will load automatically when it’s ready.
                  </p>
                </div>
              )}
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunDetailedScan}
                  disabled={isUpgradingScan}
                  className="border-amber-300 text-amber-900 hover:bg-amber-100"
                >
                  {isUpgradingScan ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Upgrading to detailed scan...
                    </>
                  ) : (
                    "Run detailed scan"
                  )}
                </Button>
              </div>
            </Alert>
          )}
          <div className="flex flex-wrap gap-2 mt-5">
            <Button
              variant="cta"
              onClick={handleAddToRoutine}
              disabled={addingToRoutine}
              className="touch-target whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4 mr-2" />
              {addingToRoutine ? "Adding..." : "Add to Routine"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsChatOpen(true);
                trackEvent({
                  eventName: 'chat_opened',
                  eventCategory: 'chat',
                  eventProperties: { analysisId: analysis.id, source: 'quick_takeaways' }
                });
              }}
            >
              Ask SkinLytixGPT
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/compare?productId=${analysis.id}`)}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Find Dupes
            </Button>
          </div>
        </Card>

        {/* Mobile-only Primary CTA */}
        <div className="md:hidden mb-4">
          <Button
            variant="cta"
            onClick={handleAddToRoutine}
            disabled={addingToRoutine}
            className="w-full touch-target whitespace-nowrap"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            {addingToRoutine ? "Adding..." : "Add to Routine"}
          </Button>
        </div>

        {/* Routine Optimizer Info Banner */}
        <Card className="p-4 md:p-6 bg-gradient-to-r from-cta/10 via-accent/10 to-primary/10 border-cta/20">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2">💰 Unlock Cost Savings with Routine Optimizer</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Add this and more products to your routine to discover cheaper alternatives with similar or better ingredients. 
              Users save an average of <strong>$47/month</strong> on personal care products.
            </p>
            <Button 
              variant="default"
              size="sm"
              onClick={() => navigate('/routine')}
            >
              View My Routine & Optimize
            </Button>
          </div>
        </Card>

        <Card className="p-4 md:p-6 lg:p-8 text-center bg-gradient-to-br from-primary/5 to-accent/5">
          <div className="flex items-center justify-center gap-2 mb-6">
            <h2 className="text-2xl font-semibold">EpiQ Score</h2>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-4 h-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>Your EpiQ Score (0-100) reflects how safe and effective this product is based on ingredient analysis, scientific research, and your personal skin profile. Higher scores = better match for your skin.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className={`text-7xl font-bold mb-4 ${getScoreColor(analysis.epiq_score)}`}>
            {analysis.epiq_score}
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {getScoreLabel(analysis.epiq_score)}
          </Badge>
          {analysis.recommendations_json?.scan_mode === "quick" && (
            <div className="mt-4 space-y-2">
              <Badge variant="outline" className="text-xs uppercase tracking-[0.2em]">
                Quick Scan Estimate
              </Badge>
              <p className="text-xs text-muted-foreground">
                Quick scan results are an estimate. Run a detailed scan for the full breakdown.
              </p>
            </div>
          )}
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
            {analysis.recommendations_json.summary}
          </p>
        </Card>

        {/* Score Breakdown Accordion */}
        {analysis.recommendations_json.sub_scores && (
          <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <ScoreBreakdownAccordion subScores={analysis.recommendations_json.sub_scores} />
          </div>
        )}

        {analysis.recommendations_json.personalized && (
          <Card className="p-4 md:p-6 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">Personalized for Your Skin</h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>This analysis considers your skin type, concerns, and sensitivities from your profile. Update your profile in settings for more accurate recommendations.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  This analysis is customized based on your skin type and concerns
                </p>
              </div>
            </div>
          </Card>
        )}
        </section>

        <section className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm font-subheading uppercase tracking-[0.3em] text-muted-foreground">
              AI Insights
            </p>
          </div>

          {/* AI Explanation Section - SkinLytix GPT */}
          {analysis.recommendations_json.ai_explanation && (
            <Suspense fallback={<AIExplanationLoader />}>
              <AIExplanationAccordion aiExplanation={analysis.recommendations_json.ai_explanation} />
            </Suspense>
          )}

          {/* Chat Promo Card */}
          <ChatPromoCard 
            onOpenChat={() => {
              setIsChatOpen(true);
              trackEvent({
                eventName: 'chat_opened',
                eventCategory: 'chat',
                eventProperties: { analysisId: analysis.id, source: 'promo_card' }
              });
            }}
          />
        </section>

        <section className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm font-subheading uppercase tracking-[0.3em] text-muted-foreground">
              Ingredient Breakdown
            </p>
          </div>
          {analysis.recommendations_json.fast_mode && (
            <div className="hidden" aria-hidden="true" />
          )}

        {/* Ingredient Risk Heatmap */}
        {(() => {
          const allIngredients = [
            ...(analysis.recommendations_json.beneficial_ingredients?.map((ing: any) => ({
              name: ing.name,
              category: 'beneficial' as const,
              risk_score: ing.risk_score
            })) || []),
            ...(analysis.recommendations_json.safe_ingredients?.map((ing: any) => ({
              name: typeof ing === 'string' ? ing : ing.name,
              category: 'safe' as const,
              risk_score: typeof ing === 'object' ? ing.risk_score : undefined
            })) || []),
            ...(analysis.recommendations_json.problematic_ingredients?.map((ing: any) => ({
              name: ing.name,
              category: 'problematic' as const,
              risk_score: ing.risk_score
            })) || []),
            ...(analysis.recommendations_json.concern_ingredients?.map((ing: any) => ({
              name: typeof ing === 'string' ? ing : ing.name,
              category: 'unverified' as const,
              risk_score: typeof ing === 'object' ? ing.risk_score : undefined
            })) || [])
          ];

          return allIngredients.length > 0 ? (
            <Suspense fallback={<div /> }>
              <IngredientRiskHeatmap
                ingredients={allIngredients}
                onIngredientClick={(ingredientName) => {
                  const element = document.getElementById(`ingredient-${ingredientName.replace(/\s+/g, '-')}`);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              />
            </Suspense>
          ) : null;
        })()}

         {analysis.recommendations_json.warnings && analysis.recommendations_json.warnings.length > 0 && (
          <Card className="p-4 md:p-6 mb-6 md:mb-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">Personalized Warnings</h2>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Based on your skin profile</p>
              </div>
            </div>
            <div className="space-y-2">
              {analysis.recommendations_json.warnings.map((warning, index) => (
                <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm">{warning}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <ScanLine className="w-8 h-8 text-primary" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold">Ingredient Library</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm">
                    <p>Browse ingredients by category. Tap a row to reveal details.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                Switch tabs to keep the list short and focused while still seeing every ingredient.
              </p>
            </div>
          </div>

          <Tabs defaultValue="safe" className="w-full">
            <TabsList className="w-full flex flex-wrap">
              <TabsTrigger value="safe" className="flex-1 text-sm">
                Safe ({analysis.recommendations_json.safe_ingredients?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="concerns" className="flex-1 text-sm">
                Concerns ({analysis.recommendations_json.problematic_ingredients?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="needs" className="flex-1 text-sm">
                Needs More Data ({analysis.recommendations_json.concern_ingredients?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="safe" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                {analysis.recommendations_json.beneficial_ingredients?.length
                  ? `${analysis.recommendations_json.beneficial_ingredients.length} targeted for your profile`
                  : "Recognized and suitable for your skin"}
              </p>
              <div className="space-y-2">
                {(() => {
                  const beneficial = analysis.recommendations_json.beneficial_ingredients || [];
                  const safe = analysis.recommendations_json.safe_ingredients || [];
                  const safeItems = [
                    ...beneficial.map((item: any) => ({
                      name: item.name,
                      label: "Targeted",
                      details: item.benefit,
                      role: item.role,
                      risk: item.risk_score,
                    })),
                    ...safe
                      .filter((ing: any) => !beneficial.some((b: any) => b.name === getIngredientName(ing)))
                      .map((ingredient: any) => ({
                        name: getIngredientName(ingredient),
                        label: "Safe",
                        details: typeof ingredient === "object" ? ingredient.explanation : undefined,
                        role: typeof ingredient === "object" ? ingredient.role : undefined,
                        risk: typeof ingredient === "object" ? ingredient.risk_score : undefined,
                      })),
                  ];

                  const limit = 8;
                  const missingDetailCopy = analysis.recommendations_json.fast_mode
                    ? "Quick scan uses limited ingredient notes. Run a detailed scan for full details."
                    : "We don't have additional notes for this ingredient yet.";
                  const visible = showAllSafe ? safeItems : safeItems.slice(0, limit);
                  return (
                    <>
                      {visible.map((item, index) => (
                        <details key={`${item.name}-${index}`} id={getIngredientId(item.name)} className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                          <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge className={item.label === "Targeted" ? "bg-success/30 text-success-foreground border border-success/40" : "bg-secondary/80"}>{item.label}</Badge>
                              <span className="font-medium">{item.name}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {item.role && <span className="hidden sm:inline">Role: {item.role}</span>}
                              {item.risk !== undefined && item.risk !== null && <span>Risk {item.risk}</span>}
                            </div>
                          </summary>
                          {(() => {
                            const aiDetail = getAiExplanation(item.name);
                            const baseDetail = item.details;
                            const preferredDetail = isEmptyIngredientDetail(baseDetail) ? aiDetail : baseDetail;
                            const details = normalizeIngredientDetail(preferredDetail || aiDetail, missingDetailCopy);
                            return (
                              <>
                                <p className="mt-2 text-sm text-muted-foreground">{details}</p>
                                {aiDetail && aiDetail !== details && (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">AI explanation:</span>{" "}
                                    {aiDetail}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </details>
                      ))}
                      {safeItems.length > limit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllSafe((prev) => !prev)}
                          className="w-full"
                        >
                          {showAllSafe ? "Show fewer" : `Show all ${safeItems.length}`}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            <TabsContent value="concerns" className="mt-4 space-y-3">
              <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5 text-sm">
                <strong>⚠️ Consider avoiding this product</strong> if you have sensitive skin or active concerns.
              </div>
              <div className="space-y-2">
                {(() => {
                  const items = analysis.recommendations_json.problematic_ingredients || [];
                  const limit = 6;
                  const visible = showAllConcerns ? items : items.slice(0, limit);
                  return (
                    <>
                      {visible.map((item, index) => (
                        <details key={`${item.name}-${index}`} id={getIngredientId(item.name)} className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                          <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="destructive">Concern</Badge>
                              <span className="font-medium">{item.name}</span>
                            </div>
                            {item.risk_score !== undefined && item.risk_score !== null && (
                              <span className="text-xs text-muted-foreground">Risk {item.risk_score}</span>
                            )}
                          </summary>
                          {(() => {
                            const aiDetail = getAiExplanation(item.name);
                            const details =
                              item.reason ||
                              aiDetail ||
                              "This ingredient may not align with sensitive skin or certain concerns.";
                            return (
                              <>
                                <p className="mt-2 text-sm text-muted-foreground">{details}</p>
                                {aiDetail && aiDetail !== details && (
                                  <p className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">AI explanation:</span>{" "}
                                    {aiDetail}
                                  </p>
                                )}
                              </>
                            );
                          })()}
                        </details>
                      ))}
                      {items.length > limit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllConcerns((prev) => !prev)}
                          className="w-full"
                        >
                          {showAllConcerns ? "Show fewer" : `Show all ${items.length}`}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
            </TabsContent>

            <TabsContent value="needs" className="mt-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                Not found in our databases (PubChem, Open Beauty Facts) — may still be safe.
              </p>
              <div className="space-y-2">
                {(() => {
                  const items = analysis.recommendations_json.concern_ingredients || [];
                  const limit = 6;
                  const visible = showAllNeeds ? items : items.slice(0, limit);
                  return (
                    <>
                      {visible.map((ingredient: any, index: number) => {
                        const name = getIngredientName(ingredient);
                        const aiDetail = getAiExplanation(name);
                        const fallbackDetail = analysis.recommendations_json.fast_mode
                          ? "Quick scan couldn't validate this ingredient yet. Run a detailed scan for deeper verification."
                          : "Not found in PubChem or Open Beauty Facts databases. May be a proprietary blend or trade name.";
                        const baseDetail = typeof ingredient === "object" ? ingredient.explanation : undefined;
                        const preferredDetail = isEmptyIngredientDetail(baseDetail) ? aiDetail : baseDetail;
                        const details = normalizeIngredientDetail(preferredDetail || aiDetail, fallbackDetail);
                        const role = typeof ingredient === "object" ? ingredient.role : undefined;
                        return (
                          <details key={`${name}-${index}`} id={getIngredientId(name)} className="rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                            <summary className="cursor-pointer list-none flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-amber-300 text-amber-700">Needs Data</Badge>
                                <span className="font-medium">{name}</span>
                              </div>
                              {role && <span className="text-xs text-muted-foreground">Role: {role}</span>}
                            </summary>
                            <p className="mt-2 text-sm text-muted-foreground">{details}</p>
                            {aiDetail && aiDetail !== details && (
                              <p className="mt-2 text-sm text-muted-foreground">
                                <span className="font-medium text-foreground">AI explanation:</span>{" "}
                                {aiDetail}
                              </p>
                            )}
                          </details>
                        );
                      })}
                      {items.length > limit && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAllNeeds((prev) => !prev)}
                          className="w-full"
                        >
                          {showAllNeeds ? "Show fewer" : `Show all ${items.length}`}
                        </Button>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  💡 <strong>What to do:</strong> These ingredients may be perfectly safe. Consider looking them up individually or asking a dermatologist if you have concerns.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
        </section>

        <section className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm font-subheading uppercase tracking-[0.3em] text-muted-foreground">
              Routine Guidance
            </p>
          </div>

         <Card className="p-4 md:p-6">
           <div className="flex items-center gap-3 mb-4">
             <Sparkles className="w-8 h-8 text-amber-600 dark:text-amber-400 animate-pulse" />
             <div className="flex-1">
               <h2 className="text-2xl font-bold">📋💡 Routine Suggestions</h2>
              {analysis.recommendations_json.product_metadata?.product_type && (
                <p className="text-sm text-muted-foreground">
                  {analysis.recommendations_json.product_metadata.product_type === 'body' && 'Body Care Specific'}
                  {analysis.recommendations_json.product_metadata.product_type === 'hair' && 'Hair Care Specific'}
                  {analysis.recommendations_json.product_metadata.product_type === 'face' && 'Facial Skincare Specific'}
                </p>
              )}
            </div>
          </div>
          {analysis.recommendations_json.routine_suggestions?.length > 0 ? (
            <ul className="space-y-3">
              {analysis.recommendations_json.routine_suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg">
                  <span className="text-primary mt-1">•</span>
                  <span className="flex-1">{suggestion}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              No specific routine suggestions available for this product. 
              Use as directed on product label.
            </p>
          )}
        </Card>
        </section>

        <section className="space-y-6 md:space-y-8">
          <div className="flex items-center justify-between">
            <p className="text-xs md:text-sm font-subheading uppercase tracking-[0.3em] text-muted-foreground">
              Feedback
            </p>
          </div>

          <div>
            <PostAnalysisFeedback analysisId={analysis.id} />
          </div>
        </section>

        </div>

        {/* SkinLytixGPT Chat with Voice */}
        {/* SkinLytixGPT Chat with Voice */}
        <Suspense fallback={<div />}>
          <SkinLytixGPTChat 
            analysisId={analysis.id}
            productName={analysis.product_name}
            skinType={analysis.recommendations_json?.product_metadata?.product_type}
            isOpen={isChatOpen}
            onOpenChange={setIsChatOpen}
          />
        </Suspense>

        {/* Demo Mode Toggle - Admin Only */}
        <DemoModeToggle />
      </div>
    </AppShell>
    </TooltipProvider>
  );
};

export default Analysis;
