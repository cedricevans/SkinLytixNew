import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Home
} from 'lucide-react';
import { IngredientValidationPanel } from '@/components/reviewer/IngredientValidationPanel';
import { IngredientSourcePanel } from '@/components/reviewer/IngredientSourcePanel';
import { ValidationProgressBar } from '@/components/reviewer/ValidationProgressBar';
import { fetchIngredientExplanations } from '@/lib/ingredient-explanations';

interface ProductAnalysis {
  id: string;
  product_name: string;
  brand?: string | null;
  category?: string | null;
  epiq_score?: number | null;
  ingredients_list: string;
  analyzed_at?: string | null;
}

interface IngredientValidation {
  ingredient_name: string;
  validation_status: 'pending' | 'validated' | 'needs_correction';
  pubchem_data_correct?: boolean | null;
  ai_explanation_accurate?: boolean | null;
  corrected_role?: string | null;
  corrected_safety_level?: string | null;
  correction_notes?: string | null;
  verdict?: string | null;
  confidence_level?: string | null;
  public_explanation?: string | null;
  internal_notes?: string | null;
  citation_count?: number | null;
  updated_at?: string | null;
  validator_id?: string | null;
  validator_email?: string | null;
  reference_sources?: string[];
}

interface IngredientAiData {
  role?: string | null;
  safetyLevel?: string | null;
  explanation?: string | null;
  claimSummary?: string | null;
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
  confidence_level?: string | null;
  public_explanation?: string | null;
  internal_notes?: string | null;
  citation_count?: number | null;
  review_count?: number | null;
  updated_at: string | null;
  validator_id?: string | null;
  validator_email?: string | null;
  moderator_review_status?: string | null;
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
  const [ingredientAiData, setIngredientAiData] = useState<Map<string, IngredientAiData>>(new Map());
  const [productValidationSummary, setProductValidationSummary] = useState<
    Map<string, { validated: number; needsCorrection: number; inProgress: number; lastUpdated?: string | null; lastReviewer?: string | null }>
  >(new Map());
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const ingredientListRef = useRef<HTMLDivElement | null>(null);
  const validationPanelRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<ReviewListMode>('products');
  const [validationList, setValidationList] = useState<ValidationListItem[]>([]);
  const [validationListLoading, setValidationListLoading] = useState(false);
  const validationListLoadedRef = useRef(false);
  // Polling interval for real-time updates
  useEffect(() => {
    if (!hasAccess || !userId) return;
    const interval = setInterval(() => {
      loadValidationList(userId);
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [hasAccess, userId]);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (viewMode === 'products') return;
    loadValidationList(userId);
  }, [viewMode, userId]);

  useEffect(() => {
    if (!selectedProduct || !selectedIngredient) return;
    if (window.innerWidth >= 1024) return;
    const target = validationPanelRef.current;
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [selectedProduct, selectedIngredient]);

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

    const analysisIds = (analyses || []).map(a => a.id).filter(Boolean);
    if (analysisIds.length > 0) {
      const { data: validations } = await (supabase as any)
        .from('ingredient_validations')
        .select('analysis_id, validator_id, updated_at, created_at, verdict, confidence_level, public_explanation, internal_notes, validation_status, ingredient_validation_citations(count)')
        .in('analysis_id', analysisIds);

      const validatorIds = (validations || []).map((row: any) => row.validator_id).filter(Boolean);
      const emailMap = await fetchReviewerEmails(validatorIds);

      const summaryMap = new Map<string, { validated: number; needsCorrection: number; inProgress: number; lastUpdated?: string | null; lastReviewer?: string | null }>();
      (validations || []).forEach((row: any) => {
        const analysisId = row.analysis_id;
        if (!analysisId) return;
        const existing = summaryMap.get(analysisId) || { validated: 0, needsCorrection: 0, inProgress: 0, lastUpdated: null, lastReviewer: null };
        const status = mapValidationStatus(row);
        if (status === 'validated') existing.validated += 1;
        else if (status === 'needs_correction') existing.needsCorrection += 1;
        else if (isInProgressRow(row)) existing.inProgress += 1;

        const updatedAt = row.updated_at || row.created_at || null;
        if (updatedAt) {
          const currentTime = new Date(updatedAt).getTime();
          const existingTime = existing.lastUpdated ? new Date(existing.lastUpdated).getTime() : 0;
          if (currentTime >= existingTime) {
            existing.lastUpdated = updatedAt;
            existing.lastReviewer = emailMap.get(row.validator_id) || (row.validator_id ? shortId(row.validator_id) : null);
          }
        }

        summaryMap.set(analysisId, existing);
      });

      setProductValidationSummary(summaryMap);
    } else {
      setProductValidationSummary(new Map());
    }
  };

  const loadValidationList = async (uid: string) => {
    const shouldShowLoading = !validationListLoadedRef.current;
    if (shouldShowLoading) {
      setValidationListLoading(true);
    }
    try {
      // Show all validations, not just current user's
      const { data, error } = await (supabase as any)
        .from('ingredient_validations')
        .select('id, ingredient_name, analysis_id, validation_status, verdict, correction_notes, confidence_level, public_explanation, internal_notes, updated_at, validator_id, moderator_review_status, user_analyses:analysis_id (product_name, brand), ingredient_validation_citations(count)')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      const validatorIds = (data || []).map((row: any) => row.validator_id).filter(Boolean);
      const emailMap = await fetchReviewerEmails(validatorIds);
      // Map validator_email for display
      const mapped = (data || []).map((v: any) => ({
        ...v,
        citation_count: Array.isArray(v.ingredient_validation_citations)
          ? Number(v.ingredient_validation_citations[0]?.count ?? 0)
          : 0,
        validator_email: emailMap.get(v.validator_id) || null
      }));
      const deduped = new Map<string, ValidationListItem>();
      mapped.forEach((item: ValidationListItem) => {
        const key = `${item.analysis_id || 'none'}::${(item.ingredient_name || '').toLowerCase()}`;
        if (!key) return;
        const existing = deduped.get(key);
        if (!existing) {
          deduped.set(key, { ...item, review_count: 1 });
          return;
        }
        const existingTime = existing.updated_at ? new Date(existing.updated_at).getTime() : 0;
        const currentTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
        const reviewCount = (existing.review_count || 1) + 1;
        if (currentTime >= existingTime) {
          deduped.set(key, { ...item, review_count: reviewCount });
        } else {
          deduped.set(key, { ...existing, review_count: reviewCount });
        }
      });
      setValidationList(Array.from(deduped.values()));
      validationListLoadedRef.current = true;
    } catch (error) {
      console.error('Error loading validation list:', error);
    } finally {
      if (shouldShowLoading) {
        setValidationListLoading(false);
      }
    }
  };

  const normalizeIngredientName = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

  const buildClaimSummary = (explanation?: string | null, role?: string | null) => {
    if (!explanation && !role) return '';
    if (!explanation) return role ? `AI classifies this ingredient as ${role}.` : '';
    const trimmed = explanation.trim();
    const sentenceMatch = trimmed.match(/[^.!?]+[.!?]/);
    const firstSentence = sentenceMatch ? sentenceMatch[0] : trimmed;
    const maxLength = 180;
    const summary = firstSentence.length > maxLength ? `${firstSentence.slice(0, maxLength - 1)}…` : firstSentence;
    return role ? `${role}: ${summary}` : summary;
  };

  const getPipelineStage = (item: ValidationListItem) => {
    if (item.verdict) return 'Verdict set';
    if (item.confidence_level) return 'Confidence selected';
    if (item.public_explanation) return 'Writing drafted';
    if ((item.citation_count || 0) > 0) return 'Evidence added';
    return 'Observation';
  };

  const getVerdictLabel = (verdict?: string | null) => {
    if (!verdict) return '';
    if (verdict === 'confirm') return 'Confirmed';
    if (verdict === 'correct') return 'Correction Requested';
    if (verdict === 'escalate') return 'Escalated';
    return verdict;
  };

  const getModeratorLabel = (status?: string | null) => {
    if (!status) return '';
    if (status === 'pending') return 'Moderator Pending';
    if (status === 'approved') return 'Moderator Approved';
    if (status === 'rejected') return 'Moderator Rejected';
    if (status === 'needs_revision') return 'Needs Revision';
    return status;
  };

  const isInProgressRow = (row: any) => {
    if (!row) return false;
    const status = mapValidationStatus(row);
    if (status !== 'pending') return false;
    const citationCount = Array.isArray(row.ingredient_validation_citations)
      ? Number(row.ingredient_validation_citations[0]?.count ?? 0)
      : 0;
    return Boolean(row.confidence_level || row.public_explanation || row.internal_notes || citationCount > 0);
  };

  const shortId = (value?: string | null) => {
    if (!value) return '';
    return `${value.slice(0, 6)}…${value.slice(-4)}`;
  };

  const fetchReviewerEmails = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return new Map<string, string>();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, display_name')
      .in('id', uniqueIds);
    if (error) {
      console.warn('profiles lookup failed:', error);
      return new Map<string, string>();
    }
    const map = new Map<string, string>();
    data?.forEach((row: any) => {
      map.set(row.id, row.email || row.display_name || row.id);
    });
    return map;
  };

  const buildValidationMap = (rows?: any[]) => {
    const validationMap = new Map<string, IngredientValidation>();
    rows?.forEach((row: any) => {
      const key = normalizeIngredientName(row.ingredient_name || '');
      if (!key) return;
      const updatedAt = row.updated_at || row.created_at || null;
      const currentTime = updatedAt ? new Date(updatedAt).getTime() : 0;
      const existing = validationMap.get(key);
      const existingTime = existing?.updated_at ? new Date(existing.updated_at).getTime() : 0;
      if (existing && currentTime <= existingTime) return;

      validationMap.set(key, {
        ingredient_name: row.ingredient_name,
        validation_status: mapValidationStatus(row),
        pubchem_data_correct: row.pubchem_data_correct,
        ai_explanation_accurate: row.ai_explanation_accurate,
        corrected_role: row.corrected_role,
        corrected_safety_level: row.corrected_safety_level,
        correction_notes: row.correction_notes,
        verdict: row.verdict,
        confidence_level: row.confidence_level,
        public_explanation: row.public_explanation,
        internal_notes: row.internal_notes,
        citation_count: Array.isArray(row.ingredient_validation_citations)
          ? Number(row.ingredient_validation_citations[0]?.count ?? 0)
          : 0,
        updated_at: updatedAt,
        validator_id: row.validator_id || null,
        validator_email: row.validator_email || null,
        reference_sources: (row.reference_sources as string[]) || []
      });
    });
    return validationMap;
  };

  const getIngredientStage = (validation?: IngredientValidation) => {
    if (!validation) return 'Not started';
    if (validation.verdict) return 'Verdict set';
    if (validation.confidence_level) return 'Confidence selected';
    if (validation.public_explanation) return 'Writing drafted';
    if ((validation.citation_count || 0) > 0) return 'Evidence added';
    return 'Observation';
  };

  const getIngredientStatusLabel = (validation?: IngredientValidation) => {
    if (!validation) return 'Not Started';
    const status = mapValidationStatus(validation);
    if (status === 'validated') return 'Verified';
    if (status === 'needs_correction') return 'Needs Correction';
    return 'In Progress';
  };

  const selectProduct = async (product: ProductAnalysis, initialIngredient?: string) => {
    setSelectedProduct(product);
    
    // Parse ingredients
    const ingredients = product.ingredients_list
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0);
    setIngredientsList(ingredients);
    const normalizedIngredients = ingredients.map(normalizeIngredientName);
    const normalizedToOriginal = new Map<string, string>();
    ingredients.forEach((ingredient, index) => {
      normalizedToOriginal.set(normalizedIngredients[index], ingredient);
    });
    
    // Select initial ingredient (if provided and found) otherwise first ingredient
    const initial = initialIngredient && ingredients.includes(initialIngredient) ? initialIngredient : ingredients[0];
    if (initial) {
      setSelectedIngredient(initial);
      localStorage.setItem(`selectedIngredient_${product.id}`, initial);
    }

    // Load all existing validations for this product
    const { data: validations } = await (supabase as any)
      .from('ingredient_validations')
      .select('id, ingredient_name, validation_status, verdict, confidence_level, public_explanation, internal_notes, correction_notes, updated_at, created_at, validator_id, ingredient_validation_citations(count), pubchem_data_correct, ai_explanation_accurate, corrected_role, corrected_safety_level, reference_sources')
      .eq('analysis_id', product.id);

    const validatorIds = (validations || []).map((row: any) => row.validator_id).filter(Boolean);
    const emailMap = await fetchReviewerEmails(validatorIds);
    const rowsWithEmail = (validations || []).map((row: any) => ({
      ...row,
      validator_email: emailMap.get(row.validator_id) || null
    }));
    setIngredientValidations(buildValidationMap(rowsWithEmail));

    // Load ingredient cache
    const { data: cacheData } = await supabase
      .from('ingredient_cache')
      .select('*')
      .in('ingredient_name', ingredients.map(normalizeIngredientName));

    const cacheMap = new Map<string, any>();
    cacheData?.forEach(c => {
      cacheMap.set(normalizeIngredientName(c.ingredient_name), {
        pubchem_cid: c.pubchem_cid,
        molecular_weight: c.molecular_weight,
        properties: c.properties_json
      });
    });
    setIngredientCache(cacheMap);

    // Load AI explanations for ingredients via edge function (DB tables not present)
    const aiMap = new Map<string, IngredientAiData>();
    try {
      if (normalizedIngredients.length > 0) {
        const explanationResults = await fetchIngredientExplanations(
          normalizedIngredients.map(normalizedName => ({
            name: normalizedToOriginal.get(normalizedName) || normalizedName
          }))
        );
        explanationResults.forEach(result => {
          const normalizedName = normalizeIngredientName(result.name || '');
          if (!normalizedName) return;
          const role = result.role ?? null;
          const explanation = result.explanation ?? null;
          const claimSummary = buildClaimSummary(explanation, role);
          aiMap.set(normalizedName, {
            role,
            explanation,
            safetyLevel: null,
            claimSummary
          });
        });
      }
    } catch (error) {
      console.warn('AI explain-ingredients failed:', error);
    }
    setIngredientAiData(aiMap);
  };

  const handleValidationComplete = async () => {
    if (!selectedProduct || !userId) return;

    // Reload validations from database
    const { data: validations } = await (supabase as any)
      .from('ingredient_validations')
      .select('id, ingredient_name, validation_status, verdict, confidence_level, public_explanation, internal_notes, correction_notes, updated_at, created_at, validator_id, ingredient_validation_citations(count), pubchem_data_correct, ai_explanation_accurate, corrected_role, corrected_safety_level, reference_sources')
      .eq('analysis_id', selectedProduct.id);

    const validatorIds = (validations || []).map((row: any) => row.validator_id).filter(Boolean);
    const emailMap = await fetchReviewerEmails(validatorIds);
    const rowsWithEmail = (validations || []).map((row: any) => ({
      ...row,
      validator_email: emailMap.get(row.validator_id) || null
    }));
    setIngredientValidations(buildValidationMap(rowsWithEmail));

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
    setIngredientAiData(new Map());
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
    const validation = ingredientValidations.get(normalizeIngredientName(ingredient));
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

  if (selectedProduct) {
    const progress = getValidationProgress();
    const normalizedSelectedIngredient = selectedIngredient
      ? normalizeIngredientName(selectedIngredient)
      : '';
    const currentCache = selectedIngredient
      ? ingredientCache.get(normalizedSelectedIngredient)
      : null;
    const currentAi = selectedIngredient
      ? ingredientAiData.get(normalizedSelectedIngredient)
      : null;

    return (
      <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
        <div className="container max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">
                {selectedProduct.product_name || 'Selected Product'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {selectedProduct.brand ? `${selectedProduct.brand} • ` : ''}Ingredient Validation
              </p>
            </div>
            <Button variant="ghost" onClick={exitProductValidation}>
              Back to Products
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <ValidationProgressBar
                    total={progress.total}
                    validated={progress.validated}
                    needsCorrection={progress.needsCorrection}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4" ref={ingredientListRef}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-medium">Ingredients</h2>
                    <span className="text-xs text-muted-foreground">
                      {ingredientsList.length} total
                    </span>
                  </div>
                  <div className="space-y-2">
                    {ingredientsList.map(ingredient => {
                      const validation = ingredientValidations.get(normalizeIngredientName(ingredient));
                      const status = getIngredientStatus(ingredient);
                      const isSelected = selectedIngredient === ingredient;
                      const statusLabel = getIngredientStatusLabel(validation);
                      const stageLabel = getIngredientStage(validation);
                      const updatedLabel = validation?.updated_at ? formatReviewDate(validation.updated_at) : '';
                      const reviewerLabel = validation?.validator_email || (validation?.validator_id ? shortId(validation.validator_id) : '');
                      return (
                        <button
                          key={ingredient}
                          onClick={() => setSelectedIngredient(ingredient)}
                          className={`w-full flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-sm font-medium break-words">{ingredient}</span>
                              <Badge
                                variant={
                                  status === 'validated'
                                    ? 'secondary'
                                    : status === 'needs_correction'
                                      ? 'destructive'
                                      : 'outline'
                                }
                                className="text-[10px] shrink-0"
                              >
                                {statusLabel}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="break-words">Stage: {stageLabel}</span>
                              {reviewerLabel && <span className="break-words">Last updated by {reviewerLabel}</span>}
                              {updatedLabel && <span className="break-words">{updatedLabel}</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2 space-y-4" ref={validationPanelRef}>
              {selectedIngredient ? (
                <>
                  <IngredientValidationPanel
                    key={`${selectedProduct.id}-${selectedIngredient}`}
                    ingredientId={selectedIngredient.toLowerCase()}
                    ingredientName={selectedIngredient}
                    analysisId={selectedProduct.id}
                    pubchemCid={currentCache?.pubchem_cid}
                    molecularWeight={currentCache?.molecular_weight}
                    aiRole={currentAi?.role || undefined}
                    aiSafetyLevel={currentAi?.safetyLevel || undefined}
                    aiExplanation={currentAi?.explanation || undefined}
                    aiClaimSummary={currentAi?.claimSummary || undefined}
                    onBackToList={() => {
                      const target = ingredientListRef.current;
                      if (target) {
                        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      } else {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }
                    }}
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
                    aiData={currentAi ? {
                      role: currentAi.role || undefined,
                      explanation: currentAi.explanation || undefined,
                      safetyLevel: currentAi.safetyLevel || undefined
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
                      const summary = productValidationSummary.get(product.id);
                      const summaryDate = summary?.lastUpdated ? formatReviewDate(summary.lastUpdated) : '';
                      return (
                        <button
                          key={product.id}
                          onClick={() => selectProduct(product)}
                          className="w-full flex flex-col gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium break-words">{product.product_name}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {product.brand && (
                                <span className="text-sm text-muted-foreground break-words">{product.brand}</span>
                              )}
                              {product.epiq_score && (
                                <Badge variant="secondary" className="text-xs">
                                  EpiQ: {product.epiq_score}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                              {summary ? (
                                <>
                                  <Badge variant="outline" className="text-[10px]">
                                    Verified: {summary.validated}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px]">
                                    Needs Correction: {summary.needsCorrection}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px]">
                                    In Progress: {summary.inProgress}
                                  </Badge>
                                  {summary.lastReviewer && (
                                    <span>Last updated by {summary.lastReviewer}</span>
                                  )}
                                  {summaryDate && <span>{summaryDate}</span>}
                                </>
                              ) : (
                                <Badge variant="outline" className="text-[10px]">
                                  No reviews yet
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
                          const pipelineStage = getPipelineStage(v);
                          const verdictLabel = getVerdictLabel(v.verdict);
                          const moderatorLabel = getModeratorLabel(v.moderator_review_status);
                          return (
                            <button
                              key={v.id}
                              onClick={() => {
                                if (product) {
                                  selectProduct(product, v.ingredient_name);
                                }
                              }}
                              className="w-full flex flex-col gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium break-words">{v.ingredient_name}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  {v.user_analyses?.product_name && (
                                    <span className="text-sm text-muted-foreground break-words">
                                      {v.user_analyses.product_name}
                                    </span>
                                  )}
                                  {v.user_analyses?.brand && (
                                    <Badge variant="outline" className="text-xs">
                                      {v.user_analyses.brand}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  {pipelineStage && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Stage: {pipelineStage}
                                    </Badge>
                                  )}
                                  {v.review_count && v.review_count > 1 && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Reviews: {v.review_count}
                                    </Badge>
                                  )}
                                  {verdictLabel && (
                                    <Badge variant="secondary" className="text-[10px]">
                                      {verdictLabel}
                                    </Badge>
                                  )}
                                  {v.confidence_level && (
                                    <Badge variant="outline" className="text-[10px]">
                                      Confidence: {v.confidence_level}
                                    </Badge>
                                  )}
                                  {moderatorLabel && (
                                    <Badge variant="outline" className="text-[10px]">
                                      {moderatorLabel}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                                <Badge variant={status === 'validated' ? 'secondary' : 'destructive'}>
                                  {status === 'validated' ? 'Reviewed' : 'Needs Correction'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatReviewDate(v.updated_at)}
                                </span>
                                {/* Status indicator for who last updated */}
                                <span className="text-xs text-blue-600">
                                  {v.validator_email ? `Updated by ${v.validator_email}` : ''}
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
