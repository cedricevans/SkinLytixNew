import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const CTASection = () => {
  return (
    <section className="py-24 px-6 bg-gradient-hero relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-10 left-10 w-40 h-40 bg-cta rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-10 right-10 w-56 h-56 bg-primary-foreground rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: "1s" }} />
      </div>

      <div className="max-w-4xl mx-auto text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-foreground/20 rounded-full mb-6 animate-fade-in-up">
          <Sparkles className="w-4 h-4 text-primary-foreground" />
          <span className="text-sm font-subheading font-medium text-primary-foreground">
            Beta Access Now Open
          </span>
        </div>

        <h2 className="text-4xl md:text-5xl font-heading font-bold text-primary-foreground mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Ready to Stop Wasting Money on Skincare?
        </h2>

        <p className="text-xl font-subheading text-primary-foreground/90 mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          Join beauty enthusiasts who analyze before they buy. Free during beta—help us build the tool you've always needed.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button variant="cta" size="lg" className="text-base px-8 py-6 h-auto bg-cta hover:bg-cta/90">
            Start Your First Analysis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="text-base px-8 py-6 h-auto border-primary-foreground/30 hover:border-primary-foreground hover:bg-primary-foreground/10 text-primary-foreground"
          >
            Learn More About Beta
          </Button>
        </div>

        <p className="mt-8 text-sm font-body text-primary-foreground/70 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          No credit card required • Free API access • Help shape the future of skincare intelligence
        </p>
      </div>
    </section>
  );
};

export default CTASection;
