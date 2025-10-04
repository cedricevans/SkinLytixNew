import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import heroBackground from "@/assets/hero-background.jpg";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroBackground}
          alt="Scientific molecular structures representing skincare ingredients"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/95 to-accent/10" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-20 text-center">
        {/* Trust Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-success/20 rounded-full mb-8 animate-fade-in-up border border-success/30">
          <Sparkles className="w-4 h-4 text-success-foreground" />
          <span className="text-sm font-subheading font-medium text-success-foreground">
            Beta Access Coming Soon
          </span>
        </div>

        {/* Main Headline */}
        <h1 className="text-5xl md:text-7xl font-heading font-bold mb-6 leading-tight animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          Stop Guessing.
          <br />
          <span className="bg-gradient-hero bg-clip-text text-transparent">
            Start Understanding
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl font-subheading text-muted-foreground max-w-3xl mx-auto mb-12 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          70% of shoppers find ingredient lists confusing. SkinLytix decodes them instantly, 
          optimizes your routine, and helps you stop wasting money on products that don't work together.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <Button 
            variant="cta" 
            size="lg" 
            className="text-base px-8 py-6 h-auto"
            onClick={() => navigate('/auth')}
          >
            Analyze Your Products Free
            <ArrowRight className="ml-2 w-5 h-5" />
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            className="text-base px-8 py-6 h-auto border-primary/30 hover:border-primary"
            onClick={() => {
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            See How It Works
          </Button>
        </div>

        {/* Social Proof */}
        <p className="mt-12 text-sm font-body text-muted-foreground animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          Trusted by beauty enthusiasts who refuse to waste money on trial and error
        </p>
      </div>

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 w-24 h-24 bg-accent/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-cta/10 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />
    </section>
  );
};

export default Hero;
