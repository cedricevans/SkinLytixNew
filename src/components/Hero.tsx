import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Hexagon } from "lucide-react";
import heroBackground from "@/assets/hero-background.jpg";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section id="home" className="relative min-h-[85vh] md:min-h-[90vh] flex flex-col overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBackground}
          alt="Scientific molecular structures representing skincare ingredients"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-accent/10" />
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
        {/* Trust Badge */}
        <button 
          onClick={() => {
            document.getElementById('cta-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-success/20 rounded-full mb-8 animate-fade-in-up border border-success/30 hover:bg-success/30 transition-colors cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-success-foreground" />
          <span className="text-sm font-subheading font-medium text-success-foreground">
            Now Open - Free Beta Access
          </span>
        </button>

        {/* Main Headline */}
        <h1 className="text-4xl md:text-7xl font-heading font-bold mb-4 md:mb-6 leading-tight animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Stop Guessing.
          <br />
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            Start Understanding
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-2xl font-subheading text-muted-foreground max-w-3xl mx-auto mb-8 md:mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          70% of shoppers find ingredient lists confusing. SkinLytix decodes them instantly, 
          optimizes your routine, and helps you stop wasting money on products that don't work together. Get started free today.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button 
            variant="cta" 
            size="lg" 
            className="text-base px-8 py-5 md:py-6 h-auto w-full sm:w-auto"
            onClick={() => navigate('/auth')}
          >
            Start Your First Analysis
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="text-base px-8 py-5 md:py-6 h-auto w-full sm:w-auto border-primary/30 hover:border-primary"
            onClick={() => {
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            See How It Works
          </Button>
        </div>

        {/* Social Proof */}
        <p className="mt-12 text-sm font-body text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          Join hundreds of beauty enthusiasts making smarter skincare decisions
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
