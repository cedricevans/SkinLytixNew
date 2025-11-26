import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useTracking, trackEvent } from "@/hooks/useTracking";

const BetaFeedback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  useTracking('beta-feedback');
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isEmailReadOnly, setIsEmailReadOnly] = useState(false);

  // Form fields
  const [motivation, setMotivation] = useState("");
  const [reportClarity, setReportClarity] = useState("");
  const [mostHelpfulFeature, setMostHelpfulFeature] = useState("");
  const [frustrations, setFrustrations] = useState("");
  const [perceivedAccuracy, setPerceivedAccuracy] = useState("");
  const [missingFeature, setMissingFeature] = useState("");
  const [pmfDisappointment, setPmfDisappointment] = useState("");
  const [pmfSubstitute, setPmfSubstitute] = useState("");
  const [pmfCoreValue, setPmfCoreValue] = useState("");
  const [pmfWillingToPay, setPmfWillingToPay] = useState("");
  const [pmfPriceExpectation, setPmfPriceExpectation] = useState("");
  const [wantsSession, setWantsSession] = useState(false);

  useEffect(() => {
    // Pre-fill email if user is logged in
    const fetchUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmail(user.email);
        setIsEmailReadOnly(true);
      }
    };
    fetchUserEmail();
  }, []);

  const validateStep1 = () => {
    if (!motivation.trim()) {
      toast({ title: "Please tell us what motivated you to try SkinLytix", variant: "destructive" });
      return false;
    }
    if (!reportClarity) {
      toast({ title: "Please select how easy the report was to understand", variant: "destructive" });
      return false;
    }
    if (!mostHelpfulFeature.trim()) {
      toast({ title: "Please share which feature you found most helpful", variant: "destructive" });
      return false;
    }
    if (!frustrations.trim()) {
      toast({ title: "Please share any frustrations (or write 'none')", variant: "destructive" });
      return false;
    }
    if (!perceivedAccuracy) {
      toast({ title: "Please rate the accuracy of the ingredient data", variant: "destructive" });
      return false;
    }
    if (!missingFeature.trim()) {
      toast({ title: "Please share a feature you wish SkinLytix had", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!pmfDisappointment) {
      toast({ title: "Please tell us how you'd feel if SkinLytix was unavailable", variant: "destructive" });
      return false;
    }
    if (!pmfSubstitute.trim()) {
      toast({ title: "Please share what you'd use instead", variant: "destructive" });
      return false;
    }
    if (!pmfCoreValue.trim()) {
      toast({ title: "Please share the main value SkinLytix gives you", variant: "destructive" });
      return false;
    }
    if (!pmfWillingToPay) {
      toast({ title: "Please let us know if you'd be willing to pay", variant: "destructive" });
      return false;
    }
    if ((pmfWillingToPay === "Yes" || pmfWillingToPay === "Maybe") && !pmfPriceExpectation) {
      toast({ title: "Please select a fair monthly price", variant: "destructive" });
      return false;
    }
    if (!wantsSession && wantsSession !== false) {
      toast({ title: "Please let us know about the virtual feedback session", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setCurrentStep(2);
      trackEvent({
        eventName: 'beta_feedback_step_completed',
        eventCategory: 'feedback',
        eventProperties: { step: 1 }
      });
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('beta_feedback').insert({
        user_id: user?.id || null,
        email: userEmail || null,
        motivation,
        report_clarity: reportClarity,
        most_helpful_feature: mostHelpfulFeature,
        frustrations,
        perceived_accuracy: perceivedAccuracy,
        missing_feature: missingFeature,
        pmf_disappointment: pmfDisappointment,
        pmf_substitute: pmfSubstitute,
        pmf_core_value: pmfCoreValue,
        pmf_willing_to_pay: pmfWillingToPay,
        pmf_price_expectation: pmfPriceExpectation || null,
        wants_session: wantsSession,
      });

      if (error) throw error;

      trackEvent({
        eventName: 'beta_feedback_submitted',
        eventCategory: 'feedback',
        eventProperties: {
          hasEmail: !!userEmail,
          willingToPay: pmfWillingToPay,
          wantsSession
        }
      });

      setSubmitted(true);
    } catch (error) {
      console.error('BETA_FEEDBACK_ERROR:', error);
      toast({
        title: "Submission Failed",
        description: "Could not submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4 flex items-center justify-center">
        <Card className="max-w-2xl w-full p-8 text-center">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-3">Thank you for helping shape SkinLytix 💚</h1>
          <p className="text-muted-foreground mb-6">
            Your feedback directly influences what we build next. We're so grateful you're here.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/upload')} size="lg">
              Back to Analyzer
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} size="lg">
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => currentStep === 1 ? navigate(-1) : setCurrentStep(1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">Help Us Build SkinLytix With You</h1>
            <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full">
              Beta Feedback – v1
            </span>
          </div>
          <p className="text-muted-foreground">
            This takes under 3 minutes. We actually read every response. 💚
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-2 ${currentStep === 1 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 1 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
            }`}>
              1
            </div>
            <span className="font-medium">Experience</span>
          </div>
          <div className="w-12 h-px bg-border" />
          <div className={`flex items-center gap-2 ${currentStep === 2 ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
              currentStep === 2 ? 'border-primary bg-primary text-primary-foreground' : 'border-muted bg-background'
            }`}>
              2
            </div>
            <span className="font-medium">Big Picture & PMF</span>
          </div>
        </div>

        {/* Step 1: Experience */}
        {currentStep === 1 && (
          <Card className="p-8 space-y-8">
            <div className="space-y-3">
              <Label htmlFor="motivation" className="text-base font-semibold">
                What motivated you to try SkinLytix? *
              </Label>
              <Textarea
                id="motivation"
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Share what brought you here..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">
                How easy was it to understand the ingredient report you received? *
              </Label>
              <RadioGroup value={reportClarity} onValueChange={setReportClarity}>
                {["Very Easy", "A little Easy", "Moderate", "A little Difficult", "Very Difficult"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`clarity-${option}`} />
                    <Label htmlFor={`clarity-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="helpful" className="text-base font-semibold">
                Which feature did you find most helpful — and why? *
              </Label>
              <Textarea
                id="helpful"
                value={mostHelpfulFeature}
                onChange={(e) => setMostHelpfulFeature(e.target.value)}
                placeholder="Tell us which feature stood out and why..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="frustrations" className="text-base font-semibold">
                Was there anything confusing or frustrating about your experience? *
              </Label>
              <Textarea
                id="frustrations"
                value={frustrations}
                onChange={(e) => setFrustrations(e.target.value)}
                placeholder="Be honest! This helps us improve. Or write 'none' if everything was smooth."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">
                How accurate did the ingredient data feel compared to your expectations? *
              </Label>
              <RadioGroup value={perceivedAccuracy} onValueChange={setPerceivedAccuracy}>
                {[
                  "Much less accurate than I expected",
                  "A little less accurate than I expected",
                  "About what I expected",
                  "A little more accurate than I expected",
                  "Much more accurate than I expected"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`accuracy-${option}`} />
                    <Label htmlFor={`accuracy-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="missing" className="text-base font-semibold">
                What's one feature you wish SkinLytix had? *
              </Label>
              <Textarea
                id="missing"
                value={missingFeature}
                onChange={(e) => setMissingFeature(e.target.value)}
                placeholder="Dream big! What would make this even better?"
                rows={4}
                className="resize-none"
              />
            </div>

            <Button onClick={handleNext} size="lg" className="w-full">
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Card>
        )}

        {/* Step 2: PMF & Monetization */}
        {currentStep === 2 && (
          <Card className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-base font-semibold">
                How would you feel if SkinLytix was no longer available? *
              </Label>
              <RadioGroup value={pmfDisappointment} onValueChange={setPmfDisappointment}>
                {[
                  "Very disappointed",
                  "Somewhat disappointed",
                  "Not disappointed",
                  "I didn't use it enough to care"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`pmf-${option}`} />
                    <Label htmlFor={`pmf-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label htmlFor="substitute" className="text-base font-semibold">
                What would you use instead if SkinLytix wasn't available? *
              </Label>
              <Textarea
                id="substitute"
                value={pmfSubstitute}
                onChange={(e) => setPmfSubstitute(e.target.value)}
                placeholder="Tell us about your alternatives..."
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="coreValue" className="text-base font-semibold">
                In your own words, what is the main value SkinLytix gives you? *
              </Label>
              <Textarea
                id="coreValue"
                value={pmfCoreValue}
                onChange={(e) => setPmfCoreValue(e.target.value)}
                placeholder="What problem does SkinLytix solve for you?"
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Once the beta ends, would you be willing to pay for SkinLytix? *
              </Label>
              <RadioGroup value={pmfWillingToPay} onValueChange={setPmfWillingToPay}>
                {["Yes", "Maybe", "No"].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <RadioGroupItem value={option} id={`pay-${option}`} />
                    <Label htmlFor={`pay-${option}`} className="font-normal cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Conditional Q11 */}
            {(pmfWillingToPay === "Yes" || pmfWillingToPay === "Maybe") && (
              <div className="space-y-3">
                <Label className="text-base font-semibold">
                  What would feel like a fair monthly price for the value you've experienced so far? *
                </Label>
                <RadioGroup value={pmfPriceExpectation} onValueChange={setPmfPriceExpectation}>
                  {["$3–5", "$5–10", "$10–15", "$15+"].map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`price-${option}`} />
                      <Label htmlFor={`price-${option}`} className="font-normal cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            )}

            <div className="space-y-3">
              <Label className="text-base font-semibold">
                Would you like to be a part of our virtual feedback session with our founder? *
              </Label>
              <RadioGroup value={wantsSession ? "yes" : "no"} onValueChange={(val) => setWantsSession(val === "yes")}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="yes" id="session-yes" />
                  <Label htmlFor="session-yes" className="font-normal cursor-pointer">
                    Yes, Count Me In!
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="no" id="session-no" />
                  <Label htmlFor="session-no" className="font-normal cursor-pointer">
                    Not Right Now
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {!isEmailReadOnly && (
              <div className="space-y-3">
                <Label htmlFor="email" className="text-base font-semibold">
                  Email (Optional - for follow-up)
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="your@email.com"
                />
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(1)} size="lg" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} size="lg" className="w-full">
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BetaFeedback;
