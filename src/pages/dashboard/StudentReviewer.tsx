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
  Home
} from 'lucide-react';

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
          <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
            <TabsTrigger value="queue" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Review Queue
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
