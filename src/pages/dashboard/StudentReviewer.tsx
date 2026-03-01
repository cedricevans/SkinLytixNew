import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import AppShell from '@/components/AppShell';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ClipboardList,
  FlaskConical,
  Home,
  Pencil,
  Trash2,
  GitMerge
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
  recommendations_json?: any;
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
  validator_role?: string | null;
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
  totalValidated: number;
}

type ReviewListMode = 'products' | 'validated' | 'flagged';
type IngredientListFilter = 'all' | 'needs_review';
type IngredientCategoryLabel = 'safe' | 'concern' | 'needs_more_data';

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
  validator_role?: string | null;
  validator_email?: string | null;
  moderator_review_status?: string | null;
  user_analyses?: {
    product_name?: string | null;
    brand?: string | null;
  } | null;
}

interface IngredientEditDraft {
  name: string;
  role: string;
  explanation: string;
  safetyProfile: string;
  riskScore: string;
  molecularWeight: string;
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
  const [isAdminReviewer, setIsAdminReviewer] = useState(false);
  const [institution, setInstitution] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Products list
  const [products, setProducts] = useState<ProductAnalysis[]>([]);
  const [stats, setStats] = useState<Stats>({ productsToValidate: 0, ingredientsValidated: 0, flaggedForCorrection: 0, totalValidated: 0 });
  
  // Selected product for validation
  const [selectedProduct, setSelectedProduct] = useState<ProductAnalysis | null>(null);
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [ingredientValidations, setIngredientValidations] = useState<Map<string, IngredientValidation>>(new Map());
  const [ingredientInitialLabels, setIngredientInitialLabels] = useState<Map<string, IngredientCategoryLabel>>(new Map());
  const [ingredientCache, setIngredientCache] = useState<Map<string, any>>(new Map());
  const [ingredientAiData, setIngredientAiData] = useState<Map<string, IngredientAiData>>(new Map());
  const [productValidationSummary, setProductValidationSummary] = useState<
    Map<string, { validated: number; needsCorrection: number; inProgress: number; lastUpdated?: string | null; lastReviewer?: string | null }>
  >(new Map());
  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null);
  const [ingredientListFilter, setIngredientListFilter] = useState<IngredientListFilter>('needs_review');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [ingredientEditDraft, setIngredientEditDraft] = useState<IngredientEditDraft>({
    name: '',
    role: '',
    explanation: '',
    safetyProfile: '',
    riskScore: '',
    molecularWeight: ''
  });
  const [mergeTargetIngredient, setMergeTargetIngredient] = useState('');
  const [updatingIngredients, setUpdatingIngredients] = useState(false);
  const ingredientListRef = useRef<HTMLDivElement | null>(null);
  const validationPanelRef = useRef<HTMLDivElement | null>(null);
  const [viewMode, setViewMode] = useState<ReviewListMode>('products');
  const [validationList, setValidationList] = useState<ValidationListItem[]>([]);
  const [validationListLoading, setValidationListLoading] = useState(false);
  const validationListLoadedRef = useRef(false);
  const scrollToValidationPanel = (behavior: ScrollBehavior = 'smooth') => {
    if (window.innerWidth >= 1024) return;

    const scroll = () => {
      const target = validationPanelRef.current;
      if (!target) return;

      // Offset to keep the Step panel visible below the app header on mobile.
      const mobileHeaderOffset = 84;
      const top = window.scrollY + target.getBoundingClientRect().top - mobileHeaderOffset;
      window.scrollTo({ top: Math.max(top, 0), behavior });
    };

    requestAnimationFrame(scroll);
  };

  const selectIngredientForReview = (ingredient: string) => {
    setSelectedIngredient(ingredient);
    scrollToValidationPanel('smooth');
  };

  // Polling interval for real-time updates
  useEffect(() => {
    if (!hasAccess || !userId) return;
    const interval = setInterval(() => {
      loadValidationList(isAdminReviewer);
    }, 15000); // Poll every 15 seconds
    return () => clearInterval(interval);
  }, [hasAccess, userId, isAdminReviewer]);

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (!userId) return;
    if (viewMode === 'products') return;
    loadValidationList(isAdminReviewer);
  }, [viewMode, userId, isAdminReviewer]);

  useEffect(() => {
    if (!selectedProduct || !selectedIngredient) return;
    scrollToValidationPanel('smooth');
  }, [selectedProduct, selectedIngredient]);

  useEffect(() => {
    if (!selectedIngredient) return;
    setIngredientEditDraft(getIngredientEditDefaults(selectedIngredient));
    setMergeTargetIngredient('');
  }, [selectedIngredient, selectedProduct]);

  useEffect(() => {
    if (!selectedProduct) return;
    const visibleIngredients = getVisibleIngredients();
    if (visibleIngredients.length === 0) {
      setSelectedIngredient(null);
      return;
    }
    if (!selectedIngredient || !visibleIngredients.includes(selectedIngredient)) {
      setSelectedIngredient(visibleIngredients[0]);
    }
  }, [selectedProduct, selectedIngredient, ingredientListFilter, ingredientsList, ingredientValidations]);

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
      const isAdmin = roles?.some((r) => r.role === 'admin') ?? false;
      setIsAdminReviewer(isAdmin);

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

      await loadProducts(user.id, isAdmin);
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

  const loadProducts = async (uid: string, viewerIsAdmin = isAdminReviewer) => {
    // Get recent analyses
    const { data: analyses } = await supabase
      .from('user_analyses')
      .select('id, product_name, brand, category, epiq_score, ingredients_list, recommendations_json, analyzed_at')
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

    // Total validated across all reviewers (for context in the UI)
    const { count: totalValidatedCount } = await supabase
      .from('ingredient_validations')
      .select('id', { count: 'exact', head: true })
      .eq('validation_status', 'validated');

    setStats({
      productsToValidate: analyses?.length || 0,
      ingredientsValidated: validated,
      flaggedForCorrection: flagged,
      totalValidated: totalValidatedCount ?? 0
    });

    const analysisIds = (analyses || []).map(a => a.id).filter(Boolean);
    if (analysisIds.length > 0) {
      const { data: validations } = await (supabase as any)
        .from('ingredient_validations')
        .select('analysis_id, validator_id, updated_at, created_at, verdict, confidence_level, public_explanation, internal_notes, validation_status, ingredient_validation_citations(count)')
        .in('analysis_id', analysisIds);

      const validatorIds = (validations || []).map((row: any) => row.validator_id).filter(Boolean);
      const [roleLabelMap, emailMap] = await Promise.all([
        fetchReviewerRoleLabels(validatorIds),
        viewerIsAdmin ? fetchReviewerEmails(validatorIds) : Promise.resolve(new Map<string, string>())
      ]);

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
            existing.lastReviewer = getReviewerDisplayName(row.validator_id, roleLabelMap, emailMap, viewerIsAdmin);
          }
        }

        summaryMap.set(analysisId, existing);
      });

      setProductValidationSummary(summaryMap);
    } else {
      setProductValidationSummary(new Map());
    }
  };

  const loadValidationList = async (viewerIsAdmin = isAdminReviewer) => {
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
      const [roleLabelMap, emailMap] = await Promise.all([
        fetchReviewerRoleLabels(validatorIds),
        viewerIsAdmin ? fetchReviewerEmails(validatorIds) : Promise.resolve(new Map<string, string>())
      ]);
      // Map validator role for display
      const mapped = (data || []).map((v: any) => ({
        ...v,
        citation_count: Array.isArray(v.ingredient_validation_citations)
          ? Number(v.ingredient_validation_citations[0]?.count ?? 0)
          : 0,
        validator_role: roleLabelMap.get(v.validator_id) || 'Reviewer',
        validator_email: viewerIsAdmin ? (emailMap.get(v.validator_id) || null) : null
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

  const getRecommendationItemName = (item: any): string => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && typeof item.name === 'string') return item.name;
    return '';
  };

  const buildIngredientInitialLabels = (recommendations: any): Map<string, IngredientCategoryLabel> => {
    const labels = new Map<string, IngredientCategoryLabel>();
    const safeItems = Array.isArray(recommendations?.safe_ingredients) ? recommendations.safe_ingredients : [];
    const concernItems = Array.isArray(recommendations?.problematic_ingredients) ? recommendations.problematic_ingredients : [];
    const needsDataItems = Array.isArray(recommendations?.concern_ingredients) ? recommendations.concern_ingredients : [];

    safeItems.forEach((item: any) => {
      const name = getRecommendationItemName(item);
      const key = normalizeIngredientName(name);
      if (!key) return;
      labels.set(key, 'safe');
    });

    concernItems.forEach((item: any) => {
      const name = getRecommendationItemName(item);
      const key = normalizeIngredientName(name);
      if (!key) return;
      labels.set(key, 'concern');
    });

    needsDataItems.forEach((item: any) => {
      const name = getRecommendationItemName(item);
      const key = normalizeIngredientName(name);
      if (!key) return;
      labels.set(key, 'needs_more_data');
    });

    return labels;
  };

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

  const fetchReviewerRoleLabels = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return new Map<string, string>();

    const [roleResult, certResult] = await Promise.all([
      supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', uniqueIds),
      supabase
        .from('student_certifications')
        .select('user_id, certification_level')
        .in('user_id', uniqueIds)
    ]);

    if (roleResult.error || certResult.error) {
      console.warn('reviewer role lookup failed:', roleResult.error || certResult.error);
      return new Map<string, string>();
    }

    const rolesByUser = new Map<string, Set<string>>();
    roleResult.data?.forEach((row: any) => {
      const existing = rolesByUser.get(row.user_id) || new Set<string>();
      existing.add(String(row.role));
      rolesByUser.set(row.user_id, existing);
    });

    const certByUser = new Map<string, string>();
    certResult.data?.forEach((row: any) => {
      certByUser.set(row.user_id, String(row.certification_level || 'associate'));
    });

    const map = new Map<string, string>();
    uniqueIds.forEach((id) => {
      const roleSet = rolesByUser.get(id) || new Set<string>();
      if (roleSet.has('admin')) {
        map.set(id, 'Admin Reviewer');
        return;
      }
      if (roleSet.has('moderator')) {
        map.set(id, 'Moderator Reviewer');
        return;
      }

      const certLevel = certByUser.get(id);
      if (certLevel === 'expert') {
        map.set(id, 'Expert Reviewer');
        return;
      }
      if (certLevel === 'specialist') {
        map.set(id, 'Specialist Reviewer');
        return;
      }
      if (certLevel === 'associate') {
        map.set(id, 'Associate Reviewer');
        return;
      }
      map.set(id, 'Reviewer');
    });
    return map;
  };

  const fetchReviewerEmails = async (ids: string[]) => {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    if (uniqueIds.length === 0) return new Map<string, string>();

    const { data, error } = await (supabase as any).rpc('get_reviewer_emails', {
      p_user_ids: uniqueIds
    });

    if (error) {
      console.warn('reviewer email lookup failed:', error);
      return new Map<string, string>();
    }

    const map = new Map<string, string>();
    (data || []).forEach((row: any) => {
      const id = typeof row?.id === 'string' ? row.id : null;
      const email = typeof row?.email === 'string' ? row.email : null;
      if (!id || !email) return;
      map.set(id, email);
    });

    return map;
  };

  const getReviewerDisplayName = (
    validatorId: string | null | undefined,
    roleLabelMap: Map<string, string>,
    emailMap: Map<string, string>,
    showEmail: boolean
  ) => {
    if (!validatorId) return 'Reviewer';
    if (showEmail) {
      const email = emailMap.get(validatorId);
      if (email) return email;
    }
    return roleLabelMap.get(validatorId) || 'Reviewer';
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
        validator_role: row.validator_role || null,
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

  const normalizeSafetyLabel = (value?: string | null) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (['safe', 'low_risk', 'low risk'].includes(normalized)) return 'safe';
    if (['concern', 'unsafe', 'caution', 'avoid', 'high_risk', 'high risk'].includes(normalized)) return 'concern';
    if (['needs_more_data', 'needs more data', 'needs_data', 'unknown', 'unverified', 'pending'].includes(normalized)) {
      return 'needs_more_data';
    }
    return '';
  };

  const getIngredientStatusLabel = (ingredientName?: string, validation?: IngredientValidation) => {
    const correctedSafety = normalizeSafetyLabel(validation?.corrected_safety_level);
    if (correctedSafety === 'safe') return 'Safe';
    if (correctedSafety === 'concern') return 'Concern';
    if (correctedSafety === 'needs_more_data') return 'Needs More Data';

    if (validation) {
      const status = mapValidationStatus(validation);
      if (status === 'validated') return 'Safe';
      if (status === 'needs_correction') return 'Concern';
    }

    const key = normalizeIngredientName(ingredientName || validation?.ingredient_name || '');
    const initialLabel = key ? ingredientInitialLabels.get(key) : undefined;
    if (initialLabel === 'safe') return 'Safe';
    if (initialLabel === 'concern') return 'Concern';
    if (initialLabel === 'needs_more_data') return 'Needs More Data';

    return 'Needs More Data';
  };

  const getStatusBadgeClass = (statusLabel: string, hasValidation: boolean) => {
    if (statusLabel === 'Safe') {
      return hasValidation
        ? 'bg-green-500/10 text-green-700 border-green-500/30'
        : 'bg-green-500/15 text-green-800 border-green-500/35';
    }
    if (statusLabel === 'Concern') {
      return hasValidation
        ? 'bg-red-500/10 text-red-700 border-red-500/30'
        : 'bg-red-500/15 text-red-800 border-red-500/35';
    }
    return hasValidation
      ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
      : 'bg-amber-500/15 text-amber-800 border-amber-500/35';
  };

  const selectProduct = async (product: ProductAnalysis, initialIngredient?: string, viewerIsAdmin = isAdminReviewer) => {
    setSelectedProduct(product);
    setIngredientInitialLabels(buildIngredientInitialLabels(product.recommendations_json || {}));
    
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
    const [roleLabelMap, emailMap] = await Promise.all([
      fetchReviewerRoleLabels(validatorIds),
      viewerIsAdmin ? fetchReviewerEmails(validatorIds) : Promise.resolve(new Map<string, string>())
    ]);
    const rowsWithRole = (validations || []).map((row: any) => ({
      ...row,
      validator_role: roleLabelMap.get(row.validator_id) || 'Reviewer',
      validator_email: viewerIsAdmin ? (emailMap.get(row.validator_id) || null) : null
    }));
    setIngredientValidations(buildValidationMap(rowsWithRole));

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

    const { data: refreshedAnalysis } = await (supabase as any)
      .from('user_analyses')
      .select('id, product_name, brand, category, epiq_score, ingredients_list, recommendations_json, analyzed_at')
      .eq('id', selectedProduct.id)
      .maybeSingle();

    if (refreshedAnalysis) {
      setSelectedProduct(refreshedAnalysis as ProductAnalysis);
      setIngredientInitialLabels(buildIngredientInitialLabels((refreshedAnalysis as ProductAnalysis).recommendations_json || {}));
    }

    // Reload validations from database
    const { data: validations } = await (supabase as any)
      .from('ingredient_validations')
      .select('id, ingredient_name, validation_status, verdict, confidence_level, public_explanation, internal_notes, correction_notes, updated_at, created_at, validator_id, ingredient_validation_citations(count), pubchem_data_correct, ai_explanation_accurate, corrected_role, corrected_safety_level, reference_sources')
      .eq('analysis_id', selectedProduct.id);

    const validatorIds = (validations || []).map((row: any) => row.validator_id).filter(Boolean);
    const [roleLabelMap, emailMap] = await Promise.all([
      fetchReviewerRoleLabels(validatorIds),
      isAdminReviewer ? fetchReviewerEmails(validatorIds) : Promise.resolve(new Map<string, string>())
    ]);
    const rowsWithRole = (validations || []).map((row: any) => ({
      ...row,
      validator_role: roleLabelMap.get(row.validator_id) || 'Reviewer',
      validator_email: isAdminReviewer ? (emailMap.get(row.validator_id) || null) : null
    }));
    setIngredientValidations(buildValidationMap(rowsWithRole));

    // Update stats (this will trigger ReviewerAccuracyCard to refetch via React Query)
    await loadProducts(userId, isAdminReviewer);
    if (viewMode !== 'products') {
      await loadValidationList(isAdminReviewer);
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
    setIngredientInitialLabels(new Map());
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

  const getVisibleIngredients = () => {
    if (ingredientListFilter === 'all') return ingredientsList;
    return ingredientsList.filter((ingredient) => {
      const validation = ingredientValidations.get(normalizeIngredientName(ingredient));
      return getIngredientStatusLabel(ingredient, validation) === 'Needs More Data';
    });
  };

  const formatReviewDate = (dateString?: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const canModifyIngredientEntry = (ingredientName?: string | null) => {
    if (!ingredientName) return true;
    const existing = ingredientValidations.get(normalizeIngredientName(ingredientName));
    if (!existing || existing.validation_status !== 'validated') return true;
    if (isAdminReviewer) return true;
    return Boolean(userId && existing.validator_id === userId);
  };

  const namesMatch = (left: string, right: string) =>
    normalizeIngredientName(left) === normalizeIngredientName(right);

  const dedupeByIngredientName = (items: any[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      const rawName = typeof item === 'string' ? item : item?.name;
      if (!rawName) return true;
      const key = normalizeIngredientName(String(rawName));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const updateRecommendationIngredientArrays = (
    source: any,
    fromName: string,
    toName?: string,
    mode: 'rename' | 'merge' | 'delete' = 'rename'
  ) => {
    if (!source || typeof source !== 'object') return source;
    const next = { ...source };
    const keys = ['safe_ingredients', 'problematic_ingredients', 'beneficial_ingredients', 'concern_ingredients', 'ingredient_data'];

    keys.forEach((key) => {
      const current = (next as any)[key];
      if (!Array.isArray(current)) return;
      const mapped = current
        .map((entry: any) => {
          const entryName = typeof entry === 'string' ? entry : entry?.name;
          if (!entryName || !namesMatch(String(entryName), fromName)) return entry;

          if (mode === 'delete') return null;

          if (typeof entry === 'string') {
            return toName || entry;
          }

          return {
            ...entry,
            name: toName || entry.name
          };
        })
        .filter(Boolean);
      (next as any)[key] = dedupeByIngredientName(mapped);
    });

    return next;
  };

  const getIngredientEditDefaults = (ingredientName: string): IngredientEditDraft => {
    const recommendations = selectedProduct?.recommendations_json || {};
    const keys = ['safe_ingredients', 'problematic_ingredients', 'beneficial_ingredients', 'concern_ingredients', 'ingredient_data'];

    for (const key of keys) {
      const current = recommendations?.[key];
      if (!Array.isArray(current)) continue;
      const match = current.find((entry: any) => {
        const entryName = typeof entry === 'string' ? entry : entry?.name;
        return entryName && namesMatch(String(entryName), ingredientName);
      });
      if (match && typeof match === 'object') {
        return {
          name: String(match.name || ingredientName),
          role: String(match.role || ''),
          explanation: String(match.explanation || ''),
          safetyProfile: String(match.safety_profile || ''),
          riskScore:
            match.risk_score === null || match.risk_score === undefined ? '' : String(match.risk_score),
          molecularWeight:
            match.molecular_weight === null || match.molecular_weight === undefined
              ? ''
              : String(match.molecular_weight)
        };
      }
    }

    return {
      name: ingredientName,
      role: '',
      explanation: '',
      safetyProfile: '',
      riskScore: '',
      molecularWeight: ''
    };
  };

  const applyIngredientDraftToEntry = (entry: any, draft: IngredientEditDraft) => {
    const next = typeof entry === 'string' ? { name: draft.name } : { ...entry, name: draft.name };

    const role = draft.role.trim();
    const explanation = draft.explanation.trim();
    const safetyProfile = draft.safetyProfile.trim();
    const riskScore = draft.riskScore.trim();
    const molecularWeight = draft.molecularWeight.trim();

    if (role) next.role = role;
    else delete next.role;

    if (explanation) next.explanation = explanation;
    else delete next.explanation;

    if (safetyProfile) next.safety_profile = safetyProfile;
    else delete next.safety_profile;

    if (riskScore) {
      const riskValue = Number(riskScore);
      if (Number.isFinite(riskValue)) next.risk_score = riskValue;
    } else {
      delete next.risk_score;
    }

    if (molecularWeight) {
      const mwValue = Number(molecularWeight);
      if (Number.isFinite(mwValue)) next.molecular_weight = mwValue;
    } else {
      delete next.molecular_weight;
    }

    return next;
  };

  const updateRecommendationIngredientDetails = (
    source: any,
    fromName: string,
    draft: IngredientEditDraft
  ) => {
    if (!source || typeof source !== 'object') return source;
    const next = { ...source };
    const keys = ['safe_ingredients', 'problematic_ingredients', 'beneficial_ingredients', 'concern_ingredients', 'ingredient_data'];
    let updatedAny = false;

    keys.forEach((key) => {
      const current = (next as any)[key];
      if (!Array.isArray(current)) return;
      const mapped = current.map((entry: any) => {
        const entryName = typeof entry === 'string' ? entry : entry?.name;
        if (!entryName || !namesMatch(String(entryName), fromName)) return entry;
        updatedAny = true;
        return applyIngredientDraftToEntry(entry, draft);
      });
      (next as any)[key] = dedupeByIngredientName(mapped);
    });

    if (!updatedAny) {
      const ingredientData = Array.isArray((next as any).ingredient_data)
        ? [...(next as any).ingredient_data]
        : [];
      ingredientData.push(applyIngredientDraftToEntry({ name: draft.name }, draft));
      (next as any).ingredient_data = dedupeByIngredientName(ingredientData);
    }

    return next;
  };

  const persistIngredientListChange = async (
    operation: 'rename' | 'merge' | 'delete',
    sourceIngredient: string,
    targetIngredient?: string
  ) => {
    if (!selectedProduct || !userId) return;

    const sourceNorm = normalizeIngredientName(sourceIngredient);
    const currentIngredients = selectedProduct.ingredients_list
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    let updatedIngredients = currentIngredients.map((entry) => {
      if (!namesMatch(entry, sourceIngredient)) return entry;
      if (operation === 'delete') return '';
      return targetIngredient || entry;
    }).filter(Boolean);

    updatedIngredients = dedupeByIngredientName(updatedIngredients) as string[];

    const updatedRecommendations = updateRecommendationIngredientArrays(
      selectedProduct.recommendations_json || {},
      sourceIngredient,
      targetIngredient,
      operation
    );

    setUpdatingIngredients(true);
    try {
      const { error: updateError } = await (supabase as any)
        .from('user_analyses')
        .update({
          ingredients_list: updatedIngredients.join(', '),
          recommendations_json: updatedRecommendations
        })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      const { data: validationRows } = await (supabase as any)
        .from('ingredient_validations')
        .select('id, ingredient_name')
        .eq('analysis_id', selectedProduct.id);

      const staleValidationIds = (validationRows || [])
        .filter((row: any) => namesMatch(row.ingredient_name || '', sourceNorm))
        .map((row: any) => row.id);

      if (staleValidationIds.length > 0) {
        const { error: deleteError } = await (supabase as any)
          .from('ingredient_validations')
          .delete()
          .in('id', staleValidationIds);
        if (deleteError) {
          console.warn('Could not delete stale validations during ingredient correction:', deleteError);
        }
      }

      const { data: refreshedProduct } = await (supabase as any)
        .from('user_analyses')
        .select('id, product_name, brand, category, epiq_score, ingredients_list, recommendations_json, analyzed_at')
        .eq('id', selectedProduct.id)
        .maybeSingle();

      if (refreshedProduct) {
        await selectProduct(
          refreshedProduct as ProductAnalysis,
          targetIngredient || updatedIngredients[0],
          isAdminReviewer
        );
      }
      await loadProducts(userId, isAdminReviewer);

      toast({
        title: 'Ingredient list updated',
        description:
          operation === 'rename'
            ? `Renamed "${sourceIngredient}" to "${targetIngredient}".`
            : operation === 'merge'
              ? `Merged "${sourceIngredient}" into "${targetIngredient}".`
              : `Removed "${sourceIngredient}" from the product scan.`
      });
    } catch (error: any) {
      console.error('Failed to update ingredient list:', error);
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update ingredient list.',
        variant: 'destructive'
      });
    } finally {
      setUpdatingIngredients(false);
    }
  };

  const handleRenameIngredient = async () => {
    if (!selectedIngredient || !selectedProduct || !userId) return;
    if (!canModifyIngredientEntry(selectedIngredient)) {
      toast({
        title: 'Edit restricted',
        description: 'Verified ingredients can only be edited by an admin or the original verifier.',
        variant: 'destructive'
      });
      return;
    }
    const nextName = ingredientEditDraft.name.trim();
    if (!nextName) {
      toast({ title: 'Name required', description: 'Enter a new ingredient name.', variant: 'destructive' });
      return;
    }
    if (ingredientEditDraft.riskScore.trim() && Number.isNaN(Number(ingredientEditDraft.riskScore))) {
      toast({ title: 'Invalid risk score', description: 'Risk score must be a number.', variant: 'destructive' });
      return;
    }
    if (ingredientEditDraft.molecularWeight.trim() && Number.isNaN(Number(ingredientEditDraft.molecularWeight))) {
      toast({ title: 'Invalid molecular weight', description: 'Molecular weight must be a number.', variant: 'destructive' });
      return;
    }

    const currentIngredients = selectedProduct.ingredients_list
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    let updatedIngredients = currentIngredients
      .map((entry) => (namesMatch(entry, selectedIngredient) ? nextName : entry))
      .filter(Boolean);
    updatedIngredients = dedupeByIngredientName(updatedIngredients) as string[];

    let updatedRecommendations = updateRecommendationIngredientArrays(
      selectedProduct.recommendations_json || {},
      selectedIngredient,
      nextName,
      'rename'
    );
    updatedRecommendations = updateRecommendationIngredientDetails(
      updatedRecommendations,
      nextName,
      {
        ...ingredientEditDraft,
        name: nextName
      }
    );

    setUpdatingIngredients(true);
    try {
      const { error: updateError } = await (supabase as any)
        .from('user_analyses')
        .update({
          ingredients_list: updatedIngredients.join(', '),
          recommendations_json: updatedRecommendations
        })
        .eq('id', selectedProduct.id);

      if (updateError) throw updateError;

      if (!namesMatch(nextName, selectedIngredient)) {
        const { data: validationRows } = await (supabase as any)
          .from('ingredient_validations')
          .select('id, ingredient_name')
          .eq('analysis_id', selectedProduct.id);

        const staleValidationIds = (validationRows || [])
          .filter((row: any) => namesMatch(row.ingredient_name || '', selectedIngredient))
          .map((row: any) => row.id);

        if (staleValidationIds.length > 0) {
          const { error: deleteError } = await (supabase as any)
            .from('ingredient_validations')
            .delete()
            .in('id', staleValidationIds);
          if (deleteError) {
            console.warn('Could not delete stale validations during ingredient edit:', deleteError);
          }
        }
      }

      const { data: refreshedProduct } = await (supabase as any)
        .from('user_analyses')
        .select('id, product_name, brand, category, epiq_score, ingredients_list, recommendations_json, analyzed_at')
        .eq('id', selectedProduct.id)
        .maybeSingle();

      if (refreshedProduct) {
        await selectProduct(
          refreshedProduct as ProductAnalysis,
          nextName,
          isAdminReviewer
        );
      }
      await loadProducts(userId, isAdminReviewer);

      toast({
        title: 'Ingredient updated',
        description: `Saved full ingredient details for "${nextName}".`
      });
      setRenameDialogOpen(false);
    } catch (error: any) {
      console.error('Failed to update ingredient details:', error);
      toast({
        title: 'Update failed',
        description: error?.message || 'Could not update ingredient details.',
        variant: 'destructive'
      });
    } finally {
      setUpdatingIngredients(false);
    }
  };

  const handleMergeIngredient = async () => {
    if (!selectedIngredient || !mergeTargetIngredient) return;
    if (!canModifyIngredientEntry(selectedIngredient) || !canModifyIngredientEntry(mergeTargetIngredient)) {
      toast({
        title: 'Edit restricted',
        description: 'Verified ingredients can only be edited by an admin or the original verifier.',
        variant: 'destructive'
      });
      return;
    }
    if (namesMatch(selectedIngredient, mergeTargetIngredient)) {
      toast({ title: 'Invalid merge', description: 'Choose a different target ingredient.', variant: 'destructive' });
      return;
    }
    await persistIngredientListChange('merge', selectedIngredient, mergeTargetIngredient);
    setMergeDialogOpen(false);
  };

  const handleDeleteIngredient = async () => {
    if (!selectedIngredient) return;
    if (!canModifyIngredientEntry(selectedIngredient)) {
      toast({
        title: 'Edit restricted',
        description: 'Verified ingredients can only be edited by an admin or the original verifier.',
        variant: 'destructive'
      });
      return;
    }
    await persistIngredientListChange('delete', selectedIngredient);
    setDeleteDialogOpen(false);
  };

  const openIngredientActionDialog = (ingredient: string, action: 'rename' | 'merge' | 'delete') => {
    setSelectedIngredient(ingredient);
    setIngredientEditDraft(getIngredientEditDefaults(ingredient));
    setMergeTargetIngredient('');
    if (action === 'rename') {
      setRenameDialogOpen(true);
      return;
    }
    if (action === 'merge') {
      setMergeDialogOpen(true);
      return;
    }
    setDeleteDialogOpen(true);
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
    const visibleIngredients = getVisibleIngredients();
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
            <Button variant="ghost" onClick={exitProductValidation} className="w-full sm:w-auto">
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
                      {visibleIngredients.length}/{ingredientsList.length} shown
                    </span>
                  </div>
                  <div className="mb-3 flex gap-2">
                    <Button
                      variant={ingredientListFilter === 'needs_review' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIngredientListFilter('needs_review')}
                      disabled={updatingIngredients}
                    >
                      Needs Review
                    </Button>
                    <Button
                      variant={ingredientListFilter === 'all' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setIngredientListFilter('all')}
                      disabled={updatingIngredients}
                    >
                      All
                    </Button>
                  </div>
                  {selectedIngredient && (
                    <div className="mb-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openIngredientActionDialog(selectedIngredient, 'rename')}
                        disabled={updatingIngredients || !canModifyIngredientEntry(selectedIngredient)}
                      >
                        <Pencil className="w-3.5 h-3.5 mr-1.5" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openIngredientActionDialog(selectedIngredient, 'merge')}
                        disabled={updatingIngredients || ingredientsList.length < 2 || !canModifyIngredientEntry(selectedIngredient)}
                      >
                        <GitMerge className="w-3.5 h-3.5 mr-1.5" />
                        Merge
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openIngredientActionDialog(selectedIngredient, 'delete')}
                        disabled={updatingIngredients || !canModifyIngredientEntry(selectedIngredient)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Delete
                      </Button>
                    </div>
                  )}
                  <div className="space-y-2">
                    {visibleIngredients.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No ingredients currently need review for this product.
                      </p>
                    ) : visibleIngredients.map(ingredient => {
                      const validation = ingredientValidations.get(normalizeIngredientName(ingredient));
                      const isSelected = selectedIngredient === ingredient;
                      const statusLabel = getIngredientStatusLabel(ingredient, validation);
                      const stageLabel = getIngredientStage(validation);
                      const updatedLabel = validation?.updated_at ? formatReviewDate(validation.updated_at) : '';
                      const workedOn = Boolean(
                        validation &&
                        (
                          validation.verdict ||
                          validation.confidence_level ||
                          validation.public_explanation ||
                          validation.internal_notes ||
                          (validation.citation_count || 0) > 0
                        )
                      );
                      const reviewerLabel = validation
                        ? (isAdminReviewer
                          ? (validation.validator_email || validation.validator_role || 'Reviewer')
                          : (validation.validator_role || 'Reviewer'))
                        : '';
                      const sourceLabel = reviewerLabel
                        ? `Last updated by ${reviewerLabel}`
                        : 'Source: AI baseline';
                      const canModify = canModifyIngredientEntry(ingredient);
                      return (
                        <div
                          key={ingredient}
                          className={`w-full flex flex-col gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                            isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => selectIngredientForReview(ingredient)}
                            className="w-full text-left"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <span className="text-sm font-medium break-words">{ingredient}</span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${getStatusBadgeClass(statusLabel, Boolean(validation))}`}
                              >
                                {statusLabel}
                              </Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                              <span className="break-words">Stage: {stageLabel}</span>
                              {workedOn && statusLabel === 'Needs More Data' && (
                                <Badge variant="outline" className="text-[10px] border-blue-400/40 text-blue-700">
                                  In Progress
                                </Badge>
                              )}
                              <span className="break-words">{sourceLabel}</span>
                              {updatedLabel && <span className="break-words">{updatedLabel}</span>}
                            </div>
                          </button>

                          <div className="flex justify-end gap-1.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Edit ingredient details"
                              onClick={() => openIngredientActionDialog(ingredient, 'rename')}
                              disabled={updatingIngredients || !canModify}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Merge ingredient"
                              onClick={() => openIngredientActionDialog(ingredient, 'merge')}
                              disabled={updatingIngredients || ingredientsList.length < 2 || !canModify}
                            >
                              <GitMerge className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              title="Delete ingredient"
                              onClick={() => openIngredientActionDialog(ingredient, 'delete')}
                              disabled={updatingIngredients || !canModify}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
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

          <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Ingredient Details</DialogTitle>
                <DialogDescription>
                  Update the ingredient name and metadata shown to users for this scan.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Ingredient name</label>
                  <Input
                    value={ingredientEditDraft.name}
                    onChange={(event) =>
                      setIngredientEditDraft((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="Enter corrected ingredient name"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Input
                      value={ingredientEditDraft.role}
                      onChange={(event) =>
                        setIngredientEditDraft((prev) => ({ ...prev, role: event.target.value }))
                      }
                      placeholder="e.g. Humectant"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Safety profile</label>
                    <Input
                      value={ingredientEditDraft.safetyProfile}
                      onChange={(event) =>
                        setIngredientEditDraft((prev) => ({ ...prev, safetyProfile: event.target.value }))
                      }
                      placeholder="e.g. low risk"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Risk score</label>
                    <Input
                      value={ingredientEditDraft.riskScore}
                      onChange={(event) =>
                        setIngredientEditDraft((prev) => ({ ...prev, riskScore: event.target.value }))
                      }
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Molecular weight</label>
                    <Input
                      value={ingredientEditDraft.molecularWeight}
                      onChange={(event) =>
                        setIngredientEditDraft((prev) => ({ ...prev, molecularWeight: event.target.value }))
                      }
                      placeholder="e.g. 150.2"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Explanation</label>
                  <Textarea
                    value={ingredientEditDraft.explanation}
                    onChange={(event) =>
                      setIngredientEditDraft((prev) => ({ ...prev, explanation: event.target.value }))
                    }
                    rows={4}
                    placeholder="Explain why this ingredient is safe, concern, or needs review."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRenameIngredient} disabled={updatingIngredients}>
                  {updatingIngredients ? 'Updating...' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Merge Ingredients</DialogTitle>
                <DialogDescription>
                  Combine this ingredient into another entry to correct split parsing.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <label className="text-sm font-medium">Merge "{selectedIngredient}" into</label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={mergeTargetIngredient}
                  onChange={(event) => setMergeTargetIngredient(event.target.value)}
                >
                  <option value="">Select target ingredient</option>
                  {ingredientsList
                    .filter((name) => !selectedIngredient || !namesMatch(name, selectedIngredient))
                    .map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                </select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleMergeIngredient} disabled={updatingIngredients || !mergeTargetIngredient}>
                  {updatingIngredients ? 'Updating...' : 'Merge'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Ingredient</DialogTitle>
                <DialogDescription>
                  Remove "{selectedIngredient}" from this product scan list and clear its validations.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleDeleteIngredient} disabled={updatingIngredients}>
                  {updatingIngredients ? 'Updating...' : 'Delete Ingredient'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </AppShell>
    );
  }

  // Products list view
  return (
    <AppShell showNavigation showBottomNav contentClassName="px-[5px] lg:px-4 py-8">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Ingredient Validation Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              {institution} • Student Reviewer
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/home')} className="w-full sm:w-auto">
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
                  <p className="text-sm font-medium text-foreground">You verified</p>
                  <p className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground">
                    Total validated: {stats.totalValidated}
                  </p>
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
                                  <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 border-amber-500/30">
                                    In Progress: {summary.needsCorrection + summary.inProgress}
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
                          <Badge variant="outline" className="self-start sm:self-center sm:ml-4">
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
                                <Badge
                                  variant="outline"
                                  className={status === 'validated'
                                    ? 'bg-green-500/10 text-green-700 border-green-500/30'
                                    : 'bg-amber-500/10 text-amber-700 border-amber-500/30'}
                                >
                                  {status === 'validated' ? 'Verified' : 'In Progress'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatReviewDate(v.updated_at)}
                                </span>
                                {/* Status indicator for who last updated */}
                                <span className="text-xs text-blue-600">
                                  {`Updated by ${
                                    isAdminReviewer
                                      ? (v.validator_email || v.validator_role || 'Reviewer')
                                      : (v.validator_role || 'Reviewer')
                                  }`}
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
