import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import TrustSignals from "@/components/TrustSignals";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import MicroEngagement from "@/components/MicroEngagement";
import ExitIntentPopup from "@/components/ExitIntentPopup";

const Index = () => {
  return (
    <main className="min-h-screen">
      <Hero />
      <MicroEngagement />
      <TrustSignals />
      <Features />
      <HowItWorks />
      <CTASection />
      <Footer />
      <ExitIntentPopup />
    </main>
  );
};

export default Index;
