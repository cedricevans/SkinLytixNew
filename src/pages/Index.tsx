import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import LiveTrustSignals from "@/components/LiveTrustSignals";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import MicroEngagement from "@/components/MicroEngagement";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import PricingPreview from "@/components/PricingPreview";
import IngredientPreviewWidget from "@/components/IngredientPreviewWidget";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

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
    <main className="min-h-screen">
      <Hero />
      <MicroEngagement />
      <LiveTrustSignals />
      <IngredientPreviewWidget />
      <Features />
      <HowItWorks />
      <PricingPreview />
      <CTASection />
      <Footer />
      <ExitIntentPopup />
    </main>
  );
};

export default Index;
