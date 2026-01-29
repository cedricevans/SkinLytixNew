import { useEffect } from "react";
import QuickLinkLayout, { SectionCard } from "@/components/QuickLinkLayout";

const Connect = () => {
  useEffect(() => {
    document.title = "Connect — SkinLytix";
  }, []);

  return (
    <QuickLinkLayout
      title="Connect With SkinLytix"
      subtitle="Need product support, partnership ideas, or just want to share your skin journey? We’re listening."
      highlight="Connect"
    >
      <SectionCard title="Reach the Team">
        <p>We respond to every message personally in under two business days. Choose the channel that feels easiest.</p>
        <div className="grid gap-6 md:grid-cols-3">
          <article className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Email</p>
            <a href="mailto:hello@skinlytix.com" className="text-base text-primary-foreground font-semibold underline">
              hello@skinlytix.com
            </a>
          </article>
          <article className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Instagram</p>
            <a
              href="https://instagram.com/skinlytix"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-primary-foreground font-semibold underline"
            >
              @skinlytix
            </a>
          </article>
          <article className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Threads</p>
            <a
              href="https://www.threads.com/@skinlytix"
              target="_blank"
              rel="noopener noreferrer"
              className="text-base text-primary-foreground font-semibold underline"
            >
              Threads Community
            </a>
          </article>
        </div>
      </SectionCard>

      <SectionCard title="Our Commitment">
        <p>
          SkinLytix blends engineers, scientists, and skincare enthusiasts who care deeply about transparency.
          We partner with academic programs so every answer is grounded in expertise.
        </p>
        <p>
          While we promise a 2 business day response, if we need more time we’ll always tell you when to expect
          the follow-up. Your feedback shapes the roadmap.
        </p>
      </SectionCard>

      <SectionCard title="Stay In The Loop">
        <p>Subscribe to release notes or follow our socials to see new features, community highlights, and dupe discoveries.</p>
      </SectionCard>
    </QuickLinkLayout>
  );
};

export default Connect;
