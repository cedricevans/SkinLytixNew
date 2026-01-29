import { useEffect } from "react";
import QuickLinkLayout, { PinkAnchor, SectionCard } from "@/components/QuickLinkLayout";

const FAQS = [
  {
    question: 'Can I really analyze unlimited products for free?',
    answer:
      'Yes! Free users get unlimited analyses with the core EpiQ Score. Premium and Pro unlock deeper breakdowns, batch runs, and AI-powered explanations.',
  },
  {
    question: "What's the difference between Premium and Pro?",
    answer:
      'Premium is tailored for dedicated enthusiasts wanting richer insight. Pro is for professionals who need limitless access, batch analysis, and priority support.',
  },
  {
    question: 'How does the 7-day free trial work?',
    answer:
      "Start your trial with no payment required, enjoy every Premium feature for 7 days, and cancel any time from your profile before billing begins.",
  },
  {
    question: 'What is an EpiQ Score?',
    answer:
      "EpiQ blends safety, formulation quality, and profile match into one score. It was validated with partners in cosmetic science to keep it grounded in evidence.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      "Absolutely. No contracts, no commitments—cancel from your profile and keep access until the end of the billing period.",
  },
];

const Faq = () => {
  useEffect(() => {
    document.title = "FAQ — SkinLytix";
  }, []);

  return (
    <QuickLinkLayout
      title="Frequently Asked Questions"
      subtitle="All the answers you need about pricing, trials, and how SkinLytix keeps skincare logical."
      highlight="Support"
    >
      <SectionCard title="FAQ" variant="dark">
        <div className="space-y-3">
          {FAQS.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-2xl border border-border bg-white p-4 shadow-sm transition hover:border-cta/60"
            >
              <summary
                className="font-medium text-base cursor-pointer list-none"
                style={{ color: "#000" }}
              >
                {faq.question}
              </summary>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: "#000" }}>
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </SectionCard>
      <SectionCard title="Need More Help?">
        <p>
          Our team answers every message personally within 2 business days. Email <PinkAnchor href="mailto:hello@skinlytix.com" className="underline">hello@skinlytix.com</PinkAnchor> or ping us on social.
        </p>
        <p className="text-sm text-muted-foreground">
          You’re building SkinLytix with us—share feedback, features, or even your favorite dupes.
        </p>
      </SectionCard>
    </QuickLinkLayout>
  );
};

export default Faq;
