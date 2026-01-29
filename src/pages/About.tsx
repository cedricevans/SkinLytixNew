import { useEffect } from "react";
import QuickLinkLayout, { PinkLink, SectionCard } from "@/components/QuickLinkLayout";

const About = () => {
  useEffect(() => {
    document.title = "About — SkinLytix";
  }, []);

  return (
    <QuickLinkLayout
      title="About SkinLytix"
      subtitle="We are building the most human, science-backed way to understand skincare ingredients without the overwhelm."
      highlight="About"
    >
      <SectionCard title="Our Mission">
        <p>
          Eliminate the confusion around formulations by delivering personalized, science-backed ingredient analysis in seconds.
        </p>
        <p>
          Every scan bridges AI speed with real expert validation, so you only trust evidence—not paid placements.
        </p>
      </SectionCard>

      <SectionCard title="Where We’re Heading">
        <ul className="list-disc pl-6 space-y-2">
          <li>Democratize skincare transparency with instant EpiQ Scores tied to your profile.</li>
          <li>Partner with academic programs and scientists for continual validation.</li>
          <li>Grow a community of mindful shoppers who share knowledge, not just reviews.</li>
          <li>Keep every user’s data private, secure, and always theirs.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Our Journey & Values">
        <p>
          Launched in 2025, SkinLytix now serves thousands of users with a freemium tier + premium upgrades. We are fueled by consumer research, transparency, and the belief that skincare should feel empowering.
        </p>
        <p>
          The team blends engineers, beauty scientists, and skincare fans who obsess over clarity, ethics, and reliability.
        </p>
      </SectionCard>

      <SectionCard title="Who We Serve">
        <ul className="list-disc pl-6 space-y-2">
          <li>Health-conscious shoppers (25-45) craving clarity about their routines.</li>
          <li>People with sensitive skin or specific concerns who need tailored guidance.</li>
          <li>Budget-conscious consumers who want efficiency without compromise.</li>
        </ul>
      </SectionCard>

      <SectionCard title="Stay in Touch">
        <p>Questions, partnership ideas, or product feedback? Let’s connect.</p>
        <p className="text-sm text-muted-foreground">
          Visit the <PinkLink to="/connect" className="underline">Connect</PinkLink> page or follow us on social for realtime updates.
        </p>
      </SectionCard>
    </QuickLinkLayout>
  );
};

export default About;
