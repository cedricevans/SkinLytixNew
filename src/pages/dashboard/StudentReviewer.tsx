import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  ClipboardList, 
  CheckCircle2, 
  Clock, 
  Award, 
  Star,
  ChevronRight,
  FileText,
  AlertCircle,
  Trophy,
  TrendingUp,
  Home,
  FlaskConical,
  ArrowLeft
} from 'lucide-react';
import { IngredientValidationPanel } from '@/components/reviewer/IngredientValidationPanel';
import { IngredientSourcePanel } from '@/components/reviewer/IngredientSourcePanel';
import { ValidationProgressBar } from '@/components/reviewer/ValidationProgressBar';

interface PendingAnalysis {
  id: string;
  product_name: string;
  brand: string | null;
  category: string | null;
  epiq_score: number | null;
  ingredients_list: string;
  analyzed_at: string;
}

interface ReviewStats {
  total: number;
  pending: number;
  approved: number;
  avgAccuracyScore: number;
}

interface ExpertReview {
  id: string;
  analysis_id: string;
  review_status: string;
  ingredient_accuracy_score: number | null;
  recommendation_quality_score: number | null;
  comments: string | null;
  epiq_calibration_note: string | null;
  reviewed_at: string;
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

export default function StudentReviewer() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [pendingAnalyses, setPendingAnalyses] = useState<PendingAnalysis[]>([]);
  const [myReviews, setMyReviews] = useState<ExpertReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({ total: 0, pending: 0, approved: 0, avgAccuracyScore: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<PendingAnalysis | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [institution, setInstitution] = useState<string | null>(null);
  
  // Ingredient validation state
  const [validatingIngredients, setValidatingIngredients] = useState(false);
  const [ingredientsList, setIngredientsList] = useState<string[]>([]);
  const [ingredientValidations, setIngredientValidations] = useState<Map<string, IngredientValidation>>(new Map());
  const [ingredientCache, setIngredientCache] = useState<Map<string, any>>(new Map());

  // Review form state
  const [accuracyScore, setAccuracyScore] = useState(3);
  const [qualityScore, setQualityScore] = useState(3);
  const [calibrationNote, setCalibrationNote] = useState('');
  const [comments, setComments] = useState('');
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'revision_needed'>('approved');

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

      // Check for student_reviewer or admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      const hasReviewerRole = roles?.some(r => 
        r.role === 'admin' || r.role === 'moderator'
      );

      // Also check for student certification
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
        navigate('/');
        return;
      }

      setHasAccess(true);
      setInstitution(certification?.institution || 'SkinLytix');

      await loadDashboardData(user.id, certification?.institution || 'SkinLytix');
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

  const loadDashboardData = async (userId: string, inst: string) => {
    // Get analyses that need review (not yet reviewed by anyone)
    const { data: analyses } = await supabase
      .from('user_analyses')
      .select('id, product_name, brand, category, epiq_score, ingredients_list, analyzed_at')
      .order('analyzed_at', { ascending: false })
      .limit(20);

    // Get existing reviews for these analyses
    const { data: existingReviews } = await supabase
      .from('expert_reviews')
      .select('analysis_id');

    const reviewedIds = new Set(existingReviews?.map(r => r.analysis_id) || []);
    const pendingForReview = analyses?.filter(a => !reviewedIds.has(a.id)) || [];
    setPendingAnalyses(pendingForReview);

    // Get user's own reviews
    const { data: userReviews } = await supabase
      .from('expert_reviews')
      .select('*')
      .eq('reviewer_id', userId)
      .order('reviewed_at', { ascending: false });

    setMyReviews(userReviews || []);

    // Calculate stats
    const totalReviews = userReviews?.length || 0;
    const pendingCount = userReviews?.filter(r => r.review_status === 'pending').length || 0;
    const approvedCount = userReviews?.filter(r => r.review_status === 'approved').length || 0;
    const avgAccuracy = userReviews?.length 
      ? userReviews.reduce((sum, r) => sum + (r.ingredient_accuracy_score || 0), 0) / userReviews.length
      : 0;

    setStats({
      total: totalReviews,
      pending: pendingForReview.length,
      approved: approvedCount,
      avgAccuracyScore: Math.round(avgAccuracy * 10) / 10
    });
  };

  // Parse ingredients from analysis and load validations
  const startIngredientValidation = async (analysis: PendingAnalysis) => {
    setValidatingIngredients(true);
    setSelectedAnalysis(analysis);
    
    // Parse ingredients from comma-separated list
    const ingredients = analysis.ingredients_list
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0);
    setIngredientsList(ingredients);

    // Load existing validations for this analysis
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: validations } = await supabase
        .from('ingredient_validations')
        .select('*')
        .eq('analysis_id', analysis.id)
        .eq('validator_id', user.id);

      const validationMap = new Map<string, IngredientValidation>();
      validations?.forEach(v => {
        validationMap.set(v.ingredient_name, {
          ingredient_name: v.ingredient_name,
          validation_status: v.validation_status,
          pubchem_data_correct: v.pubchem_data_correct,
          ai_explanation_accurate: v.ai_explanation_accurate,
          corrected_role: v.corrected_role,
          corrected_safety_level: v.corrected_safety_level,
          correction_notes: v.correction_notes,
          reference_sources: (v.reference_sources as string[]) || []
        });
      });
      setIngredientValidations(validationMap);

      // Load ingredient cache data
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
    } catch (error) {
      console.error('Error loading validations:', error);
    }
  };

  const handleValidationComplete = async () => {
    if (!selectedAnalysis) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Reload validations
    const { data: validations } = await supabase
      .from('ingredient_validations')
      .select('*')
      .eq('analysis_id', selectedAnalysis.id)
      .eq('validator_id', user.id);

    const validationMap = new Map<string, IngredientValidation>();
    validations?.forEach(v => {
      validationMap.set(v.ingredient_name, {
        ingredient_name: v.ingredient_name,
        validation_status: v.validation_status,
        pubchem_data_correct: v.pubchem_data_correct,
        ai_explanation_accurate: v.ai_explanation_accurate,
        corrected_role: v.corrected_role,
        corrected_safety_level: v.corrected_safety_level,
        correction_notes: v.correction_notes,
        reference_sources: (v.reference_sources as string[]) || []
      });
    });
    setIngredientValidations(validationMap);
  };

  const exitIngredientValidation = () => {
    setValidatingIngredients(false);
    setSelectedAnalysis(null);
    setIngredientsList([]);
    setIngredientValidations(new Map());
  };

  const getValidationStats = () => {
    let validated = 0;
    let needsCorrection = 0;
    
    ingredientValidations.forEach(v => {
      if (v.validation_status === 'validated') validated++;
      else if (v.validation_status === 'needs_correction') needsCorrection++;
    });

    return { validated, needsCorrection, total: ingredientsList.length };
  };

  const handleSubmitReview = async () => {
    if (!selectedAnalysis) return;
    
    setIsReviewing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('expert_reviews')
        .insert({
          analysis_id: selectedAnalysis.id,
          reviewer_id: user.id,
          reviewer_institution: institution || 'SkinLytix',
          review_status: reviewStatus,
          ingredient_accuracy_score: accuracyScore,
          recommendation_quality_score: qualityScore,
          epiq_calibration_note: calibrationNote || null,
          comments: comments || null,
        });

      if (error) throw error;

      toast({
        title: "Review Submitted!",
        description: "Your expert review has been recorded.",
      });

      // Reset form and reload
      setSelectedAnalysis(null);
      setAccuracyScore(3);
      setQualityScore(3);
      setCalibrationNote('');
      setComments('');
      setReviewStatus('approved');
      
      await loadDashboardData(user.id, institution || 'SkinLytix');
    } catch (error: any) {
      console.error('Error submitting review:', error);
      toast({
        title: "Failed to submit review",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReviewing(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading reviewer dashboard...</p>
        </div>
      </main>
    );
  }

  if (!hasAccess) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted py-8 px-4">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Expert Review Dashboard</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <Award className="w-4 h-4" />
              {institution} • Student Reviewer
            </p>
          </div>
          <Button variant="ghost" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending Review</p>
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
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Reviews Done</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Star className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.avgAccuracyScore}</p>
                  <p className="text-sm text-muted-foreground">Avg Accuracy</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Trophy className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.approved}</p>
                  <p className="text-sm text-muted-foreground">Approved</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="queue" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Review Queue
            </TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Ingredients
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              My Reviews
            </TabsTrigger>
          </TabsList>

          {/* Review Queue Tab */}
          <TabsContent value="queue" className="space-y-6">
            {selectedAnalysis ? (
              <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold">{selectedAnalysis.product_name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedAnalysis.brand && (
                        <Badge variant="secondary">{selectedAnalysis.brand}</Badge>
                      )}
                      {selectedAnalysis.category && (
                        <Badge variant="outline">{selectedAnalysis.category}</Badge>
                      )}
                      {selectedAnalysis.epiq_score && (
                        <Badge className="bg-primary/10 text-primary">
                          EpiQ: {selectedAnalysis.epiq_score}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedAnalysis(null)}>
                    Cancel
                  </Button>
                </div>

                {/* Ingredients Preview */}
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Ingredients List</Label>
                  <p className="text-sm text-muted-foreground max-h-32 overflow-y-auto">
                    {selectedAnalysis.ingredients_list}
                  </p>
                </div>

                {/* Review Form */}
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <Label>Ingredient Accuracy Score: {accuracyScore}/5</Label>
                      <Slider
                        value={[accuracyScore]}
                        onValueChange={([v]) => setAccuracyScore(v)}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        How accurately were the ingredients identified and categorized?
                      </p>
                    </div>
                    <div className="space-y-3">
                      <Label>Recommendation Quality Score: {qualityScore}/5</Label>
                      <Slider
                        value={[qualityScore]}
                        onValueChange={([v]) => setQualityScore(v)}
                        min={1}
                        max={5}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        How useful and accurate are the AI recommendations?
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Review Status</Label>
                    <Select value={reviewStatus} onValueChange={(v: any) => setReviewStatus(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="approved">
                          <span className="flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Approved - EpiQ score is accurate
                          </span>
                        </SelectItem>
                        <SelectItem value="revision_needed">
                          <span className="flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 text-amber-600" />
                            Revision Needed - Calibration required
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>EpiQ Calibration Note (Optional)</Label>
                    <Textarea
                      placeholder="If the EpiQ score seems off, explain why and suggest adjustment..."
                      value={calibrationNote}
                      onChange={(e) => setCalibrationNote(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Additional Comments (Optional)</Label>
                    <Textarea
                      placeholder="Any additional observations about the analysis..."
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <Button 
                    onClick={handleSubmitReview} 
                    disabled={isReviewing}
                    className="w-full"
                    size="lg"
                  >
                    {isReviewing ? 'Submitting...' : 'Submit Review'}
                  </Button>
                </div>
              </Card>
            ) : (
              <div className="grid gap-4">
                {pendingAnalyses.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                    <p className="text-muted-foreground">No analyses pending review right now.</p>
                  </Card>
                ) : (
                  pendingAnalyses.map((analysis) => (
                    <Card 
                      key={analysis.id} 
                      className="p-4 hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{analysis.product_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {analysis.brand && (
                              <Badge variant="secondary" className="text-xs">{analysis.brand}</Badge>
                            )}
                            {analysis.epiq_score && (
                              <Badge variant="outline" className="text-xs">
                                EpiQ: {analysis.epiq_score}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {new Date(analysis.analyzed_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Ingredient Validation Tab */}
          <TabsContent value="ingredients" className="space-y-6">
            {validatingIngredients && selectedAnalysis ? (
              <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exitIngredientValidation}
                      className="mb-2"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to List
                    </Button>
                    <h3 className="text-xl font-semibold">{selectedAnalysis.product_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Validate each ingredient's data from PubChem and AI
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <ValidationProgressBar {...getValidationStats()} />

                {/* Ingredients Accordion */}
                <Accordion type="single" collapsible className="space-y-3">
                  {ingredientsList.map((ingredient, index) => {
                    const cacheData = ingredientCache.get(ingredient.toLowerCase());
                    const validation = ingredientValidations.get(ingredient);
                    
                    return (
                      <AccordionItem 
                        key={ingredient} 
                        value={ingredient}
                        className="border rounded-lg px-0 overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 hover:no-underline hover:bg-muted/50">
                          <div className="flex items-center gap-3 w-full">
                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">
                              {index + 1}
                            </span>
                            <span className="font-medium flex-1 text-left">{ingredient}</span>
                            {validation ? (
                              <Badge 
                                variant="outline"
                                className={
                                  validation.validation_status === 'validated' 
                                    ? 'bg-green-500/10 text-green-600 border-green-500/20'
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                }
                              >
                                {validation.validation_status === 'validated' ? 'Validated' : 'Needs Correction'}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                Pending
                              </Badge>
                            )}
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-0 pb-0">
                          <div className="grid lg:grid-cols-3 gap-4 p-4 bg-muted/30">
                            <div className="lg:col-span-2">
                              <IngredientValidationPanel
                                analysisId={selectedAnalysis.id}
                                ingredientName={ingredient}
                                pubchemCid={cacheData?.pubchem_cid}
                                molecularWeight={cacheData?.molecular_weight}
                                existingValidation={validation || null}
                                institution={institution || 'SkinLytix'}
                                onValidationComplete={handleValidationComplete}
                              />
                            </div>
                            <div className="hidden lg:block">
                              <IngredientSourcePanel
                                ingredientName={ingredient}
                                pubchemData={cacheData ? {
                                  cid: cacheData.pubchem_cid,
                                  molecularWeight: cacheData.molecular_weight
                                } : null}
                              />
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            ) : (
              <div className="grid gap-4">
                <Card className="p-6 bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <FlaskConical className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Ingredient Validation</h3>
                      <p className="text-sm text-muted-foreground">
                        Select a product below to validate its ingredients. Verify if PubChem data 
                        and AI explanations are correct, and make corrections where needed.
                      </p>
                    </div>
                  </div>
                </Card>

                {pendingAnalyses.length === 0 ? (
                  <Card className="p-8 text-center">
                    <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No products to validate</h3>
                    <p className="text-muted-foreground">Check back later for new analyses.</p>
                  </Card>
                ) : (
                  pendingAnalyses.map((analysis) => (
                    <Card 
                      key={analysis.id} 
                      className="p-4 hover:border-primary/50 cursor-pointer transition-colors"
                      onClick={() => startIngredientValidation(analysis)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold">{analysis.product_name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            {analysis.brand && (
                              <Badge variant="secondary" className="text-xs">{analysis.brand}</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {analysis.ingredients_list.split(',').length} ingredients
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(analysis.analyzed_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </TabsContent>

          {/* Review History Tab */}
          <TabsContent value="history">
            <div className="grid gap-4">
              {myReviews.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reviews yet</h3>
                  <p className="text-muted-foreground">Start reviewing analyses to build your history.</p>
                </Card>
              ) : (
                myReviews.map((review) => (
                  <Card key={review.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant={review.review_status === 'approved' ? 'default' : 'secondary'}
                            className={review.review_status === 'approved' 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                              : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }
                          >
                            {review.review_status === 'approved' ? 'Approved' : 'Revision Needed'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(review.reviewed_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-4 h-4" />
                            Accuracy: {review.ingredient_accuracy_score}/5
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            Quality: {review.recommendation_quality_score}/5
                          </span>
                        </div>
                        {review.comments && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {review.comments}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
