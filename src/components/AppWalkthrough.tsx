import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, CalendarCheck, User, Sparkles, Target, BarChart3, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WalkthroughStep {
  title: string;
  description: string;
  details?: string[];
  icon: React.ElementType;
}

const steps: WalkthroughStep[] = [
  {
    title: "Welcome to SkinLytix! 🎉",
    description: "Your personal ingredient expert powered by science.",
    details: [
      "We analyze 2,000+ ingredients against YOUR unique skin profile",
      "Every product gets a personalized 0-100 EpiQ Score",
      "Make confident choices backed by dermatological research"
    ],
    icon: Sparkles,
  },
  {
    title: "Understanding EpiQ Scores",
    description: "Your personalized product safety rating",
    details: [
      "0-40 (Red): May contain harmful ingredients for your skin type",
      "41-70 (Yellow): Safe but may not be optimal for you",
      "71-100 (Green): Excellent match for your needs"
    ],
    icon: Target,
  },
  {
    title: "Two Ways to Analyze",
    description: "Upload a photo or type ingredients manually",
    details: [
      "📸 AI Extraction: 99% accuracy with any product photo",
      "⌨️ Manual Entry: Paste ingredient lists directly",
      "Works with face, body, and hair care products"
    ],
    icon: Camera,
  },
  {
    title: "Understanding Your Results",
    description: "Get detailed insights on every product",
    details: [
      "See which ingredients work FOR and AGAINST your skin",
      "Get personalized recommendations for better alternatives",
      "Learn about potential ingredient conflicts"
    ],
    icon: BarChart3,
  },
  {
    title: "Build Your Routine",
    description: "Track and optimize your entire skincare stack",
    details: [
      "Add products to morning/evening routines",
      "Check for ingredient conflicts across products",
      "Get layering order recommendations"
    ],
    icon: CalendarCheck,
  },
  {
    title: "Your Profile Evolves With You",
    description: "Update anytime as your skin changes",
    details: [
      "Change skin type and concerns in Profile settings",
      "Your EpiQ scores automatically update",
      "Track how seasons affect your skin needs"
    ],
    icon: User,
  },
];

export const AppWalkthrough = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [open, setOpen] = useState(true);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleFinish();
    }
  };

  const handleSkip = async () => {
    await markWalkthroughComplete();
    setOpen(false);
    navigate("/upload");
  };

  const handleFinish = async () => {
    await markWalkthroughComplete();
    setOpen(false);
    navigate("/upload");
  };

  const markWalkthroughComplete = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("profiles")
        .update({ has_seen_walkthrough: true })
        .eq("id", user.id);
    } catch (error) {
      console.error("Error marking walkthrough as complete:", error);
    }
  };

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Icon className="w-10 h-10 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        {/* Details Section */}
        {currentStepData.details && (
          <Card className="p-4 bg-accent/5 space-y-3">
            {currentStepData.details.map((detail, index) => (
              <div key={index} className="flex items-start gap-3">
                <Shield className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-sm text-muted-foreground">{detail}</p>
              </div>
            ))}
          </Card>
        )}

        {/* Progress Indicator */}
        <div className="space-y-2">
          <div className="flex justify-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-2 rounded-full transition-all ${
                  index === currentStep
                    ? "bg-primary w-8"
                    : index < currentStep
                    ? "bg-primary/50"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>

        {/* Navigation */}
        <DialogFooter className="flex-col sm:flex-row justify-between gap-3">
          <div className="flex gap-2 w-full sm:w-auto">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex-1 sm:flex-initial"
              >
                Previous
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={handleSkip}
              className="text-muted-foreground flex-1 sm:flex-initial"
            >
              Skip Tour
            </Button>
          </div>
          <Button onClick={handleNext} className="w-full sm:w-auto">
            {isLastStep ? "Get Started 🚀" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};