import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CTASection = () => {
  const navigate = useNavigate();

  return (
    <section id="cta-section" className="py-12 md:py-24 px-4 md:px-6 bg-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-40 h-40 bg-cta rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-10 right-10 w-56 h-56 bg-primary-foreground rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground/20 rounded-full mb-6 animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-subheading font-medium text-primary-foreground">
            Free Beta - Sign Up Today
          </span>
        </div>

        <h2 className="text-3xl md:text-5xl font-heading font-bold text-primary-foreground mb-4 md:mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Ready to Stop Wasting Money on Skincare?
        </h2>

        <p className="text-lg md:text-xl font-subheading text-primary-foreground/90 mb-8 md:mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          Join beauty enthusiasts who analyze before they buy. Start analyzing your products for free—no waiting, no credit card required.
        </p>

        <div className="flex justify-center items-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button 
            variant="cta" 
            size="lg" 
            className="touch-target text-base px-8 py-5 md:py-6 h-auto w-full sm:w-auto bg-cta hover:bg-cta/90"
            onClick={() => navigate('/auth')}
          >
            Get Started Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
        </div>

        <p className="mt-8 text-sm font-body text-primary-foreground/70 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          No credit card required • Instant access • Free during beta
        </p>
      </div>
    </section>
  );
};

export default CTASection;
