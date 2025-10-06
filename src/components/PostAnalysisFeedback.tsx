import { useState, useEffect } from "react";
import { Star } from "lucide-react";
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
    
    // Show follow-up for ratings 1-3 (negative/neutral)
    if (value <= 3) {
      setShowFollowUp(true);
      return;
    }

    // Submit immediately for positive ratings (4-5)
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
                className="transition-all hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
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
