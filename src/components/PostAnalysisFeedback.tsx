import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PostAnalysisFeedbackProps {
  analysisId: string;
}

const PostAnalysisFeedback = ({ analysisId }: PostAnalysisFeedbackProps) => {
  const [rating, setRating] = useState<number | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { toast } = useToast();

  const handleRating = async (value: number) => {
    setRating(value);
    
    // Show follow-up for negative ratings
    if (value <= 3) {
      setShowFollowUp(true);
      return;
    }

    // Submit immediately for positive ratings
    await submitFeedback(value, "");
  };

  const submitFeedback = async (ratingValue: number, message: string) => {
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id || null,
        feedback_type: "analysis_rating",
        message: message.trim() || "No additional comments",
        rating: ratingValue,
        context_type: "analysis",
        context_id: analysisId,
        page_url: window.location.pathname,
      });

      if (error) throw error;

      toast({
        title: "Thank you!",
        description: "Your feedback helps us improve.",
      });

      setHasSubmitted(true);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFollowUpSubmit = async () => {
    if (rating === null) return;
    await submitFeedback(rating, followUpMessage);
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
    <div className="mt-8 p-6 bg-muted/50 rounded-lg border border-border">
      <h3 className="text-lg font-semibold mb-4">Was this analysis helpful?</h3>
      
      {!showFollowUp ? (
        <div className="flex items-center gap-4">
          <button
            onClick={() => handleRating(5)}
            disabled={isSubmitting || rating !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent hover:border-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Positive feedback"
          >
            <ThumbsUp className="w-5 h-5" />
            <span className="text-sm font-medium">Yes, helpful</span>
          </button>
          
          <button
            onClick={() => handleRating(2)}
            disabled={isSubmitting || rating !== null}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-background hover:bg-accent hover:border-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
            aria-label="Negative feedback"
          >
            <ThumbsDown className="w-5 h-5" />
            <span className="text-sm font-medium">Could be better</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="follow-up" className="text-sm font-medium">
              What could we improve? (Optional)
            </label>
            <Textarea
              id="follow-up"
              placeholder="Tell us more about your experience..."
              value={followUpMessage}
              onChange={(e) => setFollowUpMessage(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleFollowUpSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? "Submitting..." : "Submit Feedback"}
            </Button>
            <Button
              variant="outline"
              onClick={() => submitFeedback(rating!, "")}
              disabled={isSubmitting}
            >
              Skip
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostAnalysisFeedback;
