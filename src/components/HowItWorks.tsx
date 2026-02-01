import { Scan, Database, Brain, CheckCircle2 } from "lucide-react";

const steps = [
  {
    icon: Scan,
    title: "Scan Your Products",
    description: "Upload a photo of any skincare product. Our OCR extracts ingredients automatically—or add manually if needed.",
    time: "30 seconds"
  },
  {
    icon: Database,
    title: "Community Database",
    description: "Check if someone already analyzed this product. If not, you're helping build our knowledge base for others.",
    time: "5 seconds"
  },
  {
    icon: Brain,
    title: "AI Analysis",
    description: "We query molecular data, validate against research, and analyze interactions using evidence-based logic.",
    time: "10 seconds"
  },
  {
    icon: CheckCircle2,
    title: "Get Your EpiQ Score",
    description: "Receive personalized routine recommendations, ingredient insights, and cost-effectiveness analysis.",
    time: "Instant"
  }
];

const HowItWorks = () => {
  return (
    <section id="how-it-works" className="py-12 md:py-24 px-4 md:px-6 bg-background">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-3xl md:text-5xl font-heading font-bold mb-3 md:mb-4">
            How SkinLytix Works
          </h2>
          <p className="text-base md:text-lg font-subheading text-muted-foreground max-w-2xl mx-auto">
            From confusion to clarity in under 60 seconds
          </p>
        </div>

        {/* Timeline */}
        <div className="relative">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-12 left-0 right-0 h-1 bg-gradient-to-r from-accent via-primary to-cta opacity-20" />

          {/* Steps Grid */}
          <div className="grid md:grid-cols-4 gap-8 md:gap-8 relative">
            {steps.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.15}s` }}
                >
                  {/* Number Badge */}
                  <div className="flex justify-center mb-4 md:mb-6">
                    <div className="relative">
                      <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-hero flex items-center justify-center shadow-medium">
                        <Icon className="w-8 h-8 md:w-10 md:h-10 text-primary-foreground" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 md:w-8 md:h-8 bg-cta rounded-full flex items-center justify-center text-cta-foreground font-cta font-bold text-xs md:text-sm shadow-soft">
                        {index + 1}
                      </div>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="text-center">
                    <h3 className="text-lg md:text-xl font-heading font-bold mb-2">
                      {step.title}
                    </h3>
                    <p className="text-muted-foreground font-body text-sm mb-3 leading-relaxed">
                      {step.description}
                    </p>
                    <div className="inline-flex items-center gap-1 text-xs font-cta font-semibold text-accent bg-accent/10 px-3 py-1 rounded-full">
                      ⏱ {step.time}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timing Notice */}
        <div className="mt-10 md:mt-16 max-w-3xl mx-auto">
          <div className="bg-warning/20 border border-warning/30 rounded-xl p-4 md:p-6 text-center">
            <p className="text-sm md:text-base font-subheading text-warning-foreground">
              <span className="font-bold">Timing Note:</span> First-time product entry takes 20-40 seconds. 
              Once in our database, analysis drops to 5-7 seconds. Thanks for helping improve accuracy over time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
