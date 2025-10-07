import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Droplets, Wind, Flame, Shield, Sparkles } from "lucide-react";

const skinTypes = [
  { value: "oily", label: "Oily", icon: Droplets, description: "Shiny, prone to breakouts" },
  { value: "dry", label: "Dry", icon: Wind, description: "Tight, flaky, rough texture" },
  { value: "combination", label: "Combination", icon: Flame, description: "Oily T-zone, dry cheeks" },
  { value: "sensitive", label: "Sensitive", icon: Shield, description: "Easily irritated, reactive" },
  { value: "normal", label: "Normal", icon: Sparkles, description: "Balanced, healthy glow" },
];

const skinConcerns = [
  { value: "acne", label: "Acne & Breakouts" },
  { value: "aging", label: "Fine Lines & Aging" },
  { value: "hyperpigmentation", label: "Dark Spots & Hyperpigmentation" },
  { value: "redness", label: "Redness & Rosacea" },
  { value: "dryness", label: "Dryness & Dehydration" },
  { value: "dullness", label: "Dullness & Uneven Texture" },
  { value: "pores", label: "Large Pores" },
  { value: "dark_circles", label: "Dark Circles" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [skinType, setSkinType] = useState<"oily" | "dry" | "combination" | "sensitive" | "normal" | "">("");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleConcernToggle = (concern: string) => {
    setSelectedConcerns((prev) =>
      prev.includes(concern)
        ? prev.filter((c) => c !== concern)
        : [...prev, concern]
    );
  };

  const handleComplete = async () => {
    if (!skinType) {
      toast({
        title: "Please select your skin type",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("profiles")
        .update({
          skin_type: skinType,
          skin_concerns: selectedConcerns,
          is_profile_complete: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Profile Complete! 🎉",
        description: "Your personalized EpiQ scores are ready.",
      });

      navigate("/walkthrough");
    } catch (error: any) {
      toast({
        title: "Failed to save profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center py-12 px-4">
      <Card className="w-full max-w-3xl p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Complete Your Profile</h1>
            <span className="text-sm text-muted-foreground">Step {step} of 2</span>
          </div>
          <p className="text-muted-foreground">
            Help us personalize your EpiQ scores based on your unique skin needs
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">What's your skin type?</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {skinTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setSkinType(type.value as "oily" | "dry" | "combination" | "sensitive" | "normal")}
                    className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                      skinType === type.value
                        ? "border-primary bg-primary/5"
                        : "border-border"
                    }`}
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                        <Icon className="w-8 h-8 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{type.label}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {type.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={() => setStep(2)}
                disabled={!skinType}
                size="lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                What are your main skin concerns?
              </h2>
              <p className="text-sm text-muted-foreground">
                Select all that apply (optional but recommended)
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {skinConcerns.map((concern) => (
                <div
                  key={concern.value}
                  className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-accent/5 transition-colors"
                >
                  <Checkbox
                    id={concern.value}
                    checked={selectedConcerns.includes(concern.value)}
                    onCheckedChange={() => handleConcernToggle(concern.value)}
                  />
                  <label
                    htmlFor={concern.value}
                    className="text-sm font-medium cursor-pointer flex-1"
                  >
                    {concern.label}
                  </label>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                size="lg"
              >
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? "Saving..." : "Complete Profile"}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </main>
  );
};

export default Onboarding;
