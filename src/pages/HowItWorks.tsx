import { useEffect } from "react";
import { Scan, Database, Brain, CheckCircle2 } from "lucide-react";
import QuickLinkLayout, { SectionCard, quickLinkAccentColor } from "@/components/QuickLinkLayout";

const steps = [
  {
    icon: Scan,
    title: "Scan Your Products",
    description: "Capture an ingredient list via photo or manual entry. OCR and cleanup happen automatically.",
    time: "30 sec",
  },
  {
    icon: Database,
    title: "Community Database",
    description: "Reuse existing analyses when available and contribute new data when you scan something unique.",
    time: "5 sec",
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description: "We cross-reference molecular data, research papers, and your skin profile to validate safety + efficacy.",
    time: "10 sec",
  },
  {
    icon: CheckCircle2,
    title: "Get Your EpiQ Score",
    description: "See formulation quality, compatibility, and cost-efficiency so you can decide confidently.",
    time: "Instant",
  },
];

const HowItWorks = () => {
  useEffect(() => {
    document.title = "How It Works — SkinLytix";
  }, []);

  return (
    <QuickLinkLayout
      title="How SkinLytix Works"
      subtitle="From scan to science-backed recommendation in under a minute."
      highlight="How It Works"
    >
      <SectionCard title="The Flow">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <article
                key={step.title}
                className="flex flex-col items-start gap-3 rounded-2xl border border-border/60 bg-background/80 p-4 shadow-sm"
              >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary text-primary-foreground">
                    <Icon className="w-6 h-6" style={{ color: quickLinkAccentColor }} />
                  </div>
                <h3 className="text-base font-heading font-semibold">{step.title}</h3>
                <p className="text-sm text-black">{step.description}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
                  ⏱ {step.time}
                </span>
              </article>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="Core Features">
        <ul className="list-disc pl-6 space-y-2 text-black">
          <li>Real-time ingredient scrutiny with the EpiQ Score.</li>
          <li>Personalized profile onboarding for compatibility insights.</li>
          <li>SkinLytixGPT for conversational explanations and routine tips.</li>
          <li>Routine builder + dupe discovery tools for smarter routines.</li>
          <li>Freemium model with Premium & Pro upgrades for power users.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Why Trust SkinLytix">
        <ul className="list-disc pl-6 space-y-2 text-black">
          <li>Rooted in real science—no marketing fluff or paid placements.</li>
          <li>Validated with cosmetic science partners and university programs.</li>
          <li>Privacy-first data handling: your profile belongs to you.</li>
          <li>Transparent process: we explain every safety flag and recommendation.</li>
        </ul>
      </SectionCard>
    </QuickLinkLayout>
  );
};

export default HowItWorks;
