import { useState } from "react";
import { Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useTracking";
import FeedbackDialog from "./FeedbackDialog";

interface PostAnalysisFeedbackProps {
  analysisId: string;
}

const PostAnalysisFeedback = ({ analysisId }: PostAnalysisFeedbackProps) => {
  const [rating, setRating] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { toast } = useToast();

  const handleRating = async (value: number) => {
    setRating(value);
    
    // Track rating selection
    trackEvent({
      eventName: 'analysis_rating_selected',
      eventCategory: 'feedback',
      eventProperties: { rating: value }
    });
    
    // Show dialog for ratings 1-3 (negative/neutral)
    if (value <= 3) {
      setShowDialog(true);
      trackEvent({
        eventName: 'feedback_dialog_opened',
        eventCategory: 'feedback',
        eventProperties: { rating: value }
      });
      return;
    }

    // Submit immediately for positive ratings (4-5)
    await submitFeedback(value, [], "");
  };

  const submitFeedback = async (
    ratingValue: number,
    selectedIssues: string[],
    message: string
  ) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Format feedback message with structured data
      const formattedMessage = selectedIssues.length > 0
        ? `Issues: [${selectedIssues.join(", ")}] | Comment: ${message.trim() || "No additional comments"}`
        : message.trim() || "No additional comments";
      
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id || null,
        feedback_type: "analysis_rating",
        message: formattedMessage,
        rating: ratingValue,
        context_type: "analysis",
        context_id: analysisId,
        page_url: window.location.pathname,
      });

      if (error) throw error;

      // Track successful submission
      trackEvent({
        eventName: 'feedback_submitted',
        eventCategory: 'feedback',
        eventProperties: {
          rating: ratingValue,
          issuesCount: selectedIssues.length,
          hasComment: !!message.trim()
        }
      });

      const responseMessages = {
        low: "🔍 We're reviewing your concerns - our team will investigate these issues.",
        mid: "💪 Thanks for the feedback! We're working to improve your experience.",
        high: "🎉 So glad it helped! Share with friends who could benefit too!"
      };

      const messageType = ratingValue <= 2 ? 'low' : ratingValue <= 3 ? 'mid' : 'high';

      toast({
        title: ratingValue <= 2 ? "Feedback received" : "Thanks for your rating! ⭐",
        description: responseMessages[messageType],
      });

      setHasSubmitted(true);
      setShowDialog(false);
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Failed",
        description: error?.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDialogSubmit = async (selectedIssues: string[], detailedMessage: string) => {
    if (rating === null) return;
    await submitFeedback(rating, selectedIssues, detailedMessage);
  };

  const handleDialogSkip = async () => {
    if (rating === null) return;
    
    trackEvent({
      eventName: 'feedback_skipped',
      eventCategory: 'feedback',
      eventProperties: { rating }
    });
    
    await submitFeedback(rating, [], "");
  };

  if (hasSubmitted) {
    return (
      <div className="mt-8 p-6 bg-muted/50 rounded-lg text-center">
        <p className="text-sm text-muted-foreground">
          ✓ Feedback submitted - Thanks for helping us improve!
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
        <h3 className="text-lg font-semibold mb-4">Was this analysis helpful?</h3>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground text-center">
            Rate your experience (1 = Poor, 5 = Excellent)
          </p>
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((starValue) => (
              <button
                key={starValue}
                onClick={() => handleRating(starValue)}
                disabled={isSubmitting || rating !== null}
                className="touch-target transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
                aria-label={`Rate ${starValue} stars`}
              >
                <Star
                  className={`w-8 h-8 transition-colors ${
                    rating !== null && starValue <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground hover:text-yellow-400"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </div>

      <FeedbackDialog
        open={showDialog}
        rating={rating || 1}
        onClose={() => setShowDialog(false)}
        onSubmit={handleDialogSubmit}
        onSkip={handleDialogSkip}
        isSubmitting={isSubmitting}
      />
    </>
  );
};

export default PostAnalysisFeedback;
