import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Sparkles, Home, ScanLine, Plus, Info, HelpCircle, AlertTriangle, Download } from "lucide-react";
import { IngredientCard } from "@/components/IngredientCard";
import PostAnalysisFeedback from "@/components/PostAnalysisFeedback";
import { PostAnalysisFeedbackCard } from "@/components/PostAnalysisFeedbackCard";
import { FrictionFeedbackBanner } from "@/components/FrictionFeedbackBanner";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTracking, trackEvent } from "@/hooks/useTracking";
import ReactMarkdown from 'react-markdown';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AnimatedScoreGauge } from "@/components/AnimatedScoreGauge";
import { SafetyLevelMeter } from "@/components/SafetyLevelMeter";
import { ProfessionalReferralBanner } from "@/components/ProfessionalReferralBanner";
import { FloatingActionBubbles } from "@/components/FloatingActionBubbles";
import { ResponsiveBottomNav } from "@/components/ResponsiveBottomNav";
import { IngredientRiskHeatmap } from "@/components/IngredientRiskHeatmap";
import { ScoreBreakdownAccordion } from "@/components/ScoreBreakdownAccordion";
import { AIExplanationAccordion } from "@/components/AIExplanationAccordion";
import { AIExplanationLoader } from "@/components/AIExplanationLoader";
import { SkinLytixGPTChat } from "@/components/SkinLytixGPTChat";
import { DemoModeToggle } from "@/components/DemoModeToggle";
import { ExportAnalysisButton } from "@/components/ExportAnalysisButton";

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
  const { toast } = useToast();
  useTracking('analysis');
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [addingToRoutine, setAddingToRoutine] = useState(false);

  const fetchAnalysis = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
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
        toast({
          title: "Error loading analysis",
          description: "Could not load the analysis data.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setAnalysis(data as any);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };


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
      const { data: routines } = await supabase
        .from("routines")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      let routineId: string;

      if (routines && routines.length > 0) {
        routineId = routines[0].id;
      } else {
        const { data: newRoutine } = await supabase
          .from("routines")
          .insert({ user_id: user.id, routine_name: "My Skincare Routine" })
          .select("id")
          .single();
        routineId = newRoutine!.id;
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
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
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
      <main className="min-h-screen bg-gradient-to-b from-background to-muted py-6 md:py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        
        {/* Dashboard Header */}
        <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 rounded-xl p-4 md:p-6 mb-6 md:mb-8 animate-fade-in shadow-soft border border-border/50">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold mb-2">{analysis.product_name}</h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {analysis.brand && <span className="font-medium">{analysis.brand}</span>}
                {analysis.brand && analysis.category && <span>•</span>}
                {analysis.category && (
                  <span className="px-2 py-1 bg-primary/20 rounded-md capitalize font-medium">
                    {analysis.category}
                  </span>
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
        
        <div className="hidden md:flex items-center justify-between mb-6 md:mb-8">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <ExportAnalysisButton
            analysisId={analysis.id}
            productName={analysis.product_name}
            analysisData={analysis}
          />
        </div>

        {/* Mobile-only Primary CTA */}
        <div className="md:hidden mb-4">
          <Button
            variant="cta"
            onClick={handleAddToRoutine}
            disabled={addingToRoutine}
            className="w-full touch-target"
            size="lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            {addingToRoutine ? "Adding..." : "Add to Routine"}
          </Button>
        </div>

        {/* Routine Optimizer Info Banner */}
        <Card className="p-4 md:p-6 mb-6 md:mb-8 bg-gradient-to-r from-cta/10 via-accent/10 to-primary/10 border-cta/20">
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

        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-2">{analysis.product_name}</h1>
          <div className="flex flex-wrap gap-2 mb-2">
            {productMetadata?.product_type_label && (
              <Badge variant="default" className="text-base">
                {productMetadata.product_type_label}
              </Badge>
            )}
            {(analysis.brand || productMetadata?.brand) && (
              <Badge variant="secondary">
                {analysis.brand || productMetadata.brand}
              </Badge>
            )}
            {(analysis.category || productMetadata?.category) && (
              <Badge variant="outline">
                {analysis.category || productMetadata.category}
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground">
            Analyzed on {new Date(analysis.analyzed_at).toLocaleDateString()}
          </p>
        </div>

        <Card className="p-4 md:p-6 lg:p-8 mb-6 md:mb-8 text-center bg-gradient-to-br from-primary/5 to-accent/5">
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
          
          <AnimatedScoreGauge score={analysis.epiq_score} />
          
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
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
          <Card className="p-4 md:p-6 mb-6 md:mb-8 bg-primary/5 border-primary/20">
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

        {/* AI Explanation Section - SkinLytix GPT */}
        {analysis.recommendations_json.ai_explanation && (
          <AIExplanationAccordion aiExplanation={analysis.recommendations_json.ai_explanation} />
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
            <IngredientRiskHeatmap
              ingredients={allIngredients}
              onIngredientClick={(ingredientName) => {
                const element = document.getElementById(`ingredient-${ingredientName.replace(/\s+/g, '-')}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            />
          ) : null;
        })()}

        {analysis.recommendations_json.problematic_ingredients &&
         analysis.recommendations_json.problematic_ingredients.length > 0 && (
           <Card className="p-4 md:p-6 mb-6 md:mb-8 border-destructive/50 bg-destructive/5">
             <div className="flex items-center gap-3 mb-4">
               <AlertTriangle className="w-8 h-8 text-destructive animate-pulse" />
               <div className="flex-1">
                 <div className="flex items-center gap-2">
                   <h2 className="text-2xl font-bold text-destructive">🚨 Ingredients to Avoid</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="font-semibold mb-1">Based on your skin profile</p>
                      <p>These ingredients are recognized in scientific databases but may not be suitable for your specific skin type or concerns.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  These ingredients may conflict with your {analysis.recommendations_json.product_metadata?.product_type || 'skin'} profile
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {analysis.recommendations_json.problematic_ingredients.map((item, index) => (
                <div key={index} id={`ingredient-${item.name.replace(/\s+/g, '-')}`}>
                  <IngredientCard
                    name={item.name}
                    category="problematic"
                    details={item.reason}
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
              <p className="text-sm">
                <strong>⚠️ Consider avoiding this product</strong> if you have sensitive skin or active concerns. 
                These ingredients are known to potentially aggravate your specific condition.
              </p>
            </div>
          </Card>
        )}

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

         <Card className="p-4 md:p-6 mb-6 md:mb-8">
           <div className="flex items-center gap-3 mb-4">
             <CheckCircle2 className="w-8 h-8 text-green-500 animate-pulse" />
             <div className="flex-1">
               <div className="flex items-center gap-2">
                 <h2 className="text-2xl font-bold">✅ Safe Ingredients</h2>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>These ingredients are well-documented in scientific databases and are suitable for your skin profile. 
                    Ingredients with a ✨ star specifically target your concerns.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <p className="text-sm text-muted-foreground">
                {analysis.recommendations_json.beneficial_ingredients?.length > 0 
                  ? `${analysis.recommendations_json.beneficial_ingredients.length} beneficial for your profile`
                  : 'Recognized and suitable for your skin'
                }
              </p>
            </div>
          </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {analysis.recommendations_json.safe_ingredients.length > 0 ? (
                <>
                {analysis.recommendations_json.beneficial_ingredients?.map((item: any, index: number) => (
                  <IngredientCard
                    key={`beneficial-${index}`}
                    name={item.name}
                    category="beneficial"
                    details={item.benefit}
                    emoji="✨"
                    role={item.role}
                    molecular_weight={item.molecular_weight}
                    safety_profile={item.safety_profile}
                  />
                ))}
                {analysis.recommendations_json.safe_ingredients
                  .filter((ing: any) => !analysis.recommendations_json.beneficial_ingredients?.some((b: any) => b.name === (typeof ing === 'string' ? ing : ing.name)))
                  .map((ingredient: any, index: number) => (
                    <IngredientCard
                      key={`safe-${index}`}
                      name={typeof ingredient === 'string' ? ingredient : ingredient.name}
                      category="safe"
                      details={typeof ingredient === 'object' ? ingredient.explanation : undefined}
                      role={typeof ingredient === 'object' ? ingredient.role : undefined}
                      molecular_weight={typeof ingredient === 'object' ? ingredient.molecular_weight : undefined}
                      safety_profile={typeof ingredient === 'object' ? ingredient.safety_profile : undefined}
                    />
                  ))
                }
              </>
            ) : (
              <p className="text-muted-foreground">No safe ingredients identified</p>
            )}
          </div>
        </Card>

        {analysis.recommendations_json.concern_ingredients.length > 0 && (
           <Card className="p-4 md:p-6 mb-6 md:mb-8 border-amber-200 dark:border-amber-800">
             <div className="flex items-center gap-3 mb-4">
               <HelpCircle className="w-8 h-8 text-amber-500 animate-pulse" />
               <div className="flex-1">
                 <div className="flex items-center gap-2">
                   <h2 className="text-2xl font-bold">🔍 Unverified Ingredients</h2>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p className="font-semibold mb-1">Not found in our scientific databases</p>
                      <p className="mb-2">These ingredients don't appear in PubChem or Open Beauty Facts, but this doesn't mean they're unsafe or ineffective.</p>
                      <p className="text-xs">Common reasons: proprietary names, trade secrets, new ingredients, or botanical extracts not yet catalogued.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-sm text-muted-foreground">
                  Not in our database (PubChem, Open Beauty Facts) - may still be safe
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {analysis.recommendations_json.concern_ingredients.map((ingredient: any, index: number) => (
                <IngredientCard
                  key={index}
                  name={typeof ingredient === 'string' ? ingredient : ingredient.name}
                  category="unverified"
                  details={typeof ingredient === 'object' ? ingredient.explanation : "Not found in PubChem or Open Beauty Facts databases. May be a proprietary blend or trade name."}
                  role={typeof ingredient === 'object' ? ingredient.role : undefined}
                  molecular_weight={typeof ingredient === 'object' ? ingredient.molecular_weight : undefined}
                  safety_profile={typeof ingredient === 'object' ? ingredient.safety_profile : undefined}
                />
              ))}
            </div>
            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-900 dark:text-amber-100">
                💡 <strong>What to do:</strong> These ingredients may be perfectly safe. Consider looking them up individually or asking a dermatologist if you have concerns.
              </p>
            </div>
          </Card>
        )}

         <Card className="p-4 md:p-6 mb-24 md:mb-0">
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

        {/* Friction Feedback Banner - Show for low EpiQ scores */}
        {analysis.epiq_score < 50 && (
          <div className="mb-6">
            <FrictionFeedbackBanner trigger="low_score" context={`EpiQ Score: ${analysis.epiq_score}`} />
          </div>
        )}

        {/* Post-Analysis Feedback */}
        <div className="mb-6">
          <PostAnalysisFeedback analysisId={analysis.id} />
        </div>

        {/* Post-Analysis Feedback Card */}
        <div className="mb-24 md:mb-8">
          <PostAnalysisFeedbackCard />
        </div>

        {/* Floating Action Bubbles - Desktop only */}
        <FloatingActionBubbles 
          onAddToRoutine={handleAddToRoutine}
          showAddToRoutine={true}
        />

        {/* Responsive Bottom Navigation (Mobile + Tablet) */}
        <ResponsiveBottomNav 
          onAddToRoutine={handleAddToRoutine}
          showAddToRoutine={true}
          onChatOpen={() => {
            setIsChatOpen(true);
            trackEvent({
              eventName: 'chat_opened',
              eventCategory: 'chat',
              eventProperties: { analysisId: analysis.id, source: 'bottom_nav' }
            });
          }}
        />

        {/* SkinLytixGPT Chat with Voice */}
        {/* SkinLytixGPT Chat with Voice */}
        <SkinLytixGPTChat 
          analysisId={analysis.id}
          productName={analysis.product_name}
          skinType={analysis.recommendations_json?.product_metadata?.product_type}
          isOpen={isChatOpen}
          onOpenChange={setIsChatOpen}
        />

        {/* Demo Mode Toggle - Admin Only */}
        <DemoModeToggle />
      </div>
    </main>
    </TooltipProvider>
  );
};

export default Analysis;
