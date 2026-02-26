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
import { ReviewerAccuracyCard } from '@/components/reviewer/ReviewerAccuracyCard';
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

type ReviewListMode = 'products' | 'validated' | 'flagged';

interface ValidationListItem {
  id: string;
  ingredient_name: string;
  analysis_id: string | null;
  validation_status: string | null;
  verdict: string | null;
  correction_notes: string | null;
  updated_at: string | null;
  user_analyses?: {
    product_name?: string | null;
    brand?: string | null;
  } | null;
}

const mapValidationStatus = (record: any): 'pending' | 'validated' | 'needs_correction' => {
  if (record?.validation_status) return record.validation_status;
  if (record?.verdict === 'confirm') return 'validated';
  if (record?.verdict === 'correct' || record?.verdict === 'escalate') return 'needs_correction';
  return 'pending';
};

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
  const [viewMode, setViewMode] = useState<ReviewListMode>('products');
  const [validationList, setValidationList] = useState<ValidationListItem[]>([]);
  const [validationListLoading, setValidationListLoading] = useState(false);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (viewMode === 'products') return;
    loadValidationList(userId);
  }, [viewMode, userId]);

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

  const loadValidationList = async (uid: string) => {
    setValidationListLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('ingredient_validations')
        .select('id, ingredient_name, analysis_id, validation_status, verdict, correction_notes, updated_at, user_analyses (product_name, brand)')
        .eq('validator_id', uid)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setValidationList((data || []) as ValidationListItem[]);
    } catch (error) {
      console.error('Error loading validation list:', error);
    } finally {
      setValidationListLoading(false);
    }
  };

  const selectProduct = async (product: ProductAnalysis, initialIngredient?: string) => {
    setSelectedProduct(product);
    
    // Parse ingredients
    const ingredients = product.ingredients_list
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0);
    setIngredientsList(ingredients);
    
    // Select initial ingredient (if provided and found) otherwise first ingredient
    const initial = initialIngredient && ingredients.includes(initialIngredient) ? initialIngredient : ingredients[0];
    if (initial) {
      setSelectedIngredient(initial);
      localStorage.setItem(`selectedIngredient_${product.id}`, initial);
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
          validation_status: mapValidationStatus(v),
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

    // Reload validations from database
    const { data: validations } = await supabase
      .from('ingredient_validations')
      .select('*')
      .eq('analysis_id', selectedProduct.id)
      .eq('validator_id', userId);

    const validationMap = new Map<string, IngredientValidation>();
    validations?.forEach((v: any) => {
      validationMap.set(v.ingredient_name, {
        ingredient_name: v.ingredient_name,
        validation_status: mapValidationStatus(v),
        pubchem_data_correct: v.pubchem_data_correct,
        ai_explanation_accurate: v.ai_explanation_accurate,
        corrected_role: v.corrected_role,
        corrected_safety_level: v.corrected_safety_level,
        correction_notes: v.correction_notes || v.internal_notes,
        reference_sources: (v.reference_sources as string[]) || []
      });
    });
    setIngredientValidations(validationMap);

    // Update stats (this will trigger ReviewerAccuracyCard to refetch via React Query)
    await loadProducts(userId);
    if (viewMode !== 'products') {
      await loadValidationList(userId);
    }
    
    toast({
      title: "Validation saved",
      description: "Your validation has been recorded and stats updated."
    });
  };

  const exitProductValidation = () => {
    setSelectedProduct(null);
    setIngredientsList([]);
    setIngredientValidations(new Map());
    setIngredientCache(new Map());
    setSelectedIngredient(null);
    // Don't clear local storage - user may return to same product
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

  const formatReviewDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  if (loading) {
    return (
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
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
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
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

          {/* Reviewer accuracy card */}
          {userId && (
            <div className="mb-6">
              <ReviewerAccuracyCard userId={userId} />
            </div>
          )}

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
                        onClick={() => {
                          setSelectedIngredient(ingredient);
                          if (selectedProduct) {
                            localStorage.setItem(`selectedIngredient_${selectedProduct.id}`, ingredient);
                          }
                        }}
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
                    key={`${selectedProduct.id}-${selectedIngredient}`}
                    ingredientId={selectedIngredient.toLowerCase()}
                    ingredientName={selectedIngredient}
                    analysisId={selectedProduct.id}
                    pubchemCid={currentCache?.pubchem_cid}
                    molecularWeight={currentCache?.molecular_weight}
                    onValidationComplete={handleValidationComplete}
                  />
                  <IngredientSourcePanel
                    key={`source-${selectedProduct.id}-${selectedIngredient}`}
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
    <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
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
          <Card
            className={`cursor-pointer transition-colors ${viewMode === 'products' ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
            onClick={() => setViewMode('products')}
          >
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
          <Card
            className={`cursor-pointer transition-colors ${viewMode === 'validated' ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
            onClick={() => setViewMode('validated')}
          >
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
          <Card
            className={`cursor-pointer transition-colors ${viewMode === 'flagged' ? 'ring-2 ring-primary' : 'hover:bg-muted/30'}`}
            onClick={() => setViewMode('flagged')}
          >
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

        {/* Products or Validation List */}
        <Card>
          <CardContent className="p-6">
            {viewMode === 'products' ? (
              <>
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
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5" />
                  {viewMode === 'validated' ? 'Validated Ingredients' : 'Flagged for Correction'}
                </h2>

                {validationListLoading ? (
                  <p className="text-muted-foreground text-center py-8">
                    Loading validations...
                  </p>
                ) : (
                  (() => {
                    const filtered = validationList.filter(v => {
                      const status = mapValidationStatus(v);
                      return viewMode === 'validated' ? status === 'validated' : status === 'needs_correction';
                    });

                    if (filtered.length === 0) {
                      return (
                        <p className="text-muted-foreground text-center py-8">
                          No items found yet.
                        </p>
                      );
                    }

                    return (
                      <div className="space-y-2">
                        {filtered.map(v => {
                          const status = mapValidationStatus(v);
                          const product = products.find(p => p.id === v.analysis_id) || null;
                          return (
                            <button
                              key={v.id}
                              onClick={() => {
                                if (product) {
                                  selectProduct(product, v.ingredient_name);
                                }
                              }}
                              className="w-full flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left"
                            >
                              <div className="flex-1">
                                <p className="font-medium">{v.ingredient_name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {v.user_analyses?.product_name && (
                                    <span className="text-sm text-muted-foreground">{v.user_analyses.product_name}</span>
                                  )}
                                  {v.user_analyses?.brand && (
                                    <Badge variant="outline" className="text-xs">
                                      {v.user_analyses.brand}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge variant={status === 'validated' ? 'secondary' : 'destructive'}>
                                  {status === 'validated' ? 'Reviewed' : 'Needs Correction'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatReviewDate(v.updated_at)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
