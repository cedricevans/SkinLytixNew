import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Droplets, Wind, Flame, Shield, Sparkles, User, Shirt, Scissors, HelpCircle } from "lucide-react";
import { useTracking, trackEvent } from "@/hooks/useTracking";
import { SkinTypeQuiz } from "@/components/SkinTypeQuiz";
import indianManProfessional from "@/assets/diverse/indian-man-professional.jpg";
import hyperpigmentationCare from "@/assets/diverse/hyperpigmentation-care.jpg";

const faceSkinTypes = [
  { value: "oily", label: "Oily", icon: Droplets, description: "Shiny, prone to breakouts" },
  { value: "dry", label: "Dry", icon: Wind, description: "Tight, flaky, rough texture" },
  { value: "combination", label: "Combination", icon: Flame, description: "Oily T-zone, dry cheeks" },
  { value: "sensitive", label: "Sensitive", icon: Shield, description: "Easily irritated, reactive" },
  { value: "normal", label: "Normal", icon: Sparkles, description: "Balanced, healthy glow" },
];

const bodySkinTypes = [
  { value: "normal", label: "Normal", description: "Generally smooth and balanced" },
  { value: "dry", label: "Dry", description: "Rough patches, especially elbows/knees" },
  { value: "sensitive", label: "Sensitive", description: "Easily irritated or reactive" },
  { value: "oily", label: "Oily", description: "Prone to body acne" },
];

const scalpTypes = [
  { value: "normal", label: "Normal", description: "Balanced, no major issues" },
  { value: "oily", label: "Oily", description: "Gets greasy quickly" },
  { value: "dry", label: "Dry", description: "Flaky, tight feeling" },
  { value: "sensitive", label: "Sensitive", description: "Easily irritated" },
  { value: "dandruff-prone", label: "Dandruff-Prone", description: "Frequent flakes" },
];

const faceConcerns = [
  { value: "acne", label: "Acne & Breakouts" },
  { value: "aging", label: "Fine Lines & Aging" },
  { value: "hyperpigmentation", label: "Dark Spots & Hyperpigmentation" },
  { value: "redness", label: "Redness & Rosacea" },
  { value: "dryness", label: "Dryness & Dehydration" },
  { value: "dullness", label: "Dullness & Uneven Texture" },
  { value: "pores", label: "Large Pores" },
  { value: "dark_circles", label: "Dark Circles" },
];

const bodyConcerns = [
  { value: "body-acne", label: "Body Acne (back/chest)" },
  { value: "eczema", label: "Eczema / Dermatitis" },
  { value: "keratosis-pilaris", label: "Keratosis Pilaris (bumpy skin)" },
  { value: "dry-hands-feet", label: "Dry Hands/Feet" },
  { value: "body-odor", label: "Body Odor Sensitivity" },
  { value: "ingrown-hairs", label: "Ingrown Hairs / Razor Burn" },
];

const hairConcerns = [
  { value: "dandruff", label: "Dandruff" },
  { value: "oily-scalp", label: "Oily Scalp" },
  { value: "dry-scalp", label: "Dry/Itchy Scalp" },
  { value: "hair-thinning", label: "Hair Thinning" },
  { value: "scalp-sensitivity", label: "Scalp Sensitivity" },
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  useTracking('onboarding');
  const [step, setStep] = useState(0);
  
  // Step 0: Product preferences (pre-select face)
  const [productPreferences, setProductPreferences] = useState({ face: true, body: false, hair: false });
  
  // Step 1: Skin types
  const [faceSkinType, setFaceSkinType] = useState<"oily" | "dry" | "combination" | "sensitive" | "normal" | "">("");
  const [bodySkinType, setBodySkinType] = useState<string>("");
  const [scalpType, setScalpType] = useState<string>("");
  
  // Step 2: Concerns
  const [selectedFaceConcerns, setSelectedFaceConcerns] = useState<string[]>([]);
  const [selectedBodyConcerns, setSelectedBodyConcerns] = useState<string[]>([]);
  const [selectedHairConcerns, setSelectedHairConcerns] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [showSkinTypeQuiz, setShowSkinTypeQuiz] = useState(false);
  const [quizType, setQuizType] = useState<"face" | "body" | "scalp">("face");

  const handleProductPrefToggle = (type: 'face' | 'body' | 'hair') => {
    setProductPreferences(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const handleFaceConcernToggle = (concern: string) => {
    setSelectedFaceConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const handleBodyConcernToggle = (concern: string) => {
    setSelectedBodyConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const handleHairConcernToggle = (concern: string) => {
    setSelectedHairConcerns((prev) =>
      prev.includes(concern) ? prev.filter((c) => c !== concern) : [...prev, concern]
    );
  };

  const getTotalSteps = () => {
    return 3; // Always 3 steps
  };

  const canProceedFromStep = (currentStep: number) => {
    if (currentStep === 0) {
      return productPreferences.face || productPreferences.body || productPreferences.hair;
    }
    if (currentStep === 1) {
      if (productPreferences.face && !faceSkinType) return false;
      if (productPreferences.body && !bodySkinType) return false;
      if (productPreferences.hair && !scalpType) return false;
      return true;
    }
    return true;
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const allConcerns = [...selectedFaceConcerns, ...selectedBodyConcerns, ...selectedHairConcerns];

      const { error } = await supabase
        .from("profiles")
        .update({
          skin_type: faceSkinType || null,
          skin_concerns: selectedFaceConcerns,
          body_concerns: selectedBodyConcerns,
          scalp_type: scalpType || null,
          product_preferences: productPreferences,
          is_profile_complete: true,
        })
        .eq("id", user.id);

      if (error) throw error;

      trackEvent({
        eventName: 'onboarding_completed',
        eventCategory: 'onboarding',
        eventProperties: { 
          productPreferences,
          faceSkinType,
          bodySkinType,
          scalpType,
          totalConcerns: allConcerns.length
        }
      });

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
      <div className="w-full max-w-5xl grid lg:grid-cols-5 gap-8 items-start">
        {/* Left: Decorative Image (Desktop only) */}
        <div className="hidden lg:block lg:col-span-2">
          <div className="sticky top-12 space-y-6">
            <div className="rounded-2xl overflow-hidden shadow-strong">
              <img 
                src={step < 2 ? indianManProfessional : hyperpigmentationCare} 
                alt={step < 2 ? "South Asian man reviewing skincare data" : "Black woman caring for her skin"}
                className="w-full h-auto object-cover"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {step === 0 && "Personalized for every skin tone and type"}
                {step === 1 && "Understanding your unique skin needs"}
                {step === 2 && "Your concerns matter to us"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Right: Form Card */}
        <Card className="w-full lg:col-span-3 p-8">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold">Complete Your Profile</h1>
            <div className="flex items-center gap-2">
              {/* Progress Indicator */}
              <div className="flex items-center gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-8 rounded-full transition-all ${
                      i === step ? 'bg-primary' : i < step ? 'bg-primary/60' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground ml-2">
                {step === 0 && "~30 sec"}
                {step === 1 && "~45 sec"}
                {step === 2 && "~1 min"}
              </span>
            </div>
          </div>
          <p className="text-muted-foreground">
            Help us personalize your EpiQ scores based on your unique needs
          </p>
        </div>

        {/* Step 0: Product Type Selection */}
        {step === 0 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">What products do you want to analyze?</h2>
            <p className="text-sm text-muted-foreground">Select all that apply</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button
                onClick={() => handleProductPrefToggle('face')}
                className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                  productPreferences.face ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <User className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Face Care</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Cleansers, serums, moisturizers
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleProductPrefToggle('body')}
                className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                  productPreferences.body ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Shirt className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Body Care</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lotions, washes, deodorants
                    </p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handleProductPrefToggle('hair')}
                className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                  productPreferences.hair ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <Scissors className="w-8 h-8 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Hair Care</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Shampoos, conditioners, treatments
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={() => {
                  trackEvent({
                    eventName: 'onboarding_step_0_completed',
                    eventCategory: 'onboarding',
                    eventProperties: { productPreferences }
                  });
                  setStep(1);
                }}
                disabled={!canProceedFromStep(0)}
                size="lg"
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {/* Step 1: Skin/Scalp Types */}
        {step === 1 && (
          <div className="space-y-8">
            {productPreferences.face && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">What's your facial skin type?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {faceSkinTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <button
                        key={type.value}
                        onClick={() => setFaceSkinType(type.value as typeof faceSkinType)}
                        className={`p-6 border-2 rounded-lg transition-all hover:border-primary ${
                          faceSkinType === type.value ? "border-primary bg-primary/5" : "border-border"
                        }`}
                      >
                        <div className="flex flex-col items-center text-center space-y-3">
                          <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                            <Icon className="w-6 h-6 text-accent" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{type.label}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  
                  {/* Not Sure Option */}
                  <button
                    onClick={() => {
                      setQuizType("face");
                      setShowSkinTypeQuiz(true);
                    }}
                    className="p-6 border-2 border-dashed rounded-lg transition-all hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex flex-col items-center text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <HelpCircle className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Not Sure?</h3>
                        <p className="text-xs text-muted-foreground mt-1">Take our 5-question quiz</p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {productPreferences.body && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">What's your body skin type?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bodySkinTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setBodySkinType(type.value)}
                      className={`p-4 border-2 rounded-lg transition-all hover:border-primary text-left ${
                        bodySkinType === type.value ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <h3 className="font-semibold">{type.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {productPreferences.hair && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">What's your scalp type?</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {scalpTypes.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setScalpType(type.value)}
                      className={`p-4 border-2 rounded-lg transition-all hover:border-primary text-left ${
                        scalpType === type.value ? "border-primary bg-primary/5" : "border-border"
                      }`}
                    >
                      <h3 className="font-semibold">{type.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
              <Button onClick={() => setStep(0)} variant="outline" size="lg" className="w-full sm:w-auto">
                Back
              </Button>
              <Button
                onClick={() => {
                  trackEvent({
                    eventName: 'onboarding_step_1_completed',
                    eventCategory: 'onboarding',
                    eventProperties: { faceSkinType, bodySkinType, scalpType }
                  });
                  setStep(2);
                }}
                disabled={!canProceedFromStep(1)}
                size="lg"
                className="w-full sm:w-auto"
              >
                Continue
              </Button>
            </div>

            {/* Skin Type Quiz Dialog */}
            <SkinTypeQuiz
              open={showSkinTypeQuiz}
              onClose={() => setShowSkinTypeQuiz(false)}
              onComplete={(skinType) => {
                setFaceSkinType(skinType);
                setShowSkinTypeQuiz(false);
                toast({
                  title: "Skin Type Selected!",
                  description: `Your skin type has been set to ${skinType}.`,
                });
              }}
              quizType={quizType}
            />
          </div>
        )}

        {/* Step 2: Concerns */}
        {step === 2 && (
          <div className="space-y-8">
            <div>
              <h2 className="text-xl font-semibold mb-2">What are your main concerns?</h2>
              <p className="text-sm text-muted-foreground">Select all that apply (optional but recommended)</p>
            </div>

            {productPreferences.face && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Face Concerns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {faceConcerns.map((concern) => (
                    <div
                      key={concern.value}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        id={`face-${concern.value}`}
                        checked={selectedFaceConcerns.includes(concern.value)}
                        onCheckedChange={() => handleFaceConcernToggle(concern.value)}
                      />
                      <label
                        htmlFor={`face-${concern.value}`}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {concern.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productPreferences.body && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Body Concerns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bodyConcerns.map((concern) => (
                    <div
                      key={concern.value}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        id={`body-${concern.value}`}
                        checked={selectedBodyConcerns.includes(concern.value)}
                        onCheckedChange={() => handleBodyConcernToggle(concern.value)}
                      />
                      <label
                        htmlFor={`body-${concern.value}`}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {concern.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productPreferences.hair && (
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Hair/Scalp Concerns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hairConcerns.map((concern) => (
                    <div
                      key={concern.value}
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent/5 transition-colors"
                    >
                      <Checkbox
                        id={`hair-${concern.value}`}
                        checked={selectedHairConcerns.includes(concern.value)}
                        onCheckedChange={() => handleHairConcernToggle(concern.value)}
                      />
                      <label
                        htmlFor={`hair-${concern.value}`}
                        className="text-sm font-medium cursor-pointer flex-1"
                      >
                        {concern.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4">
              <Button onClick={() => setStep(1)} variant="outline" size="lg" className="w-full sm:w-auto">
                Back
              </Button>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => {
                    trackEvent({
                      eventName: 'onboarding_step_2_skipped',
                      eventCategory: 'onboarding',
                      eventProperties: {}
                    });
                    handleComplete();
                  }} 
                  variant="outline"
                  disabled={isLoading} 
                  size="lg" 
                  className="w-full sm:w-auto"
                >
                  Skip & Finish
                </Button>
                <Button onClick={handleComplete} disabled={isLoading} size="lg" className="w-full sm:w-auto">
                  {isLoading ? "Saving..." : "Complete Profile"}
                </Button>
              </div>
            </div>
          </div>
        )}
        </Card>
      </div>
    </main>
  );
};

export default Onboarding;
