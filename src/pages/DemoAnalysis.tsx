import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, HelpCircle, Home, ArrowRight, Sparkles, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { trackEvent } from "@/hooks/useTracking";
import { toast } from "@/components/ui/sonner";

type ProductCategory = "face" | "body" | "hair";

const demoProducts = {
  face: {
    product_name: "CeraVe Moisturizing Cream",
    brand: "CeraVe",
    category: "Moisturizer",
    product_type_label: "Face Care",
    epiq_score: 85,
    summary: "Excellent choice! This formula is rich in ceramides and hyaluronic acid, perfect for restoring skin barrier function. Free of common irritants.",
    safe_ingredients: [
      "Water", "Glycerin", "Cetearyl Alcohol", "Caprylic/Capric Triglyceride", "Cetyl Alcohol", 
      "Petrolatum", "Dimethicone", "Phenoxyethanol", "Behentrimonium Methosulfate"
    ],
    beneficial_ingredients: [
      { name: "Ceramide NP", benefit: "Strengthens skin barrier and prevents moisture loss" },
      { name: "Ceramide AP", benefit: "Repairs damaged skin barrier" },
      { name: "Hyaluronic Acid", benefit: "Holds 1000x its weight in water for deep hydration" },
      { name: "Niacinamide", benefit: "Reduces redness and strengthens skin barrier" }
    ],
    problematic_ingredients: [],
    concern_ingredients: ["Cholesterol"],
    warnings: [],
  },
  body: {
    product_name: "CeraVe Daily Moisturizing Lotion",
    brand: "CeraVe",
    category: "Body Lotion",
    product_type_label: "Body Care",
    epiq_score: 82,
    summary: "Great body moisturizer with ceramides and MVE technology for 24-hour hydration. Lightweight yet effective for dry skin concerns.",
    safe_ingredients: [
      "Water", "Glycerin", "Caprylic/Capric Triglyceride", "Cetearyl Alcohol", "Cetyl Alcohol",
      "Dimethicone", "Phenoxyethanol", "Polyglyceryl-3 Diisostearate"
    ],
    beneficial_ingredients: [
      { name: "Ceramide NP", benefit: "Restores and maintains skin barrier" },
      { name: "Ceramide AP", benefit: "Helps repair dry, damaged skin" },
      { name: "Hyaluronic Acid", benefit: "Attracts moisture to skin surface" }
    ],
    problematic_ingredients: [],
    concern_ingredients: ["Cholesterol", "Carbomer"],
    warnings: [],
  },
  hair: {
    product_name: "Neutrogena T/Gel Therapeutic Shampoo",
    brand: "Neutrogena",
    category: "Shampoo",
    product_type_label: "Hair Care",
    epiq_score: 72,
    summary: "Effective therapeutic shampoo for dandruff and scalp concerns. Contains coal tar which is clinically proven but may not suit sensitive scalps.",
    safe_ingredients: [
      "Water", "Sodium C14-16 Olefin Sulfonate", "Cocamidopropyl Betaine", "Glycerin",
      "Salicylic Acid", "Sodium Chloride", "Hydroxypropyl Methylcellulose"
    ],
    beneficial_ingredients: [
      { name: "Coal Tar", benefit: "Clinically proven to treat dandruff and psoriasis" },
      { name: "Salicylic Acid", benefit: "Exfoliates scalp and reduces flaking" }
    ],
    problematic_ingredients: [
      { name: "Coal Tar", reason: "May cause scalp sensitivity or dryness in some users. Not recommended for color-treated hair." }
    ],
    concern_ingredients: ["Fragrance", "Sodium Hydroxide"],
    warnings: ["Not recommended for color-treated or bleached hair as coal tar may cause discoloration"],
  }
};

const DemoAnalysis = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ProductCategory>("face");
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value as ProductCategory);
    trackEvent({
      eventName: 'demo_tab_switched',
      eventCategory: 'demo',
      eventProperties: { tab: value }
    });
  };

  const handleSignUpClick = () => {
    trackEvent({
      eventName: 'demo_cta_clicked',
      eventCategory: 'demo',
      eventProperties: { 
        from_tab: activeTab,
        cta_location: 'banner'
      }
    });
    toast.success("Sign up to analyze YOUR products!");
    navigate('/auth');
  };

  if (!hasTrackedView) {
    trackEvent({
      eventName: 'demo_viewed',
      eventCategory: 'demo',
      eventProperties: { initial_tab: activeTab }
    });
    setHasTrackedView(true);
  }

  const currentProduct = demoProducts[activeTab];

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
      <main className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
        {/* Sticky Demo Banner */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-primary via-accent to-primary shadow-lg">
          <div className="container max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                👁️ Demo Analysis
              </Badge>
              <span className="text-sm text-white font-medium hidden sm:inline">
                See how SkinLytix analyzes products
              </span>
            </div>
            <Button 
              variant="cta" 
              size="sm"
              onClick={handleSignUpClick}
              className="w-full sm:w-auto bg-white text-primary hover:bg-white/90"
            >
              Sign Up to Analyze YOUR Products
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="container max-w-4xl mx-auto pt-20">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>

          {/* Category Tabs */}
          <Card className="p-6 mb-8">
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="face" className="text-base">
                  Face
                </TabsTrigger>
                <TabsTrigger value="body" className="text-base">
                  Body
                </TabsTrigger>
                <TabsTrigger value="hair" className="text-base">
                  Hair
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="space-y-6">
                <div>
                  <h1 className="text-4xl font-bold mb-2">{currentProduct.product_name}</h1>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge variant="default" className="text-base">
                      {currentProduct.product_type_label}
                    </Badge>
                    <Badge variant="secondary">{currentProduct.brand}</Badge>
                    <Badge variant="outline">{currentProduct.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This is a sample analysis. Sign up to analyze your own products!
                  </p>
                </div>

                {/* EpiQ Score */}
                <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-accent/5">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <h2 className="text-2xl font-semibold">EpiQ Score</h2>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-sm">
                        <p>Your EpiQ Score (0-100) reflects how safe and effective this product is based on ingredient analysis and scientific research.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className={`text-7xl font-bold mb-4 ${getScoreColor(currentProduct.epiq_score)}`}>
                    {currentProduct.epiq_score}
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2">
                    {getScoreLabel(currentProduct.epiq_score)}
                  </Badge>
                  <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
                    {currentProduct.summary}
                  </p>
                </Card>

                {/* Problematic Ingredients */}
                {currentProduct.problematic_ingredients.length > 0 && (
                  <Card className="p-6 border-destructive/50 bg-destructive/5">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-8 h-8 text-destructive" />
                      <div>
                        <h2 className="text-2xl font-bold text-destructive">Ingredients to Watch</h2>
                        <p className="text-sm text-muted-foreground">May not suit all skin types</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {currentProduct.problematic_ingredients.map((item, index) => (
                        <div key={index} className="p-4 bg-background rounded-lg border border-destructive/30">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-destructive">{item.name}</p>
                              <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Warnings */}
                {currentProduct.warnings.length > 0 && (
                  <Card className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center gap-3 mb-4">
                      <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                      <div>
                        <h2 className="text-2xl font-bold">Important Notes</h2>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {currentProduct.warnings.map((warning, index) => (
                        <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                          <p className="text-sm">{warning}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* Safe Ingredients */}
                <Card className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                    <div>
                      <h2 className="text-2xl font-bold">Safe Ingredients</h2>
                      <p className="text-sm text-muted-foreground">
                        {currentProduct.beneficial_ingredients.length} beneficial ingredients
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {currentProduct.beneficial_ingredients.map((item, index) => (
                      <Tooltip key={`beneficial-${index}`}>
                        <TooltipTrigger asChild>
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700">
                            ✨ {item.name}
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{item.benefit}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {currentProduct.safe_ingredients.map((ingredient, index) => (
                      <Badge key={`safe-${index}`} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {ingredient}
                      </Badge>
                    ))}
                  </div>
                </Card>

                {/* Unverified Ingredients */}
                {currentProduct.concern_ingredients.length > 0 && (
                  <Card className="p-6 border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3 mb-4">
                      <HelpCircle className="w-8 h-8 text-amber-500" />
                      <div>
                        <h2 className="text-2xl font-bold">Unverified Ingredients</h2>
                        <p className="text-sm text-muted-foreground">
                          Not in our database - may still be safe
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {currentProduct.concern_ingredients.map((ingredient, index) => (
                        <Badge key={index} variant="outline" className="border-amber-300 dark:border-amber-700">
                          {ingredient}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                )}

                {/* CTA Card */}
                <Card className="p-8 text-center bg-gradient-to-r from-primary/10 via-accent/10 to-cta/10 border-primary/20">
                  <Sparkles className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-2xl font-bold mb-3">Ready to Analyze YOUR Products?</h3>
                  <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                    Get personalized analysis for face, body, and hair products. Build your routine and save money.
                  </p>
                  <Button 
                    variant="cta" 
                    size="lg"
                    onClick={handleSignUpClick}
                    className="w-full sm:w-auto"
                  >
                    Sign Up Free - Start Analyzing
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Card>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </main>
    </TooltipProvider>
  );
};

export default DemoAnalysis;
