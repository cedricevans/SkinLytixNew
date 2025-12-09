import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Sparkles, DollarSign, AlertTriangle, Pencil, Trash2, Info, Home, ArrowLeft, User, Lock, Crown } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useTracking, trackEvent } from "@/hooks/useTracking";
import { useSubscription } from "@/hooks/useSubscription";
import { useUsageLimits } from "@/hooks/useUsageLimits";
import { PaywallModal } from "@/components/paywall/PaywallModal";
import { UsageCounter } from "@/components/paywall/UsageCounter";

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
  category?: string;
  user_analyses: {
    product_name: string;
    brand?: string;
    category?: string;
    epiq_score: number;
    product_price?: number | null;
  };
}

export default function Routine() {
  const navigate = useNavigate();
  useTracking('routine');
  const { effectiveTier, canAccess } = useSubscription();
  const { usage, incrementUsage, canUse, limits, premiumLimits, getRemainingUsage } = useUsageLimits();
  
  const [routineName, setRoutineName] = useState("My Skincare Routine");
  const [routineId, setRoutineId] = useState<string | null>(null);
  const [routineProducts, setRoutineProducts] = useState<RoutineProduct[]>([]);
  const [availableAnalyses, setAvailableAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [showCostDialog, setShowCostDialog] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("");
  
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [productPrice, setProductPrice] = useState("");
  const [usageFrequency, setUsageFrequency] = useState("Both");
  const [productCategory, setProductCategory] = useState("");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  
  const [showProductsDialog, setShowProductsDialog] = useState(false);
  
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  
  const [showManualEntryDialog, setShowManualEntryDialog] = useState(false);
  const [manualProductName, setManualProductName] = useState("");
  const [manualBrand, setManualBrand] = useState("");
  const [manualCategory, setManualCategory] = useState("");
  const [manualPrice, setManualPrice] = useState("");
  const [manualFrequency, setManualFrequency] = useState("Both");
  const [routineCount, setRoutineCount] = useState(0);
  const [allRoutines, setAllRoutines] = useState<any[]>([]);

  // Tier-based limits
  const ROUTINE_LIMITS = { free: 1, premium: 5, pro: Infinity };
  const PRODUCT_LIMITS = { free: 3, premium: 10, pro: Infinity };
  
  const maxRoutines = ROUTINE_LIMITS[effectiveTier] || 1;
  const maxProducts = PRODUCT_LIMITS[effectiveTier] || 3;

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
      // Load all routines for count check
      const { data: routines } = await supabase
        .from("routines")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setAllRoutines(routines || []);
      setRoutineCount(routines?.length || 0);
      
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
        setRoutineCount(1);
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
            epiq_score,
            product_price
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

  const openPriceDialog = (analysisId: string) => {
    // Check product limit before adding
    if (routineProducts.length >= maxProducts) {
      setPaywallFeature("Add More Products");
      setShowPaywall(true);
      return;
    }
    
    setSelectedAnalysisId(analysisId);
    setProductPrice("");
    setUsageFrequency("Both");
    setProductCategory("");
    setEditingProductId(null);
    setShowPriceDialog(true);
  };

  const handleEditProduct = (routineProduct: RoutineProduct) => {
    setEditingProductId(routineProduct.id);
    setSelectedAnalysisId(routineProduct.analysis_id);
    setProductPrice(
      (routineProduct.user_analyses?.product_price || routineProduct.product_price)?.toString() || ""
    );
    setUsageFrequency(routineProduct.usage_frequency);
    setProductCategory((routineProduct as any).category || "");
    setShowPriceDialog(true);
  };

  const confirmDeleteProduct = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteDialog(true);
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;

    try {
      const { error } = await supabase
        .from("routine_products")
        .delete()
        .eq("id", productToDelete);

      if (error) throw error;

      toast.success("Product removed from routine");
      setShowDeleteDialog(false);
      setProductToDelete(null);
      loadRoutineAndAnalyses();
    } catch (error) {
      console.error("Error deleting product:", error);
      toast.error("Failed to remove product");
    }
  };

  const handleAddProduct = async () => {
    if (!routineId || !selectedAnalysisId) return;

    const price = productPrice.trim() === "" ? null : parseFloat(productPrice);

    try {
      if (editingProductId) {
        // Update existing product
        const { error } = await supabase
          .from("routine_products")
          .update({
            usage_frequency: usageFrequency,
            category: productCategory || null,
            product_price: price,
          })
          .eq("id", editingProductId);

        if (error) throw error;
        toast.success("Product updated");
      } else {
        // Insert new product
        const { error } = await supabase
          .from("routine_products")
          .insert({
            routine_id: routineId,
            analysis_id: selectedAnalysisId,
            usage_frequency: usageFrequency,
            category: productCategory || null,
            product_price: price,
          });

        if (error) throw error;
        
        trackEvent({
          eventName: 'product_added_to_routine',
          eventCategory: 'routine',
          eventProperties: { 
            usageFrequency,
            hasPrice: price !== null && price > 0
          }
        });
        
        toast.success("Product added to routine");
      }

      setShowPriceDialog(false);
      setEditingProductId(null);
      loadRoutineAndAnalyses();
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error("Failed to save product");
    }
  };

  const handleAddManualProduct = async () => {
    if (!routineId || !manualProductName) {
      toast.error("Product name is required");
      return;
    }
    
    // Check product limit before adding
    if (routineProducts.length >= maxProducts) {
      setPaywallFeature("Add More Products");
      setShowPaywall(true);
      setShowManualEntryDialog(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // First, create a user analysis entry
      const { data: analysis, error: analysisError } = await supabase
        .from("user_analyses")
        .insert({
          user_id: user.id,
          product_name: manualProductName,
          brand: manualBrand || null,
          category: manualCategory || null,
          epiq_score: null,
          ingredients_list: "Manually added - no ingredient analysis",
        })
        .select()
        .single();

      if (analysisError) throw analysisError;

      // Then add to routine
      const price = parseFloat(manualPrice) || 0;
      const { error: routineError } = await supabase
        .from("routine_products")
        .insert({
          routine_id: routineId,
          analysis_id: analysis.id,
          usage_frequency: manualFrequency,
          product_price: price,
        });

      if (routineError) throw routineError;

      toast.success("Product added to routine");
      setShowManualEntryDialog(false);
      setManualProductName("");
      setManualBrand("");
      setManualCategory("");
      setManualPrice("");
      setManualFrequency("Both");
      loadRoutineAndAnalyses();
    } catch (error) {
      console.error("Error adding manual product:", error);
      toast.error("Failed to add product");
    }
  };

  const handleOptimizeRoutine = async () => {
    if (!routineId || routineProducts.length === 0) {
      toast.error("Add products to your routine first");
      return;
    }

    // Check subscription tier for optimization access
    if (effectiveTier === 'free') {
      setPaywallFeature("Routine Optimization");
      setShowPaywall(true);
      return;
    }

    // Check usage limits for premium users
    if (effectiveTier === 'premium' && !canUse('routineOptimizationsUsed', 'premium')) {
      setPaywallFeature("Routine Optimization");
      setShowPaywall(true);
      return;
    }

    setOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-routine", {
        body: { routineId },
      });

      if (error) throw error;

      // Increment usage for premium users
      if (effectiveTier === 'premium') {
        await incrementUsage('routineOptimizationsUsed');
      }

      trackEvent({
        eventName: 'routine_optimized',
        eventCategory: 'routine',
        eventProperties: { 
          productCount: routineProducts.length,
          totalCost,
          tier: effectiveTier
        }
      });

      toast.success("Routine optimized!");
      navigate(`/routine/optimization/${data.optimizationId}`);
    } catch (error) {
      console.error("Error optimizing routine:", error);
      toast.error("Failed to optimize routine");
    } finally {
      setOptimizing(false);
    }
  };

  const handleCostAnalysis = async () => {
    if (!routineId || routineProducts.length === 0) {
      toast.error("Add products to your routine first");
      return;
    }

    try {
      const { data: optimizations } = await supabase
        .from("routine_optimizations")
        .select("id")
        .eq("routine_id", routineId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (optimizations && optimizations.length > 0) {
        navigate(`/routine/optimization/${optimizations[0].id}`);
      } else {
        setShowCostDialog(true);
      }
    } catch (error) {
      console.error("Error checking optimizations:", error);
      toast.error("Failed to load cost analysis");
    }
  };

  const totalCost = routineProducts.reduce(
    (sum, p) => sum + (p.user_analyses?.product_price || p.product_price || 0),
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
    <TooltipProvider>
      <div className="min-h-screen bg-background">
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
            <Button variant="ghost" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
          </div>
          <Button variant="default" onClick={() => navigate('/upload')}>
            <Plus className="w-4 h-4 mr-2" />
            Scan Product
          </Button>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">{routineName}</h1>
              <p className="text-muted-foreground">
                Build and optimize your personal care routine (face, body, & hair)
              </p>
            </div>
            {/* Routine & Product Limits Display */}
            <div className="hidden md:flex flex-col gap-1 text-sm text-right">
              <div className="flex items-center gap-2 justify-end">
                <span className="text-muted-foreground">Products:</span>
                <Badge variant={routineProducts.length >= maxProducts ? "destructive" : "secondary"}>
                  {routineProducts.length} / {maxProducts === Infinity ? '∞' : maxProducts}
                </Badge>
              </div>
              {effectiveTier === 'free' && (
                <div className="flex items-center gap-2 justify-end">
                  <span className="text-muted-foreground">Routines:</span>
                  <Badge variant="secondary">
                    {routineCount} / {maxRoutines}
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          {/* Mobile limits display */}
          <div className="md:hidden flex gap-2 mt-3">
            <Badge variant={routineProducts.length >= maxProducts ? "destructive" : "secondary"}>
              {routineProducts.length}/{maxProducts === Infinity ? '∞' : maxProducts} products
            </Badge>
            {effectiveTier === 'free' && (
              <Badge variant="secondary">
                {routineCount}/{maxRoutines} routines
              </Badge>
            )}
          </div>
        </div>

        {/* Routine Summary */}
        {routineProducts.length > 0 && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-1">Routine Summary</h3>
                <p className="text-sm text-muted-foreground">
                  {routineProducts.length} products • Total Cost: ${totalCost.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {/* Usage counter for premium users */}
                {effectiveTier === 'premium' && (
                  <UsageCounter 
                    used={usage.routineOptimizationsUsed} 
                    limit={premiumLimits.routineOptimizations}
                    label="Optimizations"
                    feature="Routine Optimization"
                  />
                )}
                <div className="flex items-center">
                  <Button
                    onClick={handleOptimizeRoutine}
                    disabled={optimizing}
                    className="bg-primary"
                  >
                    {effectiveTier === 'free' && <Lock className="w-4 h-4 mr-2" />}
                    <Sparkles className="w-4 h-4 mr-2" />
                    {optimizing ? "Optimizing..." : "Optimize Routine"}
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Our AI analyzes your routine for ingredient conflicts, redundancies, and cost-saving opportunities. {effectiveTier === 'free' ? 'Upgrade to Premium for full access.' : 'Optimize after adding 2+ products for best results.'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center">
                  <Button variant="outline" onClick={handleCostAnalysis}>
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cost Analysis
                  </Button>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 ml-2 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>View detailed breakdown of your routine costs and discover budget-friendly alternatives that maintain the same key ingredients.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                  <div className="flex items-center justify-between gap-4">
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
                        {rp.user_analyses.epiq_score !== null && (
                          <>
                            <div className="flex items-center gap-1">
                              <span className="text-sm text-muted-foreground">
                                EpiQ: {rp.user_analyses.epiq_score}
                              </span>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <p>This product's safety and effectiveness score (0-100) based on ingredient analysis and your skin profile.</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <span className="text-sm text-muted-foreground">•</span>
                          </>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {rp.usage_frequency}
                        </span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground">
                          ${(rp.user_analyses?.product_price || rp.product_price || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditProduct(rp)}
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDeleteProduct(rp.id)}
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Available Products to Add */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Add Products</h2>
            <div className="flex gap-2">
              <Button onClick={() => setShowProductsDialog(true)} variant="outline">
                View All Products ({availableAnalyses.length})
              </Button>
              <Button onClick={() => setShowManualEntryDialog(true)} variant="default">
                <Plus className="w-4 h-4 mr-2" />
                Add New Product
              </Button>
            </div>
          </div>
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
                      onClick={() => openPriceDialog(analysis.id)}
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

        {/* Price Input Dialog */}
        <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingProductId ? "Edit Product" : "Add Product to Routine"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="price">Product Price ($)</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Enter the product price to track your routine costs and get personalized budget-friendly alternatives during optimization.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="category">Category</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Specify the product category to help organize your routine (Face, Body, Hair).</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={productCategory}
                  onChange={(e) => setProductCategory(e.target.value)}
                >
                  <option value="">Not specified</option>
                  <option value="face">Face</option>
                  <option value="body">Body</option>
                  <option value="hair">Hair</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Label htmlFor="frequency">Usage Frequency</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Select when you use this product: Morning (AM), Evening (PM), or Both. This helps our AI detect conflicts between products used at the same time.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <select
                  id="frequency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={usageFrequency}
                  onChange={(e) => setUsageFrequency(e.target.value)}
                >
                  <option value="AM">Morning (AM)</option>
                  <option value="PM">Evening (PM)</option>
                  <option value="Both">Both AM & PM</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPriceDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct}>
                {editingProductId ? "Update Product" : "Add Product"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Manual Product Entry Dialog */}
        <Dialog open={showManualEntryDialog} onOpenChange={setShowManualEntryDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Product Manually</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="manual-name">Product Name *</Label>
                <Input
                  id="manual-name"
                  placeholder="Enter product name"
                  value={manualProductName}
                  onChange={(e) => setManualProductName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual-brand">Brand</Label>
                <Input
                  id="manual-brand"
                  placeholder="Enter brand (optional)"
                  value={manualBrand}
                  onChange={(e) => setManualBrand(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual-category">Category</Label>
                <Input
                  id="manual-category"
                  placeholder="e.g., Moisturizer, Serum (optional)"
                  value={manualCategory}
                  onChange={(e) => setManualCategory(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual-price">Product Price ($)</Label>
                <Input
                  id="manual-price"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={manualPrice}
                  onChange={(e) => setManualPrice(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="manual-frequency">Usage Frequency</Label>
                <select
                  id="manual-frequency"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={manualFrequency}
                  onChange={(e) => setManualFrequency(e.target.value)}
                >
                  <option value="AM">Morning (AM)</option>
                  <option value="PM">Evening (PM)</option>
                  <option value="Both">Both AM & PM</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowManualEntryDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddManualProduct}>
                Add to Routine
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Product from Routine?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the product from your routine. You can always add it back later.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteProduct} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Cost Analysis Info Dialog */}
        <Dialog open={showCostDialog} onOpenChange={setShowCostDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cost Analysis Not Available</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-muted-foreground mb-4">
                No cost analysis found. Run "Optimize Routine" first to generate detailed cost optimization insights.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCostDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => {
                setShowCostDialog(false);
                handleOptimizeRoutine();
              }}>
                <Sparkles className="w-4 h-4 mr-2" />
                Optimize Now
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* All Products Dialog */}
        <Dialog open={showProductsDialog} onOpenChange={setShowProductsDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>All Analyzed Products ({availableAnalyses.length})</DialogTitle>
            </DialogHeader>
            <div className="py-4 overflow-y-auto max-h-[60vh]">
              {availableAnalyses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No analyzed products yet. Scan products to get started.
                </p>
              ) : (
                <div className="grid gap-3">
                  {availableAnalyses.map((analysis) => {
                    const isInRoutine = routineProducts.some((rp) => rp.analysis_id === analysis.id);
                    return (
                      <Card key={analysis.id} className="p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <h3 className="font-semibold mb-1">{analysis.product_name}</h3>
                            <div className="flex items-center gap-2">
                              {analysis.epiq_score !== null && (
                                <span className="text-sm text-muted-foreground">
                                  EpiQ Score: {analysis.epiq_score}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                • {new Date(analysis.analyzed_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          {isInRoutine ? (
                            <Badge variant="secondary">In Routine</Badge>
                          ) : (
                            <Button
                              onClick={() => {
                                setShowProductsDialog(false);
                                openPriceDialog(analysis.id);
                              }}
                              size="sm"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Routine
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => setShowProductsDialog(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Paywall Modal */}
        <PaywallModal 
          open={showPaywall} 
          onOpenChange={setShowPaywall}
          feature={paywallFeature}
          featureDescription={
            paywallFeature === "Routine Optimization" 
              ? "Get AI-powered recommendations to improve your routine and save money"
              : "Unlock this premium feature"
          }
          showTrial={effectiveTier === 'free'}
        />
      </div>
    </div>
    </TooltipProvider>
  );
}