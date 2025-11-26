import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Droplets, Wind, Flame, Shield, Sparkles, Home, ArrowLeft, User, TrendingUp, Calendar, DollarSign, Edit2, ChevronDown, ScanLine, Plus, History, Search, Info, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTracking, trackEvent } from "@/hooks/useTracking";

const skinTypes = [
  { value: "oily", label: "Oily", icon: Droplets, description: "Shiny, prone to breakouts" },
  { value: "dry", label: "Dry", icon: Wind, description: "Tight, flaky, rough texture" },
  { value: "combination", label: "Combination", icon: Flame, description: "Oily T-zone, dry cheeks" },
  { value: "sensitive", label: "Sensitive", icon: Shield, description: "Easily irritated, reactive" },
  { value: "normal", label: "Normal", icon: Sparkles, description: "Balanced, healthy glow" },
];

const skinConcerns = [
  { value: "acne", label: "Acne & Breakouts" },
  { value: "aging", label: "Fine Lines & Aging" },
  { value: "hyperpigmentation", label: "Dark Spots & Hyperpigmentation" },
  { value: "redness", label: "Redness & Rosacea" },
  { value: "dryness", label: "Dryness & Dehydration" },
  { value: "dullness", label: "Dullness & Uneven Texture" },
  { value: "pores", label: "Large Pores" },
  { value: "dark_circles", label: "Dark Circles" },
];

interface ProfileStats {
  totalAnalyses: number;
  latestRoutine: {
    name: string;
    lastUsed: string;
  } | null;
  totalSavings: number;
  recommendationsAvailable: number;
}

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  useTracking('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [skinType, setSkinType] = useState<"oily" | "dry" | "combination" | "sensitive" | "normal" | "">("");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    totalAnalyses: 0,
    latestRoutine: null,
    totalSavings: 0,
    recommendationsAvailable: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [allAnalyses, setAllAnalyses] = useState<any[]>([]);
  const [allRoutines, setAllRoutines] = useState<any[]>([]);
  const [currentRoutine, setCurrentRoutine] = useState<any>(null);
  const [pastRoutines, setPastRoutines] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingRoutines, setLoadingRoutines] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [scoreFilter, setScoreFilter] = useState<"all" | "excellent" | "good" | "attention">("all");
  const [feedbackCount, setFeedbackCount] = useState(0);

  useEffect(() => {
    fetchProfile();
    fetchStats();
    fetchAllAnalyses();
    fetchAllRoutines();
    fetchFeedbackCount();
  }, []);

  const fetchFeedbackCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('feedback')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setFeedbackCount(count || 0);
    } catch (error) {
      console.error('Error fetching feedback count:', error);
    }
  };

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("skin_type, skin_concerns")
        .eq("id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSkinType(data.skin_type || "");
        setSelectedConcerns(Array.isArray(data.skin_concerns) ? data.skin_concerns.filter((c): c is string => typeof c === 'string') : []);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    setIsLoadingStats(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get total analyses count
      const { count: analysesCount } = await supabase
        .from('user_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Get most recent routine
      const { data: routineData } = await supabase
        .from('routines')
        .select('routine_name, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get total savings from routine optimizations
      const { data: routinesData } = await supabase
        .from('routines')
        .select('id')
        .eq('user_id', user.id);

      const routineIds = routinesData?.map(r => r.id) || [];
      
      let totalSavings = 0;
      let recommendationsCount = 0;
      if (routineIds.length > 0) {
        const { data: optimizationsData } = await supabase
          .from('routine_optimizations')
          .select('optimization_data')
          .in('routine_id', routineIds);

        if (optimizationsData) {
          optimizationsData.forEach((opt: any) => {
            const costOpts = opt.optimization_data?.costOptimizations;
            if (Array.isArray(costOpts)) {
              costOpts.forEach((costOpt: any) => {
                if (costOpt.potentialSavings) {
                  // Try to parse as number, handling both numeric and text values
                  const savings = typeof costOpt.potentialSavings === 'number' 
                    ? costOpt.potentialSavings 
                    : parseFloat(costOpt.potentialSavings);
                  
                  // Only add if it's a valid number greater than 0
                  if (!isNaN(savings) && savings > 0) {
                    totalSavings += savings;
                    recommendationsCount++;
                  }
                }
              });
            }
          });
        }
      }

      setStats({
        totalAnalyses: analysesCount || 0,
        latestRoutine: routineData ? {
          name: routineData.routine_name,
          lastUsed: new Date(routineData.updated_at).toLocaleDateString()
        } : null,
        totalSavings,
        recommendationsAvailable: recommendationsCount
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleConcernToggle = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern)
        ? prev.filter((c) => c !== concern)
        : [...prev, concern]
    );
  };

  const fetchAllAnalyses = async () => {
    setLoadingProducts(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('user_analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('analyzed_at', { ascending: false });

      if (error) throw error;
      setAllAnalyses(data || []);
    } catch (error) {
      console.error('Error fetching analyses:', error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchAllRoutines = async () => {
    setLoadingRoutines(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: routinesData, error } = await supabase
        .from('routines')
        .select(`
          *,
          routine_products (
            id,
            usage_frequency,
            category,
            user_analyses (
              product_name,
              product_price,
              epiq_score,
              brand
            )
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Get optimization data for each routine
      const routinesWithOptimizations = await Promise.all(
        (routinesData || []).map(async (routine) => {
          const { data: optData } = await supabase
            .from('routine_optimizations')
            .select('*')
            .eq('routine_id', routine.id)
            .order('optimized_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        return {
          ...routine,
          hasOptimization: !!optData,
          optimizationId: optData?.id,
          optimizationScore: optData?.optimization_data && typeof optData.optimization_data === 'object' && 'overallScore' in optData.optimization_data 
            ? (optData.optimization_data as any).overallScore 
            : undefined,
          products: routine.routine_products?.map((rp: any) => ({
            ...rp,
            product_name: rp.user_analyses?.product_name,
            product_price: rp.user_analyses?.product_price,
            epiq_score: rp.user_analyses?.epiq_score,
            brand: rp.user_analyses?.brand
          })) || [],
          productCount: routine.routine_products?.length || 0,
          totalCost: routine.routine_products?.reduce((sum: number, p: any) => sum + (p.user_analyses?.product_price || 0), 0) || 0
        };
        })
      );

      const current = routinesWithOptimizations[0] || null;
      const past = routinesWithOptimizations.slice(1);

      setCurrentRoutine(current);
      setPastRoutines(past);
      setAllRoutines(routinesWithOptimizations);
    } catch (error) {
      console.error('Error fetching routines:', error);
    } finally {
      setLoadingRoutines(false);
    }
  };

  const handleSave = async () => {
    if (!skinType) {
      toast({
        title: "Please select your skin type",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          skin_type: skinType,
          skin_concerns: selectedConcerns,
        })
        .eq("id", user.id);

      if (error) throw error;

      trackEvent({
        eventName: 'profile_updated',
        eventCategory: 'profile',
        eventProperties: {
          skinType,
          concernsCount: selectedConcerns.length
        }
      });

      toast({
        title: "Profile Updated! ✓",
        description: "Your skin profile has been saved.",
      });

      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Helper functions
  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      excellent: 'Excellent Products (70-100)',
      good: 'Good Products (50-69)',
      attention: 'Needs Attention (<50)'
    };
    return labels[category] || category;
  };

  const getProductsInCategory = (category: string) => {
    return filteredAnalyses.filter(p => {
      if (category === 'excellent') return p.epiq_score >= 70;
      if (category === 'good') return p.epiq_score >= 50 && p.epiq_score < 70;
      if (category === 'attention') return p.epiq_score < 50;
      return false;
    });
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 70) return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
    if (score >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
  };

  const handleQuickAddToRoutine = async (analysisId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get or create current routine
      let routine = currentRoutine;
      if (!routine) {
        const { data: newRoutine, error: routineError } = await supabase
          .from('routines')
          .insert({
            user_id: user.id,
            routine_name: 'My Routine'
          })
          .select()
          .single();
        
        if (routineError) throw routineError;
        routine = newRoutine;
        setCurrentRoutine(newRoutine);
      }

      // Get product details from analysis
      const analysis = allAnalyses.find(a => a.id === analysisId);
      if (!analysis) throw new Error("Product not found");

      // Check if product is already in routine (prevent duplicates)
      const { data: existing } = await supabase
        .from('routine_products')
        .select('id')
        .eq('routine_id', routine.id)
        .eq('analysis_id', analysisId)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Already in routine",
          description: `${analysis.product_name} is already in your routine`,
          variant: "destructive"
        });
        return;
      }

      // Add to routine (no price needed - stored in user_analyses)
      const { error } = await supabase
        .from('routine_products')
        .insert({
          routine_id: routine.id,
          analysis_id: analysisId,
          usage_frequency: 'Both' // Fixed: Use valid value (AM/PM/Both)
        });

      if (error) throw error;

      trackEvent({
        eventName: 'product_added_to_routine_from_profile',
        eventCategory: 'profile',
        eventProperties: { 
          epiq_score: analysis.epiq_score,
          has_price: !!analysis.product_price
        }
      });

      toast({
        title: "Added to routine!",
        description: `${analysis.product_name} added to your current routine`
      });

      fetchAllRoutines();
    } catch (error: any) {
      toast({
        title: "Failed to add product",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleRestoreRoutine = async (routineId: string) => {
    try {
      toast({
        title: "Routine restored",
        description: "This routine is now your active routine"
      });
      fetchAllRoutines();
      setActiveTab("overview");
    } catch (error: any) {
      toast({
        title: "Failed to restore routine",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Filtered analyses based on search and score
  const filteredAnalyses = allAnalyses.filter(analysis => {
    const matchesSearch = searchQuery === "" || 
      analysis.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (analysis.brand && analysis.brand.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (scoreFilter === "all") return matchesSearch;
    if (scoreFilter === "excellent") return matchesSearch && analysis.epiq_score >= 70;
    if (scoreFilter === "good") return matchesSearch && analysis.epiq_score >= 50 && analysis.epiq_score < 70;
    if (scoreFilter === "attention") return matchesSearch && analysis.epiq_score < 50;
    return matchesSearch;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {/* Profile Completion Banner */}
        {!skinType && !isLoading && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-accent/10 to-cta/10 border-accent/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-accent/20 rounded-lg">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">Complete Your Profile for Better Analysis</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  Add your skin type and concerns to get personalized EpiQ scores and recommendations tailored to your needs.
                </p>
                <Button 
                  variant="default"
                  size="sm"
                  onClick={() => {
                    trackEvent({
                      eventName: 'profile_banner_clicked',
                      eventCategory: 'profile',
                      eventProperties: {}
                    });
                    navigate('/onboarding');
                  }}
                >
                  Complete Profile Now
                </Button>
              </div>
            </div>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              Overview
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Products ({allAnalyses.length})</span>
              <span className="sm:hidden">Products</span>
            </TabsTrigger>
            <TabsTrigger value="routines" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Routines ({allRoutines.length})</span>
              <span className="sm:hidden">Routines</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Products Analyzed</p>
                    {isLoadingStats ? (
                      <p className="text-2xl font-bold">-</p>
                    ) : (
                      <p className="text-2xl font-bold">{stats.totalAnalyses}</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Calendar className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Latest Routine</p>
                    {isLoadingStats ? (
                      <p className="text-sm font-semibold">-</p>
                    ) : stats.latestRoutine ? (
                      <>
                        <p className="text-sm font-semibold truncate">{stats.latestRoutine.name}</p>
                        <p className="text-xs text-muted-foreground">{stats.latestRoutine.lastUsed}</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No routines yet</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm text-muted-foreground">Potential Savings</p>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p className="text-xs">Save this amount by switching to our recommended alternative products that offer similar benefits at lower prices.</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    {isLoadingStats ? (
                      <p className="text-2xl font-bold text-muted-foreground">-</p>
                    ) : stats.totalSavings > 0 ? (
                      <p className="text-2xl font-bold text-green-600">${stats.totalSavings.toFixed(2)}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">No recommendations yet</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recommendations</p>
                    {isLoadingStats ? (
                      <p className="text-2xl font-bold text-muted-foreground">-</p>
                    ) : stats.recommendationsAvailable > 0 ? (
                      <p className="text-2xl font-bold">{stats.recommendationsAvailable}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground">None yet</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="p-6 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <MessageSquare className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Impact</p>
                    {feedbackCount > 0 ? (
                      <>
                        <p className="text-2xl font-bold">🎯 {feedbackCount}</p>
                        <p className="text-xs text-muted-foreground">feedback{feedbackCount !== 1 ? 's' : ''} submitted</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No feedback yet</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Profile Card */}
            <Card className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold">My Skin Profile</h1>
                    <p className="text-muted-foreground">
                      Manage your skin type and concerns
                    </p>
                  </div>
                </div>
                {!isEditing && (
                  <Button onClick={() => setIsEditing(true)}>
                    <Edit2 className="w-4 h-4 mr-2" />
                    Edit Profile
                  </Button>
                )}
              </div>

              <div className="space-y-8">
                {/* Skin Type Section */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Skin Type</h2>
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {skinTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <button
                            key={type.value}
                            onClick={() => setSkinType(type.value as "oily" | "dry" | "combination" | "sensitive" | "normal")}
                            className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                              skinType === type.value
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            }`}
                          >
                            <div className="flex flex-col items-center text-center space-y-3">
                              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                                <Icon className="w-8 h-8 text-accent" />
                              </div>
                              <div>
                                <h3 className="font-semibold">{type.label}</h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                  {type.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 border-2 rounded-lg bg-muted/30">
                      {skinType ? (
                        <div className="flex items-center gap-4">
                          {(() => {
                            const selectedType = skinTypes.find(t => t.value === skinType);
                            if (!selectedType) return null;
                            const Icon = selectedType.icon;
                            return (
                              <>
                                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                                  <Icon className="w-6 h-6 text-accent" />
                                </div>
                                <div>
                                  <h3 className="font-semibold text-lg">{selectedType.label}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {selectedType.description}
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No skin type selected</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Skin Concerns Section */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Skin Concerns</h2>
                  {isEditing ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {skinConcerns.map((concern) => (
                        <div
                          key={concern.value}
                          className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                        >
                          <Checkbox
                            id={concern.value}
                            checked={selectedConcerns.includes(concern.value)}
                            onCheckedChange={() => handleConcernToggle(concern.value)}
                          />
                          <label
                            htmlFor={concern.value}
                            className="text-sm font-medium cursor-pointer flex-1"
                          >
                            {concern.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 border-2 rounded-lg bg-muted/30">
                      {selectedConcerns.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedConcerns.map((concernValue) => {
                            const concern = skinConcerns.find(c => c.value === concernValue);
                            return concern ? (
                              <span
                                key={concernValue}
                                className="px-3 py-1 bg-accent/20 text-accent rounded-full text-sm"
                              >
                                {concern.label}
                              </span>
                            ) : null;
                          })}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No concerns selected</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      onClick={() => {
                        setIsEditing(false);
                        fetchProfile();
                      }}
                      variant="outline"
                      disabled={isSaving}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={isSaving || !skinType}
                    >
                      {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => navigate('/upload')}
              >
                <ScanLine className="w-8 h-8" />
                <span className="font-semibold">Scan New Product</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto py-6 flex flex-col items-center gap-2"
                onClick={() => navigate('/routine')}
              >
                <Calendar className="w-8 h-8" />
                <span className="font-semibold">Manage Routine</span>
              </Button>
            </div>

            {/* Help & Feedback Section */}
            <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/20 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">Help & Feedback</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Your voice helps shape SkinLytix. Tell us what's working, what's not, and what you wish existed.
                  </p>
                  <Button onClick={() => navigate('/beta-feedback')}>
                    Give Feedback
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Products Tab */}
          <TabsContent value="products" className="space-y-6">
            {/* Search/Filter Bar */}
            <Card className="p-4">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Search products by name or brand..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={scoreFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setScoreFilter('all')}
                  className="cursor-pointer"
                >
                  All
                </Badge>
                <Badge 
                  variant={scoreFilter === 'excellent' ? 'default' : 'outline'}
                  onClick={() => setScoreFilter('excellent')}
                  className="cursor-pointer"
                >
                  Excellent (70+)
                </Badge>
                <Badge 
                  variant={scoreFilter === 'good' ? 'default' : 'outline'}
                  onClick={() => setScoreFilter('good')}
                  className="cursor-pointer"
                >
                  Good (50-69)
                </Badge>
                <Badge 
                  variant={scoreFilter === 'attention' ? 'default' : 'outline'}
                  onClick={() => setScoreFilter('attention')}
                  className="cursor-pointer"
                >
                  Needs Attention (&lt;50)
                </Badge>
              </div>
            </Card>

            {loadingProducts ? (
              <Card className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading products...</p>
              </Card>
            ) : filteredAnalyses.length === 0 ? (
              <Card className="p-12 text-center">
                <ScanLine className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">
                  {searchQuery || scoreFilter !== 'all' ? 'No Products Found' : 'No Products Yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || scoreFilter !== 'all' 
                    ? 'Try adjusting your search or filters' 
                    : 'Start analyzing your skincare products to see them here'}
                </p>
                {!searchQuery && scoreFilter === 'all' && (
                  <Button onClick={() => navigate('/upload')}>
                    <ScanLine className="w-4 h-4 mr-2" />
                    Scan Your First Product
                  </Button>
                )}
              </Card>
            ) : (
              <>
                {['excellent', 'good', 'attention'].map(category => {
                  const categoryProducts = getProductsInCategory(category);
                  if (categoryProducts.length === 0) return null;

                  return (
                    <Collapsible key={category} defaultOpen={category === 'excellent'}>
                      <Card>
                        <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">
                              {getCategoryLabel(category)}
                            </h3>
                            <Badge variant="secondary">
                              {categoryProducts.length} product{categoryProducts.length !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                          <ChevronDown className="w-5 h-5 transition-transform" />
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent className="p-4 pt-0">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            {categoryProducts.map(product => (
                              <Card key={product.id} className="p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold">{product.product_name}</h4>
                                    {product.brand && (
                                      <p className="text-sm text-muted-foreground">{product.brand}</p>
                                    )}
                                    <div className="flex items-center gap-2 mt-2">
                                      <Badge className={getScoreColorClass(product.epiq_score)}>
                                        EpiQ: {product.epiq_score}
                                      </Badge>
                                      <span className="text-xs text-muted-foreground">
                                        {new Date(product.analyzed_at).toLocaleDateString()}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <Collapsible>
                                  <CollapsibleTrigger className="text-sm text-primary mt-2 flex items-center gap-1 hover:underline">
                                    View Details <ChevronDown className="w-4 h-4" />
                                  </CollapsibleTrigger>
                                  <CollapsibleContent className="mt-3 pt-3 border-t space-y-3">
                                    {product.recommendations_json?.summary && (
                                      <div>
                                        <p className="text-sm font-medium mb-1">Summary:</p>
                                        <p className="text-sm text-muted-foreground">
                                          {product.recommendations_json.summary}
                                        </p>
                                      </div>
                                    )}
                                    
                                    <div className="flex gap-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => navigate(`/analysis/${product.id}`)}
                                      >
                                        View Full Analysis
                                      </Button>
                                      <Button 
                                        size="sm"
                                        onClick={() => handleQuickAddToRoutine(product.id)}
                                      >
                                        <Plus className="w-4 h-4 mr-1" />
                                        Add to Routine
                                      </Button>
                                    </div>
                                  </CollapsibleContent>
                                </Collapsible>
                              </Card>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Card>
                    </Collapsible>
                  );
                })}
              </>
            )}
          </TabsContent>

          {/* Routines Tab */}
          <TabsContent value="routines" className="space-y-6">
            {loadingRoutines ? (
              <Card className="p-12 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading routines...</p>
              </Card>
            ) : (
              <>
                {/* Current Routine */}
                <Card>
                  <div className="p-6 border-b">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">Current Routine</h3>
                        <p className="text-sm text-muted-foreground">
                          {currentRoutine?.routine_name || 'No active routine'}
                        </p>
                      </div>
                      {currentRoutine && (
                        <Button onClick={() => navigate('/routine')}>
                          View & Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {currentRoutine ? (
                    <div className="p-6 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold">{currentRoutine.productCount}</p>
                          <p className="text-xs text-muted-foreground">Products</p>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold">
                            {currentRoutine.optimizationScore || '-'}
                          </p>
                          <p className="text-xs text-muted-foreground">Score</p>
                        </div>
                        <div className="text-center p-3 bg-muted/30 rounded-lg">
                          <p className="text-2xl font-bold">
                            ${currentRoutine.totalCost?.toFixed(2) || '0'}
                          </p>
                          <p className="text-xs text-muted-foreground">Est. Cost</p>
                        </div>
                      </div>

                      {currentRoutine.products && currentRoutine.products.length > 0 && (
                        <Collapsible>
                          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline">
                            Products in Routine <ChevronDown className="w-4 h-4" />
                          </CollapsibleTrigger>
                          <CollapsibleContent className="mt-3 space-y-2">
                            {currentRoutine.products.map((product: any) => (
                              <div key={product.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                                <div>
                                  <p className="font-medium">{product.product_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {product.usage_frequency} • EpiQ: {product.epiq_score}
                                  </p>
                                </div>
                                <Badge variant="outline">
                                  ${product.product_price || 0}
                                </Badge>
                              </div>
                            ))}
                          </CollapsibleContent>
                        </Collapsible>
                      )}

                      {currentRoutine.hasOptimization && (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate(`/routine/optimization/${currentRoutine.optimizationId}`)}
                        >
                          View Optimization Report
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="p-12 text-center">
                      <p className="text-muted-foreground mb-4">
                        Create your first routine to track your skincare journey
                      </p>
                      <Button onClick={() => navigate('/routine')}>
                        Create Routine
                      </Button>
                    </div>
                  )}
                </Card>

                {/* Previous Routines */}
                {pastRoutines.length > 0 && (
                  <Collapsible>
                    <Card>
                      <CollapsibleTrigger className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <History className="w-5 h-5 text-muted-foreground" />
                          <div className="text-left">
                            <h3 className="text-lg font-semibold">Previous Routines</h3>
                            <p className="text-sm text-muted-foreground">
                              {pastRoutines.length} past routine{pastRoutines.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <ChevronDown className="w-5 h-5 transition-transform" />
                      </CollapsibleTrigger>

                      <CollapsibleContent className="px-6 pb-6 space-y-3">
                        {pastRoutines.map(routine => (
                          <Card key={routine.id} className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold">{routine.routine_name}</h4>
                                <p className="text-xs text-muted-foreground">
                                  Last used: {new Date(routine.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                              {routine.optimizationScore && (
                                <Badge>{routine.optimizationScore}/100</Badge>
                              )}
                            </div>

                            <Collapsible>
                              <CollapsibleTrigger className="text-sm text-primary flex items-center gap-1 hover:underline">
                                View Details <ChevronDown className="w-4 h-4" />
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-3 pt-3 border-t">
                                {routine.products && routine.products.length > 0 && (
                                  <div className="space-y-2 mb-3">
                                    {routine.products.slice(0, 3).map((p: any) => (
                                      <p key={p.id} className="text-sm text-muted-foreground">
                                        • {p.product_name}
                                      </p>
                                    ))}
                                    {routine.products.length > 3 && (
                                      <p className="text-sm text-muted-foreground">
                                        + {routine.products.length - 3} more product{routine.products.length - 3 !== 1 ? 's' : ''}
                                      </p>
                                    )}
                                  </div>
                                )}
                                <div className="flex gap-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleRestoreRoutine(routine.id)}
                                  >
                                    Restore
                                  </Button>
                                  {routine.hasOptimization && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => navigate(`/routine/optimization/${routine.optimizationId}`)}
                                    >
                                      View Report
                                    </Button>
                                  )}
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </Card>
                        ))}
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )}

                {allRoutines.length === 0 && (
                  <Card className="p-12 text-center">
                    <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-xl font-semibold mb-2">No Routines Yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first routine to start optimizing your skincare
                    </p>
                    <Button onClick={() => navigate('/routine')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Routine
                    </Button>
                  </Card>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Profile;
