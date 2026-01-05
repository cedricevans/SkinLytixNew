import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Hexagon } from "lucide-react";
import heroBackground from "@/assets/hero-community.jpg";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { trackEvent } from "@/hooks/useTracking";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBackground}
          alt="Diverse group of people enjoying skincare products together"
          className="w-full h-full object-cover object-center opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/90 via-background/80 to-accent/20" />
      </div>

      {/* Header Bar */}
      <header className="relative z-20 w-full bg-primary shadow-soft">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 md:py-4 flex justify-between items-center">
          <h2 className="text-xl md:text-2xl font-heading font-bold text-primary-foreground">
            SkinLytix
          </h2>
          <Navigation />
        </div>
      </header>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
        {/* Trust Badge - Dynamic */}
        <button 
          onClick={() => {
            document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-success/20 rounded-full mb-8 animate-fade-in-up border border-success/30 hover:bg-success/30 transition-colors cursor-pointer"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-foreground opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-success-foreground"></span>
          </span>
          <span className="text-sm font-subheading font-medium text-success-foreground">
            Expert Validated • Human + AI
          </span>
        </button>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-heading font-bold mb-4 md:mb-6 leading-tight animate-fade-in-up px-4 sm:px-0" style={{ animationDelay: "0.1s" }}>
          Stop Guessing.
          <br />
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            Start Understanding
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-subheading text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-12 animate-fade-in-up px-4 sm:px-0" style={{ animationDelay: "0.2s" }}>
          70% of shoppers find ingredient lists confusing. SkinLytix decodes face, body, and hair products instantly, 
          optimizes your entire personal care routine, and helps you stop wasting money. Get started free today.
        </p>

        {/* CTA Buttons */}
        <div className="flex justify-center items-center animate-fade-in-up px-4 sm:px-0" style={{ animationDelay: "0.3s" }}>
          <Button 
            variant="cta" 
            size="lg" 
            className="touch-target text-base px-6 sm:px-8 py-5 md:py-6 sm:py-5 h-auto w-full sm:w-auto text-lg sm:text-base"
            onClick={() => {
              trackEvent({
                eventName: 'demo_cta_clicked',
                eventCategory: 'engagement',
                eventProperties: { location: 'hero' }
              });
              navigate('/demo-analysis');
            }}
          >
            <span className="text-xl mr-2">🔬</span>
            <span className="hidden sm:inline">Try Demo Analysis - No Sign-Up</span>
            <span className="sm:hidden">Try Demo - No Sign-Up</span>
          </Button>
        </div>

        {/* Social Proof */}
        <p className="mt-12 text-sm font-body text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          Join hundreds of beauty enthusiasts analyzing their entire personal care routine
        </p>
        </div>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-24 h-24 bg-accent/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-cta/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
    </section>
  );
};

export default Hero;
