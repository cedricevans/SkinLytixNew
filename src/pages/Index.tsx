import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navigation from "@/components/Navigation";
import BrandName from "@/components/landing/BrandName";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import FreeChecklist from "@/components/landing/FreeChecklist";
import HowItWorks from "@/components/landing/HowItWorks";
import SocialProof from "@/components/landing/SocialProof";
import Testimonials from "@/components/landing/Testimonials";
import Footer from "@/components/landing/Footer";
import Waitlist from "@/components/landing/Waitlist";
import PricingPreview from "@/components/PricingPreview";

const Index = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        navigate("/home", { replace: true });
      }
    };
    checkSession();
  }, [navigate]);

  return (
    <main className="min-h-screen font-landing">
      <header className="sticky top-0 z-50 w-full bg-azure text-primary-foreground">
        <div className="container mx-auto px-[10px] lg:px-6">
          <div className="flex h-16 items-center justify-between">
            <button
              type="button"
              onClick={() => window.document.getElementById("home")?.scrollIntoView({ behavior: "smooth" })}
              className="font-heading text-xl md:text-2xl font-bold text-primary-foreground hover:text-primary-foreground/80 transition-colors"
              aria-label="SkinLytix home"
            >
              <BrandName />
            </button>
            <Navigation />
          </div>
        </div>
      </header>
      <Hero id="home" />
      <SocialProof />
      <FreeChecklist />
      <ProblemSection id="features" />
      <HowItWorks id="how-it-works" />
      <div id="pricing">
        <PricingPreview />
      </div>
      <Waitlist />
      <Testimonials id="testimonials" />
      <Footer />
    </main>
  );
};

export default Index;
