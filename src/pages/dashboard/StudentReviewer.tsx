import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ClipboardList, 
  CheckCircle2, 
  AlertTriangle,
  Award, 
  Home,
  ArrowLeft,
  FlaskConical
} from 'lucide-react';
import { IngredientValidationPanel } from '@/components/reviewer/IngredientValidationPanel';
import { IngredientSourcePanel } from '@/components/reviewer/IngredientSourcePanel';
import { ValidationProgressBar } from '@/components/reviewer/ValidationProgressBar';
import AppShell from '@/components/AppShell';

interface ProductAnalysis {
  id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  epiq_score: number | null;
  ingredients_list: string;
  analyzed_at: string;
}

interface IngredientValidation {
  ingredient_name: string;
  validation_status: string;
  pubchem_data_correct: boolean | null;
  ai_explanation_accurate: boolean | null;
  corrected_role: string | null;
  corrected_safety_level: string | null;
  correction_notes: string | null;
  reference_sources: string[];
}

interface Stats {
  productsToValidate: number;
  ingredientsValidated: number;
  flaggedForCorrection: number;
}

export default function StudentReviewer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [institution, setInstitution] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Products list
  const [products, setProducts] = useState<ProductAnalysis[]>([]);
  const [stats, setStats] = useState<Stats>({ productsToValidate: 0, ingredientsValidated: 0, flaggedForCorrection: 0 });
  
  // Selected product for validation
  const [selectedProduct, setSelectedProduct] = useState<ProductAnalysis | null>(null);
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [ingredientValidations, setIngredientValidations] = useState<Map<string, IngredientValidation>>(new Map());
  const [ingredientCache, setIngredientCache] = useState<Map<string, any>>(new Map());
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  const checkAccessAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      setUserId(user.id);

      // Check for admin/moderator role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasReviewerRole = roles?.some(r => 
        r.role === 'admin' || r.role === 'moderator'
      );

      // Check for student certification
      const { data: certification } = await supabase
        .from('student_certifications')
        .select('institution, certification_level')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!hasReviewerRole && !certification) {
        toast({
          title: "Access Denied",
          description: "You need student reviewer certification to access this dashboard.",
          variant: "destructive",
        });
        navigate('/home');
        return;
      }

      setHasAccess(true);
      setInstitution(certification?.institution || 'SkinLytix');

      await loadProducts(user.id);
    } catch (error) {
      console.error('Error checking access:', error);
      toast({
        title: "Error",
        description: "Could not verify your access.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async (uid: string) => {
    // Get recent analyses
    const { data: analyses } = await supabase
      .from('user_analyses')
      .select('id, product_name, brand, category, epiq_score, ingredients_list, analyzed_at')
      .order('analyzed_at', { ascending: false })
      .limit(50);

    setProducts(analyses || []);

    // Get validation stats for this user
    const { data: validations } = await supabase
      .from('ingredient_validations')
      .select('validation_status')
      .eq('validator_id', uid);

    const validated = validations?.filter(v => v.validation_status === 'validated').length || 0;
    const flagged = validations?.filter(v => v.validation_status === 'needs_correction').length || 0;

    setStats({
      productsToValidate: analyses?.length || 0,
      ingredientsValidated: validated,
      flaggedForCorrection: flagged
    });
  };

  const selectProduct = async (product: ProductAnalysis) => {
    setSelectedProduct(product);
    
    // Parse ingredients
    const ingredients = product.ingredients_list
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0);
    setIngredientsList(ingredients);
    
    // Select first ingredient by default
    if (ingredients.length > 0) {
      setSelectedIngredient(ingredients[0]);
    }

    // Load existing validations
    if (userId) {
      const { data: validations } = await supabase
        .from('ingredient_validations')
        .select('*')
        .eq('analysis_id', product.id)
        .eq('validator_id', userId);

      const validationMap = new Map<string, IngredientValidation>();
      validations?.forEach(v => {
        validationMap.set(v.ingredient_name, {
          ingredient_name: v.ingredient_name,
          validation_status: v.validation_status || 'pending',
          pubchem_data_correct: v.pubchem_data_correct,
          ai_explanation_accurate: v.ai_explanation_accurate,
          corrected_role: v.corrected_role,
          corrected_safety_level: v.corrected_safety_level,
          correction_notes: v.correction_notes,
          reference_sources: (v.reference_sources as string[]) || []
        });
      });
      setIngredientValidations(validationMap);

      // Load ingredient cache
      const { data: cacheData } = await supabase
        .from('ingredient_cache')
        .select('*')
        .in('ingredient_name', ingredients.map(i => i.toLowerCase()));

      const cacheMap = new Map<string, any>();
      cacheData?.forEach(c => {
        cacheMap.set(c.ingredient_name.toLowerCase(), {
          pubchem_cid: c.pubchem_cid,
          molecular_weight: c.molecular_weight,
          properties: c.properties_json
        });
      });
      setIngredientCache(cacheMap);
    }
  };

  const handleValidationComplete = async () => {
    if (!selectedProduct || !userId) return;

    const { data: validations } = await supabase
      .from('ingredient_validations')
      .select('*')
      .eq('analysis_id', selectedProduct.id)
      .eq('validator_id', userId);

    const validationMap = new Map<string, IngredientValidation>();
    validations?.forEach(v => {
      validationMap.set(v.ingredient_name, {
        ingredient_name: v.ingredient_name,
        validation_status: v.validation_status || 'pending',
        pubchem_data_correct: v.pubchem_data_correct,
        ai_explanation_accurate: v.ai_explanation_accurate,
        corrected_role: v.corrected_role,
        corrected_safety_level: v.corrected_safety_level,
        correction_notes: v.correction_notes,
        reference_sources: (v.reference_sources as string[]) || []
      });
    });
    setIngredientValidations(validationMap);

    // Update stats
    await loadProducts(userId);
  };

  const exitProductValidation = () => {
    setSelectedProduct(null);
    setIngredientsList([]);
    setIngredientValidations(new Map());
    setIngredientCache(new Map());
    setSelectedIngredient(null);
  };

  const getValidationProgress = () => {
    let validated = 0;
    let needsCorrection = 0;
    
    ingredientValidations.forEach(v => {
      if (v.validation_status === 'validated') validated++;
      else if (v.validation_status === 'needs_correction') needsCorrection++;
    });

    return { validated, needsCorrection, total: ingredientsList.length };
  };

  const getIngredientStatus = (ingredient: string): 'pending' | 'validated' | 'needs_correction' => {
    const validation = ingredientValidations.get(ingredient);
    if (!validation) return 'pending';
    return validation.validation_status as 'pending' | 'validated' | 'needs_correction';
  };

  if (loading) {
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-4 py-8">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading reviewer dashboard...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!hasAccess) {
    return null;
  }

  // Ingredient validation view
  if (selectedProduct) {
    const progress = getValidationProgress();
    const currentCache = selectedIngredient ? ingredientCache.get(selectedIngredient.toLowerCase()) : null;
    const currentValidation = selectedIngredient ? ingredientValidations.get(selectedIngredient) : null;
    
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-4 py-8">
        <div className="container max-w-6xl mx-auto">
          {/* Header with back button */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={exitProductValidation}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{selectedProduct.product_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                {selectedProduct.brand && (
                  <Badge variant="secondary">{selectedProduct.brand}</Badge>
                )}
                {selectedProduct.category && (
                  <Badge variant="outline">{selectedProduct.category}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <ValidationProgressBar 
            validated={progress.validated}
            needsCorrection={progress.needsCorrection}
            total={progress.total}
          />

          {/* Two-column layout: ingredient list + validation panel */}
          <div className="grid lg:grid-cols-3 gap-6 mt-6">
            {/* Ingredient list */}
            <Card className="lg:col-span-1">
              <CardContent className="p-4">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <FlaskConical className="w-4 h-4" />
                  Ingredients ({ingredientsList.length})
                </h3>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto">
                  {ingredientsList.map((ingredient, idx) => {
                    const status = getIngredientStatus(ingredient);
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedIngredient(ingredient)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center justify-between transition-colors ${
                          selectedIngredient === ingredient 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
                        }`}
                      >
                        <span className="truncate">{ingredient}</span>
                        {status === 'validated' && (
                          <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${selectedIngredient === ingredient ? 'text-primary-foreground' : 'text-green-600'}`} />
                        )}
                        {status === 'needs_correction' && (
                          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${selectedIngredient === ingredient ? 'text-primary-foreground' : 'text-amber-600'}`} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Validation panel for selected ingredient */}
            <div className="lg:col-span-2 space-y-4">
              {selectedIngredient ? (
                <>
                  <IngredientValidationPanel
                    analysisId={selectedProduct.id}
                    ingredientName={selectedIngredient}
                    pubchemCid={currentCache?.pubchem_cid}
                    molecularWeight={currentCache?.molecular_weight}
                    existingValidation={currentValidation || null}
                    institution={institution || 'SkinLytix'}
                    onValidationComplete={handleValidationComplete}
                  />
                  <IngredientSourcePanel
                    ingredientName={selectedIngredient}
                    pubchemData={currentCache ? {
                      cid: currentCache.pubchem_cid,
                      molecularWeight: currentCache.molecular_weight,
                      molecularFormula: currentCache.properties?.molecular_formula,
                      iupacName: currentCache.properties?.iupac_name,
                      synonyms: currentCache.properties?.synonyms
                    } : null}
                  />
                </>
              ) : (
                <Card className="p-8 text-center text-muted-foreground">
                  Select an ingredient from the list to validate
                </Card>
              )}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  // Products list view
  return (
    <AppShell showNavigation showBottomNav contentClassName="px-4 py-8">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ingredient Validation Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              {institution} • Student Reviewer
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/home')}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.productsToValidate}</p>
                  <p className="text-sm text-muted-foreground">Products to Validate</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.ingredientsValidated}</p>
                  <p className="text-sm text-muted-foreground">Ingredients Validated</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.flaggedForCorrection}</p>
                  <p className="text-sm text-muted-foreground">Flagged for Correction</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FlaskConical className="w-5 h-5" />
              Select a Product to Validate
            </h2>
            
            {products.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No products available for validation yet.
              </p>
            ) : (
              <div className="space-y-2">
                {products.map(product => {
                  const ingredientCount = product.ingredients_list.split(',').filter(i => i.trim()).length;
                  return (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{product.product_name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {product.brand && (
                            <span className="text-sm text-muted-foreground">{product.brand}</span>
                          )}
                          {product.epiq_score && (
                            <Badge variant="secondary" className="text-xs">
                              EpiQ: {product.epiq_score}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-4">
                        {ingredientCount} ingredients
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
