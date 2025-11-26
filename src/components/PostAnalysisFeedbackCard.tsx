import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useTracking";

export const PostAnalysisFeedbackCard = () => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    // Check dismissal in localStorage (24-hour expiry)
    const dismissedUntil = localStorage.getItem('post_analysis_feedback_dismissed');
    if (dismissedUntil) {
      const dismissedTime = parseInt(dismissedUntil);
      const now = Date.now();
      if (now < dismissedTime) {
        return; // Still within 24-hour dismissal window
      }
    }

    // Check if user has at least 2 analyses
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { count } = await supabase
        .from('user_analyses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      setAnalysisCount(count || 0);
      if (count && count >= 2) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error('Error checking analysis count:', error);
    }
  };

  const handleDismiss = () => {
    const dismissUntil = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    localStorage.setItem('post_analysis_feedback_dismissed', dismissUntil.toString());
    setIsVisible(false);
    trackEvent({
      eventName: 'beta_feedback_dismissed',
      eventCategory: 'feedback',
      eventProperties: { location: 'post_analysis_card' }
    });
  };

  const handleShareFeedback = () => {
    trackEvent({
      eventName: 'beta_feedback_page_viewed',
      eventCategory: 'feedback',
      eventProperties: { source: 'analysis' }
    });
    navigate('/beta-feedback');
  };

  if (!isVisible) return null;

  return (
    <Card className="p-6 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20 relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="w-4 h-4" />
      </Button>
      
      <div className="flex items-start gap-4">
        <div className="p-3 bg-primary/20 rounded-lg">
          <MessageSquare className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-lg mb-2">Help Shape SkinLytix</h3>
          <p className="text-sm text-muted-foreground mb-4">
            You just explored another product. Want to share a quick thought? It takes under 2 minutes and helps us build smarter.
          </p>
          <div className="flex gap-2">
            <Button onClick={handleShareFeedback} size="sm">
              Share Feedback
            </Button>
            <Button onClick={handleDismiss} variant="outline" size="sm">
              Remind me later
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
