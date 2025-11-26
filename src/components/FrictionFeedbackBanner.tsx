import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MessageSquare, X } from "lucide-react";
import { trackEvent } from "@/hooks/useTracking";

interface FrictionFeedbackBannerProps {
  trigger: 'error' | 'low_score';
  context?: string;
}

export const FrictionFeedbackBanner = ({ trigger, context }: FrictionFeedbackBannerProps) => {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(true);

  const handleShareFeedback = () => {
    trackEvent({
      eventName: 'beta_feedback_page_viewed',
      eventCategory: 'feedback',
      eventProperties: { source: 'friction', trigger, context }
    });
    navigate('/beta-feedback');
  };

  const handleDismiss = () => {
    setIsVisible(false);
    trackEvent({
      eventName: 'beta_feedback_dismissed',
      eventCategory: 'feedback',
      eventProperties: { location: 'friction_banner', trigger }
    });
  };

  if (!isVisible) return null;

  return (
    <Alert className="bg-muted/50 border-muted relative">
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6"
        onClick={handleDismiss}
      >
        <X className="w-4 h-4" />
      </Button>
      <MessageSquare className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between pr-8">
        <span>
          We noticed this experience wasn't perfect. Would you mind telling us what happened?
        </span>
        <div className="flex gap-2 ml-4">
          <Button onClick={handleShareFeedback} size="sm" variant="default">
            Sure, I'll share
          </Button>
          <Button onClick={handleDismiss} size="sm" variant="ghost">
            Not right now
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
