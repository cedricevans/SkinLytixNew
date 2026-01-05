import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, Award, GraduationCap, Sparkles } from 'lucide-react';

interface ExpertReview {
  id: string;
  reviewer_institution: string;
  review_status: string;
  ingredient_accuracy_score: number | null;
  recommendation_quality_score: number | null;
  reviewed_at: string;
}

interface ExpertReviewBadgeProps {
  analysisId: string;
  className?: string;
  variant?: 'compact' | 'detailed';
}

export function ExpertReviewBadge({ 
  analysisId, 
  className = '',
  variant = 'compact'
}: ExpertReviewBadgeProps) {
  const [review, setReview] = useState<ExpertReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const { data } = await supabase
          .from('expert_reviews')
          .select('id, reviewer_institution, review_status, ingredient_accuracy_score, recommendation_quality_score, reviewed_at')
          .eq('analysis_id', analysisId)
          .eq('review_status', 'approved')
          .maybeSingle();

        setReview(data);
      } catch (error) {
        console.error('Error fetching expert review:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReview();
  }, [analysisId]);

  if (loading || !review) {
    return null;
  }

  const avgScore = review.ingredient_accuracy_score && review.recommendation_quality_score
    ? ((review.ingredient_accuracy_score + review.recommendation_quality_score) / 2).toFixed(1)
    : null;

  if (variant === 'compact') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            className={`bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:from-amber-500/30 hover:to-yellow-500/30 cursor-help ${className}`}
          >
            <Award className="w-3 h-3 mr-1" />
            Expert Verified
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Validated by {review.reviewer_institution}
            </p>
            {avgScore && (
              <p className="text-sm">
                Expert Rating: {avgScore}/5 ⭐
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Reviewed on {new Date(review.reviewed_at).toLocaleDateString()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Detailed variant
  return (
    <div className={`bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-amber-500/10 border border-amber-500/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-amber-500/20 rounded-full">
          <Award className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-amber-700 dark:text-amber-400">
              Expert Verified
            </span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            This analysis has been reviewed and validated by a certified expert from {review.reviewer_institution}.
          </p>
          <div className="flex items-center gap-4 text-sm">
            {review.ingredient_accuracy_score && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Accuracy: {review.ingredient_accuracy_score}/5
              </span>
            )}
            {review.recommendation_quality_score && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                Quality: {review.recommendation_quality_score}/5
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            <GraduationCap className="w-3 h-3 inline mr-1" />
            {review.reviewer_institution} • {new Date(review.reviewed_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
