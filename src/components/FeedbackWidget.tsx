import { useState } from "react";
import { Bug, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/hooks/useTracking";

const EMOJI_REACTIONS = [
  { emoji: "😍", type: "general_feedback", label: "Love it" },
  { emoji: "💪", type: "general_feedback", label: "Works well" },
  { emoji: "😕", type: "general_feedback", label: "Confused" },
  { emoji: "🐛", type: "bug_report", label: "Bug" },
  { emoji: "💡", type: "feature_request", label: "Idea" },
];

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleQuickReaction = async (reaction: typeof EMOJI_REACTIONS[0]) => {
    setFeedbackType(reaction.type);
    
    trackEvent({
      eventName: 'feedback_quick_reaction',
      eventCategory: 'feedback',
      eventProperties: {
        emoji: reaction.emoji,
        type: reaction.type,
        page: window.location.pathname
      }
    });
  };

  const handleOpen = () => {
    setIsOpen(true);
    trackEvent({
      eventName: 'feedback_widget_opened',
      eventCategory: 'feedback',
      eventProperties: {
        page: window.location.pathname
      }
    });
  };

  const handleClose = () => {
    setIsOpen(false);
    trackEvent({
      eventName: 'feedback_widget_dismissed',
      eventCategory: 'feedback',
      eventProperties: {
        had_content: !!message.trim(),
        page: window.location.pathname
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!feedbackType || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a feedback type and enter your message.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("feedback").insert({
        user_id: user?.id || null,
        feedback_type: feedbackType,
        message: message.trim(),
        context_type: "general",
        page_url: window.location.pathname,
      });

      if (error) throw error;

      trackEvent({
        eventName: 'feedback_submitted',
        eventCategory: 'feedback',
        eventProperties: {
          feedback_type: feedbackType,
          message_length: message.trim().length,
          page: window.location.pathname
        }
      });

      const responseMessages = {
        bug_report: "🐛 We're investigating - our team will review this shortly!",
        feature_request: "💡 Great idea! We've added it to our roadmap.",
        general_feedback: "🎉 Thanks for your feedback! It helps us improve."
      };

      toast({
        title: "Feedback Submitted!",
        description: responseMessages[feedbackType as keyof typeof responseMessages] || "Thanks! We'll review this soon.",
      });

      // Reset form
      setMessage("");
      setFeedbackType("");
      
      // Auto-close after success
      setTimeout(() => setIsOpen(false), 1500);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast({
        title: "Submission Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button - Mobile first positioning */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleOpen}
              className="fixed bottom-24 left-6 lg:left-auto lg:bottom-6 lg:right-6 z-50 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 md:p-4 shadow-lg transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Report bug or suggest feature"
            >
              <Bug className="w-5 h-5 md:w-6 md:h-6 text-background" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-sm">
            <p>Report Bug or Suggest Feature</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Slide-out Panel / Bottom Sheet */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          {/* Panel - Bottom sheet on mobile, slide-in on desktop */}
          <div className="relative bg-background border-t md:border-l md:border-t-0 border-border w-full md:w-[400px] h-[85vh] md:h-auto md:max-h-[600px] shadow-2xl animate-slide-in-from-bottom md:animate-slide-in-from-right flex flex-col rounded-t-2xl md:rounded-none">
            {/* Header */}
            <div className="flex items-center justify-between p-4 md:p-6 border-b border-border">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-primary" />
                <h2 className="text-lg md:text-xl font-semibold">Report Issue or Suggest Feature</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                aria-label="Close feedback form"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Quick Reactions */}
            <div className="p-4 md:p-6 border-b border-border bg-muted/30">
              <Label className="text-sm mb-3 block">Quick Reaction</Label>
              <div className="flex gap-2 justify-between">
                {EMOJI_REACTIONS.map((reaction) => (
                  <button
                    key={reaction.emoji}
                    type="button"
                    onClick={() => handleQuickReaction(reaction)}
                    className={`flex flex-col items-center gap-1 p-2 md:p-3 rounded-lg border-2 transition-all hover:scale-105 min-w-[48px] ${
                      feedbackType === reaction.type
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    aria-label={reaction.label}
                  >
                    <span className="text-2xl md:text-3xl">{reaction.emoji}</span>
                    <span className="text-[10px] md:text-xs text-muted-foreground">{reaction.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="space-y-2">
                <Label htmlFor="message">Message {feedbackType && "(Optional)"}</Label>
                <Textarea
                  id="message"
                  placeholder="Tell us more... (optional if you selected a reaction)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="min-h-[120px] md:min-h-[150px] resize-none"
                  disabled={isSubmitting}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting || (!feedbackType && !message.trim())}
              >
                {isSubmitting ? "Sending..." : "Send Feedback"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
