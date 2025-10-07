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
import { Camera, CalendarCheck, User, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WalkthroughStep {
  title: string;
  description: string;
  icon: React.ElementType;
}

const steps: WalkthroughStep[] = [
  {
    title: "Welcome to SkinLytix! 🎉",
    description: "Let's take a quick tour of the key features that will help you make smarter skincare decisions.",
    icon: Sparkles,
  },
  {
    title: "Analyze Any Product",
    description: "Upload a photo or enter ingredients to get an instant EpiQ score and personalized recommendations for any skincare product.",
    icon: Camera,
  },
  {
    title: "Track Your Routine",
    description: "Build and manage your skincare routine with product tracking, usage frequency, and optimization insights.",
    icon: CalendarCheck,
  },
  {
    title: "Manage Your Profile",
    description: "Update your skin type and concerns anytime to keep your EpiQ scores personalized to your needs.",
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-8 h-8 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center text-xl">
            {currentStepData.title}
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-2 py-4">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-all ${
                index === currentStep
                  ? "bg-primary w-6"
                  : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-muted-foreground"
          >
            Skip Tour
          </Button>
          <Button onClick={handleNext}>
            {isLastStep ? "Get Started" : "Next"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};